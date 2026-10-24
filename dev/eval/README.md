# ER readability loop

This directory is the measurement side of the ER diagram tuning loop. The loop
is deliberately small:

```sh
pnpm eval            # deterministic geometry + label appraisal -> dev/eval/out/report.json
pnpm eval:browser    # real browser timing + screenshots      -> dev/eval/out/{browser.json,*.png}
```

Then ask a subagent to review the screenshots against the rubric below, change
the core layout/routing/render logic, and repeat. Do not tune against a single
weighted total: compare the vector and keep the hard gates at zero.

## Plain-language definitions

These three terms caused confusion in the first planning round, so they are
spelled out before any number.

- **crossings**: two _different relation lines_ intersect at a point interior
  to both. A line crossing a card's border, a frame's border, or a label is not
  a crossing; those are measured by `borders.contact`, `outlineHugging` and the
  label terms. A shared endpoint (two relations leaving the same port) is not a
  crossing either.
- **fitScale**: the zoom the diagram opens at when the _whole world_ is fitted
  into the canvas: `min((canvasW - 24) / worldW, (canvasH - 40) / worldH, 1)`.
  `effectiveTableIdPx = fitScale × 13` and `effectiveFieldPx = fitScale × 11`
  are what the authored text actually becomes on screen at that zoom.
  This is a _readability proxy_, not a target to maximise at the cost of
  crossings. It also has a physical ceiling: if the placed cards cover area
  `A` and the canvas is `C`, then `fitScale² ≤ C / A` even with zero gaps. At
  39 tables of 280 px width on a 1180×900 canvas, a 10 px effective font is
  impossible (`A` alone exceeds the canvas); the loop therefore targets a
  visible improvement in `fitScale` (roughly ≥ 0.4 inline) and treats semantic
  zoom / header-only rendering as a separate design decision, not as a layout
  bug.
- **hard gate**: a structural invariant that must be exactly zero, regardless
  of how good the weighted total looks. The gates are `overlaps`,
  `edgeThroughNode`, `endpoints.throughOwnNode`, `endpoints.inward*`,
  `borders.contact` and `labels.overNode` / `labels.offCanvas`. Everything
  else (`crossings`, `outlineHugging`, `parallel.nearMiss`, `detour`,
  `fitScale`, length, bends, render counts) is an independent ratchet or a
  tie-breaker — never a licence to raise a gate.

## What is measured

### Existing terms (`src/lib/layout/metrics.ts`)

- **crossings**: two different edges' axis-aligned segments intersect at a
  point interior to both. A shared port/endpoint does not count. This is
  line–line crossing, not line–card or line–frame crossing.
- **collinearOverlap**: two edges, or an edge and a frame border, run along the
  same line for a shared stretch.
- **outlineHugging**: an edge segment runs parallel to a node/frame border
  within 6px for more than 12px.
- **edgeThroughNode / frameViolations / overlaps**: hard structural failures.
- **totalEdgeLength / totalBends / aspectDeviation / wastedArea**: cost and
  shape tie-breakers.

### Added by this loop (`dev/eval/appraisal.ts`)

- **fitScale**: the zoom the diagram opens at when the whole world is fitted to
  the canvas: `min((canvasW - 24) / worldW, (canvasH - 40) / worldH, 1)`.
  `effectiveFieldPx = fitScale × 11` and `effectiveTableIdPx = fitScale × 13`
  say what the authored text actually becomes. This is a readability proxy,
  not a target to maximize at the expense of crossings.
- **endpoints.inwardDepartures / inwardArrivals**: the first/last segment goes
  back into the card it leaves/enters, instead of away from it. This is the
  "line extends left but the port/label is on the right" contradiction.
- **endpoints.throughOwnNode**: routed length inside the edge's own card.
- **borders.contact / nearContact**: an edge segment parallel to any node or
  frame border within 1.5px / 4px and overlapping for more than 1px. `contact`
  is the zero-gap failure; `nearContact` is the visibly cramped version.
- **parallel.nearMiss**: two different edges parallel within 4px and overlapping
  for more than 8px. Colour alone cannot separate them.
