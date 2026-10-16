import { describe, expect, it } from 'vitest';

import { fitPriority } from './priority';

describe('fitPriority', () => {
  const widths = [100, 80, 80, 60];

  it('hides nothing while every item fits', () => {
    // 100 + 80 + 80 + 60 and three gaps of 4
    expect(fitPriority({ widths, available: 332, gap: 4, moreWidth: 34, keep: 0 })).toEqual([]);
  });

  it('hides the trailing items that do not fit beside the more button', () => {
    // 100 + 4 + 80 = 184, and the more button takes 34 (4 + 30) of the 220
    expect(fitPriority({ widths, available: 220, gap: 4, moreWidth: 34, keep: 0 })).toEqual([2, 3]);
  });

  it('keeps the kept item in place and hides the ones before it that no longer fit', () => {
    // 100 + 4 + 60 = 164 fits; 80 more would not
    expect(fitPriority({ widths, available: 200, gap: 4, moreWidth: 34, keep: 3 })).toEqual([1, 2]);
  });

  it('stops at the first item that does not fit, so the order stays readable', () => {
    expect(fitPriority({ widths: [50, 200, 20], available: 150, gap: 0, moreWidth: 30, keep: 0 })).toEqual([1, 2]);
  });

  it('shows the kept item alone when even it does not fit', () => {
    expect(fitPriority({ widths, available: 50, gap: 4, moreWidth: 34, keep: 1 })).toEqual([0, 2, 3]);
  });

  it('fills the room from the start when nothing is kept', () => {
    expect(fitPriority({ widths, available: 220, gap: 4, moreWidth: 34, keep: -1 })).toEqual([2, 3]);
  });

  it('tolerates the sub-pixel rounding of measured widths', () => {
    expect(fitPriority({ widths: [100.4, 100.4], available: 204.5, gap: 4, moreWidth: 34, keep: 0 })).toEqual([]);
  });
});
