import * as v from 'valibot';

import type { ActionDescriptor, ActionInput, ActionTarget, DraftAction } from './types';

import { entityIdSchema } from './schema';

/**
 * Grill (ADR 20261016_grill-in-core): questions the agent asks the reader on
 * any page, to settle what is still open before building on it. The questions
 * are a block of their own next to the base data
 * (`<script type="application/json" data-dpk-grill>`), so every template can
 * carry them; the answers are core-owned draft actions, so they travel with the
 * reader's changes and comments in one hand-off.
 */
export const GRILL_ATTRIBUTE = 'data-dpk-grill';

/** `grill:<question id>`: what an answer (or a comment) on a question targets. */
export const GRILL_TARGET_TYPE = 'grill';

/** Core-owned action type, lowercase like `comment`. Templates must not redefine it. */
export const ANSWER_ACTION = 'answer';

/** Marks page content a question is about: `data-grill-questions="Q1 Q4"` (references, space-separated). */
export const GRILL_QUESTIONS_ATTRIBUTE = 'data-grill-questions';

/**
 * The `questions` field a template's card or a diagram's node may carry in its
 * data: the question references it is about (`"Q1 Q4"`), rendered as
 * `data-grill-questions` on that card.
 */
export const questionRefsSchema = v.exactOptional(v.string());

/** The `data-grill-questions` value for a card's `questions`, or `undefined` when it names none. */
export const grillMark = (questions: string | undefined): string | undefined => {
  const value = questions?.trim();
  return value === undefined || value === '' ? undefined : value;
};

/** `{ questions }` to spread into a card's model or view model, or nothing when it names none. */
export const grillMarkEntry = (questions: string | undefined): { readonly questions?: string } => {
  const mark = grillMark(questions);
  return mark === undefined ? {} : { questions: mark };
};

export type GrillOption = {
  readonly id: string;
  readonly label: string;
};

export type GrillQuestion = {
  readonly id: string;
  /** Display reference (`Q1`). Defaults to the 1-based position. */
  readonly ref: string;
  readonly title: string;
  readonly description: string | null;
  /** One-line provocation shown with the question. */
  readonly note: string | null;
  readonly options: readonly GrillOption[];
  readonly freeText: boolean;
};

export type GrillAnswer =
  | { readonly kind: 'option'; readonly optionId: string }
  | { readonly kind: 'free'; readonly text: string };

/** Keyed by question id. An unanswered question has no entry at all. */
export type GrillAnswers = Readonly<Record<string, GrillAnswer>>;

/** A question from an earlier round, with the answer the agent recorded (`null`: left unanswered). */
export type GrillPastQuestion = GrillQuestion & {
  readonly answer: GrillAnswer | null;
};

/**
 * An earlier round of questions. The agent keeps it when it asks the next
 * round, so the reader can look back; nothing can answer it again.
 */
export type GrillRound = {
  /** Display label in the round select. Defaults to `v<1-based position>`. */
  readonly label: string;
  readonly questions: readonly GrillPastQuestion[];
};

export type Grill = {
  readonly questions: readonly GrillQuestion[];
  /** Earlier rounds, oldest first (`history` in the block). */
  readonly rounds: readonly GrillRound[];
};

export const EMPTY_GRILL: Grill = { questions: [], rounds: [] };

const optionSchema = v.strictObject({
  id: entityIdSchema,
  label: v.pipe(v.string(), v.minLength(1)),
});

const questionSchema = v.strictObject({
  id: entityIdSchema,
  ref: v.optional(v.pipe(v.string(), v.minLength(1))),
  title: v.pipe(v.string(), v.minLength(1)),
  description: v.optional(v.string()),
  note: v.optional(v.string()),
  options: v.optional(v.array(optionSchema), []),
  freeText: v.optional(v.boolean(), true),
});

