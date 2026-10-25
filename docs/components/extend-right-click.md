# dpk-extend-right-click

Your own entries in the page-wide right-click menu, written as JSON instead of as a component. Wrap the markup, say which elements the menu applies to with a CSS selector, and each group of entries shows up when a right-click lands on (or inside) a matching element.

```html
<dpk-view-plain storage-key="cards">
  <script type="application/json">
    { "title": "Cards" }
  </script>

  <dpk-extend-right-click id="cards-menu" slot="main">
    <script type="application/json">
      {
        "targets": [
          {
            "selector": ".dpk-card",
            "label": "card",
            "groups": [
              {
                "id": "card",
                "heading": "Card",
                "entries": [
                  { "kind": "item", "id": "copy-id", "label": "Copy id", "copy": "data-id" },
                  { "kind": "item", "id": "open", "label": "Open", "event": "card:open" },
                  {
                    "kind": "item",
                    "id": "delete",
                    "label": "Delete",
                    "danger": true,
                    "event": "card:delete",
                    "detail": { "reason": "menu" }
                  },
                  {
                    "kind": "submenu",
                    "id": "links",
                    "label": "Links",
                    "entries": [{ "kind": "item", "id": "links-doc", "label": "Docs", "event": "card:open-doc" }]
                  }
                ]
              }
            ]
          }
        ]
      }
    </script>

    <article class="dpk-card" data-id="card-1">…</article>
    <article class="dpk-card" data-id="card-2">…</article>
  </dpk-extend-right-click>
</dpk-view-plain>

<script type="module">
  const menu = document.getElementById('cards-menu');
  menu.addEventListener('card:open', (event) => {
    // { id, group, item, target: { selector, label }, element, authored }
    const { element, authored } = event.detail;
    openCard(element.dataset.id, authored);
  });
</script>
```

The wrapper is light DOM and adds no box of its own: its children lay out exactly as if it were not there, and it renders nothing but a slot.

Load `components.js` (or the all-in-one `index.js`). A view entry (`views/plain.js`, …) does not carry it.

## Placement

The menu itself belongs to the page shell, so the wrapper needs a context-menu host above it: put it inside a `dpk-view-*` subtree — anywhere in a view's light DOM, or around an embedded board. A view, and a board embedded in one, host the menu; a board that is a page's content on its own does not (yet), so a wrapper around a standalone board contributes nothing there.

Wrapping markup that lives outside any `dpk-view-*` (a component on its own) is equally inert: no host, no menu.

## Data

The JSON child, or the `config` property with the same shape (`parseExtendRightClickData` is exported from `components.js`; the property wins over the JSON child while it is set). Both are validated strictly and parsed once: an unknown key, a missing required field, an empty selector or an id used twice anywhere in the config is an error, and the wrapper contributes no menu (the console says why).

| Field     | Required | Meaning                                                                              |
| --------- | -------- | ------------------------------------------------------------------------------------ |
| `targets` | yes      | The "when the click is on this, offer that" rules, in matching order (`[]` for none) |

Per target:

| Field      | Required | Meaning                                                                                 |
| ---------- | -------- | --------------------------------------------------------------------------------------- |
| `selector` | yes      | CSS selector, matched against the clicked element and its ancestors inside the wrapper  |
| `label`    | no       | Short name for what was matched; it travels with the run event, nothing else renders it |
| `groups`   | yes      | The menu groups this target contributes, in display order                               |

Per group:

| Field     | Required | Meaning                                                         |
| --------- | -------- | --------------------------------------------------------------- |
| `id`      | yes      | Stable id, unique in the whole config; the run event reports it |
| `heading` | no       | A heading row above the group's entries                         |
| `entries` | yes      | The items and submenus, in display order                        |

Per entry:

| Field     | Required     | Meaning                                                                |
| --------- | ------------ | ---------------------------------------------------------------------- |
| `kind`    | yes          | `"item"` or `"submenu"`                                                |
| `id`      | yes          | Stable id, unique in the whole config                                  |
| `label`   | yes          | The row's text                                                         |
| `danger`  | no           | `true` draws the row in the destructive tone (delete, disconnect, …)   |
| `event`   | no           | Custom event to dispatch; `dpk-extend-right-click-run` when omitted    |
| `detail`  | no           | Your own JSON object, carried to the listener as `detail.authored`     |
| `copy`    | no           | What to copy instead of running: `"text"` or an attribute name (below) |
| `entries` | submenu only | The submenu's own entries, same shape (nested submenus are allowed)    |

Ids are unique across the whole config — entries and groups share one namespace — because the id is what a listener receives and what the menu keeps highlight state by.

There is no `disabled`: an entry the reader cannot use yet should not be authored into this config at all.

## Matching

A right-click carries the element it landed on. The wrapper walks that element and its ancestors (through shadow roots) up to itself, nearest first, and the first element matching any target's `selector` wins — that target's groups are the ones offered. A nearer match therefore beats a farther one, and among several selectors matching the same element, the first target in `targets` wins.

Only the nearest wrapper handles a click: if another `dpk-extend-right-click` sits between the clicked element and this one, this wrapper stays silent, so nested wrappers never offer the same entries twice.

An invalid selector is skipped with a console warning (`[dev-process-kit] dpk-extend-right-click: …`) rather than throwing; the rest of the config keeps working. The same goes for a JSON child that fails to parse: it contributes no menu and the view keeps working.

## Events

Each `kind: "item"` entry with no `copy` dispatches its `event` (default `dpk-extend-right-click-run`) on the wrapper — bubbling and composed — with this detail:

| Field      | Meaning                                                                              |
| ---------- | ------------------------------------------------------------------------------------ |
| `id`       | The entry's id                                                                       |
| `group`    | The id of the group it sits in                                                       |
| `item`     | The entry's id (same as `id`, beside `group`)                                        |
| `target`   | `{ selector, label }` of the target that matched (`label` is `null` when unauthored) |
| `element`  | The element the selector matched (the clicked element or an ancestor of it)          |
| `authored` | The entry's `detail` object, or `{}`                                                 |

The listener on an ancestor can tell two cards apart by `element`, and reads the author's payload from `authored`.

## Copy

`copy` turns a row into a clipboard write, with no event: `"text"` copies the matched element's `textContent`, and any other value is the name of an attribute to read (`"href"`, `"value"`, `"data-id"`, …). Whitespace around the value is dropped.

An item whose source has no value — the attribute is absent, or the element has no text — is left out of the menu entirely, rather than offering a row that would copy nothing. If both `copy` and `event` are authored, the item copies and dispatches the named event.

## What the page already offers

This only adds groups. The shell's own entries — **Copy text**, **Give feedback** and a board's **Reset view** — still appear for whatever was clicked, after the groups a wrapper or a component contributes. Shift+right-click, and a right-click inside a text field, still get the browser's own menu.

## Attributes and properties

| Name     | Kind                          | Meaning                                                                               |
| -------- | ----------------------------- | ------------------------------------------------------------------------------------- |
| `config` | property (`attribute: false`) | The config, same shape as the JSON child; the JSON child is used while this is `null` |
| `error`  | property (read-only)          | Why the JSON child contributes no menu, or `null` when it parsed                      |

## Slots

The wrapper has one unnamed slot: its own children, untouched. It draws no chrome of its own (`:host { display: contents; }`), so wrapping markup never changes the page's layout.
