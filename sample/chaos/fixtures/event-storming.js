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
  '注文確定から決済オーソリ取得在庫引当出荷指示配送業者への連携までを一気通貫でつなぐドメインイベントの連鎖を説明する長い一文',
  3,
);

const MIXED_CHAOS_TEXT = `🔥📦 ${'🧑‍💻 '.repeat(4)}هذا نص عربي طويل جدا بدون أي مسافات كافية שלום עולם ${'ź̂̃̄̅'.repeat(8)} 測試文字`;

/** `exactOptional` fields reject an explicit `undefined` value, so the factories below drop them. */
const clean = (obj) => Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined));

const note = (id, type, name, extra) => clean({ id, type, name, ...extra });
const link = (id, from, to, extra) => clean({ id, from, to, ...extra });

// ------------------------------------------------------------------ fixtures

/** @type {Fixture} */
const longTextEverywhere = {
  description:
    'Context, note and link names/descriptions pushed to extreme lengths across ASCII/Japanese/emoji/RTL/combining scripts.',
  lang: 'ja',
  base: {
    title: `${MIXED_CHAOS_TEXT} ${LONG_ASCII_UNBROKEN}`,
    contexts: [
      { id: 'shop', name: LONG_JA_NO_SPACES, description: LONG_ASCII_UNBROKEN },
      { id: 'kitchen', name: MIXED_CHAOS_TEXT },
    ],
    elements: [
      note('customer', 'actor', LONG_JA_NO_SPACES, { contextId: 'shop' }),
      note('order-cmd', 'command', MIXED_CHAOS_TEXT, { contextId: 'shop', description: LONG_ASCII_UNBROKEN }),
      note('order-agg', 'aggregate', LONG_ASCII_UNBROKEN, { contextId: 'shop' }),
      note('ordered', 'event', LONG_JA_NO_SPACES, { contextId: 'kitchen', description: MIXED_CHAOS_TEXT }),
      note('cook-rule', 'policy', MIXED_CHAOS_TEXT, { contextId: 'kitchen' }),
      note('payment', 'external', LONG_ASCII_UNBROKEN),
      note('peak-delay', 'hotspot', LONG_JA_NO_SPACES.slice(0, 120)),
    ],
    links: [
      link('l1', 'customer', 'order-cmd', { label: LONG_ASCII_UNBROKEN }),
      link('l2', 'order-cmd', 'order-agg', { kind: 'member' }),
      link('l3', 'order-agg', 'ordered', { label: MIXED_CHAOS_TEXT }),
      link('l4', 'ordered', 'cook-rule', { kind: 'flow' }),
      link('l5', 'cook-rule', 'payment', { label: LONG_JA_NO_SPACES.slice(0, 80) }),
    ],
  },
};

/** @type {Fixture} */
const hugeTimeline = {
  description:
    '70 notes across 6 bounded contexts with ~90 links, stressing horizontal scroll and the SVG causality lines.',
  lang: 'en',
  base: (() => {
    const types = ['actor', 'command', 'aggregate', 'event', 'policy', 'readmodel', 'external', 'hotspot'];
    const contexts = Array.from({ length: 6 }, (_, i) => ({
      id: `ctx-${i}`,
      name: `Context ${i}`,
      description: `Bounded context number ${i}`,
    }));
    const elements = Array.from({ length: 70 }, (_, i) =>
      note(`n${i}`, types[i % types.length], `Note ${i} — ${types[i % types.length]}`, {
        contextId: contexts[i % contexts.length].id,
        description:
          i % 5 === 0 ? `Longer description for note ${i} that explains the rule in a few more words.` : undefined,
      }),
    );
    const links = [];
    for (let i = 0; i < 69; i += 1) {
      links.push(link(`flow-${i}`, `n${i}`, `n${i + 1}`, { kind: i % 4 === 0 ? 'member' : 'flow' }));
    }
    // extra cross-timeline links to make the SVG lines tangle
    for (let i = 0; i < 20; i += 1) {
      links.push(link(`cross-${i}`, `n${i}`, `n${69 - i}`, { label: `cross ${i}` }));
    }
    return { title: 'Huge timeline', contexts, elements, links };
  })(),
};

/** @type {Fixture} */
const emptyMinimal = {
  description: 'Title only — no contexts, elements or links; the empty-state board.',
  lang: 'en',
  base: { title: 'Nothing storm-ed yet' },
};

/** @type {Fixture} */
const singleNote = {
  description: 'The smallest non-empty board: one note, no context, no links.',
  lang: 'en',
  base: { title: 'Minimal board', elements: [note('n1', 'event', 'The only event')] },
};

