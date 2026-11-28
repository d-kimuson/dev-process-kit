# Component: diagram (`<dpk-diagram>`)

A small figure composed from markup: boxes (`dpk-diagram-node`), the lines between them
(`dpk-diagram-edge`) and frames around a few boxes (`dpk-diagram-group`). The container lays the
boxes out, routes every line around the boxes, bridges a crossing with a jump and keeps each line's
label clear of the boxes, the end glyphs and the other labels. It is a component, not a board: put
it in a view, a board's slot or your own markup, where a sketch in prose needs a few boxes and
arrows. Load `components.js` (or `index.js`) for it.

Use a board (`docs/boards/index.md`) when the figure has a meaning model of its own — states,
participants, a schema, pools. Use `dpk-diagram` for a sketch that is just boxes and lines.

The catalog shows each part:
[line](https://d-kimuson.github.io/dev-process-kit/#catalog-diagram-line),
[flow](https://d-kimuson.github.io/dev-process-kit/#catalog-diagram-flow),
[jumps](https://d-kimuson.github.io/dev-process-kit/#catalog-diagram-jump),
[label](https://d-kimuson.github.io/dev-process-kit/#catalog-diagram-label),
[node](https://d-kimuson.github.io/dev-process-kit/#catalog-diagram-node),
[group](https://d-kimuson.github.io/dev-process-kit/#catalog-diagram-group) and
[a composed sketch](https://d-kimuson.github.io/dev-process-kit/#catalog-diagram-composed).

## Markup

```html
<dpk-diagram id="refund-flow" label="返金フロー" direction="down">
  <dpk-diagram-node id="request" shape="pill" tone="blue">返金リクエスト</dpk-diagram-node>
  <dpk-diagram-node id="eligible" shape="diamond" tone="amber">返金できる?</dpk-diagram-node>
  <dpk-diagram-group id="payments" label="決済" tone="violet">
    <dpk-diagram-node id="refund" tone="violet">返金を実行</dpk-diagram-node>
    <dpk-diagram-node id="ledger" shape="cylinder" tone="violet">台帳</dpk-diagram-node>
  </dpk-diagram-group>
  <dpk-diagram-node id="reject" tone="danger">却下を通知</dpk-diagram-node>
  <dpk-diagram-edge id="request-eligible" from="request" to="eligible"></dpk-diagram-edge>
  <dpk-diagram-edge id="eligible-refund" from="eligible" to="refund" tone="green">はい</dpk-diagram-edge>
  <dpk-diagram-edge id="eligible-reject" from="eligible" to="reject" tone="danger">いいえ</dpk-diagram-edge>
  <dpk-diagram-edge id="refund-ledger" from="refund" to="ledger" line="dashed" flow>記帳</dpk-diagram-edge>
</dpk-diagram>
```

Every node, edge and group is a direct child of `dpk-diagram`, or a node is a direct child of a
`dpk-diagram-group` that is. The order of the children does not matter. A node's content is HTML
and gives the box its size; an edge's content is its label, and an edge with no content has none.

### `dpk-diagram`

| Attribute   | Default | Meaning                                                                                            |
| ----------- | ------- | -------------------------------------------------------------------------------------------------- |
| `id`        | —       | Needed for review comments: the comment targets are built from it.                                 |
| `label`     | —       | The figure's accessible name, and its name in a comment target.                                    |
| `layout`    | `auto`  | `auto` lays the boxes out in layers along `direction`; `grid` puts each node in its `col` / `row`. |
| `direction` | `right` | `right` or `down`: the way an `auto` layout runs.                                                  |
| `crossings` | `jump`  | `jump` bridges one line over another where they cross; `plain` lets them cross.                    |

### `dpk-diagram-node`

| Attribute     | Default   | Meaning                                                                               |
| ------------- | --------- | ------------------------------------------------------------------------------------- |
| `id`          | required  | Unique among every node, edge and group in the figure.                                |
| `shape`       | `rounded` | `rounded`, `box`, `pill`, `circle`, `diamond` or `cylinder`.                          |
| `tone`        | `neutral` | `neutral`, `accent`, `blue`, `green`, `amber`, `violet` or `danger`: a tinted fill.   |
| `col` / `row` | —         | Whole numbers, required for every node under `layout="grid"`. Empty columns collapse. |

### `dpk-diagram-edge`

| Attribute       | Default          | Meaning                                                                                               |
| --------------- | ---------------- | ----------------------------------------------------------------------------------------------------- |
| `id`            | required         | Unique in the figure.                                                                                 |
| `from` / `to`   | required         | The ids of the two nodes.                                                                             |
| `line`          | `solid`          | `solid`, `dashed` or `dotted`.                                                                        |
| `start` / `end` | `none` / `arrow` | The glyph at each end: `none`, `arrow`, `open-arrow`, `hollow-arrow`, `circle`, `diamond` or `slash`. |
| `flow`          | off              | Present (and not `"false"`): the line shows a moving dash in its direction. Reduced motion stops it.  |
| `tone`          | `neutral`        | The line's and the label's colour, from the same tones as a node.                                     |

### `dpk-diagram-group`

| Attribute | Default   | Meaning                              |
| --------- | --------- | ------------------------------------ |
| `id`      | required  | Unique in the figure.                |
| `label`   | —         | The title on the frame's top border. |
| `tone`    | `neutral` | The frame's tint.                    |

A group frames the nodes inside it. Groups do not nest.

A missing or duplicate id, a `from` / `to` that names no node, a value outside a list, a grid node
without its cell and a nested group are errors: the element lists every one of them instead of the
figure.

## Size

The figure is drawn at its natural size and centred. When the space is narrower, it shrinks to fit,
down to 60 %; below that it keeps 60 % and scrolls sideways.

## Selection and comments

Clicking a node (or Enter / Space on it) selects it: its lines light up and the nodes it is not
connected to dim. Clicking an edge's line or its label selects that edge, and clicking a frame selects its group. Clicking the background or Escape
clears the selection. `dpk-diagram.selection` is `{ kind: 'node' | 'edge' | 'group', id }` or
`null`, and every change fires `dpk-diagram-select` with `{ selection }` in `detail`.

With an `id` on the diagram, each node, edge label and group frame is a review comment target:
right-click it and choose the review comment, as anywhere else in a view.

## Styling

| Custom property             | Applies to | Meaning                       |
| --------------------------- | ---------- | ----------------------------- |
| `--dpk-diagram-node-max`    | node       | Widest a box grows (`180px`). |
| `--dpk-diagram-node-fill`   | node       | Box fill, over its tone.      |
| `--dpk-diagram-node-stroke` | node       | Box outline, over its tone.   |
| `--dpk-diagram-edge-line`   | diagram    | Line colour, over its tone.   |
