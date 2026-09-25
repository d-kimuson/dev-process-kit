// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { DraftAction } from '../../core/types';
import type { DpkTemplateTaskBoard } from './element';

import '../../index';
import { addTodo, answerQuestion, decideProposal, deleteTodo, setTodoStatus } from './actions';
import { applyTaskBoardAction } from './apply';
import { taskBoardDefinitionFor, taskBoardHasTarget } from './definition';
import { taskBoardMessages } from './messages';
import { emptyTaskBoardBase, parseTaskBoardBase, type TaskBoardState } from './model';
import {
  describeTaskBoardAction,
  outputLocation,
  presentOutputs,
  presentContext,
  presentLog,
  presentQuestions,
  presentTodos,
  taskBoardCommentTargets,
} from './present';

const m = taskBoardMessages('en');

const base = {
  title: '検索 API のページング対応',
  status: 'waiting',
  updatedAt: '2026-09-25 14:10',
  members: [
    { id: 'agent', name: 'Claude' },
    { id: 'kaito', name: 'Kaito', kind: 'human' },
  ],
  todos: [
    { id: 'design', title: '方式を決める', status: 'done', assignee: 'agent' },
    { id: 'impl', title: '実装する', status: 'doing', assignee: 'agent', note: '残り: テスト' },
    { id: 'review', title: 'レビューする', assignee: 'kaito' },
    { id: 'deploy', title: 'デプロイする', status: 'blocked' },
    { id: 'index', title: 'created_at に index を張る', proposed: true, reason: '並べ替えが遅い' },
  ],
  outputs: [
    { id: 'pr', label: 'PR #42', href: 'https://github.com/example/repo/pull/42', kind: 'PR' },
    { id: 'doc', href: 'docs/design.md', description: '' },
  ],
  context: {
    why: '深いページで一覧が遅い。',
    what: '一覧 API を cursor 方式にする。',
    goals: ['どのページも 200ms 以内'],
    nonGoals: ['検索条件の追加'],
  },
  log: [
    { id: 'l1', from: 'kaito', at: '12:50', body: '一覧が遅いので直してほしい' },
    { id: 'l2', title: '方式を比較した', at: '13:00', points: ['offset は遅い'] },
    { id: 'l3', from: 'agent', title: 'cursor で実装を始めた', at: '14:00', body: '既存 API は互換を保つ。' },
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
      assignee: 'kaito',
      note: null,
      proposed: false,
      reason: null,
      added: false,
    });
    expect(state.todos[4]).toMatchObject({ proposed: true, reason: '並べ替えが遅い' });
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
    expect(state.context).toEqual({
      why: '深いページで一覧が遅い。',
      what: '一覧 API を cursor 方式にする。',
      goals: ['どのページも 200ms 以内'],
      nonGoals: ['検索条件の追加'],
    });
    expect(state.log[0]).toEqual({
      id: 'l1',
      from: 'kaito',
      at: '12:50',
      title: null,
      body: '一覧が遅いので直してほしい',
      points: [],
    });
    expect(state.log[1]?.from).toBeNull();
    // Blank design-doc fields read as missing, so the tab never shows an empty heading.
    expect(parseTaskBoardBase({ context: { why: ' ', goals: ['', 'A'] } }).context).toEqual({
      why: null,
      what: null,
      goals: ['A'],
      nonGoals: [],
    });
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
    // A log entry says something, and comes from someone the board names.
    expect(() => parseTaskBoardBase({ log: [{ id: 'l', at: '10:00' }] })).toThrow(/title or a body/);
    expect(() => parseTaskBoardBase({ log: [{ id: 'l', body: 'x', from: 'ghost' }] })).toThrow(/not in members/);
    expect(() =>
      parseTaskBoardBase({
        log: [
          { id: 'l', body: 'x' },
          { id: 'l', body: 'y' },
        ],
      }),
    ).toThrow(/duplicate log id/);
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

  it('lays out the design doc: why, what, goals and non-goals', () => {
    expect(presentContext(m, state, none)).toEqual({
      parts: [
        { id: 'why', title: 'Why', text: '深いページで一覧が遅い。', items: [], comments: 0 },
        { id: 'what', title: 'What', text: '一覧 API を cursor 方式にする。', items: [], comments: 0 },
        { id: 'goals', title: 'Goals', text: null, items: ['どのページも 200ms 以内'], comments: 0 },
        { id: 'nonGoals', title: 'Non-goals', text: null, items: ['検索条件の追加'], comments: 0 },
      ],
    });
    const partial = parseTaskBoardBase({ context: { what: 'X' } });
    expect(presentContext(m, partial, (target) => (target === 'context:what' ? 2 : 0)).parts).toEqual([
      { id: 'what', title: 'What', text: 'X', items: [], comments: 2 },
    ]);
    expect(presentContext(m, emptyTaskBoardBase(), none).parts).toEqual([]);
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

  it('lists proposals among the todos and leaves undecided or declined ones out of the progress', () => {
    const vm = presentTodos(m, state, state, none);
    expect(vm.done.map((todo) => todo.id)).toEqual(['design']);
    expect(vm.todos.map((todo) => [todo.id, todo.proposal])).toEqual([
      ['impl', null],
      ['review', null],
      ['deploy', null],
      ['index', 'pending'],
    ]);
    expect(vm.progress).toMatchObject({ done: 1, total: 4, label: '1 of 4 done' });
    const accepted = apply(state, decideProposal('index', 'accept'));
    if (accepted === null) throw new Error('not applied');
    const after = presentTodos(m, accepted, state, none);
    expect(after.todos.at(-1)?.proposal).toBe('accept');
    // Accepted, it is the agent's to carry out: still not the reader's to tick off.
    expect(after.todos.at(-1)?.editable).toBe(false);
    expect(after.progress.total).toBe(5);
    expect(presentTodos(m, emptyTaskBoardBase(), emptyTaskBoardBase(), none).progress.label).toBe('No todos yet');
  });

  it('lets the reader tick off only the todos a person has', () => {
    const vm = presentTodos(m, state, state, none);
    expect(vm.todos.map((todo) => [todo.id, todo.editable, todo.assigneeName])).toEqual([
      ['impl', false, 'Claude'],
      ['review', true, 'Kaito'],
      ['deploy', false, null],
      ['index', false, null],
    ]);
  });

  it('folds away what was already done, but not what the reader just finished', () => {
    const finished = apply(state, setTodoStatus('review', 'done'));
    if (finished === null) throw new Error('not applied');
    const vm = presentTodos(m, finished, state, none);
    expect(vm.done.map((todo) => todo.id)).toEqual(['design']);
    expect(vm.todos.find((todo) => todo.id === 'review')?.status).toBe('done');
    expect(vm.progress.done).toBe(2);
  });

  it('narrows the list to the todos people have, when the board names a person', () => {
    const vm = presentTodos(m, state, state, none, 'human');
    expect(vm.filter).toBe('human');
    expect(vm.canFilter).toBe(true);
    expect(vm.todos.map((todo) => todo.id)).toEqual(['review']);
    expect(vm.done).toEqual([]);
    expect(vm.humanCount).toBe(1);
    // Progress is the whole task's, whatever the list shows.
    expect(vm.progress.total).toBe(4);
    const nobody = parseTaskBoardBase({ todos: [{ id: 'a', title: 'A' }] });
    const unfiltered = presentTodos(m, nobody, nobody, none, 'human');
    expect(unfiltered.canFilter).toBe(false);
    expect(unfiltered.filter).toBe('all');
    expect(unfiltered.todos).toHaveLength(1);
  });

  it('marks todos the reader changed or added', () => {
    const changed = apply(state, setTodoStatus('review', 'doing'));
    const added = changed && apply(changed, addTodo('docs', 'Docs', null));
    if (added === null) throw new Error('not applied');
    const todos = presentTodos(m, added, state, (target) => (target === 'todo:impl' ? 2 : 0)).todos;
    expect(todos.map((todo) => [todo.id, todo.changed, todo.added])).toEqual([
      ['impl', false, false],
      ['review', true, false],
      ['deploy', false, false],
      ['index', false, false],
      ['docs', false, true],
    ]);
    expect(todos[0]?.comments).toBe(2);
    expect(todos[1]?.assigneeKind).toBe('human');
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

  it('lists the conversation newest first, and puts where the task stands on the newest entry', () => {
    const log = presentLog(m, state, none);
    expect(log.entries.map((entry) => [entry.id, entry.latest, entry.author?.name, entry.author?.kind])).toEqual([
      ['l3', true, 'Claude', 'agent'],
      ['l2', false, undefined, undefined],
      ['l1', false, 'Kaito', 'human'],
    ]);
    // Without a title the body names the entry, cut short.
    expect(log.entries.map((entry) => entry.label)).toEqual([
      'cursor で実装を始めた',
      '方式を比較した',
      '一覧が遅いので直してほしい',
    ]);
    expect(log.status).toEqual({ status: 'waiting', label: 'Waiting on you', updatedAt: '2026-09-25 14:10' });
    expect(presentLog(m, emptyTaskBoardBase(), none)).toEqual({ entries: [], status: null });
    const long = parseTaskBoardBase({ log: [{ id: 'l', body: 'x'.repeat(80) }] });
    expect(presentLog(m, long, none).entries[0]?.label).toBe(`${'x'.repeat(47)}…`);
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
    expect(describeTaskBoardAction(m, action(addTodo('docs', 'Docs', 'kaito')), state, state)).toMatchObject({
      title: 'Add a todo',
      targetLabel: 'Todo · Docs',
      tone: 'create',
      summary: 'Assignee: Kaito',
    });
    expect(describeTaskBoardAction(m, action(decideProposal('index', 'accept')), state, state)).toMatchObject({
      title: 'Accept the proposal',
      targetLabel: 'Proposal · created_at に index を張る',
    });
  });

  it('offers questions, todos, log entries and the design doc as comment targets, grouped', () => {
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
      'log:l1',
      'log:l2',
      'log:l3',
      'context:why',
      'context:what',
      'context:goals',
      'context:nonGoals',
    ]);
    expect(new Set(targets.map((target) => target.group))).toEqual(
      new Set(['Question', 'Proposal', 'Todo', 'Log', 'Context']),
    );
  });
});

