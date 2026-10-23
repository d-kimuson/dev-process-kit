/**
 * A yes/no prompt that blocks input until answered, as a `ReactiveController`
 * any Lit host can own. It wraps a native `<dialog>` shown with
 * `showModal()` — never `window.confirm`, which cannot be styled and blocks
 * the whole thread rather than just this one host.
 *
 * Shared by the public `dpk-confirm-dialog` element (`src/components/confirm-dialog`)
 * and the shell's own prompts (turning Check Mode off, which resets every
 * mark), which sit in `core` and so cannot depend on `components` — the
 * reason this logic lives here instead of inside the element, mirroring
 * `SelectController` (`src/core/select/controller.ts`).
 */
import { html, nothing, type LitElement, type ReactiveController, type ReactiveControllerHost } from 'lit';

export type ConfirmDialogOptions = {
  readonly title: string;
  readonly body?: string | undefined;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  /** Styles Confirm as undoing or discarding something, instead of the default affirmative accent. */
  readonly tone?: 'default' | 'danger' | undefined;
};

let instances = 0;

export class ConfirmDialogController implements ReactiveController {
  readonly #host: ReactiveControllerHost & LitElement;
  readonly #id = `dpk-confirm-dialog-${++instances}`;
  #options: ConfirmDialogOptions | null = null;
  #resolve: ((confirmed: boolean) => void) | null = null;
  #pendingOpen = false;

  constructor(host: ReactiveControllerHost & LitElement) {
    this.#host = host;
    host.addController(this);
  }

  hostConnected(): void {}

  hostUpdated(): void {
    if (!this.#pendingOpen) return;
    const dialog = this.#dialog();
    if (dialog && !dialog.open) {
      dialog.showModal();
      this.#pendingOpen = false;
    }
  }

  hostDisconnected(): void {
    this.#settle(false);
  }

  /** Opens the dialog and resolves once the reader confirms, cancels, or dismisses it (Escape counts as cancel). */
  ask(options: ConfirmDialogOptions): Promise<boolean> {
    this.#settle(false);
    this.#options = options;
    this.#pendingOpen = true;
    this.#host.requestUpdate();
    return new Promise<boolean>((resolve) => {
      this.#resolve = resolve;
    });
  }

  render(): unknown {
    if (this.#options === null) return nothing;
    const { title, body, confirmLabel, cancelLabel, tone } = this.#options;
    return html`
      <dialog class="dpk-confirm-dialog" data-dpk-confirm-dialog=${this.#id} @close=${this.#onClose}>
        <form method="dialog" class="dpk-confirm-dialog-body">
          <h2 class="dpk-confirm-dialog-title">${title}</h2>
          ${body ? html`<p class="dpk-confirm-dialog-text">${body}</p>` : nothing}
          <div class="dpk-confirm-dialog-actions">
            <button type="submit" class="dpk-btn dpk-btn--ghost" value="cancel">${cancelLabel}</button>
            <button
              type="submit"
              class="dpk-btn ${tone === 'danger' ? 'dpk-btn--danger' : 'dpk-btn--accent'}"
              value="confirm"
            >
              ${confirmLabel}
            </button>
          </div>
        </form>
      </dialog>
    `;
  }

  #dialog(): HTMLDialogElement | null {
    return (
      this.#host.renderRoot.querySelector<HTMLDialogElement>(`dialog[data-dpk-confirm-dialog="${this.#id}"]`) ?? null
    );
  }

  #onClose = (): void => {
    const dialog = this.#dialog();
    this.#settle(dialog?.returnValue === 'confirm');
  };

  #settle(confirmed: boolean): void {
    const resolve = this.#resolve;
    this.#resolve = null;
    this.#options = null;
    this.#pendingOpen = false;
    this.#host.requestUpdate();
    resolve?.(confirmed);
  }
}
