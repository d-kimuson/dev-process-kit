# dpk-component-mind-map

A central topic and a tree of subtopics, fanned out to the left and the right. Selecting a topic lights its path to the centre and everything beneath it; a topic with subtopics folds down to a count.

Shared contract (data paths, tags, pan/zoom, comments, element actions, sizing): `docs/components/diagrams.md`.

```html
<dpk-component-mind-map id="checkout-mind-map" heading="Mind map" subject="注文フロー刷新の論点">
  <script type="application/json">
    {
      "root": {
        "id": "checkout-renewal",
        "label": "注文フロー刷新",
        "children": [
          {
            "id": "payment",
            "label": "決済",
            "tags": ["今回の設計"],
            "children": [
              { "id": "idempotency", "label": "注文IDを冪等キーにする" },
              { "id": "three-ds", "label": "3D セキュア", "tags": ["未決定"] }
            ]
          },
          { "id": "risks", "label": "リスク", "side": "left", "collapsed": true, "children": [] }
        ]
      }
    }
  </script>
</dpk-component-mind-map>
```

## Data

`root` is one topic; every topic has the same shape:

| Field         | Required | Meaning                                                                                               |
| ------------- | -------- | ----------------------------------------------------------------------------------------------------- |
| `id`          | yes      | Stable id, unique across the whole tree. It is the comment target (`element:<diagram-id>/node/<id>`). |
| `label`       | yes      | Text on the topic. Long labels are ellipsized; the full text is the tooltip.                          |
| `description` | no       | Shown as the tooltip.                                                                                 |
| `tags`        | no       | Tag filter values.                                                                                    |
| `collapsed`   | no       | `true` opens the topic folded.                                                                        |
| `side`        | no       | `left` \| `right`. Only on a main topic (a child of `root`); its subtopics follow it.                 |
| `children`    | no       | Subtopics, in reading order (top to bottom).                                                          |
| `questions`   | no       | Question references for the grill template.                                                           |

Duplicate ids, `side` below a main topic and unknown keys are errors, and the element renders the reason instead of a wrong map.

## Layout

The central topic sits in the middle. Main topics without a `side` go to whichever half has fewer leaves so far, so the map stays balanced; authored sides count towards that balance. Subtrees are stacked so they never overlap, and each main topic gives its whole branch one color.

The map opens fitted to the canvas (the centre is in the middle, so 100% from the top-left corner would hide half of it). Folding and filtering keep the reader's current pan and zoom.

## Tags

A tree cannot drop a parent without orphaning its children, so a tag match keeps its path to the centre and everything beneath it. When nothing matches, the map is empty.

## Selection and folding

| Action                      | Result                                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------- |
| Select a topic              | Path to the centre and the subtree light up, the rest dims; an action bar appears under the topic |
| Hover a topic with children | A `−` toggle appears at its outer edge; clicking it folds the subtopics                           |
| Folded topic                | The toggle stays visible with the number of hidden topics; clicking it unfolds                    |

There is no details panel under the canvas: the map keeps all of its height.

Folding a branch clears a selection inside it. Folding is view state: it is not a draft action, and every topic stays a comment target whether it is folded or filtered out.

| Property / method        | Meaning                                                |
| ------------------------ | ------------------------------------------------------ |
| `collapsed`              | Ids of the currently folded topics (read-only)         |
| `toggle(id, collapsed?)` | Fold or unfold a topic; without `collapsed` it toggles |

Branches are not selectable and are not comment targets: comment on the topic instead.

## Adding topics

The action bar under a selected topic offers **+ Subtopic** and **Comment** (the latter needs a diagram `id`). Type a label and press `Enter` to add a subtopic; `Escape` cancels. The new topic is drawn with a dashed border, its parent unfolds, and the new topic is selected.

An added topic is not written into the JSON child. It is recorded as an element action in the enclosing template's draft, next to its actions and comments, and appears in its review rail. The map replays these actions over the authored data, so they survive a reload and reach the agent in the brief. Outside a template, or without a diagram `id`, there is nothing to record into: the bar shows an error and keeps the input.

| Action      | Target                                  | Payload                             | Result                                                                   |
| ----------- | --------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------ |
| `ADD_TOPIC` | `element:<diagram-id>/node/<parent-id>` | `{ "id": string, "label": string }` | Appends a subtopic `{ id, label }` to the end of the parent's `children` |

`ADD_TOPIC` is stale when the parent no longer exists (`target-missing`), or when the label is empty or the id is already in use (`constraint-violated`). A new main topic (a child of `root`) keeps the map balanced like an authored one. The sides of the authored main topics never move.

To apply an `ADD_TOPIC`, append `{ "id": <id>, "label": <label> }` to the parent's `children` in the JSON child.
