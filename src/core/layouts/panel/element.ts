/**
 * `<dpk-internal-layout-panel>`: the frame that sets a panel's owner's main
 * column beside its side panel. Internal: the owner (`<dpk-page>`, a
 * standalone view or board) draws it around its body and hands it its
 * `PanelOwner`; everything the panel shows comes from there.
 *
 * - The default slot is the main column. On a wide screen the panel stands to
 *   its right and the column narrows; the reader drags the panel's edge
 *   between `PANEL_WIDTH.min` and `.max`. Maximized, the panel covers the column.
 * - At 760px and below the panel is a sheet from the bottom: half the
 *   height, which leaves the column usable, or all of it.
 * - The `sections` slot takes the author's `<dpk-panel-section>` elements,
 *   forwarded by the owner; the owner marks the one that shows.
 * - Escape inside the panel closes it, unless an input or a popup inside used
 *   that Escape itself (an IME's conversion, a list of candidates closing):
 *   it first restores a maximized panel or shrinks a full sheet.
 * - `--dpk-panel-width` sets the width before the reader changes it.
 * - The main column carries what the open panel takes of the screen, for
 *   what floats over the column (the selection bar) to keep clear of it:
 *   `--dpk-panel-inset-right` beside it, `--dpk-panel-inset-bottom` under a
 *   half sheet, and `--dpk-panel-cover-visibility: hidden` while the panel
 *   covers the column.
 */
import { css, html, LitElement, nothing, type CSSResultGroup, type PropertyValues, type TemplateResult } from 'lit';
import { keyed } from 'lit/directives/keyed.js';

import { iconChevronLeft, iconClose, iconComment, iconMaximize, iconMinimize } from '../../icons';
import { panelMessages } from '../../panel/messages';
import { DETAIL_SECTION, PANEL_WIDTH, SETTINGS_SECTION, tabKeyTarget, type PanelTab } from '../../panel/model';
import { SIDE_PANEL_ATTRIBUTE, type PanelOwner } from '../../panel/owner';
import { controls, tokens } from '../../theme';
import { NarrowScreenController } from '../sidebar/narrow-screen-controller';
import { SidebarResizeController } from '../sidebar/resize-controller';

/**
 * Whether the event happened inside a side panel: a board that holds the
 * Escape for its own selection leaves this one to the panel.
 */
export const inSidePanel = (event: Event): boolean =>
  event.composedPath().some((node) => node instanceof Element && node.hasAttribute(SIDE_PANEL_ATTRIBUTE));

