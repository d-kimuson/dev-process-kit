import type { Locale } from '../../core/i18n';
import type { ActionTarget, TemplateDefinition } from '../../core/types';

import { slidesMessages } from './messages';
import { emptySlidesBase, findSlide, parseSlidesBase, type SlidesState } from './model';
import {
  describeSlidesAction,
  resolveSlidesNavigation,
  serializeSlidesAction,
  slidesCommentTargets,
  slidesCurrentTarget,
  slidesTitle,
} from './present';

export const slidesHasTarget = (state: SlidesState, target: ActionTarget): boolean => {
  switch (target.type) {
    case 'slide':
      return findSlide(state, target.id) !== undefined;
    case 'page':
      return true;
    default:
      return false;
  }
};

/**
 * No actions: a deck is the author's explanation, and what a reader sends back
 * is questions and remarks on it. `apply` therefore never has anything to apply.
 */
export const slidesDefinitionFor = (locale: Locale): TemplateDefinition<SlidesState> => {
  const m = slidesMessages(locale);
  return {
    name: 'slides',
    label: 'Slides',
    parseBase: parseSlidesBase,
    emptyBase: emptySlidesBase,
    actions: {},
    apply: () => null,
    hasTarget: slidesHasTarget,
    describe: (action, state) => describeSlidesAction(m, action, state),
    serialize: serializeSlidesAction,
    resolveNavigation: resolveSlidesNavigation,
    commentTargets: (state) => slidesCommentTargets(m, state),
    currentTarget: (state, nav) => slidesCurrentTarget(m, state, nav),
    title: slidesTitle,
  };
};
