import { describe, expect, it } from 'vitest';

import type { LayoutPoint } from './layered';

import { placeEdgeLabels } from './edge-labels';

const size = { width: 40, height: 18 };

describe('placeEdgeLabels', () => {
  it('puts a label on its own line when the line has room', () => {
    const line: readonly LayoutPoint[] = [
      { x: 0, y: 100 },
      { x: 300, y: 100 },
    ];
    const placed = placeEdgeLabels([{ id: 'e', points: line, size }], {
      boxes: [],
      zones: [],
      lines: new Map([['e', line]]),
    });
    const label = placed.get('e');
    expect(label?.onLine).toBe(true);
    // A short horizontal line's label sits on the line's own y.
    expect(label?.center.y).toBe(100);
  });

  it('falls to the side when the line is too covered to sit on', () => {
    const line: readonly LayoutPoint[] = [
      { x: 0, y: 100 },
      { x: 300, y: 100 },
    ];
    // A thin box right over the line's own row blocks the on-line spots but
    // leaves the row just above free.
    const placed = placeEdgeLabels([{ id: 'e', points: line, size }], {
      boxes: [{ x: -10, y: 96, width: 320, height: 8 }],
      zones: [],
      lines: new Map([['e', line]]),
    });
    const label = placed.get('e');
    expect(label?.onLine).toBe(false);
    expect(label?.center.y).toBeLessThan(100);
  });

  it('keeps a label clear of an end zone', () => {
    const line: readonly LayoutPoint[] = [
      { x: 0, y: 100 },
      { x: 300, y: 100 },
    ];
    const placed = placeEdgeLabels([{ id: 'e', points: line, size }], {
      boxes: [],
      zones: [{ x: 130, y: 90, width: 40, height: 20 }],
      lines: new Map([['e', line]]),
    });
    const label = placed.get('e');
    expect(label).toBeDefined();
    const left = (label?.center.x ?? 0) - size.width / 2;
    const right = (label?.center.x ?? 0) + size.width / 2;
    expect(right <= 130 || left >= 170).toBe(true);
  });

  it('separates two labels on the same line', () => {
    const line: readonly LayoutPoint[] = [
      { x: 0, y: 100 },
      { x: 300, y: 100 },
    ];
    const placed = placeEdgeLabels(
      [
        { id: 'a', points: line, size },
        { id: 'b', points: line, size },
      ],
      {
        boxes: [],
        zones: [],
        lines: new Map([
          ['a', line],
          ['b', line],
        ]),
      },
    );
    const a = placed.get('a')?.center;
    const b = placed.get('b')?.center;
    expect(a).toBeDefined();
    expect(b).toBeDefined();
    expect(a?.x).not.toBe(b?.x);
  });

  it('places the priority label where the other cannot take its spot', () => {
    const line: readonly LayoutPoint[] = [
      { x: 0, y: 100 },
      { x: 300, y: 100 },
    ];
    const placed = placeEdgeLabels(
      [
        { id: 'low', points: line, size, priority: 0 },
        { id: 'high', points: line, size, priority: 1 },
      ],
      {
        boxes: [],
        zones: [],
        lines: new Map([
          ['low', line],
          ['high', line],
        ]),
      },
    );
    // Both land somewhere; the point is a priority label is never left unplaced.
    expect(placed.size).toBe(2);
    expect(placed.get('high')?.center.x).toBe(150);
  });

  it('falls back to the route middle for a route too short to offer a spot', () => {
    const line: readonly LayoutPoint[] = [
      { x: 0, y: 0 },
      { x: 5, y: 0 },
    ];
    const placed = placeEdgeLabels([{ id: 'e', points: line, size }], {
      boxes: [],
      zones: [],
      lines: new Map([['e', line]]),
    });
    expect(placed.get('e')?.center).toEqual({ x: 5, y: 0 });
  });

  it('sits a label above a horizontal run rather than on it when nothing else forces a choice', () => {
    // A wide label on a short run cannot fit its halo on the line; the cheapest
    // available spot is just above it, where a reader looks for a caption.
    const line: readonly LayoutPoint[] = [
      { x: 0, y: 100 },
      { x: 40, y: 100 },
    ];
    const placed = placeEdgeLabels([{ id: 'e', points: line, size: { width: 80, height: 18 } }], {
      boxes: [],
      zones: [],
      lines: new Map([['e', line]]),
    });
    const label = placed.get('e');
    expect(label).toBeDefined();
    expect(label?.center.y).toBeLessThan(100);
  });
});
