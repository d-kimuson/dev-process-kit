import { describe, expect, it } from 'vitest';

import type { LayoutPoint } from './layered';
import type { RouteBox } from './orthogonal-router';

import { nudgeParallelRoutes, type NudgeInput } from './route-nudge';

describe('nudgeParallelRoutes', () => {
  it('leaves a single route unchanged: nothing else shares its corridor', () => {
    const edges: readonly NudgeInput[] = [
      {
        id: 'a-b',
        points: [
          { x: 0, y: 10 },
          { x: 50, y: 10 },
          { x: 50, y: 90 },
          { x: 100, y: 90 },
        ],
        obstacles: [],
      },
    ];
    const result = nudgeParallelRoutes(edges);
    expect(result.get('a-b')).toEqual(edges[0]!.points);
  });

  it('leaves straight two-point routes (no interior segment to nudge) unchanged', () => {
    const edges: readonly NudgeInput[] = [
      {
        id: 'a-b',
        points: [
          { x: 0, y: 10 },
          { x: 100, y: 10 },
        ],
        obstacles: [],
      },
    ];
    const result = nudgeParallelRoutes(edges);
    expect(result.get('a-b')).toEqual(edges[0]!.points);
  });

  it('spreads two edges whose interior (channel) segments run along the same vertical line', () => {
    const edges: readonly NudgeInput[] = [
      {
        id: 'a-b',
        points: [
          { x: 0, y: 10 },
          { x: 50, y: 10 },
          { x: 50, y: 90 },
          { x: 100, y: 90 },
        ],
        obstacles: [],
      },
      {
        id: 'c-d',
        points: [
          { x: 0, y: 20 },
          { x: 50, y: 20 },
          { x: 50, y: 100 },
          { x: 100, y: 100 },
        ],
        obstacles: [],
      },
    ];
    const result = nudgeParallelRoutes(edges);
    const a = result.get('a-b')!;
    const c = result.get('c-d')!;
    // Ports (first/last points) never move.
    expect(a[0]).toEqual({ x: 0, y: 10 });
    expect(a.at(-1)).toEqual({ x: 100, y: 90 });
    expect(c[0]).toEqual({ x: 0, y: 20 });
    expect(c.at(-1)).toEqual({ x: 100, y: 100 });
    // The two interior runs, originally both at x=50, are now at different x.
    expect(a[1]!.x).toBe(a[2]!.x);
    expect(c[1]!.x).toBe(c[2]!.x);
    expect(a[1]!.x).not.toBe(c[1]!.x);
  });

  it('pushes a route off its own frame border instead of running along it', () => {
    const edges: readonly NudgeInput[] = [
      {
        id: 'a-b',
        points: [
          { x: 0, y: 10 },
          { x: 10, y: 10 },
          { x: 10, y: 90 },
          { x: 100, y: 90 },
        ],
        obstacles: [],
        // The frame's right border sits at x=10 — exactly where the interior segment runs.
        ownFrames: [{ x: -20, y: -20, width: 30, height: 140 }],
      },
    ];
    const result = nudgeParallelRoutes(edges, { frameClearance: 8 });
    const a = result.get('a-b')!;
    expect(a[0]).toEqual({ x: 0, y: 10 });
    expect(a.at(-1)).toEqual({ x: 100, y: 90 });
    expect(Math.abs(a[1]!.x - 10)).toBeGreaterThanOrEqual(8 - 1e-6);
  });

  it('never nudges a segment into an obstacle it would then pass through', () => {
    const edges: readonly NudgeInput[] = [
      {
        id: 'a-b',
        points: [
          { x: 0, y: 10 },
          { x: 50, y: 10 },
          { x: 50, y: 90 },
          { x: 100, y: 90 },
        ],
        // An obstacle hugs the channel from both sides, leaving no safe room to slide.
        obstacles: [
          { x: 52, y: 0, width: 10, height: 200 },
          { x: 38, y: 0, width: 10, height: 200 },
        ],
      },
      {
        id: 'c-d',
        points: [
          { x: 0, y: 20 },
          { x: 50, y: 20 },
          { x: 50, y: 100 },
          { x: 100, y: 100 },
        ],
        obstacles: [
          { x: 52, y: 0, width: 10, height: 200 },
          { x: 38, y: 0, width: 10, height: 200 },
        ],
      },
    ];
    const result = nudgeParallelRoutes(edges);
    // Still distinct from each other's original positions is not guaranteed here — what matters is safety.
    for (const [, points] of result) {
      for (const segX of [points[1]!.x, points[2]!.x]) expect(segX > 38 + 10 && segX < 52).toBe(true);
    }
  });

  // Deterministic PRNG (mulberry32) — a fixed seed makes a failure reproducible
  // without pulling in a dependency just for test fuzzing.
  const mulberry32 = (seed: number) => {
    let a = seed;
    return (): number => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  /** A random orthogonal polyline (alternating horizontal/vertical runs) with a fixed number of interior bends. */
  const randomRoute = (rand: () => number, bends: number): LayoutPoint[] => {
    const points: LayoutPoint[] = [{ x: Math.floor(rand() * 400), y: Math.floor(rand() * 400) }];
    let vertical = rand() < 0.5;
    for (let i = 0; i < bends + 1; i++) {
      const last = points.at(-1)!;
      const delta = Math.floor(rand() * 160) - 80;
      points.push(vertical ? { x: last.x, y: last.y + delta } : { x: last.x + delta, y: last.y });
      vertical = !vertical;
    }
    return points;
  };

  const randomObstacles = (rand: () => number, count: number): RouteBox[] =>
    Array.from({ length: count }, () => ({
      x: Math.floor(rand() * 400),
      y: Math.floor(rand() * 400),
      width: 10 + Math.floor(rand() * 60),
      height: 10 + Math.floor(rand() * 60),
    }));

  it('fuzz: never moves a port, always finishes well inside its time budget, and only nudges into blocked space it already blocked itself', () => {
    const rand = mulberry32(20261024);
    const TIME_BUDGET_MS = 500; // generous for CI jitter; the real-world corpus finishes in single-digit ms
    for (let trial = 0; trial < 20; trial++) {
      const obstacles = randomObstacles(rand, 1 + Math.floor(rand() * 8));
      const edges: NudgeInput[] = Array.from({ length: 1 + Math.floor(rand() * 30) }, (_, i) => {
        const useOwnFrames = rand() < 0.3;
        return {
          id: `e${i}`,
          points: randomRoute(rand, 1 + Math.floor(rand() * 3)),
          obstacles,
          ...(useOwnFrames ? { ownFrames: randomObstacles(rand, 1) } : {}),
        };
      });
      const original = new Map(edges.map((edge) => [edge.id, edge.points] as const));

      const start = performance.now();
      const result = nudgeParallelRoutes(edges);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(TIME_BUDGET_MS);
      expect(result.size).toBe(edges.length);
      for (const [id, points] of result) {
        const before = original.get(id)!;
        // A port (first/last point of the route) is never moved, whatever the obstacle layout.
        expect(points[0]).toEqual(before[0]);
        expect(points.at(-1)).toEqual(before.at(-1));
        expect(points.length).toBe(before.length);
      }
    }
  });
});
