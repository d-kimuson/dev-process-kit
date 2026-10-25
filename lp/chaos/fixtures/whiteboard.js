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

/** Unbroken 200+ char ASCII token: no spaces, nothing to break the layout on. */
const LONG_ASCII_UNBROKEN = repeat('Hippopotomonstrosesquippedaliophobiaresearchnotesarchive', 4); // 232 chars

/** 200+ chars of Japanese prose with no spaces (Japanese text never has them). */
const LONG_JA_NO_SPACES = repeat(
  'このステッキーメモにはふせんの中身がどこまで折り返されるかを確認するための非常に長い日本語の文章を詰め込んでいる',
  3,
);

/** Emoji (incl. ZWJ family sequence), RTL Arabic/Hebrew, and combining-mark "zalgo" text mixed together. */
const MIXED_CHAOS_TEXT = `🖊️🗂️ ${'🧑‍💻 '.repeat(4)}لوحة بيضاء طويلة جدا بدون فراغات كافية שלום עולם ${'ẇ̸̢'.repeat(8)} 繁體中文測試`;

const sticky = (id, x, y, extra = {}) => ({ id, kind: 'sticky', x, y, ...extra });
const text = (id, x, y, extra = {}) => ({ id, kind: 'text', x, y, ...extra });
const shape = (id, x, y, extra = {}) => ({ id, kind: 'shape', x, y, ...extra });
const frame = (id, x, y, w, h, title, extra = {}) => ({ id, kind: 'frame', x, y, w, h, title, ...extra });
const connector = (id, from, to, extra = {}) => ({ id, from, to, ...extra });

// ------------------------------------------------------------------ fixtures

/** @type {Fixture} */
const longTextEverywhere = {
  description:
    'Every text-bearing item (sticky/text/shape/frame) and connector label pushed to extreme lengths and mixed scripts.',
  lang: 'ja',
  base: {
    title: `${MIXED_CHAOS_TEXT} ${LONG_ASCII_UNBROKEN}`,
    items: [
      sticky('s1', 40, 40, { text: LONG_JA_NO_SPACES, w: 200, h: 200 }),
      text('t1', 320, 40, { text: MIXED_CHAOS_TEXT, w: 260, h: 60 }),
      shape('sh1', 40, 320, { text: LONG_ASCII_UNBROKEN, w: 220, h: 140, shape: 'ellipse' }),
      frame('f1', 640, 40, 420, 300, LONG_JA_NO_SPACES),
      sticky('s2', 680, 100, { text: repeat('🚀', 80), fontSize: 'xlarge', w: 200, h: 200 }),
    ],
    connectors: [
      connector('c1', 's1', 't1', { label: repeat('この矢印の意味を説明する非常に長いラベル。', 6) }),
      connector('c2', 'sh1', 'f1', { label: MIXED_CHAOS_TEXT }),
    ],
  },
};

/** @type {Fixture} */
const hugeBoardWideDeep = {
  description: '60 stickies spread across a wide/deep grid, plus shapes, frames, and 30 crossing connectors.',
  lang: 'en',
  base: (() => {
    const stickies = Array.from({ length: 60 }, (_, i) =>
      sticky(`s${i}`, (i % 10) * 220, Math.trunc(i / 10) * 220, {
        text: `Sticky ${i}`,
        color: ['yellow', 'orange', 'pink', 'purple', 'blue', 'green', 'gray'][i % 7],
      }),
    );
    const shapes = Array.from({ length: 10 }, (_, i) =>
      shape(`shape${i}`, 2400 + i * 200, 0, { text: `Shape ${i}`, shape: i % 2 === 0 ? 'rect' : 'ellipse' }),
    );
    const frames = Array.from({ length: 5 }, (_, i) => frame(`frame${i}`, 4600, i * 500, 500, 460, `Frame ${i}`));
    const items = [...stickies, ...shapes, ...frames];
    const connectors = Array.from({ length: 30 }, (_, i) =>
      connector(`conn${i}`, `s${i}`, `s${(i + 7) % 60}`, {
        route: ['straight', 'elbow', 'curve'][i % 3],
        style: i % 2 === 0 ? 'arrow' : 'line',
      }),
    );
    return { title: 'A very wide, very deep board', items, connectors };
  })(),
};

