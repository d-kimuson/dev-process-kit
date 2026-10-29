# The screen's chrome is a side rail, a floating menu and a page bar

## Status

superseded by [ADR: The screen's chrome is a fixed header row and a floating menu](20261029_fixed-header-with-floating-menu.md). The floating menu this record introduced — its contents, drag, edge-docking and remembered dock — stands; the side rail and the in-flow page bar were reversed, and the title is back in the header.

It superseded the header placement of [ADR: Switch boards from the header, not a rail](20261023_header-board-switcher.md) (the board nav in a fixed header row, and the board's name edited beside it). Its decision to switch boards from one icon and a popover, to rename in place, and to keep one data-driven add list all stand; only where that chrome is drawn changed.

## Context

Every page drew a fixed header row across the top: the kit's brand mark, the page's title, the template's own header controls, the notice bell and Check Mode, then a row of icon buttons (settings, undo/redo, the review's sections). It was the one place every control had to fit, and it grew every time the kit gained one.

Three costs came with it:

- **The row was never the page's.** It was chrome, but it sat above the content, so it took vertical room on every screen and had to keep its controls clear of everything that floats (the review popover, the hand-off dock, a maximized panel — which is what `--dpk-header-height` existed to arrange).
- **The title belonged to the wrong thing.** On an app of several pages the header named the document, the active page's label stood beside the switcher, and each page's content could not carry its own name without competing for the same row.
- **A fixed bar has to be planned for.** A template could not decide where its own controls lived, and anything the reader placed (a panel, a canvas, a review) had to know the bar's height.

The controls themselves do not need a bar: each of them is an icon, there are few, and a reader reaches for most of them rarely. Nothing in the row needed to span the screen's width.

## Decision

The header row is gone. The screen's chrome is three pieces, and only one of them is part of the page's layout:

- **A full-height side rail** on the left edge, fixed over the screen: the page switcher at its top, the settings gear at its bottom. Its width is `--dpk-rail-width`, and the shell lays the page out beside the rail rather than under it, so no template has to know where it ends.
- **A floating menu** of the page's own controls — undo and redo, the review's sections, Check Mode, the changes bell — moved by the reader, positioned against the nearest edge when they let it go, and clamped into the window. Its orientation follows the edge it hangs from, so the reader never sets it: one row along the top or bottom edge, one column along the left or the right. Its dock is remembered per content, in `localStorage` under `dev-process-kit:menu:<content>`, like the reader's other view state.
- **A page bar** in the flow at the top of the main column: the page's title and the template's own bar content, scrolling away with the page. It is content, not chrome.

Whoever owns the page draws its chrome — the `<dpk-app>` for a document, the view or board when it is used on its own — and draws each piece exactly once. A page content inside `<dpk-page>` draws neither a rail nor a menu, and its own bar carries its controls without a title, because the screen has exactly one title bar. The chrome reaches the rail's own top group through `ShellRegions.railTop` rather than by knowing which element owns it, and the settings gear is re-homed through the same trigger the settings dialog always used.

The kit keeps `dpk-internal-layout-app`: the rail is fixed and the layout insets its rows by the rail's width, which is the layout's business, not each template's.

## Consequences

- A template's header controls become part of the page's flow. They scroll away with the content, so a template that wants its controls always in reach has to say so itself (a sticky strip inside its own region); nothing in the shell keeps them on screen any more.
- The reader can put the page's own controls where their work is not. A drag is the only gesture that moves them, and every position is reachable with the keyboard from the grip, so a pointer is never required to reposition it.
- Popover and dialog placement no longer has a header row to hang from. The review opens beside the floating menu, the page switcher's popover opens beside the rail, and a maximized panel covers the screen, chrome included.
- The rail is one more fixed thing on a narrow screen. It stays a single column of icons and the page keeps its full remaining width, which costs 52px of a phone's width on every page; a future version may fold it instead.
- The reader's dock depends on the element that draws the menu, so an app's pages share one dock, while two documents on one origin keep their own.
- `--dpk-header-height` is gone with the header; nothing has to keep clear of a bar any more.

## References

- [20261023_header-board-switcher.md](20261023_header-board-switcher.md)
- [20261022_page-as-the-base-form.md](20261022_page-as-the-base-form.md)
- `docs/index.md`, `docs/page.md`
