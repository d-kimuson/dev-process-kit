# Badges live in their target's own box, not in a layer over the page

## Status

accepted

Supersedes the badge-rendering part of [ADR: Check Mode](20261023_check-mode.md) (the overlay-per-region layer and its shared `badge-dom.ts`): the storage, staleness and confirmation decisions there stand.

## Context

Two features put a small button on something the page renders: the grill's Q badges (`data-grill-questions`) and Check Mode's tally marks (`data-dpk-target`). Both first drew their badges into an absolutely positioned overlay the shell rendered per region — one layer over the sidebar, one over the main column — and moved each button by measuring its target against that layer's viewport on scroll, resize and pan.

That layer belonged to the shell, not to the target, and every consequence came from the gap:

- A badge was correct only as long as something kept re-measuring it. A scroll event raised inside the view's shadow root never reaches the document, so the shell needed a listener in every shadow root above the marks, including the one a view is slotted into.
- A pinned header, a sticky column head or a maximized panel moved or lifted the content without moving the layer, so badges drifted off their cards — Check Mode marks ended up over headers, where they say nothing about the reader's work.
- A diagram pans its nodes inside a clipped canvas, so the layer had to clip badge boxes against the canvas' viewport by hand, and a mark inside a table row had no box of its own at all.
- Two features, two copies of the measurement, clipping and corner-versus-gutter geometry, and a third would have added a third.

## Decision

A badge is a child of its target's own positioned parent — the target's `offsetParent`, or, for a target that has none (a table row), the nearest ancestor that can hold one. It is positioned in that parent's coordinates, in a portal layer created inside it (`src/core/shell/badge-portal.ts`): `position: absolute; inset: 0`, above the content it badges and below a board's pinned heads.

Nothing is laid out against the viewport and no scroll event moves a badge: a scroll of any column, a canvas pan, a zoom, a pinned head and a maximized panel carry a badge along with its target, because the badge is laid out in the box the target is laid out in. Where offsets do not describe the target's place in that box (it has no `offsetParent`, or another box between the two scrolls), the badge is measured against the same parent every frame instead — still in the target's coordinate space, never in the page's.

The grill's Q badges and Check Mode's marks both use that portal (`BadgePortalController`); a feature supplies only its own button, look and bindings. Corner placement and the author's gutter are the same pure geometry as before (`badge-layout.ts`); a parent that holds gutter badges says so with `data-dpk-badge-gutter`, and the shell reserves the column from that attribute alone.

The other half of the decision is what a mark may be. Because Check Mode reuses `data-dpk-target`, a page can want a target for **Show** that is not a unit the reader works through: a diagram's relation line or link, a message, a board's axis heads (a USM activity's column head, a step's head, a milestone row's head). Those say `data-dpk-check="off"` and keep their target; the attribute opts out the subtree below it. A badge on a header pinned to the screen would tally the axis instead of the work, so the axis opts out and the item does not — which is why USM marks activity and step heads and milestone row heads, never the story cards, as Check Mode targets.

## Consequences

- A maximized or full-screened diagram keeps its badges: the portal is inside the panel, so it enters the top layer (or the fullscreen element) with the panel rather than staying behind in the page.
- Panning a node out of a diagram's canvas hides its badge for free: the canvas' own overflow clips the portal's child, and no code measures the canvas viewport.
- A badge is no longer in the shell's render root. Anything that looks for badges has to search the whole tree down to the portals (the tests use a deep query), and CSS for a badge belongs with its feature, not with the shell's chrome.
- The shell observes the DOM for new marks (a card a template renders from its data appears after the render that collected the bindings). It must ignore mutations inside the portals themselves, or a badge writing its own label would schedule the next render.
- The gutter is a claim the parent makes while it holds gutter badges, not while one happens to be in view, so a hidden tab does not collapse the column and shift the text beside it.
- A third badge-like feature extends the portal rather than re-deriving measurement and clipping.

## References

- [ADR: Check Mode](20261023_check-mode.md)
- [ADR: Questions (grill) in the core shell](20261016_grill-in-core.md)
- [ADR: Change notices](20261013_change-notices.md)
