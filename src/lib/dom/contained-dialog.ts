/**
 * A `<dialog>` opened with `showModal()` enters the top layer: it covers the
 * whole page rather than the area it belongs to, and makes everything else in
 * the document inert. Inside a mock that is the page around the mock too, so
 * a host that shows markup it does not own opens such a dialog inside that
 * markup instead: shown non-modally and marked with `CONTAINED_DIALOG`, which
 * the host's document styles lay over its container like a modal.
 */

export const CONTAINED_DIALOG = 'data-dpk-modal';

const isModal = (dialog: HTMLDialogElement): boolean => {
  try {
    return dialog.matches(':modal');
  } catch {
    // An engine without `:modal`: nothing tells a modal dialog apart.
    return false;
  }
};

const showContained = (dialog: HTMLDialogElement): void => {
  dialog.setAttribute(CONTAINED_DIALOG, '');
  if (!dialog.open) dialog.show();
};

/** Makes this dialog's own `showModal()` open it contained. */
export const containDialog = (dialog: HTMLDialogElement): void => {
  if (Object.hasOwn(dialog, 'showModal')) return;
  Object.defineProperty(dialog, 'showModal', {
    configurable: true,
    value: () => showContained(dialog),
  });
};

/**
 * Turns an already modal dialog into a contained one. Its `close` event is
 * swallowed on `host`, an ancestor, so the mock does not react to a close the
 * reader never asked for.
 */
export const releaseModalDialog = (host: HTMLElement, dialog: HTMLDialogElement): void => {
  if (!isModal(dialog)) return;
  const swallow = (event: Event): void => {
    if (event.target !== dialog) return;
    event.stopImmediatePropagation();
    host.removeEventListener('close', swallow, true);
  };
  host.addEventListener('close', swallow, true);
  dialog.close();
  showContained(dialog);
};
