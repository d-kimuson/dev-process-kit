/**
 * Ephemeral UI state of `<dpk-template-usm>` as one closed union.
 *
 * At most one card is being edited or commented on and at most one drop is
 * waiting for a step choice; encoding that as a single value (instead of four
 * nullable fields) makes the exclusivity a fact of the type. Drag state lives
 * in `DragController` because it is orthogonal and reset by the platform.
 */
export type UsmUiMode =
  | { readonly kind: 'idle' }
  | { readonly kind: 'editing'; readonly storyId: string }
  | { readonly kind: 'commenting'; readonly storyId: string }
  | {
      /** A cross-activity drop: the column named no step, so the reader picks one. */
      readonly kind: 'picking-step';
      readonly storyId: string;
      readonly activityId: string;
      readonly milestoneId: string | undefined;
      readonly point: { readonly x: number; readonly y: number };
    };

export const IDLE_MODE: UsmUiMode = { kind: 'idle' };

/** What a story card can ask its host for. The host maps these to actions. */
export type CardIntent =
  | { readonly kind: 'select' }
  | { readonly kind: 'toggle-edit' }
  | { readonly kind: 'toggle-comment' }
  | { readonly kind: 'dismiss' }
  | { readonly kind: 'rename'; readonly name: string }
  | { readonly kind: 'comment'; readonly body: string }
  | { readonly kind: 'delete' };

/** The slice of the mode a single card renders. */
export type CardMode = 'view' | 'editing' | 'commenting';

export const modeConcerns = (mode: UsmUiMode, storyId: string): boolean => {
  return mode.kind !== 'idle' && mode.storyId === storyId;
};

export const cardModeOf = (mode: UsmUiMode, storyId: string): CardMode => {
  if (!modeConcerns(mode, storyId)) return 'view';
  return mode.kind === 'editing' || mode.kind === 'commenting' ? mode.kind : 'view';
};

/** Pure transition: the next mode after a card reported `intent`. */
export const reduceCardIntent = (mode: UsmUiMode, storyId: string, intent: CardIntent): UsmUiMode => {
  switch (intent.kind) {
    case 'toggle-edit':
      return mode.kind === 'editing' && mode.storyId === storyId ? IDLE_MODE : { kind: 'editing', storyId };
    case 'toggle-comment':
      return mode.kind === 'commenting' && mode.storyId === storyId ? IDLE_MODE : { kind: 'commenting', storyId };
    case 'rename':
    case 'comment':
    case 'dismiss':
    case 'delete':
      return modeConcerns(mode, storyId) ? IDLE_MODE : mode;
    case 'select':
      return mode;
  }
};
