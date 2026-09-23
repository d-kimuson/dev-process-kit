# Template: event-storming (`<artifact-event-storming>`)

Event Storming board: sticky notes on swimlanes in timeline order, with
causality links drawn as straight SVG lines.

```text
actor > command > aggregate > event > policy > readmodel (+ external, hotspot)
array order of elements = timeline order (left to right)
```

- Element: `<artifact-event-storming>`
- Definition name: `event-storming`
- Navigation keys: `note`, `context`
- Accent token: `--af-accent` (vermilion)

## Base data

```json
{
  "title": "注文フロー",
  "contexts": [
    { "id": "shop", "name": "店舗", "description": "注文受付" },
    { "id": "kitchen", "name": "厨房" }
  ],
  "elements": [
    { "id": "customer", "type": "actor", "name": "顧客", "contextId": "shop" },
    { "id": "order-cmd", "type": "command", "name": "注文する", "contextId": "shop" },
    { "id": "order", "type": "aggregate", "name": "注文", "contextId": "shop" },
    {
      "id": "ordered",
      "type": "event",
      "name": "注文受付済み",
      "description": "注文が確定した",
      "contextId": "kitchen"
    },
    { "id": "cook-rule", "type": "policy", "name": "在庫があれば調理開始", "contextId": "kitchen" },
    { "id": "cook-board", "type": "readmodel", "name": "調理ボード", "contextId": "kitchen" },
    { "id": "payment", "type": "external", "name": "決済サービス" },
    { "id": "peak-delay", "type": "hotspot", "name": "昼ピークの遅延" }
  ],
  "links": [
    { "id": "l1", "from": "customer", "to": "order-cmd" },
    { "id": "l2", "from": "order-cmd", "to": "ordered", "label": "発行" }
  ]
}
```

| Field                             | Required | Notes                                                                                         |
| --------------------------------- | -------- | --------------------------------------------------------------------------------------------- |
| `title`                           | no       | shown in the artifact header; defaults to `Event Storming`                                    |
| `contexts[].id` / `name`          | yes      | `description` optional                                                                        |
| `elements[].id` / `name`          | yes      | `description` optional, `contextId` optional (must reference a known context)                 |
| `elements[].type`                 | yes      | one of `actor \| command \| aggregate \| event \| policy \| readmodel \| external \| hotspot` |
| `links[].id` / `from` / `to`      | yes      | `from`/`to` must reference known note ids; `label` optional                                   |
| `contexts` / `elements` / `links` | no       | each defaults to `[]`                                                                         |

Note types and their sticky colours (text stays legible on each):

| Type        | Colour           | Lane meaning                             |
| ----------- | ---------------- | ---------------------------------------- |
| `actor`     | amber `#f2c14e`  | who triggers the flow                    |
| `command`   | blue `#4a90d9`   | user intent / operation                  |
| `aggregate` | yellow `#f7e463` | consistency boundary the command acts on |
| `event`     | orange `#f5a623` | domain fact, past tense                  |
| `policy`    | violet `#b388eb` | reactive rule ("whenever X, do Y")       |
| `readmodel` | green `#7ed321`  | view / projection actors read            |
| `external`  | pink `#f8a4c0`   | outside system                           |
| `hotspot`   | red `#d0021b`    | risk / open question                     |

Unknown keys throw (`z.strictObject` trees), links pointing at unknown note ids
throw, and notes pointing at unknown contexts throw — authoring typos fail
loudly instead of rendering a half-broken board.

## Action vocabulary

Patch semantics: each action states the desired end state, so applying the same
action twice gives the same result. `target` is `{ "type": …, "id": … }`, and
the shorthand `"id"` is accepted.

| Action                    | target   | payload                                                                                                            |
| ------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| `SET_ELEMENT_NAME`        | element  | `{ "name": string }`                                                                                               |
| `SET_ELEMENT_DESCRIPTION` | element  | `{ "description": string }`                                                                                        |
| `SET_ELEMENT_TYPE`        | element  | `{ "type": "actor" \| "command" \| "aggregate" \| "event" \| "policy" \| "readmodel" \| "external" \| "hotspot" }` |
| `SET_ELEMENT_CONTEXT`     | element  | `{ "contextId": string \| null }` (`null` = unassigned)                                                            |
| `MOVE_ELEMENT`            | element  | `{ "after": string \| null }` (`null` = first)                                                                     |
| `ADD_ELEMENT`             | artifact | `{ "id", "type", "name", "description"?, "contextId"? }`                                                           |
| `DELETE_ELEMENT`          | element  | `{}`                                                                                                               |
| `LINK_ELEMENTS`           | artifact | `{ "id", "from", "to", "label"? }`                                                                                 |
| `SET_LINK_LABEL`          | link     | `{ "label": string }`                                                                                              |
| `UNLINK_ELEMENTS`         | artifact | `{ "from", "to" }` (removes every link with that pair)                                                             |
| `ADD_CONTEXT`             | artifact | `{ "id", "name", "description"? }`                                                                                 |
| `SET_CONTEXT_NAME`        | context  | `{ "name": string }`                                                                                               |
| `DELETE_CONTEXT`          | context  | `{}` (its notes become unassigned)                                                                                 |