/** @type {Fixture} */
const manyDraftsStale = {
  description:
    'Base board plus 20+ draft actions (renames, adds, re-types, links/unlinks, context moves, deletes) with several stale ones.',
  lang: 'en',
  base: {
    title: 'Drafted board',
    contexts: [
      { id: 'shop', name: 'Shop' },
      { id: 'kitchen', name: 'Kitchen' },
    ],
    elements: [
      note('customer', 'actor', 'Customer', { contextId: 'shop' }),
      note('order-cmd', 'command', 'Place order', { contextId: 'shop' }),
      note('ordered', 'event', 'Order placed', { contextId: 'kitchen' }),
      note('to-delete', 'hotspot', 'Will be removed'),
    ],
    links: [link('l1', 'customer', 'order-cmd'), link('l2', 'order-cmd', 'ordered')],
  },
  draft: [
    { type: 'SET_ELEMENT_NAME', target: { type: 'element', id: 'customer' }, payload: { name: 'Customer (renamed)' } },
    {
      type: 'SET_ELEMENT_DESCRIPTION',
      target: { type: 'element', id: 'order-cmd' },
      payload: { description: 'Issued from the cart page.' },
    },
    { type: 'SET_ELEMENT_TYPE', target: { type: 'element', id: 'to-delete' }, payload: { type: 'hotspot' } },
    { type: 'SET_ELEMENT_CONTEXT', target: { type: 'element', id: 'ordered' }, payload: { contextId: 'shop' } },
    { type: 'MOVE_ELEMENT', target: { type: 'element', id: 'customer' }, payload: { after: 'ordered' } },
    {
      type: 'ADD_ELEMENT',
      target: { type: 'page', id: 'event-storming' },
      payload: { id: 'new-policy', type: 'policy', name: 'Fresh policy note' },
    },
    {
      type: 'ADD_ELEMENT',
      target: { type: 'page', id: 'event-storming' },
      payload: { id: 'new-readmodel', type: 'readmodel', name: 'Fresh read model', contextId: 'kitchen' },
    },
    { type: 'DELETE_ELEMENT', target: { type: 'element', id: 'to-delete' }, payload: {} },
    {
      type: 'LINK_ELEMENTS',
      target: { type: 'page', id: 'event-storming' },
      payload: { id: 'l3', from: 'ordered', to: 'new-policy', kind: 'flow' },
    },
    { type: 'SET_LINK_LABEL', target: { type: 'link', id: 'l1' }, payload: { label: 'triggers' } },
    {
      type: 'UNLINK_ELEMENTS',
      target: { type: 'page', id: 'event-storming' },
      payload: { from: 'order-cmd', to: 'ordered' },
    },
    {
      type: 'ADD_CONTEXT',
      target: { type: 'page', id: 'event-storming' },
      payload: { id: 'billing', name: 'Billing' },
    },
    { type: 'SET_CONTEXT_NAME', target: { type: 'context', id: 'shop' }, payload: { name: 'Shop (renamed)' } },
    { type: 'DELETE_CONTEXT', target: { type: 'context', id: 'kitchen' }, payload: {} },
    // --- stale from here: targets/anchors/endpoints that never existed in base ---
    {
      type: 'SET_ELEMENT_NAME',
      target: { type: 'element', id: 'ghost-note' },
      payload: { name: 'Edits a note that does not exist' },
    },
    { type: 'MOVE_ELEMENT', target: { type: 'element', id: 'customer' }, payload: { after: 'never-existed' } },
    {
      type: 'SET_ELEMENT_CONTEXT',
      target: { type: 'element', id: 'order-cmd' },
      payload: { contextId: 'ghost-context' },
    },
    {
      type: 'LINK_ELEMENTS',
      target: { type: 'page', id: 'event-storming' },
      payload: { id: 'l-ghost', from: 'ghost-a', to: 'ghost-b' },
    },
    { type: 'SET_LINK_LABEL', target: { type: 'link', id: 'ghost-link' }, payload: { label: 'nowhere' } },
    { type: 'DELETE_CONTEXT', target: { type: 'context', id: 'never-was-a-context' }, payload: {} },
  ],
};

