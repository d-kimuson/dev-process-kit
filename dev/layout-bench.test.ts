import { describe, expect, it } from 'vitest';

import type { LayoutPoint } from '../src/lib/layout/layered';

import { parseErData } from '../src/boards/er-diagram/model';
import { END_GLYPH_REACH, endGlyph } from '../src/boards/er-diagram/notation';
import { routeHugsOutline } from '../src/lib/layout/metrics';
import { routeAroundObstacles } from '../src/lib/layout/orthogonal-router';
import {
  LAYOUT_BENCH_BASELINE,
  LAYOUT_BENCH_CROSSINGS_BASELINE,
  LAYOUT_BENCH_OUTLINE_HUGGING_BASELINE,
  LAYOUT_BENCH_TIME_BASELINE,
} from './layout-bench/baseline';
import { geometryOf } from './layout-bench/geometry';
import { FIXTURES, runBench } from './layout-bench/run';

/**
 * Regression ratchet for ER layout quality: fails if any fixture's
 * layout-complexity score (`src/lib/layout/metrics.ts`'s `scoreLayout`)
 * exceeds the recorded baseline. The baseline only ever ratchets down — see
 * `dev/layout-bench/baseline.ts` for how to update it.
 *
 * A small relative tolerance absorbs floating-point noise across machines/CI
 * without masking a real regression.
 */
const TOLERANCE = 1e-6;

describe('layout bench ratchet', () => {
  const rows = runBench();

  it('covers every fixture the baseline expects, and no others', () => {
    const rowNames = new Set(rows.map((row) => row.name));
    expect(rowNames).toStrictEqual(new Set(Object.keys(LAYOUT_BENCH_BASELINE)));
  });

  it.each(rows)('$name does not regress past its baseline score', (row) => {
    const baseline = LAYOUT_BENCH_BASELINE[row.name];
    expect(baseline).toBeDefined();
    expect(row.total).toBeLessThanOrEqual(baseline! * (1 + TOLERANCE));
  });

  it.each(rows)('$name has zero hard overlaps', (row) => {
    expect(row.overlaps).toBe(0);
  });

  /**
   * A second, independent ratchet alongside the weighted total: raw edge
   * crossings may never increase for a fixture, even when the weighted total
   * falls. This is what let #148's regression through the first time (a
   * trade that lowered `collinearOverlap` while raising `crossings` still
   * reduced the total, because the crossing weight was too low relative to
   * collinear overlap) — see `dev/layout-bench/baseline.ts`.
   */
  it.each(rows)('$name does not regress past its baseline crossing count', (row) => {
    const baseline = LAYOUT_BENCH_CROSSINGS_BASELINE[row.name];
    expect(baseline).toBeDefined();
    expect(row.crossings).toBeLessThanOrEqual(baseline!);
  });

  /**
   * A third, independent ratchet: a route drawn on top of (within clearance
   * of, and parallel to) a node's or a frame's outline is #151's actual
   * readability complaint, and it is possible to trade it away for a cheaper
   * weighted total elsewhere, so it is checked on its own raw incident count
   * too — see `dev/layout-bench/baseline.ts`.
   */
  it.each(rows)('$name does not regress past its baseline outline-hugging incident count', (row) => {
    const baseline = LAYOUT_BENCH_OUTLINE_HUGGING_BASELINE[row.name];
    expect(baseline).toBeDefined();
    expect(row.outlineHugging.incidents).toBeLessThanOrEqual(baseline!);
  });

  /**
   * A fourth, independent ratchet (#152): layout/routing time itself, not
   * just layout quality. Deliberately loose (see
   * `LAYOUT_BENCH_TIME_BASELINE`'s own doc comment) — it exists to catch a
   * reintroduced expensive lever (a multi-x jump), not to chase ordinary
   * run-to-run timing noise.
   */
  it.each(rows)('$name does not regress past its baseline layout/routing time', (row) => {
    const baseline = LAYOUT_BENCH_TIME_BASELINE[row.name];
    expect(baseline).toBeDefined();
    expect(row.layoutMs).toBeLessThanOrEqual(baseline!.layoutMs);
    expect(row.routingMs).toBeLessThanOrEqual(baseline!.routingMs);
  });
});

/**
 * #151/#152: the router prefers a shape that does not hug a border when the
 * competing shapes tie on every higher-priority cost. Hug avoidance used to
 * be unconditional; the v0.3 loop ranks crossings and shared-lane overlap
 * above it (a hug is a readability cost, a crossing is the reader's top
 * complaint; two lines in one lane cannot be told apart at all), so this
 * guards the tie-break that remains rather than claiming it is absolute.
 */
