# dpk-component-kanban

Columns of cards, read left to right, with cards in priority order top to bottom. Reviewers move cards between and within columns and add new ones; each change is recorded as a draft action for the agent to fold into the JSON.

Shared contract (data paths, tags, pan/zoom, comments, element actions, sizing): `docs/components/diagrams.md`.

```html
<dpk-component-kanban id="checkout-board" heading="Kanban" subject="注文フロー刷新">
  <script type="application/json">
    {
      "columns": [
        {
          "id": "todo",
          "label": "ToDo",
          "color": "gray",
          "cards": [
            { "id": "login", "title": "ログイン画面", "tags": ["UI"], "assignee": "kimura" },
            { "id": "order-api", "title": "注文 API", "description": "冪等キーを受け付ける。", "tags": ["API"] }
          ]
        },
        {
          "id": "doing",
          "label": "作業中",
          "color": "blue",
          "limit": 2,
          "cards": [{ "id": "stock", "title": "在庫の仮確保" }]
        },
        { "id": "done", "label": "完了", "color": "green", "cards": [] }
      ]
    }
  </script>
</dpk-component-kanban>
```

## Data

`columns` is the board, in reading order (left to right).

| Column field  | Required | Meaning                                                                                        |
| ------------- | -------- | ---------------------------------------------------------------------------------------------- |
| `id`          | yes      | Stable id, unique on the board. It is the comment target (`element:<diagram-id>/column/<id>`). |
| `label`       | yes      | Column heading.                                                                                |
| `description` | no       | Shown under the heading and as its tooltip.                                                    |
| `color`       | no       | Heading color: `gray` \| `blue` \| `green` \| `amber` \| `violet` \| `red`. Cards keep theirs. |
| `limit`       | no       | WIP limit, an integer ≥ 1. The count reads `n / limit`, and a column over it is highlighted.   |
| `cards`       | no       | Cards, in priority order (top to bottom).                                                      |

| Card field    | Required | Meaning                                                                                                |
| ------------- | -------- | ------------------------------------------------------------------------------------------------------ |
| `id`          | yes      | Stable id, unique across the whole board. It is the comment target (`element:<diagram-id>/card/<id>`). |
| `title`       | yes      | Text on the card.                                                                                      |
| `description` | no       | Shown on the card (up to three lines) and in full as the tooltip.                                      |
| `tags`        | no       | Tag filter values, shown on the card.                                                                  |
| `assignee`    | no       | Shown at the card's bottom right.                                                                      |
| `questions`   | no       | Question references for the grill template.                                                            |

Duplicate column or card ids and unknown keys are errors, and the element renders the reason instead of a wrong board.

## Layout

Columns are fixed-width lanes side by side; cards take the height their text needs. The board opens at 100% from the top-left corner and stays there when it is smaller than the canvas. A wide board pans horizontally; maximize it to see more columns at once.

A column's `color` tints its heading, so statuses read at a glance; the colors come from the theme palette. Without a `color` the heading stays plain.

## Tags

The tag filter hides cards only. Every column stays, so the board keeps its shape and counts still show the whole column; the toolbar reads `shown / total Card` while a filter is active.

## Selection and moves

| Action                              | Result                                                                                |
| ----------------------------------- | ------------------------------------------------------------------------------------- |
| Click a column heading              | The column is selected                                                                |
| Click a card, or `Enter` / `Space`  | The card is selected                                                                  |
| Drag a card and drop it in a column | The card moves before the card under the pointer, or to the end; a marker shows where |

Cards move by drag and drop only. A moved card is selected and drawn with a blue left border. Dropping a card where it already is records nothing.

## Adding cards

**+ Card** at the bottom of each column opens an input. Type a title and press `Enter` to add a card at the end of the column; `Escape` cancels. The new card is drawn with a dashed border and selected. Its id is derived from the title and kept unique on the board.

Moves and added cards are not written into the JSON child. They are recorded as element actions in the enclosing template's draft, next to its actions and comments, and appear in its review rail. The board replays these actions over the authored data, so they survive a reload and reach the agent in the brief. Outside a template, or without a diagram `id`, there is nothing to record into: the board stays as it is and shows an error (the add input keeps its text).

| Action      | Target                                    | Payload                                          | Result                                                                |
| ----------- | ----------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------- |
| `ADD_CARD`  | `element:<diagram-id>/column/<column-id>` | `{ "id": string, "title": string }`              | Appends a card `{ id, title }` to the end of the column's `cards`     |
| `MOVE_CARD` | `element:<diagram-id>/card/<card-id>`     | `{ "column": string, "before": string \| null }` | Moves the card into `column`, before the card `before`, or to its end |

`ADD_CARD` is stale when the column no longer exists (`target-missing`), or when the title is empty or the id is already in use (`constraint-violated`). `MOVE_CARD` is stale when the card no longer exists (`target-missing`), or when the destination column is missing, `before` is not in it, or `before` is the card itself (`constraint-violated`). Actions replay in order, so a later action sees the board the earlier ones left.

To apply them to the JSON child, in draft order:

- `ADD_CARD`: append `{ "id": <id>, "title": <title> }` to the target column's `cards`.
- `MOVE_CARD`: remove the card from its column's `cards` and insert it into `column`'s `cards` before the card `before`, or at the end when `before` is `null`. Keep the card's other fields.
