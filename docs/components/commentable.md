# dpk-commentable

Makes parts of your own markup comment targets. Wrap any light DOM in it, mark the elements a reviewer should be able to comment on with `data-dpk-item`, and right-clicking a marked element offers the same **Review comment** composer every board opens — without the element taking over your layout. It only slots its children and never renders content of its own.

```html
<dpk-commentable id="pricing-notes" heading="料金メモ">
  <h2>料金</h2>
  <p data-dpk-item="note:monthly" data-dpk-label="月額プランの説明">
    月額プランは、請求サイクルの途中でも変更できます。
  </p>
  <ul>
    <li data-dpk-item="note:annual">年額プランは一括払いのみです。</li>
  </ul>
</dpk-commentable>
```

Place it inside a view, or make it the content of a page, to keep the comments: the enclosing view (or page) stores them like any other element comment. On its own it emits the events but owns no store, so a submission keeps its text and says why it was not saved.

## Marking items

A marked element is `data-dpk-item="<kind>:<id>"`. Both segments follow the common id rule (letters, digits, `_`, `-`), and the reference has to be unique inside the element: an ambiguous one is dropped, with a console warning, rather than guessing which element a comment belongs to.

The label the review rail shows is the first of:

1. `data-dpk-label` on the marked element,
2. the text of its first heading (`h1`–`h6`, `summary`, `caption`, `legend`),
3. its own text content,
4. a generic "untitled" label.

Labels longer than 60 characters are ellipsized.

The element stamps `data-dpk-target="element:<id>/<kind>/<item-id>"` on each marked element (each segment URI-encoded), which is what the context menu, the composer's anchor and [Check Mode](../index.md#check-mode) read. Do not author that attribute yourself.

Marked items belong to their nearest `dpk-commentable`: items inside a nested one are the inner element's, not the outer one's.

## Attributes and properties

| Name      | Kind                  | Meaning                                                                                                |
| --------- | --------------------- | ------------------------------------------------------------------------------------------------------ |
| `id`      | attribute (reflected) | The provider id used in every target value. Without it there are no targets and no comment affordance. |
| `heading` | attribute             | The group label the review rail lists the items under; defaults to the kit's own "Content".            |

| Property         | Type                         | Meaning                                                               |
| ---------------- | ---------------------------- | --------------------------------------------------------------------- |
| `commentTargets` | `{ value, label, group? }[]` | Every marked item, read-only — the same entries the review rail uses. |

## Events

| Event                        | Detail             | Fired when                                                             |
| ---------------------------- | ------------------ | ---------------------------------------------------------------------- |
| `dpk-comment-targets-change` | none               | The set of items, or any of their labels, changed                      |
| `dpk-comment-submit`         | `{ target, body }` | The composer submits a comment — bubbling, composed and **cancelable** |

`dpk-comment-submit` is the same acceptance protocol the boards and `dpk-formal-spec` use: the enclosing view saves the comment and calls `preventDefault()` once it has. Leaving it unhandled, or not cancelling it, keeps the composer open with its draft intact and shows a "could not send" message.

## Slots

| Slot      | Holds                                              |
| --------- | -------------------------------------------------- |
| (default) | Your markup, unchanged; the element only slots it. |

The element observes its subtree, so marking an element that is added later (or changing its `data-dpk-item` / `data-dpk-label`) registers it without any extra call.

## Styling

Nothing visual of its own: it inherits the surrounding font, line height and color. Style your own markup as usual — it stays in the light DOM.
