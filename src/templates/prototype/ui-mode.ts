import type { UiTarget } from './model';

/**
 * What the reader writes on an element: feedback is a review comment for the
 * agent, gone once it is answered; a note is kept on the element as part of
 * the prototype (`previews[].notes`).
 */
export type UiCommentKind = 'feedback' | 'note';

/**
 * Commenting on the UI itself: the reader turns the mode on, clicks an element
 * of a preview, and writes a comment anchored to that element. The mode is the
 * reader's ephemeral UI state, never part of the draft or the navigation. It
 * keeps the kind last chosen, so several notes in a row need one choice.
 */
export type UiCommentMode =
  | { readonly kind: 'off' }
  | { readonly kind: 'picking'; readonly as: UiCommentKind }
  | {
      readonly kind: 'composing';
      readonly target: UiTarget;
      readonly body: string;
      readonly as: UiCommentKind;
    };

export type UiCommentIntent =
  | { readonly kind: 'toggle' }
  | { readonly kind: 'exit' }
  | { readonly kind: 'pick'; readonly target: UiTarget }
  | { readonly kind: 'input'; readonly body: string }
  | { readonly kind: 'choose'; readonly as: UiCommentKind }
  /** Closes the composer and keeps picking. */
  | { readonly kind: 'dismiss' }
  /** The comment went into the draft: keep picking for the next one. */
  | { readonly kind: 'submitted' };

export const UI_COMMENT_OFF: UiCommentMode = { kind: 'off' };

export const reduceUiComment = (mode: UiCommentMode, intent: UiCommentIntent): UiCommentMode => {
  switch (intent.kind) {
    case 'toggle':
      return mode.kind === 'off' ? { kind: 'picking', as: 'feedback' } : UI_COMMENT_OFF;
    case 'exit':
      return UI_COMMENT_OFF;
    case 'pick':
      if (mode.kind === 'off') return mode;
      // Picking another element while composing keeps what was already typed.
      return {
        kind: 'composing',
        target: intent.target,
        body: mode.kind === 'composing' ? mode.body : '',
        as: mode.as,
      };
    case 'input':
      return mode.kind === 'composing' ? { ...mode, body: intent.body } : mode;
    case 'choose':
      return mode.kind === 'off' || mode.as === intent.as ? mode : { ...mode, as: intent.as };
    case 'dismiss':
    case 'submitted':
      return mode.kind === 'off' ? mode : { kind: 'picking', as: mode.as };
    default:
      return mode;
  }
};
