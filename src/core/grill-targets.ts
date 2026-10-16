import type { Locale } from './i18n';
import type { ActionDescription, ActionTone, DraftAction, TemplateDefinition } from './types';

import { answerPayload, findQuestion, GRILL_TARGET_TYPE, isAnswerAction, questionLabel, type Grill } from './grill';
import { coreMessages, type CoreMessages } from './messages';
import { targetRef } from './target';

/** The questions a page asks, in the language the shell renders. */
export type GrillLayer = {
  readonly grill: Grill;
  readonly locale: Locale;
};

const summarize = (
  m: CoreMessages,
  grill: Grill,
  action: DraftAction,
): Pick<ActionDescription, 'title' | 'summary'> & { readonly tone: ActionTone } => {
  const payload = answerPayload(action);
  if (payload === null) return { title: action.type, tone: 'meta' };
  if (payload.kind === 'clear') return { title: m.grillAnswerClear, tone: 'delete' };
  if (payload.kind === 'option') {
    const option = findQuestion(grill, action.target.id)?.options.find((entry) => entry.id === payload.optionId);
    return { title: m.grillAnswer, tone: 'update', summary: m.grillQuoted(option?.label ?? payload.optionId) };
  }
  return { title: m.grillAnswerFree, tone: 'update', summary: m.grillQuoted(payload.text.slice(0, 120)) };
};

/**
 * Extends a template with the page's questions: they become targets a comment
 * can point at, and the review describes answers to them. Like
 * `withComponentSnapshot`, every function depends only on what it captured.
 */
export const withGrill = <S>(definition: TemplateDefinition<S>, layer: GrillLayer): TemplateDefinition<S> => {
  const { grill } = layer;
  const m = coreMessages(layer.locale);
  return {
    ...definition,
    hasTarget: (state, target) =>
      target.type === GRILL_TARGET_TYPE
        ? findQuestion(grill, target.id) !== undefined
        : definition.hasTarget(state, target),
    commentTargets: (state, navigation) => [
      ...definition.commentTargets(state, navigation),
      ...grill.questions.map((question) => ({
        value: targetRef({ type: GRILL_TARGET_TYPE, id: question.id }),
        label: questionLabel(grill, question.id),
        group: m.grillGroup,
      })),
    ],
    describe: (action, state, base) => {
      const targetLabel = questionLabel(grill, action.target.id);
      if (isAnswerAction(action)) {
        const { title, summary, tone } = summarize(m, grill, action);
        return { title, tone, targetLabel, ...(summary === undefined ? {} : { summary }) };
      }
      const description = definition.describe(action, state, base);
      return action.target.type === GRILL_TARGET_TYPE ? { ...description, targetLabel } : description;
    },
    serialize: (action) =>
      isAnswerAction(action)
        ? `${action.type} ${targetRef(action.target)} ${JSON.stringify(action.payload)}`
        : definition.serialize(action),
  };
};