- **labels.\***: cardinality/relation label boxes that overlap a node, a frame
  border, any edge, another label, or the canvas edge. The boxes use the same
  `endGlyph` and fan/label lifts as `element.ts`, with a conservative text-width
  estimate.
- **detour**: routed length minus straight port distance, average/max ratio,
  long edges and backward length.
- **render**: edge path count, path-command count and label count — a
  browser-independent estimate of how much SVG the render has to produce.

## The four failure classes this loop must not lose

These came from the reader's v0.3 review screenshots and belong in both the
core invariants and the subagent rubric.

1. **Zero-gap border/row contact.** A relation runs parallel to a card's border
   (or a row separator) with no margin, so the two strokes read as one.
   `borders.contact > 0` is a failure; `nearContact` is a warning.
2. **Endpoint/label contradiction.** A route leaves through its own card, or
   the cardinality/label sits at the opposite side from where the line visibly
   goes, so `1..N` is missing or unreadable. `inward* > 0`, `throughOwnNode > 0`,
   or labels `overNode` are failures.
3. **Start-end crowding.** The start cardinality is drawn on its own line or
   glyph and is the hardest end to read. `labels.onEdge > 0` and
   `labels.overlappingEachOther > 0` are failures.
4. **Complete parallel overlap.** Two lines share a lane so exactly that colour
   is the only difference. `parallel.nearMiss` is the best-effort metric; it
   does not have to reach zero on a dense schema, but must trend down without
   raising crossings.

## Comparison rules

- **Route ranking.** When the router chooses among candidate shapes it orders
  them by: zero-gap border contact (never acceptable), line-line crossings,
  shared-lane length, outline hugging, then length. Crossings and shared lanes
  outrank hugging because a crossing and two lines in one lane are the reader's
  top complaints; "does not hug" is the tie-break, not an absolute guarantee.
- **Labels.** Cardinalities and relation names are visible at rest (not only on
  hover). `src/components/er-diagram/labels.ts` places them once for the whole
  batch — beside the stroke, beyond the crow's-foot, start farther out than the
  end — and the renderer and this appraisal both call it, so a label cannot be
  scored at a position the browser does not paint.
- **Frames are soft.** An edge may cross a Bounded Context / aggregate frame
  perpendicularly (a cross-context relation must); `frameViolations` is a
  diagnostic, not a gate. Running _along_ a frame border is covered by
  `outlineHugging`.
- Hard gates must be zero: `overlaps`, `edgeThroughNode`,
  `endpoints.throughOwnNode`, `endpoints.inward*`, `borders.contact`,
  `labels.offCanvas`.
- `crossings`, `borders.contact`, `parallel.nearMiss` and the label issues are
  independent ratchets: never accept a change that increases one of them to
  improve the weighted total.
- Prefer the candidate with fewer hard/soft issues; use `fitScale`,
  `detour.excess`, `totalEdgeLength`, `totalBends` and render counts as
  tie-breakers. Fit is allowed to fall if the alternative would add crossings,
  but a fall must be a conscious trade, not an unnoticed side effect.
- The appraisal corpus is the layout bench's nine fixtures plus any new
  pattern the loop needs. Do not tune only for `er-complex`.

## Subagent rubric

Give the subagent `dev/eval/out/report.json`, `dev/eval/out/browser.json`, and
the screenshots (`fit.png`, `tile-*.png`, `hover.png`, `detail.png`). `detail.png`
is a true 100% crop around the `users` hub, the only view where the 10px
cardinality text is at its authored size. Ask it to return:

```json
{
  "overall": "improved | neutral | regressed",
  "checks": [
    {
      "id": "border-contact | endpoint-contradiction | label-crowding | parallel-overlap | crossings | grouping | fit-readability",
      "severity": "critical | major | minor | none",
      "evidence": "screenshot name + approximate location, or a report field",
      "suggested_fix": "one concrete core-logic change"
    }
  ],
  "blind_spots": ["anything the metrics do not capture"]
}
```

The reviewer must not score a line as readable merely because it has a different
colour. It must check the endpoints against the visible line direction, not the
table's nominal port side, and it must flag a cardinality that is absent at the
end the line actually leaves from. The review is qualitative evidence, not a
replacement for the deterministic gates.
