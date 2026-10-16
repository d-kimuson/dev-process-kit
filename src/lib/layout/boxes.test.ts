import { describe, expect, it } from 'vitest';

import { composeBoxes } from './boxes';

const box = (left: number, top: number, width: number, height: number) => ({ left, top, width, height });

describe('composeBoxes', () => {
  it('frames the parts by their union and places each one relative to it', () => {
    const frame = box(0, 0, 1000, 1000);
    expect(composeBoxes(frame, [box(100, 50, 200, 40), box(100, 90, 200, 300)])).toEqual({
      box: box(100, 50, 200, 340),
      parts: [box(0, 0, 200, 40), box(0, 40, 200, 300)],
    });
  });

  it('cuts the picture to the frame, keeping each part at its own offset', () => {
    // the frame scrolls: the column's last cell runs past its bottom edge
    const frame = box(0, 100, 800, 400);
    expect(composeBoxes(frame, [box(300, 100, 200, 40), box(300, 140, 200, 500)])).toEqual({
      box: box(300, 100, 200, 400),
      parts: [box(0, 0, 200, 40), box(0, 40, 200, 500)],
    });
  });

  it('leaves out the parts wholly outside the frame', () => {
    const frame = box(0, 0, 500, 500);
    expect(composeBoxes(frame, [box(10, 10, 50, 50), box(10, 600, 50, 50)])).toEqual({
      box: box(10, 10, 50, 50),
      parts: [box(0, 0, 50, 50), null],
    });
  });

  it('has no picture when nothing shows in the frame', () => {
    expect(composeBoxes(box(0, 0, 100, 100), [box(200, 200, 10, 10)])).toBeNull();
    expect(composeBoxes(box(0, 0, 100, 100), [])).toBeNull();
  });
});
