/** @typedef {{
 *   description: string,
 *   base: unknown,
 *   slots?: string,
 *   attributes?: Record<string,string>,
 *   lang?: 'ja'|'en',
 *   hash?: string,
 *   draft?: Array<{type:string,target:string|{type:string,id:string},payload?:unknown}>,
 *   comments?: Array<[target:string, body:string]>,
 *   prepare?: (el: HTMLElement) => void | Promise<void>,
 * }} Fixture */

// ---- small deterministic string builders (no Math.random) --------------

const repeat = (s, n) => s.repeat(n);

const LONG_ASCII_UNBROKEN = repeat('Pneumonoultramicroscopicsilicovolcanoconiosis', 5); // 230 chars

const LONG_JA_NO_SPACES = repeat(
  '出荷指示前で支払済みかつ本人が確定した注文だけを取り消せるという業務ルールの細かい前提条件を説明する長い一文',
  3,
);

const MIXED_CHAOS_TEXT = `🧾💸 ${'🙆‍♀️ '.repeat(4)}هذا سؤال طويل جدا بدون أي مسافات كافية שלום עולם ${'ź̂̃̄̅'.repeat(8)} 測試文字`;

/** Raw markdown-like syntax: these templates render description as plain text, so this checks overflow of literal pipes/backticks/newlines. */
const RAW_MARKUP_AS_TEXT = `| col-a | col-b | col-c-that-is-quite-long-on-its-own |\n| --- | --- | --- |\n| 在庫あり | 受注 | ${repeat('長い値', 10)} |\n\n\`\`\`ts\nconst x = ${repeat('1+', 40)}1;\n\`\`\`\n\n- 箇条書き\n  - ネスト\n\n![missing](https://example.com/none.png)`;

const storyOf = (id, name, extra) => ({ id, name, ...extra });
const ruleOf = (id, storyId, name, extra) => ({ id, storyId, name, ...extra });
const cardOf = (id, ruleId, name, extra) => ({ id, ruleId, name, ...extra });

// ------------------------------------------------------------------ fixtures

/** @type {Fixture} */
const longTextEverywhere = {
  description:
    'Story/rule/example/question names and descriptions pushed to extreme lengths across ASCII/Japanese/emoji/RTL/combining scripts.',
  lang: 'ja',
  base: {
    title: `${MIXED_CHAOS_TEXT} ${LONG_ASCII_UNBROKEN}`,
    stories: [storyOf('order', LONG_JA_NO_SPACES, { description: LONG_ASCII_UNBROKEN })],
    rules: [
      ruleOf('stock', 'order', MIXED_CHAOS_TEXT, { description: LONG_JA_NO_SPACES }),
      ruleOf('owner', 'order', LONG_ASCII_UNBROKEN),
    ],
    examples: [
      cardOf('in-stock', 'stock', LONG_JA_NO_SPACES.slice(0, 100), { description: MIXED_CHAOS_TEXT }),
      cardOf('out-of-stock', 'stock', LONG_ASCII_UNBROKEN),
      cardOf('own-order', 'owner', MIXED_CHAOS_TEXT),
    ],
    questions: [cardOf('reserve', 'stock', LONG_JA_NO_SPACES.slice(0, 80), { description: LONG_ASCII_UNBROKEN })],
  },
};

/** @type {Fixture} */
const hugeBoard = {
  description:
    '18 stories x 6 rules x (3 examples + 2 questions) — wide and deep enough to stress horizontal + per-column scrolling.',
  lang: 'en',
  base: (() => {
    const stories = Array.from({ length: 18 }, (_, i) => storyOf(`story-${i}`, `Story ${i}`));
    const rules = [];
    const examples = [];
    const questions = [];
    let ruleN = 0;
    let exN = 0;
    let qN = 0;
    for (const s of stories) {
      for (let r = 0; r < 6; r += 1) {
        const ruleId = `rule-${ruleN}`;
        rules.push(ruleOf(ruleId, s.id, `Rule ${ruleN} of ${s.name}`));
        for (let e = 0; e < 3; e += 1) {
          examples.push(cardOf(`ex-${exN}`, ruleId, `Example ${exN}`));
          exN += 1;
        }
        for (let q = 0; q < 2; q += 1) {
          questions.push(cardOf(`q-${qN}`, ruleId, `Question ${qN}?`));
          qN += 1;
        }
        ruleN += 1;
      }
    }
    return { title: 'Huge board', stories, rules, examples, questions };
  })(),
};

/** @type {Fixture} */
const emptyMinimal = {
  description: 'Title only — no stories at all.',
  lang: 'en',
  base: { title: 'Nothing mapped yet' },
};

/** @type {Fixture} */
const singleItem = {
  description: 'The smallest non-empty board: one story, no rules/examples/questions (hits the "No rules yet" chip).',
  lang: 'en',
  base: { title: 'Minimal board', stories: [storyOf('only', 'Only story')] },
};

