/**
 * The one ephemeral UI state of the board, besides the viewport, the pointer
 * gesture and the selected ids: whether an item's text is being typed in
 * place. The comment composer is the chrome's own (`ElementChromeBase`), not
 * tracked here.
 */
export type WbMode =
  | { readonly kind: 'idle' }
  /** The item's text (a frame's title) is being typed in place. */
  | { readonly kind: 'editing'; readonly itemId: string };

export const WB_IDLE: WbMode = { kind: 'idle' };

export const isEditing = (mode: WbMode, itemId: string): boolean => mode.kind === 'editing' && mode.itemId === itemId;