/** The answer payload without `clear`, so a draft answer can be copied into `history` as is. */
const recordedAnswerSchema = v.variant('kind', [
  v.strictObject({ kind: v.literal('option'), optionId: v.pipe(v.string(), v.minLength(1)) }),
  v.strictObject({ kind: v.literal('free'), text: v.string() }),
]);

const answerPayloadSchema = v.variant('kind', [
  ...recordedAnswerSchema.options,
  v.strictObject({ kind: v.literal('clear') }),
]);

export type AnswerPayload = v.InferOutput<typeof answerPayloadSchema>;

const pastQuestionSchema = v.strictObject({
  ...questionSchema.entries,
  answer: v.optional(recordedAnswerSchema),
});

const roundSchema = v.strictObject({
  label: v.optional(v.pipe(v.string(), v.minLength(1))),
  questions: v.array(pastQuestionSchema),
});

export const grillSchema = v.strictObject({
  questions: v.array(questionSchema),
  history: v.optional(v.array(roundSchema), []),
});

type ParsedQuestion = v.InferOutput<typeof questionSchema>;

/** Ids are unique within one round; a later round may reuse an earlier round's id. */
const toQuestions = <Q extends ParsedQuestion>(questions: readonly Q[]): readonly (Q & GrillQuestion)[] => {
  const ids = new Set<string>();
  return questions.map((question, index) => {
    if (ids.has(question.id)) throw new Error(`duplicate question id: ${question.id}`);
    ids.add(question.id);
    const optionIds = new Set<string>();
    for (const option of question.options) {
      if (optionIds.has(option.id)) throw new Error(`duplicate option id: ${option.id} in question ${question.id}`);
      optionIds.add(option.id);
    }
    return {
      ...question,
      ref: question.ref ?? `Q${index + 1}`,
      description: question.description ?? null,
      note: question.note ?? null,
    };
  });
};

const toQuestion = (question: GrillQuestion): GrillQuestion => ({
  id: question.id,
  ref: question.ref,
  title: question.title,
  description: question.description,
  note: question.note,
  options: question.options,
  freeText: question.freeText,
});

const toPastQuestion = (question: GrillQuestion & { readonly answer?: GrillAnswer | undefined }): GrillPastQuestion => {
  const answer = question.answer ?? null;
  if (answer?.kind === 'option' && !question.options.some((option) => option.id === answer.optionId))
    throw new Error(`unknown option id: ${answer.optionId} in question ${question.id}`);
  return { ...toQuestion(question), answer };
};

/** Throws on a malformed block; the shell reports it to the author. */
export const parseGrill = (input: unknown): Grill => {
  const parsed = v.parse(grillSchema, input);
  return {
    questions: toQuestions(parsed.questions).map(toQuestion),
    rounds: parsed.history.map((round, index) => ({
      label: round.label ?? `v${index + 1}`,
      questions: toQuestions(round.questions).map(toPastQuestion),
    })),
  };
};

export const findQuestion = (grill: Grill, id: string): GrillQuestion | undefined =>
  grill.questions.find((question) => question.id === id);

/** Never throws: an unknown id falls back to itself, so a stale answer still prints. */
export const questionLabel = (grill: Grill, id: string): string => {
  const question = findQuestion(grill, id);
  return question ? `${question.ref} · ${question.title}` : id;
};

export const answerText = (question: GrillQuestion, answer: GrillAnswer | null | undefined): string => {
  if (!answer) return '';
  if (answer.kind === 'option') return question.options.find((option) => option.id === answer.optionId)?.label ?? '';
  return answer.text.trim();
};

export const isAnswered = (question: GrillQuestion, answer: GrillAnswer | null | undefined): boolean =>
  answerText(question, answer) !== '';

/** Option letters for the choice rows: a, b, … z, aa, ab … */
export const optionLetter = (index: number): string => {
  let result = '';
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    result = String.fromCharCode(97 + ((n - 1) % 26)) + result;
  }
  return result;
};

