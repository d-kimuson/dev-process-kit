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

/** `exactOptional` fields reject an explicit `undefined` value, so every helper below drops them. */
const clean = (obj) => Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined));

/** Unbroken 200+ char ASCII token: no spaces, no hyphens, nothing to break on. */
const LONG_ASCII_UNBROKEN = repeat('Pneumonoultramicroscopicsilicovolcanoconiosis', 5); // 230 chars

/** A URL long enough to blow past any card width, still a valid http(s) URL. */
const longUrl = (n) =>
  `https://issues.example.com/projects/kumoma-web/issues/9999?${repeat('filter=state%3Aopen&label=needs-triage&', n)}anchor=bottom`;

/** 200+ chars of Japanese prose with no spaces (Japanese text never has them). */
const LONG_JA_NO_SPACES = repeat(
  'ユーザーがオンボーディングからチェックアウトまで迷わず進めるように画面遷移と文言と操作導線を見直して継続率を改善する施策の詳細な背景説明文',
  3,
);

/** Emoji (incl. ZWJ family sequence), RTL Arabic, Hebrew and combining-mark "zalgo" text mixed together. */
const MIXED_CHAOS_TEXT = `🚀✨ ${'👨‍👩‍👧‍👦 '.repeat(4)}مرحبا بكم في عملية الدفع السريع שלום עולם ${'ź̂̃̄̅'.repeat(8)} 繁体中文測試𝕿𝖊𝖝𝖙`;

const MARKDOWN_HEAVY = `# 受付条件

通常のテキストと **強調** と \`コード\` を混ぜる。

| 条件 | 期待値 | 備考 |
| --- | --- | --- |
| 在庫あり | 受注 | 即時 |
| 在庫なし | 保留 | ${repeat('バックオーダーの説明が長く続く行', 4)} |
| キャンセル済み | 拒否 | — |

\`\`\`ts
// 1行がとても長いコードブロック（折り返し/横スクロールの確認用）
const checkoutFlow = (cart) => cart.items.filter((item) => item.inStock).reduce((total, item) => total + item.price * item.quantity, 0);
\`\`\`

- 箇条書き
  - ネストした箇条書き
    - さらにネストした箇条書き
      1. 番号付きのネスト
      2. ${repeat('長い番号付き項目の説明。', 6)}

![missing](https://example.com/does-not-exist.png)
![no-src]()
`;

const activity = (id, name, actor, steps) => clean({ id, name, actor, steps });
const step = (id, name) => ({ id, name });
const milestone = (id, name, timeframe, description) => clean({ id, name, timeframe, description });
const status = (id, name, tone, icon) => clean({ id, name, tone, icon });
const story = (id, name, activityId, stepId, extra) => clean({ id, name, activityId, stepId, ...extra });

// ------------------------------------------------------------------ fixtures

/** @type {Fixture} */
const longTextEverywhere = {
  description:
    'Every text field (title/activity/actor/step/story/link/milestone) pushed to extreme lengths and scripts.',
  lang: 'ja',
  base: {
    title: `${MIXED_CHAOS_TEXT} ${LONG_ASCII_UNBROKEN}`,
    activities: [
      activity('onboarding', LONG_JA_NO_SPACES, LONG_ASCII_UNBROKEN, [
        step('landing', MIXED_CHAOS_TEXT),
        step('signup', longUrl(3)),
      ]),
      activity('checkout', MIXED_CHAOS_TEXT, 'مستخدم عربي طويل بدون فراغات كافية لتجربة الالتفاف', [
        step('cart', repeat('🛒', 60)),
        step('pay', repeat('ź̂̃', 40)),
      ]),
    ],
    milestones: [
      milestone('mvp', LONG_ASCII_UNBROKEN, repeat('2026年Q4〜', 10), LONG_JA_NO_SPACES),
      milestone('v2-long-milestone-name-that-keeps-going-and-going', MIXED_CHAOS_TEXT, undefined, undefined),
    ],
    statuses: [
      status('idea', 'Idea', 'gray', 'lightbulb'),
      status('ready', LONG_JA_NO_SPACES.slice(0, 90), 'amber', 'play'),
      status('done', MIXED_CHAOS_TEXT, 'green', 'check'),
    ],
    stories: [
      story('s-landing', LONG_JA_NO_SPACES, 'onboarding', 'landing', {
        description: LONG_JA_NO_SPACES,
        milestoneId: 'mvp',
        statusId: 'ready',
        links: [
          { url: longUrl(5), label: LONG_ASCII_UNBROKEN },
          { url: longUrl(1) + '&second=1', label: MIXED_CHAOS_TEXT },
        ],
      }),
      story('s-signup', MIXED_CHAOS_TEXT, 'onboarding', 'signup', { milestoneId: 'mvp', statusId: 'idea' }),
      story('s-cart', LONG_ASCII_UNBROKEN, 'checkout', 'cart', {
        description: MIXED_CHAOS_TEXT,
        statusId: 'done',
      }),
    ],
  },
};