const panelStyles = css`
  :host {
    position: relative;
    display: flex;
    min-width: 0;
    min-height: 0;
    height: 100%;
  }

  .main {
    display: flex;
    flex: 1 1 0%;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
  }

  .main ::slotted(*) {
    flex: 1 1 0%;
    min-width: 0;
    min-height: 0;
  }

  .panel {
    position: relative;
    z-index: 20;
    display: grid;
    flex: none;
    grid-template-rows: auto minmax(0, 1fr);
    box-sizing: border-box;
    min-height: 0;
    border-left: 1px solid var(--dpk-rule);
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink);
    font-family: var(--dpk-body);
  }

  .panel[data-maximized] {
    position: absolute;
    inset: 0;
    width: auto !important;
    border-left: 0;
  }

  .panel:focus {
    outline: none;
  }

  .head {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    padding: 8px 8px 8px 10px;
    border-bottom: 1px solid var(--dpk-rule);
  }

  .tabs {
    display: inline-flex;
    flex: 0 1 auto;
    gap: 2px;
    min-width: 0;
    padding: 2px;
    overflow-x: auto;
    scrollbar-width: none;
    border: 1px solid var(--dpk-rule);
    border-radius: 999px;
    background: var(--dpk-paper-sunken);
    box-shadow: inset 0 1px 3px var(--dpk-shade-1);
  }

  .tab {
    position: relative;
    display: inline-flex;
    flex: none;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: var(--dpk-ink-soft);
    font: inherit;
    font-size: var(--dpk-text-sm);
    font-weight: 550;
    white-space: nowrap;
    cursor: pointer;
    transition:
      background var(--dpk-dur) var(--dpk-ease),
      color var(--dpk-dur) var(--dpk-ease);
  }

  .tab:hover {
    background: var(--dpk-paper-inset);
    color: var(--dpk-ink);
  }

  .tab:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }

  .tab[aria-selected='true'] {
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink);
    font-weight: 650;
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
  }

  .badge {
    min-width: 18px;
    padding: 0 5px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--dpk-ink) 10%, transparent);
    color: var(--dpk-ink);
    font-size: var(--dpk-text-2xs, 10px);
    font-weight: 700;
    line-height: 16px;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }

  .unread {
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: var(--dpk-accent);
  }

  .head-tools {
    display: flex;
    flex: none;
    gap: 2px;
    margin-left: auto;
  }

  .body {
    min-height: 0;
    overflow: auto;
    overscroll-behavior: contain;
  }

  .section {
    padding: 14px 16px 24px;
  }

  .section[hidden] {
    display: none;
  }

  .detail-head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 10px;
  }

  .origin {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    max-width: 100%;
    margin: -4px 0 8px -6px;
    padding: 2px 8px 2px 2px;
    border: none;
    border-radius: var(--dpk-radius-xs, 4px);
    background: transparent;
    color: var(--dpk-ink-soft);
    font: inherit;
    font-size: var(--dpk-text-xs, 12px);
    font-weight: 600;
    cursor: pointer;
  }

  .origin:hover {
    background: var(--dpk-paper-inset);
    color: var(--dpk-ink);
  }

  .origin:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }

  .origin svg {
    flex: none;
    width: 14px;
    height: 14px;
  }

  .origin span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .detail-head h2 {
    display: flex;
    flex: 1 1 auto;
    align-items: baseline;
    gap: 8px;
    min-width: 0;
    margin: 0 -6px;
    padding: 2px 6px;
    font-size: var(--dpk-text-xs, 12px);
    font-weight: 600;
  }

  .detail-head h2:focus {
    outline: none;
  }

  .detail-head h2:focus-visible {
    border-radius: var(--dpk-radius-xs, 4px);
    box-shadow: var(--dpk-focus);
  }

  .detail-kind {
    flex: none;
    color: var(--dpk-ink-faint);
    white-space: nowrap;
    font-weight: 650;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .detail-title {
    overflow: hidden;
    color: var(--dpk-ink-soft);
    font-family: var(--dpk-mono);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .empty {
    margin: 24px 0;
    color: var(--dpk-ink-faint);
    font-size: var(--dpk-text-sm);
    text-align: center;
  }

  .authored {
    display: block;
    padding: 14px 16px 24px;
  }

  .authored[hidden] {
    display: none;
  }

  .resizer {
    position: absolute;
    top: 0;
    bottom: 0;
    left: -5px;
    z-index: 2;
    width: 9px;
    cursor: col-resize;
    touch-action: none;
  }

  .resizer::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 4px;
    width: 2px;
    border-radius: 1px;
    background: var(--dpk-accent);
    opacity: 0;
    transition: opacity 160ms var(--dpk-ease);
  }

  .resizer:hover::after,
  .resizer:focus-visible::after,
  .resizer[data-dragging]::after {
    opacity: 1;
  }

  .resizer:focus-visible {
    outline: none;
  }

  :host([data-resizing]) {
    cursor: col-resize;
    user-select: none;
  }

  :host([data-resizing]) .main {
    pointer-events: none;
  }

  .handle {
    display: none;
  }

  /* A phone-width screen: a sheet from the bottom, half the height or all of it. */
  :host([data-narrow]) .panel {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    width: auto !important;
    height: min(50dvh, 100%);
    border-top: 1px solid var(--dpk-rule-strong);
    border-left: 0;
    border-radius: var(--dpk-radius-lg) var(--dpk-radius-lg) 0 0;
    box-shadow: var(--dpk-shadow-lg);
    grid-template-rows: auto auto minmax(0, 1fr);
  }

  :host([data-narrow]) .panel[data-sheet='full'] {
    height: 100%;
    border-radius: 0;
  }

  :host([data-narrow]) .handle {
    display: flex;
    justify-content: center;
    padding: 6px 0 0;
    border: 0;
    background: none;
    cursor: pointer;
  }

  :host([data-narrow]) .handle::before {
    content: '';
    width: 36px;
    height: 4px;
    border-radius: 999px;
    background: var(--dpk-rule-strong);
  }

  :host([data-narrow]) .handle:focus-visible {
    outline: none;
  }

  :host([data-narrow]) .handle:focus-visible::before {
    box-shadow: var(--dpk-focus);
  }

  @media (prefers-reduced-motion: no-preference) {
    .panel {
      animation: dpk-panel-in var(--dpk-dur) var(--dpk-ease-out);
    }

    :host([data-narrow]) .panel {
      animation-name: dpk-sheet-in;
      transition: height var(--dpk-dur) var(--dpk-ease-out);
    }
  }

  @keyframes dpk-panel-in {
    from {
      opacity: 0;
      translate: 12px 0;
    }
  }

  @keyframes dpk-sheet-in {
    from {
      translate: 0 24px;
      opacity: 0;
    }
  }
`;

