# Switch boards from the header, not a rail

`<dpk-page>` switches boards from one icon in the header, not a left rail. The icon sits ahead of the active board's own name, so neither ever shifts as a name appears, disappears or changes length between one board and several. Hover, click or keyboard focus opens a popover listing the page's boards (the one shown checked, a × beside each to remove it) and, last, "+" to add one. The board's name beside the icon is edited in place.

## Status

accepted. Supersedes the rail-specific guidance of [20261020_multi-board-pages.md](20261020_multi-board-pages.md) ("a left icon rail switches the visible board") and of [20261022_page-as-the-base-form.md](20261022_page-as-the-base-form.md) ("the rail is a region of its own, always drawn... it carries its own fold toggle"); the rest of both decisions stands.

## Context

The rail reserved a fixed column before the main content on every page, even with one board, and page-as-the-base-form.md already named its own cost: the rail's fold toggle duplicated the board's own sidebar fold button, one control shown twice. A reader opens a page mostly to work in one board and glances at the others now and then; a column of tabs earns its keep when boards have long, unequal names to tell apart at a glance, but not for the common case of one or two boards, where it cost a whole column for a single "+" or a couple of short tabs.

The rail also had no natural place to rename a board — the page's own board names (`label`) could only be set from the HTML, never from the reader's own session, even though every other board-wide property (which boards exist at all) was already a change of the draft.

## Decision

- **One switcher icon replaces the rail.** A single icon button in the header opens the popover on hover, click or keyboard focus; `board-nav="header"` is removed as an opt-in, since this is now simply how `<dpk-page>` always shows its boards. `board-nav="none"` keeps meaning no board nav at all, for a page embedding boards chosen some other way (the catalog).
- **The icon stands to the left of the board's name.** With one board there is no name beside the icon, only the icon; once a second board exists, the active board's name follows it. The icon's position never depends on whether a name is showing or how long it is, so adding a second board, or renaming one, causes no layout shift.
- **The board's name is renamed in place, through the draft.** The name beside the icon is a `<dpk-inline-edit>`; click or Enter starts editing, Enter or blur commits, Escape cancels. Committing dispatches the page's own `RENAME_BOARD` action (new, alongside `ADD_BOARD`/`REMOVE_BOARD`), so a rename is reviewed, handed off and undone like any other change to the draft.
- **Removing a board moves into the popover.** Each board row carries a × that dispatches `REMOVE_BOARD` (or takes back `ADD_BOARD`, as before), replacing the rail's own remove button.
- **The templates a board can be added from stay one data-driven list.** `PageElement.boardTemplates()` (each page sets it once — `src/page/index.ts`'s `BOARD_TEMPLATES`) is unchanged by this decision; the switcher's trailing "+" view reads it exactly as the rail's add menu did, so offering a new addable board kind is still a matter of extending that one list.

## Consequences

- A page with one board no longer reserves a column for board nav; one-board and many-board pages share the same header chrome.
- The fold toggle the rail duplicated goes with it. A board's own sidebar still draws its own fold button on its own edge — the generic mechanism `page-as-the-base-form.md` already described as independent of the rail.
- A page of many boards trades a glanceable list of names for a popover the reader opens; nothing stops a future list view from using the same `BOARD_TEMPLATES`/switcher-row data if that trade is ever revisited.
- Renaming records `RENAME_BOARD` whether the board came from the HTML or the draft, so a renamed board's HTML-given `label` becomes stale the moment the reader renames it in the session — the HTML is still the board's base, not its current name.

## References

- [20261020_multi-board-pages.md](20261020_multi-board-pages.md)
- [20261022_page-as-the-base-form.md](20261022_page-as-the-base-form.md)
- `docs/page.md`
