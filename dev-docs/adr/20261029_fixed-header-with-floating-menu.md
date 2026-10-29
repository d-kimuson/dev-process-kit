# The screen's chrome is a fixed header row and a floating menu

## Status

accepted

Supersedes [ADR: The screen's chrome is a side rail, a floating menu and a page bar](20261029_side-rail-and-floating-menu.md). Its floating menu — contents, drag, edge-docking, remembered dock — stands unchanged; only where the rest of the chrome is drawn changes.

Restores the header placement of [ADR: Switch boards from the header, not a rail](20261023_header-board-switcher.md), with one difference that stands from the superseded record: the page shown is named in the switcher's own label and renamed on its row in the popover, never beside the icon.

## Context

The superseded decision replaced the header with a side rail, a floating menu and an in-flow page bar. Three costs showed up in use:

- **A rail with one page is mostly empty.** Most documents hold one page, so the rail's top group was a single icon whose popover had little in it, and 52px of every screen stayed reserved for it.
- **The place name left the top of the screen.** A title only tells the reader where they are if it stays where they look for it, and the page bar scrolled away with the content it named.
- **A title bar inside the content competed with the content.** A template's own controls and the page's title shared one strip, so a template that wanted the whole top of its column had to negotiate with the shell.

The floating menu does not share those costs: it carries controls the reader reaches for rarely, in a place the reader chooses, and it takes no room from the page. It was never part of the complaint.

## Decision

The chrome is a fixed **header row** plus the floating **menu**:

- **The header** is the row across the top, drawn by the element that owns the page's chrome. Left to right: the brand mark, the page switcher when there is anything to switch between or add, the page's title as the row's `h1`, the template's own header content and the author's `slot="header"` markup, then the language select, the theme toggle and the settings gear. Everything that is the reader's own view of the page — language, theme, settings — is reachable from it, and the settings dialog holds only what belongs to the page's content.
- **The menu** keeps the page's own controls and its placement rules as they were: the grip, undo and redo, the review's sections, Check Mode and the changes bell, dragged by the reader, docked to the nearest edge, remembered per content. It is now the only surface that floats over the screen, so its own room is the viewport less the header row.
- **One owner draws each piece once.** A page content inside `<dpk-page>` draws neither the header nor the menu: the app does, or the view or board when it is used on its own. A page content keeps a bar of its own for its template's controls, with no title, so nothing of the template is lost and nothing of the screen is drawn twice.
- **The row publishes its height** as `--dpk-header-height`, because a maximized dialog panel is lifted into the top layer and paints over everything else in the document: the custom property is what keeps its box clear of the row.

The header is a row of the whole-screen layout, not an overlay: it takes its height out of the screen and the body scrolls under it, which is why it can name the page without moving.

## Consequences

- The screen gives the row its height back, on every page. A template loses the full top of its own column, and one that needs the reader's controls in reach has to keep them in its own region.
- A page's own title and controls are quieter than the screen's: they can never be the `h1` of the document, because the header already names it.
- The reader's controls live in two places by role, not by preference: what belongs to the view of the page (language, theme, settings) is in the header, and what belongs to the work (undo, redo, the review, Check Mode, the changes) is in the menu. A control that moves between them changes what the reader expects of it, so the split is not a free one.
- The menu keeps clear of the row: a docked menu can hang under the header but never over it, so the title and the reader's controls stay reachable while the reader moves the menu.
- A narrow screen wraps the row instead of shrinking it: the title takes a row of its own and the template's own content follows it.
- The settings gear is reachable on every page, whether or not the template has switches of its own; the dialog a page with nothing to configure opens is short but never absent.

## References

- [20261029_side-rail-and-floating-menu.md](20261029_side-rail-and-floating-menu.md)
- [20261023_header-board-switcher.md](20261023_header-board-switcher.md)
- [20261022_page-as-the-base-form.md](20261022_page-as-the-base-form.md)
- `docs/index.md`, `docs/page.md`
