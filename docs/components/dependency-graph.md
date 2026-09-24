# dpk-component-dependency-graph

Modules and the references between them. Selecting a module answers two questions at once: what it uses, and what would be affected by changing it.

Shared contract (data paths, tags, pan/zoom, comments, sizing): `docs/components/diagrams.md`.

```html
<dpk-component-dependency-graph heading="Dependencies" subject="注文モジュール">
  <script type="application/json">
    {
      "modules": [
        { "id": "api", "name": "Order API", "path": "api/orders", "layer": "API", "tags": ["API"] },
        {
          "id": "orders",
          "name": "Order service",
          "path": "app/order-service",
          "layer": "アプリケーション",
          "tags": ["今回の変更"]
        },
        { "id": "pricing", "name": "Pricing", "path": "domain/pricing", "layer": "ドメイン" }
      ],
      "dependencies": [
        { "id": "api-orders", "from": "api", "to": "orders", "contract": "createOrder / cancelOrder" },
        { "id": "orders-pricing", "from": "orders", "to": "pricing", "contract": "calculateQuote" }
      ]
    }
  </script>
</dpk-component-dependency-graph>
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
| `description` | no       | Shown in the card tooltip, under the path.            |

`dependencies[]`: `id`, `from`, `to` (required) plus `contract` (what the source uses, e.g. `calculateQuote`) and `description` (why it does). `from → to` reads "`from` depends on `to`". Unknown endpoints and duplicate ids are errors.

## Reading it

| Control                                  | Effect                                                                                                                   |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `Depends on` / `Depended on by` / `Both` | Which direction the selection follows; `Both` (default) shows both sides.                                                |
| `Include indirect`                       | Follows the whole transitive closure, not just direct neighbours. Link labels gain their hop distance (`Pricing · 2段`). |
| `Cycles N`                               | Restricts the view to circular groups (see below); disabled when there are none.                                         |

Direction is visible in the color of the card and the edge: green = uses (Depends on), blue = used by (Depended on by), amber = part of a cycle.

## Cycles

Cycles are detected from the tag-filtered graph: a group of strongly connected modules, including a self-edge. Members get a `Cycle` badge, and `Cycles N` counts the groups and filters the diagram down to them, edges included. Two modules that reference each other are one group, so the badge means "this module is in a loop", not "this edge closes a loop".

## Layout

Ranks come from the dependency direction, so a module sits to the left of everything it depends on. Edges are routed orthogonally, and an edge that points backwards (a cycle, or a same-rank reference) is routed below the row so it never crosses the layer it belongs to.
