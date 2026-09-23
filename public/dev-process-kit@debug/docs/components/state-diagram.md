# artifact-state-diagram

States and the transitions between them. Selecting a state shows what enters and
leaves it; selecting a transition shows its condition and effect.

Shared contract (data paths, tags, pan/zoom, details, sizing):
`docs/components/diagrams.md`.

```html
<artifact-state-diagram heading="State machine" subject="注文ライフサイクル">
  <script type="application/json">
    {
      "states": [
        { "id": "pending", "name": "注文受付", "code": "pending", "kind": "initial", "position": { "x": 0, "y": 40 } },
        { "id": "paid", "name": "支払済み", "kind": "normal", "position": { "x": 300, "y": 40 } }
      ],
      "transitions": [
        {
          "id": "charge",
          "from": "pending",
          "to": "paid",
          "title": "決済成功",
          "tags": ["正常系"],
          "guard": "署名を検証した成功通知、または結果照会で成功を確認",
          "effect": "決済IDを保存し、paid へ一度だけ更新する。"
        }
      ]
    }
  </script>
</artifact-state-diagram>
```

## Data

`states[]`:

| Field         | Required | Meaning                                                                                                                                                       |
| ------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`          | yes      | Stable id; transitions reference it.                                                                                                                          |
| `name`        | yes      | Label on the card.                                                                                                                                            |
| `code`        | no       | Model-side code (`payment_pending`), shown under the name.                                                                                                    |
| `kind`        | no       | `normal` (default) \| `initial` \| `terminal` \| `compensation`. `initial` draws the entry marker; `terminal` gets a double border; `compensation` is tinted. |
| `description` | no       | Shown in the details panel for the state.                                                                                                                     |
| `position`    | no       | `{ x, y }`. When **every** state has one, the diagram keeps them; otherwise it lays the states out automatically.                                             |

`transitions[]`:

| Field         | Required | Meaning                                                                                                                     |
| ------------- | -------- | --------------------------------------------------------------------------------------------------------------------------- |
| `id`          | yes      | Stable id.                                                                                                                  |
| `from` / `to` | yes      | State ids. A transition may point at its own state (self-loop).                                                             |
| `title`       | yes      | Label on the edge.                                                                                                          |
| `kind`        | no       | `normal` (default) \| `exception` (dashed, amber).                                                                          |
| `tags`        | no       | **The tag filter applies to transitions here**, not to states: filtering hides transitions and the states left without any. |
| `guard`       | no       | The condition, shown in the details panel and as the edge tooltip.                                                          |
| `effect`      | no       | What the transition does.                                                                                                   |

Unknown transition endpoints, duplicate ids and unknown keys throw: the element
renders the reason instead of a wrong diagram.

## Selection

| Selection    | Shown                                                                                                              |
| ------------ | ------------------------------------------------------------------------------------------------------------------ |
| a state      | its description, plus linked lists of the incoming and outgoing transitions (clicking one selects that transition) |
| a transition | `from → to`, the guard, the effect and its tags                                                                    |

Related transitions are highlighted, the rest dim; the same happens for states.

## Layout

Author `position` on every state to keep a hand-made layout (recommended: a state
diagram is usually clearer when a human placed it). Without positions the shared
layered layout ranks states left to right, and backward edges are routed below
the row.

## Interactions

- Click a card or an edge to select; `Enter` / `Space` works on the focused edge.
- The initial marker follows its state, and disappears with it when a filter
  removes the state.
