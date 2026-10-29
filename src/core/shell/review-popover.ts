/**
 * Where the review opens, and how tall it may be there.
 *
 * The review floats in the top layer beside the floating menu, and the reader
 * can dock that menu to any edge of the screen. Sizing the window by the room
 * below the anchor was enough while the anchor was a button in the header row,
 * but a menu docked at the bottom of the screen has no room below it at all:
 * that measured a zero-height window, drawn as its own border. So the height is
 * the screen's room on the side it opens on, and the side is the one of the two
 * that has more room — below while the anchor is in the upper half, above it
 * once the anchor has been docked low.
 */

/** The gap the review keeps from the anchor, and from the screen's own edges. */
export const REVIEW_GAP = 16;

/** The side of the anchor the review opens on, as the placement that side takes. */
export type ReviewPlacementSide = 'bottom-end' | 'top-end';

/** The anchor's vertical extent, which is all the side and the height depend on. */
export type ReviewAnchor = { readonly top: number; readonly bottom: number };

export type ReviewPlacement = {
  readonly placement: ReviewPlacementSide;
  /** The tallest the review may draw on that side: never past the screen, never below zero. */
  readonly height: number;
};

const roomBelow = (viewportHeight: number, anchor: ReviewAnchor): number => viewportHeight - anchor.bottom - REVIEW_GAP;

const roomAbove = (anchor: ReviewAnchor): number => anchor.top - REVIEW_GAP;

/**
 * The side with the room and the height it holds. Both rooms are measured to
 * the anchor's own edge, so an anchor inside the screen always leaves one of
 * them positive — a menu-sized anchor in the lower half still has the screen
 * above it. The screen's own room bounds the result too, so the window never
 * runs past the edge it opens from; only a viewport shorter than the two gaps
 * leaves nothing to draw into.
 */
export const reviewPlacementAt = (viewportHeight: number, anchor: ReviewAnchor): ReviewPlacement => {
  const below = roomBelow(viewportHeight, anchor);
  const above = roomAbove(anchor);
  const opensBelow = below >= above;
  const room = opensBelow ? below : above;
  return {
    placement: opensBelow ? 'bottom-end' : 'top-end',
    height: Math.max(0, Math.min(viewportHeight - 2 * REVIEW_GAP, room)),
  };
};
