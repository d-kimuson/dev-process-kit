# dpk-board-state-diagram

States and the transitions between them. Selecting a state highlights what enters and leaves it; a transition's condition and effect are its tooltip.

Shared contract (data paths, tags, pan/zoom, comments, sizing, toolbar title and subtitle — `heading`, `subject`): `docs/boards/index.md`.

```html
<dpk-board-state-diagram heading="注文ライフサイクル">
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
</dpk-board-state-diagram>
```

`heading` replaces the toolbar title, so name the diagram after what it shows (the model, aggregate or flow); without it the toolbar reads the diagram's kind (`State machine` / `ステートマシン`). `subject` adds a smaller subtitle beside the title.

## Data

`states[]`:

| Field         | Required | Meaning                                                                                                                                                                                             |
| ------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`          | yes      | Stable id; transitions reference it.                                                                                                                                                                |
| `name`        | yes      | Label on the card.                                                                                                                                                                                  |
| `code`        | no       | Model-side code (`payment_pending`), shown under the name.                                                                                                                                          |
| `kind`        | no       | `normal` (default) \| `initial` \| `terminal` \| `compensation`. `initial` puts a filled dot before the name, `terminal` a ringed dot and a double border, `compensation` an amber border and tint. |
| `description` | no       | Shown as the state tooltip.                                                                                                                                                                         |
| `position`    | no       | `{ x, y }`. When **every** state has one the diagram keeps them, otherwise it lays the states out automatically.                                                                                    |
| `questions`   | no       | Refs of the page's questions (grill) the state is about, space-separated (`"Q1 Q4"`); each gets a Q badge on the card (`docs/index.md`, Questions (grill)).                                         |

`transitions[]`:

| Field         | Required | Meaning                                                                                                                                                          |
| ------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`          | yes      | Stable id.                                                                                                                                                       |
| `from` / `to` | yes      | State ids; a transition may point at its own state (self-loop).                                                                                                  |
| `title`       | yes      | Label on the edge, on one line; a title too long for its chip is cut with an ellipsis, so keep it short.                                                         |
| `kind`        | no       | `normal` (default) \| `exception` (dashed, amber).                                                                                                               |
| `tags`        | no       | **The tag filter applies to transitions here**, not to states: it hides transitions and the states left without any.                                             |
| `guard`       | no       | The condition, shown as the edge tooltip.                                                                                                                        |
| `effect`      | no       | What the transition does, shown in the edge tooltip after the guard.                                                                                             |
| `questions`   | no       | Refs of the page's questions (grill) the transition is about, space-separated (`"Q1 Q4"`); each gets a Q badge on the edge (`docs/index.md`, Questions (grill)). |

Unknown transition endpoints and duplicate ids are errors, and the element renders the reason instead of a wrong diagram.

## Selection

| Selection    | Highlighted                                          |
| ------------ | ---------------------------------------------------- |
| a state      | its incoming and outgoing transitions                |
| a transition | the transition; its guard and effect are the tooltip |

Related transitions are highlighted and the rest dims; the same happens for states.

## Layout

Author `position` on every state to keep a hand-made layout (recommended: a state diagram is usually clearer when a human placed it). Without positions the shared layered layout ranks states left to right, spaced so that the transition labels fit between them.

Either way the board routes the transitions itself: every line leaves and enters a state at its border, runs around the states in between, keeps a lane of its own, and a self-loop sits outside its state. Each label is a chip on its own line, placed clear of states, of other labels and of arrowheads. Leave room between authored positions (about 120px or more) for the lines and labels that have to pass.

## Interactions

Dragging a state re-routes its transitions and moves their labels. A filter that removes a state removes its marks with it.
