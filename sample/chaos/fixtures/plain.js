/**
 * Chaos fixtures for `dpk-template-plain`.
 *
 * `plain` has no action vocabulary and no navigation (see docs/templates/plain.md):
 * everything a reader produces is a comment, targeting `page:plain`, `section:<id>`
 * or `element:<diagram-id>/...`. These fixtures stress the one thing the template
 * owns outside the author's `slot="main"` content: the header/chrome text, and the
 * review rail with a large, adversarial comment set.
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

const repeat = (s, n) => s.repeat(n);

/** 240 unbroken ASCII chars: no spaces/hyphens for the renderer to wrap on. */
const LONG_ASCII_UNBROKEN = repeat('Pneumonoultramicroscopicsilicovolcanoconiosis', 5);

/** ~280 unbroken Japanese chars (Japanese prose never has spaces to break on). */
const LONG_JA_UNBROKEN = repeat(
  '在庫予約つき注文フローのキャンセルと返金と引当解除の整合性を厳密に守るための設計レビューに関する決定事項の背景説明',
  5,
);

/** Emoji (incl. ZWJ family sequences), RTL Arabic/Hebrew, and combining-mark "zalgo" text mixed together. */
const MIXED_CHAOS_TEXT = `🚀✨ ${'👨‍👩‍👧‍👦 '.repeat(4)}مرحبا بكم في عملية الدفع السريع שלום עולם ${'ź̂̃̄̅'.repeat(8)} 繁体中文測試𝕿𝖊𝖝𝖙`;

const longUrl = (n) =>
  `https://issues.example.com/projects/kumoma-web/issues/9999?${repeat('filter=state%3Aopen&label=needs-triage&', n)}anchor=bottom`;

// ------------------------------------------------------------------ fixtures

/** @type {Fixture} */
const longTitleAndHeader = {
  description:
    'Extremely long, unbroken title (ASCII + Japanese + RTL/emoji mix) that must not blow up the header chrome.',
  lang: 'ja',
  base: {
    title: `${LONG_JA_UNBROKEN} ${LONG_ASCII_UNBROKEN} ${MIXED_CHAOS_TEXT}`,
    sections: [
      { id: 'background', title: LONG_ASCII_UNBROKEN },
      { id: 'decision', title: MIXED_CHAOS_TEXT },
    ],
  },
  slots: `
    <div slot="main">
      <section>
        <h2>背景</h2>
        <button type="button" data-dpk-comment="section:background">このセクションにコメント</button>
        <p>短い本文。見出しとタイトルの極端な長さだけを確認するための最小限のセクション。</p>
      </section>
      <section>
        <h2>決めたこと</h2>
        <button type="button" data-dpk-comment="section:decision">このセクションにコメント</button>
        <p>${MIXED_CHAOS_TEXT}</p>
      </section>
    </div>
  `,
};

/** @type {Fixture} */
const hugeMainContent = {
  description:
    'Huge main area: a long unwrapped table, a fenced code block with a very long line, and several very long URLs.',
  lang: 'en',
  base: {
    title: 'Design notes — huge main content',
    sections: [
      { id: 'comparison', title: 'Comparison table' },
      { id: 'code', title: 'Reference implementation' },
      { id: 'links', title: 'Related issues' },
    ],
  },
  slots: `
    <div slot="main">
      <section>
        <h2>Comparison table</h2>
        <button type="button" data-dpk-comment="section:comparison">Comment on this section</button>
        <table border="1" cellpadding="4">
          <thead>
            <tr><th>Option</th><th>Latency</th><th>Cost</th><th>Notes</th></tr>
          </thead>
          <tbody>
            ${Array.from(
              { length: 40 },
              (_, i) =>
                `<tr><td>Option ${i}</td><td>${(i * 7) % 500}ms</td><td>$${i * 3}.00</td><td>${repeat(
                  `A long, unbroken rationale cell for option ${i} that keeps going without any natural wrap point `,
                  2,
                )}</td></tr>`,
            ).join('\n')}
          </tbody>
        </table>
      </section>
      <section>
        <h2>Reference implementation</h2>
        <button type="button" data-dpk-comment="section:code">Comment on this section</button>
        <pre><code>// One line, deliberately very long, to check horizontal scroll / wrap behavior.
const checkoutFlow = (cart, inventory, pricing, coupons, shipping, taxRules, user, featureFlags) => cart.items.filter((item) => inventory.isInStock(item) && !featureFlags.isDisabled(item.sku)).reduce((total, item) => total + pricing.priceFor(item, user, coupons) + shipping.costFor(item, user) + taxRules.taxFor(item, user), 0);
</code></pre>
        <pre><code>${Array.from({ length: 60 }, (_, i) => `line ${i}: ${repeat('x', 20)}`).join('\n')}</code></pre>
      </section>
      <section>
        <h2>Related issues</h2>
        <button type="button" data-dpk-comment="section:links">Comment on this section</button>
        <ul>
          ${Array.from({ length: 10 }, (_, i) => `<li><a href="${longUrl(i + 1)}">${longUrl(i + 1)}</a></li>`).join('\n')}
        </ul>
      </section>
    </div>
  `,
};

/** @type {Fixture} */
const emptyMinimal = {
  description: 'The smallest possible document: `{}` — no title, no sections, no main content at all.',
  lang: 'en',
  base: {},
  slots: '<div slot="main"></div>',
};

/** @type {Fixture} */
const manyLongComments = {
  description:
    '26 comments across the page and two sections, with very long bodies and emoji/RTL/CJK mixes, rail pinned open via `notes=on`.',
  lang: 'ja',
  attributes: { notes: 'on' },
  base: {
    title: 'レビュー観点がたくさんあるメモ',
    sections: [
      { id: 'background', title: '背景' },
      { id: 'decision', title: '決めたこと' },
    ],
  },
  slots: `
    <div slot="main">
      <section>
        <h2>背景</h2>
        <button type="button" data-dpk-comment="section:background">このセクションにコメント</button>
        <p>背景の説明。</p>
      </section>
      <section>
        <h2>決めたこと</h2>
        <button type="button" data-dpk-comment="section:decision">このセクションにコメント</button>
        <p>決定事項の説明。</p>
      </section>
    </div>
  `,
  comments: [
    ['page:plain', repeat('ページ全体についての長いコメント。', 20)],
    ['page:plain', 'Second, short follow-up comment on the whole page.'],
    ...Array.from({ length: 10 }, (_, i) => [
      'section:background',
      i % 3 === 0
        ? MIXED_CHAOS_TEXT
        : repeat(`背景セクションに対する指摘その${i}。なぜこの前提が正しいのかを長々と問い詰める文章。`, 4),
    ]),
    ...Array.from({ length: 10 }, (_, i) => [
      'section:decision',
      i % 4 === 0
        ? `${MIXED_CHAOS_TEXT} ${LONG_ASCII_UNBROKEN}`
        : repeat(`決定事項に対する懸念その${i}。代替案を検討したかを長々と確認する文章。`, 4),
    ]),
    ['section:decision', repeat('🙏', 80)],
    ['section:background', repeat('a', 400)],
    // Stale: a comment on a section id that does not exist in base data.
    ['section:ghost-section', 'A comment on a section that was deleted — should render as stale.'],
  ],
};

export default {
  'long-title-and-header': longTitleAndHeader,
  'huge-main-content': hugeMainContent,
  'empty-minimal': emptyMinimal,
  'many-long-comments': manyLongComments,
};
