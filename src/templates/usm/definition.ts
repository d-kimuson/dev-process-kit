import type { ActionTarget, TemplateDefinition } from '../../core/types';

import { usmActions } from './actions';
import { applyUsmAction } from './apply';
import {
  canonicalUsmState,
  emptyUsmBase,
  findActivity,
  findMilestone,
  findStep,
  findStory,
  parseUsmBase,
  stepRefOf,
  type UsmState,
} from './model';
import {
  describeUsmAction,
  resolveUsmNavigation,
  serializeUsmAction,
  usmCommentTargets,
  usmCurrentTarget,
  usmTitle,
} from './present';

export const usmHasTarget = (state: UsmState, target: ActionTarget): boolean => {
  switch (target.type) {
    case 'activity':
      return findActivity(state, target.id) !== undefined;
    case 'step':
      return findStep(state, target.id) !== undefined;
    case 'story':
      return findStory(state, target.id) !== undefined;
    case 'milestone':
      return findMilestone(state, target.id) !== undefined;
    case 'artifact':
      return true;
    default:
      return false;
  }
};

export const usmDefinition: TemplateDefinition<UsmState> = {
  name: 'usm',
  label: 'User Story Mapping',
  parseBase: parseUsmBase,
  emptyBase: emptyUsmBase,
  actions: usmActions,
  apply: applyUsmAction,
  canonicalState: canonicalUsmState,
  hasTarget: usmHasTarget,
  canonicalTarget: (state, target) => {
    if (target.type !== 'step') return target;
    const location = findStep(state, target.id);
    return location ? { ...target, id: stepRefOf(location.activity.id, location.step.id) } : target;
  },
  describe: describeUsmAction,
  serialize: serializeUsmAction,
  resolveNavigation: resolveUsmNavigation,
  commentTargets: (state: UsmState, navigation) => usmCommentTargets(state, navigation),
  currentTarget: (state, navigation) => usmCurrentTarget(state, navigation),
  title: usmTitle,
};