Notes:

- The order of the `elements` array IS the timeline order. The template never
  reorders implicitly; only `MOVE_ELEMENT` changes positions. `after` is an
  anchor id, not an offset: `{ "after": "order-cmd" }` means "directly after
  order-cmd". Unknown anchors make the action stale (`null`) instead of landing
  somewhere surprising.
- `SET_ELEMENT_CONTEXT` with an unknown (non-null) context id is stale.
  `ADD_ELEMENT` with an unknown `contextId` is stale.
- `LINK_ELEMENTS` with an unknown endpoint is stale.
- `DELETE_ELEMENT` also drops every link that referenced the note, so follow-up
  edits to those links go stale instead of dangling.
- `DELETE_CONTEXT` keeps the notes and clears their `contextId` (unassigns
  them); it does not delete the notes.
- `ADD_ELEMENT` / `ADD_CONTEXT` / `LINK_ELEMENTS` carry the new entity id in
  the payload and use `{ dedupeKey: entityDedupeKey }` (patch mode).
  Re-applying one whose entity already exists returns the unchanged state and
  is pruned automatically.
- There is no comment action in this vocabulary: comments are core-owned. Use
  `hasTarget` / `commentTargets` (elements + contexts) instead.

## Navigation

```text
#note=ordered&context=kitchen
```

- `note` selects a note: it gets the accent outline on the board and its detail
  editor opens in the sidebar. `context` filters the board to that bounded
  context (notes without that `contextId` are hidden; link lines stay computed
  from timeline positions).
- Unknown ids are removed from the navigation without writing to the URL; the
  URL is rewritten to the canonical form. Navigation is never stored as draft
  actions.
- In the element, real links use `context.hashFor(patch)` (native `a href`)
  and buttons use `context.navigate(patch)`.

## Swimlane + SVG geometry

Each note has a FIXED size so link lines never need DOM measurement:

- Card `148×108`, gaps `12` (x) / `12` (y); lanes run top-to-bottom in the
  fixed order `actor, command, aggregate, event, policy, readmodel, external,
hotspot`.
- Column `x = index * (148 + 12)` where `index` is the position in the
  `elements` array (timeline order, including filtered-out notes so positions
  stay stable while filtering). Lane `y = laneIndex * (108 + 12)`.
- A 118px lane-head gutter offsets the board; the SVG layer sits at
  `left: 118px` and draws one straight line per link from centre to centre,
  computed purely from those coordinates.
- Long timelines scroll horizontally (`.board-wrap { overflow-x: auto }`).
- Because positions are derived, notes MUST keep their fixed size: do not make
  card width/height content-dependent, or the lines will detach from the cards.

## UI provided by the template

| Region        | Content                                                                                                                                                        |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| sidebar       | bounded-context legend/filter (すべて + one button per context with delete), add-context / add-element buttons, and the selected note's detail editor          |
| main          | swimlane board (fixed-grid notes as native links + SVG causality lines), timeline counter, and the empty state when there are no notes                         |
| detail editor | inline-editable name + description, type select, bounded-context select, delete button, outgoing/incoming link lists with add (select another note) and remove |

Local edits exposed in the UI: note name, description, type, context
assignment, add/delete note, add/remove links, link target picker, add/delete
context, context filter, note selection. Deliberately left to the agent (no
UI): bulk timeline reordering across the flow, retargeting link endpoints,
renaming contexts beyond the name field, and any restructuring of the meaning
model (merging contexts, re-typing whole lanes).

## Comment targets

Elements and contexts: `element:<id>` labelled with the note name under group
`要素`, `context:<id>` labelled with the context name under group
`コンテキスト`.

## Sample

`sample/event-storming.html` — a food-delivery order flow (actor > command >
aggregate > event > policy > readmodel, one external payment system, three
hotspots) across three bounded contexts with labelled causality links, plus a
`slot="main"` author note demonstrating the slot contract.
