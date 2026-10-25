# Boards (`dpk-board-*`)

A board is a visual surface: a pan/zoom canvas (a diagram) or a columned surface (the kanban) with its own meaning model, its own comment targets and its own element actions. Ten boards ship; they share one public contract — data paths, `id` / `heading` / `subject`, tag filter, selection, comments, element actions, sizing — and differ only in their data and their meaning.

A board can be used two ways, and **placement** is the whole rule:

- **embedded** — a child of a view (`<dpk-view-usm>`, `<dpk-view-plain>`, …), illustrating or sitting alongside that view's own subject, with the maximize control so the reader can give it the whole viewport;
- **a page's content** — the one view or board inside `<dpk-page name="…" label="…">`, where the board is the page, owns that page's part of the draft, and needs no maximize control because it already fills the viewport.

There is no attribute to switch between the two: what encloses a board decides (`docs/page.md`). Neither `variant="board"` nor `board="…"` exists any more.

| Board tag                    | Answers                                               | Page                              |
| ---------------------------- | ----------------------------------------------------- | --------------------------------- |
| `dpk-board-state-diagram`    | Which states exist, and what moves between?           | `docs/boards/state-diagram.md`    |
| `dpk-board-sequence-diagram` | In what order do participants talk?                   | `docs/boards/sequence-diagram.md` |
| `dpk-board-dependency-graph` | What depends on what, and what is circular?           | `docs/boards/dependency-graph.md` |
| `dpk-board-er-diagram`       | What changed between two schema snapshots?            | `docs/boards/er-diagram.md`       |
| `dpk-board-architecture-map` | Which services exist, in which boundary?              | `docs/boards/architecture-map.md` |
| `dpk-board-mind-map`         | How does one topic break down?                        | `docs/boards/mind-map.md`         |
| `dpk-board-whiteboard`       | Loose ideas, placed and connected freely on a canvas? | `docs/boards/whiteboard.md`       |
| `dpk-board-event-storming`   | What domain events happen, in what causal order?      | `docs/boards/event-storming.md`   |
| `dpk-board-example-mapping`  | What rules govern a story, with which examples?       | `docs/boards/example-mapping.md`  |
| `dpk-board-kanban`           | Where do the cards stand, and in which order?         | `docs/boards/kanban.md`           |

```html
<!-- embedded: a child of a view -->
<dpk-view-plain storage-key="schema-review">
  <script type="application/json">
    { "title": "Schema review" }
  </script>
  <dpk-board-er-diagram id="orders-schema" slot="main">…</dpk-board-er-diagram>
</dpk-view-plain>

<!-- a page's content: the board is the page -->
<dpk-page name="schema" label="スキーマ">
  <dpk-board-er-diagram id="orders-schema">…</dpk-board-er-diagram>
</dpk-page>
```

Embedded, a board pairs with any view — `dpk-view-plain` for a page whose subject is something else entirely (`docs/views/plain.md`), or the view whose own subject the diagram illustrates. On its own it is the page (above). Add questions over it with the app's grill (`docs/index.md`, Questions (grill)) when you want to review it with questions instead of, or alongside, comments.

One board is not a diagram and uses no canvas: `dpk-board-kanban` (`docs/boards/kanban.md`) sits in the page's normal flow at its natural height. It follows this page's contract except whatever here is specific to the canvas (pan/zoom, `resetView()`, canvas sizing, the legend); its own page says what differs. `dpk-formal-spec` is a component, not a board (`docs/components/formal-spec.md`), and shares only the comment integration below.

## Load it

