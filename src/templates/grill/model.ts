import * as v from 'valibot';

/**
 * Meaning model of the grill template: a list of questions, and the answers a
 * reader gives. The questions are base data (the agent authored them); answers
 * are draft actions, so they never live in the base JSON.
 */

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
 * An earlier round of questions. It is base data the agent keeps when it asks
 * the next round, so the reader can look back; nothing can answer it again.
 */
export type GrillRound = {
  /** Display label in the round select. Defaults to `v<1-based position>`. */
  readonly label: string;
  readonly questions: readonly GrillPastQuestion[];
};

export type GrillState = {
  readonly title: string;
  readonly questions: readonly GrillQuestion[];
  readonly answers: GrillAnswers;
  /** Earlier rounds, oldest first (`history` in the base data). */
  readonly pastRounds: readonly GrillRound[];
};

const optionSchema = v.strictObject({
  id: v.pipe(v.string(), v.minLength(1)),
  label: v.pipe(v.string(), v.minLength(1)),
});

const questionSchema = v.strictObject({
  id: v.pipe(v.string(), v.minLength(1)),
  ref: v.optional(v.pipe(v.string(), v.minLength(1))),
  title: v.pipe(v.string(), v.minLength(1)),
  description: v.optional(v.string()),
  note: v.optional(v.string()),
  options: v.optional(v.array(optionSchema), []),
  freeText: v.optional(v.boolean(), true),
});

/** The same shape as the `ANSWER_QUESTION` payload, so a draft answer can be copied over as is. */
const recordedAnswerSchema = v.variant('kind', [
  v.strictObject({ kind: v.literal('option'), optionId: v.pipe(v.string(), v.minLength(1)) }),
  v.strictObject({ kind: v.literal('free'), text: v.string() }),
]);

const pastQuestionSchema = v.strictObject({
  ...questionSchema.entries,
  answer: v.optional(recordedAnswerSchema),
});

const roundSchema = v.strictObject({
  label: v.optional(v.pipe(v.string(), v.minLength(1))),
  questions: v.array(pastQuestionSchema),
});

export const grillBaseSchema = v.strictObject({
  title: v.optional(v.string(), ''),
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

export const parseGrillBase = (input: unknown): GrillState => {
  const parsed = v.parse(grillBaseSchema, input);
  return {
    title: parsed.title,
    questions: toQuestions(parsed.questions).map(toQuestion),
    answers: {},
    pastRounds: parsed.history.map((round, index) => ({
      label: round.label ?? `v${index + 1}`,
      questions: toQuestions(round.questions).map(toPastQuestion),
    })),
  };
};

export const emptyGrillBase = (): GrillState => ({ title: '', questions: [], answers: {}, pastRounds: [] });

export const findQuestion = (state: GrillState, id: string): GrillQuestion | undefined =>
  state.questions.find((question) => question.id === id);

/** Never throws: an unknown id falls back to itself, so a stale action still prints. */
export const questionRef = (state: GrillState, id: string): string => findQuestion(state, id)?.ref ?? id;

export const questionLabel = (state: GrillState, id: string): string => {
  const question = findQuestion(state, id);
  return question ? `${question.ref} · ${question.title}` : id;
};

export const answerText = (question: GrillQuestion, answer: GrillAnswer | undefined): string => {
  if (!answer) return '';
  if (answer.kind === 'option') return question.options.find((option) => option.id === answer.optionId)?.label ?? '';
  return answer.text.trim();
};

export const isAnswered = (question: GrillQuestion, answer: GrillAnswer | undefined): boolean =>
  answerText(question, answer) !== '';

/** Option letters for the choice rows: a, b, … z, aa, ab … */
export const optionLetter = (index: number): string => {
  let result = '';
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    result = String.fromCharCode(97 + ((n - 1) % 26)) + result;
  }
  return result;
};

export const answerCounts = (state: GrillState): { readonly total: number; readonly answered: number } => ({
  total: state.questions.length,
  answered: state.questions.filter((question) => isAnswered(question, state.answers[question.id])).length,
});

/** `null` clears the answer. Returns the same state when nothing changes. */
export const withAnswer = (state: GrillState, questionId: string, answer: GrillAnswer | null): GrillState => {
  const current = state.answers[questionId];
  if (answer === null) {
    if (current === undefined) return state;
    const answers = { ...state.answers };
    delete answers[questionId];
    return { ...state, answers };
  }
  if (current?.kind === answer.kind) {
    if (current.kind === 'option' && answer.kind === 'option' && current.optionId === answer.optionId) return state;
    if (current.kind === 'free' && answer.kind === 'free' && current.text === answer.text) return state;
  }
  return { ...state, answers: { ...state.answers, [questionId]: answer } };
};
