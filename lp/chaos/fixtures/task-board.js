/**
 * Chaos fixtures for `dpk-template-task-board`.
 *
 * @typedef {{
 *   description: string,
 *   base: unknown,
 *   slots?: string,
 *   attributes?: Record<string,string>,
 *   lang?: 'ja'|'en',
 *   hash?: string,
 *   draft?: Array<{type:string,target:string|{type:string,id:string},payload?:unknown}>,
 *   comments?: Array<[target: string, body: string]>,
 *   prepare?: (el: HTMLElement) => void | Promise<void>,
 * }} Fixture
 */

const longAscii = (n) => {
  const unit = 'supercalifragilisticexpialidocious-';
  let out = '';
  while (out.length < n) out += unit;
  return out.slice(0, n);
};

const longJa = (n) => {
  const unit = '仕様から漏れていた境界条件を洗い出すための長い説明文章をここに書いています';
  let out = '';
  while (out.length < n) out += unit;
  return out.slice(0, n);
};

const longUrl = () => `https://example.com/pr/${longAscii(140)}?diff=${'0123456789'.repeat(16)}`;

const rtlEmojiMix = () => 'هذه مهمة طويلة جدا يجب إنجازها قبل الموعد النهائي 👨‍👩‍👧‍👦🧑🏽‍💻🏳️‍🌈 é̂̃';

/** @type {readonly import('../../../src/templates/task-board/model').TodoStatus[]} */
const TODO_STATUS_CYCLE = ['todo', 'doing', 'blocked', 'done'];

