# Template: event-storming (`<artifact-event-storming>`)

Event Storming board: sticky notes in timeline order, grouped into slices by the links between them.

```text
actor > command > aggregate > event > policy > readmodel (+ external, hotspot)
array order of elements = timeline order (left to right)
a `member` link keeps two notes in the same slice; a `flow` link is succession
```

- Element: `<artifact-event-storming>`
- Definition name: `event-storming`
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
    {
      "id": "ordered",
      "type": "event",
      "name": "注文受付済み",
      "description": "注文が確定した",
      "contextId": "kitchen"
    },
    { "id": "cook-rule", "type": "policy", "name": "在庫があれば調理開始", "contextId": "kitchen" },
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
| `links[].kind`                    | no       | `member` (same slice) \| `flow` (succession); inferred from the note types when omitted       |
| `contexts` / `elements` / `links` | no       | each defaults to `[]`                                                                         |

| Type        | Lane meaning                             |
| ----------- | ---------------------------------------- |
| `actor`     | who triggers the flow                    |
| `command`   | user intent / operation                  |
| `aggregate` | consistency boundary the command acts on |
| `event`     | domain fact, past tense                  |
| `policy`    | reactive rule ("whenever X, do Y")       |
| `readmodel` | view / projection actors read            |
| `external`  | outside system                           |
| `hotspot`   | risk / open question                     |

A link to an unknown note, or a note pointing at an unknown context, is an error.

## Action vocabulary

| Action                    | target   | payload                                                                                                            |
| ------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| `SET_ELEMENT_NAME`        | element  | `{ "name": string }`                                                                                               |
| `SET_ELEMENT_DESCRIPTION` | element  | `{ "description": string }`                                                                                        |
| `SET_ELEMENT_TYPE`        | element  | `{ "type": "actor" \| "command" \| "aggregate" \| "event" \| "policy" \| "readmodel" \| "external" \| "hotspot" }` |
| `SET_ELEMENT_CONTEXT`     | element  | `{ "contextId": string \| null }` (`null` = unassigned)                                                            |
| `MOVE_ELEMENT`            | element  | `{ "after": string \| null }` (`null` = first)                                                                     |
| `ADD_ELEMENT`             | artifact | `{ "id", "type", "name", "description"?, "contextId"? }`                                                           |
| `DELETE_ELEMENT`          | element  | `{}`                                                                                                               |
| `LINK_ELEMENTS`           | artifact | `{ "id", "from", "to", "label"?, "kind"? }`                                                                        |
| `SET_LINK_LABEL`          | link     | `{ "label": string }`                                                                                              |
| `UNLINK_ELEMENTS`         | artifact | `{ "from", "to" }` (removes every link with that pair)                                                             |
| `ADD_CONTEXT`             | artifact | `{ "id", "name", "description"? }`                                                                                 |
| `SET_CONTEXT_NAME`        | context  | `{ "name": string }`                                                                                               |
| `DELETE_CONTEXT`          | context  | `{}` (its notes become unassigned)                                                                                 |

- The order of the `elements` array **is** the timeline order, and only `MOVE_ELEMENT` changes it. `after` is an anchor id, not an offset: `{ "after": "order-cmd" }` means "directly after order-cmd", and an unknown anchor makes the action stale.
- An unknown endpoint, an unknown `contextId` (or one that no longer exists) makes the action stale: `SET_ELEMENT_CONTEXT`, `ADD_ELEMENT` and `LINK_ELEMENTS` are the ones that can carry one.
- `DELETE_ELEMENT` also drops every link that referenced the note, so follow-up edits to those links go stale instead of dangling. `DELETE_CONTEXT` keeps the notes and only clears their `contextId`.

## Navigation

```text
#note=ordered&context=kitchen
```

- `note` selects a note: it gets the accent outline on the board and its editor opens. `context` filters the board to that bounded context (notes without that `contextId` are hidden; link lines stay computed from timeline positions).
- Unknown ids fall back and the URL is rewritten to the canonical form.

## UI provided by the template

| Region | Content                                                                                                                           |
| ------ | --------------------------------------------------------------------------------------------------------------------------------- |
| header | bounded-context filter (すべて + one button per context with delete), add-context / add-element buttons, and the timeline counter |
| main   | the board: fixed-grid notes grouped into slices, SVG causality lines, and the empty state when there are no notes                 |

Selecting a note opens its editor in a popover: inline-editable name and description, type select, bounded-context select, delete, and the outgoing/incoming link lists with add and remove.

The board is a fixed grid — notes keep their size so the link lines never need measuring — and a long timeline scrolls horizontally. The UI edits note name/description/type, context assignment, add/delete note, add/remove links, add/delete context, the context filter and the selected note. Deliberately left to the agent (no UI): reordering the timeline across the flow, retargeting link endpoints, and any restructuring of the meaning model (merging contexts, re-typing whole lanes).

## Comment targets

Elements and contexts: `element:<id>` labelled with the note name under group `要素`, `context:<id>` labelled with the context name under group `コンテキスト`.
