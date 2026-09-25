import type { HandoffFailure } from '../../core/claude-handoff';
import type {
  ActionDescription,
  ActionTarget,
  ActionTone,
  CommentTargetOption,
  DraftAction,
  Navigation,
} from '../../core/types';
import type { GrillMessages } from './messages';

import { payloadFor } from '../../core/schema';
import { targetRef } from '../../core/target';
import { grillActions } from './actions';
import {
  answerText,
  answerCounts,
  findQuestion,
  isAnswered,
  optionLetter,
  questionLabel,
  type GrillAnswer,
  type GrillQuestion,
  type GrillState,
} from './model';

/* ------------------------------------------------------------ review rail */

export const grillTitle = (state: GrillState): string => (state.title === '' ? 'Visually Grill' : state.title);

/** Never throws: an unknown target falls back to its raw id. */
export const grillTargetLabel = (m: GrillMessages, state: GrillState, target: ActionTarget): string => {
  switch (target.type) {
    case 'question':
      return questionLabel(state, target.id);
    case 'page':
      return m.wholePage;
    default:
      return target.id;
  }
};

type Summary = {
  readonly title: string;
  readonly tone: ActionTone;
  readonly body?: string;
};

const summarizeAnswer = (m: GrillMessages, state: GrillState, action: DraftAction): Summary => {
  const payload = payloadFor(grillActions.ANSWER_QUESTION, action);
  if (payload.kind === 'clear') return { title: m.answerCleared, tone: 'delete' };
  if (payload.kind === 'option') {
    const option = findQuestion(state, action.target.id)?.options.find((entry) => entry.id === payload.optionId);
    return { title: m.answered, tone: 'update', body: m.quoted(option?.label ?? payload.optionId) };
  }
  return { title: m.answeredFreely, tone: 'update', body: m.quoted(payload.text.slice(0, 120)) };
};

export const describeGrillAction = (
  m: GrillMessages,
  action: DraftAction,
  state: GrillState,
  base?: GrillState,
): ActionDescription => {
  let summary: Summary;
  try {
    summary = summarizeAnswer(m, base ?? state, action);
  } catch {
    summary = { title: action.type, tone: 'meta' };
  }
  return {
    title: summary.title,
    targetLabel: grillTargetLabel(m, state, action.target),
    tone: summary.tone,
    ...(summary.body === undefined ? {} : { summary: summary.body }),
  };
};

export const serializeGrillAction = (action: DraftAction): string =>
  `${action.type} ${targetRef(action.target)} ${JSON.stringify(action.payload)}`;

export const grillCommentTargets = (m: GrillMessages, state: GrillState): readonly CommentTargetOption[] =>
  state.questions.map((question) => ({
    value: `question:${question.id}`,
    label: questionLabel(state, question.id),
    group: m.questionGroup,
  }));

/** The open question is navigation, never a draft action. */
export const resolveGrillNavigation = (state: GrillState, navigation: Navigation): Navigation => {
  const named = navigation['question'];
  if (named !== undefined && findQuestion(state, named)) return navigation;
  const first = state.questions[0];
  return first === undefined ? navigation : { ...navigation, question: first.id };
};

/** The question a comment or a Q badge should point at right now. */
export const openQuestionId = (state: GrillState, navigation: Navigation): string | null => {
  const named = navigation['question'];
  if (named !== undefined && findQuestion(state, named)) return named;
  return state.questions[0]?.id ?? null;
};

/**
 * Where the review should move after answering `currentId`: the next unanswered
 * question in state order, wrapping around.
 */
export const nextOpenQuestion = (state: GrillState, currentId: string): string | null => {
  const visible = state.questions;
  const index = visible.findIndex((question) => question.id === currentId);
  const order = index === -1 ? visible : [...visible.slice(index + 1), ...visible.slice(0, index)];
  return order.find((question) => !isAnswered(question, state.answers[question.id]))?.id ?? null;
};

/* ------------------------------------------------------------ panel view */

export type GrillChoiceViewModel = {
  readonly id: string;
  readonly letter: string;
  readonly label: string;
  readonly checked: boolean;
};

export type GrillQuestionViewModel = {
  readonly id: string;
  readonly ref: string;
  readonly title: string;
  readonly description: string | null;
  readonly note: string | null;
  readonly open: boolean;
  readonly answered: boolean;
  /** The chosen answer, shown while the question is collapsed. */
  readonly summary: string;
  readonly choices: readonly GrillChoiceViewModel[];
  readonly draft: string;
  readonly freeSelected: boolean;
  readonly allowFreeText: boolean;
};

