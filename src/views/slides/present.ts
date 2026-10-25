import type { ActionDescription, ActionTarget, CommentTargetOption, DraftAction, Navigation } from '../../core/types';
import type { SlidesMessages } from './messages';

import { COMMENT_ACTION } from '../../core/action';
import { commentBody } from '../../core/comment';
import { targetRef } from '../../core/target';
import { findSlideIndex, type Slide, type SlidesState } from './model';

/**
 * The slides template's review rail and navigation. It has no action
 * vocabulary of its own, so everything the rail ever describes is a comment:
 * on the deck, on a slide, or on a component element inside a slide body.
 */

export const slidesTitle = (state: SlidesState): string => (state.title === '' ? 'Slides' : state.title);

/** `3. 仕組み` — the number is how a reader refers to a slide. */
const slideLabel = (slide: Slide, index: number): string => `${index + 1}. ${slide.title}`;

/** Never throws: an unknown target falls back to its raw id. */
export const slidesTargetLabel = (m: SlidesMessages, state: SlidesState, target: ActionTarget): string => {
  switch (target.type) {
    case 'slide': {
      const index = findSlideIndex(state, target.id);
      const slide = state.slides[index];
      return slide === undefined ? target.id : slideLabel(slide, index);
    }
    case 'page':
      return m.wholeDeck;
    default:
      return target.id;
  }
};

export const describeSlidesAction = (
  m: SlidesMessages,
  action: DraftAction,
  state: SlidesState,
): ActionDescription => ({
  title: action.type,
  targetLabel: slidesTargetLabel(m, state, action.target),
  tone: 'meta',
});

export const serializeSlidesAction = (action: DraftAction): string =>
  `${action.type} ${targetRef(action.target)} ${JSON.stringify(action.payload)}`;

export const slidesCommentTargets = (m: SlidesMessages, state: SlidesState): readonly CommentTargetOption[] =>
  state.slides.map((slide, index) => ({
    value: targetRef({ type: 'slide', id: slide.id }),
    label: slideLabel(slide, index),
    group: m.slideGroup,
  }));

/** The slide on screen: a note written while looking at it is about it. */
export const slidesCurrentTarget = (
  m: SlidesMessages,
  state: SlidesState,
  nav: Navigation,
): CommentTargetOption | null => {
  const index = findSlideIndex(state, nav['slide']);
  const slide = state.slides[index];
  if (slide === undefined) return null;
  return { value: targetRef({ type: 'slide', id: slide.id }), label: slideLabel(slide, index), group: m.slideGroup };
};

/** Always on a slide that exists: the requested one, else the first. */
export const resolveSlidesNavigation = (state: SlidesState, nav: Navigation): Navigation => {
  const slide = state.slides[findSlideIndex(state, nav['slide'])] ?? state.slides[0];
  const next: Record<string, string> = { ...nav };
  if (slide) next['slide'] = slide.id;
  else delete next['slide'];
  return next;
};

export type SlidePosition = {
  readonly slide: Slide;
  /** Zero-based. */
  readonly index: number;
  readonly total: number;
  readonly previous: Slide | undefined;
  readonly next: Slide | undefined;
};

/** Where the navigated slide sits in the deck, or `null` for an empty deck. */
export const slidePosition = (state: SlidesState, nav: Navigation): SlidePosition | null => {
  const found = findSlideIndex(state, nav['slide']);
  const index = found === -1 ? 0 : found;
  const slide = state.slides[index];
  if (slide === undefined) return null;
  return {
    slide,
    index,
    total: state.slides.length,
    previous: state.slides[index - 1],
    next: state.slides[index + 1],
  };
};

export type SlideComment = {
  readonly id: string;
  readonly body: string;
};

/** The comments written on one slide, oldest first; one without a body is skipped. */
export const slideComments = (comments: readonly DraftAction[], slideId: string): readonly SlideComment[] =>
  comments
    .filter(
      (action) => action.type === COMMENT_ACTION && action.target.type === 'slide' && action.target.id === slideId,
    )
    .map((action) => ({ id: action.id, body: commentBody(action) }))
    .filter((comment) => comment.body !== '');