Load `boards.js` when the document uses a board directly — as a page's content, or embedded in markup of your own. It registers every board, `<dpk-app>`, `<dpk-page>`, the components and the core API:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/dev-process-kit@<version>/dist/boards.js"></script>
```

A page whose content is a view loads that view's entry (`views/<name>.js`) and adds `boards.js` when it also embeds a board or uses a component. The entries are listed in `docs/index.md`.

## Data

Two paths, exactly like a view's base data:

- **JSON child** — an HTML-authored page:

  ```html
  <dpk-board-dependency-graph heading="Dependencies">
    <script type="application/json">
      { "modules": [], "dependencies": [] }
    </script>
  </dpk-board-dependency-graph>
  ```

- **`data` property** — a JS-authored page (`element.data = parsed`), taking the board's own parsed shape (ER data is already a node/edge graph, for example). The JSON child is validated strictly and an invalid one renders an inline notice instead of a board; the `data` property is trusted, so give it the shape the board's own page documents.

Each board documents its own shape on its page. The element already names the board, so the JSON child has no envelope.

## Shared public contract

| Attribute | Values               | Meaning                                                                                                     |
| --------- | -------------------- | ----------------------------------------------------------------------------------------------------------- |
| `id`      | stable unique string | Enables element comments and element actions; preserve it across revisions                                  |
| `heading` | string               | Toolbar title: name the board after what it shows (each element defaults to its kind, e.g. `State machine`) |
| `subject` | string               | Smaller subtitle beside the title, e.g. `v2 draft`                                                          |

| Property               | Type                                                      | Meaning                                                                                                                                                                                                                                                                                                       |
| ---------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data`                 | board data (`attribute: false`)                           | The whole board; replaces the JSON child when set                                                                                                                                                                                                                                                             |
| `selection`            | `{ kind, id } \| null`                                    | Current selection; `kind` is `node` \| `edge` (graph diagrams), `participant` \| `message` (sequence), `item` \| `connector` (whiteboard), `note` (event storming) or `story` \| `rule` \| `example` \| `question` (example mapping). The kanban has its own `selection` of `column` \| `card`; see its page. |
| `tagFilter`            | `{ active: string[], match: 'single' \| 'all' \| 'any' }` | Current tag filter                                                                                                                                                                                                                                                                                            |
| `layout`               | `LayoutResult \| null`                                    | Placed nodes and routed edges (read-only; graph diagrams only)                                                                                                                                                                                                                                                |
| `visible`              | `{ nodes, edges }`                                        | What survives the tag filter (read-only; graph diagrams only)                                                                                                                                                                                                                                                 |
| `dataError`            | `string \| null`                                          | Validation error from the JSON child (read-only)                                                                                                                                                                                                                                                              |
| `commentTargets`       | `{ value, label, group? }[]`                              | All commentable elements from the full data, independent of filters (read-only)                                                                                                                                                                                                                               |
| `elementActions`       | draft actions                                             | This board's element actions, assigned by the enclosing view — or, when it is a page's content, by that page (see below)                                                                                                                                                                                      |
| `elementActionResults` | `{ id, title, summary?, tone?, stale? }[]`                | How each assigned action applied (read-only)                                                                                                                                                                                                                                                                  |

| Method              | Effect                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------- |
| `select(selection)` | Set the selection (`null` clears it)                                                        |
| `resetView()`       | Fit the board back into the canvas (not on the kanban, which has no canvas)                 |
| `resetPositions()`  | Clear every reader-dragged node position, same as the board's right-click "Reset positions" |

| Event                        | Detail                             | Fired when                                                        |
| ---------------------------- | ---------------------------------- | ----------------------------------------------------------------- |
| `dpk-diagram-select`         | `{ selection }`                    | The selection changed                                             |
| `dpk-diagram-view`           | `{ view: { x, y, scale } }`        | Pan or zoom changed (the grill labels use it to follow a diagram) |
| `dpk-comment-targets-change` | none                               | The full set or labels of component targets changed               |
| `dpk-comment-request`        | `{ target: string }`               | A user asks to open the enclosing view's review composer          |
| `dpk-comment-submit`         | `{ target: string, body: string }` | A board's contextual composer submits a comment directly          |
| `dpk-element-action`         | `{ type, target, payload }`        | A user edits the board (for example, adds a mind-map topic)       |

All events bubble and are composed.

## Interaction

Shared interactions, with an ER-specific contextual composer:

