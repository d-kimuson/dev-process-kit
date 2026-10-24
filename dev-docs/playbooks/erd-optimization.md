# ER Diagram Optimization Playbook

How to improve the ER diagram's readability without turning the diagram into a
different kind of unreadable: measure the drawn geometry, measure the real
browser, ask a subagent what the numbers miss, change core logic, repeat.

This is a loop, not a phase plan. Do not tune against a single weighted score;
compare the vector and keep the hard gates at zero.

## What "good" means

The reader's target, in their own terms:

1. At the **default fit**, text is legible and the diagram is usable without
   panning first.
2. A line can be followed: few crossings, no line riding a border, no two lines
   sharing a lane.
3. Both ends of a relation are legible: the cardinality sits beside the port it
   belongs to, the start label is farther out than the end label, and the text
   never covers its own crow's-foot glyph.
4. Meaning survives: BC/aggregate frames contain exactly their members; related
   contexts sit near each other; FK flow reads left-to-right / top-to-bottom.
5. The layout is deterministic: same input, same coordinates; hover, select and
   filters never move a table.

`fitScale` is the zoom that fits the whole world into the canvas:
`min((canvasW - 24) / worldW, (canvasH - 40) / worldH, 1)`. The authored table
id is 13px and a field is 11px, so `effectiveTableIdPx = fitScale × 13` is what
the reader actually gets. There is a physical ceiling: for `N` cards of area
`A` on a canvas of area `C`, `fitScale² ≤ C / A` even with zero gaps. At 39
tables of 280px width on a 1180×900 canvas, a 10px effective font at the
default fit is impossible; semantic zoom or narrower cards is a separate design
decision, not a layout bug.

## Hard gates and ratchets

Hard gates must be exactly zero:

