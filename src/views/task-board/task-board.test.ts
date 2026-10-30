// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { DraftAction } from '../../core/types';
import type { DpkViewTaskBoard } from './element';

import '../../index';
import { type DpkSelect } from '../../components/select/element';
import { changeLogScript, showChange } from '../../core/testing/change-notices';
import { addTodo, answerQuestion, decideProposal, deleteTodo, setTodoStatus } from './actions';
import { applyTaskBoardAction } from './apply';
import { taskBoardDefinitionFor, taskBoardHasTarget } from './definition';
import { taskBoardMessages } from './messages';
import { emptyTaskBoardBase, parseTaskBoardBase, type TaskBoardState } from './model';
import {
  describeTaskBoardAction,
  outputLocation,
  presentDesigns,
  presentOutputs,
  presentQuestions,
  presentTasks,
  taskBoardCommentTargets,
} from './present';
import { taskBoardStyles } from './styles';

const m = taskBoardMessages('en');

const base = {
  title: '検索 API のページング対応',
  status: 'waiting',
  designs: [
    {
      id: 'paging',
      title: 'カーソルページングの設計',
      body: '## 背景\n深いページで一覧が遅い。\n\n- offset は遅い\n- cursor で進める',
    },
    { id: 'ops', title: 'リリースと運用', body: '切替は管理画面から。' },
  ],
  members: [
    { id: 'agent', name: 'Claude' },
    { id: 'd-kimuson', name: 'd-kimuson', kind: 'human' },
  ],
  todos: [
    { id: 'design', title: '方式を決める', status: 'done', assignee: 'agent', design: 'paging' },
    { id: 'impl', title: '実装する', status: 'doing', assignee: 'agent', note: '残り: テスト', design: 'paging' },
    { id: 'review', title: 'レビューする', assignee: 'd-kimuson', design: 'paging' },
    { id: 'deploy', title: 'デプロイする', status: 'blocked', design: 'ops' },
    { id: 'index', title: 'created_at に index を張る', proposed: true, reason: '並べ替えが遅い', design: 'paging' },
  ],
  outputs: [
    { id: 'pr', label: 'PR #42', href: 'https://github.com/example/repo/pull/42', kind: 'PR' },
    { id: 'doc', href: 'docs/design.md', description: '' },
  ],
  questions: [
    { id: 'limit', title: '1 ページの上限は？', assumption: '100 件で進める' },
    { id: 'legacy', title: '旧パラメータは消す？', blocking: true, assumption: '当面は両方受け付ける' },
    { id: 'deadline', title: 'いつまでに必要？', blocking: true, description: 'テストの量を決めたい。' },
  ],
};

const action = (input: ReturnType<typeof answerQuestion>, id = 'a1'): DraftAction => ({
  id,
  type: input.type,
  target: typeof input.target === 'string' ? { type: 'todo', id: input.target } : input.target,
  payload: input.payload,
  createdAt: '2026-09-25T00:00:00.000Z',
});

const apply = (state: TaskBoardState, input: ReturnType<typeof answerQuestion>): TaskBoardState | null =>
  applyTaskBoardAction(state, action(input));

describe('task board base data', () => {
  it('fills defaults, reads empty strings as missing and numbers the questions', () => {
    expect(parseTaskBoardBase({})).toEqual(emptyTaskBoardBase());
    const state = parseTaskBoardBase(base);
    expect(state.members[0]?.kind).toBe('agent');
    expect(state.todos[2]).toEqual({
      id: 'review',
      title: 'レビューする',
      status: 'todo',
      assignee: 'd-kimuson',
      note: null,
      design: 'paging',
      proposed: false,
      reason: null,
      added: false,
    });
    expect(state.todos[4]).toMatchObject({ proposed: true, reason: '並べ替えが遅い', design: 'paging' });
    expect(state.outputs[1]).toEqual({
      id: 'doc',
      label: null,
      href: 'docs/design.md',
      kind: null,
      description: null,
    });
    expect(state.questions.map((question) => [question.ref, question.blocking, question.assumption])).toEqual([
      ['Q1', false, '100 件で進める'],
      ['Q2', true, '当面は両方受け付ける'],
      ['Q3', true, null],
    ]);
    expect(state.answers).toEqual({});
    expect(state.decisions).toEqual({});
    expect(state.designs).toEqual([
      {
        id: 'paging',
        title: 'カーソルページングの設計',
        body: '## 背景\n深いページで一覧が遅い。\n\n- offset は遅い\n- cursor で進める',
      },
      { id: 'ops', title: 'リリースと運用', body: '切替は管理画面から。' },
    ]);
    // A blank body reads as missing, so a doc never shows an empty box.
    expect(parseTaskBoardBase({ designs: [{ id: 'd', title: 'D', body: ' ' }] }).designs[0]?.body).toBeNull();
  });

  it('rejects duplicate ids, unknown assignees, unknown keys and a provisional question without an assumption', () => {
    expect(() =>
      parseTaskBoardBase({
        todos: [
          { id: 'a', title: 'A' },
          { id: 'a', title: 'B' },
        ],
      }),
    ).toThrow(/duplicate todo id/);
    expect(() => parseTaskBoardBase({ todos: [{ id: 'a', title: 'A', assignee: 'ghost' }] })).toThrow(/not in members/);
    expect(() => parseTaskBoardBase({ questions: [{ id: 'q', title: 'Q' }] })).toThrow(/assumption/);
    expect(() => parseTaskBoardBase({ questions: [{ id: 'q', title: 'Q', assumption: ' ' }] })).toThrow(/assumption/);
    expect(() => parseTaskBoardBase({ questions: [{ id: 'q', title: 'Q', options: [] }] })).toThrow();
    expect(() => parseTaskBoardBase({ proposals: [] })).toThrow();
    expect(() => parseTaskBoardBase({ status: 'sleeping' })).toThrow();
    expect(() => parseTaskBoardBase({ todos: [{ id: 'a', title: 'A', status: 'wip' }] })).toThrow();
    expect(() => parseTaskBoardBase({ title: 'x', typo: 1 })).toThrow();
    expect(() => parseTaskBoardBase({ context: { how: 'x' } })).toThrow();
    expect(() => parseTaskBoardBase({ summary: 'x' })).toThrow();
    expect(() => parseTaskBoardBase({ reports: [] })).toThrow();
    // A task names a design doc the board has, and a doc has a title.
    expect(() => parseTaskBoardBase({ todos: [{ id: 'a', title: 'A', design: 'ghost' }] })).toThrow(/not in designs/);
    expect(() =>
      parseTaskBoardBase({
        designs: [
          { id: 'd', title: 'D' },
          { id: 'd', title: 'E' },
        ],
      }),
    ).toThrow(/duplicate design id/);
    expect(() => parseTaskBoardBase({ designs: [{ id: 'd' }] })).toThrow();
  });
});

