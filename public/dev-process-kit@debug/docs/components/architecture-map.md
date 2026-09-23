# artifact-architecture-map

Services grouped into boundaries, with the links between them. This is the
"system map" view: what exists, who is external, and which service talks to
which.

Shared contract (data paths, tags, pan/zoom, details, sizing):
`docs/components/diagrams.md`.

```html
<artifact-architecture-map heading="Architecture" subject="注文と決済">
  <script type="application/json">
    {
      "boundaries": [
        { "id": "edge", "label": "CLIENT & EDGE" },
        { "id": "external", "label": "EXTERNAL SERVICES", "kind": "external" }
      ],
      "services": [
        {
          "id": "browser",
          "name": "ブラウザ",
          "description": "購入者の操作。",
          "boundary": "edge",
          "position": { "x": 0, "y": 0 }
        },
        {
          "id": "payment",
          "name": "Payment",
          "boundary": "external",
          "position": { "x": 320, "y": 0 },
          "artwork": {
            "src": "data:image/png;base64,…",
            "alt": "AWS Lambda",
            "license": "AWS アイコン (CC BY-ND 2.0)"
          }
        }
      ],
      "links": [{ "id": "orders-payment", "from": "browser", "to": "payment", "label": "決済要求" }]
    }
  </script>
</artifact-architecture-map>
```

## Data

`boundaries[]`: `id`, `label` (shown uppercase in the rectangle corner) and
`kind` (`internal` default, `external` for a dashed amber rectangle).

`services[]`:

| Field         | Required | Meaning                                                                                                    |
| ------------- | -------- | ---------------------------------------------------------------------------------------------------------- |
| `id`          | yes      | Stable id; links reference it.                                                                             |
| `name`        | yes      | Name on the card.                                                                                          |
| `position`    | yes      | `{ x, y }`. This diagram is hand-placed; the boundary rectangle is derived from its members.               |
| `boundary`    | no       | Boundary id. A service without one is drawn outside every rectangle.                                       |
| `description` | no       | Shown under the name (clamped to 3 lines) and in the details panel.                                        |
| `symbol`      | no       | Fallback glyph when there is no `artwork` (`DB`, `SES`). Defaults to the first two characters of the name. |
| `tags`        | no       | The tag filter applies to services.                                                                        |
| `artwork`     | no       | `{ src, alt, license? }` — see below.                                                                      |

`links[]`: `id`, `from`, `to` (required) and `label` (optional, drawn on the
edge). Unknown endpoints, unknown boundaries, duplicate ids and unknown keys
throw.

## Artwork

The element ships **no icon set**: `artwork.src` is any URL or data URI you
provide, rendered as an `<img>` with your `alt` text, and `artwork.license` is
shown in the details panel as `アイコン出典`.

That split is deliberate. Vendor icon sets (AWS Architecture Icons, Cloudflare
product logos, …) come with attribution and trademark terms that belong to the
page you generate, not to this framework's bundle — and shipping them here would
redistribute artwork under someone else's licence. When you generate an artifact
with a vendor icon, embed the artwork (a data URI keeps the file single-page) and
put the required attribution in `license` so it stays with the service.

Without `artwork`, the card shows the `symbol` tile — which is the right choice
for anything you do not have a licensed icon for.

## Reading it

- **境界** toggles the boundary rectangles (they are decoration; the cards are
  the diagram).
- Selecting a service highlights everything it links to, in either direction.
  The details panel lists those neighbours as `→` / `←` links and includes the
  icon credit when there is one.
- The boundary rectangle is recomputed from the members after every filter, so
  filtering to one boundary's tags shrinks the rectangle with it.