- `overlaps` (node/node, frame/non-nested)
- `edgeThroughNode` (an edge crossing a table it does not join, including its
  own card's interior after the port escape)
- `endpoints.inwardDepartures` / `inwardArrivals`
- `endpoints.throughOwnNode`
- `borders.contact` (zero-gap line-on-border)
- label boxes outside the world

Everything else is an independent ratchet or a tie-breaker: `crossings`,
`parallel.nearMiss`, `collinearOverlap`, `outlineHugging`, `detour.excess`,
`totalEdgeLength`, `totalBends`, `fitScale`, label `overNode`/`onEdge`/
`overlappingEachOther`, and the deterministic render counts.

When the router chooses between candidate shapes, the order is:

```
contact > crossings > shared-lane length > outline hugging > length
```

Crossings and shared lanes outrank hugging because a crossing and two lines in
one lane are the reader's top complaints; "does not hug" is the tie-break, not
an absolute guarantee. Group/BC frames are **soft** outlines: a relation may
cross a frame perpendicularly (a cross-context relation must), but running along
a frame border is measured as hugging.

## The three measurement layers

### 1. Deterministic geometry and labels — `pnpm eval`

`dev/eval/` runs the real pipeline off-DOM: `parseErData` → `erLayoutSpec` →
`layeredLayout` with the element's own `LAYOUT` constants → the view's own
`relationRoutes` and `relationLabelPlans`. It writes
`dev/eval/out/report.json`.

It also measures the ER-specific failure classes that the generic
`scoreLayout` cannot see: inward endpoints, own-card traversal, border contact,
parallel near misses, label boxes, detours, and the default-fit legibility
proxy. Read [`dev/eval/README.md`](../../dev/eval/README.md) for the field
definitions and the comparison rules; do not duplicate them here.

The corpus is the layout bench's fixtures. The `er-complex` fixture must pass
**both** snapshots (`before` + `after`), exactly like the sample page; passing
only `after` silently measures a smaller schema (38/51 instead of 39/53).

### 2. Real browser — `pnpm eval:browser`

`dev/qa/er-eval.ts` opens `sample/er-eval.html`, which loads the schema from
`sample/er-complex.html` itself, renders it without the page shell, and writes
`dev/eval/out/browser.json` plus screenshots:

- `fit.png` — the default fit
- `tile-*.png` — legible tiles at ~55%
- `hover.png` — one table highlighted
- `detail.png` — a true 100% crop around the `users` hub, the only view where
  the 10px cardinality text is at its authored size

The harness measures the work, not the paint wait: interaction timings exclude
the two-frame settle, hover is imperative (classes only), and the run clears
its own old screenshots and forces the dark theme so a stale capture cannot be
reviewed as current.

The browser is the ground truth for `fitScale` and interaction cost. The
deterministic layout uses estimated table heights; the browser re-lays out with
measured heights, so the two world sizes differ. Do not "fix" a fit problem by
editing the deterministic estimate alone.

### 3. Subagent review — the qualitative half

Run the deterministic and browser layers first, then give a **fresh** subagent:

- `dev/eval/out/report.json`
- `dev/eval/out/browser.json`
- `fit.png`, `tile-*.png`, `hover.png`, `detail.png`
- the rubric from [`dev/eval/README.md`](../../dev/eval/README.md)

Ask for `fixed` / `still_broken` / `new_issues` / `next_levers`, not a single
score. The reviewer must:

- judge labels against the visible line direction, not the table's nominal port
  side;
- flag a cardinality that is missing at the end the line actually leaves from;
- not call a line readable merely because it has a different colour;
- check the 100% `detail.png` before claiming a label is unreadable at 55%;
- distinguish a genuinely missing label from one whose other endpoint is out of
  the crop.

Treat the review as evidence about blind spots, never as a licence to raise a
hard gate. Use it to pick the next core change, then re-run layers 1 and 2.

## Loop steps

1. **Refresh the build for the browser layer.** `pnpm build` (or keep
   `pnpm dev:build --watch` running). `pnpm eval:browser` serves `dist/`, not
   the TypeScript sources.
2. **Measure the status quo.** `pnpm eval` and `pnpm eval:browser`.
3. **Review the vector.** Hard gates must be 0. Compare crossings, parallel
   near misses, contact, hugging, label issues, fit, detours and render counts
   separately. Do not average away a gate or a crossing increase.
4. **Pick one core change.** Layout, routing, label placement or rendering —
   not a weight edit to hide the symptom.
5. **Re-measure both layers.** Keep a change only if it is Pareto-better, or if
   the trade is deliberate and written down (see below).
6. **Run the subagent review** on the new screenshots. It sees things the
   vector does not: label lanes, frame corners, overlay collisions, whether a
   "fixed" issue merely moved.
7. **Ratchet and test.** Update `dev/layout-bench/baseline.ts` downward when a
   fixture genuinely improves. Run `pnpm test`, `pnpm lint`, `pnpm typecheck`.
8. **Repeat from step 2** until the remaining issues are structural (fit
   physics, semantic zoom, card width) or the loop stops finding Pareto gains.

## Where to change what

| Concern                                                                                         | File                                       |
| :---------------------------------------------------------------------------------------------- | :----------------------------------------- |
| BC/aggregate/table packing, row-count candidates, arrangement proxy                             | `src/lib/layout/layered.ts`                |
| Orthogonal route candidates, contact/crossing/parallel/hug ranking, lane search, bbox rejection | `src/lib/layout/orthogonal-router.ts`      |
| Parallel track separation after routing                                                         | `src/lib/layout/route-nudge.ts`            |
| Direction-aware ports, port escape, self-loop routing, frame softness                           | `src/components/er-diagram/view.ts`        |
| Shared end/relation label placement                                                             | `src/components/er-diagram/labels.ts`      |
| Rendering, `LAYOUT` constants, caches, imperative hover                                         | `src/components/er-diagram/element.ts`     |
| Always-visible cardinalities, label ink, legend position                                        | `src/components/er-diagram/styles.ts`      |
| Deterministic appraisal and corpus                                                              | `dev/eval/`, `dev/layout-bench/`           |
| Browser harness and screenshots                                                                 | `dev/qa/er-eval.ts`, `sample/er-eval.html` |

The renderer and the appraisal must call the **same** label placement and route
functions. If they drift, the report scores geometry the reader does not see.

## Decision rules for a change

- Reject a change that raises a hard gate, regardless of the weighted total.
- Reject a change that raises `crossings` to lower hugging or length, unless
  the trade is explicitly requested and recorded. A current example is the
  small `synthetic-cross-bc` / `synthetic-hub-table` crossing increase accepted
  to remove every zero-gap contact and most frame hugging; it is documented in
  `dev/layout-bench/baseline.ts`.
- A non-hugging lane may win only after contact, crossings and shared-lane
  length tie.
- Fit may fall when the alternative would add crossings, but it must be a
  conscious trade, not a side effect.
- Do not tune for `er-complex` alone. Use the whole corpus; the random fixtures
  are the ones that expose a proxy that only sees BC centres.

## Measurement hygiene (what bit us)

- **Bench/sample drift.** Pass `before` + `after` for the diff sample.
- **Label coordinate systems.** Label boxes are world coordinates; comparing
  them with the canvas reports every right-hand label as off-canvas.
- **Stale captures.** Clear `fit.png`/`tile-*.png`/`hover.png`/`detail.png` per
  run and pin the theme; otherwise a previous build's light-theme tile is
  reviewed as a current regression.
- **Frame waits.** Do not charge two `requestAnimationFrame`s to an interaction;
  measure the handler/`updateComplete` work.
- **Lane ordering.** Sorting lane candidates by distance changes the tie-break,
  and therefore the routes, even when the candidate set is unchanged. Remove an
  optimisation if it changes the vector without a measured gain.
- **Obstacle filtering.** Filtering the obstacle list to a window can let a
  route leave the window and cross a table; `edgeThroughNode` must stay 0. Use
  bbox rejection inside the exact test instead, or keep all table obstacles.
- **Hover re-render.** A full template diff on hover costs milliseconds per
  pointer move. Toggle classes on the existing DOM; cache label plans by the
  same signature as the routes.
- **Time ratchets.** Run the bench's timing pass more than once and keep the
  minimum; a single run under parallel test load is scheduler noise, not a
  regression.

## Current state and the next levers

Snapshot from the last loop (2026-10, `er-complex`, 39 tables / 53 edges). Use
`pnpm eval` / `pnpm eval:browser` for the current vector; do not treat these
numbers as the baseline.

- Browser fit `0.32`; hover `~0.5ms`; initial update `~54ms`; longest task
  `~65ms`; column filter `~37ms` (it re-lays out after the table heights change).
- Deterministic: crossings `42`, contact `0`, hugging `13`, parallel `13`,
  label issues `11`, total `≈5,526` (from `≈7,738` at the start of the pass).
- The remaining top blockers are structural: crossings/parallel in the
  Payment–Invoice corridors, the fit framing (the world includes undrawn
  padding and is not centred), label crowding where several edges leave one
  card side, and a few frame-border hugs.

The next loop's highest-value levers:

1. **Fit framing.** Derive the world from the drawn frame/table boxes (not the
   extra padding), use the same rect for scale and centring. A review estimated
   `0.32 → ~0.41` without touching crossings.
2. **Hub ports and trunk lanes.** Order ports on a card side by the
   counterpart's angle/row, then assign integer lanes in each corridor. This is
   the source-level fix for both crossings and shared lanes.
3. **A reserved label lane.** Keep the exit channel at least one label-height
   (≈18px) from the card border and enforce ≥24px between labels; that removes
   the stacked start labels without pushing them into a neighbouring line.
4. **Frame exclusion band.** Treat a frame border as a band the router does not
   enter except for the final port approach; then frame hugging is structural,
   not a candidate preference.
5. **Render cost.** One visible path plus one hit path per relation; render the
   flow dots only while lit, or share the `d` with `<use>`.

Retire a lever only after both layers show no gain. If a lever needs a product
decision (semantic zoom, smaller cards), stop and ask instead of encoding the
decision as a layout weight.
