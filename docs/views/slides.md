# View: slides (`<dpk-view-slides>`)

A slide deck: one 16:9 slide at a time, in reading order. Use it when an agent explains something step by step — how a mechanism works, what changed and why, a design walked through — and the reader should follow one idea per screen and comment on the slide they are looking at.

```text
dpk-view-slides
  sidebar  outline: every slide by number and title, with its note count
  main     the slide on screen
           · the deck bar: previous / next, position, progress, "Full screen"
           · the comments on this slide and a form to add one, beneath it
```

The header and the review are the app's ([page.md](../page.md)).

There is no action vocabulary: everything a reader produces is a comment. The form beneath the slide writes to the slide on screen (`⌘` / `Ctrl` + `Enter` adds it), an unsent comment stays with its slide while the reader moves through the deck, and each comment in the list above the form can be deleted there. The review composer offers the same attachment, and a comment on the deck as a whole.

## Base data

```json
{
  "title": "楽観的ロックを 5 分で",
  "slides": [
    { "id": "cover", "layout": "title", "title": "楽観的ロック", "subtitle": "更新の衝突を検出する仕組み" },
    {
      "id": "problem",
      "title": "何が起きるか",
      "points": ["2 人が同じ注文を開く", "後から保存した方が黙って上書きする"]
    },
    { "id": "how", "layout": "section", "title": "仕組み" },
    { "id": "flow", "title": "更新の流れ", "subtitle": "version が一致しなければ 409 を返す" }
  ]
}
```

| Field               | Required | Meaning                                                                             |
| ------------------- | -------- | ----------------------------------------------------------------------------------- |
| `title`             | no       | Deck title in the view. Defaults to `Slides`.                                       |
| `slides[]`          | no       | The deck, in order.                                                                 |
| `slides[].id`       | yes      | Stable id: comments, the URL hash and the slide body refer to it.                   |
| `slides[].layout`   | no       | `title` (opens the deck), `section` (a chapter divider) or `content` (default).     |
| `slides[].title`    | yes      | The slide heading; also its label in the outline and the review rail (`3. 仕組み`). |
| `slides[].subtitle` | no       | One line under the heading.                                                         |
| `slides[].points`   | no       | Bullet points, as plain text.                                                       |

Slide ids follow the common id rule (letters, digits, `_`, `-`); a duplicate id, an unknown layout or an unknown key is an error. A minimal document is `{}`, which shows an empty deck.

Keep one idea per slide and a handful of short points. There are no speaker notes: the reader has only the slides, so everything they need to follow belongs on one.

## Slide bodies

A text-only deck needs nothing but the base data. For anything richer — a diagram, code, a table, an illustration — add markup with `slot="preview"` and `data-preview-id` set to the slide id. It is shown on that slide, below the title and points:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/dev-process-kit@<version>/dist/views/slides.js"></script>
<script type="module" src="https://cdn.jsdelivr.net/npm/dev-process-kit@<version>/dist/boards.js"></script>

<dpk-app lang="ja" storage-key="optimistic-lock-deck">
  <dpk-page name="deck" label="楽観的ロック">
    <dpk-view-slides>
      <script type="application/json">
        { "title": "楽観的ロックを 5 分で", "slides": [{ "id": "flow", "title": "更新の流れ" }] }
      </script>

      <section slot="preview" data-preview-id="flow">
        <dpk-board-sequence-diagram id="update-flow">…</dpk-board-sequence-diagram>
      </section>
    </dpk-view-slides>
  </dpk-page>
</dpk-app>
```

Load `boards.js` alongside `views/slides.js` only when a body uses a board (or use the all-in-one `index.js`).

The slide scales with the window, and its text scales with the slide. Size text in a body with `em` (not `px`) so it scales with it; `1em` is the slide's body text, a little smaller than the points. A slide whose content is taller than the slide scrolls inside it, which reads poorly on screen: split it across slides instead.

Boards draw at a fixed pixel size and bring their own toolbar, so they only fit a slide with little else on it. Let the diagram take the height the slide has left — `height: 100%` on the body and on the diagram, with `--diagram-height: 100%` — and keep it to a few rows; a small figure made of your own markup, sized in `em`, often reads better.

Give `<dpk-app>` the page's height (`docs/index.md`, Page height): the deck scrolls inside the shell.

## Comment targets

| Target                   | How the reader reaches it                                                                                                          |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `page:slides`            | The review composer, with nothing attached ("Whole deck")                                                                          |
| `slide:<id>`             | The form beneath the slide, the composer's option to attach the slide on screen, or `data-dpk-comment="slide:<id>"` on your markup |
| `element:<board-id>/...` | A board's element comment icon (see `docs/boards/index.md`); needs a board `id`                                                    |

Inside a page the app qualifies each of these with the page's name (`slide:how@deck`); write the bare form in the view's own markup.

A comment on a slide that disappears from the base data, or on a board element that no longer exists, stays in the draft as **stale** instead of being dropped. Keep slide and board ids stable across revisions so existing comments keep their targets; renumbering is fine, since a slide is referred to by id.

## Navigation

The slide on screen lives in the URL hash: `#slide=<id>`. An unknown or missing id opens the first slide, so a link to a slide survives the deck being reordered. Inside a page the app prefixes the key with the page's name — `#page=deck&deck.slide=how`.

- The outline, the deck bar and `data-dpk-navigate="slide=<id>"` on your markup move between slides.
- `→` / `PageDown` next, `←` / `PageUp` previous, `Home` / `End` first / last. Keys typed into a text field are left alone, and `↑` / `↓` keep scrolling.
- **Full screen** shows the slide alone, as large as the screen allows; the same keys move through it and `Esc` leaves. The button is hidden where the browser does not allow full screen (for example a sandboxed frame).

## Change notices

[Change notices](../index.md#change-notices)'s "Show" on a `slide:<id>` goes to that slide and highlights it.
