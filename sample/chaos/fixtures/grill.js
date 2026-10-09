/**
 * Chaos fixtures for `dpk-template-grill`.
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

/** Unbroken ASCII "word soup" with no spaces, long enough to force overflow/truncation. */
const longAscii = (n) => {
  const unit = 'supercalifragilisticexpialidocious-';
  let out = '';
  while (out.length < n) out += unit;
  return out.slice(0, n);
};

/** Unbroken Japanese sentence (no spaces, no punctuation breaks) repeated to length `n`. */
const longJa = (n) => {
  const unit = '在庫予約つき注文フローのキャンセルと返金と引当解除の整合性を厳密に守るための設計レビュー';
  let out = '';
  while (out.length < n) out += unit;
  return out.slice(0, n);
};

const longUrl = () => `https://example.com/review/grill?trace=${longAscii(160)}&session=${'a1b2c3d4-'.repeat(12)}`;

/** RTL Arabic + ZWJ emoji family sequences + combining marks, mixed with Latin. */
const rtlEmojiMix = () =>
  'مرحبا بكم في مراجعة التصميم هذه، وهي تحتوي على نص طويل من اليمين إلى اليسار 👨‍👩‍👧‍👦👨🏽‍🚀🏳️‍🌈 é̂̃ combining-marks ✅';

