import { describe, expect, it } from 'vitest';

import { type RouteBox, type RoutePoint, routeAroundObstacles } from './orthogonal-router';

/** Every segment of `points` is axis-aligned (a precondition the router must always satisfy). */
const isOrthogonal = (points: readonly RoutePoint[]): boolean =>
  points.every((p, i) => {
    const prev = points[i - 1];
    return prev === undefined || prev.x === p.x || prev.y === p.y;
  });

/** Whether a vertical or horizontal segment's open interior passes through a box. */
const segmentHitsBox = (a: RoutePoint, b: RoutePoint, box: RouteBox): boolean => {
  if (a.x === b.x) {
    const x = a.x;
    const top = Math.min(a.y, b.y);
    const bottom = Math.max(a.y, b.y);
    return x > box.x && x < box.x + box.width && Math.max(box.y, top) < Math.min(box.y + box.height, bottom);
  }
  const y = a.y;
  const left = Math.min(a.x, b.x);
  const right = Math.max(a.x, b.x);
  return y > box.y && y < box.y + box.height && Math.max(box.x, left) < Math.min(box.x + box.width, right);
};

/** A route hits a box when any of its segments passes through that box's interior. */
const routeHitsBox = (points: readonly RoutePoint[], box: RouteBox): boolean =>
  points.some((p, i) => {
    const prev = points[i - 1];
    return prev !== undefined && segmentHitsBox(prev, p, box);
  });

describe('routeAroundObstacles', () => {
  it('returns a direct line when the ports already line up and nothing is in the way', () => {
    expect(routeAroundObstacles({ x: 0, y: 100 }, { x: 500, y: 100 }, [], 20)).toEqual([
      { x: 0, y: 100 },
      { x: 500, y: 100 },
    ]);
  });

  it('returns a single L-bend when nothing blocks either orientation', () => {
    const route = routeAroundObstacles({ x: 0, y: 100 }, { x: 200, y: 160 }, [], 20);
    expect(isOrthogonal(route)).toBe(true);
    expect(route[0]).toEqual({ x: 0, y: 100 });
    expect(route.at(-1)).toEqual({ x: 200, y: 160 });
    expect(route.length).toBe(3);
  });

  it('keeps a straight line when a box sits clear of it', () => {
    const box = { x: 300, y: 0, width: 100, height: 40 };
    expect(routeAroundObstacles({ x: 0, y: 100 }, { x: 800, y: 100 }, [box], 20)).toEqual([
      { x: 0, y: 100 },
      { x: 800, y: 100 },
    ]);
  });

  it('detours around a single box between two left-to-right ports', () => {
    const box = { x: 300, y: 40, width: 200, height: 220 };
    const route = routeAroundObstacles({ x: 0, y: 100 }, { x: 800, y: 40 }, [box], 20);
    expect(isOrthogonal(route)).toBe(true);
    expect(route[0]).toEqual({ x: 0, y: 100 });
    expect(route.at(-1)).toEqual({ x: 800, y: 40 });
    expect(routeHitsBox(route, box)).toBe(false);
  });

  it('detours around a box stacked between two other boxes', () => {
    const upper = { x: 300, y: 0, width: 200, height: 90 };
    const lower = { x: 300, y: 130, width: 200, height: 200 };
    const route = routeAroundObstacles({ x: 0, y: 100 }, { x: 800, y: 100 }, [upper, lower], 20);
    expect(routeHitsBox(route, upper)).toBe(false);
    expect(routeHitsBox(route, lower)).toBe(false);
  });

  it('routes around an obstacle directly below the start, going to a port above it (a 2D, non-forward case)', () => {
    // The end sits above and to the side of the start, with a box squarely between them —
    // the case layered.ts's old forward/backward routing had no answer for.
    const box = { x: 100, y: 100, width: 200, height: 200 };
    const route = routeAroundObstacles({ x: 150, y: 350 }, { x: 250, y: 50 }, [box], 10);
    expect(isOrthogonal(route)).toBe(true);
    expect(route[0]).toEqual({ x: 150, y: 350 });
    expect(route.at(-1)).toEqual({ x: 250, y: 50 });
    expect(routeHitsBox(route, box)).toBe(false);
  });

  it('routes around a box directly between two vertically aligned ports', () => {
    const box = { x: 50, y: 150, width: 300, height: 60 };
    const route = routeAroundObstacles({ x: 200, y: 0 }, { x: 200, y: 400 }, [box], 15);
    expect(route[0]).toEqual({ x: 200, y: 0 });
    expect(route.at(-1)).toEqual({ x: 200, y: 400 });
    expect(routeHitsBox(route, box)).toBe(false);
  });

  it('finds a path through a corridor between several obstacles packed in 2D', () => {
    const boxes: RouteBox[] = [
      { x: 100, y: 0, width: 80, height: 120 },
      { x: 100, y: 160, width: 80, height: 120 },
      { x: 240, y: 40, width: 80, height: 200 },
      { x: 380, y: 0, width: 80, height: 320 },
    ];
    const route = routeAroundObstacles({ x: 0, y: 60 }, { x: 500, y: 300 }, boxes, 10);
    expect(isOrthogonal(route)).toBe(true);
    for (const box of boxes) expect(routeHitsBox(route, box)).toBe(false);
  });

  it('never clips the start or end node themselves when they are excluded from obstacles', () => {
    // Caller contract: `boxes` must already exclude the edge's own endpoints.
    const route = routeAroundObstacles({ x: 0, y: 0 }, { x: 300, y: 300 }, [], 20);
    expect(route[0]).toEqual({ x: 0, y: 0 });
    expect(route.at(-1)).toEqual({ x: 300, y: 300 });
  });

  it('returns the two endpoints unchanged when they coincide', () => {
    expect(routeAroundObstacles({ x: 10, y: 10 }, { x: 10, y: 10 }, [{ x: 0, y: 0, width: 5, height: 5 }], 5)).toEqual([
      { x: 10, y: 10 },
      { x: 10, y: 10 },
    ]);
  });
});
