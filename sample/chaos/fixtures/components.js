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

// These fixtures render the `plain` template (it has no action vocabulary of
// its own) with diagram/inline-edit components embedded in `slots`, exactly
// as `docs/templates/plain.md` documents: a wrapper `<div slot="main">`
// holding one or more `dpk-component-*` elements, each with its JSON data as
// a `<script type="application/json">` child. `components.js` must be loaded
// alongside `templates/plain.js` for the custom elements to be defined.
//
// Note: the task's requested "diagram" component has no standalone custom
// element — `src/components/diagram/index.ts` only exports shared foundation
// code consumed by the seven typed diagrams (er/sequence/state/mind-map/
// kanban/architecture-map/dependency-graph), so there is no bare
// `dpk-component-diagram` to instantiate. Covered implicitly via those seven.

// ---- small deterministic string builders (no Math.random) --------------

const repeat = (s, n) => s.repeat(n);

/** Unbroken 200+ char ASCII token: no spaces, nothing to break the layout on. */
const LONG_ASCII_UNBROKEN = repeat('Floccinaucinihilipilificationschemabenchmarkreport', 5); // 255 chars

/** 200+ chars of Japanese prose with no spaces (Japanese text never has them). */
const LONG_JA_NO_SPACES = repeat(
  'この図のラベルがどこまで折り返されるか横に伸び続けるかを確認するための非常に長い日本語の説明文をここに詰め込む',
  3,
);

/** Emoji (incl. ZWJ family sequence), RTL Arabic/Hebrew, and combining-mark "zalgo" text mixed together. */
const MIXED_CHAOS_TEXT = `🧩📊 ${'🧑‍🔬 '.repeat(4)}هذا رسم بياني طويل جدا بدون فراغات كافية שלום עולם ${'ḇ̴̢'.repeat(8)} 繁體中文測試`;

/** Escapes a value for use inside a double-quoted HTML attribute. */
const escapeAttr = (value) =>
  String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** `</script` inside JSON text must not close the real `<script>` tag early. */
const escapeScriptClose = (json) => json.replace(/<\/script/gi, '<\\/script');

/** One diagram/component element with its JSON child, as light-DOM markup. */
const diagramEl = (tag, attrs, data) => {
  const attrStr = Object.entries(attrs)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => ` ${key}="${escapeAttr(value)}"`)
    .join('');
  const body =
    data === undefined ? '' : `<script type="application/json">${escapeScriptClose(JSON.stringify(data))}</script>`;
  return `<${tag}${attrStr}>${body}</${tag}>`;
};

const mainSlot = (inner) => `<div slot="main">${inner}</div>`;

// ------------------------------------------------------------------ fixtures

/** @type {Fixture} */
const erDiagramLongAndDiffed = {
  description:
    'dpk-component-er-diagram: before/after diff (added/removed/changed) with extremely long Japanese/mixed-script table, field and tag text.',
  lang: 'ja',
  base: { title: 'ERD レビュー' },
  slots: mainSlot(
    diagramEl(
      'dpk-component-er-diagram',
      { id: 'order-schema', heading: LONG_ASCII_UNBROKEN, subject: MIXED_CHAOS_TEXT },
      {
        before: {
          tables: [
            {
              id: 'orders',
              name: LONG_JA_NO_SPACES,
              fields: [
                { id: 'id', type: 'uuid', key: 'PK' },
                { id: 'status', type: 'varchar' },
              ],
            },
            {
              id: 'legacy_customers',
              name: `旧${LONG_JA_NO_SPACES}`,
              fields: [
                { id: 'id', type: 'uuid', key: 'PK' },
                { id: 'name', type: 'varchar' },
              ],
            },
          ],
        },
        after: {
          tables: [
            {
              id: 'orders',
              name: LONG_JA_NO_SPACES,
              tags: [MIXED_CHAOS_TEXT, repeat('長いタグ', 20)],
              fields: [
                { id: 'id', type: 'uuid', key: 'PK' },
                { id: 'status', type: 'order_status' },
                {
                  id: 'customer_id',
                  type: 'uuid',
                  key: 'FK',
                  ref: 'customers.id',
                  nullable: false,
                  label: LONG_ASCII_UNBROKEN,
                },
              ],
            },
            {
              id: 'customers',
              name: MIXED_CHAOS_TEXT,
              fields: [
                { id: 'id', type: 'uuid', key: 'PK' },
                { id: 'email', type: 'varchar', key: 'UQ' },
              ],
            },
            {
              id: 'order_items',
              name: '注文明細',
              fields: [
                { id: 'id', type: 'uuid', key: 'PK' },
                { id: 'order_id', type: 'uuid', key: ['FK', 'UQ'], ref: 'orders.id', nullable: false },
                { id: 'sku', type: 'varchar' },
              ],
            },
          ],
        },
      },
    ),
  ),
};

