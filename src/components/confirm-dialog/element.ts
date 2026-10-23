import { LitElement, type CSSResultGroup } from 'lit';

import { ConfirmDialogController, type ConfirmDialogOptions } from '../../core/confirm-dialog/controller';
import { controls, tokens } from '../../core/theme';

export type { ConfirmDialogOptions } from '../../core/confirm-dialog/controller';

/**
 * `<dpk-confirm-dialog>` — a yes/no prompt that blocks input until answered,
 * backed by a native `<dialog>` (`showModal()`), never `window.confirm`
 * (which cannot be styled and blocks the whole page rather than just this
 * one prompt).
 *
 * Unlike most elements here, it declares no content and takes no attributes:
 * a confirmation is a one-shot question with an answer, not standing state
 * to describe, so the only contract is the imperative `ask(options)` method
 * — `{ title, body?, confirmLabel, cancelLabel, tone? }` — which resolves
 * `true` once the reader confirms, or `false` on Cancel or on dismissal
 * (Escape counts as cancel). Place one empty `<dpk-confirm-dialog>` anywhere
 * and call `ask()` on it from a script; it renders nothing until asked, and
 * a second `ask()` before the first settles cancels the first.
 */
export class DpkConfirmDialog extends LitElement {
  static override styles: CSSResultGroup = [tokens, controls];

  readonly #dialog = new ConfirmDialogController(this);

  ask(options: ConfirmDialogOptions): Promise<boolean> {
    return this.#dialog.ask(options);
  }

  protected override render(): unknown {
    return this.#dialog.render();
  }
}
