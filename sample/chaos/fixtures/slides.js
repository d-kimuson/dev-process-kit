/**
 * Chaos fixtures for `dpk-template-slides`.
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
  const unit = '更新の衝突を検出する仕組みを五分で説明するスライドのための長い説明文章です';
  let out = '';
  while (out.length < n) out += unit;
  return out.slice(0, n);
};

const longUrl = () =>
  `https://example.com/deck/optimistic-lock?trace=${longAscii(160)}&session=${'a1b2c3d4-'.repeat(12)}`;

const rtlEmojiMix = () => 'مرحبا بكم في هذا العرض التقديمي الذي يحتوي على نص طويل من اليمين إلى اليسار 👨‍👩‍👧‍👦👨🏽‍🚀🏳️‍🌈 é̂̃';

/** @type {Record<string, Fixture>} */
export default {
  'extreme-text': {
    description:
      'Deck and slide titles/subtitles/points stuffed with 200+ char unbroken ASCII, unbroken Japanese, an RTL/emoji point, and a long URL point.',
    lang: 'ja',
    base: {
      title: `五分で分かる: ${longJa(60)}`,
      slides: [
        { id: 'cover', layout: 'title', title: longAscii(200), subtitle: longJa(160) },
        {
          id: 'content-ascii',
          title: longAscii(180),
          subtitle: longUrl(),
          points: [longAscii(220), longJa(260), rtlEmojiMix(), longUrl()],
        },
        { id: 'section-ja', layout: 'section', title: longJa(140) },
      ],
    },
  },

  'many-slides-volume': {
    description:
      '65 slides mixing title/section/content layouts, with titles that grow in length, to stress the outline and the deck bar.',
    lang: 'en',
    base: {
      title: 'The 65-slide deck',
      slides: [
        { id: 'cover', layout: 'title', title: 'The 65-slide deck', subtitle: 'A volume stress test' },
        ...Array.from({ length: 63 }, (_, i) => {
          if (i % 12 === 11) {
            return { id: `section-${i + 1}`, layout: 'section', title: `Chapter ${Math.floor(i / 12) + 1}` };
          }
          return {
            id: `slide-${i + 1}`,
            title:
              `Slide ${i + 1}: ${'a growing title that keeps getting longer and longer '.repeat(1 + Math.floor(i / 10))}`.trim(),
            points: Array.from({ length: (i % 4) + 1 }, (_, p) => `Point ${p + 1} on slide ${i + 1}`),
          };
        }),
        { id: 'end', layout: 'section', title: 'The end' },
      ],
    },
  },

  'overflowing-content-slide': {
    description:
      'A single content slide with 40 long points (taller than the slide, which scrolls poorly on purpose) plus a slot="preview" body with a very long unbroken code line.',
    lang: 'en',
    base: {
      title: 'One slide, way too much on it',
      slides: [
        {
          id: 'overflow',
          title: 'Everything that could matter, all on one slide',
          points: Array.from(
            { length: 40 },
            (_, i) => `Point ${i + 1}: a reasonably long bullet that explains one small thing in detail`,
          ),
        },
      ],
    },
    slots: `
      <pre slot="preview" data-preview-id="overflow" style="margin:0;white-space:pre;overflow:auto;">${longAscii(400)}
const line = "${longAscii(320)}";
</pre>
    `,
  },

  'empty-deck': {
    description: 'Minimal base `{}` — zero slides, outline hidden, stage shows the empty-deck message.',
    lang: 'ja',
    base: {},
  },

  'single-slide': {
    description: 'Exactly one slide (title layout) — the deck bar at 1/1 with both prev/next disabled.',
    lang: 'ja',
    base: {
      title: '一枚だけのスライド',
      slides: [{ id: 'only', layout: 'title', title: 'これで全部です', subtitle: '次はありません' }],
    },
  },

  'many-long-comments': {
    description:
      '32 long comments spread across several slides plus the whole deck, including markdown-looking text (tables, code fences, nested lists) rendered as plain text, with notes open and the hash pointed at the most-commented slide.',
    lang: 'en',
    attributes: { notes: 'on' },
    hash: 'slide=heavy',
    base: {
      title: 'Heavily annotated deck',
      slides: [
        { id: 'cover', layout: 'title', title: 'Heavily annotated deck' },
        { id: 'heavy', title: 'This slide collects most of the notes' },
        { id: 'light', title: 'This one has only a couple' },
      ],
    },
    comments: [
      ...Array.from({ length: 28 }, (_, i) => [
        'slide:heavy',
        i % 3 === 0
          ? `Comment ${i + 1}: \`inline code\` and a | table | row | that | keeps | getting | wider | and | wider |`
          : `Comment ${i + 1}: ${longAscii(140)}`,
      ]),
      ['slide:light', longJa(220)],
      ['slide:light', rtlEmojiMix()],
      [
        'page:slides',
        '# Whole deck note\n- item one\n  - nested item\n- item two\n\n```js\nconst x = 1; // trailing comment '.repeat(
          4,
        ) + '\n```',
      ],
      ['page:slides', 'a [markdown link](https://example.com/' + longAscii(120) + ') inside a plain comment'],
    ],
  },

  'stale-comments': {
    description:
      'Comments on a slide id removed from the base data and on a diagram element that was never mounted — both should surface as stale instead of crashing, since el.api.comment does not check the target up front.',
    lang: 'ja',
    attributes: { notes: 'on' },
    base: {
      title: 'スライドが差し替えられた後のレビュー',
      slides: [{ id: 'kept', title: '残っているスライド' }],
    },
    comments: [
      ['slide:removed-slide-1', `${longJa(200)}`],
      ['slide:removed-slide-1', '2本目のコメント。' + longAscii(150)],
      ['element:never-mounted-diagram/node-1', 'コメントの対象の図が存在しない場合。'],
      ['slide:kept', '残っているスライドへの通常のコメント。'],
    ],
  },

  'wip-unsent-comment-and-fullscreen': {
    description:
      'Navigates to a middle slide, then (prepare) types a very long unsent comment into the per-slide form without submitting and clicks "Full screen" — both are work-in-progress UI states, not draft actions.',
    lang: 'en',
    hash: 'slide=middle',
    base: {
      title: 'Mid-interaction capture',
      slides: [
        { id: 'first', layout: 'title', title: 'First slide' },
        { id: 'middle', title: 'The slide the reader is looking at', points: ['One point', 'Another point'] },
        { id: 'last', title: 'Last slide' },
      ],
    },
    prepare: (el) => {
      try {
        const textarea = el.shadowRoot?.querySelector('.slide-comment-input');
        if (textarea) {
          textarea.value = `${longAscii(200)} ${longJa(200)}`;
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
        el.shadowRoot?.querySelector('.deck-fullscreen')?.click();
      } catch {
        // best-effort UI setup only
      }
    },
  },
};
