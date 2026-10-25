# dpk-comment-popover

The same tooltip-like review-comment composer every board, `dpk-formal-spec` and `dpk-commentable` already open from their right-click menu (`docs/boards/index.md`, `docs/components/formal-spec.md`), on its own: wrap any clickable trigger in it so markup that is not one of those components can still open the identical UI, without building a context menu first.

```html
<p>
  Monthly plans can be changed mid-cycle.
  <dpk-comment-popover target="element:pricing-note" label="The pricing note">
    <button type="button" aria-label="Comment">💬</button>
  </dpk-comment-popover>
</p>
```

It composes like `<details open>`: toggling `open` shows or hides the popover, whether that toggle comes from clicking the slotted trigger, from the host setting the property directly, or from the popover closing itself (`Escape`, Cancel, a successful submit).

## Attributes and properties

| Name     | Kind                           | Meaning                                                                                                               |
| -------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `target` | attribute/property             | Carried verbatim into `dpk-comment-submit`'s detail; this element does not interpret it. Typically a `target.ts` ref. |
| `label`  | attribute/property             | Shown atop the composer — what the comment is about. Optional.                                                        |
| `open`   | attribute/property (reflected) | Whether the popover is shown. Settable directly; mirrors back to `false` once the popover closes itself.              |

## Interaction

| Action                                  | Result                                                         |
| --------------------------------------- | -------------------------------------------------------------- |
| Clicking the slotted trigger            | Sets `open` to `true`.                                         |
| `Escape` with focus inside the composer | Closes the popover without submitting; `open` becomes `false`. |
| Submitting the composer                 | Fires `dpk-comment-submit`, below.                             |

## Events

| Event                | Detail                             | Fired when                                                         |
| -------------------- | ---------------------------------- | ------------------------------------------------------------------ |
| `dpk-comment-submit` | `{ target: string, body: string }` | The composer submits a comment (bubbles, composed, **cancelable**) |

There is no draft here: whatever encloses `dpk-comment-popover` saves the comment and calls `preventDefault()` once it has, the same acceptance protocol boards and `dpk-formal-spec` use (`docs/boards/index.md`). Leaving the event unhandled, or not cancelling it, keeps the composer open with its draft intact and shows a "could not send" message — the popover never discards what was typed merely because nothing accepted it.
