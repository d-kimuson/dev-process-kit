import { LitElement, css, html, nothing, type CSSResultGroup, type PropertyValues } from 'lit';

import { controls, tokens } from '../../core/theme';
import { claimSelectionBar, releaseSelectionBar, type SelectionBarClaim } from './coordinator';

/**
 * `<dpk-selection-bar>` — the floating toolbar a multi-selection shows: how
 * many are selected and what can be done with them. A thin, content-free
 * shell around whatever the host already renders for that (a count, buttons,
 * a select, its own close button); core owns only the chrome — lifting it
 * into the top layer so no board canvas can clip it, keeping it clear of the
 * header, the review popover and the hand-off dock, and Escape.
 *
 * Any host can use it — a template's board, a diagram component, anything
 * with a selection of its own. Render it (conditionally, same as any other
 * piece of markup) while the selection is non-empty, with the count or
 * status text as `label` (used as the toolbar's accessible name) and the
 * actions as its default slot. Mounting claims the bar; only the most
 * recently mounted one is shown — an older one already on screen (another
 * board, say) is hidden, not cleared: its own selection is untouched, only
 * its bar steps aside. Unmounting (the host's own `nothing` branch) releases
 * the claim and removes it.
 *
 * `Escape` while focus is inside the bar fires `dpk-selection-clear`
 * (bubbles, composed) — the host decides what that means (usually clearing
 * its selection, which then unmounts the bar). A close button, if the host
 * wants one, is just another slotted button calling back into the host
 * directly; core does not render one, so there is only ever the one the host
 * already has.
 */
export class DpkSelectionBar extends LitElement {
  static override styles: CSSResultGroup = [
    tokens,
    controls,
    css`
      :host {
        display: contents;
      }

      /*
       * The one placement core imposes: bottom-center, clear of the hand-off
       * dock. A host that needs a different spot claims the bar from
       * somewhere else on screen instead — the contract is "claim it", not
       * "place it".
       */
      .dpk-floatbar {
        left: 50%;
        bottom: calc(14px + var(--dpk-dock-clearance, 0px));
        transform: translateX(-50%);
        z-index: 45;
      }
    `,
  ];

  static override properties = { label: { type: String, reflect: true } };

  /** The toolbar's accessible name — the same count/status text the host shows visually. */
  declare label: string | null;

  readonly #claim: SelectionBarClaim = { hide: () => this.#setOpen(false) };
  #open = false;

  constructor() {
    super();
    this.label = null;
  }

  /** Shown vs. pre-empted by a more recently claimed bar; read-only (connecting/disconnecting drive it). */
  get open(): boolean {
    return this.#open;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#setOpen(true);
    claimSelectionBar(this.#claim);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    releaseSelectionBar(this.#claim);
  }

  protected override render(): unknown {
    return html`
      <div
        class="dpk-floatbar"
        popover="manual"
        role="toolbar"
        aria-label=${this.label ?? nothing}
        @keydown=${this.#onKeydown}
      >
        <slot></slot>
      </div>
    `;
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.#syncPopover();
  }

  #setOpen(open: boolean): void {
    if (open === this.#open) return;
    this.#open = open;
    this.requestUpdate();
  }

  #syncPopover(): void {
    const surface = this.renderRoot.querySelector<HTMLElement>('.dpk-floatbar');
    if (!surface || typeof surface.showPopover !== 'function') return;
    const shown = surface.matches(':popover-open');
    if (this.#open && !shown) {
      try {
        surface.showPopover();
      } catch {
        /* not connected to a document yet */
      }
    } else if (!this.#open && shown) {
      try {
        surface.hidePopover();
      } catch {
        /* already hidden */
      }
    }
  }

  readonly #onKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    this.dispatchEvent(new CustomEvent('dpk-selection-clear', { bubbles: true, composed: true }));
  };
}