describe('task board actions', () => {
  const state = parseTaskBoardBase(base);

  it('approves the assumption or answers differently, and clears the reply', () => {
    const approved = apply(state, answerQuestion('limit', { kind: 'approve' }));
    expect(approved?.answers).toEqual({ limit: { kind: 'approve' } });
    const answered = apply(state, answerQuestion('legacy', { kind: 'answer', text: '今回で 400 を返す' }));
    expect(answered?.answers['legacy']).toEqual({ kind: 'answer', text: '今回で 400 を返す' });
    expect(approved && apply(approved, answerQuestion('limit', { kind: 'clear' }))?.answers).toEqual({});
  });

  it('keeps a reply that no longer fits the question as stale', () => {
    expect(apply(state, answerQuestion('deadline', { kind: 'approve' }))).toBeNull();
    expect(apply(state, answerQuestion('gone', { kind: 'answer', text: 'x' }))).toBeNull();
  });

  it('decides on a proposed todo only, and takes the decision back', () => {
    const accepted = apply(state, decideProposal('index', 'accept'));
    expect(accepted?.decisions).toEqual({ index: 'accept' });
    expect(accepted && apply(accepted, decideProposal('index', 'clear'))?.decisions).toEqual({});
    expect(apply(state, decideProposal('impl', 'accept'))).toBeNull();
    expect(apply(state, decideProposal('gone', 'decline'))).toBeNull();
  });

  it("changes the status of a todo a person has, and leaves the agent's own to the agent", () => {
    expect(apply(state, setTodoStatus('review', 'doing'))?.todos[2]?.status).toBe('doing');
    // The agent keeps its own statuses; an unassigned todo is nobody's to tick off.
    expect(apply(state, setTodoStatus('impl', 'done'))).toBeNull();
    expect(apply(state, setTodoStatus('deploy', 'done'))).toBeNull();
    expect(apply(state, setTodoStatus('gone', 'done'))).toBeNull();
    // Reassigning is not the reader's to do on the board.
    expect(
      applyTaskBoardAction(state, { ...action(setTodoStatus('review', 'doing')), type: 'SET_TODO_ASSIGNEE' }),
    ).toBeNull();
  });

  it('adds a todo at the end, and removes only a todo the reader added', () => {
    const added = apply(state, addTodo('docs', 'ドキュメントを書く', 'agent'));
    expect(added?.todos.at(-1)).toEqual({
      id: 'docs',
      title: 'ドキュメントを書く',
      status: 'todo',
      assignee: 'agent',
      note: null,
      design: null,
      proposed: false,
      reason: null,
      added: true,
    });
    expect(apply(state, addTodo('impl', 'dup', null))).toBeNull();
    expect(apply(state, addTodo('docs', 'x', 'ghost'))).toBeNull();
    expect(added && apply(added, deleteTodo('docs'))?.todos).toEqual(state.todos);
    expect(apply(state, deleteTodo('impl'))).toBeNull();
  });
});