describe('outline-hugging preference', () => {
  it('prefers a non-hugging shape when crossings, parallel runs and length tie', () => {
    // The vertical-first L runs at x = 0, six pixels from this outline's left
    // border: a hug (within OUTLINE_HUG_CLEARANCE, longer than
    // MIN_HUG_OVERLAP) but not zero-gap contact. The horizontal-first L
    // clears both, and has the same length, crossings and parallel cost.
    const outline = { x: 6, y: 50, width: 10, height: 100 };
    const route = routeAroundObstacles({ x: 0, y: 0 }, { x: 100, y: 100 }, [], 0, [], [outline]);
    expect(routeHugsOutline(route, [outline])).toBe(false);
  });
});

/**
 * The reader's ER report: "a relation line begins at a point separate from the
 * source-side circle/marker". `notation.ts` lays every end glyph along the
 * port's own outgoing direction, so the one thing the drawn route must
 * guarantee is that the stroke leaves (and reaches) each port *straight* for
 * the glyph's whole reach — otherwise the crow's foot and its "zero" circle
 * are drawn beside the line's first bend.
 *
 * Checked over the whole fixture corpus rather than one hand-built case
 * because the two ways it can break are both batch effects: a route that
 * turns sooner than the glyph is long, and — the one that survived the first
 * fix — a `nudgeParallelRoutes` track that slides toward its port and eats
 * into the stub. `er-complex` (the real `lp/er-diagram.html` sample, both
 * snapshots, so removed/added/changed relations too) is where that showed up.
 */
describe('end glyphs are drawn on the stroke', () => {
  const TOLERANCE = 0.75;

  /** Distance from a point to the nearest point of a polyline. */
  const distanceToRoute = (points: readonly LayoutPoint[], point: LayoutPoint): number => {
    let best = Number.POSITIVE_INFINITY;
    for (let index = 1; index < points.length; index++) {
      const a = points[index - 1]!;
      const b = points[index]!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const length = dx * dx + dy * dy;
      const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / length));
      best = Math.min(best, Math.hypot(point.x - (a.x + dx * t), point.y - (a.y + dy * t)));
    }
    return best;
  };

  /** Distance from a segment to the nearest point of a polyline. */
  const distanceOfSegment = (points: readonly LayoutPoint[], a: LayoutPoint, b: LayoutPoint): number =>
    Math.min(
      ...Array.from({ length: 17 }, (_, step) =>
        distanceToRoute(points, {
          x: a.x + ((b.x - a.x) * step) / 16,
          y: a.y + ((b.y - a.y) * step) / 16,
        }),
      ),
    );

  it.each(FIXTURES)('$name leaves each port straight for the end glyph and draws it on the line', (fixture) => {
    const data = parseErData(fixture.input);
    const { geometry } = geometryOf(data);
    const cardinalityById = new Map(data.edges.map((edge) => [edge.id, edge.cardinality] as const));
    expect(geometry.edges.length).toBeGreaterThan(0);
    for (const edge of geometry.edges) {
      const points = edge.points;
      const cardinality = cardinalityById.get(edge.id);
      expect(cardinality).toBeDefined();
      expect(points.length).toBeGreaterThan(1);
      const route = [...points];
      for (const end of ['start', 'end'] as const) {
        const tip = end === 'start' ? route[0]! : route.at(-1)!;
        const inner = end === 'start' ? route[1]! : route[route.length - 2]!;
        // Through a port the stroke runs along one axis only, and far enough for the glyph.
        expect(tip.x === inner.x || tip.y === inner.y).toBe(true);
        expect(Math.hypot(inner.x - tip.x, inner.y - tip.y)).toBeGreaterThanOrEqual(END_GLYPH_REACH);
        const glyph = endGlyph(route, end, end === 'start' ? cardinality!.parent : cardinality!.child);
        // `0` for an end with no "zero" circle: nothing to be off the line.
        const circleOff = glyph.circle === null ? 0 : distanceToRoute(route, glyph.circle);
        expect(circleOff).toBeLessThanOrEqual(TOLERANCE);
        for (const [a, b] of glyph.segments) {
          expect(distanceOfSegment(route, a, b)).toBeLessThanOrEqual(TOLERANCE);
        }
      }
    }
  });
});
