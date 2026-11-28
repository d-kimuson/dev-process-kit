/**
 * `<dpk-internal-layout-panel-launchers>`: the header's buttons for the side
 * panel's sections: those the components add, then the author's
 * (`<dpk-panel-section slot="panel">`, the supplements), one per section in
 * the panel's order, beside the settings gear. Internal: the element that
 * owns the page's chrome draws it and hands it the panel the header speaks
 * for.
 *
 * - A button opens the panel on its section, and closes the panel while it
 *   shows that section; `aria-pressed` follows.
 * - The buttons that do not fit the header go to one menu button after the
 *   others, which lists them.
 * - With no such section it draws nothing and takes no room.
 */
import { css, html, LitElement, nothing, type CSSResultGroup, type TemplateResult } from 'lit';

import type { Locale } from '../../i18n';
import type { PanelHost } from '../../panel/host';
import type { PanelTab } from '../../panel/model';

import { deepActiveElement } from '../../../lib/dom/focus';
import { closePopover, openPopover } from '../../../lib/dom/popover';
import { iconCheck, iconChevronDown } from '../../icons';
import { panelMessages } from '../../panel/messages';
import { tokens } from '../../theme';
import { fittingLaunchers } from './model';

const GAP = 4;
const MENU_SIZE = { width: 240, height: 360 } as const;

const launcherStyles = css`
  :host {
    display: flex;
    flex: 1 1 0%;
    justify-content: flex-end;
    min-width: 32px;
  }

  :host([data-empty]) {
    display: none;
  }

  .row {
    position: relative;
    display: flex;
    gap: ${GAP}px;
    align-items: center;
    min-width: 0;
  }

  .launcher {
    display: inline-flex;
    flex: none;
    align-items: center;
    gap: 6px;
    height: 32px;
    padding: 0 11px;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: 10px;
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink-soft);
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-sm);
    font: inherit;
    font-size: 12.5px;
    font-weight: 600;
    white-space: nowrap;
    cursor: pointer;
    transition:
      color 180ms var(--dpk-ease),
      background 180ms var(--dpk-ease),
      border-color 180ms var(--dpk-ease);
  }

  .launcher:hover {
    border-color: var(--dpk-rule-hover);
    color: var(--dpk-ink);
  }

  .launcher:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }

  .launcher[aria-pressed='true'],
  .launcher[data-holds-active] {
    border-color: color-mix(in srgb, var(--dpk-accent-strong) 70%, transparent);
    background: linear-gradient(145deg, var(--dpk-accent-bright), var(--dpk-accent-strong));
    color: var(--dpk-accent-ink);
  }

  .launcher[data-overflow] {
    position: absolute;
    visibility: hidden;
    pointer-events: none;
  }

  .more {
    width: 32px;
    padding: 0;
    justify-content: center;
  }

  .more svg {
    width: 16px;
    height: 16px;
  }

  .badge {
    min-width: 18px;
    padding: 0 5px;
    border-radius: 999px;
    background: color-mix(in srgb, currentColor 14%, transparent);
    font-size: 10.5px;
    font-weight: 700;
    line-height: 16px;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }

  .menu {
    box-sizing: border-box;
    margin: 0;
    padding: 4px;
    overflow: auto;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-md, 10px);
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink);
    box-shadow: var(--dpk-shadow-lg);
    font-family: var(--dpk-body);
  }

  .item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 7px 10px;
    border: 0;
    border-radius: var(--dpk-radius-sm, 6px);
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 13px;
    text-align: left;
    cursor: pointer;
  }

  .item:hover,
  .item:focus-visible {
    outline: none;
    background: var(--dpk-paper-inset);
  }

  .item .label {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .item .check {
    display: inline-flex;
    width: 14px;
    color: var(--dpk-accent);
  }

  .item .check svg {
    width: 14px;
    height: 14px;
  }
`;

export class DpkInternalLayoutPanelLaunchers extends LitElement {
  static override styles: CSSResultGroup = [tokens, launcherStyles];

  static override properties = {
    host: { attribute: false },
    locale: { attribute: false },
  };

  declare host: PanelHost | null;
  declare locale: Locale;

  #subscribed: PanelHost | null = null;
  #unsubscribe: (() => void) | null = null;
  /** How many leading buttons the row shows. */
  #fitting = Number.POSITIVE_INFINITY;
  #menuOpen = false;
  #stopMenu: (() => void) | null = null;
  readonly #resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => this.#fit());

  constructor() {
    super();
    this.host = null;
    this.locale = 'en';
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#resize?.observe(this);
    this.#subscribe();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#resize?.disconnect();
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    this.#subscribed = null;
    this.#stopMenu?.();
    this.#stopMenu = null;
  }

  protected override willUpdate(): void {
    this.#subscribe();
    this.toggleAttribute('data-empty', this.#tabs.length === 0);
  }

  #subscribe(): void {
    if (this.#subscribed === this.host && this.#unsubscribe !== null) return;
    this.#unsubscribe?.();
    this.#subscribed = this.host;
    this.#unsubscribe = this.host?.subscribe(() => this.requestUpdate()) ?? null;
  }

  get #tabs(): readonly PanelTab[] {
    return this.host?.tabs.filter((tab) => tab.kind === 'component' || tab.kind === 'author') ?? [];
  }

