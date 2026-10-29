# View: slides (`<dpk-view-slides>`)

A slide deck: one 16:9 slide at a time, in reading order. Use it when an agent explains something step by step — how a mechanism works, what changed and why, a design walked through — and the reader should follow one idea per screen and comment on the slide they are looking at.

```text
dpk-view-slides
  sidebar  outline: every slide by number and title, with its comment count
  main     the slide on screen
           · the deck bar: previous / next, position, progress, "Present"
           · the speaker notes, under the stage and never on it
           · the comments on this slide and a form to add one, beneath it
```

The header, the floating menu and the review are the app's ([page.md](../page.md)).

A reader produces two kinds of thing here, and the review rail keeps them apart. Their **comments** are questions and remarks about the deck: the form beneath the slide writes to the slide on screen (`⌘` / `Ctrl` + `Enter` adds it), an unsent comment stays with its slide while the reader moves through the deck, and each comment in the list above the form can be deleted there. The review composer offers the same attachment, and a comment on the deck as a whole. The **speaker notes** are the author's own material; a reader who rewrites them asks for a change to the page, so that edit is listed with the changes — see [Speaker notes](#speaker-notes).

## Base data

```json
{
  "title": "楽観的ロックを 5 分で",
  "slides": [
    { "id": "cover", "layout": "title", "title": "楽観的ロック", "subtitle": "更新の衝突を検出する仕組み" },
    {
      "id": "problem",
      "title": "何が起きるか",
      "points": ["2 人が同じ注文を開く", "後から保存した方が黙って上書きする"],
      "notes": "ここで実際の画面を見せ、もう一度保存してもらう。"
    },
    { "id": "how", "layout": "section", "title": "仕組み" },
    { "id": "flow", "title": "更新の流れ", "subtitle": "version が一致しなければ 409 を返す" }
  ]
}
```

| Field               | Required | Meaning                                                                              |
| ------------------- | -------- | ------------------------------------------------------------------------------------ |
| `title`             | no       | Deck title in the view. Defaults to `Slides`.                                        |
| `slides[]`          | no       | The deck, in order.                                                                  |
| `slides[].id`       | yes      | Stable id: comments, the URL hash and the slide body refer to it.                    |
| `slides[].layout`   | no       | `title` (opens the deck), `section` (a chapter divider) or `content` (default).      |
| `slides[].title`    | yes      | The slide heading; also its label in the outline and the review rail (`3. 仕組み`).  |
| `slides[].subtitle` | no       | One line under the heading.                                                          |
| `slides[].points`   | no       | Bullet points, as plain text.                                                        |
| `slides[].notes`    | no       | What the presenter says over this slide. Never drawn on the slide; defaults to `''`. |

Slide ids follow the common id rule (letters, digits, `_`, `-`); a duplicate id, an unknown layout or an unknown key is an error. A minimal document is `{}`, which shows an empty deck. A deck written before `notes` existed parses exactly as it did: the field is optional and only ever adds text.

Keep one idea per slide and a handful of short points: the reader follows one screen at a time. Everything they need to _read_ belongs on the slide, so write the deck as if the notes were not there.

## Speaker notes

`notes` is the presenter's material: what to say over the slide, kept with the slide in reading order and deliberately **not** part of it. The deck shows it in a pane under the stage, and [presentation](#presentation-mode) shows it beside the slide — the notes are never drawn inside the slide itself, so a deck reads correctly with or without them.

Write them with the base data (the agent's job), or let the reader rewrite one: the pane holds a field for the slide on screen, and it submits when they press **Save notes**, `⌘` / `Ctrl` + `Enter` while the field has focus. Typing alone changes nothing; an IME conversion's `Enter` is left alone. The text they have typed but not sent survives moving to another slide and, through the kit's unsent-text store, a reload ([Persistence](../index.md#persistence)).

A saved note is a draft action, `SET_SLIDE_NOTES`, a patch on `slide:<id>`:

```json
{
  "type": "SET_SLIDE_NOTES",
  "target": { "type": "slide", "id": "problem" },
  "payload": { "notes": "ここで実際の画面を見せ、もう一度保存してもらう。" }
}
```

It is the view's only action of its own, and it is a **change**, not a comment: the review rail lists it under Changes (so editing the same slide's notes twice leaves one entry, the last), the hand-off brief carries it with the other requested changes, and a note left on a slide the next version removed goes stale exactly as a comment there does. Applying it in the base data means writing the `payload.notes` string back into that slide.

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

Speaker notes are not a comment target: they are the slide's own text, and [rewriting one](#speaker-notes) is a change (`SET_SLIDE_NOTES` on the same `slide:<id>`). A comment says something _about_ the deck to the agent; a note becomes part of the deck.

## Navigation

The slide on screen lives in the URL hash: `#slide=<id>`. An unknown or missing id opens the first slide, so a link to a slide survives the deck being reordered. Inside a page the app prefixes the key with the page's name — `#page=deck&deck.slide=how`.

- The outline, the deck bar and `data-dpk-navigate="slide=<id>"` on your markup move between slides.
- `→` / `PageDown` next, `←` / `PageUp` previous, `Home` / `End` first / last. Keys typed into a text field are left alone, and `↑` / `↓` keep scrolling. The keys stop at either end of the deck.
- Presentation adds one key, `present`, described below. `data-dpk-navigate="present=1"` enters it from your own markup, and `data-dpk-navigate="present=0"` leaves it.
- A deck on a page that is not showing (its `<dpk-page>` is hidden) does not take these keys: only the deck the reader is looking at moves.

## Presentation mode

**Present** on the deck bar shows the current slide as the whole screen: the outline, the deck bar and the comment form are gone, and only the slide, previous / next, the position and **Exit presentation** remain. This is the browser's page, not an extra window: it works inside a frame that refuses full screen, and the deck remembers where it was.

- It is **viewing state, in the hash**: `#present=1&slide=<id>`. So a presentation survives a reload and can be linked to, the browser's back button leaves it, and entering or leaving never adds anything to the draft. Only `present=1` means anything; `present=0` (or any other value) is dropped when the hash is canonicalized, as is `present` on a deck with no slides.
- The same keys move through it (`→` / `PageDown`, `←` / `PageUp`, `Home` / `End`), clamped at either end. `Esc`, **Exit presentation**, and `data-dpk-navigate="present=0"` leave it, keeping the slide on screen.
- The slide is drawn from the same markup as in review, so a slide body (`slot="preview"`) appears here too. The comment form does not, but what the reader had typed in it is still there on the way out.
- The speaker notes are shown beside the slide for the presenter, whenever the slide has any — presentation is exactly when they are wanted, so there is no toggle to find. They are never projected _onto_ the slide: a screen recording of the slide, or the reader in review, never sees them.
- **Full screen** inside presentation (where `document.fullscreenEnabled` allows it) makes the same surface fill the screen through the browser's own API; the button is absent where a frame refuses it, and presentation works either way.

While the review rail is open, `Esc` closes the rail first and presentation on the next press: the rail is the layer on top.

## Change notices

[Change notices](../index.md#change-notices)'s "Show" on a `slide:<id>` goes to that slide and highlights it.