/** @type {Fixture} */
const hugeMap = {
  description: '32 activities x 2 steps, 4 milestones, 4 statuses, 130 stories spread across the grid.',
  lang: 'en',
  base: (() => {
    const activities = Array.from({ length: 32 }, (_, i) =>
      activity(`act-${i}`, `Activity ${i} — do the thing number ${i}`, i % 3 === 0 ? `Actor group ${i}` : undefined, [
        step(`step-${i}-a`, `Step ${i}.A`),
        step(`step-${i}-b`, `Step ${i}.B`),
      ]),
    );
    const milestones = Array.from({ length: 4 }, (_, i) =>
      milestone(`m${i}`, `Milestone ${i}`, `2026 Q${i + 1}`, `Slice ${i} of the plan`),
    );
    const statuses = [
      status('idea', 'Idea', 'gray', 'lightbulb'),
      status('ready', 'Ready', 'amber', 'play'),
      status('doing', 'Doing', 'blue', 'clock'),
      status('done', 'Done', 'green', 'check'),
    ];
    const stories = [];
    let n = 0;
    for (const act of activities) {
      for (const st of act.steps) {
        for (let k = 0; k < 2; k += 1) {
          stories.push(
            story(`story-${n}`, `Story ${n} for ${st.name}`, act.id, st.id, {
              milestoneId: milestones[n % (milestones.length + 1)]?.id,
              statusId: statuses[n % statuses.length].id,
            }),
          );
          n += 1;
        }
      }
    }
    return { title: 'Huge backbone — 32 activities', activities, milestones, statuses, stories };
  })(),
};

/** @type {Fixture} */
const emptyMinimal = {
  description: 'Title only — no activities, milestones, statuses or stories (just the Unassigned row).',
  lang: 'en',
  base: { title: 'Nothing mapped yet' },
};

/** @type {Fixture} */
const singleItem = {
  description: 'The smallest non-empty map: one activity, one step, one milestone, one status, one story.',
  lang: 'en',
  base: {
    title: 'Minimal map',
    activities: [activity('only', 'Only activity', undefined, [step('only-step', 'Only step')])],
    milestones: [milestone('only-m', 'Only milestone')],
    statuses: [status('only-s', 'Only status', 'blue', 'circle')],
    stories: [story('only-story', 'Only story', 'only', 'only-step', { milestoneId: 'only-m', statusId: 'only-s' })],
  },
};

