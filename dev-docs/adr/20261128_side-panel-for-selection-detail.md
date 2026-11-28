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
- **The page's settings are the panel's last section.** The header's gear opens the panel on 設定 instead of a modal dialog, so a reader can change a setting while the content stays in view, and the settings get the same place inside `<dpk-app>` (the panel of the page shown), on a standalone view and on a standalone board. The element that owns the header hands the panel its settings; the panel draws them in its shadow root, so a template's own settings section renders itself. `panel="none"` still offers the settings.
- **Each section the author writes has its own button in the header, and the panel itself has none.** Every `slot="panel"` section and every supplement that is not `hidden` gets a button before the gear, labelled and badged as its tab. The button opens the panel on its section and closes the panel while it shows that section, so a reader who wants the discussion points presses 「論点」, not a panel button. Buttons the header has no room for go into one menu button after the others. There is no button or keyboard shortcut for the panel as a whole: the panel also opens on an explicit open of an element, from the gear, or from the owner's `panel="open"` and API, and closes from its ×. A component's own section (Kanban's bulk edit) gets no button and opens the panel itself.
- **The panel starts closed.** Only `panel="open"` or the reader's stored state opens it on load. A section no longer needs the panel to open by itself, because its button reaches it from a closed panel.
- **Escape closes the panel.** With the focus inside the panel, Escape restores a maximized panel, then a full sheet to half height, then (unless the detail leads back to the supplement that holds its element) closes the panel and puts the focus back on what had it before the panel opened: the element on the board for a detail, and the section's button when that button turned the panel to its section, even on a panel already open. An Escape that a control inside the panel handles itself (it calls `preventDefault`) or that ends an IME composition stays with that control, so the first Escape in a candidate list closes only the list.
- **The review rail is not merged into the panel.** The review has its own placement and its own clearance rules, and the reader often wants both at once.
- **A side panel on wide screens, a sheet on narrow ones.** Above 760px the panel narrows the main column (280–560px, `--dpk-panel-width`, 360 by default) and can be maximized over it; at 760px and below it is a bottom sheet.
- **The panel moves to the detail only on an explicit open.** Clicking a card or a diagram element (a table, a column, a node, an edge) opens the panel on 詳細, and the click that ends a drag or a pan does not; a selection made otherwise marks the tab unread and leaves the reader on the section they were reading.
- **Supplements are sections too.** Each `slot="supplement"` child is a section labelled by its `data-name`, in the order written together with the `slot="panel"` sections; the bar at the bottom of the main column and its height are gone. Inside `<dpk-page>`, the page moves its content's supplements next to the content so its panel can show them. Selecting an element of a board in the supplement on show opens the detail, and the detail leads back to that supplement.
- **`aside` is replaced.** An `aside` child becomes a section labelled by its `aria-label`, or 「メモ」 without one. Open and section are the reader's state and are kept in `localStorage`, not in the draft.

## Consequences

- More internal elements: the panel frame and one detail element per board that offers a detail.
- The main column is narrower while the panel is open on a wide screen, and a board that wants the full width is read with the panel closed.
- The floating menu and the page dock need one more clearance, for the panel, which is not done yet.
- Check Mode and the grill do not look inside the panel: a question about a detail field is asked on the element, not on the panel.
- No page-wide sections: a note about the whole document is written on the first page.
- The header grows by one button per section. A page with many sections shows the first few and a menu for the rest.
- A reader who never presses a section's button never sees the section: an author who wants it read first sets `panel="open"`.
- A board that holds Escape for its selection lets an Escape from inside the panel through, so the panel's Escape never clears the selection.

## References

- [20261023_selection-bar.md](20261023_selection-bar.md)
- [20261029_fixed-header-with-floating-menu.md](20261029_fixed-header-with-floating-menu.md)
- [20261127_opt-in-page-rail.md](20261127_opt-in-page-rail.md)
- [20261022_page-as-the-base-form.md](20261022_page-as-the-base-form.md)
- `docs/components/panel-section.md`