- **Tag filter** — click a tag chip to filter. `Single` replaces the selection, `AND` / `OR` combine several tags, `Clear` clears them. Which side the filter applies to is the board's own rule (a state diagram filters transitions, the others filter nodes).
- **Selection** — click a node (or an edge's line) to select it; related elements stay lit and the rest dims. Clicking empty canvas or `Escape` clears it.
- **Comments** — there is no details panel under the canvas; descriptions, conditions and guarantees are in each element's tooltip. With a stable board `id`, right-click a node, edge, participant, message, table, column or card and choose "Review comment" (レビューコメント) from the context menu to open the shared composer beside it; ordinary selection alone never opens an input, and there is no layout shift. The surface follows pan/zoom (or the kanban's document flow) and submits without opening the review rail. `Escape` or cancel closes it; `Ctrl`/`Cmd+Enter` submits. Unsent text is kept per target while the component remains mounted. The mind map keeps its own small action bar under the selected topic for adding a subtopic; its "Review comment" sits in the context menu like every other diagram's.
- **Pan / zoom** — drag empty space to pan (bounded to the content box, grown 10% per side; the drag never selects the text it sweeps over), wheel or pinch to scroll, `Ctrl`/`Cmd`+wheel to zoom, `+` / `-` / `0` on the focused canvas to zoom and fit. The `−` / `100%` / `＋` in the floating control menu at the bottom right do the same. Not on the kanban, which has no canvas to pan or zoom.
- **Page scroll** — a vertical wheel scroll pans the diagram until it reaches the top or bottom edge; from there the same scroll moves the page, so reading carries on past the diagram. A diagram that fits vertically never holds the page's scroll. Horizontal scrolls always stay in the diagram.
- **Maximize** — the control menu's maximize button makes the board cover the browser viewport (in the top layer, above the rest of the page); the same button or `Escape` restores it. `Escape` clears a selection first. While maximized the page behind does not scroll. A board that is a page's content has no maximize control: the page already gives it the whole viewport.
- **Opening view** — a diagram opens at 100% with its top-left corner in view, so the reader sees real size; clicking the percentage fits the whole diagram. A diagram smaller than the canvas is centred on that axis. The kanban has no opening view to speak of: it renders at its natural height and a wide board scrolls sideways on its own, independently of the page.
- **Keyboard** — cards and edges are focusable; `Enter` / `Space` select. The same goes for the kanban's columns and cards.

## Moving nodes

Graph diagrams (every diagram above except the sequence diagram) let the reader drag a node by its whole body to place it anywhere on the canvas; a short press still selects it, same as before. A moved node keeps that exact position even as the diagram's own layout changes around it; a node the reader never touched always follows the computed layout. This is reader-local — like the sidebar width or a read notice, it stays in the browser and is never sent to the agent. The board's right-click menu offers "Reset positions" once anything has been moved, putting every node back where the layout computed it.

## A board as a page's content

To make a board the subject of a page, put it alone inside `<dpk-page name="…" label="…">` — the one view or board that page holds (`docs/page.md`):

```html
<dpk-page name="domain" label="ドメイン">
  <dpk-board-event-storming id="orders" heading="注文">
    <script type="application/json">
      { "title": "注文", "elements": [] }
    </script>
  </dpk-board-event-storming>
</dpk-page>
```

The board is then that page: it owns the page's part of the app's draft (comments and element actions alike), derives its own brief section, and every target it names is qualified by the page. The page's `label` is the board's name in the app's switcher; the board itself has no `label` attribute.

Inside a page, write targets as you would on the board alone — they mean that page's target. Qualify with `@<page>` only to point at another page of the app (`docs/page.md`, Targets). A board that owns page-level actions (`page:whiteboard`, `page:event-storming`, `page:example-mapping`) has them qualified the same way: `page:whiteboard@findings`.

## Element comments and view integration

Give a board a unique, stable HTML `id` and put it inside a view, for example:

```html
<dpk-view-plain storage-key="schema-review">
  <script type="application/json">
    { "title": "Schema review" }
  </script>
  <dpk-board-er-diagram id="orders-schema" slot="main">…</dpk-board-er-diagram>
</dpk-view-plain>
```

The enclosing view registers the board's targets and owns the comments and element actions. Requests open the view's normal review rail (or its Questions tab, when the page also asks questions about the board). A board's contextual composer posts directly without opening that rail; submitted comments still appear in Review. All comments use the same storage, deletion, stale handling and agent brief as view actions. A board that is a page's content plays that role itself. A standalone board — in neither a view nor a page — emits events but does not own a comment store; a local submission needs an accepting consumer, otherwise its input is retained with an error.

Target references use `element:<board-id>/<kind>/<item-id>` (each segment is URI-encoded), and inside a page they end in `@<page>`:

- Graphs: `node` and `edge` (tables/relationships, states/transitions, modules/dependencies, services/connections).
- Sequence diagrams: `participant` and `message`.
- Kanban: `column` and `card`.

