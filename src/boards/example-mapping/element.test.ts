import { afterEach, describe, expect, it } from 'vitest';

import type { DraftAction } from '../../core/types';

import { defineInlineEdit } from '../../components/inline-edit';
import { applyExampleMappingAction } from './apply';
import { dropAfter, resolveExampleDrop, resolveQuestionDrop, resolveRuleDrop, resolveStoryDrop } from './drop';
import { DpkBoardExampleMapping } from './element';
import { defineExampleMapping } from './index';
import { exampleMappingMessages } from './messages';
import { parseExampleMappingBase, type ExampleMappingState } from './model';
import { presentStorySummary } from './present';

const m = exampleMappingMessages('en');

defineExampleMapping();
defineInlineEdit();

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

describe('example-mapping base data', () => {
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
    const add = action('ADD_STORY', { type: 'page', id: 'example-mapping' }, { id: 's3', name: 'S3' });
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

  it('swaps neighbours within a lane from either half of the hovered card', () => {
    const parsed = state();
    expect(resolveStoryDrop(parsed, 's1', 's2', 'before')).toMatchObject({ payload: { after: 's2' } });
    expect(resolveRuleDrop(parsed, 's1', 'r1', 'r2', 'before')).toMatchObject({ payload: { after: 'r2' } });
    expect(resolveExampleDrop(parsed, 'r1', 'e2', 'e1', 'after')).toMatchObject({ payload: { after: null } });
    expect(resolveQuestionDrop(parsed, 'r1', 'q1', 'q2', 'before')).toMatchObject({ payload: { after: 'q2' } });
  });

  it('summarizes where a story stands', () => {
    const parsed = state();
    expect(presentStorySummary(m, parsed, 's1')).toMatchObject({
      rules: 2,
      examples: 2,
      questions: 3,
      readiness: 'open-questions',
    });
    expect(presentStorySummary(m, parsed, 's2').readiness).toBe('empty');
    const answered = { ...parsed, questions: [] };
    // r2 has no example yet: the story is not understood.
    expect(presentStorySummary(m, answered, 's1').readiness).toBe('thin');
    expect(
      presentStorySummary(
        m,
        { ...answered, examples: [...answered.examples, { id: 'e3', ruleId: 'r2', name: 'x' }] },
        's1',
      ).readiness,
    ).toBe('ready');
  });
});