/** @type {Fixture} */
const manyDraftsStale = {
  description:
    'Base map plus 20+ draft actions (renames, adds, moves, status edits, deletes) including several stale ones with missing targets/anchors.',
  lang: 'en',
  base: {
    title: 'Drafted map',
    activities: [
      activity('a1', 'Discover', undefined, [step('search', 'Search'), step('browse', 'Browse')]),
      activity('a2', 'Purchase', undefined, [step('cart', 'Cart'), step('pay', 'Pay')]),
    ],
    milestones: [milestone('mvp', 'MVP'), milestone('v1', 'V1')],
    statuses: [status('idea', 'Idea', 'gray', 'lightbulb'), status('ready', 'Ready', 'amber', 'play')],
    stories: [
      story('keep-1', 'Keep this one', 'a1', 'search', { milestoneId: 'mvp', statusId: 'idea' }),
      story('keep-2', 'And this one', 'a2', 'cart', { milestoneId: 'mvp', statusId: 'ready' }),
      story('to-delete', 'About to be deleted', 'a2', 'pay', { statusId: 'idea' }),
    ],
  },
  draft: [
    { type: 'SET_ACTIVITY_NAME', target: { type: 'activity', id: 'a1' }, payload: { name: 'Discover (renamed)' } },
    { type: 'SET_ACTIVITY_ACTOR', target: { type: 'activity', id: 'a2' }, payload: { actor: 'Member' } },
    { type: 'SET_STEP_NAME', target: { type: 'step', id: 'a1.search' }, payload: { name: 'Search (renamed)' } },
    {
      type: 'ADD_ACTIVITY',
      target: { type: 'page', id: 'usm' },
      payload: { id: 'a3', name: 'Freshly added activity' },
    },
    {
      type: 'ADD_STEP',
      target: { type: 'activity', id: 'a3' },
      payload: { id: 'new-step', name: 'Freshly added step' },
    },
    { type: 'SET_STORY_NAME', target: { type: 'story', id: 'keep-1' }, payload: { name: 'Keep this one (renamed)' } },
    {
      type: 'SET_STORY_DESCRIPTION',
      target: { type: 'story', id: 'keep-1' },
      payload: { description: 'Added a description.' },
    },
    {
      type: 'MOVE_STORY',
      target: { type: 'story', id: 'keep-2' },
      payload: { activityId: 'a1', stepId: 'browse', milestoneId: 'v1', after: null },
    },
    { type: 'REORDER_STORY', target: { type: 'story', id: 'keep-1' }, payload: { after: null } },
    {
      type: 'ADD_STORY',
      target: { type: 'step', id: 'a1.browse' },
      payload: { id: 'brand-new', name: 'Brand new story', activityId: 'a1' },
    },
    { type: 'DELETE_STORY', target: { type: 'story', id: 'to-delete' }, payload: {} },
    { type: 'SET_MILESTONE_NAME', target: { type: 'milestone', id: 'mvp' }, payload: { name: 'MVP (renamed)' } },
    { type: 'ADD_MILESTONE', target: { type: 'page', id: 'usm' }, payload: { id: 'v2', name: 'V2' } },
    {
      type: 'ADD_STORY_LINK',
      target: { type: 'story', id: 'keep-1' },
      payload: { url: 'https://example.com/issues/1', label: 'Issue #1' },
    },
    { type: 'SET_STORY_STATUS', target: { type: 'story', id: 'keep-2' }, payload: { statusId: 'idea' } },
    {
      type: 'ADD_STATUS',
      target: { type: 'page', id: 'usm' },
      payload: { id: 'done', name: 'Done', tone: 'green', icon: 'check' },
    },
    { type: 'SET_STATUS_NAME', target: { type: 'status', id: 'ready' }, payload: { name: 'Ready (renamed)' } },
    { type: 'SET_STATUS_TONE', target: { type: 'status', id: 'ready' }, payload: { tone: 'violet' } },
    { type: 'REORDER_STATUS', target: { type: 'status', id: 'idea' }, payload: { after: 'ready' } },
    // --- stale from here: targets/anchors that never existed in base ---
    {
      type: 'SET_STORY_NAME',
      target: { type: 'story', id: 'ghost-story' },
      payload: { name: 'Edits a story that does not exist' },
    },
    { type: 'REORDER_STORY', target: { type: 'story', id: 'keep-1' }, payload: { after: 'does-not-exist' } },
    { type: 'SET_STORY_MILESTONE', target: { type: 'story', id: 'to-delete' }, payload: { milestoneId: 'mvp' } },
    { type: 'DELETE_ACTIVITY', target: { type: 'activity', id: 'never-existed' }, payload: {} },
    {
      type: 'MOVE_STORY',
      target: { type: 'story', id: 'keep-1' },
      payload: { activityId: 'a1', stepId: 'search', milestoneId: 'ghost-milestone', after: null },
    },
  ],
};

/** @type {Fixture} */
const commentsRailOpen = {
  description:
    'Many long comments across activities/steps/stories/milestones/statuses with the review rail pinned open.',
  lang: 'ja',
  attributes: { notes: 'on' },
  base: {
    title: 'たくさんのコメントが付いたマップ',
    activities: [activity('a1', '発見する', '一般ユーザー', [step('search', '検索する'), step('browse', '眺める')])],
    milestones: [milestone('mvp', 'MVP', '2026年10月', '最低限のスコープ')],
    statuses: [status('idea', 'Idea', 'gray', 'lightbulb'), status('ready', 'Ready', 'amber', 'play')],
    stories: [
      story('s1', '検索結果を見る', 'a1', 'search', { milestoneId: 'mvp', statusId: 'ready' }),
      story('s2', 'お気に入りに追加する', 'a1', 'browse', { milestoneId: 'mvp', statusId: 'idea' }),
    ],
  },
  comments: [
    ['page:usm', repeat('マップ全体についての長いコメント。', 20)],
    ['activity:a1', repeat('このアクティビティの粒度は適切かを議論するための長文コメント。', 15)],
    ['step:a1.search', repeat('この検索ステップは別のアクティビティに属すべきでは、という長い指摘。', 15)],
    ['story:s1', repeat('このストーリーの受け入れ条件がまだ曖昧なので詳細を詰めたいという長文。', 18)],
    ['story:s1', 'Second, shorter follow-up comment on the same story.'],
    [
      'story:s2',
      repeat(
        'Why does this story not have a status yet? '.repeat(1) + 'Long follow-up explaining the concern in detail. ',
        10,
      ),
    ],
    ['milestone:mvp', repeat('このマイルストーンの時期が本当に10月で良いかという長いコメント。', 12)],
    ['status:ready', repeat('Ready の定義をもう少し厳密にしたいという長いコメント。', 12)],
  ],
};

