# Diagram components

Nine reusable diagram elements, each a pan/zoom canvas. They share one interaction contract and differ only in their data and their meaning.

| Element                | Answers                                               | Page                                  |
| ---------------------- | ----------------------------------------------------- | ------------------------------------- |
| `dpk-state-diagram`    | Which states exist, and what moves between?           | `docs/components/state-diagram.md`    |
| `dpk-sequence-diagram` | In what order do participants talk?                   | `docs/components/sequence-diagram.md` |
| `dpk-dependency-graph` | What depends on what, and what is circular?           | `docs/components/dependency-graph.md` |
| `dpk-er-diagram`       | What changed between two schema snapshots?            | `docs/components/er-diagram.md`       |
| `dpk-architecture-map` | Which services exist, in which boundary?              | `docs/components/architecture-map.md` |
| `dpk-mind-map`         | How does one topic break down?                        | `docs/components/mind-map.md`         |
| `dpk-whiteboard`       | Loose ideas, placed and connected freely on a canvas? | `docs/components/whiteboard.md`       |
| `dpk-event-storming`   | What domain events happen, in what causal order?      | `docs/components/event-storming.md`   |
| `dpk-example-mapping`  | What rules govern a story, with which examples?       | `docs/components/example-mapping.md`  |

A diagram pairs with any template — `dpk-template-plain` for a page that is just the diagram and comments (`docs/templates/plain.md`), or another template whose own subject the diagram illustrates — or, with `variant="board"`, becomes a board of its own directly inside `<dpk-page>` (see Board hosting, below). Add questions over it with the shell's grill (`docs/index.md`, Questions (grill)) when you want to review it with questions instead of, or alongside, comments. Load `components.js` for a page that uses them without a template; the entries are listed in `docs/index.md`.

Two elements are not diagrams and use no canvas; each sits in the page's normal flow at its natural height instead. They still follow this page's shared public contract, element-comment integration and target-reference scheme below, except whatever here is specific to the canvas (pan/zoom, `resetView()`, canvas sizing, the legend):

- `dpk-kanban` (`docs/components/kanban.md`) — a board of columns and cards; see its own page for layout and target kinds (`column`, `card`).
- `dpk-formal-spec` (`docs/components/formal-spec.md`) — restates verified properties in prose and shares only the comment integration below.

## Data

Two paths, exactly like a template's base data:

- **JSON child** — an HTML-authored page:

  ```html
  <dpk-dependency-graph heading="Dependencies">
    <script type="application/json">
      { "modules": [], "dependencies": [] }
    </script>
  </dpk-dependency-graph>
  ```

- **`data` property** — a JS-authored page (`element.data = parsed`), taking the diagram's own parsed shape (ER data is already a node/edge graph, for example). The JSON child is validated strictly and an invalid one renders an inline notice instead of a diagram; `parseStateData` and `parseSequenceData` are exported from `components.js` for the two diagrams that take raw JSON by hand.

Each diagram documents its own shape on its page. The element already names the diagram, so the JSON child has no envelope.

## Shared public contract

