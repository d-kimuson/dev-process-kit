import { describe, expect, it } from 'vitest';

import { assuranceCounts, claimGroups, isConditional, parseFormalSpecData, parseRichText, plainText } from './model';

const rawSpec = {
  targets: [
    { id: 'sort', name: '注文一覧の並べ替え', code: 'sortOrders', summary: '注文を金額の[[sorted|小さい順]]に並べる' },
  ],
  terms: [
    { id: 'sorted', name: '小さい順に並んでいる', meaning: '隣り合うどの 2 つも、前が後ろ以下であること' },
    { id: 'same-elements', name: '同じ要素をもつ', meaning: '[[sorted]] とは無関係に、要素の個数が一致すること' },
  ],
  claims: [
    {
      id: 'sort-correct',
      target: 'sort',
      statement: 'どんなリストでも、結果は[[sorted]]',
      subjects: [{ id: 'list', text: '任意の数のリスト' }],
      conclusions: [
        { id: 'ordered', text: '結果は[[sorted|小さい順]]' },
        { id: 'kept', text: '結果は元のリストと[[same-elements]]' },
      ],
      notClaimed: [{ id: 'stable', text: '同じ値の要素の順序' }],
      assurance: { kind: 'proved' },
      source: { tool: 'Lean 4', ref: 'Sort.lean · sort_correct' },
    },
    {
      id: 'mutex',
      statement: '2 つのプロセスが同時に入ることはない',
      conclusions: [{ id: 'never-both', text: '常に高々 1 つ' }],
      assurance: { kind: 'bounded', bound: 'プロセス 3 個まで' },
    },
  ],
};

describe('parseRichText', () => {
  const terms = new Map([['sorted', '小さい順に並んでいる']]);

  it('splits term references out of the text, labelled by the term name or the override', () => {
    expect(parseRichText('結果は[[sorted]]。つまり[[ sorted |昇順]]', terms)).toEqual([
      { kind: 'text', text: '結果は' },
      { kind: 'term', id: 'sorted', label: '小さい順に並んでいる' },
      { kind: 'text', text: '。つまり' },
      { kind: 'term', id: 'sorted', label: '昇順' },
    ]);
  });

  it('leaves text without references as one run', () => {
    expect(parseRichText('集合 {1, 2} と [a]', terms)).toEqual([{ kind: 'text', text: '集合 {1, 2} と [a]' }]);
  });

  it('rejects a reference to an unknown term', () => {
    expect(() => parseRichText('[[missing]]', terms)).toThrow('unknown term reference: [[missing]]');
  });

  it('reads back as plain text', () => {
    expect(plainText(parseRichText('結果は[[sorted|昇順]]', terms))).toBe('結果は昇順');
  });
});