  #shows(name: string): boolean {
    return this.host?.isOpen === true && this.host.section === name;
  }

  /** The section's button: opens the panel on it, or closes the panel while it shows it. */
  #toggle(name: string): void {
    const host = this.host;
    if (host === null) return;
    if (this.#shows(name)) host.close();
    else host.open(name, { focus: true });
  }

  protected override render(): TemplateResult | typeof nothing {
    const tabs = this.#tabs;
    if (tabs.length === 0) return nothing;
    const m = panelMessages(this.locale);
    const shown = Math.min(this.#fitting, tabs.length);
    const rest = tabs.slice(shown);
    const restActive = rest.some((tab) => this.#shows(tab.name));
    return html`<div class="row" role="group" aria-label=${m.sections}>
      ${tabs.map((tab, index) => this.#renderLauncher(tab, index >= shown, m))}
      <button
        class="launcher more"
        type="button"
        data-role="more-sections"
        aria-haspopup="menu"
        aria-expanded=${this.#menuOpen ? 'true' : 'false'}
        aria-label=${m.moreSections}
        title=${m.moreSections}
        ?data-overflow=${rest.length === 0}
        ?data-holds-active=${restActive}
        tabindex=${rest.length === 0 ? '-1' : nothing}
        @click=${() => this.#toggleMenu()}
      >
        ${iconChevronDown()}
      </button>
      <div
        class="menu"
        role="menu"
        aria-label=${m.moreSections}
        popover="auto"
        @toggle=${(event: ToggleEvent) => this.#onMenuToggle(event)}
        @keydown=${(event: KeyboardEvent) => this.#onMenuKey(event)}
      >
        ${rest.map(
          (tab) => html`<button
            class="item"
            type="button"
            role="menuitemcheckbox"
            data-section=${tab.name}
            aria-checked=${this.#shows(tab.name) ? 'true' : 'false'}
            @click=${() => this.#pick(tab.name)}
          >
            <span class="check" aria-hidden="true">${this.#shows(tab.name) ? iconCheck() : nothing}</span>
            <span class="label">${tab.label}</span>
            ${tab.badge === null ? nothing : html`<span class="badge" aria-hidden="true">${tab.badge}</span>`}
          </button>`,
        )}
      </div>
    </div>`;
  }

  #renderLauncher(tab: PanelTab, overflow: boolean, m: ReturnType<typeof panelMessages>): TemplateResult {
    return html`<button
      class="launcher"
      type="button"
      data-section=${tab.name}
      aria-pressed=${this.#shows(tab.name) ? 'true' : 'false'}
      aria-label=${tab.badge === null ? nothing : m.tabWithBadge(tab.label, tab.badge)}
      ?data-overflow=${overflow}
      aria-hidden=${overflow ? 'true' : nothing}
      tabindex=${overflow ? '-1' : nothing}
      @click=${() => this.#toggle(tab.name)}
    >
      ${tab.label} ${tab.badge === null ? nothing : html`<span class="badge" aria-hidden="true">${tab.badge}</span>`}
    </button>`;
  }

  protected override updated(): void {
    this.#fit();
  }

  /** Counts the buttons the row has room for, from each button's own width (an overflowing one is measured hidden). */
  #fit(): void {
    const buttons = Array.from(this.renderRoot.querySelectorAll<HTMLElement>('.launcher[data-section]'));
    const menu = this.renderRoot.querySelector<HTMLElement>('.more');
    if (buttons.length === 0 || menu === null) return;
    const widths = buttons.map((button) => button.offsetWidth);
    const full = widths.reduce((sum, width) => sum + width, 0) + GAP * (widths.length - 1);
    // The row grows to what the header leaves it, but never past every button.
    this.style.maxWidth = `${full}px`;
    const available = this.getBoundingClientRect().width;
    if (available === 0) return;
    const fitting = fittingLaunchers({ widths, gap: GAP, available, menu: menu.offsetWidth });
    if (fitting === Math.min(this.#fitting, buttons.length)) return;
    this.#fitting = fitting;
    if (fitting === buttons.length) this.#closeMenu();
    this.requestUpdate();
  }

  #menu(): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>('.menu');
  }

  #toggleMenu(): void {
    if (this.#menuOpen) {
      this.#closeMenu();
      return;
    }
    const menu = this.#menu();
    const trigger = this.renderRoot.querySelector<HTMLElement>('.more');
    if (menu === null || trigger === null) return;
    this.#stopMenu?.();
    this.#stopMenu = openPopover(menu, trigger, MENU_SIZE, { placement: 'bottom-end' });
    this.#menuOpen = true;
    this.requestUpdate();
    void this.updateComplete.then(() => menu.querySelector<HTMLElement>('.item')?.focus());
  }

  #closeMenu(): void {
    closePopover(this.#menu());
  }

  /** The menu closed, by a pick, Escape or a press outside: the focus it held goes back to its button. */
  #onMenuToggle(event: ToggleEvent): void {
    if (event.newState === 'open') return;
    this.#stopMenu?.();
    this.#stopMenu = null;
    this.#menuOpen = false;
    this.requestUpdate();
    const active = deepActiveElement();
    if (active === null || active === document.body || this.#menu()?.contains(active) === true)
      this.renderRoot.querySelector<HTMLElement>('.more')?.focus();
  }

  #onMenuKey(event: KeyboardEvent): void {
    const items = Array.from(this.#menu()?.querySelectorAll<HTMLElement>('.item') ?? []);
    const index = items.indexOf(deepActiveElement() ?? document.body);
    const step = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
    if (step === 0 || items.length === 0) return;
    event.preventDefault();
    items[(index + step + items.length) % items.length]?.focus();
  }

  /** A section picked from the menu: the menu gives the focus back to its button first, so the panel returns it there. */
  #pick(name: string): void {
    this.renderRoot.querySelector<HTMLElement>('.more')?.focus();
    this.#closeMenu();
    this.#toggle(name);
  }
}

export const defineLayoutPanelLaunchers = (): void => {
  if (!customElements.get('dpk-internal-layout-panel-launchers'))
    customElements.define('dpk-internal-layout-panel-launchers', DpkInternalLayoutPanelLaunchers);
};
