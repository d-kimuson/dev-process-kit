import { describe, expect, it } from 'vitest';

import {
  clampSupplementHeight,
  draggedSupplementHeight,
  keyedSupplementHeight,
  parseSupplementHeight,
  SUPPLEMENT_HEIGHT,
  supplementHeightMax,
} from './supplement-height';

const WINDOW = 800;

describe('supplement drawer height', () => {
  it('leaves the page above the drawer room to show', () => {
    expect(supplementHeightMax(WINDOW)).toBe(WINDOW - 160);
    // A window shorter than the reserve still leaves the drawer its minimum.
    expect(supplementHeightMax(120)).toBe(SUPPLEMENT_HEIGHT.min);
  });

  it('holds a height between the minimum and what the window leaves', () => {
    expect(clampSupplementHeight(320, WINDOW)).toBe(320);
    expect(clampSupplementHeight(10, WINDOW)).toBe(SUPPLEMENT_HEIGHT.min);
    expect(clampSupplementHeight(5_000, WINDOW)).toBe(WINDOW - 160);
    expect(clampSupplementHeight(300.4, WINDOW)).toBe(300);
  });

  it('follows the pointer on the top edge: dragging up makes the drawer taller', () => {
    const drag = { startY: 500, startHeight: 320 };
    expect(draggedSupplementHeight(drag, 400, WINDOW)).toBe(420);
    expect(draggedSupplementHeight(drag, 600, WINDOW)).toBe(220);
    expect(draggedSupplementHeight(drag, 0, WINDOW)).toBe(WINDOW - 160);
    expect(draggedSupplementHeight(drag, 5_000, WINDOW)).toBe(SUPPLEMENT_HEIGHT.min);
  });

  it('moves by a step with the arrows, and to the ends with Home and End', () => {
    expect(keyedSupplementHeight(320, { key: 'ArrowUp', shiftKey: false }, WINDOW)).toBe(344);
    expect(keyedSupplementHeight(320, { key: 'ArrowUp', shiftKey: true }, WINDOW)).toBe(416);
    expect(keyedSupplementHeight(320, { key: 'ArrowDown', shiftKey: false }, WINDOW)).toBe(296);
    expect(keyedSupplementHeight(320, { key: 'ArrowDown', shiftKey: true }, WINDOW)).toBe(224);
    expect(keyedSupplementHeight(320, { key: 'Home', shiftKey: false }, WINDOW)).toBe(SUPPLEMENT_HEIGHT.min);
    expect(keyedSupplementHeight(320, { key: 'End', shiftKey: false }, WINDOW)).toBe(WINDOW - 160);
    expect(keyedSupplementHeight(SUPPLEMENT_HEIGHT.min, { key: 'ArrowDown', shiftKey: false }, WINDOW)).toBe(
      SUPPLEMENT_HEIGHT.min,
    );
    // Other keys belong to the page.
    expect(keyedSupplementHeight(320, { key: 'PageDown', shiftKey: false }, WINDOW)).toBeNull();
    expect(keyedSupplementHeight(320, { key: 'Enter', shiftKey: false }, WINDOW)).toBeNull();
  });

  it('reads a stored height, refusing what is not one', () => {
    expect(parseSupplementHeight(410)).toBe(410);
    expect(parseSupplementHeight(410.6)).toBe(411);
    expect(parseSupplementHeight(SUPPLEMENT_HEIGHT.min - 1)).toBeNull();
    expect(parseSupplementHeight(Number.NaN)).toBeNull();
    expect(parseSupplementHeight(Number.POSITIVE_INFINITY)).toBeNull();
    expect(parseSupplementHeight('420')).toBeNull();
    expect(parseSupplementHeight(null)).toBeNull();
  });
});
