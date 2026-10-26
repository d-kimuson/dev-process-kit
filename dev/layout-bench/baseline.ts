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
 * `src/boards/er-diagram/view.ts`'s `relationRoutes` and
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
 *
 * 2026-10 (#150): readers found the gap *between* Bounded Context frames too
 * tight even with zero overlapping lines ("線自体はかぶってないけどぎゅっとし
 * すぎ"). `view.ts` gained two dedicated constants, `BC_GAP_ROW` (24) and
 * `BC_GAP_COLUMN` (10), applied by `compoundLayout`
 * (`src/lib/layout/layered.ts`) to the *stacked* (different-row) and
 * *side-by-side* (same-row) BC-to-BC gaps respectively, as a pure
 * post-process strictly after `arrangeBoxes` has already picked the BC
 * order/row-split, so neither can ever perturb that crossing-minimising
 * search. Two separate, independently-bisected values rather than one,
 * because the two gaps started from very different baselines (stacked
 * ~12px vs. side-by-side ~58px, a BC frame only reserving label space on its
 * own top edge) and tolerate very different amounts of widening before
 * routing turns the extra room into new crossings on this corpus (row safe
 * to ~27px, column only to ~10px). This raises wasted-area/edge-length/
 * aspect-deviation on fixtures with a BC-to-BC gap to widen, which is the
 * intended trade-off the task explicitly allows: `er-complex` 4880.55→4885.80
 * (+0.11%, side-by-side only — its four BCs sit in one row), `order-schema`
 * 226.54→229.27 (+1.20%, its two BCs stack), `synthetic-cross-bc`
 * 319.35→319.84 (+0.15%, side-by-side), `synthetic-random-1`
 * 8002.47→8020.33 (+0.22%, both axes). The rest (`er-long-names`,
 * `synthetic-no-bc`, `synthetic-hub-table`, `synthetic-self-reference`) are
 * byte-identical: no second BC to widen against. `synthetic-random-2` is a
 * real *improvement*, not a cost paid for spacing: ratcheted down
 * 5608.75→5287.73, because the new BC gaps changed the routed geometry
 * enough to drop its crossing count 48→44 (see
 * `LAYOUT_BENCH_CROSSINGS_BASELINE` below) — a genuine win, not slack, so the
 * old worse number is not kept around. Crossing counts are otherwise
 * unchanged on every fixture; see the independent ratchet below.
 *
 * 2026-10 (#150 round 2): round 1's gap shipped too small to actually read
 * on the page the complaint was about (`er-complex` at a realistic
 * fit-to-view zoom: +10px on a ~58px gap is a few screen pixels). Rather
 * than cap the gap to whatever the then-current router tolerated,
 * `BC_GAP_ROW`/`BC_GAP_COLUMN` (`view.ts`) were raised to 160/120 — a final
 * gap of ~172px (stacked) / ~178px (side-by-side) on `er-complex`, inside
 * the requested 150–200px band on both axes — and the actual router bug
 * this exposed was found and fixed instead: `gridRoute`
 * (`src/lib/layout/orthogonal-router.ts`), the Dijkstra fallback used
 * whenever both direct L-shapes are obstacle-blocked, was completely blind
 * to every other edge already routed in the batch (`avoid`), unlike the
 * L-shape path above it. A long cross-BC edge is more likely to fall
 * through to this fallback once its endpoints are further apart, so
 * widening the gap surfaced a pre-existing blind spot, not a new one: it
 * would cut straight across a busy local corridor whenever that happened to
 * be the cheapest bend-and-distance path. Fixed by pricing (not blocking)
 * `avoid` crossings into the search via a new `AVOID_CROSSING_PENALTY`
 * constant there, tuned down from an initial, too-strong 500 to 100 after
 * the higher value pulled unrelated long edges onto the same "cheapest"
 * detour lane and raised `synthetic-random-1`'s crossing count even at the
 * old, un-widened gap (71→77) — see that constant's doc comment for the
 * tuning data.
 *
 * With the router fixed, every fixture's crossing count fell or held at the
 * much wider gap (see `LAYOUT_BENCH_CROSSINGS_BASELINE` below), so every
 * total here ratchets down except the two fixtures whose crossing count is
 * unchanged and whose BCs widen apart: `order-schema` 229.27→241.84 (+5.5%,
 * its two BCs stack) and `synthetic-cross-bc` 319.84→340.46 (+6.4%,
 * side-by-side) — pure edge-length/area cost of the intentional spacing,
 * exactly the trade-off the task allows. `er-long-names`, `synthetic-no-bc`,
 * `synthetic-hub-table`, `synthetic-self-reference` are byte-identical (no
 * second BC to widen against). The rest improve outright, because the fixed
 * router routes more cleanly even independent of the gap change:
 * `er-complex` 4885.80→4553.95 (-6.8%), `synthetic-random-1`
 * 8020.33→6834.80 (-14.8%), `synthetic-random-2` 5287.73→4387.75 (-17.0%).
 *
 * 2026-10 (#151): `scoreLayout` gained an `outlineHugging` term (an edge
 * segment running parallel to, and within a few px of, a node's or a frame's
 * border for a meaningful stretch — a route that reads as traced onto the
 * outline it is passing, the readability complaint #151 reported about a
 * relation leaving a table's left edge and then running straight down its
 * own card border). Weighted at 15/incident + 0.04/px
 * (`METRIC_WEIGHTS.outlineHugging`, `OUTLINE_HUG_LENGTH_WEIGHT`), it raises
 * every fixture's total by a fixed, computable amount
 * (`incidents * 15 + length * 0.04`) purely from measuring something that was
 * already there and invisible to every prior term — a one-time, conscious
 * jump, same as #148's `collinearOverlap` addition above.
 *
 * Landed in the same change (not a separate step, since the metric exists
 * specifically to gate it): `view.ts`'s `relationRoutes` now picks a table's
 * exit side (left/right/top/bottom) by routed cost instead of always the
 * field row, and `orthogonal-router.ts` gained a 3-segment "Z-shape" for two
 * same-orientation ports, but *only* when the plain field-to-field route
 * actually hugs an outline (`routeHugsOutline`) and only when the alternative
 * does not cost more crossings — routing every edge through the search
 * regardless of need caused severe crossing regressions during development
 * (see the router's and `relationRoutes`'s own comments), so it stays scoped
 * to routes that need it. Comparing each fixture's total jump against the
 * metric's own fixed cost shows exactly where this real routing improvement
 * landed: `er-long-names` 152.82→169.78, `synthetic-no-bc` 1344.46→1522.90,
 * `synthetic-hub-table` 545.42→659.42 and `synthetic-self-reference`
 * 336.90→390.78 moved by *exactly* the metric's fixed cost (16.96, 178.44,
 * 114.00 and 53.88 respectively) — no edge in these fixtures' baseline route
 * hugged an outline badly enough, or had a same-crossing-or-better
 * alternative, for the gate to change anything, so what you see is the raw
 * cost of measuring a pre-existing issue, not a regression. The rest moved by
 * *less* than the metric's fixed cost, meaning the new routing logic paid
 * part or all of the metric's cost back: `er-complex` 4553.95→5377.44 (metric
 * cost 1256.86, actual rise only 823.49 — crossings also fell 32→31),
 * `synthetic-cross-bc` 340.46→609.22 (metric cost 382.72, actual rise only
 * 268.76), `synthetic-random-1` 6834.80→7110.86 (metric cost 410.00, actual
 * rise only 276.06 — crossings fell 59→57). `order-schema` and
 * `synthetic-random-2` are outright improvements despite the new cost added:
 * `order-schema` 241.84→201.62 and `synthetic-random-2` 4387.75→4344.31 both
 * fall even though the metric alone would have raised them (by 16.84 and
 * 495.40 respectively) — `synthetic-random-2`'s crossings also fell 33→29.
 * Crossing counts never increased on any fixture; see
 * `LAYOUT_BENCH_CROSSINGS_BASELINE` below for the independent ratchet, and
 * `LAYOUT_BENCH_OUTLINE_HUGGING_BASELINE` for the new one this term gets.
 *
 * 2026-10 (#151 round 2): round 1's gate only ever chose *between* existing
 * shapes (plain field route vs. Z-shape) by whether the plain route hugged —
 * it never changed how a hugging route itself was found, so the gridRoute
 * fallback (used whenever both direct L-shapes are obstacle-blocked, e.g. the
 * user's literal report: a relation leaving `legacy_api_tokens` with nowhere
 * clear to go but along its own left border and then the Access frame's
 * bottom border) still happily hugged whenever that was its cheapest path.
 * `orthogonal-router.ts`'s `gridRoute` Dijkstra gained a length-proportional
 * `OUTLINE_HUG_STEP_PENALTY` (0.3) on any grid step that runs parallel to,
 * and within `OUTLINE_HUG_CLEARANCE` of, a node's or frame's border (checked
 * against `outlines`, the edge's own table/frame geometry — not the inflated
 * `obstacles` list), so the search now prefers a lane through the middle of
 * a gap over one scraping a wall. `gridRoute`'s narrow/richer pass selection
 * also gained a direct "does the richer, hug-avoiding pass cost more
 * crossings against the batch's `avoid` list" gate, mirroring the existing
 * Z-shape-vs-L-shape selection, so hug-avoidance is never bought with a
 * crossing regression. `route-nudge.ts`'s own-border clearance (previously
 * only checked against an edge's own *frame*) was widened to also cover its
 * own *table* — the other half of the same user report — via `view.ts`'s
 * `ownFrames` list.
 *
 * `OUTLINE_HUG_STEP_PENALTY` was bisected against the full corpus: 0.3 is the
 * largest value in the low range (0.1–0.3) that keeps every fixture's
 * crossing count at or below its #151-round-1 figure; past ~0.35 there is an
 * unexplained cliff where `synthetic-random-2`'s final crossing count
 * regresses (29→34+) even with the new crossings gate in place, so the
 * penalty is deliberately left at 0.3 rather than pushed further — this means
 * `er-complex`'s outline-hugging incident count (56→40) does not reach "well
 * under half of 56"; that shortfall is a known, open limitation, not an
 * oversight (crossings are the harder constraint and were not traded away for
 * it). Every fixture's crossing count fell or held, so the totals below
 * ratchet down: `er-complex` 5377.44→4976.71 (crossings 31→30, outlineHug
 * 56→40), `synthetic-cross-bc` 609.22→227.09 (outlineHug 14→0, crossings
 * unchanged), `synthetic-random-1` 7110.86→6574.42 (crossings 57→53,
 * outlineHug 16→10), `synthetic-random-2` 4344.31→4187.42 (outlineHug 25→20,
 * crossings unchanged). `order-schema`, `er-long-names`, `synthetic-no-bc`,
 * `synthetic-hub-table` and `synthetic-self-reference` are byte-identical:
 * none of their hugging routes had a same-crossing-or-better alternative for
 * the new cost to find. All nine fixtures' `layoutMs` stayed well under
 * 100ms (max ~17ms, `er-complex`).
 *
 * 2026-10 (#152): "ブラウザバカ重い" — real in-browser profiling (not this
 * module's own `pnpm bench:layout`, which, until this change, only ever timed
 * `layeredLayout` and never `relationRoutes` at all — see
 * `dev/layout-bench/geometry.ts`) found hovering or clicking a filter chip on
 * `er-complex` cost 1–2 *seconds* of main-thread long task, and a single drag
 * tick cost over a second, because `er-diagram/element.ts`'s `#routes` reruns
 * the entire routing pipeline, unmemoized, on every render. Breaking down
 * `relationRoutes`' own cost on that fixture (38 tables, 51 edges) found the
 * #151/#151-round-2 port-side search — trying every top/bottom port
 * alternative on both ends whenever a relation's plain route hugged an
 * outline, then fan-spreading siblings sharing a card edge, then a final
 * revert-safety-net pass — alone was ~60% of the ~1,080ms total (the revert
 * pass itself another ~13%), entirely to improve a soft metric
 * (`outlineHugging`) the task explicitly allows to move. It is deleted
 * outright (not cached, not throttled): the ask was to simplify the idea, not
 * patch around it again. `orthogonal-router.ts`'s Z-shape/`exits` machinery,
 * which only this search ever invoked, is deleted with it. The independent,
 * still-active defence against the *original* #151 report — `gridRoute`'s
 * `OUTLINE_HUG_STEP_PENALTY`, which steers the Dijkstra fallback away from a
 * border whenever both direct L-shapes are obstacle-blocked — is untouched.
 *
 * This raises every fixture whose plain route the search used to improve on;
 * the other four (`er-long-names`, `synthetic-no-bc`, `synthetic-hub-table`,
 * `synthetic-self-reference`) are byte-identical, since the search never
 * found a cheaper port for any of their edges in the first place:
 * `er-complex` 4976.71→5822.72 (+17.0%, crossings 30→31, outlineHug 40→67),
 * `order-schema` 201.62→369.24 (+83.1%, crossings unchanged, outlineHug
 * 1→7), `synthetic-cross-bc` 227.09→672.34 (+196.1%, crossings unchanged,
 * outlineHug 0→18), `synthetic-random-1` 6574.42→7157.73 (+8.9%, crossings
 * 53→57, outlineHug 10→15), `synthetic-random-2` 4187.42→5070.62 (+21.1%,
 * crossings 29→36, outlineHug 20→21). Zero overlaps/edge-through-node/frame
 * violations throughout — the hard ratchet is untouched; only the soft
 * metrics the task named as tradeable moved, in exchange for every hover,
 * selection, filter and drag frame no longer re-running this search at all.
 *
 * 2026-10 (#152 round 2): round 1's caching papered over the symptom
 * (unmemoized re-routing on every render) without touching the cause: every
 * *genuine* layout change (initial load, a drop after drag) still paid the
 * full cost of `orthogonal-router.ts`'s grid-and-Dijkstra fallback
 * (`gridRoute`), measured at ~300–380ms headless for `er-complex` alone.
 * Asked to change the idea rather than patch on top again, `gridRoute` —
 * the per-edge grid search with `AVOID_CROSSING_PENALTY`/
 * `OUTLINE_HUG_STEP_PENALTY`-weighted Dijkstra steering and a gated
 * narrow/richer two-pass search — is deleted outright and replaced with two
 * tiers: `laneDetour`, a 2-bend detour whose candidate bend-lines come
 * directly from the handful of obstacle borders actually overlapping the
 * route's span (`laneCandidates`) — no grid, nothing to search exhaustively,
 * `pickBest` just filters/sorts a short list by hug-avoidance then crossing
 * count then length; and `rareFallbackRoute`, a plain BFS over a small local
 * grid (no bend pricing, no direction-per-cell state, no avoid/hug steering,
 * no priority queue — just a FIFO queue and a visited check) kept only as a
 * correctness net for the rare dense pack `laneDetour` cannot solve with a
 * 2-bend shape at all. `view.ts`'s bounded rip-up-and-reroute pass is
 * deleted too (explicitly, not only because it is now unneeded): profiling
 * found `gridRoute` was ~95% of `relationRoutes`' total time specifically
 * because every edge paid for it again on every rip-up pass — with that
 * fallback gone, re-amortizing a now-cheap search across passes bought back
 * only a little (measured by hand: reinstating 2 extra passes on top of the
 * replacement router cut `er-complex`'s crossings 48→38 but more than
 * tripled its `routingMs`) for a cost the task asked to remove, not
 * reintroduce.
 *
 * `rareFallbackRoute` itself went through two intermediate shapes before
 * landing on plain BFS, both measured and rejected: a bend-priced Dijkstra
 * with a binary min-heap (a direct, trimmed port of the old `gridRoute`)
 * was fast but barely smaller in code than what it replaced, since a
 * priority queue's bookkeeping dominates a small function's line count
 * regardless of what it is searching; swapping the heap for a linear O(V^2)
 * scan (no search-structure code at all) shrank it further but made
 * `routingMs` *worse* than before this round on the two fixtures whose
 * edges actually reach this fallback (`synthetic-random-2`: ~3ms→~52ms) —
 * the ×3 direction-tagged state space this fallback never needed to begin
 * with (nothing above it ever asked this function to prefer fewer bends;
 * that preference was inherited from `gridRoute` without being re-examined)
 * made the quadratic scan itself the new bottleneck. Dropping the
 * direction state entirely — this function only has to guarantee *a* clear
 * route, not a bend-optimal one, since `laneDetour` already owns every
 * quality preference whenever it finds a route at all — cuts the state
 * space 3x and turns the search into a plain unweighted BFS, which is both
 * the smallest version of this function and the fastest, because a FIFO
 * queue is simpler than either a heap or a quadratic scan and `laneDetour`
 * already carries every edge that needs a quality-steered path.
 *
 * This is the real, structural trade for deleting `gridRoute`: its
 * `AVOID_CROSSING_PENALTY`-weighted search over every grid cell, re-run on
 * every rip-up pass, was *also* the single biggest lever this corpus had for
 * driving crossings down, and `laneDetour`'s short, obstacle-border-sourced
 * candidate list is structurally weaker at that than an exhaustive grid
 * search — the same mechanism that made it slow is most of what made it
 * good at this. Every fixture's `routingMs` collapses by one to two orders
 * of magnitude (`er-complex` ~300–380ms→~14ms, `synthetic-random-1`
 * ~70–80ms→~2ms, `synthetic-random-2` ~55–80ms→~2–3ms — see
 * `LAYOUT_BENCH_TIME_BASELINE`), which is what directly eliminates the
 * browser-observed multi-hundred-ms-to-multi-second long tasks on load and
 * drop this round was about; soft-metric totals move more than "moderate"
 * on the fixtures with the most crossings to begin with: `er-complex`
 * 5822.72→6892.70 (+18.4%, crossings 31→41 — BFS's fewest-hops path is not
 * always `gridRoute`'s bend-optimal one on the 2 edges that reach this
 * fallback, outlineHug 67→74), `synthetic-cross-bc` 672.34→1267.80 (+88.6%,
 * crossings 1→4, outlineHug 18→25 — this fixture's one long cross-BC edge
 * falls through to the fallback and BFS's path crosses more of the batch's
 * already-routed traffic than the deleted `AVOID_CROSSING_PENALTY` steering
 * did, the single largest crossing regression of this round in relative
 * terms), `synthetic-random-1` 7157.73→8426.29 (+17.7%, crossings 57→71,
 * outlineHug 15→13), `synthetic-random-2` 5070.62→7262.72 (+43.2%, crossings
 * 36→59, outlineHug 21→22). `order-schema` is an outright improvement
 * (369.24→275.84, -25.3%, crossings 1→0): its one hugging/crossing edge
 * happens to have a clean `laneDetour` candidate, never reaching the
 * fallback at all. `er-long-names`, `synthetic-no-bc`, `synthetic-hub-table`,
 * `synthetic-self-reference` are byte-identical: none of their edges ever
 * reached past the unchanged straight-line/L-shape tiers in either router.
 * Zero overlaps/edge-through-node/frame violations on every fixture,
 * confirmed after finding and fixing a real correctness bug this redesign
 * introduced (`rareFallbackRoute`'s window not being grown to contain an
 * obstacle that pokes into it — see that function's own doc comment) that
 * briefly broke this guarantee on `er-complex` and `synthetic-random-2`
 * during development.
 *
 * 2026-10 (v0.3 ER readability loop): the corpus now feeds `er-complex` both
 * snapshots (39 tables / 53 edges, exactly the sample the reader opens)
 * instead of `after` alone. Routing gained direction-aware ports, soft group
 * frames, local self-loops, zero-gap contact as a hard gate, and
 * tip-anchored end labels; placement gained a table-level L-route proxy for
 * the BC row count. Totals ratchet down across the corpus. Crossings:
 * er-complex 44→42 (sample-matched pre-change 44), random-1 71→32,
 * random-2 59→35; cross-bc 4→6 and hub-table 0→2 are the conscious cost of
 * removing every zero-gap contact (19→0 and 7→0) and most outline hugging
 * (25→7 and 7→0) on those two small fixtures — a trade accepted here, not an
 * unnoticed regression. Time caps rise for the two random fixtures because
 * the outer arrangement search evaluates four row-count candidates.
 *
 * 2026-10 (ERD end-glyph fix): the reader's "a relation line starts away from
 * its source-side circle/marker" report made every route leave its port
 * straight for the end glyph's whole footprint (`view.ts`'s `PORT_STRAIGHT`,
 * 20px — the `0..N` end's "zero" circle reaches furthest), and made
 * `nudgeParallelRoutes` refuse to slide a track into that run
 * (`minPortRun`). Longer port stubs push every route further out of its card
 * before it may bend, which is a large net win here — `er-complex` crossings
 * 42→32 and total 5526→4722, `synthetic-cross-bc` 1034→761, `synthetic-random-1`
 * 4859→4706 — at a small, conscious cost on two fixtures that were already
 * hugging-dominated: `synthetic-random-2` 5155→5178 (+0.45%, crossings still
 * 35→31: it trades `collinearOverlap` for the crossings, which is the user's
 * named priority) and `synthetic-self-reference` 334.62→334.78 (+0.05%, four
 * stubs 8px longer). `order-schema` (173→128) and `synthetic-hub-table`
 * (428.37→428.05) improve with it.
 */
export const LAYOUT_BENCH_BASELINE: Readonly<Record<string, number>> = {
  'er-complex': 4721.999988081431,
  'order-schema': 128.22094167409958,
  'er-long-names': 156.8217124073083,
  'synthetic-no-bc': 1366.4620464945997,
  'synthetic-cross-bc': 761.3599380406827,
  'synthetic-hub-table': 428.0460727969348,
  'synthetic-self-reference': 334.7799859624496,
  'synthetic-random-1': 4706.081192034428,
  'synthetic-random-2': 5178.028837518731,
};

/**
 * A second, independent ratchet alongside the weighted total: a fixture's
 * raw crossing *count* may never increase, even when the weighted total
 * falls. This is what let the regression above through in the first place
 * (a cheaper `collinearOverlap` bought with a more expensive `crossings` is
 * a bad trade per the user, who named crossings as the top complaint) — see
 * `dev/layout-bench.test.ts`.
 *
 * 2026-10 (#150 round 2): the `gridRoute` fix above (see the total-score
 * comment and `AVOID_CROSSING_PENALTY`'s doc comment) dropped every
 * fixture's crossing count at the new, much wider BC gap — `er-complex`
 * 38→32, `synthetic-random-1` 71→59, `synthetic-random-2` 48→33 (also
 * correcting this field's stale `48`, which a comment above already said
 * should have ratcheted to 44 after #148 round 3's own `nudgeParallelRoutes`
 * change but never did). The rest are unchanged.
 *
 * 2026-10 (#151): the gated port-side/Z-shape routing change described above
 * `LAYOUT_BENCH_BASELINE` dropped crossings further on the fixtures it
 * touched: `er-complex` 32→31, `synthetic-random-1` 59→57, `synthetic-random-2`
 * 33→29. The rest are unchanged — the gate (`routeHugsOutline`) found nothing
 * to fix, or found nothing that did not cost at least one more crossing, so
 * it left those fixtures' routes exactly as they were.
 *
 * 2026-10 (#151 round 2): the `gridRoute` clearance cost described above
 * `LAYOUT_BENCH_BASELINE` dropped crossings further on two fixtures:
 * `er-complex` 31→30, `synthetic-random-1` 57→53. The rest are unchanged, and
 * none increased — the new narrow-vs-richer crossings gate guarantees that.
 *
 * 2026-10 (#152): deleting the port-side search (see `LAYOUT_BENCH_BASELINE`
 * above) removed the one mechanism that had been nudging some edges onto a
 * cheaper, less-crossing port; without it, three fixtures' crossing counts
 * rise back toward (not above) their pre-#151 figures: `er-complex` 30→31,
 * `synthetic-random-1` 53→57, `synthetic-random-2` 29→36. `order-schema` and
 * `synthetic-cross-bc` are unchanged — the search never found a cheaper port
 * for either's edges. This is the accepted trade the task named explicitly:
 * the user prefers slightly more crossings over a sluggish page; every
 * fixture's hard metrics (overlaps/edge-through-node/frame violations)
 * remain 0.
 *
 * 2026-10 (#152 round 2): deleting `gridRoute`'s `AVOID_CROSSING_PENALTY`-
 * weighted exhaustive grid search and the rip-up-and-reroute pass that
 * re-ran it (see `LAYOUT_BENCH_BASELINE` above for the full accounting) was,
 * on this corpus, also deleting the single biggest crossing-reduction lever
 * — `laneDetour`'s short, obstacle-border-sourced candidate list cannot
 * match an exhaustive weighted search at this job. Crossings rise on every
 * fixture that had more than a couple to begin with: `er-complex` 31→48,
 * `synthetic-random-1` 57→71, `synthetic-random-2` 36→68 — the last one
 * nearly doubling, the largest single regression of this round. Accepted
 * per the task's own explicit framing (soft metrics tradeable for deleting
 * the actual slow core, not just caching around it); `order-schema` is an
 * outright improvement (1→0). The rest are unchanged.
 *
 * 2026-10 (#152 round 2, final): the number above (48/71/68) was measured
 * against an intermediate `rareFallbackRoute` that still priced bends
 * (a trimmed Dijkstra). The final design drops bend pricing for a plain BFS
 * (see `LAYOUT_BENCH_BASELINE` above) — a *cheaper* search, but one with no
 * preference among equal-length paths, so the 2 edges per corpus that
 * actually reach this fallback land on whichever clear path BFS's queue
 * order happens to find first rather than the fewest-bends/fewest-crossings
 * one Dijkstra was steered toward. Net: `er-complex` 48→41 (down — BFS's
 * path happened to cross less here), `synthetic-cross-bc` 1→4 (up — its one
 * long cross-BC edge reaches the fallback and BFS's path crosses more of the
 * batch's already-routed traffic), `synthetic-random-2` 68→59 (down). The
 * rest (`order-schema`, `er-long-names`, `synthetic-no-bc`,
 * `synthetic-hub-table`, `synthetic-self-reference`, `synthetic-random-1`)
 * are unchanged — their edges never reach `rareFallbackRoute` at all, so a
 * change inside it cannot move them. Every fixture's hard metrics
 * (overlaps/edge-through-node/frame violations) remain 0.
 *
 * 2026-10 (ERD end-glyph fix, see `LAYOUT_BENCH_BASELINE` above): the longer
 * straight port stub is, on this metric, the same lever that made the totals
 * fall — it drops `er-complex` 42→32, `synthetic-cross-bc` 6→3,
 * `synthetic-random-1` 32→24 and `synthetic-random-2` 35→31. `order-schema`
 * (0), `er-long-names` (0), `synthetic-no-bc` (0), `synthetic-hub-table` (2)
 * and `synthetic-self-reference` (2) are unchanged.
 */
export const LAYOUT_BENCH_CROSSINGS_BASELINE: Readonly<Record<string, number>> = {
  'er-complex': 32,
  'order-schema': 0,
  'er-long-names': 0,
  'synthetic-no-bc': 0,
  'synthetic-cross-bc': 3,
  'synthetic-hub-table': 2,
  'synthetic-self-reference': 2,
  'synthetic-random-1': 24,
  'synthetic-random-2': 31,
};

/**
 * A third, independent ratchet alongside the weighted total and crossings: a
 * fixture's raw outline-hugging incident count (`scoreLayout`'s
 * `outlineHugging.incidents`, see `src/lib/layout/metrics.ts`) may never
 * increase, even when the weighted total falls. Crossings stay the user's
 * named top priority and are never traded away for this, but this fixture's
 * incident count is the most direct signal available for #151's actual
 * complaint — a route drawn on top of an outline — so it gets its own ratchet
 * rather than relying on the weighted total alone to catch a regression here.
 *
 * 2026-10 (#151): first measurement, taken right after the `outlineHugging`
 * term and the gated port-side/Z-shape routing fix landed together (see
 * `LAYOUT_BENCH_BASELINE` above for why they are not measured separately).
 *
 * 2026-10 (#151 round 2): the `gridRoute` clearance cost described above
 * `LAYOUT_BENCH_BASELINE` dropped this fixture's own card/frame-hugging
 * incidents directly: `er-complex` 56→40, `synthetic-cross-bc` 14→0,
 * `synthetic-random-1` 16→10, `synthetic-random-2` 25→20. The rest are
 * unchanged. `er-complex`'s 40 is a known, open shortfall against the
 * "well under half of 56" target — see the doc comment on
 * `LAYOUT_BENCH_BASELINE` above for why the penalty was not pushed further.
 *
 * 2026-10 (#152): deleting the port-side search (see `LAYOUT_BENCH_BASELINE`
 * above) was specifically a trade of this metric for speed — this search was
 * the *only* mechanism that ever moved a hugging edge off a field-row port
 * onto a card's top/bottom edge, so removing it raises this count on every
 * fixture it used to help, back toward (`er-complex`, `synthetic-random-1`,
 * `synthetic-random-2`) or above (`order-schema`, `synthetic-cross-bc`) their
 * pre-#151 figures: `er-complex` 40→67, `order-schema` 1→7,
 * `synthetic-cross-bc` 0→18, `synthetic-random-1` 10→15, `synthetic-random-2`
 * 20→21. `gridRoute`'s `OUTLINE_HUG_STEP_PENALTY` — the cheaper, still-active
 * mechanism that only applies once both direct L-shapes are obstacle-blocked
 * — is what keeps these from rising further; the rest of the fixtures are
 * unchanged. Accepted per the task: this metric was explicitly named as
 * tradeable for removing the single highest-cost lever in the live
 * component's render path (~60% of `relationRoutes`' total time).
 *
 * 2026-10 (#152 round 2): `pickBest` (`laneDetour`'s candidate chooser)
 * prefers a non-hugging candidate over a hugging one outright whenever both
 * are obstacle-clear, replacing `gridRoute`'s length-proportional
 * `OUTLINE_HUG_STEP_PENALTY` steering — a hard preference over a short list
 * instead of a weighted cost over a whole grid, which the margin(20) >
 * `OUTLINE_HUG_CLEARANCE`(6) insight in `orthogonal-router.ts`'s top-of-file
 * comment makes safe to do unconditionally. Net effect is small either way:
 * `er-complex` 67→72 (+5), `synthetic-cross-bc` 18→25 (+7, both from the
 * lost rip-up pass finding fewer non-hugging alternatives after the fact),
 * `synthetic-random-1` 15→12 (-3, an improvement). `synthetic-random-2`,
 * `order-schema`, `er-long-names`, `synthetic-no-bc`, `synthetic-hub-table`,
 * `synthetic-self-reference` are unchanged.
 *
 * 2026-10 (#152 round 2, final): swapping `rareFallbackRoute`'s bend-priced
 * Dijkstra for a plain BFS (see `LAYOUT_BENCH_BASELINE` and
 * `LAYOUT_BENCH_CROSSINGS_BASELINE` above) moves this metric by the same
 * mechanism — BFS has no preference among equal-length clear paths, so the
 * handful of edges that reach this fallback can land flush against an
 * obstacle border that a bend-steered search would have preferred not to.
 * `er-complex` 72→74 (+2), `synthetic-random-1` 12→13 (+1),
 * `synthetic-random-2` 21→22 (+1). `order-schema`, `er-long-names`,
 * `synthetic-no-bc`, `synthetic-cross-bc`, `synthetic-hub-table`,
 * `synthetic-self-reference` are unchanged — none of their edges reach
 * `rareFallbackRoute`, or (`synthetic-cross-bc`) the one that does happens
 * not to change its hugging status under BFS. All single-digit-or-less
 * moves; `routeHugsOutline`'s own dedicated regression guard
 * (`dev/layout-bench.test.ts`'s "#151 round 2" describe block) still passes
 * unchanged, confirming the hug-avoidance *mechanism* itself
 * (`pickBest`'s hard preference) is untouched by this fallback-only change.
 *
 * 2026-10 (ERD end-glyph fix, see `LAYOUT_BENCH_BASELINE` above): this is the
 * one metric the longer straight port stub costs. Every route now runs 20px
 * out of its card before it may bend, which on `er-complex` adds three
 * incidents (13→16) and on `synthetic-random-2` removes three (19→16). The
 * added `er-complex` cases are interior lane runs sitting ~2px outside an
 * aggregate frame border (`users:id>carts:user_id`'s long vertical at
 * x=750 against `Account`'s border at 752, `users:id>orders:user_id`'s the
 * same, `warehouses:id>…`'s at x=1452 against `Inventory`'s 1454) — the
 * "lane along a frame border" class `nudgeParallelRoutes` already targets,
 * not the port stubs, which are perpendicular to every border they leave.
 * Accepted as part of the same change that took this fixture's crossings
 * 42→32: no route is drawn *on* a border, and `outlineHugging.length` (the
 * visible extent) rises by 700 of ~3,800px. `order-schema` (2→0),
 * `synthetic-cross-bc` (7→6) improve; `synthetic-random-1` stays at 12.
 */
export const LAYOUT_BENCH_OUTLINE_HUGGING_BASELINE: Readonly<Record<string, number>> = {
  'er-complex': 16,
  'order-schema': 0,
  'er-long-names': 0,
  'synthetic-no-bc': 0,
  'synthetic-cross-bc': 6,
  'synthetic-hub-table': 0,
  'synthetic-self-reference': 0,
  'synthetic-random-1': 12,
  'synthetic-random-2': 16,
};

/**
 * A fourth, independent ratchet (#152): a per-fixture ceiling on
 * `layoutMs`/`routingMs` (`dev/layout-bench/geometry.ts`'s `geometryOf`), so
 * the thing #152 was actually about — the pipeline getting slow enough to
 * jank the live component — has a regression guard of its own, not only the
 * quality-score ratchets above (which do not measure time at all). Before
 * #152, this bench never timed `relationRoutes`, so a reintroduced expensive
 * lever (a port-side search, a new search over alternatives, an unbounded
 * rip-up loop, …) could regress this exact cost with every other ratchet
 * here staying green.
 *
 * These ceilings are deliberately generous (headroom of roughly 2–3x the
 * measured number below, and a flat 5–15ms floor under the smallest
 * fixtures) rather than tight bisected values like the scores above: a
 * single-process, single-run wall-clock timing is inherently noisier across
 * machines/CI/JIT warm-up than a pure layout computation, and the goal here
 * is to catch "someone brought back an O(n^2)-ish lever" (a multi-x jump),
 * not to chase single-digit-percent timing noise. `LAYOUT_BENCH_BASELINE`
 * above remains the tight, bisected ratchet for layout *quality*; this one
 * is only a backstop for layout/routing *time*.
 *
 * Measured once, right after #152 deleted the port-side search/Z-shape
 * machinery (`view.ts`'s `relationRoutes`, `orthogonal-router.ts`'s
 * `routeAroundObstacles`) — see `LAYOUT_BENCH_BASELINE`'s own #152 entry for
 * what changed. `er-complex`'s `routingMs` (the fixture the user's original
 * complaint was about) went from an unmeasured, browser-observed ~1,080ms to
 * ~300–380ms headless (plain `node`, repeated); `synthetic-random-1`/
 * `synthetic-random-2` (the densest synthetic fixtures) sit at ~70ms/~55ms.
 * All nine fixtures' `layoutMs` stays in the low single-digit milliseconds,
 * as it has since #151 round 2 (`layeredLayout` was never the costly step).
 *
 * `er-complex` runs first in `FIXTURES`, so under `vitest` specifically
 * (rather than a plain `node` run of `dev/layout-bench.ts`) its `routingMs`
 * is the one most exposed to this process's own cold-start/JIT-warm-up and
 * whatever else is sharing the machine at that moment — confirmed by hand:
 * repeated plain-`node` runs stayed a tight ~300–380ms, but repeated
 * `vitest run dev/layout-bench.test.ts` runs occasionally (not reliably
 * reproducible; environment-dependent) spiked past 1,000ms on this exact
 * fixture with no code change at all. Its ceiling below is therefore set to
 * roughly the same ~3x headroom the densest synthetic fixtures already get,
 * rather than the tighter ~2x it first shipped with, which is what that
 * spike caught; `synthetic-cross-bc` got the same treatment after it alone
 * flaked once in the same sampling.
 *
 * 2026-10 (#152 round 2): this is the ratchet the whole round was about.
 * `gridRoute` (per-edge exhaustive grid-and-Dijkstra, gated narrow/richer
 * two-pass search) and the rip-up-and-reroute pass that re-ran it are both
 * deleted; routing is now `laneDetour` (an O(obstacles) candidate list, no
 * grid) with `rareFallbackRoute` (a plain, unweighted BFS over a small local
 * grid — see `LAYOUT_BENCH_BASELINE`'s final design note) only as a rare
 * correctness net. Measured repeatedly with plain `node
 * dev/layout-bench.ts`: `er-complex`'s `routingMs` — ~300–380ms before this
 * round, and the fixture whose browser-observed hover/click/drag long tasks
 * #152 round 1 fixed everywhere *except* load and drop, which still paid
 * this cost in full — now sits at ~14ms; `synthetic-random-1`/
 * `synthetic-random-2` (the densest synthetic fixtures) fall from ~70–80ms/
 * ~55–80ms to ~2–3ms each. `layoutMs` is unaffected (unrelated code path)
 * and stays in the same low-single-to-low-double-digit-ms range it already
 * was. Ceilings below are lowered to roughly the same ~2–3x headroom
 * convention as before, scaled to the new, much smaller measured numbers —
 * not left at the old, now-meaningless thousand-millisecond scale, since a
 * ceiling that loose would no longer catch a reintroduced expensive lever
 * (exactly what this ratchet exists for).
 */
export const LAYOUT_BENCH_TIME_BASELINE: Readonly<
  Record<string, { readonly layoutMs: number; readonly routingMs: number }>
> = {
  'er-complex': { layoutMs: 80, routingMs: 60 },
  'order-schema': { layoutMs: 20, routingMs: 20 },
  'er-long-names': { layoutMs: 20, routingMs: 20 },
  'synthetic-no-bc': { layoutMs: 20, routingMs: 20 },
  'synthetic-cross-bc': { layoutMs: 20, routingMs: 20 },
  'synthetic-hub-table': { layoutMs: 20, routingMs: 20 },
  'synthetic-self-reference': { layoutMs: 20, routingMs: 20 },
  'synthetic-random-1': { layoutMs: 60, routingMs: 30 },
  'synthetic-random-2': { layoutMs: 60, routingMs: 30 },
};
