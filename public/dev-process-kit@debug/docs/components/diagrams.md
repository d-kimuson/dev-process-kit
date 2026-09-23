# Diagram components

Seven reusable diagram elements. They share one interaction contract and differ only in their data and their meaning.

| Element                          | Answers                                     | Page                                  |
| -------------------------------- | ------------------------------------------- | ------------------------------------- |
| `dpk-component-state-diagram`    | Which states exist, and what moves between? | `docs/components/state-diagram.md`    |
| `dpk-component-sequence-diagram` | In what order do participants talk?         | `docs/components/sequence-diagram.md` |
| `dpk-component-dependency-graph` | What depends on what, and what is circular? | `docs/components/dependency-graph.md` |
| `dpk-component-er-diagram`       | What changed between two schema snapshots?  | `docs/components/er-diagram.md`       |
| `dpk-component-architecture-map` | Which services exist, in which boundary?    | `docs/components/architecture-map.md` |
| `dpk-component-mind-map`         | How does one topic break down?              | `docs/components/mind-map.md`         |
| `dpk-component-kanban`           | Where does each piece of work stand?        | `docs/components/kanban.md`           |

A diagram pairs with the `dpk-template-grill` template when you want to review it with questions (`docs/templates/grill.md`), or with `dpk-template-plain` when you only want comments on it (`docs/templates/plain.md`). Load `components.js` for a page that uses them without a template; the entries are listed in the release's `docs/index.md`.

## Data

Two paths, exactly like a template's base data:

- **JSON child** — an HTML-authored page:

  ```html
  <dpk-component-dependency-graph heading="Dependencies">
    <script type="application/json">
      { "modules": [], "dependencies": [] }
    </script>
  </dpk-component-dependency-graph>
  ```

- **`data` property** — a JS-authored page (`element.data = parsed`), taking the diagram's own parsed shape (ER data is already a node/edge graph, for example). The JSON child is validated strictly and an invalid one renders an inline notice instead of a diagram; `parseStateData` and `parseSequenceData` are exported from `components.js` for the two diagrams that take raw JSON by hand.

Each diagram documents its own shape on its page. The element already names the diagram, so the JSON child has no envelope.

## Shared public contract

| Attribute | Values               | Meaning                                                |
| --------- | -------------------- | ------------------------------------------------------ |
| `id`      | stable unique string | Enables element comments; preserve it across revisions |
| `heading` | string               | Toolbar title (each element has its own default)       |
| `subject` | string               | Toolbar subtitle, e.g. `注文ライフサイクル`            |

| Property               | Type                                                      | Meaning                                                                                                                                |
| ---------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `data`                 | diagram data (`attribute: false`)                         | The whole diagram; replaces the JSON child when set                                                                                    |
| `selection`            | `{ kind, id } \| null`                                    | Current selection; `kind` is `node` \| `edge` (graph diagrams) or `participant` \| `message` (sequence) or `column` \| `card` (kanban) |
| `tagFilter`            | `{ active: string[], match: 'single' \| 'all' \| 'any' }` | Current tag filter                                                                                                                     |
| `layout`               | `LayoutResult \| null`                                    | Placed nodes and routed edges (read-only; graph diagrams only)                                                                         |
| `visible`              | `{ nodes, edges }`                                        | What survives the tag filter (read-only; graph diagrams only)                                                                          |
| `dataError`            | `string \| null`                                          | Validation error from the JSON child (read-only)                                                                                       |
| `commentTargets`       | `{ value, label, group? }[]`                              | All commentable elements from the full data, independent of filters (read-only)                                                        |
| `elementActions`       | draft actions                                             | This diagram's element actions, assigned by the enclosing template (see below)                                                         |
| `elementActionResults` | `{ id, title, summary?, tone?, stale? }[]`                | How each assigned action applied (read-only)                                                                                           |

| Method              | Effect                               |
| ------------------- | ------------------------------------ |
| `select(selection)` | Set the selection (`null` clears it) |
| `resetView()`       | Fit the diagram back into the canvas |