describe('<dpk-board-example-mapping>', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  const settle = async (element: DpkBoardExampleMapping): Promise<void> => {
    for (let index = 0; index < 3; index++) await element.updateComplete;
  };

  // `DragController` (src/lib/dom/drag.ts) defers the actual `dragging` state
  // transition to a real `setTimeout(0)` (so the browser's own drag-ghost
  // snapshot is not baked with a faded source). A chain of `updateComplete`
  // awaits only drains microtasks, so a genuine macrotask tick is needed here
  // to let that timer fire before the next synthetic drag event is dispatched.
  const flushMacrotask = async (): Promise<void> => {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  };

  const mount = async (lang?: string, raw: unknown = base): Promise<DpkBoardExampleMapping> => {
    const element = document.createElement('dpk-board-example-mapping');
    if (!(element instanceof DpkBoardExampleMapping)) throw new Error('did not upgrade');
    element.id = 'board';
    if (lang !== undefined) element.setAttribute('lang', lang);
    element.innerHTML = `<script type="application/json">${JSON.stringify(raw)}</script>`;
    document.body.append(element);
    await settle(element);
    return element;
  };

  /** Stand-in for the hosting page: accept each action, then hand the recorded draft back. */
  const acceptActions = (element: DpkBoardExampleMapping): void => {
    element.addEventListener('dpk-element-action', (event) => {
      if (!(event instanceof CustomEvent)) return;
      event.preventDefault();
      const detail: { type: string; target: string; payload: unknown } = event.detail;
      element.elementActions = [
        ...element.elementActions,
        {
          id: `a${element.elementActions.length}`,
          type: detail.type,
          target: { type: 'element', id: detail.target.slice('element:'.length) },
          payload: detail.payload,
          createdAt: '2026-09-24T00:00:00.000Z',
        },
      ];
    });
  };

  const card = (element: DpkBoardExampleMapping, id: string): HTMLElement => {
    const found = element.renderRoot.querySelector<HTMLElement>(`.em-card[data-card="${id}"]`);
    if (!found) throw new Error(`no card ${id}`);
    return found;
  };

  const area = (element: DpkBoardExampleMapping, testid: string): (string | null)[] =>
    [...element.renderRoot.querySelectorAll<HTMLElement>(`[data-testid="${testid}"] .em-card`)].map((el) =>
      el.getAttribute('data-card'),
    );

  const drag = (target: Element, type: string, clientX = 0, clientY = 0): void => {
    const event = new Event(type, { bubbles: true, cancelable: true, composed: true });
    Object.assign(event, { clientX, clientY, dataTransfer: null });
    target.dispatchEvent(event);
  };

  it('lays the board out: stories, rules side by side, examples then questions under each rule', async () => {
    const element = await mount();
    const root = element.renderRoot;
    expect(root.querySelector('[data-testid="example-mapping-board"]')).not.toBeNull();
    // One card per entity: 2 stories + 2 rules + 2 examples + 3 questions.
    expect(root.querySelectorAll('.em-card')).toHaveLength(9);
    expect(root.querySelectorAll('[data-testid="rules-s1"] .rule-col')).toHaveLength(2);
    expect(area(element, 'examples-r1')).toEqual(['e1', 'e2']);
    expect(area(element, 'questions-r1')).toEqual(['q1', 'q2']);
    expect(area(element, 'questions-r2')).toEqual(['q3']);
    // No story-wide question lane.
    expect(root.querySelector('[data-testid="questions-s1"]')).toBeNull();
    // The legend explains the colors in the header.
    expect(root.querySelectorAll('.legend li')).toHaveLength(4);
  });

  it('offers every story, rule, example and question as a comment target, in board order', async () => {
    const element = await mount();
    expect(element.commentTargets.map((target) => [target.value, target.label])).toEqual([
      ['element:board/story/s1', '注文する'],
      ['element:board/story/s2', '支払う'],
      ['element:board/rule/r1', '在庫があれば受ける'],
      ['element:board/rule/r2', '営業時間内のみ'],
      ['element:board/example/e1', '在庫あり → 受注'],
      ['element:board/example/e2', '在庫なし → 断る'],
      ['element:board/question/q1', '取り置きは可能？'],
      ['element:board/question/q2', '在庫の定義は？'],
      ['element:board/question/q3', '祝日は？'],
    ]);
  });

  it('renames a card through its inline editor and records the action', async () => {
    const element = await mount();
    acceptActions(element);
    const editor = card(element, 'r1').querySelector('dpk-inline-edit');
    editor?.dispatchEvent(
      new CustomEvent('dpk-commit', { detail: { value: '在庫があれば受ける（改）' }, bubbles: true }),
    );
    await settle(element);
    expect(element.elementActions[0]).toMatchObject({
      type: 'SET_RULE_NAME',
      target: { id: 'board/rule/r1' },
      payload: { name: '在庫があれば受ける（改）' },
    });
    expect(element.commentTargets.find((target) => target.value === 'element:board/rule/r1')?.label).toBe(
      '在庫があれば受ける（改）',
    );
    expect(element.elementActionResults).toEqual([
      {
        id: 'a0',
        title: m.ruleRenamedTitle,
        tone: 'update',
        summary: m.arrowFrom('在庫があれば受ける', '在庫があれば受ける（改）'),
      },
    ]);
  });

  it('deletes a card, records the action and clears its selection', async () => {
    const element = await mount();
    acceptActions(element);
    element.select({ kind: 'example', id: 'e1' });
    await settle(element);
    card(element, 'e1').querySelector<HTMLButtonElement>('[data-role="delete"]')?.click();
    await settle(element);
    expect(element.elementActions[0]).toMatchObject({
      type: 'DELETE_EXAMPLE',
      target: { id: 'board/example/e1' },
    });
    expect(element.selection).toBeNull();
    expect(area(element, 'examples-r1')).toEqual(['e2']);
  });

  it('adds a fresh story, records the action and puts the caret straight into its name', async () => {
    const element = await mount();
    acceptActions(element);
    element.renderRoot.querySelector<HTMLButtonElement>('.add-story')?.click();
    await settle(element);
    expect(element.elementActions[0]).toMatchObject({
      type: 'ADD_STORY',
      target: { id: 'board/page/example-mapping' },
      payload: { name: m.newStory },
    });
    const id = element.selection?.id;
    if (id === undefined) throw new Error('no selection after adding a story');
    expect(element.selection).toEqual({ kind: 'story', id });
    expect(card(element, id).getAttribute('data-mode')).toBe('editing');
    // The new card's name editor took the caret imperatively (ADR 20261023_diagram-as-board).
    const editor = card(element, id).querySelector('dpk-inline-edit');
    expect(editor?.shadowRoot?.querySelector('.field')).not.toBeNull();
  });

  it('keeps the board and shows an error when no host records a drop', async () => {
    const element = await mount();
    drag(card(element, 'e1'), 'dragstart');
    const area2 = element.renderRoot.querySelector<HTMLElement>('[data-testid="examples-r2"]')!;
    drag(area2, 'drop', 0, 100);
    await settle(element);
    expect(area(element, 'examples-r1')).toEqual(['e1', 'e2']);
    expect(area(element, 'examples-r2')).toEqual([]);
  });

  it('drags an example into a different rule’s examples area', async () => {
    const element = await mount();
    acceptActions(element);
    const area2 = element.renderRoot.querySelector<HTMLElement>('[data-testid="examples-r2"]')!;
    drag(card(element, 'e1'), 'dragstart');
    await flushMacrotask();
    drag(area2, 'dragover', 0, 100);
    await settle(element);
    drag(area2, 'drop', 0, 100);
    await settle(element);
    expect(element.elementActions[0]).toMatchObject({
      type: 'MOVE_EXAMPLE',
      target: { id: 'board/example/e1' },
      payload: { ruleId: 'r2', after: null },
    });
    expect(area(element, 'examples-r1')).toEqual(['e2']);
    expect(area(element, 'examples-r2')).toEqual(['e1']);
  });

  it('drags a rule into another story, recording the move', async () => {
    const element = await mount();
    acceptActions(element);
    const rulesRow = element.renderRoot.querySelector<HTMLElement>('[data-testid="rules-s2"]')!;
    drag(card(element, 'r1'), 'dragstart');
    await flushMacrotask();
    drag(rulesRow, 'dragover', 100);
    await settle(element);
    drag(rulesRow, 'drop', 100);
    await settle(element);
    expect(element.elementActions[0]).toMatchObject({
      type: 'MOVE_RULE',
      target: { id: 'board/rule/r1' },
      payload: { storyId: 's2', after: null },
    });
    expect(element.renderRoot.querySelector('[data-testid="rules-s2"] .rule-col[data-rule="r1"]')).not.toBeNull();
    expect(element.renderRoot.querySelector('[data-testid="rules-s1"] .rule-col[data-rule="r1"]')).toBeNull();
  });

  it('marks a card with the grill questions it answers', async () => {
    const marked = {
      ...base,
      rules: [{ ...base.rules[0], questions: 'Q1 Q2' }, base.rules[1]],
    };
    const element = await mount(undefined, marked);
    expect(card(element, 'r1').dataset['grillQuestions']).toBe('Q1 Q2');
    expect(card(element, 'r2').hasAttribute('data-grill-questions')).toBe(false);
  });

  it('renders its kit text in the element’s language', async () => {
    const ja = exampleMappingMessages('ja');
    const element = await mount('ja');
    expect([...element.renderRoot.querySelectorAll('.legend li')].map((li) => li.textContent?.trim())).toEqual([
      ja.kindLabel('story'),
      ja.kindLabel('rule'),
      ja.kindLabel('example'),
      ja.kindLabel('question'),
    ]);
  });

  it('renders its kit text in English by default', async () => {
    const element = await mount();
    expect([...element.renderRoot.querySelectorAll('.legend li')].map((li) => li.textContent?.trim())).toEqual([
      m.kindLabel('story'),
      m.kindLabel('rule'),
      m.kindLabel('example'),
      m.kindLabel('question'),
    ]);
  });
});
