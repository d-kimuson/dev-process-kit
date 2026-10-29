import { LitElement, html, type CSSResultGroup, type PropertyDeclarations, type TemplateResult } from 'lit';

import { DialogController } from '../../core/dialog/controller';
import { renderDialogShell, type DialogSize } from '../../core/dialog/render';
import { dialogStyles } from '../../core/dialog/styles';
import { LocaleController } from '../../core/locale-controller';
import { controls, tokens } from '../../core/theme';
import { dialogMessages, type DialogMessages } from './messages';

export type { DialogCloseReason, DialogCloseDetail } from '../../core/dialog/controller';
export type { DialogSize } from '../../core/dialog/render';

/**
 * `<dpk-dialog>` — a modal panel for content of your own, backed by a native
 * `<dialog>` opened with `showModal()`, never `window.confirm` (which cannot be
 * styled and blocks the whole page) and never a bespoke overlay (which has to
 * re-implement the focus trap, the top layer and the inert background).
 *
 * - `open` opens and closes it, reflected as an attribute so markup can start
 *   it open; `show()` / `close()` do the same from a script.
 * - `label` is its accessible name; a `heading` slot (or the label itself)
 *   titles the panel.
 * - `size` is how wide it reads: `sm`, `md` (default) or `lg`.
 * - The default slot is the body, which scrolls inside the panel when it runs
 *   long; a `footer` slot draws a row under it, only while it has content.
 * - Escape, a press on the backdrop and the head's close button all close it.
 *   Focus moves into the dialog when it opens and back to whatever opened it
 *   (the element that had focus) when it closes.
 * - `dpk-dialog-close` is fired on every close, with `{ reason }`.
 *
 * Opening and closing is viewing state of the page, not a change of the draft.
 */
export class DpkDialog extends LitElement {
  static override styles: CSSResultGroup = [tokens, controls, dialogStyles];

  static override properties: PropertyDeclarations = {
    open: { type: Boolean, reflect: true },
    label: { type: String },
    size: { type: String, reflect: true },
  };

  /** Whether the dialog is open. Reflects as the `open` attribute. */
  declare open: boolean;
  /** Accessible name (`aria-label`), and the title when no `heading` is slotted. */
  declare label: string | null;
  /** How wide the panel reads: `sm`, `md` (default) or `lg`. */
  declare size: DialogSize | null;

  readonly #i18n = new LocaleController(this);
  readonly #dialog = new DialogController(this, {
    dialog: () => this.renderRoot.querySelector('dialog'),
    open: () => this.open,
    // Closing always goes through the engine (`DialogController.hostUpdated`),
    // which is what moves focus back and announces `dpk-dialog-close` once.
    dismiss: () => {
      this.open = false;
    },
  });
  /** Whether anything is assigned to the `footer` slot; the row is drawn only then. */
  #hasFooter = false;

  constructor() {
    super();
    this.open = false;
    this.label = null;
    this.size = 'md';
  }

  /** Opens the dialog, as setting `open` does. */
  show(): void {
    this.open = true;
  }

  /** Closes the dialog, as clearing `open` does. */
  close(): void {
    this.open = false;
  }

  protected override render(): TemplateResult {
    const m: DialogMessages = dialogMessages(this.#i18n.locale);
    const label = this.label ?? '';
    return renderDialogShell({
      label,
      closeLabel: m.close,
      controller: this.#dialog,
      size: this.normalizedSize,
      heading: html`<slot name="heading">${label}</slot>`,
      content: html`<slot></slot>`,
      footer: html`<slot name="footer" @slotchange=${this.#onFooterChange}></slot>`,
      footerHidden: !this.#hasFooter,
    });
  }

  /** `size` as markup may have written it; anything else reads as the default. */
  get normalizedSize(): DialogSize {
    return this.size === 'sm' || this.size === 'lg' ? this.size : 'md';
  }

  readonly #onFooterChange = (event: Event): void => {
    if (!(event.target instanceof HTMLSlotElement)) return;
    const has = event.target.assignedElements({ flatten: true }).length > 0;
    if (has === this.#hasFooter) return;
    this.#hasFooter = has;
    this.requestUpdate();
  };
}
