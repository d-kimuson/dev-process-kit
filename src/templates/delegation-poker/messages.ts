import type { PlayMode } from './mode';
import type { DecisionStatus, DelegationLevel } from './model';

import { defineMessages } from '../../core/i18n';

const LEVEL_NAME_EN: Record<DelegationLevel, string> = {
  1: 'Tell',
  2: 'Sell',
  3: 'Consult',
  4: 'Agree',
  5: 'Advise',
  6: 'Inquire',
  7: 'Delegate',
};

const LEVEL_NAME_JA: Record<DelegationLevel, string> = {
  1: '命令する',
  2: '説得する',
  3: '相談する',
  4: '合意する',
  5: '助言する',
  6: '尋ねる',
  7: '委任する',
};

/** `d` hands authority to `t`; the phrase says who decides at that level. */
const LEVEL_PHRASE_EN: Record<DelegationLevel, (d: string, t: string) => string> = {
  1: (d, t) => `${d} decide and tell ${t}`,
  2: (d, t) => `${d} decide and convince ${t}`,
  3: (d, t) => `${d} decide after hearing ${t}`,
  4: (d, t) => `${d} and ${t} decide together`,
  5: (d, t) => `${t} decides after ${d} advise`,
  6: (d, t) => `${t} decides, then ${d} ask why`,
  7: (d, t) => `${t} decides; ${d} need not know`,
};

const LEVEL_PHRASE_JA: Record<DelegationLevel, (d: string, t: string) => string> = {
  1: (d, t) => `${d}が決めて、${t}に伝える`,
  2: (d, t) => `${d}が決めて、${t}に納得してもらう`,
  3: (d, t) => `${d}が${t}の意見を聞いてから決める`,
  4: (d, t) => `${d}と${t}が一緒に決める`,
  5: (d, t) => `${d}が助言し、${t}が決める`,
  6: (d, t) => `${t}が決め、あとで${d}が理由を尋ねる`,
  7: (d, t) => `${t}が決める。${d}は知らなくてよい`,
};

const STATUS_EN: Record<DecisionStatus, string> = {
  'to-play': 'Your card',
  discuss: 'Discuss',
  consensus: 'Same card',
  agreed: 'Agreed',
};

const STATUS_JA: Record<DecisionStatus, string> = {
  'to-play': 'カード待ち',
  discuss: '要議論',
  consensus: '一致',
  agreed: '合意済み',
};

