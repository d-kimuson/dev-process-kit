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

// ---------------------------------------------------------------------------
// Deterministic adversarial text building blocks, shared across fixtures.
// ---------------------------------------------------------------------------

const pad3 = (n) => String(n).padStart(3, '0');

/** A single unbroken ASCII run (240 chars), with no whitespace to wrap on. */
const LONG_ASCII_WORD = 'Supercalifragilisticexpialidocious'.repeat(7);

/** A URL long enough to overflow any chrome bar or label. */
const LONG_URL = `https://example.com/${Array.from({ length: 24 }, (_, i) => `segment-${i}`).join(
  '/',
)}/final-destination-page.html?query=1&another=2&yet-another-parameter=some-very-long-value-that-keeps-going`;

/** Dense Japanese prose with no spaces to break on (Japanese does not use word spacing). */
const LONG_JA_NO_SPACE =
  'このテキストは改行や省略や折り返しの挙動を確認するために用意された説明文であり意図的に空白を含めずに連続させています'.repeat(
    4,
  );

/** Emoji, ZWJ sequences and skin-tone modifiers, repeated densely. */
const EMOJI_HEAVY = '🔥🚀🎉👨‍👩‍👧‍👦🧑🏽‍💻🫠🫶🏿🏳️‍🌈'.repeat(10);

/** Right-to-left Arabic prose, to exercise bidi layout. */
const RTL_TEXT =
  'النص التجريبي لاختبار العرض من اليمين إلى اليسار في هذا المكون يحتوي على كلمات طويلة بما يكفي لاختبار الالتفاف'.repeat(
    3,
  );

const COMBINING_MARKS = ['́', '̂', '̃', '̄', '̅', '̆', '̇', '̈', '̉', '̊'];

/** Stacks combining marks on every character of `word` (Zalgo-style), `depth` marks deep. */
const zalgoWord = (word, depth) =>
  Array.from(word)
    .map((ch) => ch + COMBINING_MARKS.slice(0, depth).join(''))
    .join('');

const COMBINING_TEXT = zalgoWord('CHAOS ENGINEERING BREAKS LAYOUTS', 10);

const MARKDOWN_HEAVY = `## リリースチェックリスト

| 環境 | 状態 | 担当 | メモ |
| --- | --- | --- | --- |
| staging | ✅ pass | @yuki | 再実行後に全て green。この列は空白を含まない長い一語で折り返しを確認する: ${LONG_ASCII_WORD} |
| production | ⏳ pending | @sora | インフラ側のチケット待ち |
| canary | ❌ fail | @rin | ロールバック中 |

1. トップレベルの手順
   1. ネストした手順
      1. さらに深くネストした手順。長いインラインコード: \`${'x'.repeat(120)}\`
      2. もう一つの深い手順
   2. 第2階層に戻る
2. 2番目のトップレベルの手順

- 箇条書き その1
  - ネストした箇条書き
    - 3段ネストの箇条書き ${EMOJI_HEAVY.slice(0, 6)}
- 箇条書き その2

\`\`\`text
${'a-very-long-single-line-of-code-with-no-wrap-opportunity-'.repeat(6)}
\`\`\`
`;

// ---------------------------------------------------------------------------
// 1. Extreme text everywhere.
// ---------------------------------------------------------------------------

