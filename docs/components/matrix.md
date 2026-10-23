# dpk-matrix

A grid of rows and columns — optionally two-level columns, banding sub-columns under a group head — whose rows, columns and sub-columns can each be dragged to reorder. Unlike `dpk-table` or `dpk-kanban`, it holds no data of its own: every head and cell is the host's own markup, placed through a named slot, so the host keeps its own CSS scope, content and semantics. The matrix only lays the grid out and runs the drag mechanics, firing an event instead of moving anything itself.

```html
<dpk-matrix id="map"></dpk-matrix>
<script type="module">
  const map = document.getElementById('map');
  map.rows = [
    { id: 'mvp', draggable: true },
    { id: 'v1', draggable: true },
  ];
  map.columns = [
    { id: 'signup', draggable: true },
    { id: 'checkout', draggable: true },
  ];
</script>
```

```html
<dpk-matrix>
  <div slot="corner">Milestones \ Activities</div>
  <div slot="col-head:signup">Sign up</div>
  <div slot="col-head:checkout">Checkout</div>
  <div slot="row-head:mvp">MVP</div>
  <div slot="cell:mvp:signup">…</div>
  <div slot="cell:mvp:checkout">…</div>
  <div slot="row-head:v1">v1</div>
  <div slot="cell:v1:signup">…</div>
  <div slot="cell:v1:checkout">…</div>
</dpk-matrix>
```

## Data

`rows` and `columns` are properties only (no matching attributes — set them from script, as a host template does from its render function).

| `rows[]` field | Required | Meaning                                                                                                                                 |
| -------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `id`           | yes      | Stable id, unique among rows. Names the row's slots.                                                                                    |
| `draggable`    | no       | Default `true`. `false` excludes the row from both dragging and being a drop anchor (for example a trailing "unassigned" or "add" row). |

| `columns[]` field | Required | Meaning                                                                                                      |
| ----------------- | -------- | ------------------------------------------------------------------------------------------------------------ |
| `id`              | yes      | Stable id, unique among columns. Names the column's slots.                                                   |
| `draggable`       | no       | Default `true`, as a row's.                                                                                  |
| `subColumns`      | no       | Bands leaf columns under this one (a two-level header). Omitted or empty, the column is itself the one leaf. |

| `subColumns[]` field | Required | Meaning                                                                |
| -------------------- | -------- | ---------------------------------------------------------------------- |
| `id`                 | yes      | Stable id, unique within its own column.                               |
| `draggable`          | no       | Default `true`; a sub-column only ever reorders within its own column. |

Either every column declares `subColumns` or none do is not enforced — the matrix renders a two-level header as soon as any column has them, and a column with none spans the full row height with no second-level cell of its own.

## Slots

| Slot                                    | Holds                                                                                  |
| --------------------------------------- | -------------------------------------------------------------------------------------- |
| `corner`                                | The top-left corner, above the row heads and left of the column heads.                 |
| `corner-sub`                            | A second corner cell, read only with two-level columns (left of the sub-column heads). |
| `row-head:<rowId>`                      | One row's head.                                                                        |
| `col-head:<columnId>`                   | One column's head.                                                                     |
| `sub-head:<columnId>:<subColumnId>`     | One sub-column's head, read only with two-level columns.                               |
| `cell:<rowId>:<columnId>`               | A cell at `row × column`, for a column with no `subColumns`.                           |
| `cell:<rowId>:<columnId>:<subColumnId>` | A cell at `row × subColumn`, for a column that has `subColumns`.                       |

A row × leaf-column pair without a matching slot renders an empty cell — the host is free to leave, for example, an "add row" row's cells unfilled.

## Layout

Rows and columns lay out as a CSS grid, scrolling independently of the page when it is wider or taller than its panel. `--dpk-matrix-dock-clearance` (default `0px`) pads the bottom of the scroll area, for a host that docks something (a toolbar, a composer) over the matrix's own bottom edge — set it from the host's own CSS custom property.

## Reordering

Dragging a row's head by its whole head lifts the whole row; dragging a column's (or sub-column's) head lifts the whole column (or sub-column). Dropping before, after or past the last sibling fires a cancelable event instead of moving anything: `rows` / `columns` stay the host's own data, and the host decides what the drop means and re-renders with the new order (or doesn't, if it rejects the drop).

| Event                           | Fires on dropping…  | `detail`                                                           |
| ------------------------------- | ------------------- | ------------------------------------------------------------------ |
| `dpk-matrix-reorder-row`        | a row's head        | `{ rowId: string, after: string \| null }`                         |
| `dpk-matrix-reorder-column`     | a column's head     | `{ columnId: string, after: string \| null }`                      |
| `dpk-matrix-reorder-sub-column` | a sub-column's head | `{ columnId: string, subColumnId: string, after: string \| null }` |

`after` is the sibling id the dragged one should land behind (`null` = first). A sub-column only ever reorders among its own column's siblings. A row, column or sub-column with `draggable: false` can be dropped on as freely as any other content, but never itself drags and never anchors another one's drop — so a trailing "add" row or column stays exactly where it is.

Dragging story-like content between cells (rather than reordering the grid itself) is not part of this contract: a host wires that itself, the same way USM's story cards drag between cells of the map this component lays out.
