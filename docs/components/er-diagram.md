# dpk-component-er-diagram

Tables, fields and foreign keys — with an **always-on diff** between two schema snapshots: added is green, removed is red and struck through, changed shows `− before / + after` on the same row.

Shared contract (data paths, tags, pan/zoom, comments, sizing): `docs/components/diagrams.md`.

```html
<dpk-component-er-diagram heading="ERD" subject="注文スキーマ">
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
</dpk-component-er-diagram>
```

## Data

Two snapshots of the same shape: `{ tables: [{ id, name, tags?, fields }] }`.

| Field                  | Required | Meaning                                                                                                                      |
| ---------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `tables[].id`          | yes      | Stable id; `ref` and the diff match on it.                                                                                   |
| `tables[].name`        | yes      | Human label next to the id.                                                                                                  |
| `tables[].tags`        | no       | The tag filter applies to tables.                                                                                            |
| `fields[].id`          | yes      | Column name.                                                                                                                 |
| `fields[].type`        | yes      | Column type, shown verbatim.                                                                                                 |
| `fields[].key`         | no       | `PK` \| `FK` \| `UQ`, or an array of them for a column with several roles: `["FK", "UQ"]`, `["PK", "FK"]`.                   |
| `fields[].ref`         | no       | `table.field` the FK points at. It **is** the relation: no separate edge list.                                               |
| `fields[].nullable`    | no       | `true` shows `nullable` in the row detail, and makes the referenced side of the relation optional (`0..1`).                  |
| `fields[].cardinality` | no       | Needs `ref`. Declares the relation as `parent:child` when the keys alone cannot say it — see [Cardinality](#cardinality).    |
| `fields[].label`       | no       | Needs `ref`. A short verb phrase naming the relation (`places`, `発注する`), read from the referenced table to the FK table. |

`before` is optional; without it the baseline is `after` itself, so nothing is marked as changed (a plain schema diagram). The diff is derived, never authored — a table is `added` / `removed` / `changed` from what happened to its fields, a field is `changed` when type, key, ref, nullability, cardinality or label differ, and a relation is `added` / `removed` from the endpoint pair and `changed` when its cardinality or label differs — so red and green can never disagree with the data.

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

- **Change marks** — `+` added, `−` removed, `~` changed, on both the table card and the field row; a removed field row is struck through.
- **Relations** are drawn from the referenced field to the FK field that points at it, colored by the relation's status, in crow's foot notation — no arrowheads. Each end carries the symbol and the multiplicity of the table it touches: the **parent** multiplicity at the referenced end, the **child** multiplicity at the FK end. Against the table sits the maximum (a bar for one, a three-pronged foot for many) and just outside it the minimum (a bar for one, a circle for zero), so `1` is two bars, `0..1` a bar and a circle, `1..N` a foot and a bar, `0..N` a foot and a circle. The number is written beside its symbol, along the line; the `label` sits under the FK end's number. Relations leaving the same referenced column fan out a little so their ends and numbers stay apart. A changed relation is amber and keeps its previous value struck through.
- **Search** narrows the diagram to tables whose id, name or field matches, and marks the matching rows.
- **Selection** highlights the tables connected to the selected one (either direction) and dims the rest. It never adds a detail panel below the canvas.
- **Comments** — give the diagram a stable HTML `id` and place it inside a template. Hover a table or relationship to reveal its comment icon, then activate the icon to open the shared composer beside it. Selection alone does not open the input. Keyboard focus also reveals the icon, and it stays visible on devices without hover. The composer follows pan/zoom without resizing the diagram. Send there with the button or `Ctrl`/`Cmd+Enter`; the comment is saved to the template's Review without opening its rail. Escape/cancel closes the surface, and switching selections preserves unsent text per target for the mounted component. Fields are not separate comment targets.

## Layout

Table height follows its fields (a changed row is taller because it shows two lines), and edges attach to the specific field rows, so a relation lands on the column that carries it. Ranks follow the FK direction.
