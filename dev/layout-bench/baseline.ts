/**
 * The layout-complexity ratchet: the best total score measured for each
 * fixture in `./run.ts`'s `FIXTURES`, as of the last time someone deliberately
 * improved layout/routing. `dev/layout-bench.test.ts` asserts the current
 * score never exceeds this, so a regression fails CI instead of quietly
 * shipping.
 *
 * This is a floor to ratchet down over time, not a record of history: when a
 * change genuinely improves a fixture's score, update its number here (do not
 * leave the old, worse number "for slack"). When a change is expected to
 * raise a fixture's score (e.g. a deliberately more complex new fixture is
 * added, or a metric weight is retuned), that is a decision to make
 * consciously, not something to rubber-stamp because the test failed.
 */
export const LAYOUT_BENCH_BASELINE: Readonly<Record<string, number>> = {
  'er-complex': 1733.7799537663186,
  'order-schema': 121.79777372518762,
  'er-long-names': 152.8217124073083,
  'synthetic-no-bc': 1344.4620464945997,
  'synthetic-cross-bc': 254.4646755576696,
  'synthetic-hub-table': 163.82107279693486,
  'synthetic-self-reference': 160.89998596244953,
  'synthetic-random-1': 1864.255859923741,
  'synthetic-random-2': 1644.755435992579,
};
