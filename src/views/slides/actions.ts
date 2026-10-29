import * as v from 'valibot';

import type { ActionInput, DraftAction } from '../../core/types';

import { defineAction, type ActionSpecs, type ViewAction } from '../../core/schema';
import { findSlideIndex, type SlidesState } from './model';

/**
 * The deck's own action vocabulary.
 *
 * A deck is the author's explanation, and almost everything a reader sends back
 * is a comment on it. The exception is the speaker notes: they are the author's
 * material, and a reader who rewrites one asks for a change to the page, not
 * for a remark about it — so it is a patch, listed with the changes rather than
 * with the comments.
 */
export const SET_SLIDE_NOTES = 'SET_SLIDE_NOTES';

export const slideNotesPayloadSchema = v.object({ notes: v.string() });

export const slidesActions = {
  [SET_SLIDE_NOTES]: defineAction(SET_SLIDE_NOTES, 'slide', slideNotesPayloadSchema),
} satisfies ActionSpecs;

/** The discriminated union of this template's actions. */
export type SlidesAction = ViewAction<typeof slidesActions>;

export const slidesAction = {
  setNotes: (id: string, notes: string): ActionInput => ({
    type: SET_SLIDE_NOTES,
    target: { type: 'slide', id },
    payload: { notes },
  }),
};

/**
 * Pure reducer for one action. `null` means "not applicable to this state": a
 * note on a slide the base no longer has stays in the draft as stale, like any
 * other action on a removed target.
 */
export const applySlidesAction = (state: SlidesState, action: DraftAction): SlidesState | null => {
  switch (action.type) {
    case SET_SLIDE_NOTES: {
      if (action.target.type !== 'slide') return null;
      const index = findSlideIndex(state, action.target.id);
      if (index === -1) return null;
      const parsed = slidesActions[SET_SLIDE_NOTES].parse(action);
      if (parsed === null) return null;
      const { notes } = parsed.payload;
      return { ...state, slides: state.slides.map((slide, at) => (at === index ? { ...slide, notes } : slide)) };
    }
    default:
      return null;
  }
};