/** @type {Fixture} */
const emptyMinimal = {
  description: 'Fully empty base: no title, no items, no connectors (the empty-canvas hint state).',
  lang: 'en',
  base: {},
};

/** @type {Fixture} */
const degenerateGeometry = {
  description:
    'Degenerate geometry: huge and negative coordinates, two stickies stacked at identical coordinates, minimum-size and huge-size items, and a nested frame-in-frame.',
  lang: 'en',
  base: {
    title: 'Degenerate geometry',
    items: [
      sticky('far-away', 1_000_000, -1_000_000, { text: 'Way out at extreme coordinates' }),
      sticky('negative', -5000, -5000, { text: 'Negative coordinates' }),
      sticky('stack-a', 100, 100, { text: 'Bottom of an identical-coordinate stack' }),
      sticky('stack-b', 100, 100, { text: 'Top of an identical-coordinate stack' }),
      shape('tiny', 400, 100, { w: 24, h: 24, text: 'min' }),
      shape('huge', 500, 100, { w: 5000, h: 5000, text: 'A single enormous shape' }),
      frame('outer-frame', 0, 400, 1200, 1200, 'Outer frame'),
      frame('inner-frame', 100, 500, 400, 400, 'Inner frame nested inside the outer one'),
      sticky('inside-inner', 150, 550, { text: 'Should belong to the inner frame, not the outer one' }),
    ],
    connectors: [
      connector('zero-length', 'stack-a', 'stack-b', { label: 'Connects two items at the exact same point' }),
    ],
  },
};

/** @type {Fixture} */
const manyDraftsStale = {
  description:
    'Base plus 15+ draft actions across every action type, including a self-loop connector, a color change on a text item (no-op), and several stale targets.',
  lang: 'en',
  base: {
    title: 'Drafted board',
    items: [
      sticky('keep-1', 40, 40, { text: 'Keep and edit this one' }),
      text('keep-2', 320, 40, { text: 'Also kept' }),
      sticky('to-delete', 40, 320, { text: 'About to be deleted' }),
      frame('zone-a', 600, 40, 400, 300, 'Zone A'),
    ],
    connectors: [connector('keep-conn', 'keep-1', 'keep-2')],
  },
  draft: [
    { type: 'SET_ITEM_TEXT', target: 'keep-1', payload: { text: 'Keep and edit this one (renamed)' } },
    { type: 'MOVE_ITEM', target: 'keep-1', payload: { x: 80, y: 80 } },
    { type: 'RESIZE_ITEM', target: 'keep-1', payload: { w: 240, h: 240 } },
    { type: 'SET_ITEM_COLOR', target: 'keep-1', payload: { color: 'green' } },
    { type: 'SET_ITEM_FONT_SIZE', target: 'keep-1', payload: { fontSize: 'large' } },
    { type: 'SET_ITEM_COLOR', target: 'keep-2', payload: { color: 'blue' } },
    { type: 'REORDER_ITEM', target: 'keep-1', payload: { after: null } },
    {
      type: 'ADD_ITEM',
      target: 'whiteboard',
      payload: { id: 'fresh-sticky', kind: 'sticky', x: 900, y: 400, text: 'Freshly added' },
    },
    {
      type: 'ADD_ITEM',
      target: 'whiteboard',
      payload: { id: 'fresh-sticky', kind: 'sticky', x: 900, y: 400, text: 'Freshly added' },
    },
    {
      type: 'CONNECT_ITEMS',
      target: 'whiteboard',
      payload: { id: 'fresh-conn', from: 'keep-1', to: 'fresh-sticky', label: 'New connector' },
    },
    {
      type: 'SET_CONNECTOR_LABEL',
      target: { type: 'connector', id: 'keep-conn' },
      payload: { label: 'Relabeled connector' },
    },
    { type: 'SET_CONNECTOR_ROUTE', target: { type: 'connector', id: 'keep-conn' }, payload: { route: 'curve' } },
    { type: 'DELETE_ITEM', target: 'to-delete' },
    // --- adversarial no-ops: invalid per the reducer, but must not crash ---
    { type: 'CONNECT_ITEMS', target: 'whiteboard', payload: { id: 'self-loop', from: 'keep-2', to: 'keep-2' } },
    // --- stale from here: targets that never existed in base ---
    { type: 'MOVE_ITEM', target: 'ghost-item', payload: { x: 0, y: 0 } },
    {
      type: 'SET_CONNECTOR_LABEL',
      target: { type: 'connector', id: 'ghost-connector' },
      payload: { label: 'Edits a connector that does not exist' },
    },
    { type: 'DELETE_CONNECTOR', target: { type: 'connector', id: 'already-deleted-elsewhere' } },
  ],
};