/** @type {Fixture} */
const manyDraftsStale = {
  description:
    'Base board plus 20+ draft actions (renames, adds, moves between lanes, deletes) with several stale ones referencing missing cards.',
  lang: 'en',
  base: {
    title: 'Drafted board',
    stories: [storyOf('cancel', 'Cancel an order'), storyOf('refund', 'Get a refund')],
    rules: [
      ruleOf('before-shipping', 'cancel', 'Only before shipping'),
      ruleOf('own-order', 'cancel', 'Only the owner can cancel'),
      ruleOf('full-refund', 'refund', 'Refund the full amount'),
    ],
    examples: [
      cardOf('paid-accept', 'before-shipping', 'Paid, not shipped -> accepted'),
      cardOf('to-delete', 'own-order', 'Will be removed'),
    ],
    questions: [cardOf('reserve', 'before-shipping', 'Can it be reserved instead?')],
  },
  draft: [
    { type: 'SET_STORY_NAME', target: { type: 'story', id: 'cancel' }, payload: { name: 'Cancel an order (renamed)' } },
    {
      type: 'SET_STORY_DESCRIPTION',
      target: { type: 'story', id: 'cancel' },
      payload: { description: 'Added by the reader.' },
    },
    { type: 'REORDER_STORY', target: { type: 'story', id: 'refund' }, payload: { after: null } },
    {
      type: 'ADD_STORY',
      target: { type: 'page', id: 'example-mapping' },
      payload: { id: 'notify', name: 'Get notified' },
    },
    {
      type: 'SET_RULE_NAME',
      target: { type: 'rule', id: 'before-shipping' },
      payload: { name: 'Only before shipping (renamed)' },
    },
    {
      type: 'SET_RULE_DESCRIPTION',
      target: { type: 'rule', id: 'own-order' },
      payload: { description: 'The order must belong to the requester.' },
    },
    { type: 'MOVE_RULE', target: { type: 'rule', id: 'full-refund' }, payload: { storyId: 'refund', after: null } },
    { type: 'REORDER_RULE', target: { type: 'rule', id: 'before-shipping' }, payload: { after: null } },
    {
      type: 'ADD_RULE',
      target: { type: 'story', id: 'notify' },
      payload: { id: 'email-on-accept', name: 'Email when accepted' },
    },
    { type: 'DELETE_RULE', target: { type: 'rule', id: 'own-order' }, payload: {} },
    {
      type: 'SET_EXAMPLE_NAME',
      target: { type: 'example', id: 'paid-accept' },
      payload: { name: 'Paid, not shipped -> accepted (renamed)' },
    },
    {
      type: 'SET_EXAMPLE_DESCRIPTION',
      target: { type: 'example', id: 'paid-accept' },
      payload: { description: 'Confirmed by support.' },
    },
    {
      type: 'MOVE_EXAMPLE',
      target: { type: 'example', id: 'to-delete' },
      payload: { ruleId: 'before-shipping', after: null },
    },
    { type: 'REORDER_EXAMPLE', target: { type: 'example', id: 'paid-accept' }, payload: { after: null } },
    {
      type: 'ADD_EXAMPLE',
      target: { type: 'rule', id: 'email-on-accept' },
      payload: { id: 'fresh-example', name: 'A fresh example' },
    },
    { type: 'DELETE_EXAMPLE', target: { type: 'example', id: 'to-delete' }, payload: {} },
    {
      type: 'SET_QUESTION_NAME',
      target: { type: 'question', id: 'reserve' },
      payload: { name: 'Can it be reserved instead? (renamed)' },
    },
    {
      type: 'MOVE_QUESTION',
      target: { type: 'question', id: 'reserve' },
      payload: { ruleId: 'before-shipping', after: null },
    },
    {
      type: 'ADD_QUESTION',
      target: { type: 'rule', id: 'email-on-accept' },
      payload: { id: 'fresh-question', name: 'What if the email bounces?' },
    },
    { type: 'DELETE_QUESTION', target: { type: 'question', id: 'reserve' }, payload: {} },
    // --- stale from here: targets/anchors that never existed in base ---
    {
      type: 'SET_STORY_NAME',
      target: { type: 'story', id: 'ghost-story' },
      payload: { name: 'Edits a story that does not exist' },
    },
    {
      type: 'MOVE_RULE',
      target: { type: 'rule', id: 'before-shipping' },
      payload: { storyId: 'cancel', after: 'never-existed' },
    },
    {
      type: 'ADD_EXAMPLE',
      target: { type: 'rule', id: 'ghost-rule' },
      payload: { id: 'orphan-example', name: 'Orphan example' },
    },
    { type: 'DELETE_QUESTION', target: { type: 'question', id: 'never-was-a-question' }, payload: {} },
  ],
};

