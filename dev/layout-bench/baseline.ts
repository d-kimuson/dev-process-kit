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
 *
 * 2026-10 (#148): `scoreLayout` gained a `collinearOverlap` term (two
 * different edges, or an edge and a frame border, running along the same
 * line for a shared stretch — invisible to every other term, but the exact
 * readability complaint #148 reported). Measuring it raised every fixture
 * that actually has overlapping runs; that one-time, conscious jump was
 * recorded first, before any routing fix.
 *
 * Immediately after, `src/lib/layout/route-nudge.ts`'s `nudgeParallelRoutes`
 * landed (wired in via `view.ts`'s `relationRoutes`): a post-process that
 * pulls apart routes sharing a corridor and pushes a route off its own
 * frame's border, without ever moving a port. This is a real improvement,
 * not a metric change, so it ratchets the numbers below down from the jump
 * above. `er-complex`, `synthetic-cross-bc`, `synthetic-random-1` and
 * `synthetic-random-2` all improved. `order-schema`, `er-long-names`,
 * `synthetic-no-bc`, `synthetic-hub-table` and `synthetic-self-reference`
 * are unchanged: their overlapping runs sit on a segment that touches a
 * port (the route is a straight line or single L-bend, or the overlap is on
 * the first/last leg of a longer one), which `nudgeParallelRoutes`
 * deliberately never moves — a known limitation, not a bug; see
 * `dev-docs`/the #148 report for the port-side-choice lever that would be
 * needed to close that gap.
 */
export const LAYOUT_BENCH_BASELINE: Readonly<Record<string, number>> = {
  'er-complex': 2826.0199537663184,
  'order-schema': 137.31777372518764,
  'er-long-names': 152.8217124073083,
  'synthetic-no-bc': 1344.4620464945997,
  'synthetic-cross-bc': 346.5846755576696,
  'synthetic-hub-table': 545.4210727969348,
  'synthetic-self-reference': 160.89998596244953,
  'synthetic-random-1': 2522.0358599237406,
  'synthetic-random-2': 2181.355435992579,
};
