import { LitElement, css, html, nothing, type CSSResultGroup, type PropertyValues, type TemplateResult } from 'lit';

import type { SelectionBarAction, SelectionBarActionDetail, SelectionBarOption } from './types';

import { iconCheck, iconChevronDown, iconClose, iconMinus } from '../../core/icons';
import { LocaleController } from '../../core/locale-controller';
import { controls, tokens } from '../../core/theme';
import { claimSelectionBar, releaseSelectionBar, type SelectionBarClaim } from './coordinator';
import { selectionBarMessages } from './messages';

/** Gap kept between the menu and the edge of the screen. */
const SCREEN_MARGIN = 8;

/**
 * `<dpk-selection-bar>` — the floating bar a multi-selection shows: how many
 * are selected, what can be done with all of them, and a button that clears
 * the selection. The host renders it while its selection has items and gives
 * it the count and the actions; the bar draws them, opens an action's menu of
 * choices, and reports what was pressed (`dpk-selection-action`) or that the
 * selection should be cleared (`dpk-selection-clear`, from its close button or
 * Escape).
 *
 * The bar sits in the top layer at the bottom center of the main column, so
 * no board canvas clips it, and keeps clear of the side panel and the hand-off
 * dock. Only the most recently mounted bar on the page shows; an older one is
 * hidden, not cleared.
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
       * Bottom center of what the side panel leaves of the screen: the panel
       * frame publishes how much of the right or the bottom it takes, and
       * whether it covers the main column.
       */
      .dpk-floatbar {
        left: calc((100vw - var(--dpk-panel-inset-right, 0px)) / 2);
        bottom: calc(14px + max(var(--dpk-dock-clearance, 0px), var(--dpk-panel-inset-bottom, 0px)));
        z-index: 45;
        flex-wrap: wrap;
        justify-content: center;
        box-sizing: border-box;
        width: max-content;
        max-width: calc(100vw - var(--dpk-panel-inset-right, 0px) - 24px);
        padding: 6px 6px 6px 14px;
        overflow: visible;
        transform: translateX(-50%);
        visibility: var(--dpk-panel-cover-visibility, visible);
      }

      .count {
        color: var(--dpk-ink);
        font-size: var(--dpk-text-sm);
        font-weight: 650;
        white-space: nowrap;
        font-variant-numeric: tabular-nums;
      }

      .rule {
        align-self: stretch;
        width: 1px;
        margin: 2px 2px;
        background: var(--dpk-rule);
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: center;
        gap: 4px;
      }

      @media (max-width: 640px) {
        .dpk-floatbar {
          justify-content: space-between;
          row-gap: 6px;
        }

        .rule {
          display: none;
        }

        .actions {
          order: 1;
          flex-basis: 100%;
          justify-content: flex-start;
        }
      }

      .action {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }

      .action svg {
        width: 12px;
        height: 12px;
        color: var(--dpk-ink-faint);
      }

      .dpk-btn--accent svg {
        color: inherit;
      }

      .menu {
        position: absolute;
        bottom: calc(100% + 6px);
        left: 0;
        box-sizing: border-box;
        display: grid;
        gap: 1px;
        min-width: 200px;
        max-width: min(320px, calc(100vw - ${SCREEN_MARGIN * 2}px));
        padding: 4px;
        overflow-y: auto;
        border: 1px solid var(--dpk-rule-strong);
        border-radius: var(--dpk-radius-lg);
        background: var(--dpk-paper-raised);
        box-shadow: var(--dpk-bevel), var(--dpk-shadow-lg);
        color: var(--dpk-ink);
        animation: dpk-scale-in var(--dpk-dur-fast) var(--dpk-ease-out);
      }

      .item {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        padding: 6px 8px;
        border: 0;
        border-radius: var(--dpk-radius-sm);
        background: none;
        color: var(--dpk-ink);
        font: inherit;
        font-size: 12.5px;
        text-align: left;
        cursor: pointer;
      }

      .item:hover,
      .item:focus-visible {
        outline: none;
        background: var(--dpk-paper-sunken);
      }

      .item[disabled] {
        color: var(--dpk-ink-faint);
        cursor: default;
        background: none;
      }

      .item-label {
        flex: 1 1 auto;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .item-hint {
        flex: none;
        color: var(--dpk-ink-faint);
        font-family: var(--dpk-mono);
        font-size: 11px;
      }

      .check {
        flex: none;
        display: inline-grid;
        place-items: center;
        width: 14px;
        height: 14px;
        border: 1px solid var(--dpk-rule-strong);
        border-radius: 4px;
        background: var(--dpk-paper-raised);
      }

      .item[aria-checked='true'] .check,
      .item[aria-checked='mixed'] .check {
        border-color: var(--dpk-accent-strong);
        background: var(--dpk-accent-strong);
        color: var(--dpk-accent-ink);
      }

      .check svg {
        width: 10px;
        height: 10px;
        stroke-width: 3;
      }

      .entry {
        box-sizing: border-box;
        width: 100%;
        margin-top: 3px;
        font-size: 12px;
      }

      .close svg {
        width: 14px;
        height: 14px;
      }
    `,
  ];

  static override properties = {
    count: { type: Number, reflect: true },
    label: { type: String, reflect: true },
    actions: { attribute: false },
    menu: { state: true },
  };

  /** How many are selected; the bar shows it as the locale's "N selected". */
  declare count: number | null;
  /** Shown instead of the count text, and the bar's accessible name either way. */
  declare label: string | null;
  declare actions: readonly SelectionBarAction[];
  /** The action whose menu is open. */
  declare menu: string | null;

  readonly #i18n = new LocaleController(this);
  readonly #claim: SelectionBarClaim = { hide: () => this.#setOpen(false) };
  #open = false;

  constructor() {
    super();
    this.count = null;
    this.label = null;
    this.actions = [];
    this.menu = null;
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
    document.removeEventListener('pointerdown', this.#onOutside, true);
  }

  protected override willUpdate(): void {
    if (this.menu !== null && this.#menuAction() === undefined) this.menu = null;
  }

  protected override render(): TemplateResult {
    const m = selectionBarMessages(this.#i18n.locale);
    const text = this.label ?? (this.count === null ? null : m.selected(this.count));
    const open = this.#menuAction();
    return html`
      <div
        class="dpk-floatbar"
        popover="manual"
        role="toolbar"
        aria-label=${text ?? nothing}
        @keydown=${this.#onKeydown}
      >
        ${text === null ? nothing : html`<span class="count">${text}</span><span class="rule"></span>`}
        <div class="actions">${this.actions.map((action) => this.#renderAction(action))}<slot></slot></div>
        <button
          class="dpk-icon-btn close"
          type="button"
          data-role="clear"
          aria-label=${m.clear}
          title=${m.clear}
          @click=${this.#clear}
        >
          ${iconClose()}
        </button>
        ${open === undefined ? nothing : this.#renderMenu(open)}
      </div>
    `;
  }

  #renderAction(action: SelectionBarAction): TemplateResult {
    const hasMenu = action.options !== undefined || action.entry !== undefined;
    const expanded = this.menu === action.name;
    return html`<button
      class="dpk-btn action ${action.tone === 'accent' ? 'dpk-btn--accent' : ''}"
      type="button"
      data-action=${action.name}
      ?disabled=${action.disabled === true}
      aria-haspopup=${hasMenu ? 'menu' : nothing}
      aria-expanded=${hasMenu ? (expanded ? 'true' : 'false') : nothing}
      @click=${(event: MouseEvent) => this.#press(action, event)}
    >
      ${action.label}${hasMenu ? iconChevronDown() : nothing}
    </button>`;
  }

  #renderMenu(action: SelectionBarAction): TemplateResult {
    return html`<div class="menu" role="menu" aria-label=${action.label} @keydown=${this.#onMenuKey}>
      ${(action.options ?? []).map((option) => this.#renderOption(action, option))}
      ${
        action.entry === undefined
          ? nothing
          : html`<input
              class="dpk-input entry"
              aria-label=${action.entry.placeholder}
              placeholder=${action.entry.placeholder}
              @keydown=${(event: KeyboardEvent) => this.#onEntryKey(event, action)}
            />`
      }
    </div>`;
  }

  #renderOption(action: SelectionBarAction, option: SelectionBarOption): TemplateResult {
    const checked = option.checked;
    const checkbox = checked !== undefined;
    return html`<button
      class="item"
      type="button"
      role=${checkbox ? 'menuitemcheckbox' : 'menuitem'}
      aria-checked=${checkbox ? String(checked) : nothing}
      data-value=${option.value}
      ?disabled=${option.disabled === true}
      @click=${(event: MouseEvent) => this.#choose(action, option, event)}
    >
      ${
        checkbox
          ? html`<span class="check" aria-hidden="true"
              >${checked === true ? iconCheck() : checked === 'mixed' ? iconMinus() : nothing}</span
            >`
          : nothing
      }
      <span class="item-label">${option.label}</span>
      ${option.hint === undefined ? nothing : html`<span class="item-hint">${option.hint}</span>`}
    </button>`;
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.#syncPopover();
    if (changed.has('menu')) {
      if (this.menu === null) document.removeEventListener('pointerdown', this.#onOutside, true);
      else document.addEventListener('pointerdown', this.#onOutside, true);
    }
    if (this.menu !== null) this.#placeMenu(changed.has('menu'));
  }

  #menuAction(): SelectionBarAction | undefined {
    return this.menu === null
      ? undefined
      : this.actions.find((action) => action.name === this.menu && !action.disabled);
  }

  /** Under the action's button, kept on screen; on opening, focus moves to its first choice. */
  #placeMenu(opened: boolean): void {
    const bar = this.renderRoot.querySelector<HTMLElement>('.dpk-floatbar');
    const menu = this.renderRoot.querySelector<HTMLElement>('.menu');
    const trigger = this.#trigger(this.menu);
    if (!bar || !menu || !trigger) return;
    const barBox = bar.getBoundingClientRect();
    const at = trigger.getBoundingClientRect().left - barBox.left;
    const widest = window.innerWidth - SCREEN_MARGIN - menu.offsetWidth - barBox.left;
    menu.style.left = `${Math.max(SCREEN_MARGIN - barBox.left, Math.min(at, widest))}px`;
    menu.style.maxHeight = `${Math.max(120, barBox.top - SCREEN_MARGIN * 2)}px`;
    if (opened) this.#items()[0]?.focus({ preventScroll: true });
  }

  #trigger(name: string | null): HTMLElement | null {
    return name === null ? null : this.renderRoot.querySelector<HTMLElement>(`[data-action="${CSS.escape(name)}"]`);
  }

  #items(): HTMLElement[] {
    return [...this.renderRoot.querySelectorAll<HTMLElement>('.menu .item:not([disabled]), .menu .entry')];
  }

  #press(action: SelectionBarAction, event: MouseEvent): void {
    if (action.options !== undefined || action.entry !== undefined) {
      this.menu = this.menu === action.name ? null : action.name;
      return;
    }
    this.menu = null;
    this.#emit({ action: action.name, value: null, entered: false }, event.currentTarget);
  }

  #choose(action: SelectionBarAction, option: SelectionBarOption, event: MouseEvent): void {
    this.#emit({ action: action.name, value: option.value, entered: false }, event.currentTarget);
    if (option.checked === undefined) this.#closeMenu();
  }

  #onEntryKey(event: KeyboardEvent, action: SelectionBarAction): void {
    if (event.key !== 'Enter' || event.isComposing) return;
    event.preventDefault();
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement)) return;
    const value = input.value.trim();
    if (value === '') return;
    input.value = '';
    this.#emit({ action: action.name, value, entered: true }, input);
  }

  #emit(press: Omit<SelectionBarActionDetail, 'rect'>, control: EventTarget | null): void {
    const rect = control instanceof Element ? control.getBoundingClientRect() : new DOMRect();
    this.dispatchEvent(
      new CustomEvent<SelectionBarActionDetail>('dpk-selection-action', {
        detail: { ...press, rect },
        bubbles: true,
        composed: true,
      }),
    );
  }

  #closeMenu(): void {
    const trigger = this.#trigger(this.menu);
    this.menu = null;
    trigger?.focus({ preventScroll: true });
  }

  readonly #clear = (): void => {
    this.menu = null;
    this.dispatchEvent(new CustomEvent('dpk-selection-clear', { bubbles: true, composed: true }));
  };

  #setOpen(open: boolean): void {
    if (open === this.#open) return;
    this.#open = open;
    if (!open) this.menu = null;
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

  readonly #onOutside = (event: PointerEvent): void => {
    const bar = this.renderRoot.querySelector('.dpk-floatbar');
    if (bar !== null && !event.composedPath().includes(bar)) this.menu = null;
  };

  readonly #onMenuKey = (event: KeyboardEvent): void => {
    const typing = event.target instanceof HTMLInputElement;
    const items = this.#items();
    const at = items.findIndex((item) => item === this.shadowRoot?.activeElement);
    const step = (to: number): void => {
      event.preventDefault();
      items[(to + items.length) % items.length]?.focus();
    };
    if (event.key === 'ArrowDown') step(at + 1);
    else if (event.key === 'ArrowUp') step(at <= 0 ? items.length - 1 : at - 1);
    else if (event.key === 'Home' && !typing) step(0);
    else if (event.key === 'End' && !typing) step(items.length - 1);
  };

  /** Escape closes an open menu first; with none open it asks the host to clear the selection. */
  readonly #onKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || event.isComposing) return;
    event.preventDefault();
    event.stopPropagation();
    if (this.menu !== null) this.#closeMenu();
    else this.#clear();
  };
}