/** @type {Fixture} */
const commentsEverywhere = {
  description: 'Many long comments on stories/rules/examples/questions with the review rail pinned open.',
  lang: 'ja',
  attributes: { notes: 'on' },
  base: {
    title: '注文キャンセル（コメント多数）',
    stories: [storyOf('cancel', '注文をキャンセルする')],
    rules: [
      ruleOf('before-shipping', 'cancel', '出荷指示前だけ取り消せる'),
      ruleOf('own-order', 'cancel', '本人だけが取り消せる'),
    ],
    examples: [cardOf('paid-accept', 'before-shipping', '支払済み → 受け付ける')],
    questions: [cardOf('reserve', 'before-shipping', '取り置きは可能？')],
  },
  comments: [
    ['page:example-mapping', repeat('ボード全体についての長いコメント。', 20)],
    ['story:cancel', repeat('このストーリーの範囲が広すぎるのではという長文コメント。', 15)],
    ['rule:before-shipping', repeat('このルールの境界条件（出荷指示の瞬間）についての長い議論。', 15)],
    ['rule:own-order', repeat('「本人」の定義（決済者か注文者か）についての長文コメント。', 15)],
    ['example:paid-accept', repeat('この具体例の時刻表記を統一すべきという長文コメント。', 12)],
    ['example:paid-accept', 'Second, shorter follow-up comment on the same example.'],
    ['question:reserve', repeat('この質問はビジネス側に確認中、という長い経過報告コメント。', 12)],
  ],
};

/** @type {Fixture} */
const wipSelectedAndEditing = {
  description:
    'A card is focused via hash (#card=stock-rule) and a rule name inline editor is opened programmatically with a long draft value.',
  lang: 'en',
  hash: 'card=stock',
  base: {
    title: 'Mid-edit board',
    stories: [storyOf('order', 'Place an order')],
    rules: [ruleOf('stock', 'order', 'Accept only if in stock')],
    examples: [cardOf('in-stock', 'stock', 'In stock -> accepted')],
    questions: [cardOf('backorder', 'stock', 'Do we support backorders?')],
  },
  prepare: (el) => {
    const card = el.shadowRoot?.querySelector('[data-card="stock"]');
    const field = card?.shadowRoot?.querySelector('dpk-component-inline-edit');
    if (field && typeof field.startEditing === 'function') field.startEditing();
  },
};

/** @type {Fixture} */
const rawMarkupAsText = {
  description:
    'Descriptions containing raw markdown-like syntax (tables, code fences, nested lists, image refs) rendered as plain text — checks overflow since it is not interpreted as Markdown.',
  lang: 'ja',
  base: {
    title: 'Markdown 風の生テキスト',
    stories: [storyOf('order', '注文する', { description: RAW_MARKUP_AS_TEXT })],
    rules: [ruleOf('stock', 'order', '在庫があれば受ける', { description: RAW_MARKUP_AS_TEXT })],
    examples: [cardOf('in-stock', 'stock', '在庫あり → 受注', { description: RAW_MARKUP_AS_TEXT })],
    questions: [cardOf('reserve', 'stock', '取り置きは可能？', { description: RAW_MARKUP_AS_TEXT })],
  },
};

/** @type {Fixture} */
const statusChipStress = {
  description:
    'Every status-chip reading in one board: "No rules yet", "Open questions", "Consider splitting" (5+ rules), "A rule has no example", and "Looks ready".',
  lang: 'en',
  base: {
    title: 'Status chip stress test',
    stories: [
      storyOf('no-rules', 'Story with no rules yet'),
      storyOf('open-questions', 'Story with an open question'),
      storyOf('split-me', 'Story that should be split (5+ rules)'),
      storyOf('missing-example', 'Story with a rule that has no example'),
      storyOf('ready', 'Story that looks ready'),
    ],
    rules: [
      ruleOf('oq-rule', 'open-questions', 'A rule with an open question'),
      ruleOf('split-1', 'split-me', 'Rule 1'),
      ruleOf('split-2', 'split-me', 'Rule 2'),
      ruleOf('split-3', 'split-me', 'Rule 3'),
      ruleOf('split-4', 'split-me', 'Rule 4'),
      ruleOf('split-5', 'split-me', 'Rule 5'),
      ruleOf('bare-rule', 'missing-example', 'A rule with no example'),
      ruleOf('ready-rule', 'ready', 'A rule with examples and no open question'),
    ],
    examples: [
      cardOf('oq-example', 'oq-rule', 'An example that still leaves a question open'),
      cardOf('split-ex-1', 'split-1', 'Example for rule 1'),
      cardOf('split-ex-2', 'split-2', 'Example for rule 2'),
      cardOf('split-ex-3', 'split-3', 'Example for rule 3'),
      cardOf('split-ex-4', 'split-4', 'Example for rule 4'),
      cardOf('split-ex-5', 'split-5', 'Example for rule 5'),
      cardOf('ready-example', 'ready-rule', 'Everything checks out'),
    ],
    questions: [cardOf('oq-question', 'oq-rule', 'Still unresolved question')],
  },
};

export default {
  'long-text-everywhere': longTextEverywhere,
  'huge-board': hugeBoard,
  'empty-minimal': emptyMinimal,
  'single-item': singleItem,
  'many-drafts-stale': manyDraftsStale,
  'comments-everywhere': commentsEverywhere,
  'wip-selected-and-editing': wipSelectedAndEditing,
  'raw-markup-as-text': rawMarkupAsText,
  'status-chip-stress': statusChipStress,
};
