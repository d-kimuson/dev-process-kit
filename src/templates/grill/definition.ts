import type { ActionTarget, TemplateDefinition } from '../../core/types';

import { grillActions } from './actions';
import { applyGrillAction } from './apply';
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

export const grillDefinition: TemplateDefinition<GrillState> = {
  name: 'grill',
  label: 'Visually Grill',
  parseBase: parseGrillBase,
  emptyBase: emptyGrillBase,
  actions: grillActions,
  apply: applyGrillAction,
  hasTarget: grillHasTarget,
  describe: describeGrillAction,
  serialize: serializeGrillAction,
  resolveNavigation: resolveGrillNavigation,
  commentTargets: (state) => grillCommentTargets(state),
  title: grillTitle,
};
