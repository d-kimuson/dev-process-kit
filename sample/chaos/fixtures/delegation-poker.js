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
const LONG_ASCII_UNBROKEN = repeat('Antidisestablishmentarianismoverengineeredmicroservice', 4); // 220 chars

/** 200+ chars of Japanese prose with no spaces (Japanese text never has them). */
const LONG_JA_NO_SPACES = repeat(
  'このディシジョンエリアについて権限をどこまで渡すかをチーム内で合意するまでの経緯と背景とリスクを説明する非常に長い一文',
  3,
);

/** Emoji (incl. ZWJ family sequence), RTL Arabic/Hebrew, and combining-mark "zalgo" text mixed together. */
const MIXED_CHAOS_TEXT = `🎲♟️ ${'🧑‍🤝‍🧑 '.repeat(4)}القرار يحتاج إلى توافق الفريق שלום עולם ${'z̵̧̛'.repeat(8)} 繁體中文測試`;

const player = (id, name) => ({ id, name });
const card = (playerId, level, reason) => ({ player: playerId, level, ...(reason === undefined ? {} : { reason }) });
const decision = (id, name, cards, extra = {}) => ({ id, name, cards, ...extra });

// ------------------------------------------------------------------ fixtures

/** @type {Fixture} */
const longTextEverywhere = {
  description:
    'Title/parties/player names/decision names+descriptions/card reasons pushed to extreme lengths and mixed scripts (JA/AR/HE/emoji).',
  lang: 'ja',
  base: {
    title: `${MIXED_CHAOS_TEXT} ${LONG_ASCII_UNBROKEN}`,
    parties: { delegator: LONG_JA_NO_SPACES, delegate: MIXED_CHAOS_TEXT },
    players: [
      player('manager', LONG_ASCII_UNBROKEN),
      player('team-lead', LONG_JA_NO_SPACES),
      player('member-1', MIXED_CHAOS_TEXT),
    ],
    decisions: [
      decision(
        'release-cadence',
        LONG_JA_NO_SPACES,
        [
          card('manager', 3, LONG_ASCII_UNBROKEN),
          card('team-lead', 5, MIXED_CHAOS_TEXT),
          card('member-1', 5, LONG_JA_NO_SPACES),
        ],
        { description: `${MIXED_CHAOS_TEXT} ${LONG_JA_NO_SPACES}` },
      ),
      decision(
        'budget',
        MIXED_CHAOS_TEXT,
        [card('manager', 1, 'مرحبا بكم في هذا السبب الطويل جدا بدون فراغات كافية')],
        {
          description: LONG_ASCII_UNBROKEN,
        },
      ),
    ],
  },
};

/** @type {Fixture} */
const hugeGame = {
  description:
    '24 players x 18 decisions, including one decision where every player landed on the same level (jumbo chip cell).',
  lang: 'en',
  base: {
    title: 'Org-wide delegation sweep',
    parties: { delegator: 'VP Engineering', delegate: 'Platform Guild' },
    players: Array.from({ length: 24 }, (_, i) =>
      player(`p${i}`, `Player ${i} — ${['Eng', 'Design', 'PM', 'QA'][i % 4]}`),
    ),
    decisions: [
      ...Array.from({ length: 17 }, (_, i) =>
        decision(
          `decision-${i}`,
          `Decision ${i}: ${['Tooling', 'Deploy process', 'Hiring', 'Roadmap', 'On-call'][i % 5]}`,
          Array.from({ length: 24 }, (_, j) =>
            card(`p${j}`, ((i + j) % 7) + 1, j % 5 === 0 ? `Reason from player ${j} on decision ${i}` : undefined),
          ),
          i % 3 === 0 ? { agreed: (i % 7) + 1 } : {},
        ),
      ),
      decision(
        'jumbo-cell',
        'Everyone agreed instantly — stress a single crowded cell',
        Array.from({ length: 24 }, (_, j) =>
          card(`p${j}`, 4, j % 2 === 0 ? `Player ${j} explains why level 4 is right here` : undefined),
        ),
        { agreed: 4 },
      ),
    ],
  },
};

/** @type {Fixture} */
const emptyMinimal = {
  description: 'Fully empty base: no title, no parties, no players, no decisions (the "no decisions yet" empty state).',
  lang: 'en',
  base: {},
};

/** @type {Fixture} */
const singleDecisionOnePlayer = {
  description: 'One player, one decision with a single played card, plus a second decision with zero cards (to-play).',
  lang: 'ja',
  base: {
    title: '最小構成',
    players: [player('solo', 'ひとりだけのプレイヤー')],
    decisions: [
      decision('d1', '最初の判断', [card('solo', 6)], { description: '単一カードのみのケース' }),
      decision('d2', 'まだ誰も出していない判断', []),
    ],
  },
};