For example, `element:orders-schema/node/orders` identifies the orders table in that diagram, and `element:orders-schema/node/orders@shop` the same table in the page `shop`. ER fields are not individual comment targets; previously saved field comments are retained as stale entries. Filtering/searching or collapsing a diagram does not invalidate its targets. Removing a component or a data element makes its saved comments stale, without deleting them; restoring the same ids reattaches them. A board with no `id` shows no comment controls. Duplicate target references are ambiguous and are not registered.

### Custom component providers

The same integration works for author-owned shapes/components without importing internal framework modules:

1. Expose a `commentTargets` property containing `{ value, label, group? }` entries. Values must start with `element:` and labels must be non-empty. Include all live data elements, not only the visible ones.
2. Emit bubbling, composed `dpk-comment-targets-change` after the property changes or the component reconnects.
3. Emit bubbling, composed `dpk-comment-request` with `{ target: value }` to open the view's composer. A `data-dpk-comment="element:..."` button (HTML or SVG) can also request an already registered target.
4. A local composer can instead emit **cancelable**, bubbling, composed `dpk-comment-submit` with exactly `{ target: value, body: text }`. The nearest view stops propagation, validates the target and non-empty trimmed body, and dispatches the standard comment action. It calls `preventDefault()` only after acceptance: `dispatchEvent()` returning `false` acknowledges a saved submission. Otherwise retain the draft; never clear it merely because an event was emitted.
5. To record an edit, emit **cancelable**, bubbling, composed `dpk-element-action` with exactly `{ type, target, payload }`: `type` is `CONSTANT_CASE`, `target` is one of your registered target values and `payload` is a JSON object. The nearest view stores it in its draft and calls `preventDefault()` once it has accepted it. If the view does not accept it, keep the user's input and show an error.
6. Expose a writable `elementActions` property together with a non-empty, unique HTML `id`. After each change, the view synchronously assigns the draft actions whose target starts with `element:<your id>/`. Apply them in order to your own authored data, never to the authored data itself, and expose `elementActionResults` with one `{ id, title, summary?, tone?, stale? }` per action. `tone` is `create` \| `update` \| `delete` \| `move` \| `meta`. `stale` is `unsupported-action-type` \| `target-missing` \| `constraint-violated`. Then emit `dpk-comment-targets-change`. The review rail lists each action with your `title` and `summary`. An action you do not report is shown as stale.

The core stores element actions without interpreting them: they never change the view's state, are never deduped, and appear in the agent brief together with a note that they belong to your component's JSON. Document your action vocabulary on the component's page.

The nearest view owns the targets, and a page owns its own content's; nested providers keep separate drafts. Open shadow-root providers are supported. Closed-shadow components should expose the property and events on their public host.

## Sizing

Embedded, the shell is `var(--diagram-height, 560px)` tall and the canvas takes what is left after the toolbar and the tag row. Set the variable on the element (or any ancestor) to change it; the grip in the control menu also drags (or, focused, arrow-keys) the height; a double-click restores it. Maximizing ignores both and fills the viewport.

```html
<dpk-board-er-diagram style="--diagram-height: 720px">…</dpk-board-er-diagram>
```

As a page's content the board takes the height the page gives it, and `--diagram-height` does not apply. The kanban has no canvas and so no `--diagram-height`: it takes whatever height its columns need, in the page's normal flow. Maximizing still fills the viewport, same as a diagram.

## Annotating for questions (grill)

An annotatable element in the data may carry `questions`: a space-separated list of question references from the page's `data-dpk-grill` block (`docs/index.md`, Questions (grill)). Which elements those are is the board's rule (services, modules, tables, messages …), and its page says so.

```json
{ "id": "inventory_reservations", "name": "在庫予約", "questions": "Q1 Q4" }
```

The element renders it as `data-grill-questions` on that card, which is what the shell hangs its Q badges on. Inside a page the ref is that page's question; write `Q1@<page>` to mark another page's.

Each board's main nodes (a table, a state, a participant, a service, a module) also carry `data-dpk-target`, so a page's [Check Mode](../index.md#check-mode) covers them the same way it covers a view's own cards, with no extra setup.

## Styling

Override the `--dpk-*` tokens on the element to re-theme a board without touching its internals:

```css
dpk-board-dependency-graph {
  --dpk-blue: #2f6fed;
  --dpk-green: #128a4c;
}
```

That is the only supported way to re-theme a board: the rendered elements live in a shadow root, so their classes and structure are an implementation detail.
