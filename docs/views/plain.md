# View: plain (`<dpk-view-plain>`)

Your own markup, with the review loop around it, and nothing else of its own. Use it for a page no other view fits: design notes, a set of diagrams, a comparison table. You own every region.

```text
dpk-view-plain
  main    slot="main" — your content
```

The header, the floating menu, the review and the hand-off are the app's ([page.md](../page.md)), and the view brings no subject of its own: everything a reader produces is a comment. Comments can target the view as a whole, a declared section, or an element of a board placed inside.

## Base data

```json
{
  "title": "注文フローの設計メモ",
  "sections": [
    { "id": "background", "title": "背景" },
    { "id": "decision", "title": "決めたこと" }
  ]
}
```

| Field        | Required | Meaning                                                   |
| ------------ | -------- | --------------------------------------------------------- |
| `title`      | no       | Title of the view. Defaults to `Plain`.                   |
| `sections[]` | no       | `{ id, title }` — parts of your prose that take comments. |

Section ids follow the common id rule (letters, digits, `_`, `-`); a duplicate id or an unknown key is an error. A minimal document is `{}`.

## Main area

Put anything in `slot="main"`. Load `components.js` alongside `views/plain.js` when it contains components or an embedded board (or use the all-in-one `index.js`):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/dev-process-kit@<version>/dist/views/plain.js"></script>
<script type="module" src="https://cdn.jsdelivr.net/npm/dev-process-kit@<version>/dist/boards.js"></script>

<dpk-app storage-key="checkout-notes">
  <dpk-page name="notes">
    <dpk-view-plain>
      <script type="application/json">
        { "title": "注文フローの設計メモ", "sections": [{ "id": "decision", "title": "決めたこと" }] }
      </script>

      <div slot="main">
        <section>
          <h2>決めたこと</h2>
          <button type="button" data-dpk-comment="section:decision">このセクションにコメント</button>
          <p>…</p>
        </section>
        <dpk-board-state-diagram id="order-lifecycle">…</dpk-board-state-diagram>
      </div>
    </dpk-view-plain>
  </dpk-page>
</dpk-app>
```

Give `<dpk-app>` the page's height (`docs/index.md`, Page height): the main area scrolls inside the shell.

## Comment targets

| Target                   | How the reader reaches it                                                       |
| ------------------------ | ------------------------------------------------------------------------------- |
| `page:plain`             | The review composer, with nothing attached (the view as a whole)                |
| `section:<id>`           | `data-dpk-comment="section:<id>"` on your markup, or the composer's target list |
| `element:<board-id>/...` | A board's element comment icon (see `docs/boards/index.md`); needs a board `id` |

Inside a page the app qualifies each of these with the page's name (`section:decision@notes`); write the bare form in the view's own markup.

A comment on a section that disappears from the base data, or on a board element that no longer exists, stays in the draft as **stale** instead of being dropped. Keep section and board ids stable across revisions so existing comments keep their targets.

## Navigation

None. The view leaves the URL hash untouched; `data-dpk-navigate` on your markup has nothing to navigate to.

## Change notices

[Change notices](../index.md#change-notices)'s "Show" has nothing of its own to go on, since plain renders your own markup: mark the element a change is about with `data-dpk-target="type:id"` on it (space-separated when one element stands for several targets), e.g. `<section slot="main" data-dpk-target="section:background">`. Use `navigate` instead of (or alongside) `target` for anything a hash should open.
