/**
 * The `<dialog>` lifecycle, on an engine that has the modal dialog API and on
 * one that only has the element.
 *
 * A real browser supplies `showModal()` and `close()`: the top layer, the focus
 * trap and the inert backdrop come from the engine. jsdom ships
 * `HTMLDialogElement`, its reflected `open` property and its `close` event, but
 * none of the methods, so calling `showModal()` there throws. Rather than a
 * test-only stub (which would let a test pass on code the browser could not
 * run), both call sites go through here: the native method is preferred, and
 * where it is missing, opening sets `open` and closing clears it and fires the
 * same `close` event the engine would. `DialogController` therefore keeps one
 * code path and its owner sees one contract — the `open` state, the `close`
 * event with its reason, and the focus restore — on either platform.
 */
const hasModalApi = (dialog: HTMLDialogElement): boolean =>
  // Asked of the element, not of a value captured when this module loaded: an
  // environment may patch the prototype in later, and that still counts.
  typeof dialog.showModal === 'function';

/**
 * Whether the dialog is showing. `open` reflects the attribute wherever the
 * engine has it; the attribute itself is the answer anywhere it does not.
 */
export const isDialogOpen = (dialog: HTMLDialogElement): boolean => {
  const shown: unknown = (dialog as { open?: unknown }).open;
  return typeof shown === 'boolean' ? shown : dialog.hasAttribute('open');
};

/** Opens the dialog as a modal, falling back to the `open` attribute without the modal API. */
export const openModal = (dialog: HTMLDialogElement): void => {
  if (hasModalApi(dialog)) {
    dialog.showModal();
    return;
  }
  dialog.setAttribute('open', '');
};

/** Closes the dialog, falling back to the `open` attribute plus the engine's `close` event. */
export const closeModal = (dialog: HTMLDialogElement): void => {
  if (typeof dialog.close === 'function') {
    // The engine only fires `close` when it was open, so neither does the fallback.
    dialog.close();
    return;
  }
  if (!isDialogOpen(dialog)) return;
  dialog.removeAttribute('open');
  dialog.dispatchEvent(new Event('close'));
};
