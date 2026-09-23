import type { DraftAction } from '../../core/types';

import { payloadFor } from '../../core/schema';
import { grillActions } from './actions';
import { findQuestion, withAnswer, type GrillState } from './model';

/**
 * Pure reducer for one answer. `null` means "not applicable to this base", which
 * is what turns an answer to a question (or an option) that no longer exists
 * into a stale draft instead of a broken one.
 */
export const applyGrillAction = (state: GrillState, action: DraftAction): GrillState | null => {
  if (action.type !== 'ANSWER_QUESTION') return null;
  const question = findQuestion(state, action.target.id);
  if (!question) return null;
  const payload = payloadFor(grillActions.ANSWER_QUESTION, action);
  if (payload.kind === 'clear') return withAnswer(state, question.id, null);
  if (payload.kind === 'option') {
    if (!question.options.some((option) => option.id === payload.optionId)) return null;
    return withAnswer(state, question.id, { kind: 'option', optionId: payload.optionId });
  }
  return withAnswer(state, question.id, { kind: 'free', text: payload.text });
};
