# Diagram components

Five reusable diagram elements. They share one interaction contract and differ
only in their data and their meaning.

| Element                     | Answers                                     | Page                                  |
| --------------------------- | ------------------------------------------- | ------------------------------------- |
| `artifact-state-diagram`    | Which states exist, and what moves between? | `docs/components/state-diagram.md`    |
| `artifact-sequence-diagram` | In what order do participants talk?         | `docs/components/sequence-diagram.md` |
| `artifact-dependency-graph` | What depends on what, and what is circular? | `docs/components/dependency-graph.md` |
| `artifact-er-diagram`       | What changed between two schema snapshots?  | `docs/components/er-diagram.md`       |
| `artifact-architecture-map` | Which services exist, in which boundary?    | `docs/components/architecture-map.md` |

They are **components, not templates**: no draft actions, no review rail, no
navigation. Use them inside your own page, or inside an artifact's
`slot="main"` alongside a template. `artifact-grill-panel` is the review loop
that pairs with them (`docs/components/grill-panel.md`).

## Loading

The bundle registers every element on import, so a single module tag is enough:

```html
<script type="module" src="https://dev-process-kit.biz-km.workers.dev/dev-process-kit@debug/components.js"></script>
```

## Data

Two paths, exactly like an artifact's base data:

- **JSON child** — an HTML-authored page:

  ```html
  <artifact-dependency-graph heading="Dependencies">
    <script type="application/json">
      { "modules": [], "dependencies": [] }
    </script>
  </artifact-dependency-graph>
  ```

- **`data` property** — a JS-authored page (`element.data = parsed`). The JSON
  child path is validated strictly; the property is the typed API
  (`parse<X>Data` is exported when you want the same validation by hand).

The JSON child has **no envelope**: the element already names the diagram. An
unknown key is an error. Invalid data renders an inline notice instead of a
diagram, and logs the reason.

## Shared public contract

| Attribute | Values | Meaning                                          |
| --------- | ------ | ------------------------------------------------ |
| `heading` | string | Toolbar title (each element has its own default) |
| `subject` | string | Toolbar subtitle, e.g. `注文ライフサイクル`      |

| Property    | Type                                                      | Meaning                                             |
| ----------- | --------------------------------------------------------- | --------------------------------------------------- |
| `data`      | diagram data (`attribute: false`)                         | The whole diagram; replaces the JSON child when set |
| `selection` | `{ kind, id } \| null`                                    | Current selection                                   |
| `tagFilter` | `{ active: string[], match: 'single' \| 'all' \| 'any' }` | Current tag filter                                  |
| `layout`    | `LayoutResult \| null`                                    | Placed nodes and routed edges (read-only)           |
| `visible`   | `{ nodes, edges }`                                        | What survives the tag filter (read-only)            |
| `dataError` | `string \| null`                                          | Validation error from the JSON child (read-only)    |

| Method              | Effect                               |
| ------------------- | ------------------------------------ |
| `select(selection)` | Set the selection (`null` clears it) |
| `resetView()`       | Fit the diagram back into the canvas |

| Event                     | Detail                      | Fired when                                                        |
| ------------------------- | --------------------------- | ----------------------------------------------------------------- |
| `artifact-diagram-select` | `{ selection }`             | The selection changed                                             |
| `artifact-diagram-view`   | `{ view: { x, y, scale } }` | Pan or zoom changed (the grill labels use it to follow a diagram) |

All events bubble and are composed.

## Interaction

The same in every diagram:

- **Tag filter** — click a tag chip to filter. `Single` replaces the selection,
  `AND` / `OR` combine several tags. `解除` clears them. Which side the filter
  applies to is the diagram's own rule: state diagrams filter transitions,
  the others filter nodes.
- **Selection** — click a node (or an edge's line) to select it. Related
  elements stay lit, the rest dims. Clicking empty canvas, `Escape`, or the
  detail panel's `×` clears it.
- **Details** — the panel under the canvas describes the selection and can link
  to a neighbouring element.
- **Pan / zoom** — drag to pan (bounded to the content box, grown 10% per side),
  wheel or pinch to scroll, `Ctrl`/`Cmd`+wheel to zoom, `+` / `-` / `0` on the
  focused canvas to zoom and fit. On-screen `−` / `100%` / `＋` do the same.
- **Opening view** — a diagram opens at **100%**, so the reader sees real size;
  the zoom control shows the current percentage and fits the whole diagram when
  clicked (which is the fastest way back when you are lost).
- **Keyboard** — cards and edges are focusable; `Enter` / `Space` select.

## Sizing

The shell is `var(--diagram-height, 560px)` tall, and the canvas takes
whatever is left after the toolbar, the tag row and the details panel. Set the
variable on the element (or any ancestor) to change it; the shell is also
`resize: vertical`, so a reader can drag its bottom edge.

```html
<artifact-er-diagram style="--diagram-height: 720px">…</artifact-er-diagram>
```

## Annotating for the grill template

Any node or edge in the data may carry `questions`: a space-separated list of
question references from the `artifact-grill` template's base data.

```json
{ "id": "inventory_reservations", "name": "在庫予約", "questions": "Q1 Q4" }
```

The element renders it as `data-grill-questions` on that card, and the grill
template reaches into the diagram's shadow root to place one badge per reference
(they follow pan and zoom, and disappear with the card when it is panned out of
the canvas). See `docs/templates/grill.md`.

## Styling

The elements use the framework's `--af-*` tokens, which are declared on `:host`
and inherit into your page — override them to re-theme a diagram without
touching its internals:

```css
artifact-dependency-graph {
  --af-blue: #2f6fed;
  --af-green: #128a4c;
}
```

Node and edge state is exposed as `.is-selected`, `.is-related`, `.is-dimmed`
classes on the rendered elements, and every diagram adds its own class
(`.state-node`, `.dep-module`, `.er-table`, `.arch-service`, `.sequence-label`)
if you need finer work — but prefer a `::part`-free, token-level override: the
shadow DOM structure is an implementation detail.
