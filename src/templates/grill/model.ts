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

export type GrillState = {
  readonly title: string;
  readonly questions: readonly GrillQuestion[];
  readonly answers: GrillAnswers;
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

export const grillBaseSchema = v.strictObject({
  title: v.optional(v.string(), ''),
  questions: v.array(questionSchema),
});

export const parseGrillBase = (input: unknown): GrillState => {
  const parsed = v.parse(grillBaseSchema, input);
  const ids = new Set<string>();
  const questions = parsed.questions.map((question, index) => {
    if (ids.has(question.id)) throw new Error(`duplicate question id: ${question.id}`);
    ids.add(question.id);
    const optionIds = new Set<string>();
    for (const option of question.options) {
      if (optionIds.has(option.id)) throw new Error(`duplicate option id: ${option.id} in question ${question.id}`);
      optionIds.add(option.id);
    }
    return {
      id: question.id,
      ref: question.ref ?? `Q${index + 1}`,
      title: question.title,
      description: question.description ?? null,
      note: question.note ?? null,
      options: question.options,
      freeText: question.freeText,
    } satisfies GrillQuestion;
  });
  return { title: parsed.title, questions, answers: {} };
};

export const emptyGrillBase = (): GrillState => ({ title: '', questions: [], answers: {} });

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
