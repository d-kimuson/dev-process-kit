/**
 * One native `<dialog>` kept in step with its owner's own `open` flag.
 *
 * It is shown with `showModal()` — never `window.confirm`, which cannot be
 * styled and blocks the whole thread, and never a bespoke overlay, which has
 * to re-implement the focus trap, the top layer and the inert background. The
 * engine supplies the modal behavior; this only wires the two directions
 * (Escape and a press on the backdrop close it), moves focus into the dialog
 * when it opens and back to whatever opened it when it closes, and announces
 * the dismissal as `dpk-dialog-close`. Where the engine lacks the modal API
 * (`./native-dialog.ts`), opening and closing go through the attribute instead
 * and the same contract holds.
 *
 * Shared by the public `dpk-dialog` element (`src/components/dialog`) and the
 * shell's settings surface, which sits in `core` and so cannot depend on
 * `components` — the same reason `ConfirmDialogController` and
 * `SelectController` live here.
 */
import type { LitElement, ReactiveController, ReactiveControllerHost } from 'lit';

import { deepActiveElement, firstFocusable } from '../../lib/dom/focus';
import { closeModal, isDialogOpen, openModal } from './native-dialog';

/** Fired on the `<dialog>` itself, bubbling and composed, whenever it closes. */
export const DIALOG_CLOSE_EVENT = 'dpk-dialog-close';

/** How the dialog came to close: the engine's Escape, a press on the backdrop, or an explicit close. */
export type DialogCloseReason = 'escape' | 'backdrop' | 'close';

export type DialogCloseDetail = { readonly reason: DialogCloseReason };

export type DialogControllerOptions = {
  /** The rendered `<dialog>`, looked up after every update of the host. */
  readonly dialog: () => HTMLDialogElement | null;
  /** Whether the dialog should be open: the owner's own state, never the engine's. */
  readonly open: () => boolean;
  /** Writes the owner's flag when the reader dismisses the dialog. */
  readonly dismiss: (reason: DialogCloseReason) => void;
};

export class DialogController implements ReactiveController {
  readonly #host: ReactiveControllerHost & LitElement;
  readonly #options: DialogControllerOptions;
  /** What had focus when the dialog opened; it gets focus back when the dialog closes. */
  #opener: HTMLElement | null = null;
  /** Why the open dialog is closing, so `dpk-dialog-close` can say. */
  #reason: DialogCloseReason = 'close';

  constructor(host: ReactiveControllerHost & LitElement, options: DialogControllerOptions) {
    this.#host = host;
    this.#options = options;
    host.addController(this);
  }

  /** Bound in the `<dialog>`'s template, so they see the engine's own events. */
  readonly handlers = {
    /** Escape: the owner closes it, so the flag and the engine never disagree. */
    cancel: (event: Event): void => {
      event.preventDefault();
      this.dismiss('escape');
    },
    /** The engine closed it (or the owner's flag did): focus goes back, the dismissal is announced. */
    close: (): void => this.#afterClose(),
    /** A press on the backdrop targets the dialog itself; anything inside it is a descendant. */
    click: (event: MouseEvent): void => {
      if (event.target === this.#options.dialog()) this.dismiss('backdrop');
    },
  };

  hostConnected(): void {
    // The dialog is modal where the engine can do it, so a press outside it is
    // already the dialog's own; this only adds the case it cannot cover.
    document.addEventListener('pointerdown', this.#onPointerDown, true);
  }

  hostUpdated(): void {
    const dialog = this.#options.dialog();
    if (dialog === null) return;
    if (this.#options.open()) {
      if (!isDialogOpen(dialog)) this.#show(dialog);
      return;
    }
    if (isDialogOpen(dialog)) closeModal(dialog);
  }

  hostDisconnected(): void {
    document.removeEventListener('pointerdown', this.#onPointerDown, true);
    const dialog = this.#options.dialog();
    if (dialog !== null && isDialogOpen(dialog)) closeModal(dialog);
    this.#opener = null;
  }

  /**
   * A press that never reached the dialog is a press outside it. With the modal
   * API the backdrop press targets the dialog itself, so `handlers.click` above
   * is what sees it; without one there is no top layer, the page behind the
   * dialog stays hittable, and only this listener sees the press.
   */
  #onPointerDown = (event: MouseEvent): void => {
    if (event.button !== 0 || !this.#options.open()) return;
    const dialog = this.#options.dialog();
    if (dialog === null || event.composedPath().includes(dialog)) return;
    this.dismiss('backdrop');
  };

  /** Closes the dialog the way the reader's own dismissal would, telling the owner why. */
  dismiss(reason: DialogCloseReason = 'close'): void {
    this.#reason = reason;
    this.#options.dismiss(reason);
  }

  #show(dialog: HTMLDialogElement): void {
    this.#reason = 'close';
    this.#opener = deepActiveElement();
    openModal(dialog);
    const target = firstFocusable(dialog) ?? dialog;
    // A dialog with nothing focusable inside still takes the focus, so the
    // engine's own Tab cycle starts from it rather than from behind it.
    if (target === dialog && !dialog.hasAttribute('tabindex')) dialog.tabIndex = -1;
    target.focus();
  }

  #afterClose(): void {
    const reason = this.#reason;
    const opener = this.#opener;
    this.#opener = null;
    // Closed by the owner's flag: it already knows. Closed by the engine: tell it.
    if (this.#options.open()) this.#options.dismiss(reason);
    if (opener?.isConnected) opener.focus();
    // Fired on the host, not on the inner `<dialog>`: a host is what an ancestor
    // can listen to across the shadow boundary.
    this.#host.dispatchEvent(
      new CustomEvent<DialogCloseDetail>(DIALOG_CLOSE_EVENT, { detail: { reason }, bubbles: true, composed: true }),
    );
  }
}
