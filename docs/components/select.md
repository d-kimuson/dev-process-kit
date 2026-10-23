# dpk-select

A labelled trigger button that opens a listbox popover: a non-native replacement for `<select>`, for anywhere a native dropdown's look and keyboard model fall short (the shell's own pickers use it too). A plain input control: no draft, no element actions, nothing recorded for review.

Form-associated: placed inside a `<form>`, it submits `name`/`value` like a native `<select>`, takes part in `required` validation, and resets and restores (bfcache/autofill) with the form.

```html
<dpk-select label="Status">
  <script type="application/json">
    {
      "options": [
        { "value": "todo", "label": "To do" },
        { "value": "doing", "label": "In progress" },
        { "value": "done", "label": "Done" }
      ],
      "value": "doing"
    }
  </script>
</dpk-select>
```

## Data

| Option field | Required | Meaning                                                                          |
| ------------ | -------- | -------------------------------------------------------------------------------- |
| `value`      | yes      | Stable id, unique among the options; what `value` and `dpk-select-change` carry. |
| `label`      | yes      | Name shown in the trigger and in the list.                                       |

The top-level `value` sets the initial pick. Duplicate option values and unknown keys are errors, and the element renders the reason instead of a wrong list.

## Attributes and properties

| Name          | Kind              | Meaning                                                                                                                                                                                                         |
| ------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `label`       | attribute         | Shown above the trigger. Also its accessible name, unless `aria-label` is set on the element itself.                                                                                                            |
| `placeholder` | attribute         | Shown in the trigger while nothing is picked.                                                                                                                                                                   |
| `name`        | attribute         | The field name it submits under, inside a `<form>`.                                                                                                                                                             |
| `required`    | boolean attribute | Inside a `<form>`, blocks submission while nothing is picked.                                                                                                                                                   |
| `disabled`    | boolean attribute | Disables the trigger.                                                                                                                                                                                           |
| `block`       | boolean attribute | Stretches the trigger to the element's own width, like a block-level native `<select>`.                                                                                                                         |
| `value`       | property          | The current pick. Setting it accepts a value not among the options (shown as nothing picked).                                                                                                                   |
| `options`     | property          | The current options. Reads the JSON child by default; setting it drives the list from a host instead (e.g. one that changes without a full remount), and `null`/`undefined` falls back to the JSON child again. |

## Interaction

| Action                                                | Result                                                                                                              |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Click the trigger, or `Enter` / `Space`               | Opens the list                                                                                                      |
| `↓` / `↑`                                             | Moves the active option (wraps at either end), opening the list from the picked (or nearest) end when it was closed |
| `Enter` / `Space` while open                          | Picks the active option and closes                                                                                  |
| Typing a letter                                       | Jumps to the next option whose label starts with it (cycling on repeats)                                            |
| `Escape`, or a press outside the trigger and the list | Closes the list                                                                                                     |
| Click an option                                       | Picks it and closes                                                                                                 |

Picking fires `dpk-select-change` (bubbles, composed) with `{ value }`.
