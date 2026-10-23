/**
 * Pure view for `ContextMenuState` — reuses the shell's existing
 * `.dpk-settings` / `.dpk-settings-option` chrome (`settings-menu.ts`'s
 * pattern) so the menu looks native to the page, with only the additions in
 * `./styles.ts` layered on for the highlighted row, danger tone, headings,
 * dividers and the (currently unused by any v1 provider) submenu flyout.
 */
import { html, nothing, type TemplateResult } from 'lit';

import type { ContextMenuMessages } from './messages';
import type { ContextMenuState } from './model';
import type { ContextMenuEntry } from './types';

export const CONTEXT_MENU_ID = 'dpk-context-menu';

export type ContextMenuIntents = {
  readonly onHover: (id: string) => void;
  readonly onInvoke: (entry: ContextMenuEntry) => void;
  readonly onKeyDown: (event: KeyboardEvent) => void;
};

const optionClass = (entry: ContextMenuEntry, active: boolean): string =>
  `dpk-settings-option dpk-context-menu-option${active ? ' is-active' : ''}${
    entry.kind === 'item' && entry.danger === true ? ' is-danger' : ''
  }`;

const renderEntry = (
  entry: ContextMenuEntry,
  depth: number,
  state: ContextMenuState,
  on: ContextMenuIntents,
): TemplateResult => {
  const isActive = state.openPath.length === depth && state.activeId === entry.id;
  if (entry.kind === 'submenu') {
    const isOpen = state.openPath[depth] === entry.id;
    return html`<div class="dpk-context-menu-submenu-wrap">
      <button
        class=${optionClass(entry, isActive)}
        type="button"
        role="menuitem"
        aria-haspopup="menu"
        aria-expanded=${isOpen ? 'true' : 'false'}
        @pointerenter=${() => on.onHover(entry.id)}
        @click=${() => on.onInvoke(entry)}
      >
        <span class="dpk-settings-text"><span class="dpk-settings-name">${entry.label}</span></span>
      </button>
      ${
        isOpen
          ? html`<div class="dpk-settings dpk-context-menu-submenu" role="menu">
              ${entry.items.map((child) => renderEntry(child, depth + 1, state, on))}
            </div>`
          : nothing
      }
    </div>`;
  }
  return html`<button
    class=${optionClass(entry, isActive)}
    type="button"
    role="menuitem"
    ?disabled=${entry.disabled === true}
    @pointerenter=${() => on.onHover(entry.id)}
    @click=${() => on.onInvoke(entry)}
  >
    <span class="dpk-settings-text"><span class="dpk-settings-name">${entry.label}</span></span>
  </button>`;
};

export const renderContextMenu = (
  state: ContextMenuState,
  m: ContextMenuMessages,
  on: ContextMenuIntents,
): TemplateResult | typeof nothing => {
  if (!state.open) return nothing;
  const groups = state.groups.filter((group) => group.entries.length > 0);
  return html`<div
    id=${CONTEXT_MENU_ID}
    class="dpk-settings dpk-context-menu"
    popover="manual"
    role="menu"
    tabindex="-1"
    aria-label=${m.menu}
    @keydown=${on.onKeyDown}
  >
    ${groups.map(
      (group, index) =>
        html`${index > 0 ? html`<hr class="dpk-context-menu-divider" />` : nothing}${
          group.heading === undefined ? nothing : html`<div class="dpk-context-menu-heading">${group.heading}</div>`
        }${group.entries.map((entry) => renderEntry(entry, 0, state, on))}`,
    )}
  </div>`;
};
