import type { ActionTarget, Navigation, TemplateDefinition } from '../../core/types';

import { prototypeActions } from './actions';
import { applyPrototypeAction } from './apply';
import {
  emptyPrototypeBase,
  findActivity,
  findPreview,
  findStep,
  findStory,
  parsePrototypeBase,
  stepRef,
  storyRef,
  type PrototypeState,
} from './model';
import {
  describePrototypeAction,
  prototypeCommentTargets,
  prototypeCurrentTarget,
  prototypeTitle,
  resolvePrototypeNavigation,
  serializePrototypeAction,
} from './present';

export const prototypeHasTarget = (state: PrototypeState, target: ActionTarget): boolean => {
  switch (target.type) {
    case 'activity':
      return findActivity(state, target.id) !== undefined;
    case 'story':
      return findStory(state, target.id) !== undefined;
    case 'step':
      return findStep(state, target.id) !== undefined;
    case 'preview':
      return findPreview(state, target.id) !== undefined;
    case 'page':
      return true;
    default:
      return false;
  }
};

/**
 * Prototype template: Activity > UserStory > Step > Preview[].
 * `Step` is one page / experience state; a Step owns the previews it needs.
 */
export const prototypeDefinition: TemplateDefinition<PrototypeState> = {
  name: 'prototype',
  label: 'UX Prototype',
  parseBase: parsePrototypeBase,
  emptyBase: emptyPrototypeBase,
  actions: prototypeActions,
  apply: applyPrototypeAction,
  hasTarget: prototypeHasTarget,
  canonicalTarget: (state, target) => {
    if (target.type === 'step') {
      const location = findStep(state, target.id);
      return location ? { ...target, id: stepRef(location) } : target;
    }
    if (target.type === 'story') {
      const location = findStory(state, target.id);
      return location ? { ...target, id: storyRef(location.activity.id, location.story.id) } : target;
    }
    if (target.type === 'preview') {
      const location = findPreview(state, target.id);
      return location ? { ...target, id: location.preview.id } : target;
    }
    return target;
  },
  describe: describePrototypeAction,
  serialize: serializePrototypeAction,
  resolveNavigation: resolvePrototypeNavigation,
  commentTargets: (state: PrototypeState, _navigation: Navigation) => prototypeCommentTargets(state),
  currentTarget: (state: PrototypeState, navigation: Navigation) => prototypeCurrentTarget(state, navigation),
  title: prototypeTitle,
};
