# dpk-tag-filter

A row of tag chips with `Single` / `AND` / `OR` matching — the filter row every board uses, on its own. It renders the chips and keeps the reader's pick; what the tags mean, and which items they hide, stays the host's decision.

```html
<dpk-tag-filter id="filters">
  <script type="application/json">
    {
      "tags": [{ "tag": "API", "count": 4 }, { "tag": "UI", "count": 2 }, "未決定"],
      "active": ["API"],
      "match": "any"
    }
  </script>
</dpk-tag-filter>

<script type="module">
  const filters = document.getElementById('filters');
  filters.addEventListener('dpk-tag-filter-change', (event) => {
    const { active, match } = event.detail;
    for (const item of document.querySelectorAll('[data-tags]')) {
      item.hidden = !filters.passes(item.dataset.tags.split(' '));
    }
  });
</script>
```

The pick is view state: it is never recorded in the draft and never reaches the agent.

## Data

The JSON child is either a plain list of options, or `{ "tags": [...], "active"?: [...], "match"?: "single" | "all" | "any" }`.

| Field    | Required | Meaning                                                                 |
| -------- | -------- | ----------------------------------------------------------------------- |
| `tags`   | yes      | The chips, in display order. A tag is a name, or `{ "tag", "count"? }`. |
| `active` | no       | The chips picked on load.                                               |
| `match`  | no       | `single` (default) \| `all` \| `any`.                                   |

The list is forgiving by design: an entry that is not a name or `{ tag, count }` is dropped, a duplicate tag keeps its first spelling, and an unknown `match` or a non-string pick is ignored rather than rendered as an error. Tags starting with `BC:` — a board's bounded-context tags — are shown ahead of the rest, each group keeping its authored order.

The same data can be set as properties from script instead of a JSON child.

## Attributes and properties

| Name     | Kind                           | Meaning                                                                                                   |
| -------- | ------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `tags`   | property (`attribute: false`)  | The chips: `string[]` or `{ tag, count? }[]`                                                              |
| `active` | property (`attribute: false`)  | The picked tags                                                                                           |
| `match`  | attribute/property (reflected) | `single` (default) \| `all` \| `any`; `single` replaces the pick, `all` needs every picked tag, `any` one |
| `bare`   | boolean attribute              | Drops the row's own padding, bottom rule and background, for a host that supplies its own frame           |

| Method         | Effect                                                                             |
| -------------- | ---------------------------------------------------------------------------------- |
| `passes(tags)` | Whether an item carrying `tags` passes the current pick (always, with none picked) |

## Events

| Event                   | Detail                        | Fired when                                                            |
| ----------------------- | ----------------------------- | --------------------------------------------------------------------- |
| `dpk-tag-filter-change` | `{ active: string[], match }` | The reader picks, unpicks or clears a tag, or switches the match mode |

Bubbles and is composed, so a host can listen on an ancestor.

## Slots

None — the row is the component's own. It carries `part="row"` for styling.

## Empty and clear

With no tags to filter by, the whole row renders nothing: the `Single` / `AND` / `OR` toggle would have nothing to switch between, and an empty bar is noise. A `Clear` button appears at the end of the row only while at least one tag is picked.
