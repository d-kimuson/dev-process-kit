# Component: line chart (`<dpk-line-chart>`)

A data-driven line chart: one or more lines (`series`), auxiliary lines (`guides`) and the
moments ruled through the plot (`marks`). It is a component, not a board: put it in a view, a
board's slot or your own markup. Load `components.js` (or `index.js`) for it.

The drawing follows the chart atom ([catalog](https://d-kimuson.github.io/dev-process-kit/#catalog-chart)),
so a data-driven chart and an author-drawn one look the same.

## Data

Pass one object as the `data` property, or put it in a `script[type="application/json"]` child:

```html
<dpk-line-chart>
  <script type="application/json">
    {
      "title": "残りのストーリー",
      "caption": "19 → 4",
      "series": [
        {
          "id": "remaining",
          "label": "残り",
          "area": true,
          "points": [
            { "x": "08/01", "y": 19 },
            { "x": "08/08", "y": 11 },
            { "x": "08/15", "y": 4 }
          ]
        }
      ],
      "guides": [
        {
          "id": "ideal",
          "label": "理想",
          "points": [
            { "x": "08/01", "y": 19 },
            { "x": "08/15", "y": 0 }
          ]
        }
      ],
      "marks": [{ "x": "08/13", "label": "今日" }],
      "xAxis": { "label": "日付" },
      "yAxis": { "label": "件数", "min": 0 }
    }
  </script>
</dpk-line-chart>
```

| Field                     | Required | Meaning                                                                                                    |
| ------------------------- | -------- | ---------------------------------------------------------------------------------------------------------- |
| `title`                   | no       | The chart's heading and accessible name. Defaults to a generic label.                                      |
| `caption`                 | no       | A short value in the heading, such as the latest figure or a delta.                                        |
| `series[]`                | no       | The lines. An empty list renders the empty state.                                                          |
| `series[].id`             | yes      | Stable id, unique among the series.                                                                        |
| `series[].label`          | yes      | Legend label.                                                                                              |
| `series[].points[]`       | yes      | `{ "x": string, "y": number }`, unique `x` within the line.                                                |
| `series[].tone`           | no       | `blue` (default), `green`, `amber`, `violet`, `accent` or `ink-faint`.                                     |
| `series[].area`           | no       | Fill the area under the line. Defaults to `false`.                                                         |
| `guides[]`                | no       | Auxiliary lines: an ideal, a baseline, an average. Same shape as a series, plus `dashed` (default `true`). |
| `marks[]`                 | no       | `{ "x", "label", "tone"? }`; a vertical rule at an `x` that a series or guide already uses.                |
| `xAxis.label`             | no       | The horizontal axis name.                                                                                  |
| `yAxis.label`             | no       | The vertical axis name.                                                                                    |
| `yAxis.min` / `yAxis.max` | no       | Pin the vertical range. Unset, it starts at 0 when every value is positive and pads the top.               |

The x domain is the order the data writes it. A point skipped by one line is simply not drawn for
that line; the shared domain still comes from every series and guide. Unknown keys, duplicate ids,
duplicate `x` values in one line and an empty or inverted `yAxis` range are errors: the element
shows the message instead of a chart.

## Element API

`dpk-line-chart.data` is the parsed data object (read-only in practice: set it to redraw). The
element is a Lit element; a `script[type="application/json"]` child is read when the element
connects. A frame is drawn as `.dpk-chart`; the lines, guides, marks, points and legend use the
chart atom's classes, so author CSS can restyle them with the `--dpk-*` tokens.
