# dpk-board-event-storming

Event Storming board: sticky notes in timeline order, grouped into slices by the links between them.

Shared contract (data paths, tags, pan/zoom, comments, sizing, toolbar title and subtitle — `heading`, `subject`): `docs/boards/index.md`.

```text
actor > command > aggregate > event > policy > readmodel (+ external, hotspot)
array order of elements = timeline order (left to right)
a `member` link keeps two notes in the same slice; a `flow` link is succession
```

## Data

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

| Field                                           | Required | Notes                                                                                                                                                    |
| ----------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`                                         | no       | shown in the header; defaults to `Event Storming`                                                                                                        |
| `contexts[].id` / `name`                        | yes      | `description` optional                                                                                                                                   |
| `elements[].id` / `name`                        | yes      | `description` optional, `contextId` optional (must reference a known context)                                                                            |
| `elements[].type`                               | yes      | one of `actor \| command \| aggregate \| event \| policy \| readmodel \| external \| hotspot`                                                            |
| `links[].id` / `from` / `to`                    | yes      | `from`/`to` must reference known note ids; `label` optional                                                                                              |
| `links[].kind`                                  | no       | `member` (same slice) \| `flow` (succession); inferred from the note types when omitted                                                                  |
| `contexts` / `elements` / `links`               | no       | each defaults to `[]`                                                                                                                                    |
| `contexts[].questions` / `elements[].questions` | no       | Refs of the page's questions (grill) the note or context is about, space-separated (`"Q1 Q4"`); each gets a Q badge (`docs/index.md`, Questions (grill)) |

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

参照形式: `element:<id>`（note も context も一意な id 空間）、`link:<id>`、ボード全体は `page:event-storming`。ページの内容にするときは、他の target と同じく `@<page>` を付ける（`docs/page.md`）。

## Selection

`selection` is `{ kind: 'note', id }` — only a note (an `elements[]` entry) is individually selectable this way; a bounded context is instead filtered via `#context=` (below), not selected.

## Action vocabulary

| Action                    | target  | payload                                                                                                            |
| ------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------ |
| `SET_ELEMENT_NAME`        | element | `{ "name": string }`                                                                                               |
| `SET_ELEMENT_DESCRIPTION` | element | `{ "description": string }`                                                                                        |
| `SET_ELEMENT_TYPE`        | element | `{ "type": "actor" \| "command" \| "aggregate" \| "event" \| "policy" \| "readmodel" \| "external" \| "hotspot" }` |
| `SET_ELEMENT_CONTEXT`     | element | `{ "contextId": string \| null }` (`null` = unassigned)                                                            |
| `MOVE_ELEMENT`            | element | `{ "after": string \| null }` (`null` = first)                                                                     |
| `ADD_ELEMENT`             | page    | `{ "id", "type", "name", "description"?, "contextId"? }`                                                           |
| `DELETE_ELEMENT`          | element | `{}`                                                                                                               |
| `LINK_ELEMENTS`           | page    | `{ "id", "from", "to", "label"?, "kind"? }`                                                                        |
| `SET_LINK_LABEL`          | link    | `{ "label": string }`                                                                                              |
| `UNLINK_ELEMENTS`         | page    | `{ "from", "to" }` (removes every link with that pair)                                                             |
| `ADD_CONTEXT`             | page    | `{ "id", "name", "description"? }`                                                                                 |
| `SET_CONTEXT_NAME`        | context | `{ "name": string }`                                                                                               |
| `DELETE_CONTEXT`          | context | `{}` (its notes become unassigned)                                                                                 |

- The order of the `elements` array **is** the timeline order, and only `MOVE_ELEMENT` changes it. `after` is an anchor id, not an offset: `{ "after": "order-cmd" }` means "directly after order-cmd", and an unknown anchor makes the action stale.
- An unknown endpoint, an unknown `contextId` (or one that no longer exists) makes the action stale: `SET_ELEMENT_CONTEXT`, `ADD_ELEMENT` and `LINK_ELEMENTS` are the ones that can carry one.
- `DELETE_ELEMENT` also drops every link that referenced the note, so follow-up edits to those links go stale instead of dangling. `DELETE_CONTEXT` keeps the notes and only clears their `contextId`.
- Embedded inside a view, or the content of a page, every action above is an **element action** on `element:<id>/element/<note-id>`, `element:<id>/context/<context-id>` or `element:<id>/link/<link-id>` (`docs/boards/index.md`, Element comments and view integration), with `ADD_ELEMENT` / `LINK_ELEMENTS` / `ADD_CONTEXT` landing on `element:<id>/page`. Note that the component's **comment** kind for a note is `note`, not `element` — see [Comment targets](#comment-targets). The enclosing view (or the page, when the board is its content) owns the draft; inside a page, every target above ends in `@<page>`.

## Navigation

```text
#note=ordered&context=kitchen
```

- `note` selects a note: it gets the accent outline on the board and its editor opens. `context` filters the board to that bounded context (notes without that `contextId` are hidden; link lines stay computed from timeline positions).
- Unknown ids fall back and the URL is rewritten to the canonical form.

## UI provided by the component

| Region | Content                                                                                                                           |
| ------ | --------------------------------------------------------------------------------------------------------------------------------- |
| header | bounded-context filter (すべて + one button per context with delete), add-context / add-element buttons, and the timeline counter |
| main   | the board: fixed-grid notes grouped into slices, SVG causality lines, and the empty state when there are no notes                 |

Selecting a note opens its editor in a popover: inline-editable name and description, type select, bounded-context select, delete, and the outgoing/incoming link lists with add and remove.

Every note reveals a small tool rail on hover (or while anything in the note has focus): a **comment** button, which opens the contextual composer over that very note without selecting it, and **delete**. Right-clicking a note offers the same composer through the generic "Review comment" item (`docs/boards/index.md`, Element comments).

The board is a fixed grid — notes keep their size so the link lines never need measuring — and a long timeline scrolls horizontally. The UI edits note name/description/type, context assignment, add/delete note, add/remove links, add/delete context, the context filter and the selected note. Deliberately left to the agent (no UI): reordering the timeline across the flow, retargeting link endpoints, and any restructuring of the meaning model (merging contexts, re-typing whole lanes).

## Comment targets

Elements and contexts: `element:<id>` labelled with the note name under group `Element`, `context:<id>` labelled with the context name under group `Bounded context`. In the chaos harness and any other code that wraps these into the `element:<board-id>/<kind>/<id>` scheme (`docs/boards/index.md`), the kind for a note is `note` — matching this section's own group label, not the `element` action-vocabulary target kind above.

A note's hover comment button and the right-click "Review comment" item open the same composer, anchored on that note: a top-layer popover with a textarea, Send / Cancel and the note's existing comments. The board's layout never moves for it.

## Change notices

[Change notices](../index.md#change-notices)'s "Show" pans the wall into view rather than scrolling it, since notes sit on a fixed grid:

| Target         | What "Show" does                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------------------ |
| `element:<id>` | Focuses the note (`#note=`) and pans the wall to it.                                                         |
| `context:<id>` | Pans to and highlights the bounded context region.                                                           |
| `link:<id>`    | Pans to and highlights the arrow — a link inside one slice draws no arrow, so there is nothing to highlight. |
