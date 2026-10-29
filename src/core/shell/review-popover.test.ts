import { describe, expect, it } from 'vitest';

import { REVIEW_GAP, reviewPlacementAt } from './review-popover';

/** A laptop screen, tall enough for the two gaps to leave room. */
const VIEWPORT = 900;

describe('review placement', () => {
  it('opens below a toggle in the header row, in the room the screen has there', () => {
    expect(reviewPlacementAt(VIEWPORT, { top: 12, bottom: 48 })).toEqual({
      placement: 'bottom-end',
      height: VIEWPORT - 48 - REVIEW_GAP,
    });
  });

  // The floating menu docks anywhere on the screen: at its bottom edge there is
  // no room below it, which is what sized the window down to nothing.
  it('opens above an anchor docked at the bottom, on the screen the anchor leaves', () => {
    const anchor = { top: 842, bottom: 888 };
    const { placement, height } = reviewPlacementAt(VIEWPORT, anchor);
    expect(placement).toBe('top-end');
    expect(height).toBe(anchor.top - REVIEW_GAP);
    // Clears the anchor by the popover's own offset and still fits the screen.
    expect(height + REVIEW_GAP * 2).toBeLessThanOrEqual(VIEWPORT);
  });

  it('never asks for more room than the screen has, whatever the anchor says', () => {
    expect(reviewPlacementAt(VIEWPORT, { top: VIEWPORT, bottom: VIEWPORT }).height).toBe(VIEWPORT - 2 * REVIEW_GAP);
    expect(reviewPlacementAt(0, { top: 0, bottom: 0 }).height).toBe(0);
  });
});
