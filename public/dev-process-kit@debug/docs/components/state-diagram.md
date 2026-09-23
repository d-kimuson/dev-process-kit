# dpk-component-state-diagram

States and the transitions between them. Selecting a state highlights what enters and leaves it; a transition's condition and effect are its tooltip.

Shared contract (data paths, tags, pan/zoom, comments, sizing): `docs/components/diagrams.md`.

```html
<dpk-component-state-diagram heading="State machine" subject="注文ライフサイクル">
  <script type="application/json">
    {
      "states": [
        { "id": "pending", "name": "注文受付", "kind": "initial", "position": { "x": 0, "y": 40 } },
        { "id": "paid", "name": "支払済み", "position": { "x": 300, "y": 40 } }
      ],
      "transitions": [
        {
          "id": "charge",
          "from": "pending",
          "to": "paid",
          "title": "決済成功",
          "tags": ["正常系"],
          "guard": "署名を検証した成功通知",
          "effect": "決済IDを保存し、paid へ一度だけ更新する。"
        }
      ]
    }
  </script>
</dpk-component-state-diagram>
```

## Data

`states[]`:

| Field         | Required | Meaning                                                                                                                                               |
| ------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`          | yes      | Stable id; transitions reference it.                                                                                                                  |
| `name`        | yes      | Label on the card.                                                                                                                                    |
| `code`        | no       | Model-side code (`payment_pending`), shown under the name.                                                                                            |
| `kind`        | no       | `normal` (default) \| `initial` \| `terminal` \| `compensation`. `initial` draws the entry marker, `terminal` a double border, `compensation` a tint. |
| `description` | no       | Shown as the state tooltip.                                                                                                                           |
| `position`    | no       | `{ x, y }`. When **every** state has one the diagram keeps them, otherwise it lays the states out automatically.                                      |

`transitions[]`:

| Field         | Required | Meaning                                                                                                              |
| ------------- | -------- | -------------------------------------------------------------------------------------------------------------------- |
| `id`          | yes      | Stable id.                                                                                                           |
| `from` / `to` | yes      | State ids; a transition may point at its own state (self-loop).                                                      |
| `title`       | yes      | Label on the edge.                                                                                                   |
| `kind`        | no       | `normal` (default) \| `exception` (dashed, amber).                                                                   |
| `tags`        | no       | **The tag filter applies to transitions here**, not to states: it hides transitions and the states left without any. |
| `guard`       | no       | The condition, shown as the edge tooltip.                                                                            |
| `effect`      | no       | What the transition does, shown in the edge tooltip after the guard.                                                 |

Unknown transition endpoints and duplicate ids are errors, and the element renders the reason instead of a wrong diagram.

## Selection

| Selection    | Highlighted                                          |
| ------------ | ---------------------------------------------------- |
| a state      | its incoming and outgoing transitions                |
| a transition | the transition; its guard and effect are the tooltip |

Related transitions are highlighted and the rest dims; the same happens for states.

## Layout

Author `position` on every state to keep a hand-made layout (recommended: a state diagram is usually clearer when a human placed it). Without positions the shared layered layout ranks states left to right and routes backward edges below the row.

## Interactions

The initial marker follows its state, and disappears with it when a filter removes the state.
