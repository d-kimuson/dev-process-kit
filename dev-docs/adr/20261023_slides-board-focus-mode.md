# Slides is a board like any other, with a focus mode that hides the page's own chrome

`dpk-template-slides` is no longer written as a standalone, full-viewport page on its own. It sits inside `<dpk-page>` as a board, the same as every other template, and gets the full area under the page header the same way they do. A new **Focus mode** control, added to `BoardHost` (`src/core/page/host.ts`) and `TemplateElement` (`src/core/element.ts`), lets a boarded template ask its page to hide its own header — and, with it, the board switcher — so the board underneath gets the whole screen while presenting.

## Status

accepted. Settles, for slides, the open question left by [20261022_page-as-the-base-form.md](20261022_page-as-the-base-form.md) and [20261023_diagram-as-board.md](20261023_diagram-as-board.md) ("slides is a presentation mode, not a canvas, and stays unsettled by this decision"). Whiteboard's own answer is already settled by the latter (it is a diagram, out of scope here).

## Context

[20261022_page-as-the-base-form.md](20261022_page-as-the-base-form.md) made `<dpk-page>` the one shape every page is taught as, but left whole-screen templates — `slides`, `whiteboard` — without an answer for how they sit inside a page's chrome. [20261023_diagram-as-board.md](20261023_diagram-as-board.md) answered it for whiteboard by moving it to a diagram component with its own `variant="board"`, and explicitly left slides unsettled: a deck paged through one slide at a time is a presentation mode, not a canvas, so the diagram contract does not fit it. `sample/slides.html` still used a bare `<dpk-template-slides>` outside `<dpk-page>`, the one template left on the old standalone path.

Two concerns kept slides off the `<dpk-page>` path:

- **Layout.** Nothing had confirmed that a board gets the full height under the page header rather than some constrained or scrolling box, which a deck meant to be read one slide at a time cannot tolerate.
- **Presenting.** A deck read full-screen is the whole point of slides, but a page's own header and board switcher are chrome a reader presenting to someone else does not want on screen, and no board had ever asked a page to get out of the way like that.

A smaller, now-fixed bug surfaced while checking the first concern: `#onKeydown` listens on `document` so a clicker's arrow keys reach the deck from anywhere, but a board parked behind another one on the same page stays connected and `hidden`, not disconnected (`PageElement#syncBoards`) — so a hidden slides board was still stealing arrow keys meant for whatever board is actually active.

## Decision

- **Slides is an ordinary board; no layout change was needed.** `dpk-internal-layout-app`'s CSS grid (`grid-template-rows: auto minmax(0,1fr) auto`) already gives the middle row — where a board's `#renderBoardChrome` content lands — all the remaining height, so a board of slides gets the same full area under the header that every other template gets. Confirmed by reading the layout and by the browser check below; no change to `src/core/layouts/app/element.ts`.
- **A hidden board stops listening.** `src/templates/slides/element.ts`'s `#onKeydown` guard now also bails out when `this.hidden`, so a board parked behind another one (`PageElement#syncBoards` sets `board.hidden = id !== active`) no longer intercepts arrow keys meant for the active board. Covered by a new test in `src/templates/slides/slides.test.ts`.
- **Focus (present) mode is a `BoardHost` capability, not a slides-only hack.** `BoardHost` (`src/core/page/host.ts`) gains `setFocus(active: boolean): void` and `focused(): boolean`; `TemplateElement` (`src/core/element.ts`) exposes them to every template as a `focused` getter and a `setFocused()` method, delegating to the board host and doing nothing on a template used standalone (there is no page chrome to hide). Any future board, not only slides, can ask to be focused the same way.
- **`PageElement` hides its own header with one CSS rule, driven by a reflected attribute.** `PageElement` tracks `#focused` and reflects it as `data-focused` on itself in `updated()`; `pageStyles` adds `:host([data-focused]) .dpk-header { display: none; }`. Because `dpk-internal-layout-app`'s header row is sized from its slotted content with no fixed height, hiding the slotted `<header class="dpk-header">` collapses the row to nothing and the grid gives that space back to the board below — the same mechanism that already gives a board its height, not a new one.
- **Esc leaves focus mode, through the same `DismissController` pattern the switcher popover already uses.** A second `DismissController` instance in `PageElement`'s constructor owns `Escape` while focused, with `closesOn: () => false` so a stray pointer press on the slide itself — advancing it — never drops the reader out of presenting; only `Esc` or the board's own control does.
- **The control lives on the board, not the page.** `renderStage` (`src/templates/slides/render/stage.ts`) adds a **Focus mode** button next to the existing full-screen button, shown only when `canFocus` (the deck is `board !== null`), toggling `focused`/`exitFocusMode` label and `aria-pressed` the same way the full-screen button already reflects its own state. The page has no "present" button of its own; a board chooses whether presenting makes sense for it.
- **Focus mode and the browser's full screen stay orthogonal.** Fullscreen (`.stage:fullscreen`, `#fullscreen()`) is unchanged and coexists with focus mode: a reader can focus the page, go full screen, or both, in either order.

## Consequences

- Every template gets `focused`/`setFocused()` for free through the base class, at no cost to a template that never calls them; only slides uses it today.
- `sample/slides.html` moves to the `<dpk-page storage-key="…">` / `<dpk-template-slides board="slides">` form used by every other sample (`usm.html`, `whiteboard.html`), with the page's own JSON holding just the title. `docs/templates/slides.md` documents the new Focus mode button next to the existing Full screen entry.
- Slides keeps `addable: false` (`TemplateDefinition`); a page author places it once, by hand, same as before — this decision does not change how a board is added, only how it behaves once placed.
- **Option (c) — slides as components placed in a plain board, rather than a template of its own — is deliberately deferred, not blocked.** Nothing here forecloses it: `setFocus`/`focused` are a `BoardHost`/`TemplateElement` capability any future arrangement of slides-as-components could still reach through the same contract, and the CSS mechanism hiding the page header does not assume the board underneath is a single template element.

## References

- [20261022_page-as-the-base-form.md](20261022_page-as-the-base-form.md)
- [20261023_diagram-as-board.md](20261023_diagram-as-board.md)
- [20261023_header-board-switcher.md](20261023_header-board-switcher.md)
- [20261020_multi-board-pages.md](20261020_multi-board-pages.md)
- `src/core/page/host.ts`
- `src/core/page/element.ts`
- `src/core/element.ts`
- `src/templates/slides/element.ts`
- `src/templates/slides/render/stage.ts`
