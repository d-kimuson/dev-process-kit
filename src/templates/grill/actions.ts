import * as v from 'valibot';

import type { ActionInput } from '../../core/types';
import type { GrillAnswer } from './model';

import { defineAction, type ActionSpecs, type TemplateAction } from '../../core/schema';

// Domain vocabulary for the grill: one action per question, last write wins.
const answerSchema = v.variant('kind', [
  v.strictObject({ kind: v.literal('option'), optionId: v.pipe(v.string(), v.minLength(1)) }),
  v.strictObject({ kind: v.literal('free'), text: v.string() }),
  v.strictObject({ kind: v.literal('clear') }),
]);

export const grillActions = {
  ANSWER_QUESTION: defineAction('ANSWER_QUESTION', 'question', answerSchema),
} satisfies ActionSpecs;

/** The discriminated union of this template's actions. */
export type GrillAction = TemplateAction<typeof grillActions>;

/** What the UI may submit: an answer, or `clear` to go back to unanswered. */
export type AnswerInput = GrillAnswer | { readonly kind: 'clear' };

export const answerQuestion = (questionId: string, answer: AnswerInput): ActionInput => ({
  type: 'ANSWER_QUESTION',
  target: { type: 'question', id: questionId },
  payload: answer,
});
