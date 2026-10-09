import { describe, expect, it } from 'vitest';

import { gutterBottom, layoutBadges, type BadgeGroup } from './badge-layout';

const layer = { width: 600, height: 800, badgeHeight: 22 };

const group = (overrides: Partial<BadgeGroup>): BadgeGroup => ({
  target: { left: 100, top: 100, right: 300, bottom: 140 },
  widths: [30],
  gutter: false,
  ...overrides,
});

describe('layoutBadges', () => {
  it('puts a badge on the top-right corner of a diagram node', () => {
    const [placed] = layoutBadges([group({})], layer);
    expect(placed).toEqual([{ x: 300 + 8 - 30, y: 100 - 11 }]);
  });

  it('lines several badges up leftwards from the corner, the last one rightmost', () => {
    const [placed] = layoutBadges([group({ widths: [30, 30] })], layer);
    expect(placed).toEqual([
      { x: 278 - 35, y: 89 },
      { x: 278, y: 89 },
    ]);
  });

  it('wraps badges that would run past the left of a narrow node into rows above, instead of piling them up', () => {
    const narrow = { left: 200, top: 300, right: 260, bottom: 340 };
    const [placed = []] = layoutBadges([group({ target: narrow, widths: [30, 30, 30, 30] })], layer);
    const xs = new Set(placed.map((point) => point.x));
    const ys = new Set(placed.map((point) => point.y));
    expect(xs.size).toBe(2);
    expect(ys.size).toBe(2);
    expect(Math.min(...placed.map((point) => point.y))).toBeLessThan(300 - 11);
    // No two badges share a spot.
    expect(new Set(placed.map((point) => `${point.x},${point.y}`)).size).toBe(4);
  });

  it('keeps every badge inside the layer', () => {
    const edge = { left: 0, top: 0, right: 20, bottom: 30 };
    const [placed = []] = layoutBadges([group({ target: edge, widths: [30] })], layer);
    expect(placed[0]).toEqual({ x: 0, y: 0 });
  });

  it('puts the badges of the author’s own markup in the right-hand gutter, beside the line they mark', () => {
    const [placed] = layoutBadges([group({ gutter: true, widths: [30, 36] })], layer);
    expect(placed).toEqual([
      { x: 600 - 30, y: 100 },
      { x: 600 - 36, y: 100 + 22 + 4 },
    ]);
  });

  it('pushes a gutter badge below the ones of a target above it rather than overlapping them', () => {
    const first = group({ gutter: true, widths: [30, 30, 30], target: { left: 0, top: 100, right: 500, bottom: 120 } });
    const second = group({ gutter: true, widths: [30], target: { left: 0, top: 120, right: 500, bottom: 140 } });
    // Given in any order: the gutter fills from the top down.
    const [placed] = layoutBadges([second, first], layer);
    expect(placed).toEqual([{ x: 570, y: 100 + 3 * 26 }]);
  });

  it('lets a long gutter column run below a short stage instead of piling its badges up at the bottom', () => {
    const short = { width: 600, height: 60, badgeHeight: 22 };
    const many = group({
      gutter: true,
      widths: Array.from({ length: 5 }, () => 30),
      target: { left: 0, top: 10, right: 500, bottom: 50 },
    });
    const [placed = []] = layoutBadges([many], short);
    expect(placed.map((point) => point.y)).toEqual([10, 36, 62, 88, 114]);
  });
});

describe('gutterBottom', () => {
  it('is where the last gutter badge ends', () => {
    const many = group({
      gutter: true,
      widths: Array.from({ length: 5 }, () => 30),
      target: { left: 0, top: 10, right: 500, bottom: 50 },
    });
    expect(gutterBottom([many], { width: 600, height: 60, badgeHeight: 22 })).toBe(114 + 22);
  });

  it('is 0 with only corner badges, which hang off their node', () => {
    expect(gutterBottom([group({ widths: [30, 30, 30, 30] })], layer)).toBe(0);
  });
});
