# dpk-combobox

A labelled field that opens a grouped, filterable list of options — picking a reviewer, an assignee, anything picked by name. A plain input control: no draft, no element actions, nothing recorded for review.

```html
<dpk-combobox label="Reviewers" placeholder="Add reviewers…" multiple>
  <script type="application/json">
    {
      "options": [
        { "value": "maya", "label": "Maya Chen", "description": "Product Designer", "group": "Design" },
        { "value": "noah", "label": "Noah Reyes", "description": "UX Researcher", "group": "Design" },
        { "value": "jin", "label": "Jin Park", "description": "Backend Engineer", "group": "Engineering" },
        { "value": "amy", "label": "Amy Diaz", "description": "Frontend Engineer", "group": "Engineering" },
        { "value": "leo", "label": "Leo Fischer", "description": "Platform Engineer", "group": "Engineering" },
        { "value": "sara", "label": "Sara Kim", "description": "Product Manager", "group": "Product" }
      ],
      "value": ["maya", "jin"]
    }
  </script>
</dpk-combobox>
```

## Data

| Option field  | Required | Meaning                                                                                                                             |
| ------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `value`       | yes      | Stable id, unique among the options; what `value` and `dpk-combobox-change` carry.                                                  |
| `label`       | yes      | Name shown in the field and in the list.                                                                                            |
| `description` | no       | Muted secondary text beside the name (a role, a team), on the same line.                                                            |
| `group`       | no       | Groups options under an uppercase heading, in the order a group is first seen. Ungrouped options are listed last, under no heading. |
| `avatar`      | no       | Overrides the initials the round avatar would otherwise derive from `label`.                                                        |

The top-level `value` sets the initial pick (a string, or a list — either works in both modes). Duplicate option values and unknown keys are errors, and the element renders the reason instead of a wrong list.

## Attributes and properties

| Name          | Kind              | Meaning                                                                                                          |
| ------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------- |
| `label`       | attribute         | Shown above the field, and used as the list's accessible name.                                                   |
| `placeholder` | attribute         | Shown in the field while nothing is picked.                                                                      |
| `multiple`    | boolean attribute | Picks become removable chips inside the field; without it, a pick replaces the field's text and closes the list. |
| `name`        | attribute         | Reflected for the author's own form wiring; the element does not submit itself.                                  |
| `value`       | property          | The current pick — a string in single-select, a string list in `multiple`. Setting it accepts either shape.      |

## Interaction

| Action                                              | Result                                        |
| --------------------------------------------------- | --------------------------------------------- |
| Click the field, or focus it                        | Opens the list                                |
| Type                                                | Filters options by label and description      |
| `↓` / `↑`                                           | Moves the active option (wraps at either end) |
| `Enter`                                             | Toggles the active option                     |
| `Escape`, or a press outside the field and the list | Closes the list, discarding the typed filter  |
| Click an option                                     | Toggles it                                    |
| `Backspace` with the filter empty (`multiple`)      | Removes the last chip                         |
| Click a chip's ✕ (`multiple`)                       | Removes that pick                             |

The list's footer shows the current count (`multiple`) and the two shortcuts above. Every pick or removal fires `dpk-combobox-change` (bubbles, composed) with `{ value }`, in the same shape as the `value` property.
