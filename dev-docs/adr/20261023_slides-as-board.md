# Slides is an ordinary board, with no page-level focus mode

`dpk-template-slides` sits inside `<dpk-page>` as a board, the same as every other template, and gets the full area under the page header the same way they do. A hidden board stops listening to the keyboard. The page offers no focus or present mode of its own: presenting is the browser's full screen.

## Status

accepted. Settles, for slides, the open question left by [20261022_page-as-the-base-form.md](20261022_page-as-the-base-form.md) and [20261023_diagram-as-board.md](20261023_diagram-as-board.md) ("slides is a presentation mode, not a canvas, and stays unsettled by this decision"). Whiteboard's own answer is already settled by the latter (it is a diagram, out of scope here).

## Context

[20261022_page-as-the-base-form.md](20261022_page-as-the-base-form.md) made `<dpk-page>` the one shape every page is taught as, but left whole-screen templates — `slides`, `whiteboard` — without an answer for how they sit inside a page's chrome. [20261023_diagram-as-board.md](20261023_diagram-as-board.md) answered it for whiteboard by moving it to a diagram component with its own `variant="board"`, and explicitly left slides unsettled: a deck paged through one slide at a time is a presentation mode, not a canvas, so the diagram contract does not fit it. `sample/slides.html` still used a bare `<dpk-template-slides>` outside `<dpk-page>`, the one template left on the old standalone path.

Two concerns kept slides off the `<dpk-page>` path:

- **Layout.** Nothing had confirmed that a board gets the full height under the page header rather than some constrained or scrolling box, which a deck meant to be read one slide at a time cannot tolerate.
- **Presenting.** A deck read full-screen is the whole point of slides, and a page's own header and board switcher are chrome a reader presenting to someone else may not want on screen. A page-level mode that hides that chrome was tried and rejected: it was a second, parallel way to present next to the browser's full screen, and a new capability every board contract had to carry for one template's sake.

A smaller bug surfaced while checking the first concern: `#onKeydown` listens on `document` so a clicker's arrow keys reach the deck from anywhere, but a board parked behind another one on the same page stays connected and `hidden`, not disconnected — so a hidden slides board was still stealing arrow keys meant for whatever board is actually active.

## Decision

- **Slides is an ordinary board; no layout change was needed.** `dpk-internal-layout-app`'s CSS grid (`grid-template-rows: auto minmax(0,1fr) auto`) already gives the middle row — where a board's content lands — all the remaining height, so a board of slides gets the same full area under the header that every other template gets.
- **A hidden board stops listening.** The slides keydown guard bails out when the board is `hidden`, so a board parked behind another one no longer intercepts arrow keys meant for the active board.
- **There is no page-level focus or present mode.** The page does not hide its own header on a board's behalf, and the board contract carries no such request. Presenting a deck is the browser's full screen, which the slides template already offers and which shows the slide alone.

## Consequences

- `sample/slides.html` uses the `<dpk-page storage-key="…">` / `<dpk-template-slides board="slides">` form used by every other sample (`usm.html`, `whiteboard.html`), with the page's own JSON holding just the title.
- While a deck is read inside a page that is not full screen, the page header and board switcher stay on screen. A reader who wants them gone uses the browser's full screen.
- Slides keeps `addable: false` (`TemplateDefinition`); a page author places it once, by hand — this decision does not change how a board is added, only how it behaves once placed.
- **Slides as components placed in a plain board, rather than a template of its own, is deliberately deferred, not blocked.** Nothing here forecloses it.

## References

- [20261022_page-as-the-base-form.md](20261022_page-as-the-base-form.md)
- [20261023_diagram-as-board.md](20261023_diagram-as-board.md)
- [20261023_header-board-switcher.md](20261023_header-board-switcher.md)
- [20261020_multi-board-pages.md](20261020_multi-board-pages.md)
