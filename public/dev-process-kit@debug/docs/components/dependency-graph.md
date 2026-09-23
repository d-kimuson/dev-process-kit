# artifact-dependency-graph

Modules and the references between them. Selecting a module answers two
questions at once: what it uses, and what would be affected by changing it.

Shared contract (data paths, tags, pan/zoom, details, sizing):
`docs/components/diagrams.md`.

```html
<artifact-dependency-graph heading="Dependencies" subject="注文モジュール">
  <script type="application/json">
    {
      "modules": [
        { "id": "api", "name": "Order API", "path": "api/orders", "layer": "API", "tags": ["API"] },
        {
          "id": "orders",
          "name": "Order service",
          "path": "app/order-service",
          "layer": "アプリケーション",
          "tags": ["今回の変更"],
          "description": "価格見積・在庫確保・決済を調整する注文ユースケース。"
        },
        { "id": "pricing", "name": "Pricing", "path": "domain/pricing", "layer": "ドメイン" }
      ],
      "dependencies": [
        { "id": "api-orders", "from": "api", "to": "orders", "contract": "createOrder / cancelOrder" },
        {
          "id": "orders-pricing",
          "from": "orders",
          "to": "pricing",
          "contract": "calculateQuote",
          "description": "注文を確定する前に、明細・値引き・合計金額を見積もる。"
        }
      ]
    }
  </script>
</artifact-dependency-graph>
```

## Data

`modules[]`:

| Field         | Required | Meaning                                               |
| ------------- | -------- | ----------------------------------------------------- |
| `id`          | yes      | Stable id; dependencies reference it.                 |
| `name`        | yes      | Name on the card.                                     |
| `path`        | no       | Source location, shown under the name (mono).         |
| `layer`       | no       | Layer label on the card (`アプリケーション`, `共通`). |
| `tags`        | no       | The tag filter applies to modules.                    |
| `description` | no       | Shown in the details panel (`責務`).                  |

`dependencies[]`: `id`, `from`, `to` (required) plus `contract` (what the source
uses, e.g. `calculateQuote`) and `description` (why it does).

`from → to` reads "`from` depends on `to`". Unknown endpoints, duplicate ids and
unknown keys throw.

## Reading it

| Control                      | Effect                                                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `依存先` / `依存元` / `両方` | Which direction the selection follows. `両方` (default) shows both sides.                                                |
| `間接も含む`                 | Follows the whole transitive closure, not just direct neighbours. Link labels gain their hop distance (`Pricing · 2段`). |
| `循環 N`                     | Restricts the view to circular groups (see below). Disabled when there are none.                                         |

- Direction is visible in the colour of the card and the edge: green = uses
  (依存先), blue = used by (依存元), amber = part of a cycle.
- The details panel lists both sides as links; activating one selects that module
  and moves focus to it.

## Cycles

Cycles are detected from the currently tag-filtered graph (a group of strongly
connected modules, including a self-edge). Members get a `循環` badge on the
card; `循環 N` counts the groups and filters the diagram down to them, edges
included. Clearing the tag filter restores the full graph.

Two modules that reference each other are one group, so the badge means "this
module is in a loop", not "this edge closes a loop".

## Layout

Ranks come from the dependency direction, so a module sits to the right of
everything it depends on. Edges are routed orthogonally; an edge that points
backwards (a cycle, or a same-rank reference) is routed below the row so it never
crosses the layer it belongs to.