describe('task board presentation', () => {
  const state = parseTaskBoardBase(base);
  const none = (): number => 0;

  it('indexes the design docs and opens one doc with the tasks it groups', () => {
    const vm = presentDesigns(m, state, (target) => (target === 'design:paging' ? 2 : 0));
    expect(vm.items).toEqual([
      { id: 'paging', title: 'カーソルページングの設計', taskCount: 4 },
      { id: 'ops', title: 'リリースと運用', taskCount: 1 },
    ]);
    // The first doc opens until the reader picks another.
    expect(vm.selected?.id).toBe('paging');
    expect(vm.selected?.comments).toBe(2);
    expect(vm.selected?.body).toContain('## 背景');
    // One doc, many tasks: the todos that name it are its group, in the agent's order.
    expect(vm.selected?.tasks.map((task) => [task.id, task.status, task.statusLabel, task.proposal])).toEqual([
      ['design', 'done', 'Done', null],
      ['impl', 'doing', 'In progress', null],
      ['review', 'todo', 'To do', null],
      ['index', 'todo', 'To do', 'pending'],
    ]);
    // The reader opened the other doc; an id the agent has since removed falls back to the first.
    const ops = presentDesigns(m, state, none, 'ops');
    expect(ops.selected?.id).toBe('ops');
    expect(ops.selected?.tasks.map((task) => task.id)).toEqual(['deploy']);
    expect(presentDesigns(m, state, none, 'gone').selected?.id).toBe('paging');
    const bare = parseTaskBoardBase({ designs: [{ id: 'd', title: 'D', body: ' ' }] });
    expect(presentDesigns(m, bare, none).selected).toEqual({
      id: 'd',
      title: 'D',
      body: null,
      tasks: [],
      comments: 0,
    });
    expect(presentDesigns(m, emptyTaskBoardBase(), none)).toEqual({ items: [], selected: null });
  });

  it('puts blockers first and tells an approved or answered question from an open one', () => {
    const replied: TaskBoardState = {
      ...state,
      answers: { limit: { kind: 'approve' }, deadline: { kind: 'answer', text: '  ' } },
    };
    const vm = presentQuestions(replied, none);
    expect(vm.blocking.map((question) => question.id)).toEqual(['legacy', 'deadline']);
    expect(vm.provisional.map((question) => question.id)).toEqual(['limit']);
    expect(vm.resolved).toBe(1);
    expect(vm.total).toBe(3);
    expect(vm.open).toBe(2);
    expect(vm.blockingOpen).toBe(2);
    expect(vm.provisional[0]).toMatchObject({ reply: 'approve', resolved: true, assumption: '100 件で進める' });
    // A blank answer keeps the box open but is not an answer yet.
    expect(vm.blocking[1]).toMatchObject({ reply: 'answer', resolved: false, draft: '  ' });
    expect(vm.blocking[0]).toMatchObject({ reply: 'none', resolved: false });
  });

  it('stands every todo in the column of its status, proposals included, and keeps the rejected out of progress', () => {
    const vm = presentTasks(m, state, state, none);
    expect(vm.lanes.map((lane) => [lane.status, lane.label, lane.tone])).toEqual([
      ['todo', 'To do', 'gray'],
      ['doing', 'In progress', 'blue'],
      ['blocked', 'Blocked', 'red'],
      ['done', 'Done', 'green'],
    ]);
    expect(vm.lanes.map((lane) => lane.cards.map((card) => card.id))).toEqual([
      ['review', 'index'],
      ['impl'],
      ['deploy'],
      ['design'],
    ]);
    expect(vm.lanes[0]?.cards.map((card) => card.proposal)).toEqual([null, 'pending']);
    expect(vm.progress).toMatchObject({ done: 1, total: 4, label: '1 of 4 done' });
    const accepted = apply(state, decideProposal('index', 'accept'));
    if (accepted === null) throw new Error('not applied');
    const after = presentTasks(m, accepted, state, none);
    // Accepted, it is a regular todo in the column it stands in: still the agent's to carry out.
    expect(after.lanes[0]?.cards.at(-1)?.proposal).toBe('accept');
    expect(after.lanes[0]?.cards.at(-1)?.editable).toBe(false);
    expect(after.progress.total).toBe(5);
    const declined = apply(state, decideProposal('index', 'decline'));
    if (declined === null) throw new Error('not applied');
    expect(presentTasks(m, declined, state, none).lanes[0]?.cards.at(-1)?.proposal).toBe('decline');
    expect(presentTasks(m, emptyTaskBoardBase(), emptyTaskBoardBase(), none).progress.label).toBe('No todos yet');
    expect(presentTasks(m, emptyTaskBoardBase(), emptyTaskBoardBase(), none).lanes.map((lane) => lane.cards)).toEqual([
      [],
      [],
      [],
      [],
    ]);
  });

  it('lets the reader tick off only the todos a person has', () => {
    const cards = presentTasks(m, state, state, none).lanes.flatMap((lane) => lane.cards);
    expect(Object.fromEntries(cards.map((card) => [card.id, [card.editable, card.assigneeName]]))).toEqual({
      review: [true, 'd-kimuson'],
      index: [false, null],
      impl: [false, 'Claude'],
      deploy: [false, null],
      design: [false, 'Claude'],
    });
  });

  it('narrows the board to the todos people have, when the board names a person', () => {
    const vm = presentTasks(m, state, state, none, 'human');
    expect(vm.filter).toBe('human');
    expect(vm.canFilter).toBe(true);
    expect(vm.lanes.map((lane) => lane.cards.map((card) => card.id))).toEqual([['review'], [], [], []]);
    expect(vm.humanCount).toBe(1);
    // Progress is the whole task's, whatever the board shows.
    expect(vm.progress.total).toBe(4);
    const nobody = parseTaskBoardBase({ todos: [{ id: 'a', title: 'A' }] });
    const unfiltered = presentTasks(m, nobody, nobody, none, 'human');
    expect(unfiltered.canFilter).toBe(false);
    expect(unfiltered.filter).toBe('all');
    expect(unfiltered.lanes.flatMap((lane) => lane.cards)).toHaveLength(1);
  });

  it('marks todos the reader changed or added', () => {
    const changed = apply(state, setTodoStatus('review', 'doing'));
    const added = changed && apply(changed, addTodo('docs', 'Docs', null));
    if (added === null) throw new Error('not applied');
    const lanes = presentTasks(m, added, state, (target) => (target === 'todo:impl' ? 2 : 0)).lanes;
    // The status change moved the card: the board reads by column, not by the agent's order.
    expect(lanes.map((lane) => lane.cards.map((card) => card.id))).toEqual([
      ['index', 'docs'],
      ['impl', 'review'],
      ['deploy'],
      ['design'],
    ]);
    const cards = lanes.flatMap((lane) => lane.cards);
    expect(cards.filter((card) => card.changed || card.added).map((card) => card.id)).toEqual(['docs', 'review']);
    expect(cards.find((card) => card.id === 'impl')?.comments).toBe(2);
    expect(cards.find((card) => card.id === 'review')?.assigneeKind).toBe('human');
  });

  it('tells a link from a file path', () => {
    expect(outputLocation('https://github.com/example/repo/pull/42')).toEqual({ kind: 'url', host: 'github.com' });
    expect(outputLocation('docs/design.md')).toEqual({ kind: 'path' });
    expect(outputLocation('/Users/me/out.csv')).toEqual({ kind: 'path' });
    expect(outputLocation('C:\\work\\out.csv')).toEqual({ kind: 'path' });
    const outputs = presentOutputs(state);
    expect(outputs.map((output) => [output.title, output.place.kind])).toEqual([
      ['PR #42', 'url'],
      ['docs/design.md', 'path'],
    ]);
    expect(outputs[1]?.labelled).toBe(false);
  });

  it('describes each change with its before and after', () => {
    const next = apply(state, setTodoStatus('review', 'doing')) ?? state;
    expect(describeTaskBoardAction(m, action(setTodoStatus('review', 'doing')), next, state)).toEqual({
      title: 'Change the status',
      targetLabel: 'Todo · レビューする',
      tone: 'update',
      summary: 'To do → In progress',
    });
    expect(
      describeTaskBoardAction(m, action(answerQuestion('limit', { kind: 'approve' })), state, state),
    ).toMatchObject({
      title: 'Approve the assumption',
      targetLabel: 'Q1 · 1 ページの上限は？',
      summary: '→ “100 件で進める”',
    });
    expect(
      describeTaskBoardAction(m, action(answerQuestion('legacy', { kind: 'answer', text: '消す' })), state, state),
    ).toMatchObject({ title: 'Answer', summary: '→ “消す”' });
    expect(describeTaskBoardAction(m, action(addTodo('docs', 'Docs', 'd-kimuson')), state, state)).toMatchObject({
      title: 'Add a todo',
      targetLabel: 'Todo · Docs',
      tone: 'create',
      summary: 'Assignee: d-kimuson',
    });
    expect(describeTaskBoardAction(m, action(decideProposal('index', 'accept')), state, state)).toMatchObject({
      title: 'Accept the proposal',
      targetLabel: 'Proposal · created_at に index を張る',
    });
  });

  it('offers questions, todos and design docs as comment targets, grouped', () => {
    const targets = taskBoardCommentTargets(m, state);
    expect(targets.map((target) => target.value)).toEqual([
      'question:limit',
      'question:legacy',
      'question:deadline',
      'todo:design',
      'todo:impl',
      'todo:review',
      'todo:deploy',
      'todo:index',
      'design:paging',
      'design:ops',
    ]);
    expect(new Set(targets.map((target) => target.group))).toEqual(
      new Set(['Question', 'Proposal', 'Todo', 'Design Doc']),
    );
  });
});

