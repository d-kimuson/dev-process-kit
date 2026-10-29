# dpk-board-kanban

Columns of cards, read left to right, with cards in priority order top to bottom. Reviewers move cards between and within columns and add new ones; each change is recorded as a draft action for the agent to fold into the JSON.

A board, not a diagram: it sits in the page's normal flow at its natural height, not over a pan/zoom canvas. It shares most of the diagrams' public contract (data paths, tags, comments, element actions, toolbar title and subtitle — `heading`, `subject`): `docs/boards/index.md`, except the canvas-only parts — there is no `resetView()`, no pan/zoom, and no `--diagram-height` sizing. Embedded, maximize still works, lifting the board to fill the viewport as for any diagram; as a page's content it already fills the page.

```html
<dpk-board-kanban id="checkout-board" heading="注文フロー刷新">
  <script type="application/json">
    {
      "columns": [
        {
          "id": "todo",
          "label": "ToDo",
          "color": "gray",
          "cards": [
            { "id": "login", "number": 1, "title": "ログイン画面", "tags": ["UI"], "assignee": "kimura" },
            {
              "id": "order-api",
              "number": 2,
              "title": "注文 API",
              "description": "冪等キーを受け付ける。",
              "tags": ["API"]
            }
          ]
        },
        {
          "id": "doing",
          "label": "作業中",
          "color": "blue",
          "limit": 2,
          "cards": [{ "id": "stock", "number": 3, "title": "在庫の仮確保" }]
        },
        { "id": "done", "label": "完了", "color": "green", "cards": [] }
      ]
    }
  </script>
</dpk-board-kanban>
```

`heading` replaces the toolbar title, so name the diagram after what it shows (the model, aggregate or flow); without it the toolbar reads the diagram's kind (`Kanban` / `カンバン`). `subject` adds a smaller subtitle beside the title.

## Data

`columns` is the board, in reading order (left to right).

| Column field  | Required | Meaning                                                                                        |
| ------------- | -------- | ---------------------------------------------------------------------------------------------- |
| `id`          | yes      | Stable id, unique on the board. It is the comment target (`element:<board-id>/column/<id>`).   |
| `label`       | yes      | Column heading.                                                                                |
| `description` | no       | Shown under the heading and as its tooltip.                                                    |
| `color`       | no       | Heading color: `gray` \| `blue` \| `green` \| `amber` \| `violet` \| `red`. Cards keep theirs. |
| `limit`       | no       | WIP limit, an integer ≥ 1. The count reads `n / limit`, and a column over it is highlighted.   |
| `cards`       | no       | Cards, in priority order (top to bottom).                                                      |

| Card field    | Required | Meaning                                                                                              |
| ------------- | -------- | ---------------------------------------------------------------------------------------------------- |
| `id`          | yes      | Stable id, unique across the whole board. It is the comment target (`element:<board-id>/card/<id>`). |
| `number`      | no       | The card's number, unique on the board: the card shows it as its key `TASK-<number>`.                |
| `title`       | yes      | Text on the card.                                                                                    |
| `description` | no       | Shown on the card (up to three lines) and in full as the tooltip.                                    |
| `tags`        | no       | Tag filter values, shown on the card.                                                                |
| `assignee`    | no       | Shown at the card's bottom right.                                                                    |
| `questions`   | no       | Question references for the page's questions (`docs/index.md`, Questions (grill)).                   |

Duplicate column or card ids, duplicate card numbers and unknown keys are errors, and the element renders the reason instead of a wrong board.

## Layout

Columns are fixed-width lanes side by side, in the page's normal flow; cards take the height their text needs and the board takes whatever height its columns need. A board wider than the panel scrolls sideways on its own, independently of the page; maximize it (or widen the window) to see more columns at once without scrolling.

A column's `color` tints its heading, so statuses read at a glance; the colors come from the theme palette. Without a `color` the heading stays plain.

## Tags

The tag filter hides cards only. Every column stays, so the board keeps its shape and counts still show the whole column; the toolbar reads `shown / total Card` while a filter is active.

## Card keys

Every card has a number, unique on the board, and shows it as its key `TASK-3` beside the title — the short name to use in a review comment, a hand-off message or the brief. Authored `number`s are kept as they are; a card without one takes the next number after the highest on the board, in board order (column order, then card order), so authored data that leaves them out still gets stable keys. A card added on the page continues the numbering.

Right-click a card for its copy items, above the review comment the board already offers:

| Item                     | Copies                  |
| ------------------------ | ----------------------- |
| `Copy ID` / `IDをコピー` | `TASK-3`                |
| `Copy ID and title`      | `TASK-3 カードタイトル` |

## Selection and moves

| Action                              | Result                                                                                |
| ----------------------------------- | ------------------------------------------------------------------------------------- |
| Click a column heading              | The column is selected                                                                |
| Click a card, or `Enter` / `Space`  | The card is selected                                                                  |
| Drag a card and drop it in a column | The card moves before the card under the pointer, or to the end; a marker shows where |

Cards move by drag and drop only. A moved card is selected and drawn with a blue left border. Dropping a card where it already is records nothing.

## Adding cards

**+ Card** at the bottom of each column opens an input. Type a title and press `Enter` to add a card at the end of the column; `Escape` cancels. The new card is drawn with a dashed border and selected. Its id is derived from the title and kept unique on the board, and it takes the next card number, so its key reads `TASK-<n>` like any other card's.

Moves and added cards are not written into the JSON child. They are recorded as element actions in the enclosing view's draft — or the page's, when the board is its content — next to its actions and comments, and appear in that draft's review rail. The board replays these actions over the authored data, so they survive a reload and reach the agent in the brief. Outside a view or a page, or without a board `id`, there is nothing to record into: the board stays as it is and shows an error (the add input keeps its text).

| Action      | Target                                  | Payload                                                | Result                                                                    |
| ----------- | --------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------- |
| `ADD_CARD`  | `element:<board-id>/column/<column-id>` | `{ "id": string, "title": string, "number"?: number }` | Appends a card `{ id, title, number }` to the end of the column's `cards` |
| `MOVE_CARD` | `element:<board-id>/card/<card-id>`     | `{ "column": string, "before": string \| null }`       | Moves the card into `column`, before the card `before`, or to its end     |

`ADD_CARD` is stale when the column no longer exists (`target-missing`), or when the title is empty, the id is already in use, or its `number` is already taken (`constraint-violated`). Without a `number` the card takes the next one on the board, as the board itself allocates it. `MOVE_CARD` is stale when the card no longer exists (`target-missing`), or when the destination column is missing, `before` is not in it, or `before` is the card itself (`constraint-violated`). Actions replay in order, so a later action sees the board the earlier ones left.

To apply them to the JSON child, in draft order:

- `ADD_CARD`: append `{ "id": <id>, "number": <number>, "title": <title> }` to the target column's `cards`.
- `MOVE_CARD`: remove the card from its column's `cards` and insert it into `column`'s `cards` before the card `before`, or at the end when `before` is `null`. Keep the card's other fields.