/** @type {Fixture} */
const sequenceDiagramHugeAndNestedFragments = {
  description:
    'dpk-component-sequence-diagram: 15 participants, a 2-level-deep alt/loop nesting, a self-message, and extremely long titles/guards/details.',
  lang: 'en',
  base: { title: 'Checkout sequence review' },
  slots: mainSlot(
    diagramEl(
      'dpk-component-sequence-diagram',
      { id: 'checkout-seq', heading: 'Checkout', subject: LONG_ASCII_UNBROKEN },
      {
        participants: Array.from({ length: 15 }, (_, i) => ({
          id: `svc${i}`,
          name: i === 3 ? LONG_JA_NO_SPACES : `Service ${i}`,
          role: i % 4 === 0 ? 'Owner of the call' : undefined,
          kind: i % 5 === 0 ? 'external' : undefined,
          description: i === 7 ? MIXED_CHAOS_TEXT : undefined,
        })),
        items: [
          {
            kind: 'message',
            id: 'm0',
            from: 'svc0',
            to: 'svc1',
            title: repeat('A request title that just keeps going. ', 6),
            style: 'request',
          },
          {
            kind: 'fragment',
            id: 'frag-alt',
            operator: 'alt',
            title: `Outcome branch — ${LONG_JA_NO_SPACES}`,
            branches: [
              {
                label: 'Success path',
                items: [
                  {
                    kind: 'message',
                    id: 'm1',
                    from: 'svc1',
                    to: 'svc2',
                    title: 'Validate payment',
                    style: 'request',
                    tags: ['happy-path'],
                  },
                  {
                    kind: 'fragment',
                    id: 'frag-loop',
                    operator: 'loop',
                    title: 'Retry until confirmed',
                    branches: [
                      {
                        label: 'while unconfirmed',
                        items: [
                          {
                            kind: 'message',
                            id: 'm2',
                            from: 'svc2',
                            to: 'svc3',
                            title: 'Poll status',
                            style: 'async',
                            guard: '[unconfirmed]',
                            detail: repeat('Polling detail text. ', 10),
                          },
                          {
                            kind: 'message',
                            id: 'm3',
                            from: 'svc3',
                            to: 'svc2',
                            title: 'Status response',
                            style: 'response',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                label: `Failure path (${MIXED_CHAOS_TEXT})`,
                items: [
                  {
                    kind: 'message',
                    id: 'm4',
                    from: 'svc2',
                    to: 'svc1',
                    title: 'Payment declined',
                    style: 'response',
                    detail: LONG_JA_NO_SPACES,
                  },
                ],
              },
            ],
          },
          { kind: 'message', id: 'm5', from: 'svc9', to: 'svc9', title: 'Recompute totals in place', style: 'async' },
          {
            kind: 'message',
            id: 'm6',
            from: 'svc0',
            to: 'svc14',
            title: 'Final notification',
            style: 'request',
            guard: repeat('A very long guard condition expression. ', 5),
            detail: repeat('🧾', 60),
          },
        ],
      },
    ),
  ),
};

/** @type {Fixture} */
const stateDiagramDenseTransitions = {
  description:
    'dpk-component-state-diagram: 12 states (initial/terminal/compensation) and 22 transitions, several exception-kind, with long guard/effect text.',
  lang: 'en',
  base: { title: 'Order state machine' },
  slots: mainSlot(
    diagramEl(
      'dpk-component-state-diagram',
      { id: 'order-states', heading: 'Order lifecycle' },
      {
        states: [
          { id: 'start', name: 'Start', kind: 'initial' },
          ...Array.from({ length: 9 }, (_, i) => ({
            id: `s${i}`,
            name: i === 4 ? LONG_JA_NO_SPACES : `State ${i} — ${['Pending', 'Processing', 'Review', 'Hold'][i % 4]}`,
            code: `state_${i}`,
            description: i === 2 ? MIXED_CHAOS_TEXT : undefined,
          })),
          { id: 'done', name: 'Done', kind: 'terminal' },
          { id: 'compensate', name: 'Compensating', kind: 'compensation', description: LONG_ASCII_UNBROKEN },
        ],
        transitions: [
          { id: 't-start', from: 'start', to: 's0', title: 'Submit' },
          ...Array.from({ length: 8 }, (_, i) => ({
            id: `t${i}`,
            from: `s${i}`,
            to: `s${i + 1}`,
            title: i === 5 ? repeat('A transition title that never stops. ', 5) : `Advance ${i}`,
            kind: i % 3 === 0 ? 'exception' : 'normal',
            guard: i % 2 === 0 ? repeat('guard condition clause, ', 8) : undefined,
            effect: i % 2 === 1 ? repeat('effect description clause, ', 8) : undefined,
          })),
          { id: 't-fail-0', from: 's0', to: 'compensate', title: 'Fail early', kind: 'exception' },
          { id: 't-fail-4', from: 's4', to: 'compensate', title: 'Fail midway', kind: 'exception' },
          { id: 't-fail-8', from: 's8', to: 'compensate', title: 'Fail late', kind: 'exception' },
          { id: 't-compensated', from: 'compensate', to: 'done', title: 'Compensation complete' },
          { id: 't-finish', from: 's8', to: 'done', title: 'Complete' },
          { id: 't-parallel-a', from: 's2', to: 's3', title: 'Parallel edge A (same endpoints as t2)' },
          { id: 't-parallel-b', from: 's2', to: 's3', title: 'Parallel edge B (same endpoints as t2)' },
        ],
      },
    ),
  ),
};

/** Builds a chain of nested single-child topics `depth` levels deep, to stress very deep nesting. */
const deepChain = (prefix, depth) => {
  if (depth <= 0) return undefined;
  return [
    {
      id: `${prefix}-d${depth}`,
      label: depth === 1 ? LONG_JA_NO_SPACES : `階層 ${depth}`,
      children: deepChain(prefix, depth - 1),
    },
  ];
};

/** @type {Fixture} */
const mindMapDeepAndWide = {
  description:
    'dpk-component-mind-map: 6 main branches (wide), 5 levels deep (deep), with long JA/mixed-script labels, descriptions and collapsed nodes.',
  lang: 'ja',
  base: { title: 'マインドマップ レビュー' },
  slots: mainSlot(
    diagramEl(
      'dpk-component-mind-map',
      { id: 'product-map', heading: 'プロダクト全体像' },
      {
        root: {
          id: 'root',
          label: MIXED_CHAOS_TEXT,
          children: [
            {
              id: 'branch-0',
              label: LONG_JA_NO_SPACES,
              side: 'left',
              description: LONG_ASCII_UNBROKEN,
              children: deepChain('branch-0', 4),
            },
            { id: 'branch-1', label: 'オンボーディング', side: 'right', children: deepChain('branch-1', 4) },
            { id: 'branch-2', label: '決済', children: deepChain('branch-2', 3) },
            { id: 'branch-3', label: '検索', collapsed: true, children: deepChain('branch-3', 2) },
            { id: 'branch-4', label: repeat('🔍', 40), children: deepChain('branch-4', 2) },
            { id: 'branch-5', label: '通知基盤', tags: [MIXED_CHAOS_TEXT], children: deepChain('branch-5', 3) },
          ],
        },
      },
    ),
  ),
};

/** @type {Fixture} */
const kanbanManyCardsLongTitles = {
  description:
    'dpk-component-kanban: 6 columns (one over its WIP limit of 2 with 10 cards), long titles/descriptions/tags/assignee names.',
  lang: 'en',
  base: { title: 'Sprint board review' },
  slots: mainSlot(
    diagramEl(
      'dpk-component-kanban',
      { id: 'sprint-board', heading: 'Sprint 42' },
      {
        columns: [
          {
            id: 'backlog',
            label: 'Backlog',
            color: 'gray',
            cards: Array.from({ length: 4 }, (_, i) => ({ id: `bk${i}`, title: `Backlog item ${i}` })),
          },
          {
            id: 'in-progress',
            label: 'In progress',
            color: 'blue',
            limit: 2,
            cards: Array.from({ length: 10 }, (_, i) => ({
              id: `wip${i}`,
              title:
                i === 0
                  ? repeat('A card title that refuses to wrap politely. ', 4)
                  : `WIP card ${i}: ${['Refactor', 'Investigate', 'Pair on', 'Unblock'][i % 4]}`,
              description: i === 1 ? MIXED_CHAOS_TEXT : undefined,
              tags: i % 3 === 0 ? ['over-limit', 'needs-review', LONG_ASCII_UNBROKEN.slice(0, 40)] : undefined,
              assignee: i === 2 ? LONG_JA_NO_SPACES : `person-${i}@example.com`,
            })),
          },
          {
            id: 'review',
            label: 'In review',
            color: 'violet',
            limit: 3,
            cards: [{ id: 'rv0', title: 'Needs a second pair of eyes', description: LONG_JA_NO_SPACES }],
          },
          {
            id: 'blocked',
            label: 'Blocked',
            color: 'amber',
            cards: [
              {
                id: 'bl0',
                title: 'Waiting on vendor',
                description: repeat('Blocked because of an upstream dependency. ', 6),
              },
            ],
          },
          {
            id: 'done',
            label: 'Done',
            color: 'green',
            cards: Array.from({ length: 6 }, (_, i) => ({ id: `d${i}`, title: `Shipped item ${i}` })),
          },
          { id: 'empty-column', label: 'Nothing here yet', cards: [] },
        ],
      },
    ),
  ),
};

/** @type {Fixture} */
const architectureMapLongAndDense = {
  description:
    'dpk-component-architecture-map: 3 boundaries (internal/external), 15 services with required positions, artwork, and a dense link mesh.',
  lang: 'en',
  base: { title: 'Architecture review' },
  slots: mainSlot(
    diagramEl(
      'dpk-component-architecture-map',
      { id: 'platform-map', heading: 'Platform architecture' },
      {
        boundaries: [
          { id: 'core', label: LONG_ASCII_UNBROKEN, kind: 'internal' },
          { id: 'partners', label: MIXED_CHAOS_TEXT, kind: 'external' },
          { id: 'legacy', label: '長いレガシー境界名', kind: 'internal' },
        ],
        services: [
          ...Array.from({ length: 10 }, (_, i) => ({
            id: `svc${i}`,
            name: i === 3 ? LONG_JA_NO_SPACES : `Service ${i}`,
            boundary: 'core',
            description: i === 5 ? MIXED_CHAOS_TEXT : undefined,
            symbol: i % 4 === 0 ? 'DB' : undefined,
            position: { x: (i % 5) * 260, y: Math.trunc(i / 5) * 200 },
          })),
          ...Array.from({ length: 3 }, (_, i) => ({
            id: `partner${i}`,
            name: `Partner API ${i}`,
            boundary: 'partners',
            artwork: {
              src: `https://example.com/logos/partner-${i}.svg`,
              alt: `Partner ${i} logo`,
              license: 'CC BY 4.0',
            },
            position: { x: 1400, y: i * 220 },
          })),
          ...Array.from({ length: 2 }, (_, i) => ({
            id: `legacy${i}`,
            name: `Legacy system ${i}`,
            boundary: 'legacy',
            position: { x: -400, y: i * 220 },
          })),
          { id: 'orphan', name: 'Not in any boundary', position: { x: -800, y: 800 } },
        ],
        links: Array.from({ length: 12 }, (_, i) => ({
          id: `link${i}`,
          from: `svc${i % 10}`,
          to: i % 3 === 0 ? `partner${i % 3}` : `svc${(i + 3) % 10}`,
          label: i === 0 ? repeat('A link label that goes on and on. ', 3) : undefined,
        })),
      },
    ),
  ),
};

/** @type {Fixture} */
const dependencyGraphCircularAndDense = {
  description:
    'dpk-component-dependency-graph: 12 modules with an explicit A→B→C→A cycle and parallel multi-edges, long paths/contracts/descriptions.',
  lang: 'en',
  base: { title: 'Dependency review' },
  slots: mainSlot(
    diagramEl(
      'dpk-component-dependency-graph',
      { id: 'module-graph', heading: 'Module dependencies' },
      {
        modules: Array.from({ length: 12 }, (_, i) => ({
          id: `mod${i}`,
          name: i === 6 ? LONG_JA_NO_SPACES : `Module ${i}`,
          path: `packages/service-${i}/src/index.ts`,
          layer: ['Domain', 'Application', 'Infrastructure'][i % 3],
          description: i === 9 ? MIXED_CHAOS_TEXT : undefined,
          tags: i % 4 === 0 ? ['legacy', LONG_ASCII_UNBROKEN.slice(0, 30)] : [],
        })),
        dependencies: [
          { id: 'cycle-a-b', from: 'mod0', to: 'mod1', contract: 'placeOrder' },
          { id: 'cycle-b-c', from: 'mod1', to: 'mod2', contract: 'reserveStock' },
          {
            id: 'cycle-c-a',
            from: 'mod2',
            to: 'mod0',
            contract: repeat('a very long contract name describing the inverse call ', 3),
            description: 'Closes the cycle back to module 0 — a circular dependency on purpose.',
          },
          { id: 'parallel-1', from: 'mod3', to: 'mod4', contract: 'fetchQuote' },
          { id: 'parallel-2', from: 'mod3', to: 'mod4', contract: 'fetchQuoteAsync', description: LONG_JA_NO_SPACES },
          ...Array.from({ length: 8 }, (_, i) => ({ id: `dep${i}`, from: `mod${i}`, to: `mod${(i + 5) % 12}` })),
        ],
      },
    ),
  ),
};

/** @type {Fixture} */
const formalSpecRichClaims = {
  description:
    'dpk-component-formal-spec: 2 targets, 4 terms (cross-referenced via [[id]]), and claims covering all 4 assurance kinds with long clause text.',
  lang: 'en',
  base: { title: 'Formal spec review' },
  slots: mainSlot(
    diagramEl(
      'dpk-component-formal-spec',
      { id: 'checkout-spec', heading: 'Checkout invariants' },
      {
        targets: [
          { id: 'checkout_total', name: 'Checkout total calculation', code: 'calculateCheckoutTotal' },
          {
            id: 'inventory_reservation',
            name: 'Inventory reservation',
            summary: 'Reserves stock for a [[cart]] before payment.',
          },
        ],
        terms: [
          { id: 'cart', name: 'Cart', meaning: 'The set of line items a shopper intends to buy.' },
          { id: 'reservation', name: 'Reservation', meaning: 'A time-boxed hold on inventory for one [[cart]].' },
          { id: 'tax_jurisdiction', name: 'Tax jurisdiction', meaning: LONG_ASCII_UNBROKEN },
          { id: 'long_term', name: MIXED_CHAOS_TEXT, meaning: LONG_JA_NO_SPACES },
        ],
        claims: [
          {
            id: 'total_nonnegative',
            target: 'checkout_total',
            statement: 'The checkout total for any [[cart]] is never negative, regardless of [[tax_jurisdiction]].',
            premises: [{ id: 'p1', text: 'Every line item price is non-negative.' }],
            conclusions: [
              {
                id: 'c1',
                text: repeat('The total, after discounts, taxes and rounding, is still bounded below by zero. ', 3),
              },
            ],
            assurance: { kind: 'proved', assumptions: ['The pricing service never returns NaN.', LONG_JA_NO_SPACES] },
            source: { tool: 'Lean 4', ref: 'proofs/checkout/total_nonneg.lean' },
          },
          {
            id: 'reservation_bounded',
            target: 'inventory_reservation',
            statement:
              'A [[reservation]] never holds more units than are physically in stock, for carts up to 500 items.',
            conclusions: [{ id: 'c2', text: 'The reservation quantity is at most the warehouse count.' }],
            examples: [{ id: 'e1', text: 'A 500-item cart against a 500-unit warehouse succeeds exactly once.' }],
            assurance: {
              kind: 'bounded',
              bound: 'Model-checked for carts of up to 500 distinct line items; unchecked beyond that.',
            },
            source: { ref: 'model-check/reservation.tla' },
          },
          {
            id: 'tax_rounding',
            statement: MIXED_CHAOS_TEXT,
            conclusions: [{ id: 'c3', text: 'Rounding error per line item stays within one minor currency unit.' }],
            notClaimed: [{ id: 'nc1', text: 'This says nothing about cross-jurisdiction tax exemptions.' }],
            assurance: {
              kind: 'incomplete',
              gaps: [
                'Multi-currency carts are not yet covered.',
                'Negative tax rates (refund scenarios) are unverified.',
              ],
            },
          },
          {
            id: 'future_discount_stacking',
            statement: `Discount stacking will be proved not to produce a negative total once [[long_term]] lands.`,
            conclusions: [{ id: 'c4', text: 'Stacked discounts will not drive the total negative.' }],
            assurance: { kind: 'planned' },
            subjects: [{ id: 's1', text: 'Discount stacking order.' }],
          },
        ],
      },
    ),
  ),
};

/** @type {Fixture} */
const inlineEditStandaloneLongValue = {
  description:
    'Standalone dpk-component-inline-edit elements (plain, multiline, markdown, seamless+wrap) in header/sidebar/main, with extremely long values, and one opened for editing via prepare.',
  lang: 'ja',
  base: { title: 'インライン編集コンポーネントの検証' },
  slots: `
    <div slot="header">
      <dpk-component-inline-edit id="header-edit" class="inline-fixture" value="${escapeAttr(MIXED_CHAOS_TEXT)}" label="見出し" wrap></dpk-component-inline-edit>
    </div>
    <div slot="sidebar">
      <dpk-component-inline-edit id="sidebar-edit" class="inline-fixture" multiline value="${escapeAttr(LONG_JA_NO_SPACES)}" placeholder="サイドバーの説明"></dpk-component-inline-edit>
    </div>
    <div slot="main">
      <p>Seamless, single-line, wrapping value (long URL):</p>
      <dpk-component-inline-edit id="seamless-edit" class="inline-fixture" seamless wrap value="${escapeAttr(`https://issues.example.com/projects/dpk/issues/1?${repeat('tag=chaos&', 30)}anchor=end`)}"></dpk-component-inline-edit>
      <p>Markdown-rendered multiline value:</p>
      <dpk-component-inline-edit id="markdown-edit" class="inline-fixture" multiline markdown label="仕様メモ" value="# ${escapeAttr(LONG_ASCII_UNBROKEN)}\n\n- ${escapeAttr(LONG_JA_NO_SPACES)}\n- ${escapeAttr(repeat('🧵', 50))}"></dpk-component-inline-edit>
      <p>Empty value, showing the placeholder hint:</p>
      <dpk-component-inline-edit id="empty-edit" class="inline-fixture" placeholder="まだ何も入力されていません"></dpk-component-inline-edit>
    </div>
  `,
  prepare: (el) => {
    const target = el.querySelector('#markdown-edit');
    if (target && typeof target.startEditing === 'function') target.startEditing();
  },
};

/** @type {Fixture} */
const mixedDiagramsOnePage = {
  description:
    'Three different diagram types (kanban, dependency-graph, state-diagram) stacked on one page, stressing multi-diagram layout and scroll.',
  lang: 'en',
  base: { title: 'Weekly architecture + delivery review' },
  slots: mainSlot(
    [
      diagramEl(
        'dpk-component-kanban',
        { id: 'mixed-board', heading: 'Delivery' },
        {
          columns: [
            {
              id: 'todo',
              label: 'To do',
              cards: [
                { id: 'c0', title: 'Write the ADR' },
                { id: 'c1', title: 'Spike the migration' },
              ],
            },
            { id: 'doing', label: 'Doing', cards: [{ id: 'c2', title: 'Implement the gateway' }] },
            { id: 'done', label: 'Done', cards: [{ id: 'c3', title: 'Prototype approved' }] },
          ],
        },
      ),
      diagramEl(
        'dpk-component-dependency-graph',
        { id: 'mixed-deps', heading: 'Gateway dependencies' },
        {
          modules: [
            { id: 'gateway', name: 'Gateway' },
            { id: 'auth', name: 'Auth service' },
            { id: 'billing', name: 'Billing service' },
          ],
          dependencies: [
            { id: 'd0', from: 'gateway', to: 'auth' },
            { id: 'd1', from: 'gateway', to: 'billing' },
          ],
        },
      ),
      diagramEl(
        'dpk-component-state-diagram',
        { id: 'mixed-states', heading: 'Gateway request lifecycle' },
        {
          states: [
            { id: 'received', name: 'Received', kind: 'initial' },
            { id: 'authorized', name: 'Authorized' },
            { id: 'completed', name: 'Completed', kind: 'terminal' },
          ],
          transitions: [
            { id: 't0', from: 'received', to: 'authorized', title: 'Authorize' },
            { id: 't1', from: 'authorized', to: 'completed', title: 'Complete' },
          ],
        },
      ),
    ].join(''),
  ),
};

/** @type {Fixture} */
const emptyAndMinimalDiagrams = {
  description:
    'Minimal/empty data across three diagram types at once: an empty dependency-graph, a single-table ER diagram, and a kanban with one empty column.',
  lang: 'en',
  base: {},
  slots: mainSlot(
    [
      diagramEl(
        'dpk-component-dependency-graph',
        { id: 'empty-deps', heading: 'Nothing yet' },
        { modules: [], dependencies: [] },
      ),
      diagramEl(
        'dpk-component-er-diagram',
        { id: 'minimal-er' },
        { after: { tables: [{ id: 't1', name: 'T1', fields: [{ id: 'id', type: 'uuid' }] }] } },
      ),
      diagramEl(
        'dpk-component-kanban',
        { id: 'minimal-kanban' },
        { columns: [{ id: 'only', label: 'Only column', cards: [] }] },
      ),
    ].join(''),
  ),
};

/** @type {Fixture} */
const commentsRailOpenDiagrams = {
  description:
    'A kanban and a dependency-graph with many long comments on the page, on columns/cards and on nodes/edges, with the review rail pinned open via notes="on".',
  lang: 'ja',
  attributes: { notes: 'on' },
  base: { title: 'コメントが多い図のレビュー' },
  slots: mainSlot(
    [
      diagramEl(
        'dpk-component-kanban',
        { id: 'board1', heading: 'レビュー対象のボード' },
        {
          columns: [
            {
              id: 'col-a',
              label: '未着手',
              cards: [
                { id: 'card-a1', title: '最初のタスク' },
                { id: 'card-a2', title: '2つ目のタスク' },
              ],
            },
            { id: 'col-b', label: '進行中', cards: [{ id: 'card-b1', title: '進行中のタスク' }] },
          ],
        },
      ),
      diagramEl(
        'dpk-component-dependency-graph',
        { id: 'deps1', heading: 'モジュール依存関係' },
        {
          modules: [
            { id: 'mod-a', name: 'モジュールA' },
            { id: 'mod-b', name: 'モジュールB' },
          ],
          dependencies: [{ id: 'edge-ab', from: 'mod-a', to: 'mod-b' }],
        },
      ),
    ].join(''),
  ),
  comments: [
    ['page:plain', repeat('ページ全体の構成についての長いコメント。', 20)],
    ['element:board1/column/col-b', repeat('このカラムの運用ルールが曖昧なので整理したいという長文コメント。', 15)],
    ['element:board1/card/card-a1', repeat('このタスクの優先度は本当に高いのかという長い疑問。', 15)],
    ['element:board1/card/card-a1', 'Second, shorter follow-up comment on the same card.'],
    ['element:deps1/node/mod-a', repeat('このモジュールの責務が大きすぎるのではという長文コメント。', 18)],
    ['element:deps1/edge/edge-ab', repeat('この依存の方向は逆であるべきでは、という長い指摘。', 15)],
  ],
};

export default {
  'component-er-diagram-long-and-diffed': erDiagramLongAndDiffed,
  'component-sequence-diagram-huge-and-nested-fragments': sequenceDiagramHugeAndNestedFragments,
  'component-state-diagram-dense-transitions': stateDiagramDenseTransitions,
  'component-mind-map-deep-and-wide': mindMapDeepAndWide,
  'component-kanban-many-cards-long-titles': kanbanManyCardsLongTitles,
  'component-architecture-map-long-and-dense': architectureMapLongAndDense,
  'component-dependency-graph-circular-and-dense': dependencyGraphCircularAndDense,
  'component-formal-spec-rich-claims': formalSpecRichClaims,
  'component-inline-edit-standalone-long-value': inlineEditStandaloneLongValue,
  'component-mixed-diagrams-one-page': mixedDiagramsOnePage,
  'component-empty-and-minimal-diagrams': emptyAndMinimalDiagrams,
  'component-comments-rail-open-diagrams': commentsRailOpenDiagrams,
};