/** @type {Fixture} */
const commentsEverywhere = {
  description: 'Many long comments on elements and contexts with the review rail pinned open.',
  lang: 'ja',
  attributes: { notes: 'on' },
  base: {
    title: '注文フロー（コメント多数）',
    contexts: [
      { id: 'shop', name: '店舗', description: '注文受付' },
      { id: 'kitchen', name: '厨房' },
    ],
    elements: [
      note('customer', 'actor', '顧客', { contextId: 'shop' }),
      note('order-cmd', 'command', '注文する', { contextId: 'shop' }),
      note('ordered', 'event', '注文受付済み', { contextId: 'kitchen' }),
      note('peak-delay', 'hotspot', '昼ピークの遅延'),
    ],
    links: [link('l1', 'customer', 'order-cmd'), link('l2', 'order-cmd', 'ordered')],
  },
  comments: [
    ['page:event-storming', repeat('ボード全体についての長いコメント。', 20)],
    ['element:customer', repeat('このアクターの粒度についての長い議論用コメント。', 15)],
    ['element:order-cmd', repeat('このコマンドの名前づけを動詞に揃えるべきという長文コメント。', 15)],
    ['element:ordered', repeat('このイベントが本当にドメインイベントとして正しいかの長文レビュー。', 18)],
    ['element:ordered', 'Second, shorter follow-up comment on the same event.'],
    ['element:peak-delay', repeat('このホットスポットの解消方針についての長いコメント。', 12)],
    ['context:shop', repeat('このバウンデッドコンテキストの境界についての長いコメント。', 12)],
    ['context:kitchen', repeat('Kitchen context ownership needs discussion. '.repeat(1) + 'Longer explanation. ', 10)],
  ],
};

/** @type {Fixture} */
const wipNoteSelected = {
  description:
    'A note is selected via hash (#note=ordered&context=kitchen), opening its editor popover with a long description already typed.',
  lang: 'en',
  hash: 'note=ordered&context=kitchen',
  base: {
    title: 'Mid-edit board',
    contexts: [
      { id: 'shop', name: 'Shop' },
      { id: 'kitchen', name: 'Kitchen' },
    ],
    elements: [
      note('customer', 'actor', 'Customer', { contextId: 'shop' }),
      note('order-cmd', 'command', 'Place order', { contextId: 'shop' }),
      note('ordered', 'event', 'Order placed', {
        contextId: 'kitchen',
        description: LONG_ASCII_UNBROKEN + ' ' + MIXED_CHAOS_TEXT,
      }),
      note('cook-rule', 'policy', 'Start cooking if in stock', { contextId: 'kitchen' }),
    ],
    links: [
      link('l1', 'customer', 'order-cmd'),
      link('l2', 'order-cmd', 'ordered'),
      link('l3', 'ordered', 'cook-rule'),
    ],
  },
};

/** @type {Fixture} */
const tangledLinks = {
  description:
    '24 notes in one slice-dense cluster with a near-complete link graph (member + flow mixed) to stress overlapping SVG lines.',
  lang: 'en',
  base: (() => {
    const elements = Array.from({ length: 24 }, (_, i) =>
      note(`n${i}`, i % 2 === 0 ? 'event' : 'command', `Note ${i}`),
    );
    const links = [];
    for (let i = 0; i < 23; i += 1) links.push(link(`seq-${i}`, `n${i}`, `n${i + 1}`, { kind: 'flow' }));
    for (let i = 0; i < 24; i += 2) {
      for (let j = i + 2; j < Math.min(i + 8, 24); j += 2) {
        links.push(link(`member-${i}-${j}`, `n${i}`, `n${j}`, { kind: 'member' }));
      }
    }
    return { title: 'Tangled links', elements, links };
  })(),
};

/** @type {Fixture} */
const manyContexts = {
  description: '22 bounded contexts to force the context-filter button row to wrap across several lines.',
  lang: 'en',
  base: (() => {
    const contexts = Array.from({ length: 22 }, (_, i) => ({
      id: `ctx-${i}`,
      name: `Bounded Context ${i} — ${'x'.repeat(10)}`,
    }));
    const elements = contexts.map((c, i) => note(`n${i}`, 'aggregate', `Aggregate for ${c.name}`, { contextId: c.id }));
    return { title: 'Many contexts', contexts, elements, links: [] };
  })(),
};

export default {
  'long-text-everywhere': longTextEverywhere,
  'huge-timeline': hugeTimeline,
  'empty-minimal': emptyMinimal,
  'single-note': singleNote,
  'many-drafts-stale': manyDraftsStale,
  'comments-everywhere': commentsEverywhere,
  'wip-note-selected': wipNoteSelected,
  'tangled-links': tangledLinks,
  'many-contexts': manyContexts,
};
