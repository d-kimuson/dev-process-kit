/**
 * The `<dialog>` both surfaces draw: a title row with a close button, an
 * optional secondary nav, a scrolling body and an optional foot. The public
 * `dpk-dialog` element fills the three regions with its slots; the shell fills
 * them with what it renders (the settings sections).
 *
 * Kept apart from `./controller.ts` so the behavior (showModal, focus,
 * dismissal) is testable without any particular content.
 */
import { html, nothing, type TemplateResult } from 'lit';

import type { DialogController } from './controller';

import { iconClose } from '../icons';

/** How wide the panel reads: a confirmation-ish `sm`, the default `md`, a form `lg`. */
export type DialogSize = 'sm' | 'md' | 'lg';

export type DialogShellOptions = {
  /** Accessible name of the dialog (`aria-label`). */
  readonly label: string;
  /** Accessible name of the close button, in the page's language. */
  readonly closeLabel: string;
  readonly controller: DialogController;
  /** An id for the `<dialog>` itself, so a trigger can point `aria-controls` at it. */
  readonly id?: string | undefined;
  readonly size?: DialogSize | undefined;
  /**
   * Whether the panel keeps one height whatever it holds, its body scrolling
   * inside it. The settings dialog does, so switching a section never resizes
   * or moves the frame; a confirmation's panel is as tall as its content.
   */
  readonly fixedHeight?: boolean | undefined;
  /** What the title row shows; the `label` as plain text when absent. */
  readonly heading?: unknown;
  /** A row of section buttons between the title and the body; drawn as given. */
  readonly nav?: unknown;
  readonly content: unknown;
  /** Drawn as a foot row; without it the panel has none. */
  readonly footer?: unknown;
  readonly footerHidden?: boolean | undefined;
};

export const renderDialogShell = (options: DialogShellOptions): TemplateResult => html`
  <dialog
    id=${options.id ?? nothing}
    class="dpk-dialog"
    part="dialog"
    role="dialog"
    aria-modal="true"
    aria-label=${options.label}
    data-size=${options.size ?? 'md'}
    data-height=${options.fixedHeight === true ? 'fixed' : nothing}
    @cancel=${options.controller.handlers.cancel}
    @close=${options.controller.handlers.close}
    @click=${options.controller.handlers.click}
  >
    <header class="dpk-dialog-head" part="header">
      <h2 class="dpk-dialog-title" part="title">${options.heading ?? options.label}</h2>
      <button
        class="dpk-dialog-close"
        part="close"
        type="button"
        aria-label=${options.closeLabel}
        title=${options.closeLabel}
        @click=${() => options.controller.dismiss('close')}
      >
        ${iconClose()}
      </button>
    </header>
    ${options.nav === undefined ? nothing : options.nav}
    <div class="dpk-dialog-body" part="body">${options.content}</div>
    ${
      options.footer === undefined
        ? nothing
        : html`<footer class="dpk-dialog-footer" part="footer" ?hidden=${options.footerHidden ?? false}>
            ${options.footer}
          </footer>`
    }
  </dialog>
`;