describe('parseFormalSpecData', () => {
  it('maps the authored shape onto claims with defaults for the optional lists', () => {
    const data = parseFormalSpecData(rawSpec);
    const [sort, mutex] = data.claims;
    expect(sort?.subjects.map((clause) => clause.id)).toEqual(['list']);
    expect(sort?.premises).toEqual([]);
    expect(sort?.conclusions.map((clause) => clause.id)).toEqual(['ordered', 'kept']);
    expect(sort?.examples).toEqual([]);
    expect(sort?.source).toEqual({ tool: 'Lean 4', ref: 'Sort.lean · sort_correct' });
    expect(sort?.target).toBe('sort');
    expect(mutex?.target).toBeNull();
    expect(mutex?.subjects).toEqual([]);
    expect(mutex?.source).toBeNull();
    expect(mutex?.assurance).toEqual({ kind: 'bounded', bound: [{ kind: 'text', text: 'プロセス 3 個まで' }] });
  });

  it('derives the terms a claim depends on, in order of first appearance', () => {
    const data = parseFormalSpecData(rawSpec);
    expect(data.claims[0]?.terms).toEqual(['sorted', 'same-elements']);
    expect(data.claims[1]?.terms).toEqual([]);
  });

  it('resolves references inside term meanings too', () => {
    const data = parseFormalSpecData(rawSpec);
    expect(data.terms[1]?.meaning[0]).toEqual({ kind: 'term', id: 'sorted', label: '小さい順に並んでいる' });
  });

  it('reads targets with their optional code and summary', () => {
    const data = parseFormalSpecData(rawSpec);
    expect(data.targets[0]).toEqual({
      id: 'sort',
      name: '注文一覧の並べ替え',
      code: 'sortOrders',
      summary: [
        { kind: 'text', text: '注文を金額の' },
        { kind: 'term', id: 'sorted', label: '小さい順' },
        { kind: 'text', text: 'に並べる' },
      ],
    });
    expect(parseFormalSpecData({ targets: [{ id: 'x', name: 'X' }], claims: [] }).targets[0]).toEqual({
      id: 'x',
      name: 'X',
      code: null,
      summary: null,
    });
  });

  it('accepts a planned claim, one not proved yet', () => {
    const data = parseFormalSpecData({ claims: [{ ...rawSpec.claims[1], assurance: { kind: 'planned' } }] });
    expect(data.claims[0]?.assurance).toEqual({ kind: 'planned' });
  });

  it('defaults targets and terms to none', () => {
    expect(parseFormalSpecData({ claims: [] })).toEqual({ targets: [], terms: [], claims: [] });
  });

  it.each([
    ['an unknown key', { claims: [], extra: true }],
    ['a claim without conclusions', { claims: [{ ...rawSpec.claims[1], conclusions: [] }] }],
    ['an unknown assurance kind', { claims: [{ ...rawSpec.claims[1], assurance: { kind: 'tested' } }] }],
    ['a bounded claim without its bound', { claims: [{ ...rawSpec.claims[1], assurance: { kind: 'bounded' } }] }],
    ['a claim with a title (the statement is the claim)', { claims: [{ ...rawSpec.claims[1], title: 'x' }] }],
    ['an id with a dot', { claims: [{ ...rawSpec.claims[1], id: 'a.b' }] }],
    ['an unknown term reference', { claims: [{ ...rawSpec.claims[1], statement: '[[nope]]' }] }],
    ['an unknown target', { claims: [{ ...rawSpec.claims[1], target: 'nope' }] }],
  ])('rejects %s', (_label, input) => {
    expect(() => parseFormalSpecData(input)).toThrow();
  });

  it('rejects duplicate target, claim, term and clause ids', () => {
    const claim = rawSpec.claims[1];
    expect(() => parseFormalSpecData({ targets: [rawSpec.targets[0], rawSpec.targets[0]], claims: [] })).toThrow(
      'duplicate target id: sort',
    );
    expect(() => parseFormalSpecData({ claims: [claim, claim] })).toThrow('duplicate claim id: mutex');
    expect(() => parseFormalSpecData({ terms: [rawSpec.terms[0], rawSpec.terms[0]], claims: [] })).toThrow(
      'duplicate term id: sorted',
    );
    expect(() =>
      parseFormalSpecData({ claims: [{ ...claim, premises: [{ id: 'never-both', text: '前提' }] }] }),
    ).toThrow('duplicate clause (in claim mutex) id: never-both');
  });
});

describe('assurance', () => {
  it('counts claims by kind, a proof with assumptions apart from a plain one', () => {
    const conditional = {
      ...rawSpec.claims[1],
      id: 'conditional',
      assurance: { kind: 'proved', assumptions: ['外部 API'] },
    };
    const planned = { ...rawSpec.claims[1], id: 'planned', assurance: { kind: 'planned' } };
    expect(
      assuranceCounts(parseFormalSpecData({ ...rawSpec, claims: [...rawSpec.claims, conditional, planned] })),
    ).toEqual({ proved: 1, conditional: 1, bounded: 1, incomplete: 0, planned: 1 });
  });

  it('treats a proof with assumptions as conditional', () => {
    expect(isConditional({ kind: 'proved', assumptions: [] })).toBe(false);
    expect(isConditional({ kind: 'proved', assumptions: [[{ kind: 'text', text: '外部 API' }]] })).toBe(true);
    expect(isConditional({ kind: 'incomplete', gaps: [] })).toBe(false);
  });
});

describe('claimGroups', () => {
  it('groups claims under their target, in order of first appearance, keeping claims without one together', () => {
    const data = parseFormalSpecData({
      targets: [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
        { id: 'unused', name: 'Unused' },
      ],
      claims: [
        { ...rawSpec.claims[1], id: 'b1', target: 'b' },
        { ...rawSpec.claims[1], id: 'free' },
        { ...rawSpec.claims[1], id: 'a1', target: 'a' },
        { ...rawSpec.claims[1], id: 'b2', target: 'b' },
      ],
    });
    expect(claimGroups(data).map((group) => [group.target?.id ?? null, group.claims.map((claim) => claim.id)])).toEqual(
      [
        ['b', ['b1', 'b2']],
        [null, ['free']],
        ['a', ['a1']],
        ['unused', []],
      ],
    );
  });
});