/** @type {Fixture} */
const extremeText = {
  description:
    'Every text field at its worst: a 240-char unbroken ASCII run, a long URL, dense Japanese with no spaces, heavy emoji/ZWJ, RTL Arabic and stacked combining marks — in the title, every name/description and the preview content itself.',
  base: {
    title: `${LONG_JA_NO_SPACE} / ${LONG_ASCII_WORD}`,
    baseUrl: LONG_URL,
    apps: [
      {
        id: 'app-1',
        name: LONG_ASCII_WORD,
        description: `${RTL_TEXT} ${EMOJI_HEAVY}`,
        actor: RTL_TEXT,
        screens: [
          {
            id: 'screen-1',
            title: LONG_JA_NO_SPACE,
            description: `${COMBINING_TEXT}\n\n${EMOJI_HEAVY}`,
            previews: [{ id: 'prev-1', kind: 'browser', viewport: 'desktop', label: LONG_ASCII_WORD, url: LONG_URL }],
          },
        ],
      },
    ],
    activities: [
      {
        id: 'act-1',
        name: COMBINING_TEXT,
        description: EMOJI_HEAVY,
        actor: zalgoWord('ADMINISTRATOR', 6),
        stories: [
          {
            id: 'story-1',
            name: RTL_TEXT,
            description: LONG_JA_NO_SPACE,
            actor: LONG_ASCII_WORD,
            steps: [
              {
                id: 'step-1',
                name: `${LONG_ASCII_WORD} ${EMOJI_HEAVY} ${RTL_TEXT}`,
                description: `${COMBINING_TEXT}\n\n${LONG_JA_NO_SPACE}\n\n${LONG_URL}`,
                actor: EMOJI_HEAVY,
                situation: LONG_ASCII_WORD,
                panes: [
                  { screen: 'screen-1', preview: 'prev-1' },
                  { material: { id: 'mat-1', kind: 'plain', label: LONG_JA_NO_SPACE } },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  slots: `
    <div slot="preview" data-preview-id="prev-1">
      <div style="padding:16px">
        <h1>${LONG_ASCII_WORD}</h1>
        <p>${LONG_JA_NO_SPACE}</p>
        <p>${EMOJI_HEAVY}</p>
        <p dir="rtl">${RTL_TEXT}</p>
        <p>${COMBINING_TEXT}</p>
      </div>
    </div>
    <div slot="preview" data-preview-id="mat-1">
      <div style="padding:12px;background:#fff8e1">${LONG_JA_NO_SPACE}</div>
    </div>
  `,
  lang: 'ja',
  hash: 'activity=act-1&story=story-1&step=step-1',
};

// ---------------------------------------------------------------------------
// 2. Very large volumes: many activities/stories, one huge story, a deep app tree.
// ---------------------------------------------------------------------------

const BIG_STORY_STEP_COUNT = 80;
const ACTIVITY_COUNT = 12;
const APP_SCREEN_COUNT = 40;

const megaActivities = Array.from({ length: ACTIVITY_COUNT }, (_, a) => {
  if (a === 0) {
    const steps = Array.from({ length: BIG_STORY_STEP_COUNT }, (_, s) => ({
      id: `step-${pad3(s)}`,
      name: `Step ${pad3(s)} — walk through yet another moment of the flow`,
      panes: [],
    }));
    return {
      id: `act-${a}`,
      name: `Activity ${a} — the one with every step`,
      stories: [
        { id: 'story-big', name: 'The one story with every step', steps },
        {
          id: 'story-small',
          name: 'A small companion story',
          steps: [{ id: 'only-step', name: 'Only step', panes: [] }],
        },
      ],
    };
  }
  return {
    id: `act-${a}`,
    name: `Activity ${a}`,
    stories: [
      {
        id: `story-${a}-0`,
        name: `Story ${a}.0`,
        steps: [
          { id: 'first', name: 'First step', panes: [] },
          { id: 'second', name: 'Second step', panes: [] },
        ],
      },
    ],
  };
});

const megaScreens = Array.from({ length: APP_SCREEN_COUNT }, (_, i) => {
  const dept = i % 4;
  const cat = i % 9;
  return {
    id: `screen-${i}`,
    title: `Item ${i}`,
    previews: [{ id: `prev-${i}`, kind: 'browser', viewport: 'desktop', url: `/dept-${dept}/cat-${cat}/item-${i}` }],
  };
});

/** @type {Fixture} */
const megaVolume = {
  description:
    '12 activities (one with an 80-step story to overflow the step list and the selects), plus one app with 40 screens laid out as a deep, branching URL tree for the app view sidebar.',
  base: {
    title: 'Mega Volume Prototype',
    apps: [{ id: 'app-1', name: 'Mega App', actor: 'Operator', screens: megaScreens }],
    activities: megaActivities,
  },
  lang: 'en',
  hash: 'activity=act-0&story=story-big&step=step-000',
};

// ---------------------------------------------------------------------------
// 3. Empty / minimal data.
// ---------------------------------------------------------------------------

/** @type {Fixture} */
const minimal = {
  description: 'The smallest legal page: no apps, one activity with one story with a single step and empty panes.',
  base: {
    apps: [],
    activities: [
      {
        id: 'act-1',
        name: 'Only activity',
        stories: [{ id: 'story-1', name: 'Only story', steps: [{ id: 'step-1', name: 'Only step', panes: [] }] }],
      },
    ],
  },
  lang: 'en',
  hash: 'activity=act-1&story=story-1&step=step-1',
};

// ---------------------------------------------------------------------------
// 4. Hostile preview slot markup: fixed/absolute positioning, huge content, z-index abuse.
// ---------------------------------------------------------------------------

/** @type {Fixture} */
const hostileSlots = {
  description:
    'Four side-by-side panes, one per preview kind (browser/native/plain/mail), each with light DOM markup designed to escape the frame: position:fixed and position:absolute elements, a huge CSS-painted "image", a wide no-wrap block and z-index:9999 badges overlapping the chrome.',
  base: {
    title: 'Hostile Slots',
    apps: [
      {
        id: 'app-1',
        name: 'Hostile App',
        screens: [
          {
            id: 'fixed-screen',
            title: 'Fixed element screen',
            previews: [{ id: 'prev-fixed', kind: 'browser', viewport: 'desktop' }],
          },
          {
            id: 'native-screen',
            title: 'Huge image screen',
            previews: [{ id: 'prev-native', kind: 'native', viewport: 'mobile' }],
          },
          {
            id: 'plain-screen',
            title: 'Tall + offset screen',
            previews: [{ id: 'prev-plain', kind: 'plain', viewport: 'fluid' }],
          },
          {
            id: 'mail-screen',
            title: 'Wide mail screen',
            previews: [
              {
                id: 'prev-mail',
                kind: 'mail',
                viewport: 'mobile',
                mail: {
                  from: 'Ops <ops@example.com>',
                  to: 'reviewer@example.com',
                  subject: LONG_ASCII_WORD,
                  date: '2026/10/09 9:41',
                },
              },
            ],
          },
        ],
      },
    ],
    activities: [
      {
        id: 'act-1',
        name: 'Hostile markup',
        stories: [
          {
            id: 'story-1',
            name: 'Everything escapes its box',
            steps: [
              {
                id: 'step-1',
                name: 'Look at all four at once',
                panes: [
                  { screen: 'fixed-screen' },
                  { screen: 'native-screen' },
                  { screen: 'plain-screen' },
                  { screen: 'mail-screen' },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  slots: `
    <div slot="preview" data-preview-id="prev-fixed">
      <div style="position:fixed; top:0; left:0; width:800px; height:120px; background:red; z-index:9999; color:#fff">
        position:fixed, should stay contained by the frame
      </div>
      <p>Ordinary content below the fixed element.</p>
    </div>
    <div slot="preview" data-preview-id="prev-native">
      <div style="width:4000px; height:4000px; background:repeating-conic-gradient(#f06, #f06 10deg, #06f 10deg, #06f 20deg)"></div>
    </div>
    <div slot="preview" data-preview-id="prev-plain">
      <div style="height:6000px; background:linear-gradient(#eee, #999)">
        <div style="position:absolute; top:3000px; left:-500px; width:300px; height:200px; background:blue; z-index:9999; color:#fff">
          absolute, offset far outside the viewport
        </div>
        <p style="padding-top:5800px">bottom of a 6000px-tall plain preview</p>
      </div>
    </div>
    <div slot="preview" data-preview-id="prev-mail">
      <div style="position:absolute; top:-40px; right:0; z-index:9999; background:orange; padding:4px 8px">overlapping the envelope</div>
      <div style="width:2400px; white-space:nowrap; background:#eee">${'no-wrap-wide-row-'.repeat(40)}</div>
    </div>
  `,
  lang: 'en',
  hash: 'activity=act-1&story=story-1&step=step-1',
};

// ---------------------------------------------------------------------------
// 5. Many drafts across the whole action vocabulary, plus stale actions.
// ---------------------------------------------------------------------------

/** @type {Fixture} */
const draftStorm = {
  description:
    'Base data small enough to read, then a draft batch that exercises every action in the vocabulary (rename, reorder, move, add, delete) against real targets, followed by five stale actions whose targets are missing or already deleted earlier in the same batch.',
  base: {
    title: 'Draft Storm',
    apps: [
      {
        id: 'app-1',
        name: 'App One',
        screens: [
          {
            id: 'screen-x',
            title: 'Screen X',
            previews: [
              { id: 'prev-x1', kind: 'browser', viewport: 'desktop' },
              { id: 'prev-x2', kind: 'browser', viewport: 'mobile' },
            ],
          },
          { id: 'screen-y', title: 'Screen Y', previews: [{ id: 'prev-y1', kind: 'browser', viewport: 'desktop' }] },
        ],
      },
    ],
    activities: [
      {
        id: 'act-a',
        name: 'Alpha',
        stories: [
          {
            id: 'story-a1',
            name: 'Story A1',
            steps: [
              { id: 'step-a1a', name: 'A1 step a', panes: [] },
              { id: 'step-a1b', name: 'A1 step b', panes: [] },
            ],
          },
          { id: 'story-a2', name: 'Story A2', steps: [{ id: 'step-a2a', name: 'A2 step a', panes: [] }] },
        ],
      },
      {
        id: 'act-b',
        name: 'Beta',
        stories: [{ id: 'story-b1', name: 'Story B1', steps: [{ id: 'step-b1a', name: 'B1 step a', panes: [] }] }],
      },
    ],
  },
  lang: 'en',
  hash: 'activity=act-a&story=story-a1&step=step-a1a',
  draft: [
    { type: 'SET_ACTIVITY_NAME', target: 'act-a', payload: { name: 'Alpha renamed' } },
    { type: 'SET_ACTIVITY_DESCRIPTION', target: 'act-b', payload: { description: 'Updated description' } },
    { type: 'SET_STORY_NAME', target: 'act-a.story-a1', payload: { name: 'Story A1 renamed' } },
    { type: 'SET_STORY_DESCRIPTION', target: 'act-b.story-b1', payload: { description: 'A new description' } },
    { type: 'SET_STEP_NAME', target: 'act-a.story-a1.step-a1a', payload: { name: 'A1 step a, renamed' } },
    { type: 'SET_STEP_DESCRIPTION', target: 'act-a.story-a2.step-a2a', payload: { description: 'Now described' } },
    { type: 'SET_PREVIEW_KIND', target: 'prev-x1', payload: { kind: 'native' } },
    { type: 'SET_PREVIEW_VIEWPORT', target: 'prev-x2', payload: { viewport: 'tablet' } },
    { type: 'SET_PREVIEW_LABEL', target: 'prev-y1', payload: { label: 'Renamed tab label' } },
    { type: 'REORDER_ACTIVITY', target: 'act-b', payload: { after: null } },
    { type: 'REORDER_STORY', target: 'act-a.story-a2', payload: { after: null } },
    { type: 'REORDER_STEP', target: 'act-a.story-a1.step-a1b', payload: { after: null } },
    { type: 'MOVE_STORY', target: 'act-b.story-b1', payload: { toActivity: 'act-a', after: 'story-a1' } },
    { type: 'MOVE_STEP', target: 'act-a.story-a2.step-a2a', payload: { toStory: 'act-a.story-a1', after: null } },
    {
      type: 'ADD_ACTIVITY',
      target: { type: 'page', id: 'prototype' },
      payload: { id: 'act-new', name: 'New activity' },
    },
    { type: 'ADD_STORY', target: 'act-a', payload: { id: 'story-new', name: 'New story' } },
    {
      type: 'ADD_STEP',
      target: 'act-a.story-a1',
      payload: { id: 'step-new', name: 'New step', panes: [{ screen: 'screen-x' }] },
    },
    {
      type: 'ADD_PREVIEW',
      target: 'act-a.story-a1.step-new',
      payload: { id: 'mat-new', kind: 'plain', label: 'Added material' },
    },
    { type: 'DELETE_ACTIVITY', target: 'act-b', payload: {} },
    { type: 'DELETE_STORY', target: 'act-a.story-a2', payload: {} },
    { type: 'DELETE_STEP', target: 'act-a.story-a1.step-a1b', payload: {} },
    { type: 'DELETE_PREVIEW', target: 'prev-y1', payload: {} },
    // --- stale from here: targets that never existed, or were just deleted above ---
    { type: 'SET_ACTIVITY_NAME', target: 'act-ghost', payload: { name: 'Ghost activity' } },
    { type: 'SET_STEP_NAME', target: 'act-a.story-a1.step-ghost', payload: { name: 'Ghost step' } },
    {
      type: 'MOVE_STEP',
      target: 'act-a.story-a1.step-a1a',
      payload: { toStory: 'act-ghost.story-ghost', after: null },
    },
    { type: 'DELETE_STORY', target: 'act-b.story-b1', payload: {} },
    { type: 'REORDER_STEP', target: 'act-a.story-a1.step-already-deleted', payload: { after: null } },
  ],
};

// ---------------------------------------------------------------------------
// 6. Many long comments + the review rail open, plus an inline edit left open.
// ---------------------------------------------------------------------------

const commentFloodStepDescription =
  '長いステップ説明：レビューレールを開いたままインライン編集も同時に開いて、両方が重なって表示されたときの崩れを確認するためのテキストです。' +
  LONG_JA_NO_SPACE;

/** @type {Fixture} */
const commentFlood = {
  description:
    'A dozen long comments (five threaded on one step, the rest spread across an activity, a story, a screen and a UI target), the review rail opened with `notes: "on"`, and the step description inline editor pried open on load to overlap the rail.',
  base: {
    title: 'Comment Flood',
    apps: [
      {
        id: 'app-1',
        name: 'App One',
        screens: [
          { id: 'screen-1', title: 'Screen 1', previews: [{ id: 'prev-1', kind: 'browser', viewport: 'desktop' }] },
        ],
      },
    ],
    activities: [
      {
        id: 'act-1',
        name: 'Checkout',
        stories: [
          {
            id: 'story-1',
            name: 'Buy something',
            steps: [
              {
                id: 'step-1',
                name: 'Confirm the order',
                description: commentFloodStepDescription,
                panes: [{ screen: 'screen-1' }],
              },
            ],
          },
        ],
      },
    ],
  },
  slots: `<div slot="preview" data-preview-id="prev-1"><button class="confirm">注文を確定する</button></div>`,
  attributes: { notes: 'on' },
  lang: 'ja',
  hash: 'activity=act-1&story=story-1&step=step-1',
  comments: [
    ...Array.from({ length: 5 }, (_, i) => [
      'step:act-1.story-1.step-1',
      `コメント #${i + 1}: このステップの文言についてのやり取りが長く続く想定のコメントです。${LONG_JA_NO_SPACE.slice(0, 120)}`,
    ]),
    ['activity:act-1', `アクティビティ全体へのコメント。${LONG_JA_NO_SPACE.slice(0, 150)}`],
    ['activity:act-1', '2件目のアクティビティコメント。短め。'],
    ['story:act-1.story-1', `ストーリーへのコメント。${LONG_JA_NO_SPACE.slice(0, 150)}`],
    ['story:act-1.story-1', '2件目のストーリーコメント。'],
    ['screen:screen-1', `画面そのものへのコメント。${LONG_JA_NO_SPACE.slice(0, 150)}`],
    ['screen:screen-1', '2件目の画面コメント。'],
    ['ui:prev-1/button.confirm "注文を確定する"', `UI 要素そのものへのコメント。${LONG_JA_NO_SPACE.slice(0, 150)}`],
  ],
  prepare: (el) => {
    try {
      const description = el.shadowRoot?.querySelector('dpk-component-inline-edit[multiline]');
      description?.shadowRoot?.querySelector('.view')?.click();
    } catch {
      // Best-effort WIP UI state; a missing selector just leaves the editor closed.
    }
  },
};

// ---------------------------------------------------------------------------
// 7. App view WIP state: an oversized device picked, UI-comment picking mode on.
// ---------------------------------------------------------------------------

/** @type {Fixture} */
const deviceAndCommentMode = {
  description:
    'App view landing straight on a screen, with an oversized desktop device (ultrawide, forcing the zoomed-down device chrome) picked and "Comment on UI" picking mode switched on, so the clear pointer-catching sheet lies over a shrunk device at once.',
  base: {
    title: 'Device & Comment Mode',
    apps: [
      {
        id: 'app-1',
        name: 'Admin Console',
        actor: 'Operator',
        screens: [
          {
            id: 'screen-1',
            title: 'Dashboard',
            previews: [{ id: 'prev-1', kind: 'browser', viewport: 'desktop', url: '/dashboard' }],
          },
        ],
      },
    ],
    activities: [],
  },
  slots: `<div slot="preview" data-preview-id="prev-1"><h1>Dashboard</h1><button class="refresh">Refresh</button></div>`,
  lang: 'en',
  hash: 'view=app&screen=screen-1',
  prepare: (el) => {
    try {
      const root = el.shadowRoot;
      if (!root) return;
      const select = root.querySelector('select.device-select');
      if (select instanceof HTMLSelectElement) {
        select.value = 'ultrawide';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
      root.querySelector('.ui-comment-toggle')?.click();
    } catch {
      // Best-effort WIP UI state.
    }
  },
};

// ---------------------------------------------------------------------------
// 8. Markdown-heavy descriptions: tables, nested lists, long code lines.
// ---------------------------------------------------------------------------

/** @type {Fixture} */
const markdownHeavy = {
  description:
    'A screen and a step description written as dense GFM: a table with an unbroken-word cell, three levels of nested ordered/unordered lists, a long inline code span and a fenced code block with one very long unbroken line.',
  base: {
    title: 'Markdown Heavy',
    apps: [
      {
        id: 'app-1',
        name: 'App One',
        screens: [{ id: 'screen-1', title: '画面', description: MARKDOWN_HEAVY, previews: [] }],
      },
    ],
    activities: [
      {
        id: 'act-1',
        name: 'リリース',
        stories: [
          {
            id: 'story-1',
            name: 'リリース作業',
            description: MARKDOWN_HEAVY,
            steps: [
              {
                id: 'step-1',
                name: 'チェックリストを確認する',
                description: MARKDOWN_HEAVY,
                panes: [{ screen: 'screen-1' }],
              },
            ],
          },
        ],
      },
    ],
  },
  lang: 'ja',
  hash: 'activity=act-1&story=story-1&step=step-1',
};

// ---------------------------------------------------------------------------
// 9. Side-by-side overload: many panes in one step, two with per-pane tabs, maximized.
// ---------------------------------------------------------------------------

const sideBySideScreens = [
  {
    id: 'sbs-1',
    previews: [
      { id: 'sbs-1-a', viewport: 'mobile' },
      { id: 'sbs-1-b', viewport: 'desktop' },
    ],
  },
  {
    id: 'sbs-2',
    previews: [
      { id: 'sbs-2-a', viewport: 'mobile' },
      { id: 'sbs-2-b', viewport: 'desktop' },
    ],
  },
  { id: 'sbs-3', previews: [{ id: 'sbs-3-a', viewport: 'desktop' }] },
  { id: 'sbs-4', previews: [{ id: 'sbs-4-a', viewport: 'tablet' }] },
  { id: 'sbs-5', previews: [{ id: 'sbs-5-a', viewport: 'desktop' }] },
  { id: 'sbs-6', previews: [{ id: 'sbs-6-a', viewport: 'mobile' }] },
].map((entry, i) => ({
  id: entry.id,
  title: `Pane screen ${i + 1}`,
  previews: entry.previews.map((p) => ({ ...p, kind: 'browser' })),
}));

/** @type {Fixture} */
const sideBySideOverload = {
  description:
    'One step laying out eight panes side by side (six screens, two of which carry their own rendition tabs, plus two materials), with the stage maximized on load to see whether the overloaded row still fits the tab.',
  base: {
    title: 'Side-by-Side Overload',
    apps: [{ id: 'app-1', name: 'App One', screens: sideBySideScreens }],
    activities: [
      {
        id: 'act-1',
        name: 'Compare everything at once',
        stories: [
          {
            id: 'story-1',
            name: 'Eight panes',
            steps: [
              {
                id: 'step-1',
                name: 'Every pane on screen together',
                panes: [
                  { screen: 'sbs-1' },
                  { screen: 'sbs-2' },
                  { screen: 'sbs-3' },
                  { screen: 'sbs-4' },
                  { screen: 'sbs-5' },
                  { screen: 'sbs-6' },
                  { material: { id: 'sbs-mat-1', kind: 'plain', label: 'Memo A' } },
                  { material: { id: 'sbs-mat-2', kind: 'plain', label: 'Memo B' } },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  slots: `
    <div slot="preview" data-preview-id="sbs-mat-1"><p>Handwritten memo A, next to five other screens and another memo.</p></div>
    <div slot="preview" data-preview-id="sbs-mat-2"><p>Handwritten memo B.</p></div>
  `,
  lang: 'en',
  hash: 'activity=act-1&story=story-1&step=step-1',
  prepare: (el) => {
    try {
      el.shadowRoot?.querySelector('.stage-maximize')?.click();
    } catch {
      // Best-effort WIP UI state.
    }
  },
};

// ---------------------------------------------------------------------------
// 10. Stub screens, previews with no matching light DOM, and a dead link.
// ---------------------------------------------------------------------------

/** @type {Fixture} */
const emptyFramesAndStubs = {
  description:
    'A screen declared with zero previews (a true stub), a preview declared in the base with no matching light DOM (shows the empty-frame placeholder), and a preview whose own markup links to a screen id that does not exist (a dead link the console warns about).',
  base: {
    title: 'Empty Frames & Stubs',
    apps: [
      {
        id: 'app-1',
        name: 'App One',
        screens: [
          { id: 'stub-screen', title: 'Not drawn yet', description: 'まだ描いていない画面。' },
          {
            id: 'drawn-screen',
            title: 'Drawn screen',
            previews: [{ id: 'prev-drawn', kind: 'browser', viewport: 'desktop' }],
          },
          {
            id: 'orphan-screen',
            title: 'Preview without light DOM',
            previews: [{ id: 'prev-orphan', kind: 'browser', viewport: 'desktop' }],
          },
        ],
      },
    ],
    activities: [
      {
        id: 'act-1',
        name: 'Gaps in the mock',
        stories: [
          {
            id: 'story-1',
            name: 'Click into the unknown',
            steps: [
              { id: 'step-1', name: 'A screen with a dead link', panes: [{ screen: 'drawn-screen' }] },
              { id: 'step-2', name: 'A preview nobody drew', panes: [{ screen: 'orphan-screen' }] },
            ],
          },
        ],
      },
    ],
  },
  slots: `
    <div slot="preview" data-preview-id="prev-drawn">
      <a href="#screen=does-not-exist" data-dpk-navigate="screen=does-not-exist">Dead link to an undeclared screen</a>
      <br />
      <a href="#screen=stub-screen" data-dpk-navigate="screen=stub-screen">Link to the stub screen</a>
    </div>
  `,
  lang: 'en',
  hash: 'activity=act-1&story=story-1&step=step-1',
};

export default {
  'extreme-text': extremeText,
  'mega-volume': megaVolume,
  minimal: minimal,
  'hostile-slots': hostileSlots,
  'draft-storm': draftStorm,
  'comment-flood': commentFlood,
  'device-and-comment-mode': deviceAndCommentMode,
  'markdown-heavy': markdownHeavy,
  'side-by-side-overload': sideBySideOverload,
  'empty-frames-stubs': emptyFramesAndStubs,
};
