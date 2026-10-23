import { LitElement, css, html, type CSSResultGroup, type TemplateResult } from 'lit';

import { tokens } from '../../theme';

/**
 * `<dpk-internal-layout-app>` — the screen as a header bar, a body and a footer bar.
 *
 * Internal to the shell (see `../index.ts`).
 *
 * - The `header` and `footer` slots are the bars; the default slot is the
 *   body between them, which gets the remaining height (a
 *   `<dpk-internal-layout-sidebar>`, typically).
 * - The `overlay` slot holds what floats over the whole screen (fixed
 *   toolbars, popovers, toasts) without taking a row.
 * - It is as tall as the element's container allows, or, when the container
 *   gives it no height, the viewport (less the safe-area insets). The bars
 *   stay in place and the body scrolls inside, never the page.
 *
 * Parts: `header`, `body`, `footer`. Custom property: `--dpk-app-height`
 * (default: the viewport).
 */
export class DpkInternalLayoutApp extends LitElement {
  static override styles: CSSResultGroup = [
    tokens,
    css`
      :host {
        display: grid;
        /* One column no wider than the host: a truncated title must not widen
           the page past a phone screen. */
        grid-template-columns: minmax(0, 1fr);
        grid-template-rows: auto minmax(0, 1fr) auto;
        min-height: 100%;
        max-height: 100%;
        /*
         * The fallback when the page gives the element no height: the viewport,
         * less the safe-area insets a Claude Artifact pads its root by. Without
         * it the layout grows with its content and the bars scroll away. A
         * container with a height still wins: the min/max-height above pin it.
         */
        height: var(--dpk-app-height, calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)));
        color: var(--dpk-ink);
      }

      :host([hidden]) {
        display: none;
      }

      .header,
      .footer {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        min-width: 0;
      }

      .body {
        display: flex;
        flex-direction: column;
        min-width: 0;
        min-height: 0;
      }

      .body ::slotted(*) {
        flex: 1 1 0%;
        min-width: 0;
        min-height: 0;
      }
    `,
  ];

  protected override render(): TemplateResult {
    return html`
      <div part="header" class="header"><slot name="header"></slot></div>
      <div part="body" class="body"><slot></slot></div>
      <div part="footer" class="footer"><slot name="footer"></slot></div>
      <slot name="overlay"></slot>
    `;
  }
}
