# dpk-er-diagram

Tables, fields and foreign keys — with an **always-on diff** between two schema snapshots: added is green, removed is red and struck through, changed shows the previous value struck through next to the new one.

Shared contract (data paths, tags, pan/zoom, comments, sizing, toolbar title and subtitle — `heading`, `subject`): `docs/components/diagrams.md`.

```html
<dpk-er-diagram heading="注文スキーマ">
  <script type="application/json">
    {
      "before": {
        "tables": [
          {
            "id": "orders",
            "name": "注文",
            "fields": [
              { "id": "id", "type": "uuid", "key": "PK" },
              { "id": "status", "type": "varchar" }
            ]
          }
        ]
      },
      "after": {
        "tables": [
          {
            "id": "orders",
            "name": "注文",
            "tags": ["今回の設計"],
            "fields": [
              { "id": "id", "type": "uuid", "key": "PK" },
              { "id": "status", "type": "order_status" }
            ]
          },
          {
            "id": "inventory_reservations",
            "name": "在庫予約",
            "fields": [
              { "id": "id", "type": "uuid", "key": "PK" },
              { "id": "order_id", "type": "uuid", "key": "FK", "ref": "orders.id" }
            ]
          }
        ]
      }
    }
  </script>
</dpk-er-diagram>
```

`heading` replaces the toolbar title, so name the diagram after what it shows (the model, aggregate or flow); without it the toolbar reads the diagram's kind (`ERD` / `ER図`). `subject` adds a smaller subtitle beside the title.

## Data

Two snapshots of the same shape: `{ tables: [{ id, name, tags?, boundedContext?, aggregate?, pattern?, fields, constraints? }] }`.

