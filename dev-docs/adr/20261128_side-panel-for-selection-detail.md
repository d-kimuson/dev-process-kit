# The selected element's detail and the author's notes share one side panel

## Status

accepted

Replaces the `aside` slot of a view, which stays as a deprecated alias. Adds to [ADR: A shared selection action bar, lifted into the top layer](20261023_selection-bar.md) and [ADR: The screen's chrome is a fixed header row and a floating menu](20261029_fixed-header-with-floating-menu.md); neither is superseded.

## Context

- **Each board shows a selected element's detail its own way.** The Kanban board drew a card's detail beside the board, stacked it under the board below 860px, and gave it the role of a dialog. Other boards show only what the selection bar offers. A reader learns a new place for the same kind of information on every board.
- **The panel under a diagram was removed.** It cost the diagram its height, and a detail that is read while the diagram is looked at belongs beside it, not under it.
- **A document has no place for its discussion points.** An author who wants to list open issues or decisions beside the content had only the `aside` slot of a view: one unlabelled column, with no way to hold more than one list and no counterpart on `<dpk-page>`.

## Decision

One side panel per content-holding element shows, in sections, the selected element's detail and the sections the author writes.

- **The owner is the element that holds the content.** `<dpk-page>` owns the panel of its page, and a view or a board used on its own owns its own. A board inside a page hands its detail to the page. There is no panel for the whole document, so a section always belongs to the content it sits beside.
- **Sections come two ways.** The author writes `<dpk-panel-section slot="panel">` children of the owner; a component adds a section through the owner's internal host. The owner lists them as tabs that follow the WAI-ARIA tabs pattern.
- **The detail is drawn by a function, in its own shadow root.** A board answers a selection with a `PanelDetail` whose `render()` returns an internal element. The panel keys the rendering on the detail's key, so a half-typed value is dropped instead of moving to the next selected element, and edits go through the board's draft actions as before.
- **The review rail is not merged into the panel.** The review has its own placement and its own clearance rules, and the reader often wants both at once.
- **A side panel on wide screens, a sheet on narrow ones.** Above 760px the panel narrows the main column (280–560px, `--dpk-panel-width`, 360 by default) and can be maximized over it; at 760px and below it is a bottom sheet.
- **The panel moves to the detail only on an explicit open.** Clicking a card or a diagram element (a table, a column, a node, an edge) opens the panel on 詳細, and the click that ends a drag or a pan does not; a selection made otherwise marks the tab unread and leaves the reader on the section they were reading.
- **`aside` is replaced.** An `aside` child becomes a section labelled by its `aria-label`, or 「メモ」 without one. Open and section are the reader's state and are kept in `localStorage`, not in the draft.

## Consequences

- More internal elements: the panel frame and one detail element per board that offers a detail.
- The main column is narrower while the panel is open on a wide screen, and a board that wants the full width is read with the panel closed.
- The floating menu and the page dock need one more clearance, for the panel, which is not done yet.
- Check Mode and the grill do not look inside the panel: a question about a detail field is asked on the element, not on the panel.
- No page-wide sections: a note about the whole document is written on the first page.

## References

- [20261023_selection-bar.md](20261023_selection-bar.md)
- [20261029_fixed-header-with-floating-menu.md](20261029_fixed-header-with-floating-menu.md)
- [20261127_opt-in-page-rail.md](20261127_opt-in-page-rail.md)
- [20261022_page-as-the-base-form.md](20261022_page-as-the-base-form.md)
- `docs/components/panel-section.md`
