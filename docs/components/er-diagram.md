# artifact-er-diagram

Tables, fields and foreign keys — with an **always-on diff** between two schema snapshots: added is green, removed is red and struck through, changed shows `− before / + after` on the same row.

Shared contract (data paths, tags, pan/zoom, comments, sizing): `docs/components/diagrams.md`.

```html
<artifact-er-diagram heading="ERD" subject="注文スキーマ">
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
</artifact-er-diagram>
```

## Data

Two snapshots of the same shape: `{ tables: [{ id, name, tags?, fields }] }`.

| Field               | Required | Meaning                                                                        |
| ------------------- | -------- | ------------------------------------------------------------------------------ |
| `tables[].id`       | yes      | Stable id; `ref` and the diff match on it.                                     |
| `tables[].name`     | yes      | Human label next to the id.                                                    |
| `tables[].tags`     | no       | The tag filter applies to tables.                                              |
| `fields[].id`       | yes      | Column name.                                                                   |
| `fields[].type`     | yes      | Column type, shown verbatim.                                                   |
| `fields[].key`      | no       | `PK` \| `FK` \| `UQ`.                                                          |
| `fields[].ref`      | no       | `table.field` the FK points at. It **is** the relation: no separate edge list. |
| `fields[].nullable` | no       | `true` shows `null可` in the row detail.                                       |

`before` is optional; without it the baseline is `after` itself, so nothing is marked as changed (a plain schema diagram). The diff is derived, never authored — a table is `added` / `removed` / `changed` from what happened to its fields, a field is `changed` when type, key, ref or nullability differ, and a relation is `added` / `removed` from the endpoint pair — so red and green can never disagree with the data.

## Reading it

- **Change marks** — `+` added, `−` removed, `~` changed, on both the table card and the field row; a removed field row is struck through.
- **Relations** are drawn from the referenced field to the FK field that points at it, with `1` near the referenced end and `N` near the FK end, coloured by the relation's status.
- **検索** narrows the diagram to tables whose id, name or field matches, and marks the matching rows.
- **Selection** highlights the tables connected to the selected one (either direction) and dims the rest. It never adds a detail panel below the canvas.
- **Comments** — give the diagram a stable HTML `id` and place it inside an artifact template. Hover a table or relationship to reveal its comment icon, then activate the icon to open the shared composer beside it. Selection alone does not open the input. Keyboard focus also reveals the icon, and it stays visible on devices without hover. The composer follows pan/zoom without resizing the diagram. Send there with the button or `Ctrl`/`Cmd+Enter`; the comment is saved to the template's Review without opening its rail. Escape/cancel closes the surface, and switching selections preserves unsent text per target for the mounted component. Fields are not separate comment targets.

## Layout

Table height follows its fields (a changed row is taller because it shows two lines), and edges attach to the specific field rows, so a relation lands on the column that carries it. Ranks follow the FK direction.
