# dpk-board-bpmn

A business process in BPMN notation: pools and lanes, events, tasks, gateways, data objects, annotations and the sequence, message and association flows between them. The layout is automatic; the data says who does what, not where it is drawn.

Shared contract (data paths, tags, selection, comments, sizing — `heading`, `subject`): `docs/boards/index.md`.

```html
<dpk-board-bpmn heading="注文処理">
  <script type="application/json">
    {
      "pools": [
        { "id": "customer", "name": "顧客" },
        {
          "id": "shop",
          "name": "EC サイト",
          "lanes": [
            { "id": "order", "name": "受注" },
            { "id": "stock", "name": "在庫" }
          ]
        }
      ],
      "nodes": [
        { "id": "start", "kind": "event", "event": "start", "trigger": "message", "lane": "order", "name": "注文受信" },
        { "id": "check", "kind": "task", "task": "service", "lane": "order", "name": "在庫を確認" },
        { "id": "gate", "kind": "gateway", "lane": "order", "name": "在庫あり?" },
        { "id": "reserve", "kind": "task", "task": "service", "lane": "stock", "name": "在庫を引き当て" },
        { "id": "done", "kind": "event", "event": "end", "lane": "stock" }
      ],
      "flows": [
        { "id": "f1", "from": "start", "to": "check" },
        { "id": "f2", "from": "check", "to": "gate" },
        { "id": "f3", "from": "gate", "to": "reserve", "condition": "在庫あり" },
        { "id": "f4", "from": "gate", "to": "check", "default": true, "name": "在庫なし" },
        { "id": "f5", "from": "reserve", "to": "done" },
        { "id": "m1", "kind": "message", "from": "customer", "to": "start", "name": "注文" }
      ]
    }
  </script>
</dpk-board-bpmn>
```

`heading` names the process in the toolbar; without it the board reads `Business process` / `業務プロセス`.

## Data

`pools[]`: `id`, `name`, optional `lanes[]` (`{ id, name, questions? }`) and `questions?`. A pool with no lanes has one implicit lane whose id is the pool id. A pool with no lanes and no nodes is a black-box pool that only message flows reach.

`nodes[]` all carry:

| Field         | Required | Meaning                                                                                       |
| ------------- | -------- | --------------------------------------------------------------------------------------------- |
| `id`          | yes      | Stable id; flows reference it.                                                                |
| `lane`        | yes\*    | Lane id, or the pool id when that pool has no lanes. A data object or annotation may omit it. |
| `tags`        | no       | The tag filter applies to elements.                                                           |
| `questions`   | no       | Refs of the page's questions (grill) this element is about.                                   |
| `description` | no       | Tooltip text.                                                                                 |

\* A data object or annotation without a lane must be joined by an association to a laned node; the layout then puts it in that lane.

Node kinds:

- `event` — `event`: `start` | `intermediate` | `end`; `trigger` (default `none`): `none` | `message` | `timer` | `error`; `direction` (`catch` | `throw`, optional), `name` optional. An error is only an end-event trigger; a timer is only a catching one.
- `task` — `task` (default `none`): `none` | `user` | `service` | `manual` | `send` | `receive` | `script`, `name` required.
- `subprocess` — `name` required, drawn collapsed with a `+`.
- `gateway` — `gateway` (default `exclusive`): `exclusive` | `parallel` | `inclusive` | `eventBased`, `name` optional.
- `dataObject` — `name` required.
- `annotation` — `text` required.

Sizes are set at parse time: an event is 36×36, a gateway 50×50, a data object 36×46, an annotation 140 wide, and a task or subprocess 128 wide and tall enough for up to four wrapped name lines (at least 72).

`flows[]`: `id`, `from`, `to`, `kind` (default `sequence`): `sequence` | `message` | `association`, optional `name`, `condition`, `default` (boolean) and `direction` (`none` | `one`, for an association), `tags`, `questions`.

| Flow          | Ends                                                            | Drawn                                                                                    |
| ------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `sequence`    | two flow nodes (event, task, subprocess, gateway) in one pool   | solid, arrow end; a condition leaving an activity adds a diamond, a default adds a slash |
| `message`     | a task/subprocess/event or a pool frame, in two different pools | dashed, open-circle start and hollow-arrow end                                           |
| `association` | at least one end a data object or annotation                    | dotted, an open arrow when `direction` is `one`                                          |

Validation rejects a duplicate id across every collection, an unknown lane, a sequence flow that leaves its pool or touches a start/end event the wrong way, a default that its source cannot own or a second default from one source, a condition or default on a message/association, a message that stays in one pool or ends at a gateway, an association that joins no artifact, and an artifact with neither a lane nor a laned association. The JSON child is validated strictly; invalid data renders an inline notice and `dataError`.

## Reading it

- **Layout** — columns follow the sequence flows left to right, rows follow the author's pool and lane order. Every pool spans the same width, so a message between non-adjacent pools takes the shortest clear vertical run and detours only around an element in its way; its horizontal runs stay in the gaps. There are no authored positions.
- **Colour** — each element kind has its own colour on top of its BPMN shape: start events green, intermediate amber, end red, gateways violet, message flows teal, and a task's type icon sits on a chip in the type's colour. Pools take a hue each in author order for their head and a light tint of their lanes. The shape, the border weight and the line pattern still carry the meaning on their own; the colour only makes it quicker to scan.
- **Selection** — click an element or a flow's label to select it. A selected element lights its one-hop incoming and outgoing flows (of every kind) and their other ends; the rest dims. Clicking the background or `Escape` clears it.
- **Flow animation** — a related or selected sequence/message flow animates its dots; reduced motion leaves them still.
- **Tag filter** — filters elements; pools and lanes always stay, and a flow whose end is filtered out goes with it.
- **Comments and questions** — nodes, flows, pools and lanes are comment targets (`node`, `edge`, `pool`, `lane`); right-click a node, flow label, pool head or lane head for "Review comment". Elements' `questions` become Q badges, and every element carries `data-dpk-target` for Check Mode.
- **Moving nodes** — unlike the graph diagrams, BPMN elements stay where the automatic layout puts them; the reader cannot drag them. The layout is the diagram's own statement about the process.

## Chrome-less figures

`chrome="none"` (`docs/boards/index.md`, Figure only) drops the frame, header, tag filter and controls and fits the whole process into the page. With its chrome, an embedded board opens at 100%; as a page's content the page fits the whole process on open. The percentage in the zoom control fits it at any time.
