# Let a reader drag a diagram node, as reader-local position state over the computed layout

A diagram built on the shared graph layout (`src/components/diagram/element.ts`'s `DiagramElement`: ER diagrams, dependency graphs, state diagrams, architecture maps, mind maps) lets the reader drag a node, by its whole body, to a position of their choosing, and reset every node of one diagram from the board's right-click menu. The position is a third kind of state, next to the draft and to navigation: it never leaves the reader's browser and is never part of the hand-off to the agent.

## Status

accepted

## Context

The layout engine (`src/lib/layout/layered.ts`) computes every node's position from the graph's shape. It is deterministic and has no notion of a reader's preference: the same data always lays out the same way, and a page reload or an agent-authored change recomputes it from nothing. Readers of a large or unusually shaped diagram sometimes want to pull two nodes apart, or move one out of an edge's way, without asking the agent to change the data.

The forces:

- **The computed layout must stay authoritative.** When the agent adds, removes or resizes a node, every node the reader did not touch has to follow the new layout; nothing may freeze into a stale position just because the reader moved something unrelated elsewhere on the diagram.
- **It is not a draft concern.** Where a node happens to sit on screen is not something the agent proposed or should see in a hand-off; recording it as draft actions would also make it part of the authored data, able to drift out of sync with a regenerated layout.
- **It is not navigation either.** Navigation is where the reader is looking (a tab, a filter, a hash); a dragged position is a standing preference about the diagram's own content, kept independently of whatever view currently shows it.
- **Multiple diagram instances must agree.** The same page can render a diagram more than once (e.g. embedded and maximized), and a page can host several boards; a reset has to reach every instance of the same board/diagram without a shared singleton.
- **A node's whole body is also the thing the reader clicks to select it, and (on the ER table) contains its own interactive controls.** Dragging must not steal plain clicks or presses that start on a nested button, input or link; it must also not fight the canvas's own pan gesture, which a press on a non-button node root would otherwise also engage.

Alternatives considered:

- **Storing a delta from the computed position.** A delta survives a layout change only by coincidence; an absolute override is the only form that means "put it here" regardless of what the computed layout would otherwise say.
- **Storing every node's position once the reader drags any one of them.** Freezes the whole diagram against future layout changes, defeating the point of a computed layout.
- **Treating it as draft state (a `MOVE_NODE` action).** Would hand the agent reader-only chrome preference as if it were requested content, and would need every diagram's schema to carry a position field it otherwise has no use for.

## Decision

- **A new layer-1 concept, `src/core/layout-position.ts`**: a `PositionState` of absolute `{x, y}` overrides, each keyed by `(board, diagram, node)` id — an ADT, not a UI concern. Only moved nodes are stored; an unmoved node always follows the computed layout. `pruneMissingNodes` drops overrides for nodes a diagram's current data no longer has.
- **Reader-local persistence** (`src/core/layout-position-storage.ts`), validated with a runtime schema and kept in the same per-page browser storage as other reader UI state (sidebar width, change-notice "seen" state). It is never read by the draft, the hand-off, or any export.
- **A pure merge function**, `applyPositionOverrides` in `src/lib/layout/layered.ts`, layered on top of the existing layout result: it overwrites only the overridden nodes' coordinates, re-routes edges, and grows (never shrinks) the bounding box, without re-running the layered ranking/packing the base layout already paid for.
- **One `PositionController` per diagram instance** (`src/components/diagram/position-controller.ts`) owns that instance's committed overrides and resolves its nearest board id from the DOM (`board="…"` ancestor), so boards of the same page keep independent overrides. Instances synchronize through one `window` event, `dpk-layout-change`, rather than a shared singleton; a reset is just another write through the same event, so no second event is needed.
- **The drag gesture lives once, on the shared `DiagramElement` base class**, not on any subclass: a press on a node's own root starts it, a movement threshold (4px) tells a drag from a click, and a press that lands on a nested interactive element (button, link, input) never starts one. Every diagram built on this base (including ER, whose table root wraps real buttons of its own) gets dragging for free.
- **Reset lives on the board's right-click context menu**, not the header: `DiagramElement.getContextMenuItems` offers a "Reset positions" item, scoped to that one diagram, disabled when nothing has been moved. A page with several diagrams resets them independently, one right-click at a time.
- Whiteboard, event storming and example mapping are out of scope: they already store node positions as part of their own draft data and have no computed layout to override.

## Consequences

- A diagram's rendered layout is always `applyPositionOverrides(computedLayout, overrides)`; nothing downstream (hit testing, edge routing, the content box the viewport fits to) may read the pre-override layout, or dragged nodes silently revert.
- A reset is scoped to one diagram and fires immediately with no confirmation. Position state is explicitly outside the undo/redo draft system (see the draft-is-the-log ADR), so a reset is undoable only by re-dragging the affected nodes back.
- Position state adds one window-scoped event (next to the draft's own events) purely for same-page, cross-instance consistency; it carries no data, only a signal to re-read storage.