/** What the copy button reports after a click. */
export type CopyStatus = 'idle' | 'copied' | 'failed';

/** What the send-to-Claude button reports; a failure keeps its reason on screen. */
export type SendStatus =
  | { readonly kind: 'idle' | 'pending' | 'sent' }
  | { readonly kind: 'failed'; readonly reason: HandoffFailure };

export type GrillPanelViewModel = {
  readonly questions: readonly GrillQuestionViewModel[];
};

export type GrillHeaderViewModel = {
  readonly progress: string;
  readonly answered: number;
  readonly total: number;
};

const presentChoices = (question: GrillQuestion, answer: GrillAnswer | undefined): readonly GrillChoiceViewModel[] =>
  question.options.map((option, index) => ({
    id: option.id,
    letter: optionLetter(index),
    label: option.label,
    checked: answer?.kind === 'option' && answer.optionId === option.id,
  }));

const presentQuestion = (question: GrillQuestion, state: GrillState, openId: string | null): GrillQuestionViewModel => {
  const answer = state.answers[question.id];
  return {
    id: question.id,
    ref: question.ref,
    title: question.title,
    description: question.description,
    note: question.note,
    open: question.id === openId,
    answered: answerText(question, answer) !== '',
    summary: answerText(question, answer),
    choices: presentChoices(question, answer),
    draft: answer?.kind === 'free' ? answer.text : '',
    freeSelected: answer?.kind === 'free',
    allowFreeText: question.freeText,
  };
};

/** Pure: meaning state + UI state in, view data out. No DOM, no callbacks. */
export const presentGrillPanel = (state: GrillState, navigation: Navigation): GrillPanelViewModel => {
  const openId = openQuestionId(state, navigation);
  return {
    questions: state.questions.map((question) => presentQuestion(question, state, openId)),
  };
};

export const presentGrillHeader = (m: GrillMessages, state: GrillState): GrillHeaderViewModel => {
  const counts = answerCounts(state);
  return {
    progress: m.progress(counts.answered, counts.total),
    answered: counts.answered,
    total: counts.total,
  };
};

/* ------------------------------------------------------------ earlier rounds */

/** Which questions the questions tab shows: the current ones, or an earlier round by its `history` index. */
export type GrillRoundSelection = 'current' | number;

export type GrillRoundChoice = {
  readonly value: string;
  readonly label: string;
  readonly selected: boolean;
};

export type GrillPastQuestionViewModel = {
  readonly id: string;
  readonly ref: string;
  readonly title: string;
  readonly description: string | null;
  readonly note: string | null;
  readonly answered: boolean;
  /** The recorded answer, or the "not answered" label. */
  readonly summary: string;
  readonly choices: readonly GrillChoiceViewModel[];
  /** The answer given in the reader's own words, if that is what they did. */
  readonly freeText: string | null;
};

export type GrillPastRoundViewModel = {
  readonly label: string;
  readonly questions: readonly GrillPastQuestionViewModel[];
};

/** A selection that no longer names a round (the base data changed) falls back to the current questions. */
export const resolveRound = (state: GrillState, round: GrillRoundSelection): GrillRoundSelection =>
  round !== 'current' && state.pastRounds[round] !== undefined ? round : 'current';

/** Empty without history: the questions tab stays a plain tab. Earlier rounds come newest first. */
export const presentRoundChoices = (
  m: GrillMessages,
  state: GrillState,
  round: GrillRoundSelection,
): readonly GrillRoundChoice[] => {
  if (state.pastRounds.length === 0) return [];
  const selected = resolveRound(state, round);
  const past = state.pastRounds.map((entry, index) => ({
    value: String(index),
    label: m.roundOption(entry.label, entry.questions.length),
    selected: selected === index,
  }));
  return [
    {
      value: 'current',
      label: m.roundOption(m.currentRound, state.questions.length),
      selected: selected === 'current',
    },
    ...[...past].reverse(),
  ];
};

export const presentPastRound = (
  m: GrillMessages,
  state: GrillState,
  index: number,
): GrillPastRoundViewModel | null => {
  const round = state.pastRounds[index];
  if (round === undefined) return null;
  return {
    label: round.label,
    questions: round.questions.map((question) => {
      const answer = question.answer ?? undefined;
      const summary = answerText(question, answer);
      return {
        id: question.id,
        ref: question.ref,
        title: question.title,
        description: question.description,
        note: question.note,
        answered: summary !== '',
        summary: summary === '' ? m.unanswered : summary,
        choices: presentChoices(question, answer),
        freeText: answer?.kind === 'free' ? answer.text : null,
      };
    }),
  };
};
