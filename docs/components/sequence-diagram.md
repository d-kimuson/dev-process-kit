# dpk-component-sequence-diagram

Participants on a rail, messages as numbered rows, and `alt` / `opt` / `loop` / `par` fragments that fold individually.

Shared contract (data paths, tags, pan/zoom, comments, sizing): `docs/components/diagrams.md`.

```html
<dpk-component-sequence-diagram heading="Sequence" subject="注文と決済">
  <script type="application/json">
    {
      "participants": [
        { "id": "browser", "name": "ブラウザ", "role": "購入者" },
        { "id": "orders", "name": "Order API", "role": "注文の整合性" },
        { "id": "payment", "name": "Payment", "kind": "external" }
      ],
      "items": [
        { "kind": "message", "id": "create", "from": "browser", "to": "orders", "title": "POST /orders" },
        {
          "kind": "fragment",
          "id": "result",
          "operator": "alt",
          "title": "決済結果",
          "branches": [
            {
              "label": "支払完了",
              "items": [
                {
                  "kind": "message",
                  "id": "ok",
                  "from": "orders",
                  "to": "payment",
                  "title": "succeeded",
                  "style": "response"
                }
              ]
            },
            {
              "label": "カード拒否",
              "items": [
                {
                  "kind": "message",
                  "id": "ng",
                  "from": "payment",
                  "to": "orders",
                  "title": "payment_failed",
                  "style": "response"
                }
              ]
            }
          ]
        }
      ]
    }
  </script>
</dpk-component-sequence-diagram>
```

## Data

`participants[]`:

| Field         | Required | Meaning                                                                            |
| ------------- | -------- | ---------------------------------------------------------------------------------- |
| `id`          | yes      | Stable id; messages reference it.                                                  |
| `name`        | yes      | Name on the rail.                                                                  |
| `role`        | no       | Second line (`購入者`, `決済プロバイダ`).                                          |
| `symbol`      | no       | Short glyph in the avatar tile (`UI`, `DB`); defaults to the first two characters. |
| `kind`        | no       | `internal` (default) \| `external` (dashed tile, amber).                           |
| `description` | no       | Shown as the participant tooltip.                                                  |

`items[]` is an ordered list of two node kinds, and its order **is** the order of the diagram:

```text
{ kind: 'message',  id, from, to, title, style?, tags?, guard?, detail? }
{ kind: 'fragment', id, operator, title, collapsed?, branches: [{ label, items: [...] }] }
```

| Field         | Required       | Meaning                                                                                                                        |
| ------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `from` / `to` | yes            | Participant ids; `from === to` draws a self-message.                                                                           |
| `style`       | no             | `request` (default) \| `response` (dashed) \| `async` (blue, open arrow head).                                                 |
| `tags`        | no             | Filtered by the tag row; a fragment whose messages all disappear goes with them.                                               |
| `guard`       | no             | The condition, shown as the row tooltip.                                                                                       |
| `detail`      | no             | What the message guarantees, shown in the row tooltip labelled by `style` (`処理 / 保証`, `応答 / 保証`, `非同期処理 / 保証`). |
| `operator`    | yes (fragment) | `alt` \| `opt` \| `loop` \| `par`.                                                                                             |
| `collapsed`   | no             | `true` starts the fragment folded, showing its branch labels on one line.                                                      |

Message numbers follow declaration order, not the filter, so `Q`-style references stay valid while you narrow the view.

## Interaction

- **Fold** a fragment from its header (`▾` / `▸`). Folding is per fragment; there is no "collapse all".
- A selected participant highlights every message it sends or receives.
- The rows are tall: the diagram opens width-fitted and top-aligned, and pans down from there.
