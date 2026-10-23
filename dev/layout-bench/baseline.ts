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
 *
 * 2026-10 (#148 round 3): the nudge pass above spread collinear runs apart,
 * which lowered `collinearOverlap` but *raised* crossings on several
 * fixtures (er-complex 80→115, synthetic-random-1 102→110,
 * synthetic-random-2 92→109, measured against f2dfbbf) — the weighted total
 * still fell, so the ratchet let a regression on the user's top-priority
 * metric through. Root cause: `shelfPack` (the box/row arrangement used at
 * every compound-layout level — BC boxes, aggregate boxes within a BC,
 * tables within an aggregate) balanced row width only and was entirely
 * crossing-oblivious. It is replaced by `arrangeBoxes`
 * (`src/lib/layout/layered.ts`): exhaustive permutation search for small box
 * sets (every real BC/aggregate/table sub-problem in the fixture corpus),
 * falling back to a barycenter-seeded, hard-capped local search for larger
 * ones, both scored by estimated crossings first, then edge length, then
 * aspect deviation. This is a real placement improvement, not a metric
 * change, so the numbers below ratchet down again: every fixture with any
 * crossings dropped (er-complex 115→42, synthetic-cross-bc 8→2,
 * synthetic-random-1 110→72, synthetic-random-2 109→49), all comfortably
 * below their f2dfbbf figures, with zero overlaps/edge-through-node/frame
 * violations throughout.
 *
 * Immediately after, `METRIC_WEIGHTS.crossings` (`src/lib/layout/metrics.ts`)
 * was raised from 12 to 100, so the weighted total can no longer hide a
 * crossing regression behind a `collinearOverlap` improvement the way it did
 * above. This is a deliberate, one-time jump in every fixture that has any
 * crossings at all (the per-incident cost went up, not the layout), recorded
 * here before any further placement/routing change — `er-complex`,
 * `order-schema`, `synthetic-cross-bc`, `synthetic-self-reference`,
 * `synthetic-random-1` and `synthetic-random-2` all jumped; the three
 * zero-crossing fixtures (`er-long-names`, `synthetic-no-bc`,
 * `synthetic-hub-table`) are unaffected. See
 * `LAYOUT_BENCH_CROSSINGS_BASELINE` below for the independent, raw-count
 * ratchet this weight change is reinforcing, not replacing.
 *
 * Immediately after, routing itself became edge-aware (#148 round 3,
 * `src/components/er-diagram/view.ts`'s `relationRoutes` and
 * `src/lib/layout/orthogonal-router.ts`'s `routeAroundObstacles`): edges are
 * routed short-first so a long edge detours around a short one rather than
 * the reverse; each route is routed aware of every edge already placed in
 * the same batch (an `avoid` segment list), so where both L-shape candidates
 * are obstacle-clear, the router picks whichever crosses fewer of them; and
 * a bounded two-pass rip-up-reroute lets a later edge's presence improve an
 * earlier edge's choice too. Real improvement, not a metric change, so the
 * numbers below ratchet down again on every fixture that has a crossing or a
 * shared corridor to route around: `er-complex` 42→38, `synthetic-cross-bc`
 * 2→1, `synthetic-random-1` 72→71, `synthetic-random-2` 49→48. The other
 * five fixtures are unchanged (too few edges, or none sharing a corridor,
 * for the new tie-break to matter). Measured with
 * `collinearOverlap`/`nudgeParallelRoutes` held exactly as it was: per
 * fixture, collinear-overlap *length* moved by at most a couple of percent
 * either way (`synthetic-random-1`: 3,234→3,298, +2%; every other changed
 * fixture went down), nowhere "meaningfully worse".
 *
 * Rejected in the same round: a safety-net pass that reverted a single
 * edge's nudge whenever it raised that edge's own crossing count against the
 * rest of the batch ("only nudge where it does not add a crossing", read
 * literally). Measured on `synthetic-random-1`/`synthetic-random-2`, it did
 * cut crossings further (71→31, 48→43) — but by discarding nearly every
 * nudge in a shared corridor, since two routes separating out of the same
 * corridor each look, in isolation, like they are "adding a crossing" by
 * leaving it. That reverted collinear overlap almost back to its
 * pre-`nudgeParallelRoutes` state: `synthetic-random-1`'s collinear length
 * went 3,298→50,373 (≈15×), `synthetic-random-2`'s 2,631→13,477 (≈5×),
 * `er-complex`'s 3,543→6,351 (≈1.8×) — a clear violation of "collinear
 * overlap must not get meaningfully worse" for a handful more crossings.
 * Reworking the comparison to judge each edge against the batch's settled
 * state instead of the frozen pre-nudge one (so a pair separating in tandem
 * would both be judged against each other's actual final choice, not a
 * stale one) made no measurable difference — same numbers to the last
 * digit — so the conflict is real, not a staleness artifact: on this
 * corpus, the nudges that fix collinear overlap in a shared corridor are, in
 * large part, exactly the nudges a strict per-edge crossing guard discards.
 * The per-edge revert was removed rather than kept; routing order,
 * edge-aware L selection and rip-up-reroute already deliver the measured
 * crossing drop above without that trade.
 */
export const LAYOUT_BENCH_BASELINE: Readonly<Record<string, number>> = {
  'er-complex': 4880.550883510249,
  'order-schema': 226.5403236718898,
  'er-long-names': 152.8217124073083,
  'synthetic-no-bc': 1344.4620464945997,
  'synthetic-cross-bc': 319.3524809019977,
  'synthetic-hub-table': 545.4210727969348,
  'synthetic-self-reference': 336.89998596244953,
  'synthetic-random-1': 8002.474075587334,
  'synthetic-random-2': 5608.750715847204,
};

/**
 * A second, independent ratchet alongside the weighted total: a fixture's
 * raw crossing *count* may never increase, even when the weighted total
 * falls. This is what let the regression above through in the first place
 * (a cheaper `collinearOverlap` bought with a more expensive `crossings` is
 * a bad trade per the user, who named crossings as the top complaint) — see
 * `dev/layout-bench.test.ts`.
 */
export const LAYOUT_BENCH_CROSSINGS_BASELINE: Readonly<Record<string, number>> = {
  'er-complex': 38,
  'order-schema': 1,
  'er-long-names': 0,
  'synthetic-no-bc': 0,
  'synthetic-cross-bc': 1,
  'synthetic-hub-table': 0,
  'synthetic-self-reference': 2,
  'synthetic-random-1': 71,
  'synthetic-random-2': 48,
};
