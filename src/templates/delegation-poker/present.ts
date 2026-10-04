import type {
  ActionDescription,
  ActionTarget,
  ActionTone,
  CommentTargetOption,
  DraftAction,
  Navigation,
} from '../../core/types';
import type { DelegationPokerMessages } from './messages';

import { payloadFor, type ActionName } from '../../core/schema';
import { targetRef } from '../../core/target';
import { DELEGATION_POKER_PAGE, delegationPokerActions } from './actions';
import { isLocked, type PlayMode } from './mode';
import {
  DELEGATION_LEVELS,
  findDecision,
  findPlayer,
  type DecisionArea,
  type DecisionStatus,
  type DelegationLevel,
  type DelegationPokerState,
} from './model';

export const delegationParties = (
  m: DelegationPokerMessages,
  state: DelegationPokerState,
): { readonly delegator: string; readonly delegate: string } => {
  return {
    delegator: state.parties?.delegator ?? m.defaultDelegator,
    delegate: state.parties?.delegate ?? m.defaultDelegate,
  };
};

// ------------------------------------------------------------------- board

/** A card on the board, named by who played it. */
export type BoardChip = {
  readonly label: string;
  readonly kind: 'you' | 'player';
  readonly reason?: string;
};

export type BoardCell = {
  readonly level: DelegationLevel;
  /** The cards the reader may see at this level. */
  readonly chips: readonly BoardChip[];
  /** The reader's card lies here. */
  readonly yours: boolean;
  readonly agreed: boolean;
};

export type BoardRow = {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly status: DecisionStatus;
  /** Cards still face down for the reader. */
  readonly hidden: number;
  readonly agreed?: DelegationLevel;
  /** Strict mode, card played: the reader's card on this row is final. */
  readonly locked: boolean;
  readonly cells: readonly BoardCell[];
};

/** A column head: the level, its name and who decides at it. */
export type BoardLevel = {
  readonly level: DelegationLevel;
  readonly name: string;
  readonly label: string;
  readonly phrase: string;
};

export type BoardView = {
  readonly levels: readonly BoardLevel[];
  readonly rows: readonly BoardRow[];
  readonly progress: { readonly played: number; readonly agreed: number; readonly total: number };
};

type PlacedChip = BoardChip & { readonly level: DelegationLevel };

/**
 * A row's cards stay face down until the reader has played on it (or the group
 * already agreed), so nobody anchors on them.
 */
const isRevealed = (decision: DecisionArea): boolean => {
  return decision.yours !== undefined || decision.agreed !== undefined;
};

const chipsOf = (m: DelegationPokerMessages, state: DelegationPokerState, decision: DecisionArea): PlacedChip[] => {
  const yours: PlacedChip[] =
    decision.yours === undefined ? [] : [{ label: m.you, kind: 'you', level: decision.yours }];
  return [
    ...yours,
    ...decision.cards.map((card): PlacedChip => ({
      label: findPlayer(state, card.player)?.name ?? card.player,
      kind: 'player',
      level: card.level,
      ...(card.reason === undefined ? {} : { reason: card.reason }),
    })),
  ];
};

const statusOf = (decision: DecisionArea, chips: readonly PlacedChip[]): DecisionStatus => {
  if (decision.agreed !== undefined) return 'agreed';
  if (decision.yours === undefined) return 'to-play';
  return chips.every((chip) => chip.level === decision.yours) ? 'consensus' : 'discuss';
};

const presentRow = (
  m: DelegationPokerMessages,
  state: DelegationPokerState,
  mode: PlayMode,
  decision: DecisionArea,
): BoardRow => {
  const chips = chipsOf(m, state, decision);
  const visible = isRevealed(decision) ? chips : [];
  return {
    id: decision.id,
    name: decision.name,
    ...(decision.description === undefined ? {} : { description: decision.description }),
    status: statusOf(decision, chips),
    hidden: isRevealed(decision) ? 0 : decision.cards.length,
    ...(decision.agreed === undefined ? {} : { agreed: decision.agreed }),
    locked: isLocked(mode, decision),
    cells: DELEGATION_LEVELS.map((level) => ({
      level,
      chips: visible.filter((chip) => chip.level === level).map(({ level: _level, ...chip }) => chip),
      yours: decision.yours === level,
      agreed: decision.agreed === level,
    })),
  };
};

/** The delegation board: decision areas down the side, the seven levels across. */
export const presentBoard = (m: DelegationPokerMessages, state: DelegationPokerState, mode: PlayMode): BoardView => {
  const { delegator, delegate } = delegationParties(m, state);
  return {
    levels: DELEGATION_LEVELS.map((level) => ({
      level,
      name: m.levelName(level),
      label: m.levelLabel(level),
      phrase: m.levelPhrase(level, delegator, delegate),
    })),
    rows: state.decisions.map((decision) => presentRow(m, state, mode, decision)),
    progress: {
      played: state.decisions.filter((decision) => decision.yours !== undefined).length,
      agreed: state.decisions.filter((decision) => decision.agreed !== undefined).length,
      total: state.decisions.length,
    },
  };
};