/** @type {Record<string, Fixture>} */
export default {
  'extreme-text': {
    description:
      'Context/why-what, member names, todo title/note/reason, an output href/description, a log entry and a question all stuffed with unbroken Japanese/ASCII, a long URL and an RTL/emoji mix.',
    lang: 'ja',
    base: {
      title: `境界値監査: ${longJa(40)}`,
      status: 'working',
      context: {
        why: longJa(220),
        what: longAscii(200),
        goals: [longJa(120), 'すべての境界条件に対してテストを書く'],
        nonGoals: [longAscii(140)],
      },
      members: [
        { id: 'agent-1', name: longAscii(120), kind: 'agent' },
        { id: 'human-1', name: longJa(80), kind: 'human' },
      ],
      todos: [
        {
          id: 'todo-extreme',
          title: longJa(180),
          status: 'doing',
          assignee: 'human-1',
          note: longAscii(260),
          proposed: true,
          reason: rtlEmojiMix(),
        },
      ],
      outputs: [{ id: 'out-1', label: 'PR', href: longUrl(), kind: 'PR', description: longJa(150) }],
      log: [
        {
          id: 'log-1',
          from: 'human-1',
          at: '2026-10-09 09:00',
          title: longAscii(150),
          body: longJa(240),
          points: [longAscii(130), rtlEmojiMix()],
        },
      ],
      questions: [
        {
          id: 'q-1',
          ref: 'Q1',
          title: longJa(160),
          description: longUrl(),
          blocking: true,
          assumption: longAscii(180),
        },
      ],
    },
  },

  'many-items-volume': {
    description:
      '15 members, 120 todos across all statuses, 30 outputs, 50 log entries and 20 questions (mixed blocking/non-blocking) to stress every list and the done-todos collapse.',
    lang: 'en',
    base: {
      title: 'The volume audit',
      status: 'working',
      context: { why: 'Prove the board holds up at scale.', what: 'Generate a lot of everything.' },
      members: Array.from({ length: 15 }, (_, i) => ({
        id: `member-${i + 1}`,
        name: `Member ${i + 1}`,
        kind: i % 4 === 0 ? 'human' : 'agent',
      })),
      todos: Array.from({ length: 120 }, (_, i) => ({
        id: `todo-${i + 1}`,
        title: `Todo ${i + 1}: do a reasonably specific thing`,
        status: TODO_STATUS_CYCLE[i % TODO_STATUS_CYCLE.length],
        assignee: i % 5 === 0 ? undefined : `member-${(i % 15) + 1}`,
        proposed: i % 7 === 0,
        reason: i % 7 === 0 ? 'Found while working on a neighboring todo.' : undefined,
      })),
      outputs: Array.from({ length: 30 }, (_, i) => ({
        id: `output-${i + 1}`,
        label: `Artifact ${i + 1}`,
        href: `https://example.com/artifact/${i + 1}`,
        kind: i % 2 === 0 ? 'PR' : 'Doc',
      })),
      log: Array.from({ length: 50 }, (_, i) => ({
        id: `log-${i + 1}`,
        from: i % 3 === 0 ? `member-${(i % 15) + 1}` : undefined,
        at: `2026-10-${String((i % 28) + 1).padStart(2, '0')} 10:00`,
        title: `Log entry ${i + 1}`,
        points: i % 4 === 0 ? [`Detail A for ${i + 1}`, `Detail B for ${i + 1}`] : [],
      })),
      questions: Array.from({ length: 20 }, (_, i) => ({
        id: `question-${i + 1}`,
        title: `Question ${i + 1}: which way should we go?`,
        blocking: i % 2 === 0,
        assumption: i % 2 === 0 ? undefined : `Assuming option A for question ${i + 1}.`,
      })),
    },
  },

  'empty-minimal': {
    description: 'Minimal base `{}` — no members/todos/outputs/log/questions, every section renders its empty state.',
    lang: 'ja',
    base: {},
  },

  'single-item-each': {
    description:
      'Exactly one member, one todo (unassigned), one output, one log entry and one question — tests the "no human members yet" filter state and a never-assigned todo.',
    lang: 'en',
    base: {
      title: 'The smallest possible board',
      status: 'waiting',
      context: { why: 'Check the single-item edges.' },
      members: [{ id: 'only-member', name: 'Only Member', kind: 'agent' }],
      todos: [{ id: 'only-todo', title: 'The only todo' }],
      outputs: [{ id: 'only-output', href: 'https://example.com/only' }],
      log: [{ id: 'only-log', title: 'The only log entry' }],
      questions: [{ id: 'only-question', title: 'The only question', blocking: false, assumption: 'Assuming yes.' }],
    },
  },

  'drafts-many-types-valid': {
    description:
      'A single dispatchBatch with only valid actions (approve + long answer on questions, accept/decline on two proposals, a status change on a human todo, and an ADD_TODO followed by a DELETE_TODO of the same id) — dispatchBatch is all-or-nothing, so every entry must already be valid against its target.',
    lang: 'en',
    base: {
      title: 'Board with a full set of valid actions to replay',
      status: 'working',
      members: [
        { id: 'agent-1', name: 'Agent', kind: 'agent' },
        { id: 'alice', name: 'Alice', kind: 'human' },
      ],
      todos: [
        { id: 'todo-human', title: 'A todo assigned to a person', assignee: 'alice' },
        { id: 'todo-proposed-a', title: 'Proposed todo A', proposed: true, reason: 'Seems worth doing.' },
        { id: 'todo-proposed-b', title: 'Proposed todo B', proposed: true, reason: 'Also seems worth doing.' },
      ],
      questions: [
        {
          id: 'question-provisional',
          title: 'Fine with the assumed default?',
          blocking: false,
          assumption: 'Default is fine.',
        },
        { id: 'question-blocking', title: 'Which approach do you want?', blocking: true },
      ],
    },
    draft: [
      {
        type: 'ANSWER_QUESTION',
        target: { type: 'question', id: 'question-provisional' },
        payload: { kind: 'approve' },
      },
      {
        type: 'ANSWER_QUESTION',
        target: { type: 'question', id: 'question-blocking' },
        payload: { kind: 'answer', text: longAscii(260) },
      },
      { type: 'DECIDE_PROPOSAL', target: { type: 'todo', id: 'todo-proposed-a' }, payload: { decision: 'accept' } },
      { type: 'DECIDE_PROPOSAL', target: { type: 'todo', id: 'todo-proposed-b' }, payload: { decision: 'decline' } },
      { type: 'SET_TODO_STATUS', target: { type: 'todo', id: 'todo-human' }, payload: { status: 'doing' } },
      {
        type: 'ADD_TODO',
        target: { type: 'page', id: 'task-board' },
        payload: { id: 'todo-added-1', title: 'A todo the reader adds', assignee: null },
      },
      {
        type: 'ADD_TODO',
        target: { type: 'page', id: 'task-board' },
        payload: { id: 'todo-added-2', title: 'A todo the reader adds then removes', assignee: 'alice' },
      },
      { type: 'DELETE_TODO', target: { type: 'todo', id: 'todo-added-2' }, payload: {} },
    ],
  },

  'stale-drafts-probe': {
    description:
      'A dedicated draft array of ONLY invalid-target/constraint-violated actions (missing question, non-human SET_TODO_STATUS, DECIDE_PROPOSAL on a non-proposed todo, duplicate ADD_TODO id, DELETE_TODO on a non-added todo) to probe dispatchBatch all-or-nothing rejection, plus reliable stale comments (which bypass that check) targeting missing todo/log/question/context ids.',
    lang: 'ja',
    attributes: { notes: 'on' },
    base: {
      title: '欠落したターゲットの検証',
      members: [{ id: 'agent-1', name: 'エージェント', kind: 'agent' }],
      todos: [{ id: 'todo-agent-owned', title: 'エージェント自身のタスク', assignee: 'agent-1' }],
      questions: [{ id: 'question-existing', title: '既存の質問', blocking: false, assumption: '仮定はこれです。' }],
    },
    draft: [
      { type: 'ANSWER_QUESTION', target: { type: 'question', id: 'question-removed' }, payload: { kind: 'approve' } },
      { type: 'SET_TODO_STATUS', target: { type: 'todo', id: 'todo-agent-owned' }, payload: { status: 'done' } },
      { type: 'DECIDE_PROPOSAL', target: { type: 'todo', id: 'todo-agent-owned' }, payload: { decision: 'accept' } },
      {
        type: 'ADD_TODO',
        target: { type: 'page', id: 'task-board' },
        payload: { id: 'todo-agent-owned', title: '重複した ID', assignee: null },
      },
      { type: 'DELETE_TODO', target: { type: 'todo', id: 'todo-agent-owned' }, payload: {} },
    ],
    comments: [
      ['todo:removed-todo-1', longJa(200)],
      ['todo:removed-todo-1', '削除されたタスクへの2本目のコメント。' + longAscii(140)],
      ['log:removed-log-1', longJa(180)],
      ['question:removed-question-1', rtlEmojiMix()],
      ['context:goals', '存在しない goals への古いコメント。'],
      ['todo:todo-agent-owned', '残っているタスクへの通常のコメント。'],
    ],
  },

  'many-comments': {
    description:
      '34 long comments spread across questions/todos/log entries and the context parts, including markdown-looking literal text, with the review rail open from load.',
    lang: 'en',
    attributes: { notes: 'on' },
    base: {
      title: 'Heavily annotated board',
      context: { why: 'Collect a lot of review feedback.', what: 'A board with just enough structure to annotate.' },
      members: [{ id: 'agent-1', name: 'Agent', kind: 'agent' }],
      todos: [
        { id: 'todo-a', title: 'Todo A' },
        { id: 'todo-b', title: 'Todo B', proposed: true, reason: 'Found along the way.' },
      ],
      log: [{ id: 'log-a', title: 'Decision log entry' }],
      questions: [{ id: 'question-a', title: 'Open question', blocking: true }],
    },
    comments: [
      ...Array.from({ length: 24 }, (_, i) => [
        'todo:todo-a',
        i % 3 === 0
          ? `Comment ${i + 1}: \`inline code\` and a | table | row | that | keeps | growing | wider |`
          : `Comment ${i + 1}: ${longAscii(130)}`,
      ]),
      ...Array.from({ length: 6 }, (_, i) => ['question:question-a', `Question note ${i + 1}: ${longAscii(120)}`]),
      ['log:log-a', '# Heading inside a plain comment\n- one\n- two\n\n```js\nconst x = 1;\n```'],
      ['context:why', longJa(200)],
      ['context:nonGoals', 'a [markdown link](' + longUrl() + ') inside a plain comment'],
      ['page:task-board', rtlEmojiMix()],
    ],
  },

  'wip-ui-states': {
    description:
      'Opens the Questions tab, switches the filter to "assigned to a person", types a long unsent value into the add-todo input without submitting, and opens the done-todos details — all work-in-progress UI state, not draft actions.',
    lang: 'ja',
    base: {
      title: '作業中の画面状態',
      members: [
        { id: 'agent-1', name: 'エージェント', kind: 'agent' },
        { id: 'human-1', name: '担当者A', kind: 'human' },
      ],
      todos: [
        { id: 'todo-done-1', title: '完了済みタスク1', status: 'done', assignee: 'human-1' },
        { id: 'todo-done-2', title: '完了済みタスク2', status: 'done' },
        { id: 'todo-open', title: '未完了のタスク', status: 'doing', assignee: 'human-1' },
      ],
      questions: [
        { id: 'question-blocking', title: 'ブロッキングな質問', blocking: true },
        {
          id: 'question-provisional',
          title: '仮実装で進めている質問',
          blocking: false,
          assumption: '当面はこの仮定で進めます。',
        },
      ],
    },
    prepare: (el) => {
      try {
        el.shadowRoot?.querySelector('.board-tabs button[data-tab="questions"]')?.click();
        el.shadowRoot?.querySelector('.board-filter-option[data-filter="human"]')?.click();
        const input = el.shadowRoot?.querySelector('.board-add-title');
        if (input) {
          input.value = `${longAscii(160)} ${longJa(160)}`;
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
        const details = el.shadowRoot?.querySelector('details.board-done');
        if (details) details.open = true;
      } catch {
        // best-effort UI setup only
      }
    },
  },
};
