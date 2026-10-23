# dpk-inline-edit

Small inline editor used throughout every template for "local edits": a title, a description, a label. Click (or Enter/Space) turns the shown text into a field in place, keeping its position and type scale; Enter (or blur) commits, Escape cancels. It never writes anything itself — it only emits `dpk-commit`, so the edit still travels through the host's own draft action.

```html
<dpk-inline-edit value="Sign in with Google" placeholder="Untitled"></dpk-inline-edit>

<script type="module">
  const field = document.querySelector('dpk-inline-edit');
  field.addEventListener('dpk-commit', (event) => {
    console.log(event.detail.value);
    // field.value = event.detail.value; // once the host accepts it
  });
</script>
```

## Contract

| Property/attribute | Type                 | Meaning                                                                                                                                                                           |
| ------------------ | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`            | `string`             | The committed text. The host owns it — a commit does not update `value` itself; the host does, once it applies the change.                                                        |
| `placeholder`      | `string`             | Shown (in italics) in place of an empty value, and as the field's own placeholder while editing.                                                                                  |
| `multiline`        | `boolean`            | A `<textarea>` instead of an `<input>`; Enter inserts a line break, Ctrl/Cmd+Enter commits.                                                                                       |
| `wrap`             | `boolean` (reflects) | A wrapping field whose value stays one line: it grows across several lines while editing, but line breaks are stripped on commit, and Enter commits rather than inserting one.    |
| `truncate`         | `boolean` (reflects) | Ends in an ellipsis where the value does not fit while not editing; hovering names the whole value. One line, or with `wrap` as many as `--dpk-inline-edit-lines` (3 unless set). |
| `seamless`         | `boolean` (reflects) | Chromeless: the field looks like the text it edits, with no border or background.                                                                                                 |
| `markdown`         | `boolean`            | Shows the committed value as Markdown while not editing; the field itself always edits the plain source.                                                                          |
| `label`            | `string`             | The field's accessible name while editing; falls back to `placeholder`.                                                                                                           |

| Method           | Meaning                                                                                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `startEditing()` | Enters edit mode as if the reader had clicked the text — lets a host's own "edit" affordance (a pencil button, a menu entry) put the caret straight into the field. |

| Event        | `detail`            | Meaning                                                                                                                                                                                                    |
| ------------ | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dpk-commit` | `{ value: string }` | The reader finished editing with a changed, trimmed value. Not cancelable — the host decides what to do with it (usually dispatching its own draft action and, once accepted, writing it back to `value`). |

`dpk-commit` does not fire when the value is unchanged or editing was cancelled (Escape restores the original value without an event).

## Where it is used today

Every template uses `<dpk-inline-edit>` for its text fields: story titles and descriptions (USM), task titles (Task Board), slide text, step and activity names, and more. It is registered by every template entry alongside the review panel, so pages rarely need to register it by hand.
