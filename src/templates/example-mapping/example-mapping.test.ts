// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';

import type { DraftAction } from '../../core/types';
import type { ExampleMappingCard } from './components/mapping-card';
import type { ExampleMappingElement } from './element';

import '../../index';
import { exampleMappingAction } from './actions';
import { applyExampleMappingAction } from './apply';
import { exampleMappingDefinition } from './definition';
import { dropAfter, resolveExampleDrop, resolveQuestionDrop, resolveRuleDrop, resolveStoryDrop } from './drop';
import { parseExampleMappingBase, type ExampleMappingState } from './model';
import { presentStorySummary } from './present';

const base = {
  title: '注文フロー',
  stories: [
    { id: 's1', name: '注文する' },
    { id: 's2', name: '支払う' },
  ],
  rules: [
    { id: 'r1', storyId: 's1', name: '在庫があれば受ける' },
    { id: 'r2', storyId: 's1', name: '営業時間内のみ' },
  ],
  examples: [
    { id: 'e1', ruleId: 'r1', name: '在庫あり → 受注' },
    { id: 'e2', ruleId: 'r1', name: '在庫なし → 断る' },
  ],
  questions: [
    { id: 'q1', ruleId: 'r1', name: '取り置きは可能？' },
    { id: 'q2', ruleId: 'r1', name: '在庫の定義は？' },
    { id: 'q3', ruleId: 'r2', name: '祝日は？' },
  ],
};

const action = (type: string, target: { type: string; id: string }, payload: unknown): DraftAction => {
  return { id: 'a', type, target, payload, createdAt: '2026-01-01T00:00:00Z' };
};

const state = (): ExampleMappingState => parseExampleMappingBase(base);

const area = (root: ShadowRoot, testid: string): (string | null)[] =>
  [...root.querySelectorAll(`[data-testid="${testid}"] artifact-example-mapping-card`)].map((card) =>
    card.getAttribute('data-card'),
  );

const mount = (hash = ''): ExampleMappingElement => {
  window.location.hash = hash;
  document.body.innerHTML = `
    <artifact-example-mapping storage="memory">
      <script type="application/json">${JSON.stringify(base)}</script>
    </artifact-example-mapping>`;
  return document.querySelector('artifact-example-mapping') as ExampleMappingElement;
};

const settle = async (el: ExampleMappingElement): Promise<void> => {
  await el.artifact.ready;
  await el.updateComplete;
  await Promise.resolve();
  await el.updateComplete;
};

describe('example-mapping base data', () => {
  beforeEach(() => {
    window.location.hash = '';
    document.body.innerHTML = '';
  });

  it('parses the four card kinds and rejects bad references', () => {
    const parsed = state();
    expect(parsed.stories).toHaveLength(2);
    expect(parsed.rules).toHaveLength(2);
    expect(parsed.examples).toHaveLength(2);
    expect(parsed.questions).toHaveLength(3);
    expect(() => parseExampleMappingBase({ ...base, stories: [{ ...base.stories[0], oops: true }] })).toThrow();
    expect(() => parseExampleMappingBase({ ...base, rules: [{ id: 'r9', storyId: 'nope', name: 'X' }] })).toThrow();
    expect(() => parseExampleMappingBase({ ...base, examples: [{ id: 'e9', ruleId: 'nope', name: 'X' }] })).toThrow();
    expect(() => parseExampleMappingBase({ ...base, questions: [{ id: 'q9', ruleId: 'nope', name: 'X' }] })).toThrow();
    // Questions belong to a rule: there is no story-wide question any more.
    expect(() => parseExampleMappingBase({ ...base, questions: [{ id: 'q9', storyId: 's1', name: 'X' }] })).toThrow();
  });

  it('rejects duplicate ids across collections', () => {
    expect(() =>
      parseExampleMappingBase({
        ...base,
        rules: [...base.rules, { id: 's1', storyId: 's1', name: 'Dup' }],
      }),
    ).toThrow();
  });
});

