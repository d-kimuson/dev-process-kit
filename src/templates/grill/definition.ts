import type { Locale } from '../../core/i18n';
import type { ActionTarget, TemplateDefinition } from '../../core/types';

import { grillActions } from './actions';
import { applyGrillAction } from './apply';
import { grillMessages } from './messages';
import { emptyGrillBase, findQuestion, parseGrillBase, type GrillState } from './model';
import {
  describeGrillAction,
  grillCommentTargets,
  grillTitle,
  resolveGrillNavigation,
  serializeGrillAction,
} from './present';

export const grillHasTarget = (state: GrillState, target: ActionTarget): boolean => {
  switch (target.type) {
    case 'question':
      return findQuestion(state, target.id) !== undefined;
    case 'page':
      return true;
    default:
      return false;
  }
};

/** The grill template, describing its actions in `locale`. */
export const grillDefinitionFor = (locale: Locale): TemplateDefinition<GrillState> => {
  const m = grillMessages(locale);
  return {
    name: 'grill',
    label: 'Visually Grill',
    parseBase: parseGrillBase,
    emptyBase: emptyGrillBase,
    actions: grillActions,
    apply: applyGrillAction,
    hasTarget: grillHasTarget,
    describe: (action, state, base) => describeGrillAction(m, action, state, base),
    serialize: serializeGrillAction,
    resolveNavigation: resolveGrillNavigation,
    commentTargets: (state) => grillCommentTargets(m, state),
    title: grillTitle,
  };
};