describe('task board definition', () => {
  const state = parseTaskBoardBase(base);
  const definition = taskBoardDefinitionFor('en');

  it('knows its targets and titles itself', () => {
    expect(taskBoardHasTarget(state, { type: 'todo', id: 'impl' })).toBe(true);
    expect(taskBoardHasTarget(state, { type: 'design', id: 'paging' })).toBe(true);
    expect(taskBoardHasTarget(parseTaskBoardBase({}), { type: 'design', id: 'paging' })).toBe(false);
    expect(taskBoardHasTarget(state, { type: 'log', id: 'l1' })).toBe(false);
    expect(taskBoardHasTarget(state, { type: 'context', id: 'why' })).toBe(false);
    expect(taskBoardHasTarget(state, { type: 'question', id: 'limit' })).toBe(true);
    expect(taskBoardHasTarget(state, { type: 'page', id: 'task-board' })).toBe(true);
    expect(taskBoardHasTarget(state, { type: 'output', id: 'pr' })).toBe(false);
    expect(taskBoardHasTarget(state, { type: 'todo', id: 'gone' })).toBe(false);
    expect(taskBoardHasTarget(state, { type: 'slide', id: 'impl' })).toBe(false);
    expect(definition.title(state)).toBe('検索 API のページング対応');
    expect(definition.title(emptyTaskBoardBase())).toBe('Task Context Board');
    expect(definition.resolveNavigation(state, { x: '1' })).toEqual({ x: '1' });
  });
});

/* ---------------------------------------------------------------- element */

const mountWith = (data: unknown, lang = 'en', change = ''): DpkViewTaskBoard => {
  document.body.innerHTML = `
    <dpk-view-task-board storage="memory" lang="${lang}">
      ${change === '' ? '' : changeLogScript(change)}
      <script type="application/json">${JSON.stringify(data)}</script>
    </dpk-view-task-board>`;
  const element = document.querySelector('dpk-view-task-board');
  if (!(element instanceof HTMLElement)) throw new Error('element did not upgrade');
  return element as DpkViewTaskBoard;
};

const mount = (lang = 'en'): DpkViewTaskBoard => mountWith(base, lang);

const settle = async (element: DpkViewTaskBoard): Promise<void> => {
  await element.api.ready;
  for (let i = 0; i < 3; i += 1) {
    await element.updateComplete;
    await Promise.resolve();
  }
};

const query = <T extends Element>(element: DpkViewTaskBoard, selector: string): T => {
  const found = element.shadowRoot?.querySelector<T>(selector);
  if (found === null || found === undefined) throw new Error(`no ${selector}`);
  return found;
};

const settleSelect = async (select: DpkSelect): Promise<void> => {
  for (let i = 0; i < 3; i += 1) {
    await select.updateComplete;
    await Promise.resolve();
  }
};

/** Opens the `.board-add-assignee` `dpk-select` (its own shadow root, separate from the board's) and picks `value`. */
const chooseAssignee = async (element: DpkViewTaskBoard, value: string): Promise<void> => {
  const select = query<DpkSelect>(element, '.board-add-assignee');
  const trigger = select.renderRoot.querySelector<HTMLButtonElement>('.dpk-rich-select');
  if (!trigger) throw new Error('no assignee trigger');
  trigger.click();
  await settleSelect(select);
  const option = select.renderRoot.querySelector<HTMLElement>(`[role="option"][data-value="${value}"]`);
  if (!option) throw new Error(`no assignee option ${value}`);
  option.click();
  await settleSelect(select);
};

/** Opens the `.board-todo-status` rich select within the element matching `rowSelector` and picks `value`. */
const chooseRich = async (element: DpkViewTaskBoard, rowSelector: string, value: string): Promise<void> => {
  query<HTMLButtonElement>(element, `${rowSelector} .board-todo-status`).click();
  await settle(element);
  query<HTMLElement>(element, `${rowSelector} [role="option"][data-value="${value}"]`).click();
  await settle(element);
};

const type = (area: HTMLTextAreaElement, value: string): void => {
  area.value = value;
  area.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
};

/** A drag event: jsdom has no `DragEvent`, and the board only needs the type and the target. */
const drag = (target: Element, kind: string): void => {
  const event = new Event(kind, { bubbles: true, cancelable: true, composed: true });
  Object.assign(event, { dataTransfer: null });
  target.dispatchEvent(event);
};

afterEach(() => {
  document.body.replaceChildren();
  window.location.hash = '';
  vi.restoreAllMocks();
});