export class DpkInternalLayoutPanel extends LitElement {
  static override styles: CSSResultGroup = [tokens, controls, panelStyles];

  static override properties = {
    owner: { attribute: false },
  };

  declare owner: PanelOwner | null;

  readonly #narrow = new NarrowScreenController(this);
  #defaultWidth: number | null = null;
  readonly #width = new SidebarResizeController(this, {
    persistKey: () => {
      const key = this.owner?.persistKey ?? null;
      return key === null ? null : `${key}:panel`;
    },
    side: () => 'right',
    defaultWidth: () => this.#readDefaultWidth(),
    bounds: PANEL_WIDTH,
  });
  #unsubscribe: (() => void) | null = null;
  #subscribed: PanelOwner | null = null;
  #focusTab: string | null = null;

  constructor() {
    super();
    this.owner = null;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#subscribe();
    // On the window, so it runs after every handler inside (and the document's
    // dismissable layers): an Escape one of them used arrives prevented.
    window.addEventListener('keydown', this.#onKey);
    window.addEventListener('resize', this.#publishInsets);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener('keydown', this.#onKey);
    window.removeEventListener('resize', this.#publishInsets);
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    this.#subscribed = null;
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('owner')) this.#subscribe();
    this.toggleAttribute('data-narrow', this.#narrow.narrow);
    this.toggleAttribute('data-open', this.owner?.isOpen === true);
    this.toggleAttribute('data-resizing', this.#width.dragging);
  }

  #subscribe(): void {
    if (this.#subscribed === this.owner && this.#unsubscribe !== null) return;
    this.#unsubscribe?.();
    this.#subscribed = this.owner;
    this.#unsubscribe = this.owner?.subscribe(() => this.requestUpdate()) ?? null;
  }

  /** `--dpk-panel-width` when the page sets one, read once. */
  #readDefaultWidth(): number {
    if (this.#defaultWidth !== null) return this.#defaultWidth;
    const authored = this.isConnected
      ? Number.parseFloat(getComputedStyle(this).getPropertyValue('--dpk-panel-width'))
      : Number.NaN;
    this.#defaultWidth = Number.isFinite(authored)
      ? Math.min(PANEL_WIDTH.max, Math.max(PANEL_WIDTH.min, authored))
      : PANEL_WIDTH.default;
    return this.#defaultWidth;
  }

  protected override render(): TemplateResult {
    const owner = this.owner;
    const open = owner?.isOpen === true;
    const cover = open && (owner.maximized || (this.#narrow.narrow && owner.sheet === 'full'));
    return html`<div class="main" ?inert=${cover}><slot></slot></div>
      ${open ? this.#renderPanel(owner) : nothing}`;
  }

  #renderPanel(owner: PanelOwner): TemplateResult {
    const m = panelMessages(owner.locale);
    const narrow = this.#narrow.narrow;
    const full = narrow && owner.sheet === 'full';
    const tabs = owner.tabs;
    const section = owner.section;
    const authored = tabs.find((tab) => tab.name === section)?.kind === 'author';
    return html`<aside
      class="panel"
      role=${full ? 'dialog' : 'complementary'}
      aria-modal=${full ? 'true' : nothing}
      aria-label=${m.panel}
      ?data-maximized=${!narrow && owner.maximized}
      data-sheet=${narrow ? owner.sheet : nothing}
      style=${narrow ? nothing : `width: ${this.#width.width}px`}
      data-dpk-side-panel
    >
      ${narrow ? this.#renderHandle(owner, m) : this.#renderResizer(m)}
      <div class="head">
        <div class="tabs" role="tablist" aria-label=${m.sections}>
          ${tabs.map((tab) => this.#renderTab(owner, tab, section, m))}
        </div>
        <div class="head-tools">
          ${
            narrow
              ? nothing
              : html`<button
                  class="dpk-icon-btn"
                  type="button"
                  aria-label=${owner.maximized ? m.restorePanel : m.maximizePanel}
                  title=${owner.maximized ? m.restorePanel : m.maximizePanel}
                  aria-pressed=${owner.maximized ? 'true' : 'false'}
                  @click=${() => owner.setMaximized(!owner.maximized)}
                >
                  ${owner.maximized ? iconMinimize() : iconMaximize()}
                </button>`
          }
          <button
            class="dpk-icon-btn"
            type="button"
            data-role="close-panel"
            aria-label=${m.closePanel}
            title=${m.closePanel}
            @click=${() => owner.dismiss()}
          >
            ${iconClose()}
          </button>
        </div>
      </div>
      <div class="body">
        ${tabs.some((tab) => tab.kind === 'detail') ? this.#renderDetail(owner, section, m) : nothing}
        ${owner.componentSections.map(
          (spec) => html`<div
            class="section"
            role="tabpanel"
            id=${`panel-${spec.name}`}
            aria-labelledby=${`tab-${spec.name}`}
            ?hidden=${section !== spec.name}
          >
            ${spec.render()}
          </div>`,
        )}
        <div class="authored" ?hidden=${!authored}><slot name="sections"></slot></div>
        ${
          owner.settings !== null && section === SETTINGS_SECTION
            ? html`<div
                class="section"
                role="tabpanel"
                id=${`panel-${SETTINGS_SECTION}`}
                aria-labelledby=${`tab-${SETTINGS_SECTION}`}
              >
                ${owner.settings.render()}
              </div>`
            : nothing
        }
      </div>
    </aside>`;
  }

  #renderTab(owner: PanelOwner, tab: PanelTab, section: string, m: ReturnType<typeof panelMessages>): TemplateResult {
    const selected = tab.name === section;
    const unread = tab.kind === 'detail' && owner.unread && !selected;
    const name =
      tab.badge !== null ? m.tabWithBadge(tab.label, tab.badge) : unread ? m.tabUnread(tab.label) : tab.label;
    return html`<button
      class="tab"
      type="button"
      role="tab"
      id=${`tab-${tab.name}`}
      data-section=${tab.name}
      aria-selected=${selected ? 'true' : 'false'}
      aria-controls=${tab.kind === 'author' ? nothing : `panel-${tab.name}`}
      aria-label=${name === tab.label ? nothing : name}
      tabindex=${selected ? '0' : '-1'}
      @click=${() => owner.select(tab.name)}
      @keydown=${(event: KeyboardEvent) => this.#onTabKey(event, owner, section)}
    >
      ${tab.label} ${tab.badge === null ? nothing : html`<span class="badge" aria-hidden="true">${tab.badge}</span>`}
      ${unread ? html`<span class="unread" aria-hidden="true"></span>` : nothing}
    </button>`;
  }

  #renderDetail(owner: PanelOwner, section: string, m: ReturnType<typeof panelMessages>): TemplateResult {
    const detail = owner.detail;
    const origin = owner.detailOrigin;
    return html`<div
      class="section"
      role="tabpanel"
      id=${`panel-${DETAIL_SECTION}`}
      aria-labelledby=${`tab-${DETAIL_SECTION}`}
      ?hidden=${section !== DETAIL_SECTION}
    >
      ${
        detail === null
          ? html`<p class="empty">${m.nothingSelected}</p>`
          : keyed(
              detail.key,
              html`${
                  origin === null
                    ? nothing
                    : html`<button
                        class="origin"
                        type="button"
                        data-role="detail-origin"
                        aria-label=${m.backToSection(origin.label)}
                        @click=${() => owner.select(origin.name)}
                      >
                        ${iconChevronLeft()}<span>${origin.label}</span>
                      </button>`
                }
                <div class="detail-head">
                  <h2 tabindex="-1" data-role="detail-heading">
                    <span class="detail-kind">${detail.kind}</span>
                    <span class="detail-title">${detail.title}</span>
                  </h2>
                  ${
                    detail.comment === undefined
                      ? nothing
                      : html`<button
                          class="dpk-icon-btn"
                          type="button"
                          data-size="sm"
                          aria-label=${m.commentOnDetail}
                          title=${m.commentOnDetail}
                          @click=${() => detail.comment?.()}
                        >
                          ${iconComment()}
                        </button>`
                  }
                </div>
                ${detail.render()}`,
            )
      }
    </div>`;
  }

  #renderResizer(m: ReturnType<typeof panelMessages>): TemplateResult {
    const on = this.#width.handlers;
    return html`<div
      class="resizer"
      role="separator"
      tabindex="0"
      ?data-dragging=${this.#width.dragging}
      aria-orientation="vertical"
      aria-label=${m.resizePanel}
      aria-valuemin=${PANEL_WIDTH.min}
      aria-valuemax=${PANEL_WIDTH.max}
      aria-valuenow=${this.#width.width}
      title=${m.resizePanelHint}
      @pointerdown=${on.pointerdown}
      @pointermove=${on.pointermove}
      @pointerup=${on.pointerup}
      @pointercancel=${on.pointercancel}
      @keydown=${on.keydown}
      @dblclick=${on.dblclick}
    ></div>`;
  }

  #renderHandle(owner: PanelOwner, m: ReturnType<typeof panelMessages>): TemplateResult {
    const full = owner.sheet === 'full';
    return html`<button
      class="handle"
      type="button"
      data-role="sheet-handle"
      aria-label=${full ? m.shrinkSheet : m.expandSheet}
      aria-expanded=${full ? 'true' : 'false'}
      @click=${() => owner.setSheet(full ? 'half' : 'full')}
    ></button>`;
  }

  #onTabKey(event: KeyboardEvent, owner: PanelOwner, section: string): void {
    const next = tabKeyTarget(
      owner.tabs.map((tab) => tab.name),
      section,
      event.key,
    );
    if (next === null) return;
    event.preventDefault();
    this.#focusTab = next;
    owner.select(next);
    this.requestUpdate();
  }

  /** Escape steps a maximized panel or a full sheet back, then leaves the detail for its section or closes the panel. */
  readonly #onKey = (event: KeyboardEvent): void => {
    const owner = this.owner;
    if (event.key !== 'Escape' || event.isComposing || event.defaultPrevented || owner?.isOpen !== true) return;
    const panel = this.renderRoot.querySelector('.panel');
    if (panel === null || !event.composedPath().includes(panel)) return;
    event.preventDefault();
    if (owner.maximized) owner.setMaximized(false);
    else if (this.#narrow.narrow && owner.sheet === 'full') owner.setSheet('half');
    else owner.escape();
  };

  /** Measured from the frame, not the panel, so the panel's entrance animation does not skew it. */
  readonly #publishInsets = (): void => {
    const main = this.renderRoot.querySelector<HTMLElement>('.main');
    if (main === null) return;
    const owner = this.owner;
    const open = owner?.isOpen === true;
    const narrow = this.#narrow.narrow;
    const cover = open && (owner.maximized || (narrow && owner.sheet === 'full'));
    const frame = this.getBoundingClientRect();
    const right = open && !cover && !narrow ? window.innerWidth - (frame.right - this.#width.width) : null;
    const bottom =
      open && !cover && narrow
        ? window.innerHeight - frame.bottom + Math.min(window.innerHeight / 2, frame.height)
        : null;
    const set = (name: string, value: string | null): void => {
      if (value === null) main.style.removeProperty(name);
      else main.style.setProperty(name, value);
    };
    set('--dpk-panel-inset-right', right === null ? null : `${Math.max(0, right)}px`);
    set('--dpk-panel-inset-bottom', bottom === null ? null : `${Math.max(0, bottom)}px`);
    set('--dpk-panel-cover-visibility', cover ? 'hidden' : null);
  };

  protected override updated(): void {
    this.#publishInsets();
    const owner = this.owner;
    if (owner === null) return;
    if (this.#focusTab !== null) {
      const name = this.#focusTab;
      this.#focusTab = null;
      this.renderRoot.querySelector<HTMLElement>(`[role="tab"][data-section="${CSS.escape(name)}"]`)?.focus();
    }
    const focus = owner.takeFocus();
    if (focus === 'detail') {
      this.renderRoot.querySelector<HTMLElement>('[data-role="detail-heading"]')?.focus({ preventScroll: true });
    } else if (focus === 'tab') {
      this.renderRoot.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus({ preventScroll: true });
    }
  }
}

export const defineLayoutPanel = (): void => {
  if (!customElements.get('dpk-internal-layout-panel'))
    customElements.define('dpk-internal-layout-panel', DpkInternalLayoutPanel);
};
