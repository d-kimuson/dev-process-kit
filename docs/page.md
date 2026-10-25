# App and pages

Every document is one `<dpk-app>` holding one or more `<dpk-page>` elements. A page is one
switchable subject; its content is exactly one **view** (`dpk-view-*`, page-only) or **board**
(`dpk-board-*`, embeddable and page-capable). The app owns the header, the review, one draft, one
storage record, the hash and undo/redo; a page owns its name and its content.

Most documents hold one page, and read as that view or board alone. When the reader has to agree
on more than one subject at once — the scope (`usm`), the domain events (`event-storming`) and the
screens (`prototype`) of one feature — they are more pages of the same app, with one review for
all of them: a comment can point from one page to another.

```text
dpk-app
  header  app title / a switcher icon, the page shown (renamed in place), its settings; language, theme, review
  main    the page shown; the others stay mounted, hidden
```

The header carries one switcher icon, ahead of the active page's name so neither ever shifts as a
name appears or changes. Hover, click or keyboard focus opens a popover listing the app's pages
(the one shown checked, with a × beside each to remove it) and, last, **+** to add one. With one
page there is no name beside the icon — only the icon and, once a second page exists, the title the
reader gave the first. Click (or Enter) the page's name in the header to rename it in place; Enter
or blur commits, Escape cancels.