// ---------------------------------------------------------------- describe

type Summary = {
  readonly title: string;
  readonly tone: ActionTone;
  readonly body?: string;
};

const levelArrow = (
  m: DelegationPokerMessages,
  before: DelegationLevel | undefined,
  after: DelegationLevel | undefined,
): string => {
  const afterText = after === undefined ? '' : m.levelLabel(after);
  return before === undefined ? m.arrowTo(afterText) : m.arrowFrom(m.levelLabel(before), afterText);
};

const nameArrow = (m: DelegationPokerMessages, before: string | undefined, after: string): string => {
  return before === undefined ? m.quotedArrowTo(after) : m.quotedArrowFrom(before, after);
};

// Never throws: every lookup falls back to the raw id.
const DESCRIBERS: Record<
  string,
  (m: DelegationPokerMessages, action: DraftAction, state: DelegationPokerState) => Summary
> = {
  PLAY_CARD: (m, action, state) => {
    const payload = payloadFor(delegationPokerActions.PLAY_CARD, action);
    return {
      title: m.cardPlayedTitle,
      tone: 'update',
      body: levelArrow(m, findDecision(state, action.target.id)?.yours, payload['level']),
    };
  },
  AGREE_LEVEL: (m, action, state) => ({
    title: m.levelAgreedTitle,
    tone: 'update',
    body: levelArrow(
      m,
      findDecision(state, action.target.id)?.agreed,
      payloadFor(delegationPokerActions.AGREE_LEVEL, action)['level'],
    ),
  }),
  ADD_DECISION: (m, action) => ({
    title: m.decisionAddedTitle,
    tone: 'create',
    body: m.added(String(payloadFor(delegationPokerActions.ADD_DECISION, action)['name'] ?? '')),
  }),
  SET_DECISION_NAME: (m, action, state) => ({
    title: m.decisionRenamedTitle,
    tone: 'update',
    body: nameArrow(
      m,
      findDecision(state, action.target.id)?.name,
      String(payloadFor(delegationPokerActions.SET_DECISION_NAME, action)['name'] ?? ''),
    ),
  }),
  DELETE_DECISION: (m, action, state) => ({
    title: m.decisionDeletedTitle,
    tone: 'delete',
    body: m.deleted(findDecision(state, action.target.id)?.name ?? action.target.id),
  }),
} satisfies Record<
  ActionName<typeof delegationPokerActions>,
  (m: DelegationPokerMessages, action: DraftAction, state: DelegationPokerState) => Summary
>;

export const describeDelegationPokerAction = (
  m: DelegationPokerMessages,
  action: DraftAction,
  state: DelegationPokerState,
  base?: DelegationPokerState,
): ActionDescription => {
  let summary: Summary;
  try {
    const describer = Object.hasOwn(DESCRIBERS, action.type) ? DESCRIBERS[action.type] : undefined;
    summary = describer ? describer(m, action, base ?? state) : { title: action.type, tone: 'meta' };
  } catch {
    summary = { title: action.type, tone: 'meta' };
  }
  return {
    title: summary.title,
    targetLabel: delegationPokerTargetLabel(m, state, action.target),
    tone: summary.tone,
    ...(summary.body === undefined ? {} : { summary: summary.body }),
  };
};

export const serializeDelegationPokerAction = (action: DraftAction): string => {
  return `${action.type} ${targetRef(action.target)} ${JSON.stringify(action.payload)}`;
};

export const delegationPokerTargetLabel = (
  m: DelegationPokerMessages,
  state: DelegationPokerState,
  target: ActionTarget,
): string => {
  switch (target.type) {
    case 'decision': {
      const decision = findDecision(state, target.id);
      return decision ? `${m.decisionKind} · ${decision.name}` : `${m.decisionKind} · ${target.id} (missing)`;
    }
    case 'page':
      return `${m.boardKind} · ${delegationPokerTitle(state)}`;
    default:
      return `${target.type} · ${target.id}`;
  }
};

// ---------------------------------------------------------------- comments

export const delegationPokerCommentTargets = (
  m: DelegationPokerMessages,
  state: DelegationPokerState,
  _nav: Navigation,
): readonly CommentTargetOption[] => {
  return [
    { value: `page:${DELEGATION_POKER_PAGE}`, label: m.wholeBoard, group: m.boardKind },
    ...state.decisions.map((decision) => ({
      value: targetRef({ type: 'decision', id: decision.id }),
      label: decision.name,
      group: m.decisionKind,
    })),
  ];
};

// -------------------------------------------------------------- navigation

export const delegationPokerTitle = (state: DelegationPokerState): string => {
  return state.title ?? 'Delegation Poker';
};

/** The whole board is one page: there is nothing to navigate to. */
export const resolveDelegationPokerNavigation = (_state: DelegationPokerState, nav: Navigation): Navigation => nav;
