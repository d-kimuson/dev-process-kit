import { describe, expect, it } from 'vitest';

import { routeHugsOutline } from '../src/lib/layout/metrics';
import { routeAroundObstacles } from '../src/lib/layout/orthogonal-router';
import {
  LAYOUT_BENCH_BASELINE,
  LAYOUT_BENCH_CROSSINGS_BASELINE,
  LAYOUT_BENCH_OUTLINE_HUGGING_BASELINE,
  LAYOUT_BENCH_TIME_BASELINE,
} from './layout-bench/baseline';
import { runBench } from './layout-bench/run';

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
