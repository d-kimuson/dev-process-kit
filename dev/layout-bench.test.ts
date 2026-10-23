import { describe, expect, it } from 'vitest';

import { LAYOUT_BENCH_BASELINE } from './layout-bench/baseline';
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
});