describe('example-mapping actions', () => {
  beforeEach(() => {
    window.location.hash = '';
    document.body.innerHTML = '';
  });

  it('renames, reorders and deletes a story with its subtree', () => {
    const renamed = applyExampleMappingAction(
      state(),
      action('SET_STORY_NAME', { type: 'story', id: 's1' }, { name: 'New' }),
    );
    expect(renamed?.stories.find((story) => story.id === 's1')?.name).toBe('New');
    const reordered = applyExampleMappingAction(
      state(),
      action('REORDER_STORY', { type: 'story', id: 's1' }, { after: 's2' }),
    );
    expect(reordered?.stories.map((story) => story.id)).toEqual(['s2', 's1']);
    const deleted = applyExampleMappingAction(state(), action('DELETE_STORY', { type: 'story', id: 's1' }, {}));
    expect(deleted?.stories.map((story) => story.id)).toEqual(['s2']);
    expect(deleted?.rules).toEqual([]);
    expect(deleted?.examples).toEqual([]);
    expect(deleted?.questions).toEqual([]);
  });

  it('moves rules, examples and questions within their lanes', () => {
    const movedRule = applyExampleMappingAction(
      state(),
      action('MOVE_RULE', { type: 'rule', id: 'r1' }, { storyId: 's2', after: null }),
    );
    expect(movedRule?.rules.find((rule) => rule.id === 'r1')?.storyId).toBe('s2');
    expect(
      applyExampleMappingAction(
        state(),
        action('MOVE_RULE', { type: 'rule', id: 'r1' }, { storyId: 'nope', after: null }),
      ),
    ).toBeNull();
    const movedExample = applyExampleMappingAction(
      state(),
      action('MOVE_EXAMPLE', { type: 'example', id: 'e2' }, { ruleId: 'r1', after: null }),
    );
    expect(movedExample?.examples.filter((example) => example.ruleId === 'r1').map((example) => example.id)).toEqual([
      'e2',
      'e1',
    ]);
    const movedQuestion = applyExampleMappingAction(
      state(),
      action('MOVE_QUESTION', { type: 'question', id: 'q1' }, { ruleId: 'r2', after: 'q3' }),
    );
    expect(
      movedQuestion?.questions.filter((question) => question.ruleId === 'r2').map((question) => question.id),
    ).toEqual(['q3', 'q1']);
    expect(
      applyExampleMappingAction(
        state(),
        action('MOVE_QUESTION', { type: 'question', id: 'q2' }, { ruleId: 'nope', after: null }),
      ),
    ).toBeNull();
    const reorderedQuestion = applyExampleMappingAction(
      state(),
      action('REORDER_QUESTION', { type: 'question', id: 'q2' }, { after: null }),
    );
    expect(reorderedQuestion?.questions.map((question) => question.id)).toEqual(['q2', 'q1', 'q3']);
    expect(
      applyExampleMappingAction(state(), action('REORDER_QUESTION', { type: 'question', id: 'q2' }, { after: 'q3' })),
    ).toBeNull();
  });

  it('adds examples and questions under a rule', () => {
    const addedQuestion = applyExampleMappingAction(
      state(),
      action('ADD_QUESTION', { type: 'rule', id: 'r2' }, { id: 'q9', name: '臨時休業は？' }),
    );
    expect(addedQuestion?.questions.at(-1)).toEqual({ id: 'q9', ruleId: 'r2', name: '臨時休業は？' });
    expect(
      applyExampleMappingAction(state(), action('ADD_QUESTION', { type: 'rule', id: 'gone' }, { id: 'q9', name: 'X' })),
    ).toBeNull();
    // Ids stay unique across collections.
    expect(
      applyExampleMappingAction(state(), action('ADD_QUESTION', { type: 'rule', id: 'r2' }, { id: 'e1', name: 'X' })),
    ).toBeNull();
    const addedExample = applyExampleMappingAction(
      state(),
      action('ADD_EXAMPLE', { type: 'rule', id: 'r2' }, { id: 'e9', name: '閉店後 → 断る' }),
    );
    expect(addedExample?.examples.at(-1)).toEqual({ id: 'e9', ruleId: 'r2', name: '閉店後 → 断る' });
  });

  it('cascades deletes through rules and examples', () => {
    const deletedRule = applyExampleMappingAction(state(), action('DELETE_RULE', { type: 'rule', id: 'r1' }, {}));
    expect(deletedRule?.rules.map((rule) => rule.id)).toEqual(['r2']);
    expect(deletedRule?.examples).toEqual([]);
    expect(deletedRule?.questions.map((question) => question.id)).toEqual(['q3']);
    const deletedExample = applyExampleMappingAction(
      state(),
      action('DELETE_EXAMPLE', { type: 'example', id: 'e1' }, {}),
    );
    expect(deletedExample?.examples.map((example) => example.id)).toEqual(['e2']);
    // Questions ask about the rule, not about one example of it.
    expect(deletedExample?.questions.map((question) => question.id)).toEqual(['q1', 'q2', 'q3']);
  });

  it('apply is pure and idempotent', () => {
    const frozen = JSON.stringify(state());
    const next = applyExampleMappingAction(
      state(),
      action('SET_RULE_NAME', { type: 'rule', id: 'r1' }, { name: 'New' }),
    );
    expect(JSON.stringify(state())).toBe(frozen);
    expect(next?.rules.find((rule) => rule.id === 'r1')?.name).toBe('New');
    const add = action('ADD_STORY', { type: 'artifact', id: 'example-mapping' }, { id: 's3', name: 'S3' });
    const added = applyExampleMappingAction(state(), add);
    expect(applyExampleMappingAction(added!, add)).toEqual(added);
  });

  it('returns null when inapplicable', () => {
    expect(
      applyExampleMappingAction(state(), action('SET_STORY_NAME', { type: 'story', id: 'missing' }, { name: 'X' })),
    ).toBeNull();
    expect(
      applyExampleMappingAction(state(), action('REORDER_RULE', { type: 'rule', id: 'r1' }, { after: 'nope' })),
    ).toBeNull();
    expect(applyExampleMappingAction(state(), action('NOPE', { type: 'story', id: 's1' }, {}))).toBeNull();
  });

  it('dropAfter computes the after anchor', () => {
    expect(dropAfter(['a', 'b', 'c'], 'b', 'before')).toBe('a');
    expect(dropAfter(['a', 'b', 'c'], 'a', 'before')).toBeNull();
    expect(dropAfter(['a', 'b', 'c'], 'b', 'after')).toBe('b');
    expect(dropAfter(['a', 'b'], null, 'end')).toBe('b');
    expect(dropAfter([], null, 'end')).toBeNull();
  });

  it('resolves drops to move inputs', () => {
    const parsed = state();
    expect(resolveStoryDrop(parsed, 's1', 's2', 'after')).toMatchObject({ payload: { after: 's2' } });
    expect(resolveStoryDrop(parsed, 'gone', null, 'end')).toBeNull();
    expect(resolveRuleDrop(parsed, 's1', 'r2', 'r1', 'before')).toMatchObject({
      payload: { storyId: 's1', after: null },
    });
    expect(resolveRuleDrop(parsed, 'nope', 'r1', null, 'end')).toBeNull();
    expect(resolveExampleDrop(parsed, 'r1', 'e2', 'e1', 'before')).toMatchObject({
      payload: { ruleId: 'r1', after: null },
    });
    expect(resolveExampleDrop(parsed, 'nope', 'e1', null, 'end')).toBeNull();
    expect(resolveQuestionDrop(parsed, 'r2', 'q1', 'q3', 'after')).toMatchObject({
      type: 'MOVE_QUESTION',
      payload: { ruleId: 'r2', after: 'q3' },
    });
    expect(resolveQuestionDrop(parsed, 'r1', 'q2', 'q1', 'before')).toMatchObject({
      payload: { ruleId: 'r1', after: null },
    });
    expect(resolveQuestionDrop(parsed, 'nope', 'q2', null, 'end')).toBeNull();
  });

  it('describe/serialize never throw, even for stale targets', () => {
    const parsed = state();
    const stale = action('SET_RULE_NAME', { type: 'rule', id: 'gone' }, { name: 'X' });
    const described = exampleMappingDefinition.describe(stale, parsed);
    expect(described.title.length).toBeGreaterThan(0);
    expect(exampleMappingDefinition.serialize(stale)).toContain('SET_RULE_NAME');
    expect(exampleMappingDefinition.hasTarget(parsed, { type: 'rule', id: 'r1' })).toBe(true);
    expect(exampleMappingDefinition.hasTarget(parsed, { type: 'rule', id: 'gone' })).toBe(false);
    expect(exampleMappingDefinition.hasTarget(parsed, { type: 'story', id: 'r1' })).toBe(false);
    expect(exampleMappingDefinition.hasTarget(parsed, { type: 'question', id: 'q1' })).toBe(true);
    expect(
      exampleMappingDefinition.commentTargets(parsed, {}).find((option) => option.value === 'question:q3')?.label,
    ).toBe('営業時間内のみ › 祝日は？');
  });

  it('resolves navigation to the selected card', () => {
    const parsed = state();
    expect(exampleMappingDefinition.resolveNavigation(parsed, {})).toEqual({});
    expect(exampleMappingDefinition.resolveNavigation(parsed, { card: 'r1' })).toEqual({ card: 'r1' });
    expect(exampleMappingDefinition.resolveNavigation(parsed, { card: 'gone' })).toEqual({});
    expect(exampleMappingDefinition.title(parsed)).toBe('注文フロー');
    expect(exampleMappingDefinition.title(parseExampleMappingBase({ stories: [] }))).toBe('Example Mapping');
  });

  it('summarizes where a story stands', () => {
    const parsed = state();
    expect(presentStorySummary(parsed, 's1')).toMatchObject({
      rules: 2,
      examples: 2,
      questions: 3,
      readiness: 'open-questions',
    });
    expect(presentStorySummary(parsed, 's2').readiness).toBe('empty');
    const answered = { ...parsed, questions: [] };
    // r2 has no example yet: the story is not understood.
    expect(presentStorySummary(answered, 's1').readiness).toBe('thin');
    expect(
      presentStorySummary(
        { ...answered, examples: [...answered.examples, { id: 'e3', ruleId: 'r2', name: 'x' }] },
        's1',
      ).readiness,
    ).toBe('ready');
  });

  it('lays the table out: rules side by side, examples then questions under each rule', async () => {
    const el = mount();
    await settle(el);
    const root = el.shadowRoot!;
    expect(root.querySelector('[data-testid="example-mapping-board"]')).not.toBeNull();
    // One card per entity: 2 stories + 2 rules + 2 examples + 3 questions.
    expect(root.querySelectorAll('artifact-example-mapping-card')).toHaveLength(9);
    expect(root.querySelectorAll('[data-testid="rules-s1"] .rule-col')).toHaveLength(2);
    expect(area(root, 'examples-r1')).toEqual(['e1', 'e2']);
    expect(area(root, 'questions-r1')).toEqual(['q1', 'q2']);
    expect(area(root, 'questions-r2')).toEqual(['q3']);
    // No story-wide question lane.
    expect(root.querySelector('[data-testid="questions-s1"]')).toBeNull();
    // Examples on top, questions below: two separate areas in each rule column.
    const column = root.querySelector('.rule-col[data-rule="r1"]')!;
    const order = [...column.querySelectorAll('artifact-example-mapping-card')].map((card) =>
      card.getAttribute('data-card'),
    );
    expect(order).toEqual(['r1', 'e1', 'e2', 'q1', 'q2']);
    const areas = [...column.querySelectorAll('[data-testid]')].map((node) => node.getAttribute('data-testid'));
    expect(areas).toEqual(['examples-r1', 'questions-r1']);
    // The legend explains the colours in the header.
    expect(root.querySelectorAll('.legend li')).toHaveLength(4);
    document.body.innerHTML = '';
  });

  it('edits a card in place and adds examples and questions from their areas', async () => {
    const el = mount();
    await settle(el);
    const root = el.shadowRoot!;
    const rule = root.querySelector<ExampleMappingCard>('artifact-example-mapping-card[data-card="r1"]');
    if (!rule) throw new Error('missing rule card');
    await rule.updateComplete;
    const shadow = rule.shadowRoot!;
    // No edit button: the name itself is the editor.
    expect(shadow.querySelector('[data-role="edit"]')).toBeNull();
    // Questions are added from the rule's question area, not from a card.
    expect(shadow.querySelector('[data-role="ask"]')).toBeNull();
    const editor = shadow.querySelector('artifact-inline-edit');
    expect(editor?.hasAttribute('seamless')).toBe(true);
    editor?.dispatchEvent(new CustomEvent('artifact-commit', { detail: { value: 'Renamed' }, bubbles: true }));
    await settle(el);
    expect(el.artifact.state.rules.find((entry) => entry.id === 'r1')?.name).toBe('Renamed');

    root.querySelector<HTMLButtonElement>('[data-testid="questions-r2"] .add-question')?.click();
    await settle(el);
    const question = el.artifact.state.questions.at(-1);
    expect(question).toMatchObject({ ruleId: 'r2', name: '新しい質問' });
    // The fresh question takes the caret straight away.
    const fresh = root.querySelector(
      `[data-testid="questions-r2"] artifact-example-mapping-card[data-card="${question?.id}"]`,
    );
    expect(fresh?.getAttribute('data-mode')).toBe('editing');

    root.querySelector<HTMLButtonElement>('[data-testid="examples-r2"] .add-example')?.click();
    await settle(el);
    const example = el.artifact.state.examples.at(-1);
    expect(example).toMatchObject({ ruleId: 'r2', name: '新しい具体例' });
    expect(area(root, 'examples-r2')).toEqual([example?.id]);
    document.body.innerHTML = '';
  });

  it('dispatches through the element: rename, comment, delete, select', async () => {
    const el = mount();
    await settle(el);

    el.artifact.dispatch(exampleMappingAction.setRuleName('r1', 'Updated'));
    await settle(el);
    expect(el.artifact.state.rules.find((rule) => rule.id === 'r1')?.name).toBe('Updated');

    el.artifact.comment('rule:r1', 'hello');
    await settle(el);
    expect(el.artifact.actions.some((entry) => entry.type === 'comment' && entry.target.id === 'r1')).toBe(true);

    el.artifact.dispatch(exampleMappingAction.deleteExample('e2'));
    await settle(el);
    expect(el.artifact.state.examples.map((example) => example.id)).toEqual(['e1']);

    el.artifact.navigate({ card: 'q2' });
    await settle(el);
    expect(location.hash).toContain('card=q2');
    document.body.innerHTML = '';
  });
});
