import { LitElement, css, html, type CSSResultGroup, type PropertyValues } from 'lit';
import { repeat } from 'lit/directives/repeat.js';

import { tokens } from '../../core/theme';
import { keyTarget, selectedIndex } from './model';

const PANEL_SELECTOR = ':scope > [data-name]';

let instances = 0;

/**
 * `<dpk-tabs>` — one panel at a time, picked from a tab list.
 *
 * Each direct child with a `data-name` is a panel, and its name is its tab, in
 * the order written. `selected` names the panel to start on (the first by
 * default); the reader's pick is view state and is not recorded anywhere.
 *
 * Panels are assigned to the slot by hand, so the author's markup is never
 * rewritten: a hidden panel keeps its comment targets, and a panel marked with
 * `data-dpk-item` stays reviewable inside `dpk-commentable`.
 */
export class DpkTabs extends LitElement {
  static override shadowRootOptions: ShadowRootInit = { ...LitElement.shadowRootOptions, slotAssignment: 'manual' };

  static override styles: CSSResultGroup = [
    tokens,
    css`
      :host {
        display: block;
        font-size: inherit;
        line-height: inherit;
        color: inherit;
      }

      [role='tablist'] {
        position: relative;
        display: flex;
        gap: 2px;
        margin-bottom: 12px;
        padding: 3px;
        width: fit-content;
        max-width: 100%;
        overflow-x: auto;
        border-radius: var(--dpk-radius);
        background: var(--dpk-paper-sunken);
      }

      /*
       * The raised chip the reader picked, drawn once and slid between the
       * tabs instead of each tab painting its own: the selection is a thing
       * that moves, so the eye follows it. It is placed by the two custom
       * properties 'updated()' measures off the selected tab, and it is
       * absolutely positioned inside the padding box, which is what
       * 'offsetLeft' counts from too.
       */
      .indicator {
        position: absolute;
        top: 3px;
        left: 0;
        z-index: 0;
        width: var(--dpk-tabs-indicator-w, 0px);
        height: calc(100% - 6px);
        border: 1px solid var(--dpk-rule-strong);
        border-radius: var(--dpk-radius-sm);
        background: var(--dpk-paper-raised);
        box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
        transform: translateX(var(--dpk-tabs-indicator-x, 0px));
        pointer-events: none;
        transition:
          transform var(--dpk-dur) var(--dpk-ease),
          width var(--dpk-dur) var(--dpk-ease);
      }

      /* Before the first measurement there is nothing to slide, and nothing to
         slide it from: the indicator is hidden until the tablist says where. */
      [role='tablist']:not([data-ready]) .indicator {
        opacity: 0;
        transition: none;
      }

      [role='tab'] {
        position: relative;
        z-index: 1;
        flex: none;
        padding: 5px 12px;
        border: 1px solid transparent;
        border-radius: var(--dpk-radius-sm);
        background: transparent;
        color: var(--dpk-ink-soft);
        font-size: 12.5px;
        font-weight: 550;
        cursor: pointer;
        transition:
          color var(--dpk-dur-fast) var(--dpk-ease),
          border-color var(--dpk-dur-fast) var(--dpk-ease);
      }

      [role='tab']:hover {
        color: var(--dpk-ink);
      }

      [role='tab'][aria-selected='true'] {
        color: var(--dpk-ink);
        font-weight: 650;
      }

      [role='tab']:focus-visible {
        outline: none;
        box-shadow: var(--dpk-focus);
      }

      /*
       * The panel the reader just picked fades in under the strip. A slotted
       * panel that is not the current one is not rendered at all, so its
       * animation starts again when it is assigned back to the slot.
       */
      ::slotted([data-name]) {
        animation: dpk-fade-in var(--dpk-dur) var(--dpk-ease) backwards;
      }
    `,
  ];

  static override properties = { selected: { type: String, reflect: true } };

  declare selected: string | null;

  readonly #prefix = `dpk-tabs-${++instances}`;
  readonly #observer = new MutationObserver(() => {
    this.requestUpdate();
  });
  /** Re-places the indicator when the strip's own width (or a font) changes. */
  readonly #resize = typeof ResizeObserver === 'function' ? new ResizeObserver(() => this.#syncIndicator()) : null;

  constructor() {
    super();
    this.selected = null;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#observer.observe(this, { childList: true, attributes: true, attributeFilter: ['data-name'] });
    this.#resize?.observe(this);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#observer.disconnect();
    this.#resize?.disconnect();
  }

  get #panels(): readonly HTMLElement[] {
    return [...this.querySelectorAll<HTMLElement>(PANEL_SELECTOR)];
  }

  protected override render(): unknown {
    const panels = this.#panels;
    const names = panels.map((panel) => panel.dataset['name'] ?? '');
    const current = selectedIndex(names, this.selected);
    return html`<div role="tablist" @keydown=${this.#onKeydown}>
        <span class="indicator" aria-hidden="true"></span>
        ${repeat(
          names,
          (name, index) => `${index}:${name}`,
          (name, index) =>
            html`<button
              type="button"
              role="tab"
              id="${this.#prefix}-tab-${index}"
              aria-selected=${index === current ? 'true' : 'false'}
              aria-controls="${this.#prefix}-panel"
              tabindex=${index === current ? 0 : -1}
              @click=${() => {
                this.#select(name);
              }}
            >
              ${panels[index]?.dataset['label'] ?? name}
            </button>`,
        )}
      </div>
      <div role="tabpanel" id="${this.#prefix}-panel" aria-labelledby="${this.#prefix}-tab-${current}">
        <slot></slot>
      </div>`;
  }

  protected override updated(_changed: PropertyValues<this>): void {
    const panels = this.#panels;
    const names = panels.map((panel) => panel.dataset['name'] ?? '');
    const panel = panels[selectedIndex(names, this.selected)];
    this.renderRoot.querySelector('slot')?.assign(...(panel === undefined ? [] : [panel]));
    this.#syncIndicator();
  }

  /**
   * Places the indicator over the selected tab, from the geometry the browser
   * laid out — the tabs size themselves, so no percentage can stand in for
   * this. `data-ready` is set one frame later: the first placement must not be
   * animated from wherever the indicator happened to start, and only after
   * that is a move between tabs a move.
   */
  #syncIndicator(): void {
    const tablist = this.renderRoot.querySelector<HTMLElement>('[role="tablist"]');
    const tab = this.renderRoot.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
    if (tablist === null || tab === null) return;
    tablist.style.setProperty('--dpk-tabs-indicator-x', `${tab.offsetLeft}px`);
    tablist.style.setProperty('--dpk-tabs-indicator-w', `${tab.offsetWidth}px`);
    if (tablist.hasAttribute('data-ready') || typeof requestAnimationFrame !== 'function') return;
    requestAnimationFrame(() => {
      tablist.setAttribute('data-ready', '');
    });
  }

  #select(name: string): void {
    if (name === this.selected) return;
    this.selected = name;
    this.dispatchEvent(new CustomEvent('dpk-tab-change', { detail: { name }, bubbles: true, composed: true }));
  }

  #onKeydown = (event: KeyboardEvent): void => {
    const tabs = [...this.renderRoot.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    const current = tabs.findIndex((tab) => tab.getAttribute('aria-selected') === 'true');
    const next = keyTarget(event.key, current, tabs.length);
    if (next === null) return;
    event.preventDefault();
    const name = this.#panels[next]?.dataset['name'];
    if (name !== undefined) this.#select(name);
    void this.updateComplete.then(() => {
      tabs[next]?.focus();
    });
  };
}