describe('<dpk-view-task-board>', () => {
  it('puts the design docs, questions and the task board under tabs, and the outputs in a left-hand rail', async () => {
    const element = mount();
    await settle(element);
    const root = element.shadowRoot;
    expect(root?.querySelector('.dpk-banner')).toBeNull();
    const main = root?.querySelector('.dpk-main');
    const side = root?.querySelector('.dpk-sidebar');
    expect(side?.hasAttribute('hidden')).toBe(false);
    // The rail is the left-hand one: the review floats over the page's right edge and would cover it there.
    expect(side?.getAttribute('slot')).toBe('left');
    expect(root?.querySelector('.dpk-aside')).toBeNull();
    expect((side?.compareDocumentPosition(main ?? element) ?? 0) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const tabs = [...(main?.querySelectorAll('[role="tab"]') ?? [])];
    expect(tabs.map((tab) => tab.getAttribute('data-tab'))).toEqual(['designs', 'questions', 'tasks']);
    expect(tabs.map((tab) => tab.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false']);
    const panel = (tab: string): HTMLElement => query(element, `#board-panel-${tab}`);
    expect(panel('designs').hidden).toBe(false);
    expect(panel('questions').hidden).toBe(true);
    expect(panel('tasks').hidden).toBe(true);
    expect(
      [...panel('designs').querySelectorAll('[data-design-item]')].map((node) => node.getAttribute('data-design-item')),
    ).toEqual(['paging', 'ops']);
    // The first doc is open, and the index says which one.
    expect(panel('designs').querySelector('[data-design]')?.getAttribute('data-design')).toBe('paging');
    expect(panel('designs').querySelector('[data-design-item="paging"]')?.getAttribute('aria-current')).toBe('true');
    expect(panel('designs').querySelector('[data-design-item="ops"]')?.getAttribute('aria-current')).toBeNull();
    expect(panel('designs').querySelector('[data-design="paging"] .board-design-body')?.textContent).toContain(
      '深いページで一覧が遅い。',
    );
    // Each doc lists the tasks it groups: one doc, many todos.
    expect(panel('designs').querySelectorAll('[data-design="paging"] .board-design-task')).toHaveLength(4);
    expect(panel('designs').querySelectorAll('[data-design="ops"]')).toHaveLength(0);
    // The overall status stays in the header, not in the docs.
    expect(root?.querySelector('.board-status')?.getAttribute('data-status')).toBe('waiting');
    expect(panel('designs').querySelector('.board-status')).toBeNull();
    expect(panel('questions').querySelectorAll('.board-question')).toHaveLength(3);
    // The rail holds what the agent produced and nothing else: the todos are the Tasks board.
    expect(side?.querySelectorAll('.board-output')).toHaveLength(2);
    expect(side?.querySelector('[data-section="todos"]')).toBeNull();
    expect(side?.querySelector('.board-todo')).toBeNull();
    // The "waiting on you" card and its hand-back button are gone: the review button does that.
    expect(root?.querySelector('.board-overview')).toBeNull();
    expect(root?.querySelector('.board-hand-back')).toBeNull();
  });

  it('draws the todos as a kanban board of one column per status in the Tasks tab', async () => {
    const element = mount();
    await settle(element);
    const lane = (status: string): HTMLElement => query(element, `#board-panel-tasks [data-column="${status}"]`);
    const cards = (status: string): (string | null)[] =>
      [...lane(status).querySelectorAll('.board-card')].map((card) => card.getAttribute('data-todo'));
    expect(
      [...query(element, '#board-panel-tasks .board-kanban').querySelectorAll('[data-column]')].map((column) =>
        column.getAttribute('data-column'),
      ),
    ).toEqual(['todo', 'doing', 'blocked', 'done']);
    expect([cards('todo'), cards('doing'), cards('blocked'), cards('done')]).toEqual([
      ['review', 'index'],
      ['impl'],
      ['deploy'],
      ['design'],
    ]);
    expect(lane('blocked').getAttribute('data-tone')).toBe('red');
    expect(lane('done').querySelector('.board-lane-title')?.textContent?.trim()).toBe('Done');
    expect(lane('done').querySelector('.board-lane-count')?.textContent?.trim()).toBe('1');
    // A card carries the todo it stands for, so comments, grill badges and change notices still find it.
    const review = lane('todo').querySelector<HTMLElement>('[data-todo="review"]');
    expect(review?.getAttribute('data-dpk-target')).toBe('todo:review');
    expect(review?.querySelector('.board-assignee')?.getAttribute('data-kind')).toBe('human');
    expect(review?.querySelector('.board-todo-status')).not.toBeNull();
    // The card names the design doc it belongs to: the link back to the intent.
    expect(review?.querySelector('.board-tag[data-tone="design"]')?.textContent).toBe('カーソルページングの設計');
    // The board is only drawn when its tab is open.
    query<HTMLButtonElement>(element, '[data-tab="tasks"]').click();
    await settle(element);
    expect(query<HTMLElement>(element, '#board-panel-tasks').hidden).toBe(false);
    expect(query<HTMLElement>(element, '#board-panel-designs').hidden).toBe(true);
    // The progress and the filter moved with the todos, out of the rail.
    expect(query(element, '#board-panel-tasks .board-tasks-progress-label').textContent).toBe('1 of 4 done');
    expect(query(element, '#board-panel-tasks [data-filter="all"]')).not.toBeNull();
  });

  it('switches the open design doc from the left-hand index', async () => {
    const element = mount();
    await settle(element);
    // Only the open doc is drawn: the index carries the rest.
    const detail = (): HTMLElement => query(element, '#board-panel-designs [data-design]');
    expect(detail().getAttribute('data-design')).toBe('paging');
    expect(detail().querySelector('.board-design-title')?.textContent).toBe('カーソルページングの設計');
    expect(detail().querySelector('.board-design-body h2')?.textContent).toBe('背景');
    expect(
      [...detail().querySelectorAll('.board-design-task')].map((task) => task.getAttribute('data-design-task')),
    ).toEqual(['design', 'impl', 'review', 'index']);
    // A proposal in the group keeps its "?" mark.
    expect(query(element, '[data-design="paging"] [data-design-task="index"] .board-card-mark')).not.toBeNull();
    const requested = vi.spyOn(element, 'requestComment');
    query<HTMLButtonElement>(element, '[data-design="paging"] .board-comment').click();
    expect(requested).toHaveBeenCalledWith('design:paging');
    // Clicking another title opens its body and its tasks instead.
    query<HTMLButtonElement>(element, '[data-design-item="ops"]').click();
    await settle(element);
    expect(detail().getAttribute('data-design')).toBe('ops');
    expect(detail().querySelector('.board-design-title')?.textContent).toBe('リリースと運用');
    expect(detail().querySelector('.board-design-body')?.textContent).toContain('切替は管理画面から。');
    expect(detail().querySelector('.board-design-task')?.getAttribute('data-design-task')).toBe('deploy');
    expect(query(element, '[data-design-item="ops"]').getAttribute('aria-current')).toBe('true');
    expect(query(element, '[data-design-item="paging"]').getAttribute('aria-current')).toBeNull();
  });

  it("keeps each design doc's diagrams inside that doc", async () => {
    document.body.innerHTML = `
      <dpk-view-task-board storage="memory">
        <script type="application/json">${JSON.stringify(base)}</script>
        <div slot="design:paging" id="figure-paging">ER</div>
        <div slot="design:ops" id="figure-ops">Flow</div>
      </dpk-view-task-board>`;
    const element = document.querySelector('dpk-view-task-board') as DpkViewTaskBoard;
    await settle(element);
    const slot = (id: string): HTMLSlotElement =>
      query<HTMLSlotElement>(element, `[data-design="${id}"] slot[name="design:${id}"]`);
    // The paging doc owns its ER diagram; it sits inside that doc, not at page level.
    expect(
      slot('paging')
        .assignedElements()
        .map((node) => node.id),
    ).toEqual(['figure-paging']);
    expect(query(element, '[data-design="paging"] .board-design-figures')).not.toBeNull();
    // Opening another doc takes its own figures with it, and leaves the others behind.
    query<HTMLButtonElement>(element, '[data-design-item="ops"]').click();
    await settle(element);
    expect(
      slot('ops')
        .assignedElements()
        .map((node) => node.id),
    ).toEqual(['figure-ops']);
    expect(element.shadowRoot?.querySelector('[data-design="ops"] slot[name="design:paging"]')).toBeNull();
    const bare = mountWith({ title: 'x' });
    await settle(bare);
    expect(query(bare, '#board-panel-designs .board-empty').textContent).toBe(m.noDesigns);
    const commented = mount();
    await settle(commented);
    const requested = vi.spyOn(commented, 'requestComment');
    query<HTMLButtonElement>(commented, '[data-design="paging"] .board-comment').click();
    expect(requested).toHaveBeenCalledWith('design:paging');
  });

  it('switches tabs by click and by arrow keys, and counts what is left to answer', async () => {
    const element = mount();
    await settle(element);
    const tab = (name: string): HTMLButtonElement => query(element, `[data-tab="${name}"]`);
    expect(tab('questions').querySelector('.board-tab-count')?.textContent).toBe('3');
    expect(tab('questions').getAttribute('data-alert')).toBe('true');
    // Tasks says what it holds in its columns, not in a count.
    expect(tab('tasks').querySelector('.board-tab-count')).toBeNull();
    tab('questions').click();
    await settle(element);
    expect(query<HTMLElement>(element, '#board-panel-questions').hidden).toBe(false);
    expect(query<HTMLElement>(element, '#board-panel-designs').hidden).toBe(true);
    tab('questions').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await settle(element);
    expect(tab('tasks').getAttribute('aria-selected')).toBe('true');
    expect(tab('tasks').getAttribute('tabindex')).toBe('0');
    // Stepping past the last tab wraps to the first, and back.
    tab('tasks').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await settle(element);
    expect(tab('designs').getAttribute('aria-selected')).toBe('true');
    tab('designs').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    await settle(element);
    expect(tab('tasks').getAttribute('aria-selected')).toBe('true');
    tab('tasks').dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    await settle(element);
    expect(tab('designs').getAttribute('aria-selected')).toBe('true');
    tab('designs').dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    await settle(element);
    expect(tab('tasks').getAttribute('aria-selected')).toBe('true');
    // A tab stays selected across the renders its own actions cause.
    tab('questions').click();
    await settle(element);
    // Answering the blockers turns the badge from red to plain.
    query<HTMLButtonElement>(element, '[data-question="legacy"] .board-approve').click();
    type(query(element, '[data-answer-text="deadline"]'), '来週');
    await settle(element);
    expect(query(element, '[role="tab"][aria-selected="true"]').getAttribute('data-tab')).toBe('questions');
    expect(tab('questions').querySelector('.board-tab-count')?.textContent).toBe('1');
    expect(tab('questions').getAttribute('data-alert')).toBe('false');
  });

  it('groups blocking questions above the ones the agent carries on with', async () => {
    const element = mount();
    await settle(element);
    const ids = (group: string): (string | null)[] =>
      [...(element.shadowRoot?.querySelectorAll(`[data-group="${group}"] .board-question`) ?? [])].map((node) =>
        node.getAttribute('data-question'),
      );
    expect(ids('blocking')).toEqual(['legacy', 'deadline']);
    expect(ids('provisional')).toEqual(['limit']);
    const order = query(element, '[data-group="blocking"]').compareDocumentPosition(
      query(element, '[data-group="provisional"]'),
    );
    expect(order & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // Without an assumption there is nothing to approve: the answer box is all there is.
    expect(element.shadowRoot?.querySelector('[data-question="deadline"] .board-approve')).toBeNull();
    expect(query<HTMLTextAreaElement>(element, '[data-answer-text="deadline"]').hidden).toBe(false);
    expect(query<HTMLTextAreaElement>(element, '[data-answer-text="limit"]').hidden).toBe(true);
  });

  it('approves an assumption as a draft and takes it back on a second press', async () => {
    const element = mount();
    await settle(element);
    const approve = (): HTMLButtonElement => query(element, '[data-question="limit"] .board-approve');
    approve().click();
    await settle(element);
    expect(element.api.actions.map((entry) => [entry.type, entry.payload])).toEqual([
      ['ANSWER_QUESTION', { kind: 'approve' }],
    ]);
    expect(approve().getAttribute('aria-pressed')).toBe('true');
    expect(query(element, '[data-question="limit"]').getAttribute('data-resolved')).toBe('true');
    approve().click();
    await settle(element);
    expect(element.api.actions).toEqual([]);
  });

  it('answers differently in the text box', async () => {
    const element = mount();
    await settle(element);
    query<HTMLButtonElement>(element, '[data-question="legacy"] .board-other').click();
    await settle(element);
    const area = query<HTMLTextAreaElement>(element, '[data-answer-text="legacy"]');
    expect(area.hidden).toBe(false);
    type(area, '今回で消す');
    await settle(element);
    expect(element.api.state.answers['legacy']).toEqual({ kind: 'answer', text: '今回で消す' });
    expect(query(element, '[data-question="legacy"]').getAttribute('data-resolved')).toBe('true');
    // Pressing "answer differently" again takes the answer back.
    query<HTMLButtonElement>(element, '[data-question="legacy"] .board-other').click();
    await settle(element);
    expect(element.api.actions).toEqual([]);
  });

  it('clears the answer to a question without an assumption once its box is emptied', async () => {
    const element = mount();
    await settle(element);
    const area = query<HTMLTextAreaElement>(element, '[data-answer-text="deadline"]');
    type(area, '来週');
    await settle(element);
    expect(element.api.state.answers['deadline']).toEqual({ kind: 'answer', text: '来週' });
    type(area, '');
    await settle(element);
    expect(element.api.actions).toEqual([]);
  });

  it('shows a proposal as a card in its column and promotes it to a regular task on approval', async () => {
    const element = mount();
    await settle(element);
    const todo = (): HTMLElement => query(element, '[data-todo="index"]');
    expect(todo().getAttribute('data-proposal')).toBe('pending');
    expect(todo().querySelector('.board-todo-state')).toBeNull();
    // A proposal is drawn apart from the work: a "?" beside its title, no status to set.
    expect(todo().querySelector('.board-card-mark')?.textContent?.trim()).toBe('?');
    expect(todo().closest('[data-column]')?.getAttribute('data-column')).toBe('todo');
    query<HTMLButtonElement>(element, '[data-todo="index"] [data-decision="accept"]').click();
    await settle(element);
    expect(element.api.state.decisions).toEqual({ index: 'accept' });
    expect(todo().getAttribute('data-proposal')).toBe('accept');
    expect(todo().querySelector('.board-todo-state')?.textContent?.trim()).toBe('To do');
    query<HTMLButtonElement>(element, '[data-todo="index"] .board-undo').click();
    await settle(element);
    expect(element.api.actions).toEqual([]);
    query<HTMLButtonElement>(element, '[data-todo="index"] [data-decision="decline"]').click();
    await settle(element);
    expect(todo().getAttribute('data-proposal')).toBe('decline');
    // Declined, it keeps its column and offers the way back.
    expect(todo().closest('[data-column]')?.getAttribute('data-column')).toBe('todo');
    expect(todo().querySelector('.board-undo')).not.toBeNull();
  });

  it("changes the status of a person's todo in place, and only shows the agent's", async () => {
    const element = mount();
    await settle(element);
    const root = element.shadowRoot;
    expect(root?.querySelectorAll('.board-todo-status')).toHaveLength(1);
    expect(query(element, '[data-todo="impl"] .board-todo-state').textContent?.trim()).toBe('In progress');
    expect(query(element, '[data-todo="impl"] .board-assignee').textContent?.trim()).toBe('Claude');
    expect(query(element, '[data-todo="review"] .board-assignee').getAttribute('data-kind')).toBe('human');
    await chooseRich(element, '[data-todo="review"]', 'doing');
    expect(element.api.actions.map((entry) => entry.type)).toEqual(['SET_TODO_STATUS']);
    expect(query(element, '[data-todo="review"]').getAttribute('data-changed')).toBe('true');
    // Set the status and the card moves to that status's column.
    expect(query(element, '[data-todo="review"]').closest('[data-column]')?.getAttribute('data-column')).toBe('doing');
    // Setting it back leaves nothing to hand back.
    await chooseRich(element, '[data-todo="review"]', 'todo');
    expect(element.api.actions).toEqual([]);
  });

  it("drops a person's card into another column to set its status, and leaves the agent's own alone", async () => {
    const element = mount();
    await settle(element);
    const lane = (status: string): HTMLElement => query(element, `#board-panel-tasks [data-column="${status}"]`);
    // Only a todo a person has can be picked up: the agent reports its own progress.
    expect(query(element, '[data-todo="review"]').getAttribute('draggable')).toBe('true');
    expect(query(element, '[data-todo="impl"]').getAttribute('draggable')).toBeNull();
    drag(query(element, '[data-todo="review"]'), 'dragstart');
    drag(lane('doing'), 'dragover');
    drag(lane('doing'), 'drop');
    await settle(element);
    expect(element.api.actions.map((entry) => [entry.type, entry.payload])).toEqual([
      ['SET_TODO_STATUS', { status: 'doing' }],
    ]);
    expect(query(element, '[data-todo="review"]').closest('[data-column]')?.getAttribute('data-column')).toBe('doing');
    // Dropping a card back where it was records nothing.
    drag(query(element, '[data-todo="review"]'), 'dragstart');
    drag(lane('doing'), 'drop');
    await settle(element);
    expect(element.api.actions).toHaveLength(1);
  });

  it('keeps every status as a column, the done ones included', async () => {
    const element = mount();
    await settle(element);
    const cards = (status: string): (string | null)[] =>
      [...query(element, `#board-panel-tasks [data-column="${status}"]`).querySelectorAll('.board-card')].map((card) =>
        card.getAttribute('data-todo'),
      );
    expect(cards('done')).toEqual(['design']);
    // Finishing a todo moves its card to the done column rather than folding it away.
    await chooseRich(element, '[data-todo="review"]', 'done');
    expect(cards('done')).toEqual(['design', 'review']);
    expect(cards('todo')).toEqual(['index']);
    // A column with nothing left in it keeps its place, so the board's shape still reads.
    query<HTMLButtonElement>(element, '[data-filter="human"]').click();
    await settle(element);
    expect(query(element, '#board-panel-tasks [data-column="doing"] .board-lane-empty')).not.toBeNull();
    expect(query(element, '#board-panel-tasks [data-column="doing"] .board-lane-count').textContent).toBe('0');
  });

  it('narrows the board to the todos people have', async () => {
    const element = mount();
    await settle(element);
    const ids = (): (string | null)[] =>
      [...(element.shadowRoot?.querySelectorAll('.board-card') ?? [])].map((node) => node.getAttribute('data-todo'));
    const human = query<HTMLButtonElement>(element, '[data-filter="human"]');
    expect(human.getAttribute('aria-pressed')).toBe('false');
    human.click();
    await settle(element);
    expect(ids()).toEqual(['review']);
    expect(query(element, '[data-filter="human"]').getAttribute('aria-pressed')).toBe('true');
    query<HTMLButtonElement>(element, '[data-filter="all"]').click();
    await settle(element);
    expect(ids()).toHaveLength(5);
  });

  it('adds a todo from the form and removes it again', async () => {
    const element = mount();
    await settle(element);
    const form = query<HTMLFormElement>(element, '.board-add-todo');
    query<HTMLInputElement>(element, '.board-add-title').value = '  Write docs ';
    await chooseAssignee(element, 'd-kimuson');
    form.requestSubmit();
    await settle(element);
    expect(element.api.actions.map((entry) => entry.payload)).toEqual([
      { id: 'write-docs', title: 'Write docs', assignee: 'd-kimuson' },
    ]);
    expect(query<HTMLInputElement>(element, '.board-add-title').value).toBe('');
    expect(query(element, '[data-todo="write-docs"]').getAttribute('data-added')).toBe('true');
    query<HTMLButtonElement>(element, '[data-todo="write-docs"] .board-todo-remove').click();
    await settle(element);
    expect(element.api.actions).toEqual([]);
    expect(element.shadowRoot?.querySelector('[data-todo="write-docs"]')).toBeNull();
  });

  it('ignores a blank new todo', async () => {
    const element = mount();
    await settle(element);
    query<HTMLInputElement>(element, '.board-add-title').value = '   ';
    query<HTMLFormElement>(element, '.board-add-todo').requestSubmit();
    await settle(element);
    expect(element.api.actions).toEqual([]);
  });

  it('links a URL output, shows a path as text, and copies either', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const element = mount();
    await settle(element);
    expect(query(element, '[data-output="pr"] .board-output-link').getAttribute('href')).toBe(
      'https://github.com/example/repo/pull/42',
    );
    expect(element.shadowRoot?.querySelector('[data-output="doc"] a')).toBeNull();
    expect(query(element, '[data-output="doc"] .board-output-path').textContent).toBe('docs/design.md');
    expect(element.shadowRoot?.querySelector('[data-output="pr"] .board-comment')).toBeNull();
    query<HTMLButtonElement>(element, '[data-output="doc"] .board-copy').click();
    await settle(element);
    expect(writeText).toHaveBeenCalledWith('docs/design.md');
    expect(query(element, '[data-output="doc"] .board-copy').getAttribute('data-copied')).toBe('true');
  });

  it('opens the review with a note on the item', async () => {
    const element = mount();
    await settle(element);
    const requested = vi.spyOn(element, 'requestComment');
    query<HTMLButtonElement>(element, '[data-todo="impl"] .board-comment').click();
    await settle(element);
    expect(requested).toHaveBeenCalledWith('todo:impl');
    expect(element.notesOpen).toBe(true);
  });

  it('says there are no questions, and offers no filter when the board names nobody', async () => {
    const element = mountWith({ title: 'x', todos: [{ id: 'a', title: 'A' }] });
    await settle(element);
    expect(element.shadowRoot?.querySelector('[data-section="questions"]')).toBeNull();
    expect(query(element, '#board-panel-questions .board-empty')).not.toBeNull();
    expect(query(element, '[data-tab="questions"]').getAttribute('data-alert')).toBe('false');
    expect(element.shadowRoot?.querySelector('[data-filter]')).toBeNull();
    // Nobody is named, so there is nobody to add a todo for.
    expect(element.shadowRoot?.querySelector('.board-add-assignee')).toBeNull();
  });

  it('speaks Japanese when the page does', async () => {
    const element = mount('ja');
    await settle(element);
    const ja = taskBoardMessages('ja');
    expect(query(element, '#board-questions').textContent).toBe(ja.questions);
    expect(query(element, '[data-tab="designs"]').textContent).toContain(ja.tabDesigns);
    expect(query(element, '[data-tab="tasks"]').textContent).toContain(ja.tabTasks);
    expect(query(element, '[data-column="doing"] .board-lane-title').textContent).toBe(ja.todoDoing);
    expect(query(element, '[data-group="blocking"] .board-group-title').textContent).toBe(ja.blockingGroup);
  });

  it('marks a design doc with its card and its head, never with a stripe along an edge', () => {
    // A doc is the same card as the rest of the kit: a colored bar down one
    // side would be decoration the title already says better
    // (dev-docs/guidelines/coding.md).
    const css = String(taskBoardStyles);
    const partRules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(([, selector]) =>
      /(^|[\s,>])\.board-design(?![\w-])/.test(selector ?? ''),
    );
    expect(partRules.length).toBeGreaterThan(0);
    const borders = partRules.flatMap(([, , body]) => [...(body ?? '').matchAll(/border(?:-[a-z]+)*\s*:[^;]*/g)]);
    expect(borders.map((match) => match[0])).toEqual([]);
  });
});

describe('task-board change notices', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('"Show" opens the tab the change is in and highlights it', async () => {
    const element = mountWith(base, 'en', 'question:deadline');
    await settle(element);
    const question = await showChange(element);
    expect(question?.getAttribute('data-question')).toBe('deadline');
    expect(query(element, '[role="tab"][aria-selected="true"]').getAttribute('data-tab')).toBe('questions');
  });

  it('"Show" on a design doc opens the Design Docs tab on that doc', async () => {
    const element = mountWith(base, 'en', 'design:ops');
    await settle(element);
    const doc = await showChange(element);
    expect(doc?.getAttribute('data-design')).toBe('ops');
    expect(query(element, '[role="tab"][aria-selected="true"]').getAttribute('data-tab')).toBe('designs');
    expect(query(element, '[data-design-item="ops"]').getAttribute('aria-current')).toBe('true');
  });

  it('"Show" on a todo opens the task board and clears the filter hiding it', async () => {
    const element = mountWith(base, 'en', 'todo:design');
    await settle(element);
    query<HTMLButtonElement>(element, '[data-filter="human"]').click();
    await settle(element);
    const todo = await showChange(element);
    expect(todo?.getAttribute('data-todo')).toBe('design');
    expect(query(element, '[role="tab"][aria-selected="true"]').getAttribute('data-tab')).toBe('tasks');
    expect(query(element, '[data-filter="all"]').getAttribute('aria-pressed')).toBe('true');
  });
});
