import type { Locale } from '../../core/i18n';
import type { ActionTarget, Navigation, TemplateDefinition } from '../../core/types';

import { prototypeActions } from './actions';
import { applyPrototypeAction } from './apply';
import { prototypeMessages } from './messages';
import {
  emptyPrototypeBase,
  findActivity,
  findPreview,
  findStep,
  findStory,
  parsePrototypeBase,
  parseUiTargetId,
  stepRef,
  storyRef,
  type PrototypeState,
  UI_TARGET,
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
    case UI_TARGET: {
      // The element itself lives in the author's markup; the comment holds as long as its preview does.
      const ui = parseUiTargetId(target.id);
      return ui !== undefined && findPreview(state, ui.previewId) !== undefined;
    }
    default:
      return false;
  }
};

/**
 * Prototype template: Activity > UserStory > Step > Preview[].
 * `Step` is one page / experience state; a Step owns the previews it needs.
 */
export const prototypeDefinitionFor = (locale: Locale): TemplateDefinition<PrototypeState> => {
  const m = prototypeMessages(locale);
  return {
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
    describe: (action, state, base) => describePrototypeAction(m, action, state, base),
    serialize: serializePrototypeAction,
    resolveNavigation: resolvePrototypeNavigation,
    navigationHierarchy: ['activity', 'story', 'step', 'preview'],
    commentTargets: (state: PrototypeState, _navigation: Navigation) => prototypeCommentTargets(m, state),
    currentTarget: (state: PrototypeState, navigation: Navigation) => prototypeCurrentTarget(m, state, navigation),
    title: prototypeTitle,
  };
};