/** @type {Record<string, Fixture>} */
export default {
  'extreme-text': {
    description:
      'Every text field stuffed: 200+ char unbroken ASCII, unbroken long Japanese, a long URL, and an RTL/emoji/combining-mark option label.',
    lang: 'ja',
    base: {
      title: `新機能レビュー: ${longJa(80)}`,
      questions: [
        {
          id: 'q-ascii-unbroken',
          ref: 'Q1',
          title: longAscii(220),
          description: `${longJa(240)} ${longUrl()}`,
          note: longAscii(180),
          options: [
            { id: 'opt-a', label: longAscii(300) },
            { id: 'opt-b', label: '普通の選択肢（短い）' },
          ],
        },
        {
          id: 'q-rtl-emoji',
          ref: 'Q2',
          title: 'オプションに RTL とエモジを混ぜる場合はどうする？',
          description: rtlEmojiMix(),
          options: [
            { id: 'opt-rtl', label: rtlEmojiMix() },
            { id: 'opt-plain', label: 'plain ascii option' },
            { id: 'opt-url', label: longUrl() },
          ],
        },
        {
          id: 'q-long-ja-no-break',
          ref: 'Q3',
          title: longJa(200),
          description: longJa(400),
          note: '一行の長さがどこまでも伸びると、折り返しとボタンの位置がどうなるかを確認する。',
          options: [],
          freeText: true,
        },
      ],
    },
    slots: `
      <div slot="main">
        <section style="max-width: 860px;">
          <h2 data-grill-questions="Q1 Q2 Q3">${longAscii(260)}</h2>
          <p data-grill-questions="Q1">${longJa(300)}</p>
          <p data-dpk-navigate="question=q-rtl-emoji">${rtlEmojiMix()}</p>
        </section>
      </div>
    `,
  },

  'many-questions-wide-options': {
    description:
      '70 questions (volume) plus one question with 40 options to push option lettering past z into aa/ab/...',
    lang: 'en',
    base: {
      title: 'Volume review: 70 questions',
      questions: [
        {
          id: 'wide-options',
          ref: 'Q1',
          title: 'Which of these 40 near-identical options is correct?',
          description: 'Stresses the option-letter sequence (a..z, aa, ab, ...) and the choice list height.',
          options: Array.from({ length: 40 }, (_, i) => ({
            id: `wide-opt-${i + 1}`,
            label: `Candidate option number ${i + 1} — nearly identical wording to its neighbors on purpose`,
          })),
        },
        ...Array.from({ length: 69 }, (_, i) => ({
          id: `bulk-${i + 1}`,
          ref: `Q${i + 2}`,
          title: `Bulk question ${i + 1}: should the deadline for this edge case be configurable?`,
          description: i % 5 === 0 ? `Longer context paragraph for question ${i + 1}. `.repeat(6) : undefined,
          options: [
            { id: `bulk-${i + 1}-a`, label: 'Yes, make it configurable per tenant' },
            { id: `bulk-${i + 1}-b`, label: 'No, hard-code a single global value' },
            ...(i % 3 === 0 ? [{ id: `bulk-${i + 1}-c`, label: 'Defer the decision to a follow-up round' }] : []),
          ],
        })),
      ],
    },
    slots: `
      <div slot="main">
        <p data-grill-questions="${Array.from({ length: 10 }, (_, i) => `Q${i + 2}`).join(' ')}">
          Ten stacked badges on one short paragraph, to see how the badge cluster lays itself out.
        </p>
      </div>
    `,
  },

  empty: {
    description:
      'Minimal/empty base: no title, an explicitly empty question list, no history — the zero state of every region.',
    lang: 'en',
    base: { questions: [] },
    slots: `<div slot="main"><p>No questions yet.</p></div>`,
  },

  'single-question-edge-cases': {
    description:
      'Single-item variants: one question with no options and free text, and one with no options AND freeText disabled (unanswerable by design).',
    lang: 'ja',
    base: {
      title: '最小構成の確認',
      questions: [
        {
          id: 'free-only',
          ref: 'Q1',
          title: '自由記述のみの質問',
          options: [],
          freeText: true,
        },
        {
          id: 'unanswerable',
          ref: 'Q2',
          title: '選択肢も自由記述もない質問（回答不能）',
          description: 'options が空で freeText も false なので、この質問には回答する手段がない。',
          options: [],
          freeText: false,
        },
      ],
    },
    slots: `<div slot="main"><p data-grill-questions="Q1 Q2">単一の main 領域。</p></div>`,
  },

  'history-many-rounds': {
    description:
      '12 earlier rounds with recorded answers (and one absurdly long round label) to stress the round-select dropdown and read-only past-round rendering.',
    lang: 'ja',
    base: {
      title: '複数ラウンドの履歴',
      questions: [
        {
          id: 'current-1',
          ref: 'Q1',
          title: '現在のラウンドの質問',
          options: [
            { id: 'yes', label: 'はい' },
            { id: 'no', label: 'いいえ' },
          ],
        },
      ],
      history: Array.from({ length: 12 }, (_, round) => ({
        label: round === 0 ? longJa(120) : `v${round + 1}`,
        questions: Array.from({ length: 6 }, (_, q) => ({
          id: `r${round + 1}-q${q + 1}`,
          ref: `Q${q + 1}`,
          title: `ラウンド${round + 1}の質問${q + 1}: 在庫の解放タイミングはいつにするか`,
          options: [
            { id: 'a', label: '即時に解放する' },
            { id: 'b', label: '返金完了を待って解放する' },
          ],
          answer:
            q % 2 === 0
              ? { kind: 'option', optionId: q % 4 === 0 ? 'a' : 'b' }
              : { kind: 'free', text: `自由記述の回答（ラウンド${round + 1}・質問${q + 1}）。` + longJa(60) },
        })),
      })),
    },
    slots: `<div slot="main"><p data-grill-questions="Q1">現在の質問だけが main 上のバッジ対象。</p></div>`,
  },

  'drafts-many-types': {
    description:
      'A batch of valid ANSWER_QUESTION drafts covering option / free (very long text) / clear, all against existing targets (dispatchBatch is all-or-nothing, so no stale entries are mixed in here).',
    lang: 'en',
    base: {
      title: 'Answering a full round',
      questions: Array.from({ length: 8 }, (_, i) => ({
        id: `draft-q-${i + 1}`,
        ref: `Q${i + 1}`,
        title: `Draft question ${i + 1}`,
        options: [
          { id: `draft-q-${i + 1}-a`, label: 'Option A' },
          { id: `draft-q-${i + 1}-b`, label: 'Option B' },
        ],
      })),
    },
    draft: [
      { type: 'ANSWER_QUESTION', target: 'question:draft-q-1', payload: { kind: 'option', optionId: 'draft-q-1-a' } },
      { type: 'ANSWER_QUESTION', target: 'question:draft-q-2', payload: { kind: 'option', optionId: 'draft-q-2-b' } },
      {
        type: 'ANSWER_QUESTION',
        target: 'question:draft-q-3',
        payload: { kind: 'free', text: `${longAscii(80)} ${longJa(200)}` },
        note: 'left as free text on purpose',
      },
      { type: 'ANSWER_QUESTION', target: 'question:draft-q-4', payload: { kind: 'option', optionId: 'draft-q-4-a' } },
      { type: 'ANSWER_QUESTION', target: 'question:draft-q-4', payload: { kind: 'clear' } },
      { type: 'ANSWER_QUESTION', target: 'question:draft-q-5', payload: { kind: 'free', text: '' } },
    ],
  },

  'stale-drafts-and-comments': {
    description:
      'Probe of stale handling: a dispatchBatch of ONLY invalid-target/invalid-option actions (target-missing + constraint-violated), plus many long stale comments on a removed question via el.api.comment (notes left open).',
    lang: 'ja',
    attributes: { notes: 'on' },
    base: {
      title: '一部の質問が削除されたあとのレビュー',
      questions: [{ id: 'still-here', ref: 'Q1', title: '残っている質問', options: [{ id: 'ok', label: 'OK' }] }],
    },
    draft: [
      { type: 'ANSWER_QUESTION', target: 'question:ghost-question-1', payload: { kind: 'option', optionId: 'x' } },
      {
        type: 'ANSWER_QUESTION',
        target: 'question:still-here',
        payload: { kind: 'option', optionId: 'not-an-option' },
      },
      {
        type: 'ANSWER_QUESTION',
        target: 'question:ghost-question-2',
        payload: { kind: 'free', text: 'orphaned answer' },
      },
    ],
    comments: [
      ['question:removed-in-this-round', `${longJa(220)}`],
      ['question:removed-in-this-round', '2本目のコメント。' + longAscii(150)],
      ['question:still-here', longJa(300)],
      ['page:grill', '| a | b |\n| - | - |\n| 1 | 2 |\n```\ncode line '.repeat(10) + '\n```'],
    ],
  },

  'many-long-comments': {
    description:
      '35 long review comments spread across several questions plus the whole page, including markdown-looking text (tables, code fences, nested lists) rendered as plain text, with notes open.',
    lang: 'en',
    attributes: { notes: 'on' },
    base: {
      title: 'Heavily annotated review',
      questions: Array.from({ length: 5 }, (_, i) => ({
        id: `commented-${i + 1}`,
        ref: `Q${i + 1}`,
        title: `Question ${i + 1} with many comments`,
        options: [
          { id: 'a', label: 'Option A' },
          { id: 'b', label: 'Option B' },
        ],
      })),
    },
    comments: [
      ...Array.from({ length: 30 }, (_, i) => [
        `question:commented-${(i % 5) + 1}`,
        i % 3 === 0
          ? `Comment ${i + 1}: \`inline code\` and a | table | row | that | is | quite | wide | indeed | and | keeps | going |`
          : `Comment ${i + 1}: ${longAscii(140)}`,
      ]),
      [
        'page:grill',
        '# Heading\n- item one\n  - nested item\n- item two\n\n```js\nconst x = 1; // a very long trailing comment that keeps going and going and going\n```',
      ],
      ['page:grill', longJa(260)],
      ['page:grill', rtlEmojiMix()],
      ['page:grill', 'comment with a [markdown link](https://example.com/' + longAscii(120) + ')'],
    ],
  },

  'wip-past-round-open': {
    description:
      'Navigates to a specific question via hash, then (prepare) switches the sidebar to an earlier history round through the round select, to capture the read-only past-round UI mid-interaction.',
    lang: 'ja',
    hash: 'question=current-2',
    base: {
      title: '作業中の状態を再現する',
      questions: [
        { id: 'current-1', ref: 'Q1', title: '最初の質問', options: [{ id: 'a', label: 'A' }] },
        {
          id: 'current-2',
          ref: 'Q2',
          title: '深い位置にある質問（スクロール確認用）',
          options: [
            { id: 'a', label: 'A' },
            { id: 'b', label: 'B' },
          ],
        },
      ],
      history: [
        {
          label: 'v1',
          questions: [
            {
              id: 'past-1',
              ref: 'Q1',
              title: '過去の質問1',
              options: [{ id: 'a', label: 'A' }],
              answer: { kind: 'option', optionId: 'a' },
            },
            {
              id: 'past-2',
              ref: 'Q2',
              title: '過去の質問2',
              options: [],
              freeText: true,
              answer: { kind: 'free', text: '過去の自由記述回答' },
            },
          ],
        },
      ],
    },
    prepare: (el) => {
      try {
        const root = el.shadowRoot;
        const select = root?.querySelector('select.grill-round');
        if (select) {
          select.value = '0';
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      } catch {
        // best-effort UI setup only
      }
    },
  },
};
