/**
 * Ephemeral UI state of `<artifact-example-mapping>` as one closed union.
 *
 * At most one card is being edited or commented on; encoding that as a single
 * value (instead of nullable fields) makes the exclusivity a fact of the type.
 * `editing` only asks a card to put the caret into its name (a freshly added
 * card); clicking a card's text edits it in place without any mode. Drag state
 * lives in `DragController` because it is orthogonal and reset by the platform.
 */
export type ExampleMappingUiMode =
  | { readonly kind: 'idle' }
  | { readonly kind: 'editing'; readonly cardId: string }
  | { readonly kind: 'commenting'; readonly cardId: string };

export const IDLE_MODE: ExampleMappingUiMode = { kind: 'idle' };

/** What a mapping card can ask its host for. The host maps these to actions. */
export type MappingCardIntent =
  | { readonly kind: 'select' }
  | { readonly kind: 'toggle-comment' }
  | { readonly kind: 'dismiss' }
  | { readonly kind: 'rename'; readonly name: string }
  | { readonly kind: 'comment'; readonly body: string }
  | { readonly kind: 'delete' };

/** The slice of the mode a single card renders. */
export type MappingCardMode = 'view' | 'editing' | 'commenting';

export const modeConcerns = (mode: ExampleMappingUiMode, cardId: string): boolean => {
  return mode.kind !== 'idle' && mode.cardId === cardId;
};

export const cardModeOf = (mode: ExampleMappingUiMode, cardId: string): MappingCardMode => {
  if (!modeConcerns(mode, cardId)) return 'view';
  return mode.kind === 'editing' || mode.kind === 'commenting' ? mode.kind : 'view';
};

/** Pure transition: the next mode after a card reported `intent`. */
export const reduceCardIntent = (
  mode: ExampleMappingUiMode,
  cardId: string,
  intent: MappingCardIntent,
): ExampleMappingUiMode => {
  switch (intent.kind) {
    case 'toggle-comment':
      return mode.kind === 'commenting' && mode.cardId === cardId ? IDLE_MODE : { kind: 'commenting', cardId };
    case 'rename':
    case 'comment':
    case 'dismiss':
    case 'delete':
      return modeConcerns(mode, cardId) ? IDLE_MODE : mode;
    case 'select':
      return mode;
  }
};
