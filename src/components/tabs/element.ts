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

      [role='tab'] {
        flex: none;
        padding: 5px 12px;
        border: 1px solid transparent;
        border-radius: var(--dpk-radius-sm);
        background: transparent;
        color: var(--dpk-ink-soft);
        font-size: 12.5px;
        font-weight: 550;
        cursor: pointer;
      }

      [role='tab']:hover {
        color: var(--dpk-ink);
      }

      [role='tab'][aria-selected='true'] {
        border-color: var(--dpk-rule-strong);
        background: var(--dpk-paper-raised);
        color: var(--dpk-ink);
        box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
      }

      [role='tab']:focus-visible {
        outline: none;
        box-shadow: var(--dpk-focus);
      }
    `,
  ];

  static override properties = { selected: { type: String, reflect: true } };

  declare selected: string | null;

  readonly #prefix = `dpk-tabs-${++instances}`;
  readonly #observer = new MutationObserver(() => {
    this.requestUpdate();
  });

  constructor() {
    super();
    this.selected = null;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#observer.observe(this, { childList: true, attributes: true, attributeFilter: ['data-name'] });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#observer.disconnect();
  }

  get #panels(): readonly HTMLElement[] {
    return [...this.querySelectorAll<HTMLElement>(PANEL_SELECTOR)];
  }

  protected override render(): unknown {
    const panels = this.#panels;
    const names = panels.map((panel) => panel.dataset['name'] ?? '');
    const current = selectedIndex(names, this.selected);
    return html`<div role="tablist" @keydown=${this.#onKeydown}>
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