| Attribute | Values                | Meaning                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`      | stable unique string  | Enables element comments; preserve it across revisions                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `heading` | string                | Toolbar title: name the diagram after what it shows (each element defaults to its kind, e.g. `State machine`)                                                                                                                                                                                                                                                                                                                                                                                               |
| `subject` | string                | Smaller subtitle beside the title, e.g. `v2 draft`                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `variant` | `embedded` \| `board` | `embedded` (default): inside a template, illustrating or alongside its subject. `board`: this diagram is itself a board — hosted as a direct child of `<dpk-page>` with a `board` attribute (`docs/page.md`), it drops its own maximize/resize controls since the page already gives it the whole viewport. Independent of whether the diagram actually owns a draft — that follows from having a `board` id, exactly as for a template (`docs/page.md`) — but every board built so far sets both together. |

| Property               | Type                                                      | Meaning                                                                                                                                                                                                                                                                                                       |
| ---------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data`                 | diagram data (`attribute: false`)                         | The whole diagram; replaces the JSON child when set                                                                                                                                                                                                                                                           |
| `selection`            | `{ kind, id } \| null`                                    | Current selection; `kind` is `node` \| `edge` (graph diagrams), `participant` \| `message` (sequence), `item` \| `connector` (whiteboard), `note` (event storming) or `story` \| `rule` \| `example` \| `question` (example mapping). The kanban has its own `selection` of `column` \| `card`; see its page. |
| `tagFilter`            | `{ active: string[], match: 'single' \| 'all' \| 'any' }` | Current tag filter                                                                                                                                                                                                                                                                                            |
| `layout`               | `LayoutResult \| null`                                    | Placed nodes and routed edges (read-only; graph diagrams only)                                                                                                                                                                                                                                                |
| `visible`              | `{ nodes, edges }`                                        | What survives the tag filter (read-only; graph diagrams only)                                                                                                                                                                                                                                                 |
| `dataError`            | `string \| null`                                          | Validation error from the JSON child (read-only)                                                                                                                                                                                                                                                              |
| `commentTargets`       | `{ value, label, group? }[]`                              | All commentable elements from the full data, independent of filters (read-only)                                                                                                                                                                                                                               |
| `elementActions`       | draft actions                                             | This diagram's element actions, assigned by the enclosing template (see below)                                                                                                                                                                                                                                |
| `elementActionResults` | `{ id, title, summary?, tone?, stale? }[]`                | How each assigned action applied (read-only)                                                                                                                                                                                                                                                                  |

| Method              | Effect                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------- |
| `select(selection)` | Set the selection (`null` clears it)                                                        |
| `resetView()`       | Fit the diagram back into the canvas (not on the kanban, which has no canvas)               |
| `resetPositions()`  | Clear every reader-dragged node position, same as the board's right-click "Reset positions" |

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

- **Tag filter** — click a tag chip to filter. `Single` replaces the selection, `AND` / `OR` combine several tags, `Clear` clears them. Which side the filter applies to is the diagram's own rule (a state diagram filters transitions, the others filter nodes).
- **Selection** — click a node (or an edge's line) to select it; related elements stay lit and the rest dims. Clicking empty canvas or `Escape` clears it.
- **Comments** — there is no details panel under the canvas; descriptions, conditions and guarantees are in each element's tooltip. With a stable diagram `id`, right-click a node, edge, participant, message, table, column or card and choose "Review comment" (レビューコメント) from the context menu to open the shared composer beside it; ordinary selection alone never opens an input, and there is no layout shift. The surface follows pan/zoom (or the kanban's document flow) and submits without opening the review rail. `Escape` or cancel closes it; `Ctrl`/`Cmd+Enter` submits. Unsent text is kept per target while the component remains mounted. The mind map keeps its own small action bar under the selected topic for adding a subtopic; its "Review comment" sits in the context menu like every other diagram's.
- **Pan / zoom** — drag empty space to pan (bounded to the content box, grown 10% per side; the drag never selects the text it sweeps over), wheel or pinch to scroll, `Ctrl`/`Cmd`+wheel to zoom, `+` / `-` / `0` on the focused canvas to zoom and fit. The `−` / `100%` / `＋` in the floating control menu at the bottom right do the same. Not on the kanban, which has no canvas to pan or zoom.
- **Page scroll** — a vertical wheel scroll pans the diagram until it reaches the top or bottom edge; from there the same scroll moves the page, so reading carries on past the diagram. A diagram that fits vertically never holds the page's scroll. Horizontal scrolls always stay in the diagram.
- **Maximize** — the control menu's maximize button makes the diagram (or the kanban) cover the browser viewport (in the top layer, above the rest of the page); the same button or `Escape` restores it. `Escape` clears a selection first. While maximized the page behind does not scroll.
- **Opening view** — a diagram opens at 100% with its top-left corner in view, so the reader sees real size; clicking the percentage fits the whole diagram. A diagram smaller than the canvas is centred on that axis. The kanban has no opening view to speak of: it renders at its natural height and a wide board scrolls sideways on its own, independently of the page.
- **Keyboard** — cards and edges are focusable; `Enter` / `Space` select. The same goes for the kanban's columns and cards.

