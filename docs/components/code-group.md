# Component: code group (`<dpk-code-group>`)

Several code variants under one frame, with tabs: a package manager switch, an install path per
agent, or any set of snippets a reader should see one at a time. One copy button copies the
active variant. Load `components.js` (or `index.js`) for it.

## Data

Pass one object as the `data` property, or put it in a `script[type="application/json"]` child:

```html
<dpk-code-group>
  <script type="application/json">
    {
      "label": "Install",
      "variants": [
        { "label": "npm", "language": "sh", "code": "npm create dev-process-kit@latest" },
        { "label": "pnpm", "language": "sh", "code": "pnpm create dev-process-kit" }
      ]
    }
  </script>
</dpk-code-group>
```

| Field                 | Required | Meaning                                                                     |
| --------------------- | -------- | --------------------------------------------------------------------------- |
| `label`               | no       | The name in the block header. Defaults to a generic code label.             |
| `variants[]`          | yes      | One tab per variant. At least one.                                          |
| `variants[].label     | yes      | The tab label: `npm`, `Claude Code`, `お試し`. Unique within the group.     |
| `variants[].language` | no       | `ts`, `html`, `css`, `json`, `sh` or an alias; unknown languages are plain. |
| `variants[].code`     | yes      | The code itself.                                                            |

Unknown keys, a duplicate tab label and an empty `variants` list are errors: the element shows
the message instead of a block.

## Element API

`dpk-code-group.data` is the parsed data object; set it to redraw. A
`script[type="application/json"]` child is read when the element connects. The frame and token
colours are the `dpk-code` styles; the active panel is `pre[role="tabpanel"]`, the tabs are
`[role="tab"]`, and `--dpk-code-max-height` caps the block height. Token colours can be
overridden per kind with `--dpk-code-<kind>` (comment / string / number / keyword / function /
tag / attr / property / punct).