/** @type {Fixture} */
const commentsRailOpen = {
  description:
    'Many long comments across the page, several items and a connector, with the review rail pinned open via notes="on".',
  lang: 'ja',
  attributes: { notes: 'on' },
  base: {
    title: 'コメントが多いボード',
    items: [
      sticky('idea-1', 40, 40, { text: 'アイデア1' }),
      sticky('idea-2', 320, 40, { text: 'アイデア2' }),
      frame('zone', 40, 320, 500, 300, 'ゾーン'),
    ],
    connectors: [connector('link-1', 'idea-1', 'idea-2', { label: '関連している' })],
  },
  comments: [
    ['page:whiteboard', repeat('ボード全体のレイアウトについての長いコメント。', 20)],
    ['item:idea-1', repeat('このアイデアの具体性が足りないのではという長文コメント。', 15)],
    ['item:idea-1', 'Second, shorter follow-up comment on the same item.'],
    ['item:idea-2', repeat('こちらのアイデアと idea-1 は統合すべきでは、という長い指摘。', 18)],
    ['connector:link-1', repeat('この関連線の意味がラベルだけでは伝わらないという長文コメント。', 12)],
  ],
};

/** @type {Fixture} */
const wipSingleSelectedLabelEditing = {
  description:
    'A single item is selected via hash (#item=s1), which opens the floating toolbar, and its text editor is opened programmatically.',
  lang: 'en',
  hash: 'item=s1',
  base: {
    title: 'Mid-edit item',
    items: [
      sticky('s1', 200, 200, { text: 'Edit me from the toolbar' }),
      sticky('s2', 500, 200, { text: 'Not selected' }),
    ],
    connectors: [],
  },
  prepare: (el) => {
    const label = el.shadowRoot?.querySelector('.wb-toolbar-label');
    if (label && typeof label.startEditing === 'function') label.startEditing();
  },
};

/** @type {Fixture} */
const wipArrangeMenuOpenOverlapping = {
  description:
    'Two overlapping stickies are multi-selected via hash (#item=a,b) and the stacking-order ("arrange") menu is opened programmatically.',
  lang: 'en',
  hash: 'item=overlap-a,overlap-b',
  base: {
    title: 'Overlapping selection with an open menu',
    items: [
      sticky('overlap-a', 200, 200, { text: 'Bottom of an overlapping pair', color: 'yellow' }),
      sticky('overlap-b', 200, 200, { text: 'Top of an overlapping pair', color: 'pink' }),
    ],
    connectors: [],
  },
  prepare: (el) => {
    const menuButton = el.shadowRoot?.querySelector('.wb-menu-btn');
    if (menuButton instanceof HTMLElement) menuButton.click();
  },
};

export default {
  'long-text-everywhere': longTextEverywhere,
  'huge-board-wide-deep': hugeBoardWideDeep,
  'empty-minimal': emptyMinimal,
  'degenerate-geometry': degenerateGeometry,
  'many-drafts-stale': manyDraftsStale,
  'comments-rail-open': commentsRailOpen,
  'wip-single-selected-label-editing': wipSingleSelectedLabelEditing,
  'wip-arrange-menu-open-overlapping': wipArrangeMenuOpenOverlapping,
};
