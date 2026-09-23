# dpk-component-architecture-map

Services grouped into boundaries, with the links between them. This is the "system map" view: what exists, who is external, and which service talks to which.

Shared contract (data paths, tags, pan/zoom, comments, sizing): `docs/components/diagrams.md`.

```html
<dpk-component-architecture-map heading="Architecture" subject="注文と決済">
  <script type="application/json">
    {
      "boundaries": [
        { "id": "edge", "label": "CLIENT & EDGE" },
        { "id": "external", "label": "EXTERNAL SERVICES", "kind": "external" }
      ],
      "services": [
        { "id": "browser", "name": "ブラウザ", "boundary": "edge", "position": { "x": 0, "y": 0 } },
        {
          "id": "payment",
          "name": "Payment",
          "boundary": "external",
          "position": { "x": 320, "y": 0 },
          "artwork": {
            "src": "data:image/svg+xml;base64,…",
            "alt": "AWS Lambda",
            "license": "AWS Architecture Icons（Amazon Web Services, Inc.）"
          }
        }
      ],
      "links": [{ "id": "orders-payment", "from": "browser", "to": "payment", "label": "決済要求" }]
    }
  </script>
</dpk-component-architecture-map>
```

## Data

`boundaries[]`: `id`, `label` (shown uppercase in the rectangle corner) and `kind` (`internal` default, `external` for a dashed amber rectangle).

`services[]`:

| Field         | Required | Meaning                                                                                                                 |
| ------------- | -------- | ----------------------------------------------------------------------------------------------------------------------- |
| `id`          | yes      | Stable id; links reference it.                                                                                          |
| `name`        | yes      | Name on the card.                                                                                                       |
| `position`    | yes      | `{ x, y }` of the card's top-left corner. Cards are 220 × 112; leave about 80 px between cards in different boundaries. |
| `boundary`    | no       | Boundary id. A service without one is drawn outside every rectangle.                                                    |
| `description` | no       | Shown under the name (clamped to 3 lines) and as the card tooltip.                                                      |
| `symbol`      | no       | Fallback glyph when there is no `artwork` (`DB`, `SES`); defaults to the first two characters of the name.              |
| `tags`        | no       | The tag filter applies to services.                                                                                     |
| `artwork`     | no       | `{ src, alt, license? }` — see below.                                                                                   |

`links[]`: `id`, `from`, `to` (required) and `label` (optional, drawn on the edge). Unknown endpoints and unknown boundaries are errors.

## Artwork

The element ships **no icon set**: `artwork.src` is any URL or data URI you provide, rendered as an `<img>` with your `alt` text, and `artwork.license` is the icon's tooltip (`アイコン出典: …`).

Vendor icon sets come with attribution and trademark terms that belong to the page you generate, not to this framework's bundle, so embed the artwork unmodified (a data URI keeps the file single-page) and put the required attribution in `license`. For example, AWS allows its Architecture Icons to be used in architecture diagrams, as drawn and in their own colors. Without `artwork` the card shows the `symbol` tile, which is the right choice for anything you have no licensed icon for.

## Reading it

- **境界** toggles the boundary rectangles (they are decoration; the cards are the diagram).
- Selecting a service highlights everything it links to, in either direction.
- The boundary rectangle is recomputed from its members after every filter, so filtering to one boundary's tags shrinks the rectangle with it.
- The diagram is hand-placed: a boundary rectangle pads its members, and the padding gives way where it would run into another boundary or a service outside it. A link leaves and enters by the sides of the two cards that face each other (left/right when they are side by side, otherwise top/bottom), with one elbow halfway across the gap. Links are not routed around a third card, so keep the path between linked cards clear.
