# dpk-board-architecture-map

Services grouped into boundaries, with the links between them. This is the "system map" view: what exists, who is external, and which service talks to which.

Shared contract (data paths, tags, pan/zoom, comments, sizing, toolbar title and subtitle — `heading`, `subject`): `docs/boards/index.md`.

```html
<dpk-board-architecture-map heading="注文と決済">
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
</dpk-board-architecture-map>
```

`heading` replaces the toolbar title, so name the diagram after what it shows (the model, aggregate or flow); without it the toolbar reads the diagram's kind (`Architecture` / `アーキテクチャ図`). `subject` adds a smaller subtitle beside the title.

## Data

`boundaries[]`: `id`, `label` (shown uppercase as a legend on the rectangle's top border) and `kind` (`internal` default, `external` for a dashed amber rectangle).

`services[]`:

| Field         | Required | Meaning                                                                                                                                                       |
| ------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`          | yes      | Stable id; links reference it.                                                                                                                                |
| `name`        | yes      | Name on the card.                                                                                                                                             |
| `position`    | yes      | `{ x, y }` of the card's top-left corner. Cards are 220 × 112; leave about 80 px between cards in different boundaries.                                       |
| `boundary`    | no       | Boundary id. A service without one is drawn outside every rectangle.                                                                                          |
| `description` | no       | Shown under the name (clamped to 3 lines) and as the card tooltip.                                                                                            |
| `symbol`      | no       | Fallback glyph when there is no `artwork` (`DB`, `SES`); defaults to the initials of the name, or the first glyph of a CJK name.                              |
| `tags`        | no       | The tag filter applies to services.                                                                                                                           |
| `artwork`     | no       | `{ src, alt, license? }` — see below.                                                                                                                         |
| `questions`   | no       | Refs of the page's questions (grill) the service is about, space-separated (`"Q1 Q4"`); each gets a Q badge on the card (`docs/index.md`, Questions (grill)). |

`links[]`: `id`, `from`, `to` (required) and `label` (optional, drawn as a chip on the link). Unknown endpoints and unknown boundaries are errors.

Links are drawn at right angles around the cards, each in a lane of its own, and are routed again when a reader drags a card. A label sits on its own link, or beside it when the link is short, and a link moves to another lane when its label would otherwise lie on another link or on a boundary's border. Two cards a boundary apart leave no room clear of the borders between them, so that label stays across them: leave more than a label's width between such cards to avoid it. Cards a reader drops onto each other are treated as one pile: links from other cards end on the pile's edge, and a link between two cards of the pile is not drawn until they are apart. Keep labels short: one that has no free room wraps onto two lines, and failing that is cut with an ellipsis (the full text stays in its tooltip).

With `chrome="none"` (`docs/boards/index.md`, Figure only) the **Boundaries** toggle is not drawn and the boundaries stay on; the static figure is fitted in full, with no pan or zoom.

## Artwork

The element ships **no icon set**: `artwork.src` is any URL or data URI you provide, rendered as an `<img>` with your `alt` text, and `artwork.license` is the icon's tooltip (`Icon credit: …`).

Vendor icon sets come with attribution and trademark terms that belong to the page you generate, not to this framework's bundle, so embed the artwork unmodified (a data URI keeps the file single-page) and put the required attribution in `license`. For example, AWS allows its Architecture Icons to be used in architecture diagrams, as drawn and in their own colors. Without `artwork` the card shows the `symbol` tile, which is the right choice for anything you have no licensed icon for.

## Reading it

- **Boundaries** toggles the boundary rectangles (they are decoration; the cards are the diagram).
- Selecting a service highlights everything it links to, in either direction.
- The boundary rectangle is recomputed from its members after every filter, so filtering to one boundary's tags shrinks the rectangle with it.
- The diagram is hand-placed: a boundary rectangle pads its members, and the padding gives way where it would run into another boundary or a service outside it. A link leaves and enters by the sides of the two cards that face each other (left/right when they are side by side, otherwise top/bottom), and bends around any card that stands between its two ends, so a link never runs through a third card. Keep the gap between linked cards clear anyway: the shorter the path, the easier it reads.
