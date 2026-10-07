/**
 * The one ephemeral UI state of the board, besides the viewport and the
 * pointer gesture. Selection is navigation (`#item=`), not UI state: it
 * survives a reload and names what a composer note attaches to.
 */
export type WbMode =
  | { readonly kind: 'idle' }
  /** The item's text (a frame's title) is being typed in place. */
  | { readonly kind: 'editing'; readonly itemId: string }
  /** The composer is open for an item or a connector (`item:<id>` / `connector:<id>`). */
  | { readonly kind: 'commenting'; readonly target: string }
  /** "Connect" was picked from the toolbar: the next item clicked is the other end. */
  | { readonly kind: 'connecting'; readonly fromId: string };

export const WB_IDLE: WbMode = { kind: 'idle' };

export const isEditing = (mode: WbMode, itemId: string): boolean => mode.kind === 'editing' && mode.itemId === itemId;

/** What pressing an item does while the board is in `mode`. */
export type ItemPress = 'connect' | 'keep-editing' | 'drag';

export const itemPress = (mode: WbMode, itemId: string): ItemPress => {
  if (mode.kind === 'connecting') return 'connect';
  if (isEditing(mode, itemId)) return 'keep-editing';
  return 'drag';
};