export const delegationPokerMessages = defineMessages({
  en: {
    levelName: (level: DelegationLevel) => LEVEL_NAME_EN[level],
    levelPhrase: (level: DelegationLevel, delegator: string, delegate: string) =>
      LEVEL_PHRASE_EN[level](delegator, delegate),
    levelLabel: (level: DelegationLevel) => `${level} ${LEVEL_NAME_EN[level]}`,
    statusLabel: (status: DecisionStatus) => STATUS_EN[status],
    defaultDelegator: 'Leaders',
    defaultDelegate: 'Team',
    you: 'You',

    // ------------------------------------------------------------ header
    progress: (played: number, agreed: number, total: number) =>
      `Played ${played}/${total} · Agreed ${agreed}/${total}`,
    partiesLabel: 'Who delegates to whom',

    // ------------------------------------------------------------- board
    board: 'Delegation board',
    boardHint: (mode: PlayMode): string =>
      mode === 'strict'
        ? 'Click a cell to play your card for that decision area. The other cards on a row stay face down until you play on it, and your card cannot be changed afterwards.'
        : 'Click a cell to play your card for that decision area. The other cards on a row stay face down until you play on it; you can still change your card afterwards.',
    modeLabel: (mode: PlayMode): string => (mode === 'strict' ? 'One card only' : 'Card can be changed'),
    modeTitle: (mode: PlayMode): string =>
      mode === 'strict'
        ? 'Strict mode: a card, once played, is final'
        : 'Lax mode: you may change your card after seeing the others',
    locked: 'Final',
    confirmTitle: 'Your card is final',
    confirmBody: (level: string, decision: string) =>
      `You are playing ${level} on “${decision}”. On this board a card cannot be changed once played, even after you see the others.`,
    confirmSkip: 'Don’t ask again',
    confirmPlay: 'Play this card',
    confirmCancel: 'Cancel',
    decisionColumn: 'Decision area',
    agreeColumn: 'Agreed',
    notAgreed: 'Not yet',
    agreeLabel: (decision: string) => `Agreed level for “${decision}”`,
    playAt: (level: string, decision: string) => `Play ${level} on “${decision}”`,
    hiddenCards: (count: number) => `${count} face down`,
    addDecision: '+ Decision area',
    newDecision: 'New decision area',
    noDecisionsTitle: 'No decision areas yet',
    noDecisionsBody:
      'List the key decisions whose ownership is unclear. For each one, everyone plays one of seven cards, from 1 (the delegator decides alone) to 7 (fully delegated), and then settles on one level.',
    firstDecision: '+ First decision area',
    commentCount: (count: number) => `${count} comments`,

    decisionNameLabel: 'Decision area name',
    commentButton: 'Comment',
    deleteButton: 'Delete',

    // ---------------------------------------------------- action titles
    cardPlayedTitle: 'Played a card',
    levelAgreedTitle: 'Agreed on a level',
    decisionAddedTitle: 'Added a decision area',
    decisionRenamedTitle: 'Renamed the decision area',
    decisionDeletedTitle: 'Deleted the decision area',

    // -------------------------------------------------- action summaries
    arrowTo: (after: string) => `→ ${after}`,
    arrowFrom: (before: string, after: string) => `${before} → ${after}`,
    quotedArrowTo: (after: string) => `→ “${after}”`,
    quotedArrowFrom: (before: string, after: string) => `“${before}” → “${after}”`,
    added: (name: string) => `+ “${name}”`,
    deleted: (name: string) => `− “${name}”`,

    // -------------------------------------------------------- comment targets
    decisionKind: 'Decision area',
    boardKind: 'Board',
    wholeBoard: 'Whole board',
  },
  ja: {
    levelName: (level: DelegationLevel) => LEVEL_NAME_JA[level],
    levelPhrase: (level: DelegationLevel, delegator: string, delegate: string) =>
      LEVEL_PHRASE_JA[level](delegator, delegate),
    levelLabel: (level: DelegationLevel) => `${level} ${LEVEL_NAME_JA[level]}`,
    statusLabel: (status: DecisionStatus) => STATUS_JA[status],
    defaultDelegator: 'リーダー',
    defaultDelegate: 'チーム',
    you: 'あなた',

    progress: (played: number, agreed: number, total: number) => `提出 ${played}/${total} · 合意 ${agreed}/${total}`,
    partiesLabel: '誰が誰に任せるか',

    board: 'デリゲーションボード',
    boardHint: (mode: PlayMode): string =>
      mode === 'strict'
        ? 'セルをクリックすると、その判断領域にあなたのカードを出します。カードを出すまでその行の他のカードは伏せたままです。出したカードはあとから変更できません。'
        : 'セルをクリックすると、その判断領域にあなたのカードを出します。カードを出すまでその行の他のカードは伏せたままです。出したあとも変更できます。',
    modeLabel: (mode: PlayMode): string => (mode === 'strict' ? '出し直し不可' : '出し直し可'),
    modeTitle: (mode: PlayMode): string =>
      mode === 'strict'
        ? 'strict モード: 一度出したカードは変更できません'
        : 'lax モード: 他の人のカードを見たあとでもカードを変更できます',
    locked: '確定',
    confirmTitle: 'カードを出すと変更できません',
    confirmBody: (level: string, decision: string) =>
      `「${decision}」に「${level}」のカードを出します。このボードでは、一度出したカードは他の人のカードを見たあとでも変更できません。`,
    confirmSkip: '次回から確認しない',
    confirmPlay: 'このカードを出す',
    confirmCancel: 'キャンセル',
    decisionColumn: '判断領域',
    agreeColumn: '合意',
    notAgreed: '未合意',
    agreeLabel: (decision: string) => `「${decision}」の合意レベル`,
    playAt: (level: string, decision: string) => `「${decision}」に ${level} を出す`,
    hiddenCards: (count: number) => `伏せ札 ${count} 枚`,
    addDecision: '+ 判断領域',
    newDecision: '新しい判断領域',
    noDecisionsTitle: '判断領域がまだありません',
    noDecisionsBody:
      '誰が決めるのかが曖昧な判断を並べます。判断ごとに全員が 1（任せる側だけで決める）〜 7（完全に任せる）のカードを 1 枚出し、話し合って 1 つのレベルに合意します。',
    firstDecision: '+ 最初の判断領域',
    commentCount: (count: number) => `コメント ${count} 件`,

    decisionNameLabel: '判断領域の名前',
    commentButton: 'コメント',
    deleteButton: '削除',

    cardPlayedTitle: 'カードを出した',
    levelAgreedTitle: 'レベルに合意',
    decisionAddedTitle: '判断領域を追加',
    decisionRenamedTitle: '判断領域の名前を変更',
    decisionDeletedTitle: '判断領域を削除',

    arrowTo: (after: string) => `→ ${after}`,
    arrowFrom: (before: string, after: string) => `${before} → ${after}`,
    quotedArrowTo: (after: string) => `→ 「${after}」`,
    quotedArrowFrom: (before: string, after: string) => `「${before}」→「${after}」`,
    added: (name: string) => `+ 「${name}」`,
    deleted: (name: string) => `− 「${name}」`,

    decisionKind: '判断領域',
    boardKind: 'ボード',
    wholeBoard: 'ボード全体',
  },
});

export type DelegationPokerMessages = ReturnType<typeof delegationPokerMessages>;