/** @type {Fixture} */
const markdownDescriptions = {
  description:
    'Story descriptions with tables, fenced code with a long unwrapped line, nested lists, and images with missing src.',
  lang: 'ja',
  base: {
    title: 'Markdown を多用したストーリー',
    activities: [activity('a1', '注文する', '会員', [step('checkout', '確定する')])],
    milestones: [milestone('mvp', 'MVP')],
    statuses: [status('idea', 'Idea', 'gray', 'lightbulb')],
    stories: [
      story('s1', '在庫チェックを含む注文確定', 'a1', 'checkout', {
        milestoneId: 'mvp',
        statusId: 'idea',
        description: MARKDOWN_HEAVY,
      }),
      story('s2', '別のMarkdownストーリー', 'a1', 'checkout', {
        statusId: 'idea',
        description: '- [ ] 未完了のタスク\n- [x] 完了したタスク\n\n> 引用ブロックも長く続けてみる。'.repeat(3),
      }),
    ],
  },
};

/** @type {Fixture} */
const wipStoryPanelOpen = {
  description:
    'The story panel is open via hash (#story=s1) and the inline description editor is opened programmatically with very long Markdown already typed in.',
  lang: 'en',
  hash: 'story=s1',
  base: {
    title: 'Mid-edit story panel',
    activities: [activity('a1', 'Checkout', 'Member', [step('review', 'Review order')])],
    milestones: [milestone('mvp', 'MVP')],
    statuses: [status('idea', 'Idea', 'gray', 'lightbulb'), status('ready', 'Ready', 'amber', 'play')],
    stories: [
      story('s1', 'Review the order before paying', 'a1', 'review', {
        milestoneId: 'mvp',
        statusId: 'ready',
        description: 'Short description before the edit.',
        links: [
          { url: 'https://github.com/acme/web/issues/42', label: '#42' },
          { url: 'https://github.com/acme/web/pull/43' },
        ],
      }),
    ],
  },
  prepare: (el) => {
    const panel = el.shadowRoot?.querySelector('.sp-description');
    if (panel && typeof panel.startEditing === 'function') panel.startEditing();
  },
};

/** @type {Fixture} */
const statusFilterAndMenu = {
  description:
    '8 statuses (forces the filter row to wrap) with a status filter applied via hash, and the icon-picker menu for one status opened programmatically.',
  lang: 'en',
  hash: 'status=idea,ready,doing,done&tab=statuses',
  base: {
    title: 'Status-heavy map',
    activities: [activity('a1', 'Deliver', undefined, [step('build', 'Build'), step('ship', 'Ship')])],
    milestones: [milestone('mvp', 'MVP')],
    statuses: [
      status('backlog', 'Backlog', 'gray', 'circle'),
      status('idea', 'Idea', 'gray', 'lightbulb'),
      status('ready', 'Ready', 'amber', 'play'),
      status('doing', 'Doing', 'blue', 'clock'),
      status('review', 'In review', 'violet', 'eye'),
      status('blocked', 'Blocked', 'amber', 'pause'),
      status('done', 'Done', 'green', 'check'),
      status('wontfix', "Won't fix", 'gray', 'x'),
    ],
    stories: Array.from({ length: 16 }, (_, i) =>
      story(`s${i}`, `Story ${i}`, 'a1', i % 2 === 0 ? 'build' : 'ship', {
        milestoneId: 'mvp',
        statusId: ['backlog', 'idea', 'ready', 'doing', 'review', 'blocked', 'done', 'wontfix'][i % 8],
      }),
    ),
  },
  prepare: (el) => {
    const trigger = el.shadowRoot?.querySelector('[data-icon-trigger="ready"]');
    trigger?.click();
  },
};

export default {
  'long-text-everywhere': longTextEverywhere,
  'huge-map': hugeMap,
  'empty-minimal': emptyMinimal,
  'single-item': singleItem,
  'many-drafts-stale': manyDraftsStale,
  'comments-rail-open': commentsRailOpen,
  'markdown-descriptions': markdownDescriptions,
  'wip-story-panel-open': wipStoryPanelOpen,
  'status-filter-and-menu': statusFilterAndMenu,
};
