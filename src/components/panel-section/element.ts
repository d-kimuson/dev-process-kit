import { css, html, LitElement, type CSSResultGroup, type PropertyValues, type TemplateResult } from 'lit';

import { PANEL_ACTIVE_ATTRIBUTE } from '../../core/panel/owner';

/**
 * `<dpk-panel-section>` — one section of the side panel, written by the author.
 *
 * Put it in the `panel` slot of `<dpk-page>` (or of a standalone view or
 * board): the panel lists it as a segment titled `label`, after the selected
 * element's detail. `name` keeps the reader's choice across reloads (it
 * defaults to the section's position), `badge` shows a short count beside the
 * label, and `hidden` leaves it out of the panel. `active` reads whether the
 * panel shows it now.
 */
export class DpkPanelSection extends LitElement {
  static override styles: CSSResultGroup = css`
    :host {
      display: block;
    }

    :host(:not([data-dpk-panel-active])),
    :host([hidden]) {
      display: none;
    }
  `;

  static override properties = {
    label: { type: String, reflect: true },
    name: { type: String, reflect: true },
    badge: { type: String, reflect: true },
  };

  declare label: string | null;
  declare name: string | null;
  declare badge: string | null;

  constructor() {
    super();
    this.label = null;
    this.name = null;
    this.badge = null;
  }

  /** Whether the panel shows this section now. */
  get active(): boolean {
    return this.hasAttribute(PANEL_ACTIVE_ATTRIBUTE);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.hasAttribute('role')) this.setAttribute('role', 'tabpanel');
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('label')) {
      if (this.label === null) this.removeAttribute('aria-label');
      else this.setAttribute('aria-label', this.label);
    }
  }

  protected override render(): TemplateResult {
    return html`<slot></slot>`;
  }
}
