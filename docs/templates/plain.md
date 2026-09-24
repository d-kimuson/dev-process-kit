# Template: plain (`<dpk-template-plain>`)

The shell and the review pipeline, and nothing else. Use it for a page no other template fits: design notes, a set of diagrams, a comparison table. The author owns every region; the template brings the header chrome, the review rail, persistence and the agent hand-off.

```text
dpk-template-plain
  header  template label + title, draft / note counts; slot="header" for your own controls
  main    slot="main" — your content
  rail    Review notes, opened from the floating button (bottom right)
```

There is no action vocabulary: everything a reader produces is a comment. Comments can target the whole page, a declared section, or an element of a diagram placed inside.

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
| `title`      | no       | Page title in the chrome. Defaults to `Plain`.            |
| `sections[]` | no       | `{ id, title }` — parts of your prose that take comments. |

Section ids follow the common id rule (letters, digits, `_`, `-`); a duplicate id or an unknown key is an error. A minimal document is `{}`.

## Main area

Put anything in `slot="main"`. Load `components.js` alongside `templates/plain.js` when it contains diagram elements (or use the all-in-one `index.js`):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/dev-process-kit@<version>/dist/templates/plain.js"></script>
<script type="module" src="https://cdn.jsdelivr.net/npm/dev-process-kit@<version>/dist/components.js"></script>

<dpk-template-plain storage-key="checkout-notes">
  <script type="application/json">
    { "title": "注文フローの設計メモ", "sections": [{ "id": "decision", "title": "決めたこと" }] }
  </script>

  <div slot="main">
    <section>
      <h2>決めたこと</h2>
      <button type="button" data-dpk-comment="section:decision">このセクションにコメント</button>
      <p>…</p>
    </section>
    <dpk-component-state-diagram id="order-lifecycle">…</dpk-component-state-diagram>
  </div>
</dpk-template-plain>
```

Give the host a height (for example `dpk-template-plain { display: block; height: 100dvh; }`): the main area scrolls inside the shell.

## Comment targets

| Target                     | How the reader reaches it                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| `page:plain`               | The review composer, with nothing attached                                                 |
| `section:<id>`             | `data-dpk-comment="section:<id>"` on your markup, or the composer's target list            |
| `element:<diagram-id>/...` | A diagram's element comment icon (see `docs/components/diagrams.md`); needs a diagram `id` |

A comment on a section that disappears from the base data, or on a diagram element that no longer exists, stays in the draft as **stale** instead of being dropped. Keep section and diagram ids stable across revisions so existing comments keep their targets.

## Navigation

None. The template leaves the URL hash untouched; `data-dpk-navigate` on your markup has nothing to navigate to.
