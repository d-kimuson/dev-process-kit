# dpk-checklist

A titled list of items the reviewer ticks off, with a progress bar. Each item is a comment target, and each tick is a `SET_CHECKED` element action the enclosing view records — so the agent learns which items the reviewer confirmed (or un-confirmed) from the hand-off, not from a screenshot.

```html
<dpk-checklist id="release-checks" heading="リリース前チェック">
  <script type="application/json">
    {
      "items": [
        { "id": "migration", "label": "マイグレーションを本番で一度リハーサルした", "checked": true },
        { "id": "rollback", "label": "ロールバック手順を確認した", "note": "担当: 運用" },
        { "id": "alerts", "label": "新しいエンドポイントのアラートを張った" }
      ]
    }
  </script>
</dpk-checklist>
```

Place it inside a view, or make it the content of a page, to keep the ticks and comments. Without that host, the ticks are not recorded: the item's row says so and keeps what the reader clicked.

## Data

The JSON child is `{ "items": [{ id, label, checked?, note? }] }`, validated strictly — an unknown key or a duplicate item id renders the reason instead of the list.

| Field     | Required | Meaning                                                                   |
| --------- | -------- | ------------------------------------------------------------------------- |
| `id`      | yes      | Stable id, unique in the list; the comment and action target.             |
| `label`   | yes      | The item's text.                                                          |
| `checked` | no       | Starts the item ticked. Defaults to `false`.                              |
| `note`    | no       | A second, smaller line under the label (a condition, an owner, a detail). |

The author's `checked` is the baseline; a reader's tick is a draft action replayed over it, never written back into the JSON child.

## Attributes and properties

| Attribute | Meaning                                                     |
| --------- | ----------------------------------------------------------- |
| `id`      | Enables comments and ticks; keep it stable across revisions |
| `heading` | The card's title (default: `Checklist` / `チェックリスト`)  |

| Property               | Type                                       | Meaning                                                          |
| ---------------------- | ------------------------------------------ | ---------------------------------------------------------------- |
| `elementActions`       | draft actions (writable)                   | Assigned by the enclosing view, replayed over the authored items |
| `elementActionResults` | `{ id, title, summary?, tone?, stale? }[]` | How each assigned action applied (read-only)                     |
| `commentTargets`       | `{ value, label, group? }[]`               | Every item (read-only)                                           |

## Actions

| Action        | Target                        | Payload                  | Result                      |
| ------------- | ----------------------------- | ------------------------ | --------------------------- |
| `SET_CHECKED` | `element:<id>/item/<item-id>` | `{ "checked": boolean }` | Ticks or un-ticks that item |

An item the reader changed from what the author wrote is tinted, and each action appears in the review rail with a title such as `Checked: ロールバック手順を確認した`. An action for an item that no longer exists stays in the draft as stale (`target-missing`).

## Events

| Event                        | Detail                      | Fired when                                                                |
| ---------------------------- | --------------------------- | ------------------------------------------------------------------------- |
| `dpk-element-action`         | `{ type, target, payload }` | The reader ticks or un-ticks an item — bubbling, composed, **cancelable** |
| `dpk-comment-request`        | `{ target: string }`        | The reader asks to comment on an item                                     |
| `dpk-comment-targets-change` | none                        | The item list, or any of their labels, changed                            |

`dpk-element-action` follows the same acceptance protocol as every board: the nearest view stores it and calls `preventDefault()`. If nothing accepts it, the row keeps the reader's tick and says it was not recorded.

## Slots

None. The whole surface — heading, progress, items, comment button — is the component's own; the data is the JSON child.
