import type { Locale } from '../../core/i18n';
import type { ActionTarget, ViewDefinition } from '../../core/types';

import { applySlidesAction, slidesActions } from './actions';
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
 * A deck is the author's explanation, and what a reader sends back is mostly
 * remarks on it — so the vocabulary is deliberately small: the speaker notes are
 * the one thing a reader rewrites into the page itself, as a patch.
 */
export const slidesDefinitionFor = (locale: Locale): ViewDefinition<SlidesState> => {
  const m = slidesMessages(locale);
  return {
    kind: 'view',
    name: 'slides',
    label: 'Slides',
    // A deck's slides are the agent's own content; empty, there is nothing to present.
    addable: false,
    parseBase: parseSlidesBase,
    emptyBase: emptySlidesBase,
    actions: slidesActions,
    apply: applySlidesAction,
    hasTarget: slidesHasTarget,
    describe: (action, state) => describeSlidesAction(m, action, state),
    serialize: serializeSlidesAction,
    resolveNavigation: resolveSlidesNavigation,
    navigationFor: (_state, target) => (target.type === 'slide' ? { slide: target.id } : null),
    commentTargets: (state) => slidesCommentTargets(m, state),
    currentTarget: (state, nav) => slidesCurrentTarget(m, state, nav),
    title: slidesTitle,
  };
};