export const answerCounts = (
  grill: Grill,
  answers: GrillAnswers,
): { readonly total: number; readonly answered: number } => ({
  total: grill.questions.length,
  answered: grill.questions.filter((question) => isAnswered(question, answers[question.id])).length,
});

/** Where to move after answering `currentId`: the next unanswered question, wrapping around. */
export const nextOpenQuestion = (grill: Grill, answers: GrillAnswers, currentId: string): string | null => {
  const questions = grill.questions;
  const index = questions.findIndex((question) => question.id === currentId);
  const order = index === -1 ? questions : [...questions.slice(index + 1), ...questions.slice(0, index)];
  return order.find((question) => !isAnswered(question, answers[question.id]))?.id ?? null;
};

/* ------------------------------------------------------------ answer actions */

/**
 * A question id as an answer targets it. A page that gathers its boards'
 * questions qualifies each with its board (`retry@scope`), so the id may carry
 * one `@<board>` after the question's own id.
 */
const questionTargetIdSchema = v.pipe(
  v.string(),
  v.regex(/^[A-Za-z0-9_-]+(?:@[A-Za-z0-9_-]+)?$/, 'a question id, optionally qualified by its board (`retry@scope`)'),
);

const answerActionSchema = v.object({
  id: v.pipe(v.string(), v.minLength(1)),
  type: v.literal(ANSWER_ACTION),
  target: v.object({ type: v.literal(GRILL_TARGET_TYPE), id: questionTargetIdSchema }),
  payload: answerPayloadSchema,
  note: v.exactOptional(v.string()),
  createdAt: v.pipe(v.string(), v.minLength(1)),
});

/** One answer per question: last write wins (see `replaceAnswer`). */
export const ANSWER_DESCRIPTOR: ActionDescriptor = {
  schema: answerActionSchema,
  mode: 'patch',
  targetType: GRILL_TARGET_TYPE,
};

export const isAnswerAction = (action: { readonly type: string; readonly target: ActionTarget }): boolean =>
  action.type === ANSWER_ACTION && action.target.type === GRILL_TARGET_TYPE;

export const answerGrill = (questionId: string, payload: AnswerPayload): ActionInput => ({
  type: ANSWER_ACTION,
  target: { type: GRILL_TARGET_TYPE, id: questionId },
  payload,
});

/** `null` when the payload is not an answer; a stored draft is external input. */
export const answerPayload = (action: DraftAction): AnswerPayload | null => {
  const parsed = v.safeParse(answerPayloadSchema, action.payload);
  return parsed.success ? parsed.output : null;
};

/**
 * Answers depend on nothing else in the draft, so a new answer replaces the
 * question's last one wherever it stands. Answering and clearing again then
 * leaves nothing behind once the clear turns out to change nothing.
 */
export const replaceAnswer = (actions: readonly DraftAction[], action: DraftAction): DraftAction[] => [
  ...actions.filter((existing) => !(isAnswerAction(existing) && existing.target.id === action.target.id)),
  action,
];

/**
 * The answers after one answer action, the same object when it changes
 * nothing, or `null` when it does not apply to these questions (the question
 * or the option is gone, or free text is off), which makes the action stale.
 */
export const applyAnswer = (grill: Grill, answers: GrillAnswers, action: DraftAction): GrillAnswers | null => {
  const question = findQuestion(grill, action.target.id);
  const payload = answerPayload(action);
  if (!question || !payload) return null;
  const current = answers[question.id];
  if (payload.kind === 'clear') {
    if (current === undefined) return answers;
    const next = { ...answers };
    delete next[question.id];
    return next;
  }
  if (payload.kind === 'option' && !question.options.some((option) => option.id === payload.optionId)) return null;
  if (payload.kind === 'free' && !question.freeText) return null;
  if (current?.kind === 'option' && payload.kind === 'option' && current.optionId === payload.optionId) return answers;
  if (current?.kind === 'free' && payload.kind === 'free' && current.text === payload.text) return answers;
  return { ...answers, [question.id]: payload };
};