| Field                     | Required | Meaning                                                                                                                                                            |
| ------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tables[].id`             | yes      | Stable id; `ref` and the diff match on it.                                                                                                                         |
| `tables[].name`           | yes      | Human label next to the id.                                                                                                                                        |
| `tables[].tags`           | no       | The tag filter applies to tables.                                                                                                                                  |
| `tables[].boundedContext` | no       | Separate from `tags`, but folded into them as `BC:<name>` so it filters with the same Single/AND/OR semantics, in the same row; its chip sits ahead of plain tags. |
| `tables[].aggregate`      | no       | Purely visual: tables sharing one are grouped with a labeled dashed boundary on the canvas.                                                                        |
| `tables[].pattern`        | no       | One of `immutable`, `mutable`, `sti`, `cti`, `value-object` — shown as a small badge on the card. Not a filter.                                                    |
| `tables[].constraints`    | no       | Composite, table-level constraints spanning more than one column — see [Table-level constraints](#table-level-constraints).                                        |
| `fields[].id`             | yes      | Column name.                                                                                                                                                       |
| `fields[].type`           | yes      | Column type, shown verbatim.                                                                                                                                       |
| `fields[].key`            | no       | `PK` \| `FK` \| `UQ`, or an array of them for a column with several roles: `["FK", "UQ"]`, `["PK", "FK"]`.                                                         |
| `fields[].ref`            | no       | `table.field` the FK points at. It **is** the relation: no separate edge list.                                                                                     |
| `fields[].nullable`       | no       | `true` gives the row the hollow (nullable) icon, and makes the referenced side of the relation optional (`0..1`).                                                  |
| `fields[].cardinality`    | no       | Needs `ref`. Declares the relation as `parent:child` when the keys alone cannot say it — see [Cardinality](#cardinality).                                          |
| `fields[].label`          | no       | Needs `ref`. A short verb phrase naming the relation (`places`, `発注する`), read from the referenced table to the FK table.                                       |
| `fields[].description`    | no       | Supplementary note shown in a smaller muted line under the column name, like a table's own `name` — never part of the diff.                                        |

`before` is optional; without it the baseline is `after` itself, so nothing is marked as changed (a plain schema diagram). The diff is derived, never authored — a table is `added` / `removed` / `changed` from what happened to its fields, a field is `changed` when type, key, ref, nullability, cardinality or label differ, and a relation is `added` / `removed` from the endpoint pair and `changed` when its cardinality or label differs — so red and green can never disagree with the data. `name`, `fields[].description` and `constraints` are supplementary and never diffed.

## Table-level constraints

A constraint spanning more than one column together — a composite `UNIQUE` or `PK`, a `CHECK`, or an `EXCLUDE` — does not belong to any single field, so it is declared on the table itself:

```json
"constraints": [
  { "kind": "unique", "columns": ["tenant_id", "email"] },
  { "kind": "check", "expression": "amount > 0" },
  { "kind": "exclude", "using": "gist", "elements": ["room WITH =", "during WITH &&"] }
]
```

`kind` is `unique` \| `primary-key` \| `check` \| `exclude`. `unique` and `primary-key` take `columns` (at least one); `check` takes `expression`; `exclude` takes `elements` (each already reading `column WITH operator`) and an optional `using` (the index method, e.g. `gist`; omitted for the default `btree`). They render as a compact, monospace list under the column rows — `UNIQUE (tenant_id, email)`, `CHECK (amount > 0)`, `EXCLUDE USING gist (room WITH =, during WITH &&)` — and are reviewed through the table's own comment target, like `name`. They are read-only: there is no on-page editor for them yet.

## Cardinality

Every relation has two multiplicities — `1`, `0..1`, `1..N` or `0..N` — one at each end of its line, written here as `parent : child`:

- **parent** — how many referenced rows one FK row has: `1`, or `0..1` when the FK is `nullable`.
- **child** — how many FK rows one referenced row has: `0..1` when the FK column is unique on its own (`UQ` among its keys, or it is the table's only `PK` column, as in a shared primary key), otherwise `0..N`. A `PK` column of a composite key (several `PK` columns in the table) is not unique on its own.

| FK column                                                       | Label         | Reads as                     |
| --------------------------------------------------------------- | ------------- | ---------------------------- |
| `"key": "FK"`                                                   | `1 : 0..N`    | one-to-many                  |
| `"key": "FK", "nullable": true`                                 | `0..1 : 0..N` | optional many-to-one         |
| `"key": ["FK", "UQ"]` or `"key": ["PK", "FK"]` (only PK column) | `1 : 0..1`    | one-to-zero-or-one           |
| `"key": ["FK", "UQ"], "cardinality": "1:1"`                     | `1 : 1`       | one-to-one, declared         |
| `"key": "FK", "cardinality": "1:1..N"`                          | `1 : 1..N`    | at least one child, declared |

`cardinality` states what the schema cannot enforce on its own (an order has at least one line, a profile always exists, uniqueness across several columns). It takes one of `1:1`, `1:0..1`, `1:1..N`, `1:0..N`, `0..1:1`, `0..1:0..1`, `0..1:1..N`, `0..1:0..N`, and must agree with the keys: the parent side must match `nullable`, and a unique FK cannot declare `1..N` or `0..N`. A contradiction is rejected rather than drawn.

## Reading it

The cards follow the look of [Liam ERD](https://liambx.com/): a header with the table id on one line and its name under it, then one compact row per column — an icon, the column name (with its own `description`, if any, in a smaller muted line under it), and its type on the right.

- **Column icons** — a key for a `PK`, a link for an `FK` (or any column with `ref`), a filled diamond for `NOT NULL` and a hollow one for a nullable column. A key the icon does not show sits as a small tag after the name (`UQ`, or `FK` on a `PK` column).
- **Change marks** — `+` added, `−` removed, `~` changed, as a chip in the table's header and in a mark column in front of the rows (only in tables that changed). Added rows are tinted green, removed rows red and struck through, changed rows amber. A changed type shows `old new` in the type cell; every other changed attribute (keys, ref, nullability, cardinality, label) is listed under the row as `attribute old → new`.
- **Relations** are curves from the referenced column's row to the FK column's row, colored by the relation's status, in crow's foot notation — no arrowheads. Each end carries the symbol of the table it touches: the **parent** multiplicity at the referenced end, the **child** multiplicity at the FK end. Against the table sits the maximum (a bar for one, a three-pronged foot for many) and just outside it the minimum (a bar for one, a circle for zero), so `1` is two bars, `0..1` a bar and a circle, `1..N` a foot and a bar, `0..N` a foot and a circle. The multiplicities as text, and the `label` under the FK end, appear while the relation is highlighted or hovered; a changed relation is amber and always shows them, with its previous value struck through. Relations leaving the same referenced column fan out a little so their ends stay apart, and a line never runs behind a table: where a card stands between its two ends it goes around it, through the gap above or below.
- **Highlight** — follows the keys. Hovering a table, or selecting it, lights every relation it takes part in, the tables at their other ends and the two columns each relation joins. Hovering a column row narrows that to the relations its key carries (a column that joins nothing lights its whole table), and hovering or selecting a relation lights it and its two columns. Lit relations are blue with a flow along the line (still under `prefers-reduced-motion`), and lit columns are tinted with their name in blue, so the reader sees which key leads to which. While something is lit the other relations fade; tables never dim. Selection never adds a detail panel below the canvas.
- **Search** narrows the diagram to tables whose id, name or field matches, and marks the matching rows.
- **Bounded Context grouping** — tables sharing a `boundedContext` sit inside a solid frame labeled with its name; the layout keeps a Bounded Context's tables together as one contiguous region (see [Layout](#layout)).
- **Aggregate grouping** — within a Bounded Context, tables sharing an `aggregate` additionally sit inside a nested dashed boundary, labeled with the aggregate's name; the layout keeps them adjacent inside their Bounded Context, same as the grouping above.
- **Bounded Context filter** — picking a `BC:<name>` chip never hides the other tables: every table keeps its position, the picked Bounded Context and its relations stay at full opacity, everything else (tables, relations, frames) dims, and the view pans/zooms to fit the picked Bounded Context. Clearing the filter restores full opacity without moving anything.
- **Pattern badge** — a table's `pattern` (`immutable`, `mutable`, `sti`, `cti`, `value-object`) shows as a small badge beside its name. An auxiliary attribute, not a filter.
- **Column filter** — a toolbar three-way toggle: **All** (default), **Keys** (only columns with a key or `ref`, so the relationships alone can be read) and **Tables only** (header only, no columns). Table-level constraints still render in **Tables only**, since they describe the table rather than any one column.
- **Comments** — give the diagram a stable HTML `id` and place it inside a template. Right-click a table or a relationship and choose "Review comment" from the context menu to open the shared composer beside it. Selection alone does not open the input. The composer follows pan/zoom without resizing the diagram. Send there with the button or `Ctrl`/`Cmd+Enter`; the comment is saved to the template's Review without opening its rail. Escape/cancel closes the surface, and switching selections preserves unsent text per target for the mounted component. Fields are not separate comment targets.

## Adding, editing and deleting columns

Reviewers propose column changes on the page, in a small editor that floats like a tooltip and follows pan/zoom. **Add column** at the bottom of a table opens it under the button, with the name, the type, a **Description** note, an **Allow NULL** checkbox, **Cancel** and **Add**. The pencil at the end of a column row (shown on hover or focus, always on touch devices) — the only button on the row; there is no separate delete — opens it under that row for the column's type, nullability and description, with **Save**; the row stays where it is, ringed while it is edited, and the editor's icon follows the nullability as it is toggled. The type is a combobox: a click on it, typing or an arrow key opens a list under it that shows the types already in the schema, narrowed to those containing what is typed, and offers what was typed as a **New type** when the schema does not use it yet. The arrow keys move through the list; `Enter` or a click takes one, and `Enter` on the type already in the input confirms the editor; `Escape` closes the list first. Only one editor is open at a time. `Enter` confirms (from an empty type, `Enter` in the name moves to the type first). `Escape`, a press outside, or the same button again closes it and keeps what was typed for when the same editor opens again; **Cancel** discards it. **Add** / **Save** stays disabled until the input records something new. A name the table already uses is flagged before submitting. An added column is drawn green and an edited one as a changed row, like any other change against the `before` snapshot. A removed column cannot be opened at all. A column that carries a relation (`ref`) still opens its editor — if only to reach Delete — but **Save** never activates for it, since the relation's multiplicities derive from the column.

Deleting a column is an action inside its editor: a danger-styled **Delete column** button in the editor's footer, offered for every present column, including one a relation references or an FK column itself. It removes a plain column outright if it was only ever `added`, or marks an existing one `removed` like any other change, and closes the editor. When the column carries one or more relations, on either end, those relations are removed from the diagram in the same action (so undoing it restores both), and the editor names how many will go before the delete is confirmed.

Selecting a relation (its line, not a table) opens a small editor beside it for the relation's cardinality — a `parent : child` picker over the same values `fields[].cardinality` accepts. Picking a value commits it at once: there is no Cancel or Save. It opens and closes with the selection itself, so no separate trigger is needed; deselecting the relation (a press elsewhere, or Escape) puts it away.

These changes are not written into the JSON child. They are recorded as element actions in the enclosing template's draft and replayed over the authored data, so they survive a reload and reach the agent in the brief. Like comments, they are addressed by the diagram's `id`: without one, **Add column**, the pencils and the cardinality editor are not shown. Outside a template the diagram shows an error and keeps the input.

| Action             | Target                                 | Payload                                                                            | Result                                                                                         |
| ------------------ | -------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `ADD_FIELD`        | `element:<diagram-id>/node/<table-id>` | `{ "id": string, "type": string, "nullable"?: boolean, "description"?: string }`   | Appends `{ id, type }` (plus `nullable`, `description`) to the table's `after` fields          |
| `EDIT_FIELD`       | `element:<diagram-id>/node/<table-id>` | `{ "field": string, "type": string, "nullable": boolean, "description"?: string }` | Sets the column's `type`, `nullable` (and `description`, when given) in `after`                |
| `DELETE_FIELD`     | `element:<diagram-id>/node/<table-id>` | `{ "field": string }`                                                              | Removes `field` from `after` fields, or marks it `removed` if it predates the draft            |
| `EDIT_CARDINALITY` | `element:<diagram-id>/edge/<edge-id>`  | `{ "cardinality": string }`                                                        | Sets the relation's `cardinality` in `after` (`parent:child`, see [Cardinality](#cardinality)) |

`ADD_FIELD` is stale when the table no longer exists (`target-missing`), or when the id is empty or already used (`constraint-violated`). `EDIT_FIELD` and `DELETE_FIELD` are both stale when the table or column no longer exists (`target-missing`), or the column is already `removed` (`constraint-violated`); `EDIT_FIELD` is additionally stale when the column has a `ref` (`constraint-violated`), since editing it would contradict the relation its keys derive — `DELETE_FIELD` carries no such restriction, and removes any relations the column carries, on either end, along with it. `EDIT_CARDINALITY` is stale when the relation no longer exists (`target-missing`), or `cardinality` is not one of the accepted values (`constraint-violated`). Actions replay in order. To apply them, edit the `after` snapshot's table in draft order.

## Layout

Tables are laid out hierarchically: first by Bounded Context (each one a contiguous, framed region), then by aggregate within it (a nested dashed boundary), then by individual table. Bounded Contexts and aggregates are ordered to keep the relations crossing between them few and short; within each group, ranks still follow the FK direction and the layout minimizes edge crossings. The same data always lays out into the same positions (deterministic), and a table dragged out of its computed position keeps that position across a re-layout. Picking a Bounded Context from the filter (see [Reading it](#reading-it)) only dims the rest and refocuses the view — it never moves a table.

Table height follows its rows as drawn (a changed row that lists attributes under it is taller, and a long table id wraps), and edges attach to the specific column rows, so a relation lands on the column that carries it.