A direct child of `<dpk-app>` with `slot="header"` joins that same header, after the switcher and
page settings but before the kit's own language, theme and review controls: the place for a fixed
item of the document's own, such as a repo or package link. It is the ordinary `header` slot every
view exposes ([index.md](index.md#slots-and-styling)).

## Load it

Every view entry registers `<dpk-app>` and `<dpk-page>`. Load the entries of the views and boards
the document holds, or `index.js` for all of them. The **+** offers the views and boards whose
entry is loaded, so load `index.js` when the reader should be able to add a page of any kind.

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/dev-process-kit@<version>/dist/index.js"></script>
```

## Markup

```html
<dpk-app storage-key="sora-market-checkout">
  <script type="application/json">
    { "title": "Sora Market — checkout" }
  </script>

  <dpk-page name="scope" label="スコープ">
    <dpk-view-usm>
      <script type="application/json">
        { "title": "購入者のストーリーマップ", "activities": [] }
      </script>
    </dpk-view-usm>
  </dpk-page>

  <dpk-page name="domain" label="ドメイン">
    <dpk-board-event-storming>
      <script type="application/json">
        { "title": "注文", "elements": [] }
      </script>
    </dpk-board-event-storming>
  </dpk-page>

  <dpk-page name="notes" label="メモ">
    <dpk-view-plain>
      <script type="application/json">
        { "sections": [{ "id": "decision", "title": "決めたこと" }] }
      </script>
      <section slot="main" data-dpk-target="section:decision">…</section>
    </dpk-view-plain>
  </dpk-page>
</dpk-app>
```

| Where       | Attribute                                  | Meaning                                                                                                                                                                                  |
| ----------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dpk-app`   | JSON child `{ "title" }`                   | The document's title in the header. Defaults to an untitled document.                                                                                                                    |
| `dpk-app`   | `storage-key`, `storage`, `notes`, `theme` | As on a view ([index.md](index.md#persistence)): the app owns the draft and the chrome.                                                                                                  |
| `dpk-app`   | `hash="off"`                               | Leaves `location.hash` alone (neither read nor written); pages still switch in memory.                                                                                                   |
| `dpk-app`   | `page-nav="none"`                          | Draws no switcher or "+": the app's own header (title, review, hand-off) still shows, for a document embedded where pages are chosen some other way.                                     |
| `dpk-page`  | `name` (required)                          | The page's id: letters, digits, `_`, `-`; unique in the app. Targets and the hash use it.                                                                                                |
| `dpk-page`  | `label`                                    | The page's name in the switcher and the header. Defaults to the content's name; the reader can rename it in place.                                                                       |
| the content | —                                          | Exactly one `dpk-view-*` or `dpk-board-*`. Its base JSON, slots and light DOM are exactly those of the view or board on its own; `storage-key` is ignored, since the draft is the app's. |

A board inside a view is embedded; a board directly inside a page is the page. There is no
attribute to switch between the two: what encloses it decides ([boards](boards/index.md)). The
switcher follows document order.

Give `dpk-app` the document's height as you would a view ([index.md](index.md#page-height)). The
root element is `<dpk-app>`, not a view.

## Targets

Inside an app every target names its page after an `@`: `story:checkout.pay@scope`,
`element:paid@domain`. `app:app` is the whole document, and a page content's
`page:<view-or-board>@<page>` is that content as a whole.

Within a page's own markup, write targets as you would on the view or board alone.
`data-dpk-comment="story:checkout.pay"` inside the `scope` page means
`story:checkout.pay@scope`, and so does `page.api.comment("story:checkout.pay", …)`. Qualify a
target only to point at another page: a link in the `domain` page can say
`data-dpk-comment="story:checkout.pay@scope"`.

## Questions

A page asks its questions as its content does on its own: a
`<script type="application/json" data-dpk-grill>` child of the view or board, next to its base
JSON ([index.md](index.md#questions-grill)). The app gathers every page's questions, and those of
its own `data-dpk-grill` child (for questions about the document as a whole), into the one
questions panel in its header.

A page's question is qualified by its page like any of its targets: question `retry` of the
`scope` page is `grill:retry@scope`, and its ref shows as `Q1@scope`. Within the page's markup,
`data-grill-questions="Q1"` means that page's `Q1` (and the app's own `Q1` when the page has
none); write `Q1@domain` to mark another page's question. Each page numbers its questions on its
own, so ids and refs only need to be unique within one block.

The hash names the page shown and keeps each page's position under its name:

```text
#page=domain&scope.activity=signup&domain.note=paid
```

Any position of any page can be deep-linked.

## Draft actions

Each page's actions are its content's vocabulary, with the target qualified by the page. The app
adds three of its own, on `app:app`:

| Type          | Payload                                                                                  | Ask                                                                                                                                                                                               |
| ------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ADD_PAGE`    | `{ "page": "<id>", "kind": "view" \| "board", "content": "<name>", "label": "<label>" }` | Add `<dpk-page name="<id>" label="<label>">` whose content is `<dpk-view-<name>>` or `<dpk-board-<name>>`. Its base JSON is the content's empty base with the draft's actions on `@<id>` applied. |
| `REMOVE_PAGE` | `{ "page": "<id>" }`                                                                     | Take that page out of the document, together with everything the draft says about it.                                                                                                             |
| `RENAME_PAGE` | `{ "page": "<id>", "label": "<label>" }`                                                 | Set that page's own name, as the header's inline edit records it.                                                                                                                                 |

A page the reader adds shows at once and takes changes and comments like any other page; it lives
in the draft until you write it into the HTML. Removing a page the draft added takes back the
`ADD_PAGE` and every action on that page. Removing a page of the HTML records `REMOVE_PAGE` and
hides the page until you take it out. Renaming always records `RENAME_PAGE`, whether the page came
from the HTML or the draft.

An action on a page that is no longer in the app is **stale** (`target-missing`), like an action
on any missing target.

## Review and the hand-off

The brief covers the whole document. It starts with a section listing each page — its id, label,
view-or-board kind and name, and how many changes and comments the draft has for it — then the
usual sections, with every target qualified by its page (answers to a page's questions included:
`grill:<id>@<page>`). Apply each action to the page it names, against that page's base JSON and
vocabulary, with the `@<page>` removed.

## Element API

`app.api` is the app's: its snapshot, the whole draft, the brief and the navigation
(`navigate({ page: "domain" })` shows a page). `page.api` keeps the shape the content has on its
own, over that page's part of the draft: its targets have no `@`, and what it dispatches goes into
the app's draft with its page fixed.
