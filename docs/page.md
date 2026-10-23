# Page (`<dpk-page>`)

Every page is a `<dpk-page>` holding its templates as boards. Most pages hold one board, and read as that template alone. When the reader has to agree on more than one subject at once — the scope (`usm`), the domain events (`event-storming`) and the screens (`prototype`) of one feature — they are more boards of the same page. The page has one header, one review, one draft and one brief for every board, so the reader reviews and hands off once, and a comment can point from one board to another.

```text
dpk-page
  header  page title / a switcher icon, the board shown (renamed in place), its settings; language, theme, review
  main    the board shown; the others stay mounted, hidden
```

The header carries one switcher icon, ahead of the active board's name so neither ever shifts as a name appears or changes. Hover, click or keyboard focus opens a popover listing the page's boards (the one shown checked, with a × beside each to remove it) and, last, **+** to add one. With one board there is no name beside the icon — only the icon and, once a second board exists, the title the reader gave the first. Click (or Enter) the board's name in the header to rename it in place; Enter or blur commits, Escape cancels. Growing a page from one board to several adds a child and nothing else.

A direct child of `<dpk-page>` with `slot="header"` — not a board — joins that same header, after the switcher and board settings but before the kit's own language, theme and review controls: the place for a fixed item of the page's own, such as a repo or package link. It is the ordinary `header` slot every template exposes ([index.md](index.md#slots-and-styling)); on a board it instead fills that board's own header bar, since the slot lives on whichever element you put it on.

## Load it

Every template entry registers `<dpk-page>`. Load the entries of the templates the page holds, or `index.js` for all of them. The **+** offers the templates whose entry is loaded, so load `index.js` when the reader should be able to add a board of any kind.

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/dev-process-kit@<version>/dist/index.js"></script>
```

## Markup

```html
<dpk-page storage-key="sora-market-checkout">
  <script type="application/json">
    { "title": "Sora Market — checkout" }
  </script>

  <dpk-template-usm board="scope" label="スコープ">
    <script type="application/json">
      { "title": "購入者のストーリーマップ", "activities": [] }
    </script>
  </dpk-template-usm>

  <dpk-event-storming board="domain" label="ドメイン" variant="board">
    <script type="application/json">
      { "title": "注文", "elements": [] }
    </script>
  </dpk-event-storming>
</dpk-page>
```

| Where         | What                                       | Meaning                                                                                                                                                          |
| ------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dpk-page`    | JSON child `{ "title" }`                   | The page's title in the header. Defaults to an untitled page.                                                                                                    |
| `dpk-page`    | `storage-key`, `storage`, `notes`, `theme` | As on a template ([index.md](index.md#persistence)): the page owns the draft and the chrome.                                                                     |
| `dpk-page`    | `hash="off"`                               | Leaves `location.hash` alone (neither read nor written); boards still switch in memory. Default (or any other value) keeps the hash as every page always had it. |
| `dpk-page`    | `board-nav="none"`                         | Draws no switcher or "+": the page's own header (title, review, hand-off) still shows, for a page embedded where boards are chosen some other way.               |
| a board child | `board` (required)                         | The board's id: letters, digits, `_`, `-`; unique in the page. Targets and the hash use it.                                                                      |
| a board child | `label`                                    | The board's name in the switcher and the header. Defaults to the template's (or diagram's) name; the reader can rename it in place once the page has it.         |

A board is a direct child of `dpk-page` with a `board` attribute — a template (`docs/templates/<name>.md`) or a diagram component set to `variant="board"` (`docs/components/diagrams.md`, Board hosting). Its base JSON, slots and light DOM are exactly those of the template or diagram on its own; its `storage-key` is ignored, since the draft is the page's. A board's `slot="sidebar"` and `slot="aside"` content ([index.md](index.md#slots-and-styling)) sits beside that board and folds with it. The switcher follows document order. Give `dpk-page` the page's height as you would a template ([index.md](index.md#page-height)).

## Targets

Inside a page every target names its board after an `@`: `story:checkout.pay@scope`, `element:paid@domain`. `page:page` is the page as a whole, and a board's `page:<template>@<board>` is that board.

Within a board's own markup, write targets as you would on the template alone. `data-dpk-comment="story:checkout.pay"` inside the `scope` board means `story:checkout.pay@scope`, and so does `board.api.comment("story:checkout.pay", …)`. Qualify a target only to point at another board: a link in the `domain` board can say `data-dpk-comment="story:checkout.pay@scope"`.

## Questions

A board asks its questions as it would on its own: a `<script type="application/json" data-dpk-grill>` child of the board, next to its base JSON ([index.md](index.md#questions-grill)). The page gathers every board's questions, and those of its own `data-dpk-grill` child (for questions about the page as a whole), into the one questions panel in its header.

A board's question is qualified by its board like any of its targets: question `retry` of the `scope` board is `grill:retry@scope`, and its ref shows as `Q1@scope`. Within the board's markup, `data-grill-questions="Q1"` means that board's `Q1` (and the page's own `Q1` when the board has none); write `Q1@domain` to mark another board's question. Each board numbers its questions on its own, so ids and refs only need to be unique within one block.

The hash names the board shown and keeps each board's position under its id:

```text
#board=domain&scope.activity=signup&domain.note=paid
```

Any position of any board can be deep-linked.

## Draft actions

Each board's actions are its template's vocabulary, with the target qualified by the board. The page adds two of its own, on `page:page`:

| Type           | Payload                                                         | Ask                                                                                                                                                   |
| -------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ADD_BOARD`    | `{ "board": "<id>", "template": "<name>", "label": "<label>" }` | Add `<dpk-template-<template> board="<id>" label="<label>">`. Its base JSON is the template's empty base with the draft's actions on `@<id>` applied. |
| `REMOVE_BOARD` | `{ "board": "<id>" }`                                           | Take that board out of the page, together with everything the draft says about it.                                                                    |
| `RENAME_BOARD` | `{ "board": "<id>", "label": "<label>" }`                       | Set that board's own name, as the header's inline edit records it.                                                                                    |

A board the reader adds shows at once and takes changes and comments like any other board; it lives in the draft until you write it into the HTML. Removing a board the draft added takes back the `ADD_BOARD` and every action on that board. Removing a board of the HTML records `REMOVE_BOARD` and hides the board until you take it out. Renaming always records `RENAME_BOARD`, whether the board came from the HTML or the draft.

An action on a board that is no longer on the page is **stale** (`target-missing`), like an action on any missing target.

## Review and the hand-off

The brief covers the whole page. It starts with a section listing each board — its id, label, template, and how many changes and comments the draft has for it — then the usual sections, with every target qualified by its board (answers to a board's questions included: `grill:<id>@<board>`). Apply each action to the board it names, against that board's base JSON and vocabulary, with the `@<board>` removed.

## Element API

`page.api` is the page's: its snapshot, the whole draft, the brief and the navigation (`navigate({ board: "domain" })` shows a board). `board.api` keeps the shape it has on a template alone, over that board's part of the draft: its targets have no `@`, and what it dispatches goes into the page's draft with its board fixed.