/** @type {Fixture} */
const manyDraftsStale = {
  description:
    'Base plus 20+ draft actions across every action type (play/agree/add/rename/delete), including several stale ones targeting decisions that do not exist.',
  lang: 'en',
  base: {
    title: 'Drafted session',
    players: [player('alice', 'Alice'), player('bob', 'Bob'), player('carol', 'Carol')],
    decisions: [
      decision('keep-1', 'Keep and edit this one', [card('alice', 2), card('bob', 3)]),
      decision('keep-2', 'Will be agreed', [card('alice', 5), card('bob', 5), card('carol', 5)]),
      decision('to-delete', 'About to be deleted', [card('alice', 1)]),
    ],
  },
  draft: [
    { type: 'PLAY_CARD', target: 'keep-1', payload: { level: 4 } },
    { type: 'PLAY_CARD', target: 'keep-1', payload: { level: 6 } },
    { type: 'AGREE_LEVEL', target: 'keep-2', payload: { level: 5 } },
    { type: 'SET_DECISION_NAME', target: 'keep-1', payload: { name: 'Keep and edit this one (renamed)' } },
    {
      type: 'ADD_DECISION',
      target: 'delegation-poker',
      payload: { id: 'fresh-decision', name: 'Freshly added decision' },
    },
    {
      type: 'ADD_DECISION',
      target: 'delegation-poker',
      payload: { id: 'fresh-decision', name: 'Freshly added decision' },
    },
    { type: 'PLAY_CARD', target: 'fresh-decision', payload: { level: 1 } },
    { type: 'DELETE_DECISION', target: 'to-delete' },
    { type: 'AGREE_LEVEL', target: 'keep-1', payload: { level: 7 } },
    { type: 'SET_DECISION_NAME', target: 'keep-2', payload: { name: 'Will be agreed (renamed twice)' } },
    { type: 'SET_DECISION_NAME', target: 'keep-2', payload: { name: 'Will be agreed (final rename)' } },
    { type: 'PLAY_CARD', target: 'keep-2', payload: { level: 3 } },
    // --- stale from here: targets that never existed in base ---
    { type: 'PLAY_CARD', target: 'ghost-decision', payload: { level: 2 } },
    { type: 'AGREE_LEVEL', target: 'ghost-decision', payload: { level: 2 } },
    { type: 'SET_DECISION_NAME', target: 'ghost-decision', payload: { name: 'Edits a decision that does not exist' } },
    { type: 'DELETE_DECISION', target: 'already-deleted-elsewhere' },
  ],
};

/** @type {Fixture} */
const commentsRailOpen = {
  description:
    'Many long comments across the page and several decisions, with the review rail pinned open via notes="on".',
  lang: 'ja',
  attributes: { notes: 'on' },
  base: {
    title: 'コメントが多いゲーム',
    parties: { delegator: 'マネージャー', delegate: 'チーム' },
    players: [player('m1', 'マネージャー'), player('t1', 'チームリード')],
    decisions: [
      decision('deploy-process', 'デプロイプロセスの権限', [card('m1', 3), card('t1', 5)]),
      decision('hiring', '採用の最終判断', [card('m1', 2)]),
    ],
  },
  comments: [
    ['page:delegation-poker', repeat('ゲーム全体の進め方についての長いコメント。', 20)],
    ['decision:deploy-process', repeat('このディシジョンのレベル差が大きいので議論したいという長文コメント。', 15)],
    ['decision:deploy-process', 'Second, shorter follow-up comment on the same decision.'],
    ['decision:hiring', repeat('採用プロセスにおける権限移譲の範囲についての長い懸念事項の説明。', 18)],
    [
      'decision:hiring',
      repeat(
        'Why has only one player played so far? '.repeat(1) +
          'A long follow-up in English mixed into a Japanese thread. ',
        8,
      ),
    ],
  ],
};

/** @type {Fixture} */
const longReasonTooltips = {
  description:
    'Every played card carries an extremely long "reason" string (the chip title/tooltip), stressing hover text and chip layout.',
  lang: 'en',
  base: {
    title: 'Reasons everywhere',
    players: [
      player('p1', 'Player One'),
      player('p2', 'Player Two'),
      player('p3', 'Player Three'),
      player('p4', 'Player Four'),
    ],
    decisions: [
      decision('row-1', 'A decision with four long-reasoned chips', [
        card('p1', 1, repeat('This reason keeps going far longer than any tooltip should reasonably be. ', 6)),
        card('p2', 7, repeat('An opposite extreme level with an equally long justification attached. ', 6)),
        card('p3', 4, LONG_ASCII_UNBROKEN),
        card('p4', 4, LONG_JA_NO_SPACES),
      ]),
    ],
  },
};

/** @type {Fixture} */
const wipStrictModeEditing = {
  description:
    'mode="strict" with a fully-played, agreed row and a locked row, plus the decision-name inline editor opened programmatically on the first row.',
  lang: 'en',
  attributes: { mode: 'strict' },
  base: {
    title: 'Strict mode in progress',
    players: [player('a', 'Alpha'), player('b', 'Beta'), player('c', 'Gamma')],
    decisions: [
      decision('settled', 'Everyone played and the group agreed', [card('a', 5), card('b', 5), card('c', 4)], {
        agreed: 5,
      }),
      decision('midway', 'Only some players have played so far', [card('a', 3)]),
    ],
  },
  prepare: (el) => {
    const nameEditor = el.shadowRoot?.querySelector('.row-name');
    if (nameEditor && typeof nameEditor.startEditing === 'function') nameEditor.startEditing();
  },
};

export default {
  'long-text-everywhere': longTextEverywhere,
  'huge-game': hugeGame,
  'empty-minimal': emptyMinimal,
  'single-decision-one-player': singleDecisionOnePlayer,
  'many-drafts-stale': manyDraftsStale,
  'comments-rail-open': commentsRailOpen,
  'long-reason-tooltips': longReasonTooltips,
  'wip-strict-mode-editing': wipStrictModeEditing,
};
