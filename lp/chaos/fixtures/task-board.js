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

/** @type {readonly import('../../../src/views/task-board/model').TodoStatus[]} */
const TODO_STATUS_CYCLE = ['todo', 'doing', 'blocked', 'done'];

/** @type {Record<string, Fixture>} */
export default {
  'extreme-text': {
    description:
      'A design doc body, member names, todo title/note/reason, an output href/description and a question all stuffed with unbroken Japanese/ASCII, a long URL and an RTL/emoji mix.',
    lang: 'ja',
    base: {
      title: `境界値監査: ${longJa(40)}`,
      status: 'working',
      designs: [
        {
          id: 'design-extreme',
          title: longJa(80),
          body: `## ${longAscii(90)}\n\n${longJa(420)}\n\n- ${longAscii(130)}\n- ${rtlEmojiMix()}\n\n> ${longUrl()}`,
        },
      ],
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
          design: 'design-extreme',
          proposed: true,
          reason: rtlEmojiMix(),
        },
      ],
      outputs: [{ id: 'out-1', label: 'PR', href: longUrl(), kind: 'PR', description: longJa(150) }],
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
      '15 members, 5 design docs, 120 todos across all statuses, 30 outputs and 20 questions (mixed blocking/non-blocking) to stress every list, the design-to-task groups and the task board.',
    lang: 'en',
    base: {
      title: 'The volume audit',
      status: 'working',
      designs: Array.from({ length: 5 }, (_, i) => ({
        id: `design-${i + 1}`,
        title: `Design doc ${i + 1}: the shape of part ${i + 1}`,
        body: `## Approach\n${`Part ${i + 1} is designed this way. `.repeat(12)}\n\n- one\n- two\n- three`,
      })),
      members: Array.from({ length: 15 }, (_, i) => ({
        id: `member-${i + 1}`,
        name: `Member ${i + 1}`,
        kind: i % 4 === 0 ? 'human' : 'agent',
      })),
      todos: Array.from({ length: 120 }, (_, i) => ({
        id: `todo-${i + 1}`,
        title: `Todo ${i + 1}: do a reasonably specific thing`,
        status: TODO_STATUS_CYCLE[i % TODO_STATUS_CYCLE.length],
        design: `design-${(i % 5) + 1}`,
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
      questions: Array.from({ length: 20 }, (_, i) => ({
        id: `question-${i + 1}`,
        title: `Question ${i + 1}: which way should we go?`,
        blocking: i % 2 === 0,
        assumption: i % 2 === 0 ? undefined : `Assuming option A for question ${i + 1}.`,
      })),
    },
  },

  'empty-minimal': {
    description:
      'Minimal base `{}` — no designs/members/todos/outputs/questions, every section renders its empty state.',
    lang: 'ja',
    base: {},
  },

  'single-item-each': {
    description:
      'Exactly one design doc, one member, one todo (unassigned and linked to the doc), one output and one question — tests the "no human members yet" filter state and a never-assigned todo.',
    lang: 'en',
    base: {
      title: 'The smallest possible board',
      status: 'waiting',
      designs: [{ id: 'only-design', title: 'The only design doc', body: 'One short paragraph.' }],
      members: [{ id: 'only-member', name: 'Only Member', kind: 'agent' }],
      todos: [{ id: 'only-todo', title: 'The only todo', design: 'only-design' }],
      outputs: [{ id: 'only-output', href: 'https://example.com/only' }],
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
      designs: [{ id: 'design-a', title: 'Design A', body: 'The design the todos below carry out.' }],
      members: [
        { id: 'agent-1', name: 'Agent', kind: 'agent' },
        { id: 'alice', name: 'Alice', kind: 'human' },
      ],
      todos: [
        { id: 'todo-human', title: 'A todo assigned to a person', assignee: 'alice', design: 'design-a' },
        {
          id: 'todo-proposed-a',
          title: 'Proposed todo A',
          proposed: true,
          reason: 'Seems worth doing.',
          design: 'design-a',
        },
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
      'A dedicated draft array of ONLY invalid-target/constraint-violated actions (missing question, non-human SET_TODO_STATUS, DECIDE_PROPOSAL on a non-proposed todo, duplicate ADD_TODO id, DELETE_TODO on a non-added todo) to probe dispatchBatch all-or-nothing rejection, plus reliable stale comments (which bypass that check) targeting missing todo/design/question ids.',
    lang: 'ja',
    attributes: { notes: 'on' },
    base: {
      title: '欠落したターゲットの検証',
      designs: [{ id: 'design-running', title: '残っている Design Doc', body: '本文。' }],
      members: [{ id: 'agent-1', name: 'エージェント', kind: 'agent' }],
      todos: [
        { id: 'todo-agent-owned', title: 'エージェント自身のタスク', assignee: 'agent-1', design: 'design-running' },
      ],
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
      ['design:removed-design-1', longJa(180)],
      ['question:removed-question-1', rtlEmojiMix()],
      ['design:removed-design-2', '存在しない Design Doc への古いコメント。'],
      ['todo:todo-agent-owned', '残っているタスクへの通常のコメント。'],
    ],
  },

  'many-comments': {
    description:
      '33 long comments spread across questions/todos/design docs, including markdown-looking literal text, with the review rail open from load.',
    lang: 'en',
    attributes: { notes: 'on' },
    base: {
      title: 'Heavily annotated board',
      designs: [
        {
          id: 'design-a',
          title: 'Cursor paging',
          body: '## Approach\nThe design under review.\n\n- one\n- two',
        },
      ],
      members: [{ id: 'agent-1', name: 'Agent', kind: 'agent' }],
      todos: [
        { id: 'todo-a', title: 'Todo A', design: 'design-a' },
        { id: 'todo-b', title: 'Todo B', proposed: true, reason: 'Found along the way.', design: 'design-a' },
      ],
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
      ['design:design-a', '# Heading inside a plain comment\n- one\n- two\n\n```js\nconst x = 1;\n```'],
      ['design:design-a', longJa(200)],
      ['design:removed-design', 'a [markdown link](' + longUrl() + ') inside a plain comment'],
      ['page:task-board', rtlEmojiMix()],
    ],
  },

  'wip-ui-states': {
    description:
      'Opens the Questions tab, switches the filter to "assigned to a person" and types a long unsent value into the add-todo input without submitting — all work-in-progress UI state, not draft actions.',
    lang: 'ja',
    base: {
      title: '作業中の画面状態',
      designs: [{ id: 'design-a', title: 'Design Doc A', body: '## 方針\nこの設計で進める。' }],
      members: [
        { id: 'agent-1', name: 'エージェント', kind: 'agent' },
        { id: 'human-1', name: '担当者A', kind: 'human' },
      ],
      todos: [
        { id: 'todo-done-1', title: '完了済みタスク1', status: 'done', assignee: 'human-1', design: 'design-a' },
        { id: 'todo-done-2', title: '完了済みタスク2', status: 'done', design: 'design-a' },
        { id: 'todo-open', title: '未完了のタスク', status: 'doing', assignee: 'human-1', design: 'design-a' },
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
      } catch {
        // best-effort UI setup only
      }
    },
  },
};
