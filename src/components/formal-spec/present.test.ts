import { describe, expect, it } from 'vitest';

import { formalSpecMessages } from './messages';
import { parseFormalSpecData } from './model';
import { presentAssurance, specTargets, targetSegments } from './present';

const m = formalSpecMessages('en');
const text = (value: string) => [{ kind: 'text' as const, text: value }];

describe('presentAssurance', () => {
  it('shows a plain proof as sound, with nothing to list', () => {
    expect(presentAssurance(m, { kind: 'proved', assumptions: [] })).toEqual({
      tone: 'sound',
      label: m.proved,
      detail: m.provedDetail,
      itemsLabel: null,
      items: [],
    });
  });

  it('shows a proof that trusts assumptions as a caveat listing them', () => {
    const view = presentAssurance(m, { kind: 'proved', assumptions: [text('the clock is monotonic')] });
    expect(view).toEqual({
      tone: 'caveat',
      label: m.conditional,
      detail: m.conditionalDetail,
      itemsLabel: m.assumptions,
      items: [text('the clock is monotonic')],
    });
  });

  it('shows a bounded check as a caveat listing its bound', () => {
    const view = presentAssurance(m, { kind: 'bounded', bound: text('up to 3 processes') });
    expect(view).toMatchObject({
      tone: 'caveat',
      label: m.bounded,
      itemsLabel: m.bound,
      items: [text('up to 3 processes')],
    });
  });

  it('shows an incomplete proof as unsound, listing the gaps when there are some', () => {
    expect(presentAssurance(m, { kind: 'incomplete', gaps: [] })).toMatchObject({ tone: 'unsound', items: [] });
    expect(presentAssurance(m, { kind: 'incomplete', gaps: [text('the empty case')] })).toMatchObject({
      tone: 'unsound',
      detail: m.incompleteDetail,
      itemsLabel: m.gaps,
      items: [text('the empty case')],
    });
  });

  it('shows a planned claim in its own tone, as nothing proved yet', () => {
    expect(presentAssurance(m, { kind: 'planned' })).toEqual({
      tone: 'planned',
      label: m.planned,
      detail: m.plannedDetail,
      itemsLabel: null,
      items: [],
    });
  });
});

describe('specTargets', () => {
  const data = parseFormalSpecData({
    targets: [
      { id: 'sorter', name: 'Sorting' },
      { id: 'later', name: 'Later' },
    ],
    terms: [{ id: 'sorted', name: 'sorted', meaning: 'each item is at most the next' }],
    claims: [
      {
        id: 'sort',
        target: 'sorter',
        statement: 'The result is [[sorted]]',
        subjects: [{ id: 'list', text: 'any list' }],
        conclusions: [{ id: 'ordered', text: 'the result is [[sorted|in order]]' }],
        notClaimed: [{ id: 'stable', text: 'stability' }],
        assurance: { kind: 'proved' },
      },
    ],
  });

  it('lists each target with its claims and every clause under its claim', () => {
    expect(specTargets(data)).toEqual([
      { target: { kind: 'target', target: 'sorter' }, label: 'Sorting' },
      { target: { kind: 'claim', claim: 'sort' }, label: 'The result is sorted' },
      { target: { kind: 'clause', claim: 'sort', clause: 'list' }, label: 'The result is sorted › any list' },
      {
        target: { kind: 'clause', claim: 'sort', clause: 'ordered' },
        label: 'The result is sorted › the result is in order',
      },
      { target: { kind: 'clause', claim: 'sort', clause: 'stable' }, label: 'The result is sorted › stability' },
      { target: { kind: 'target', target: 'later' }, label: 'Later' },
    ]);
  });

  it('labels a claim by its statement, shortened when long', () => {
    const long = parseFormalSpecData({
      claims: [
        {
          id: 'long',
          statement: 'Whatever list of orders is given, the list returned is sorted by total',
          conclusions: [{ id: 'c', text: 'sorted' }],
          assurance: { kind: 'planned' },
        },
      ],
    });
    expect(specTargets(long)[0]?.label).toBe('Whatever list of orders is given…');
  });

  it('turns each target into its reference segments', () => {
    expect(targetSegments({ kind: 'claim', claim: 'sort' })).toEqual(['claim', 'sort']);
    expect(targetSegments({ kind: 'clause', claim: 'sort', clause: 'list' })).toEqual(['clause', 'sort', 'list']);
    expect(targetSegments({ kind: 'target', target: 'sorter' })).toEqual(['target', 'sorter']);
  });
});