describe('task board definition', () => {
  const state = parseTaskBoardBase(base);
  const definition = taskBoardDefinitionFor('en');

  it('knows its targets and titles itself', () => {
    expect(taskBoardHasTarget(state, { type: 'todo', id: 'impl' })).toBe(true);
    expect(taskBoardHasTarget(state, { type: 'log', id: 'l1' })).toBe(true);
    expect(taskBoardHasTarget(state, { type: 'report', id: 'l1' })).toBe(false);
    expect(taskBoardHasTarget(state, { type: 'context', id: 'why' })).toBe(true);
    expect(taskBoardHasTarget(parseTaskBoardBase({}), { type: 'context', id: 'why' })).toBe(false);
    expect(taskBoardHasTarget(state, { type: 'context', id: 'how' })).toBe(false);
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

const mountWith = (data: unknown, lang = 'en'): DpkTemplateTaskBoard => {
  document.body.innerHTML = `
    <dpk-template-task-board storage="memory" lang="${lang}">
      <script type="application/json">${JSON.stringify(data)}</script>
    </dpk-template-task-board>`;
  const element = document.querySelector('dpk-template-task-board');
  if (!(element instanceof HTMLElement)) throw new Error('element did not upgrade');
  return element as DpkTemplateTaskBoard;
};

const mount = (lang = 'en'): DpkTemplateTaskBoard => mountWith(base, lang);

const settle = async (element: DpkTemplateTaskBoard): Promise<void> => {
  await element.api.ready;
  for (let i = 0; i < 3; i += 1) {
    await element.updateComplete;
    await Promise.resolve();
  }
};

const query = <T extends Element>(element: DpkTemplateTaskBoard, selector: string): T => {
  const found = element.shadowRoot?.querySelector<T>(selector);
  if (found === null || found === undefined) throw new Error(`no ${selector}`);
  return found;
};

const choose = (select: HTMLSelectElement, value: string): void => {
  select.value = value;
  select.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
};

const type = (area: HTMLTextAreaElement, value: string): void => {
  area.value = value;
  area.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
};

afterEach(() => {
  document.body.replaceChildren();
  window.location.hash = '';
  vi.restoreAllMocks();
});

describe('<dpk-template-task-board>', () => {
  it('puts context, work log and questions under tabs in the main area, and the outputs and todos in the side rail', async () => {
    const element = mount();
    await settle(element);
    const root = element.shadowRoot;
    expect(root?.querySelector('.dpk-banner')).toBeNull();
    const main = root?.querySelector('.dpk-main');
    const side = root?.querySelector('.dpk-sidebar');
    expect(side?.hasAttribute('hidden')).toBe(false);
    const tabs = [...(main?.querySelectorAll('[role="tab"]') ?? [])];
    expect(tabs.map((tab) => tab.getAttribute('data-tab'))).toEqual(['context', 'log', 'questions']);
    expect(tabs.map((tab) => tab.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false']);
    const panel = (tab: string): HTMLElement => query(element, `#board-panel-${tab}`);
    expect(panel('context').hidden).toBe(false);
    expect(panel('log').hidden).toBe(true);
    expect(panel('questions').hidden).toBe(true);
    expect(
      [...panel('context').querySelectorAll('[data-context]')].map((node) => node.getAttribute('data-context')),
    ).toEqual(['why', 'what', 'goals', 'nonGoals']);
    expect(panel('context').querySelector('[data-context="why"] .board-context-text')?.textContent).toContain(
      '深いページで一覧が遅い。',
    );
    // Where things stand lives on the newest log entry, not in the context.
    expect(panel('context').querySelector('.board-status')).toBeNull();
    expect(panel('questions').querySelectorAll('.board-question')).toHaveLength(3);
    expect(panel('log').querySelectorAll('.board-log-entry')).toHaveLength(3);
    expect(side?.querySelectorAll('.board-output')).toHaveLength(2);
    expect(side?.querySelectorAll('.board-todo')).toHaveLength(5);
    // The "waiting on you" card and its hand-back button are gone: the review button does that.
    expect(root?.querySelector('.board-overview')).toBeNull();
    expect(root?.querySelector('.board-hand-back')).toBeNull();
  });

  it('shows the conversation newest first, with where the task stands on the newest entry', async () => {
    const element = mount();
    await settle(element);
    const entries = [...(element.shadowRoot?.querySelectorAll('#board-panel-log .board-log-entry') ?? [])];
    expect(entries.map((entry) => entry.getAttribute('data-log'))).toEqual(['l3', 'l2', 'l1']);
    expect(entries.map((entry) => entry.getAttribute('data-from'))).toEqual(['agent', 'agent', 'human']);
    expect(entries[2]?.querySelector('.board-log-author')?.textContent).toContain('Kaito');
    const latest = entries[0];
    expect(latest?.getAttribute('data-latest')).toBe('true');
    expect(latest?.querySelector('.board-status')?.getAttribute('data-status')).toBe('waiting');
    expect(latest?.querySelector('.board-updated')?.textContent).toContain('2026-09-25 14:10');
    expect(entries[1]?.querySelector('.board-status')).toBeNull();
    const requested = vi.spyOn(element, 'requestComment');
    query<HTMLButtonElement>(element, '[data-log="l1"] .board-comment').click();
    expect(requested).toHaveBeenCalledWith('log:l1');
  });

  it("puts the author's diagrams under the design doc, and asks for the context when there is none", async () => {
    document.body.innerHTML = `
      <dpk-template-task-board storage="memory">
        <script type="application/json">${JSON.stringify({ title: 'x' })}</script>
        <div slot="main" id="figure">ER</div>
      </dpk-template-task-board>`;
    const element = document.querySelector('dpk-template-task-board') as DpkTemplateTaskBoard;
    await settle(element);
    const slot = query<HTMLSlotElement>(element, '#board-panel-context slot[name="main"]');
    expect(slot.assignedElements().map((node) => node.id)).toEqual(['figure']);
    // A figure alone is context enough.
    expect(element.shadowRoot?.querySelector('#board-panel-context .board-empty')).toBeNull();
    const bare = mountWith({ title: 'x' });
    await settle(bare);
    expect(query(bare, '#board-panel-context .board-empty').textContent).toBe(m.noContext);
    expect(query(bare, '#board-panel-log .board-empty').textContent).toBe(m.noLog);
    const commented = mount();
    await settle(commented);
    const requested = vi.spyOn(commented, 'requestComment');
    query<HTMLButtonElement>(commented, '[data-context="what"] .board-comment').click();
    expect(requested).toHaveBeenCalledWith('context:what');
  });

  it('switches tabs by click and by arrow keys, and counts what is left to answer', async () => {
    const element = mount();
    await settle(element);
    const tab = (name: string): HTMLButtonElement => query(element, `[data-tab="${name}"]`);
    expect(tab('questions').querySelector('.board-tab-count')?.textContent).toBe('3');
    expect(tab('questions').getAttribute('data-alert')).toBe('true');
    expect(tab('log').querySelector('.board-tab-count')?.textContent).toBe('3');
    tab('questions').click();
    await settle(element);
    expect(query<HTMLElement>(element, '#board-panel-questions').hidden).toBe(false);
    expect(query<HTMLElement>(element, '#board-panel-context').hidden).toBe(true);
    tab('questions').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await settle(element);
    expect(tab('context').getAttribute('aria-selected')).toBe('true');
    tab('context').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    await settle(element);
    expect(tab('questions').getAttribute('aria-selected')).toBe('true');
    tab('questions').dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    await settle(element);
    expect(tab('context').getAttribute('aria-selected')).toBe('true');
    // Answering the blockers turns the badge from red to plain.
    query<HTMLButtonElement>(element, '[data-question="legacy"] .board-approve').click();
    type(query(element, '[data-answer-text="deadline"]'), '来週');
    await settle(element);
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

  it('shows a proposal in the todo list and promotes it to a todo on approval', async () => {
    const element = mount();
    await settle(element);
    const todo = (): HTMLElement => query(element, '[data-todo="index"]');
    expect(todo().getAttribute('data-proposal')).toBe('pending');
    expect(todo().querySelector('.board-todo-state')).toBeNull();
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
  });

  it("changes the status of a person's todo in place, and only shows the agent's", async () => {
    const element = mount();
    await settle(element);
    const root = element.shadowRoot;
    expect(root?.querySelectorAll('.board-todo-status')).toHaveLength(1);
    expect(root?.querySelector('.board-todo-assignee')).toBeNull();
    expect(query(element, '[data-todo="impl"] .board-todo-state').textContent?.trim()).toBe('In progress');
    expect(query(element, '[data-todo="impl"] .board-assignee').textContent?.trim()).toBe('Claude');
    expect(query(element, '[data-todo="review"] .board-assignee').getAttribute('data-kind')).toBe('human');
    choose(query(element, '[data-todo="review"] .board-todo-status'), 'doing');
    await settle(element);
    expect(element.api.actions.map((entry) => entry.type)).toEqual(['SET_TODO_STATUS']);
    expect(query(element, '[data-todo="review"]').getAttribute('data-changed')).toBe('true');
    // Setting it back leaves nothing to hand back.
    choose(query(element, '[data-todo="review"] .board-todo-status'), 'todo');
    await settle(element);
    expect(element.api.actions).toEqual([]);
  });

  it('folds the done todos away until the reader opens them', async () => {
    const element = mount();
    await settle(element);
    const folded = query<HTMLDetailsElement>(element, 'details.board-done');
    expect(folded.open).toBe(false);
    expect(folded.querySelector('summary')?.textContent).toContain('Done (1)');
    expect(folded.querySelector('[data-todo="design"]')).not.toBeNull();
    // The finished ones sit above what is still open.
    const open = query(element, '[data-section="todos"] > .board-todos');
    expect(folded.compareDocumentPosition(open) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // A todo the reader just finished stays where it was.
    choose(query(element, '[data-todo="review"] .board-todo-status'), 'done');
    await settle(element);
    expect(query(element, '[data-todo="review"]').closest('details')).toBeNull();
  });

  it('narrows the todos to the ones people have', async () => {
    const element = mount();
    await settle(element);
    const ids = (): (string | null)[] =>
      [...(element.shadowRoot?.querySelectorAll('.board-todo') ?? [])].map((node) => node.getAttribute('data-todo'));
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
    choose(query(element, '.board-add-assignee'), 'kaito');
    form.requestSubmit();
    await settle(element);
    expect(element.api.actions.map((entry) => entry.payload)).toEqual([
      { id: 'write-docs', title: 'Write docs', assignee: 'kaito' },
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
    expect(query(element, '[data-tab="log"]').textContent).toContain(ja.tabLog);
    expect(query(element, '[data-group="blocking"] .board-group-title').textContent).toBe(ja.blockingGroup);
  });
});
