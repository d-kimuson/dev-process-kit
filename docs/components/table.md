# dpk-table

A generic table of typed columns — text, number, tag, status, person. Reviewers sort, group and filter rows in the browser (view-only, never recorded), select a row, and add, edit, delete or reorder rows; each change is recorded as a draft action for the agent to fold into the JSON — the same way `dpk-kanban` records a move or a new card.

```html
<dpk-table id="stories" heading="Stories">
  <script type="application/json">
    {
      "columns": [
        { "id": "name", "label": "Story", "type": "text" },
        { "id": "estimate", "label": "Est.", "type": "number" },
        { "id": "status", "label": "Status", "type": "status" },
        { "id": "labels", "label": "Labels", "type": "tag", "sortable": false },
        { "id": "assignee", "label": "Assignee", "type": "person" }
      ],
      "rows": [
        {
          "id": "login",
          "cells": {
            "name": "Login",
            "estimate": 3,
            "status": { "label": "Doing", "tone": "blue" },
            "labels": ["auth"],
            "assignee": "kimura"
          }
        },
        { "id": "checkout", "cells": { "name": "Checkout", "estimate": 5 } }
      ]
    }
  </script>
</dpk-table>
```

`heading` replaces the title shown above the toolbar; without it the title reads the kit's own name (`Table` / `テーブル`). Unlike the diagrams and the kanban board, the table takes no `subject` and is not a diagram: no maximize, no pan/zoom, no tag filter — it sits in the page's normal flow at the height its rows need. A host template can also drive it reactively by setting its `.data` property instead of authoring a JSON child (see `dpk-diagram`'s own `.data`).

## Data

`columns` declares the table's shape, in display order (left to right).

| Column field | Required | Meaning                                                                                                        |
| ------------ | -------- | -------------------------------------------------------------------------------------------------------------- |
| `id`         | yes      | Stable id, unique on the table. Keys each row's `cells`, and is the sort / group-by target.                    |
| `label`      | yes      | Column heading.                                                                                                |
| `type`       | yes      | One of `text` \| `number` \| `tag` \| `status` \| `person`. Fixes the shape every row's cell for it must have. |
| `sortable`   | no       | Default `true`. `false` hides the sort button for this column (for example `tag`, which has no natural order). |

`rows` is the table's content, in authored order (before any sort, group or filter).

| Row field   | Required | Meaning                                                                                                         |
| ----------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| `id`        | yes      | Stable id, unique on the table. It is the comment target (`element:<table-id>/row/<id>`) and the action target. |
| `cells`     | no       | A record keyed by column id. A column with no entry renders empty.                                              |
| `questions` | no       | Question references for the page's questions (`docs/index.md`, Questions (grill)).                              |

Each cell's shape depends on its column's `type`:

| Type     | Shape                                 | Empty            | Rendered as                                                                           |
| -------- | ------------------------------------- | ---------------- | ------------------------------------------------------------------------------------- |
| `text`   | string                                | `null` / omitted | plain text, editable                                                                  |
| `number` | number                                | `null` / omitted | plain text, editable                                                                  |
| `tag`    | array of strings                      | `[]` / omitted   | one chip per entry                                                                    |
| `status` | `{ "label": string, "tone": string }` | `null` / omitted | a colored pill; `tone` is `gray` \| `blue` \| `green` \| `amber` \| `violet` \| `red` |
| `person` | string                                | `null` / omitted | plain text                                                                            |

A cell whose shape does not match its column's declared type, a duplicate column or row id, or a cell for an unknown column, are all errors; the element renders the reason instead of a wrong table.

## Layout

The table sits in the page's normal flow at the height its rows need; one wider than its panel scrolls sideways on its own, independently of the page.

## Sorting, grouping and filtering

The toolbar offers a filter box (substring, case-insensitive, over every cell) and a "Group by" select (any column); each sortable column's heading is also a button that cycles ascending → descending → unsorted. All three are browser-only view state: they are never recorded as an action and never change the authored JSON, so a reviewer can slice the table freely without adding noise to the draft.

## Selection

Click a row, or focus it and press `Enter` / `Space`, to select it; the element dispatches `dpk-table-select` with `{ id: <row-id> }` and nothing is recorded. The hosting template decides what selection means — for example, the USM template opens the story panel for the row's story.

## Comments

Every row is a comment target (`element:<table-id>/row/<id>`), listed under `commentTargets` grouped by the table's heading and id. Its comment button dispatches `dpk-comment-request` with `{ target: <row-target> }`.

## Adding, editing, deleting and reordering rows

**+ Row** at the end of the toolbar adds an empty row (every cell empty) and selects it. Double-click a `text` or `number` cell to edit it inline; `Enter` or blurring the input commits, `Escape` cancels. Drag a row by its handle and drop it before another row, or past the last one; a marker shows where it will land. The handle, and reordering, are only offered while the rows are in their authored order (no sort and no group-by active).

None of this touches the JSON child directly. Every change is recorded as an element action in the enclosing template's draft, next to its actions and comments, and appears in its review rail. The table replays these actions over the authored data, so they survive a reload and reach the agent in the brief. Outside a template, or without a table `id`, there is nothing to record into: the table stays as it is and shows an error (**+ Row** leaves the row count unchanged).

| Action        | Target                          | Payload                                            | Result                                                                       |
| ------------- | ------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------- |
| `ADD_ROW`     | `element:<table-id>/table/rows` | `{ "id": string, "cells"?: Record<string, cell> }` | Appends a row `{ id, cells }` to the end of `rows`                           |
| `SET_CELL`    | `element:<table-id>/row/<id>`   | `{ "column": string, "value": cell }`              | Replaces the row's cell for `column` with `value`                            |
| `DELETE_ROW`  | `element:<table-id>/row/<id>`   | `{}`                                               | Removes the row                                                              |
| `REORDER_ROW` | `element:<table-id>/row/<id>`   | `{ "before": string \| null }`                     | Moves the row before the row `before`, or to the end when `before` is `null` |

`ADD_ROW` is stale when its id is already in use, or a cell does not match its column's declared type (`constraint-violated`). `SET_CELL` is stale when the row or the column no longer exists (`target-missing`), or the value does not match the column's type (`constraint-violated`). `DELETE_ROW` is stale when the row no longer exists (`target-missing`). `REORDER_ROW` is stale when the row no longer exists (`target-missing`), or `before` names neither an existing row nor `null`, or the row itself (`constraint-violated`). Actions replay in order, so a later action sees the table the earlier ones left.

To apply them to the JSON child, in draft order:

- `ADD_ROW`: append `{ "id": <id>, "cells": <cells> }` to `rows`.
- `SET_CELL`: replace the row's `cells.<column>` with `value`.
- `DELETE_ROW`: remove the row from `rows`.
- `REORDER_ROW`: remove the row from `rows` and insert it before the row `before`, or at the end when `before` is `null`. Keep the row's other fields.

## Read-only

The `readonly` attribute (boolean) hides **+ Row**, each row's delete button, cell editing and the drag handle. The comment button stays: commenting does not depend on `readonly`, only on the table having an `id`.
