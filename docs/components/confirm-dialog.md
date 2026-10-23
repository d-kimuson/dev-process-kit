# dpk-confirm-dialog

A yes/no prompt that blocks input until answered, backed by a native `<dialog>` (`showModal()`) rather than `window.confirm` — which cannot be styled and blocks the whole page rather than just this one prompt. Use it before anything destructive or hard to undo: clearing marks, discarding input, resetting a layout.

```html
<dpk-confirm-dialog id="discard-confirm"></dpk-confirm-dialog>

<script type="module">
  const dialog = document.getElementById('discard-confirm');
  const confirmed = await dialog.ask({
    title: 'Discard this draft?',
    body: 'Your unsent text will be lost.',
    confirmLabel: 'Discard',
    cancelLabel: 'Cancel',
    tone: 'danger',
  });
  if (confirmed) {
    /* ... */
  }
</script>
```

Place one empty `<dpk-confirm-dialog>` anywhere in the page and call `ask()` on it from a script; it renders nothing until asked.

## Contract

Unlike most components here, it declares no content and takes no attributes — a confirmation is a one-shot question with an answer, not standing state to describe. The only contract is the imperative method below.

| Name           | Kind   | Meaning                                                                                                                                          |
| -------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ask(options)` | method | Opens the dialog and returns a `Promise<boolean>`: `true` once the reader confirms, `false` on Cancel or on dismissal (Escape counts as cancel). |

`options` is `{ title, body?, confirmLabel, cancelLabel, tone? }`; `tone: 'danger'` styles Confirm as undoing or discarding something, instead of the default affirmative accent.

A second `ask()` called before the first settles cancels the first (it resolves `false`) and opens with the new question instead.

## Where it is used today

The shell itself uses the same `ConfirmDialogController` internally, before an action that would silently throw away reader-local state: turning off [Check Mode](../index.md#check-mode) (clears every check mark) and resetting a diagram's layout (moves every dragged node back). Reaching for `dpk-confirm-dialog` for a page's own destructive actions keeps the same look and behavior as these built-in prompts.
