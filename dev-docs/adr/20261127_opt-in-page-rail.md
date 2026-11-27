# An author can list the pages in a rail under the fixed header

## Status

accepted

Adds to [ADR: The screen's chrome is a fixed header row and a floating menu](20261029_fixed-header-with-floating-menu.md) and [ADR: Switch boards from the header, not a rail](20261023_header-board-switcher.md); neither is superseded. The header row and its switcher stay the base form of every document; the rail stands in for the switcher only in a document that asks for it.

## Context

The switcher is one icon and a popover. That fits the common document of one or two pages, and the record that chose it named its cost: a document of many pages trades a list of names the reader can see at a glance for a popover the reader has to open.

That cost is real for some documents. A feature reviewed as scope, domain events, screens, data model and tasks is five or more pages the reader moves between repeatedly, and the popover hides both where they are among them and which pages hold pending changes.

The two earlier rails failed for reasons that are not about a rail as such:

- The first rail was drawn on every page, so a document of one page reserved a column for a single tab.
- The side rail replaced the header, so the title left the top of the screen and the content had to carry a title bar.

## Decision

A rail of pages is an opt-in of the document's author: `<dpk-app page-nav="sidebar">`. Without it nothing changes.

- **The author chooses, not the kit and not the reader.** Whether a document has enough pages for a rail to pay for its column is known when the document is written. A rail that appeared at some page count would shift the layout as the reader adds a page.
- **The header keeps everything but the switcher.** The title, the content's own header controls and the reader's controls stay where they are. The rail is a column of the body, under the header row.
- **The rail replaces the switcher.** Two lists of the same pages on one screen say the same thing twice, so the header draws no switcher while the rail is drawn. The rail carries what the switcher does: a tab shows the page's icon, its name and the count of the draft's actions on it, the page shown is renamed on its tab, each tab has a "×", and a "+" under the tabs adds a page.
- **A narrow screen draws the switcher instead of the rail.** Under 720px the column costs too much of the width, so the document falls back to the base form there and the page nav is never lost.

## Consequences

- Adding, renaming and removing a page each have two renderings, the switcher's and the rail's, over the same intents. A change to one of them has to be made in both.
- The rail costs a fixed column on every page of a document that asks for it, including a board page that wants the full width.
- The rail's tabs are narrow, so a long page name is cut to two lines; the whole name is the tab's title. Renaming happens in that same narrow field.
- `page-nav` is now a choice of three (`none`, the header switcher, `sidebar`), and a later nav style has to fit that one attribute.

## References

- [20261029_fixed-header-with-floating-menu.md](20261029_fixed-header-with-floating-menu.md)
- [20261023_header-board-switcher.md](20261023_header-board-switcher.md)
- `docs/page.md`