| Event                        | Detail                             | Fired when                                                        |
| ---------------------------- | ---------------------------------- | ----------------------------------------------------------------- |
| `dpk-diagram-select`         | `{ selection }`                    | The selection changed                                             |
| `dpk-diagram-view`           | `{ view: { x, y, scale } }`        | Pan or zoom changed (the grill labels use it to follow a diagram) |
| `dpk-comment-targets-change` | none                               | The full set or labels of component targets changed               |
| `dpk-comment-request`        | `{ target: string }`               | A user asks to open the template's review composer                |
| `dpk-comment-submit`         | `{ target: string, body: string }` | A diagram's contextual composer submits a comment directly        |
| `dpk-element-action`         | `{ type, target, payload }`        | A user edits the diagram (for example, adds a mind-map topic)     |

All events bubble and are composed.

## Interaction

Shared interactions, with an ER-specific contextual composer:

- **Tag filter** — click a tag chip to filter. `Single` replaces the selection, `AND` / `OR` combine several tags, `解除` clears them. Which side the filter applies to is the diagram's own rule (a state diagram filters transitions, the others filter nodes).
- **Selection** — click a node (or an edge's line) to select it; related elements stay lit and the rest dims. Clicking empty canvas or `Escape` clears it.
- **Comments** — there is no details panel under the canvas; descriptions, conditions and guarantees are in each element's tooltip. With a stable diagram `id`, the ER, state, sequence, dependency and architecture diagrams and the kanban reveal a comment icon when a node, edge, participant, message, column or card is hovered, keyboard-focused, or selected (always visible on touch devices). Activate that icon to open the shared composer beside it; ordinary selection alone never opens an input, and there is no layout shift. The mind map instead shows a small action bar under the selected topic. The surface follows pan/zoom and submits without opening the review rail. `Escape` or cancel closes it; `Ctrl`/`Cmd+Enter` submits. Unsent text is kept per target while the component remains mounted.
- **Pan / zoom** — drag to pan (bounded to the content box, grown 10% per side), wheel or pinch to scroll, `Ctrl`/`Cmd`+wheel to zoom, `+` / `-` / `0` on the focused canvas to zoom and fit. The on-screen `−` / `100%` / `＋` do the same.
- **Page scroll** — a vertical wheel scroll pans the diagram until it reaches the top or bottom edge; from there the same scroll moves the page, so reading carries on past the diagram. A diagram that fits vertically never holds the page's scroll. Horizontal scrolls always stay in the diagram.
- **Maximize** — the toolbar's maximize button makes the diagram cover the browser viewport (in the top layer, above the rest of the page); the same button or `Escape` restores it. `Escape` clears a selection first. While maximized the page behind does not scroll.
- **Opening view** — a diagram opens at 100% with its top-left corner in view, so the reader sees real size; clicking the percentage fits the whole diagram. A diagram smaller than the canvas is centred on that axis (the kanban stays top-left instead).
- **Keyboard** — cards and edges are focusable; `Enter` / `Space` select.

## Element comments and template integration

Give diagrams a unique, stable HTML `id` and put them inside a template, for example:

```html
<dpk-template-grill storage-key="schema-review">
  <script type="application/json">
    { "title": "Schema review", "questions": [] }
  </script>
  <dpk-component-er-diagram id="orders-schema" slot="main">…</dpk-component-er-diagram>
</dpk-template-grill>
```

The enclosing template registers the diagram's targets and owns the comments and element actions. Requests open Grill's Review tab or another template's normal review rail. A diagram's contextual composer posts directly without opening that rail; submitted comments still appear in Review. All comments use the same storage, deletion, stale handling and agent brief as template actions. Standalone diagrams emit events but do not own a comment store; a local submission needs an accepting consumer, otherwise its input is retained with an error.

Target references use `element:<diagram-id>/<kind>/<item-id>` (each segment is URI-encoded):

- Graphs: `node` and `edge` (tables/relationships, states/transitions, modules/dependencies, services/connections).
- Sequence diagrams: `participant` and `message`.
- Kanban: `column` and `card`.

For example, `element:orders-schema/node/orders` identifies the orders table in that diagram. ER fields are not individual comment targets; previously saved field comments are retained as stale entries. Filtering/searching or collapsing a diagram does not invalidate its targets. Removing a component or a data element makes its saved comments stale, without deleting them; restoring the same ids reattaches them. Missing diagram ids disable comment controls. Duplicate target references are ambiguous and are not registered.

### Custom component providers

The same integration works for author-owned shapes/components without importing internal framework modules:

1. Expose a `commentTargets` property containing `{ value, label, group? }` entries. Values must start with `element:` and labels must be non-empty. Include all live data elements, not only the visible ones.
2. Emit bubbling, composed `dpk-comment-targets-change` after the property changes or the component reconnects.
3. Emit bubbling, composed `dpk-comment-request` with `{ target: value }` to open the template composer. A `data-dpk-comment="element:..."` button (HTML or SVG) can also request an already registered target.
4. A local composer can instead emit **cancelable**, bubbling, composed `dpk-comment-submit` with exactly `{ target: value, body: text }`. The nearest template stops propagation, validates the target and non-empty trimmed body, and dispatches the standard comment action. It calls `preventDefault()` only after acceptance: `dispatchEvent()` returning `false` acknowledges a saved submission. Otherwise retain the draft; never clear it merely because an event was emitted.

5. To record an edit, emit **cancelable**, bubbling, composed `dpk-element-action` with exactly `{ type, target, payload }`: `type` is `CONSTANT_CASE`, `target` is one of your registered target values and `payload` is a JSON object. The nearest template stores it in its draft and calls `preventDefault()` once it has accepted it. If the template does not accept it, keep the user's input and show an error.
6. Expose a writable `elementActions` property together with a non-empty, unique HTML `id`. After each change, the template synchronously assigns the draft actions whose target starts with `element:<your id>/`. Apply them in order to your own authored data, never to the authored data itself, and expose `elementActionResults` with one `{ id, title, summary?, tone?, stale? }` per action. `tone` is `create` \| `update` \| `delete` \| `move` \| `meta`. `stale` is `unsupported-action-type` \| `target-missing` \| `constraint-violated`. Then emit `dpk-comment-targets-change`. The review rail lists each action with your `title` and `summary`. An action you do not report is shown as stale.

The core stores element actions without interpreting them: they never change the template's state, are never deduped, and appear in the agent brief together with a note that they belong to your component's JSON. Document your action vocabulary on the component's page.

The nearest template owns the targets; nested templates keep separate drafts. Open shadow-root providers are supported. Closed-shadow components should expose the property and events on their public host.

## Sizing

The shell is `var(--diagram-height, 560px)` tall and the canvas takes what is left after the toolbar and the tag row. Set the variable on the element (or any ancestor) to change it; the shell is also `resize: vertical`. Maximizing ignores both and fills the viewport.

```html
<dpk-component-er-diagram style="--diagram-height: 720px">…</dpk-component-er-diagram>
```

## Annotating for the grill template

An annotatable element in the data may carry `questions`: a space-separated list of question references from the `dpk-template-grill` template's base data. Which elements those are is the diagram's rule (services, modules, tables, messages …), and its page says so.

```json
{ "id": "inventory_reservations", "name": "在庫予約", "questions": "Q1 Q4" }
```

The element renders it as `data-grill-questions` on that card, which is what the grill template hangs its badges on — see `docs/templates/grill.md`.

## Styling

Override the `--dpk-*` tokens on the element to re-theme a diagram without touching its internals:

```css
dpk-component-dependency-graph {
  --dpk-blue: #2f6fed;
  --dpk-green: #128a4c;
}
```

That is the only supported way to re-theme a diagram: the rendered elements live in a shadow root, so their classes and structure are an implementation detail.
