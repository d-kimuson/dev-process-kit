import { describe, expect, it } from 'vitest';

import { roundedPathData } from './view';

describe('roundedPathData', () => {
  it('rounds each corner and keeps both ends', () => {
    expect(
      roundedPathData([
        { x: 0, y: 0 },
        { x: 40, y: 0 },
        { x: 40, y: 30 },
      ]),
    ).toBe('M0 0 L34 0 Q40 0 40 6 L40 30');
  });

  it('shrinks the radius to half of a short segment', () => {
    expect(
      roundedPathData([
        { x: 0, y: 0 },
        { x: 8, y: 0 },
        { x: 8, y: 30 },
      ]),
    ).toBe('M0 0 L4 0 Q8 0 8 4 L8 30');
  });

  it('is empty for no points', () => {
    expect(roundedPathData([])).toBe('');
  });
});
