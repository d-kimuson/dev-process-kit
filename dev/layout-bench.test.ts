import { describe, expect, it } from 'vitest';

import { parseErData } from '../src/components/er-diagram/model';
import { routeHugsOutline } from '../src/lib/layout/metrics';
import {
  LAYOUT_BENCH_BASELINE,
  LAYOUT_BENCH_CROSSINGS_BASELINE,
  LAYOUT_BENCH_OUTLINE_HUGGING_BASELINE,
  LAYOUT_BENCH_TIME_BASELINE,
} from './layout-bench/baseline';
import { seededRandomSchema } from './layout-bench/fixtures/synthetic';
import { geometryOf } from './layout-bench/geometry';
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
 * #151 round 2: targeted regressions for `orthogonal-router.ts`'s Dijkstra
 * clearance cost (`OUTLINE_HUG_STEP_PENALTY`), on top of the aggregate
 * ratchet above.
 */
describe('#151 round 2: outline-hugging regressions', () => {
  // This describe block used to also guard the literal table from the user's
  // #151 report (dark theme, `legacy_api_tokens`, Identity BC / Access
  // aggregate: its relation left the card hugging its own left border, then
  // the Access frame's bottom border). That guard's own doc comment already
  // conceded it was not a discriminating test for the fix mechanism below
  // (`OUTLINE_HUG_STEP_PENALTY`) — by its own account, this literal case's
  // headless-pipeline geometry did not reproduce the hug through that
  // mechanism at all; it only passed because `view.ts`'s port-side search
  // (#151) picked a different port for this specific edge. #152 deleted that
  // search (~60% of `relationRoutes`' total pipeline time for a readability-
  // only win — see `dev/layout-bench/baseline.ts`), so this edge hugs again:
  // a known, accepted consequence, not a regression in the mechanism this
  // block actually guards. The test below remains the discriminating guard
  // for `OUTLINE_HUG_STEP_PENALTY` itself, independent of the removed search.
  it('#151 round 2: a flipped synthetic edge demonstrates the Dijkstra clearance cost', () => {
    // `rnd_2:id>rnd_3:ref_0_id` in the seeded `synthetic-random-2` fixture
    // (`seededRandomSchema(2)`) hugs the `bc:south` frame's left border for
    // its entire vertical run when `OUTLINE_HUG_STEP_PENALTY` is 0 (verified
    // by hand: with the penalty zeroed out, this same assertion fails), and
    // clears it once the penalty steers `gridRoute`'s search away from
    // lanes that run parallel to an outline within `OUTLINE_HUG_CLEARANCE`.
    // Unlike the `legacy_api_tokens` case above, this edge's headless
    // geometry does exhibit the bug pre-fix, so it is a real regression
    // guard for the fix itself, not only for this literal fixture.
    const data = parseErData({ after: seededRandomSchema(2) });
    const { geometry } = geometryOf(data);
    const outlineBoxes = [
      ...geometry.nodes.map((node) => node.box),
      ...(geometry.frames ?? []).map((frame) => frame.box),
    ];
    const edge = geometry.edges.find((e) => e.id === 'rnd_2:id>rnd_3:ref_0_id');
    expect(edge).toBeDefined();
    expect(routeHugsOutline(edge!.points, outlineBoxes)).toBe(false);
  });
});