## Moving nodes

Graph diagrams (every diagram above except the sequence diagram) let the reader drag a node by its whole body to place it anywhere on the canvas; a short press still selects it, same as before. A moved node keeps that exact position even as the diagram's own layout changes around it; a node the reader never touched always follows the computed layout. This is reader-local — like the sidebar width or a read notice, it stays in the browser and is never sent to the agent. The board's right-click menu offers "Reset positions" once anything has been moved, putting every node back where the layout computed it.

## Board hosting

Any diagram can be a page's board instead of living inside a template: set `variant="board"` and give it a `board` attribute, as a direct child of `<dpk-page>` (`docs/page.md`). The diagram then owns its own draft (comments and element actions alike) exactly as a template board does, derives its own brief section, and is addressed as `page:<diagram-tag>@<board-id>` like any other board. `dpk-whiteboard`, `dpk-event-storming` and `dpk-example-mapping` are built for this (their own pages note it), but the six canvas diagrams and the kanban support it the same way — a page can, for example, host a bare `dpk-er-diagram` as one of its boards.

```html
<dpk-event-storming board="domain" label="ドメイン" variant="board">
  <script type="application/json">
    { "title": "注文", "elements": [] }
  </script>
</dpk-event-storming>
```

`variant` only changes the diagram's own chrome (no maximize/resize controls, since the page already gives it the whole viewport); whether it owns a draft follows from the `board` attribute, independent of `variant` — the two are set together for every board built so far because they answer different questions that happen to coincide.

## Element comments and template integration

Give diagrams a unique, stable HTML `id` and put them inside a template, for example:

```html
<dpk-template-plain storage-key="schema-review">
  <script type="application/json">
    { "title": "Schema review" }
  </script>
  <dpk-er-diagram id="orders-schema" slot="main">…</dpk-er-diagram>
</dpk-template-plain>
```

The enclosing template registers the diagram's targets and owns the comments and element actions. Requests open the template's normal review rail (or its Questions tab, when the page also asks questions about the diagram). A diagram's contextual composer posts directly without opening that rail; submitted comments still appear in Review. All comments use the same storage, deletion, stale handling and agent brief as template actions. Standalone diagrams emit events but do not own a comment store; a local submission needs an accepting consumer, otherwise its input is retained with an error.

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

The shell is `var(--diagram-height, 560px)` tall and the canvas takes what is left after the toolbar and the tag row. Set the variable on the element (or any ancestor) to change it; the grip in the control menu also drags (or, focused, arrow-keys) the height; a double-click restores it. Maximizing ignores both and fills the viewport.

```html
<dpk-er-diagram style="--diagram-height: 720px">…</dpk-er-diagram>
```

The kanban has no canvas and so no `--diagram-height`: it takes whatever height its columns need, in the page's normal flow. Maximizing still fills the viewport, same as a diagram.

## Annotating for questions (grill)

An annotatable element in the data may carry `questions`: a space-separated list of question references from the page's `data-dpk-grill` block (`docs/index.md`, Questions (grill)). Which elements those are is the diagram's rule (services, modules, tables, messages …), and its page says so.

```json
{ "id": "inventory_reservations", "name": "在庫予約", "questions": "Q1 Q4" }
```

The element renders it as `data-grill-questions` on that card, which is what the shell hangs its Q badges on.

Each diagram's main nodes (a table, a state, a participant, a service, a module) also carry `data-dpk-target`, so a page's [Check Mode](../index.md#check-mode) covers them the same way it covers a template's own cards, with no extra setup.

## Styling

Override the `--dpk-*` tokens on the element to re-theme a diagram without touching its internals:

```css
dpk-dependency-graph {
  --dpk-blue: #2f6fed;
  --dpk-green: #128a4c;
}
```

That is the only supported way to re-theme a diagram: the rendered elements live in a shadow root, so their classes and structure are an implementation detail.
