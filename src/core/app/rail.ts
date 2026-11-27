/**
 * The page rail of `page-nav="sidebar"`: a column of the app's pages beside
 * the page shown, each a tab of its icon and name, so a document of many pages
 * can be read at a glance. It stands in for the header's switcher
 * (`switcher.ts`) wherever it is drawn, so it carries what the switcher does:
 * the page shown is renamed on its tab, each tab has a "×" and a "+" under the
 * tabs adds a page. This module is the pure half — how the rail renders for a
 * given state, and which page a key moves to.
 */
import { html, nothing, type TemplateResult } from 'lit';

import { onCommit } from '../../lib/dom/events';
import { iconClose, iconPlus } from '../icons';
import { SWITCHER_ID } from './switcher';

/** One page of the rail. */
export type RailTab = {
  readonly id: string;
  readonly label: string;
  readonly icon: () => TemplateResult;
  readonly selected: boolean;
  /** The draft's changes and comments on this page, shown as a count on its tab. */
  readonly pending: number;
  /** The page shown now: its name is edited in place, under its icon. */
  readonly rename?: { readonly label: string; readonly commit: (name: string) => void };
  readonly remove?: { readonly label: string; readonly activate: () => void };
};

export type RailMessages = {
  readonly pages: string;
};

export type RailIntents = {
  /** Shows the page; `focus` when a key moved there, so the focus follows the selection. */
  readonly select: (id: string, options: { readonly focus: boolean }) => void;
  /** The "+" under the tabs, which opens the list of what a page can be added from. */
  readonly add?: { readonly label: string; readonly open: boolean; readonly toggle: () => void };
};

/** The index a key moves to in a vertical tab list of `count` tabs, or `null` for a key the rail leaves alone. */
export const railKeyTarget = (key: string, current: number, count: number): number | null => {
  const last = count - 1;
  if (key === 'ArrowDown') return Math.min(last, current + 1);
  if (key === 'ArrowUp') return Math.max(0, current - 1);
  if (key === 'Home') return 0;
  if (key === 'End') return last;
  return null;
};

const renderTab = (tab: RailTab, on: RailIntents): TemplateResult =>
  html`<div class="dpk-page-tab-item" role="presentation" ?data-selected=${tab.selected}>
    <button
      class="dpk-page-tab"
      type="button"
      role="tab"
      data-page=${tab.id}
      aria-label=${tab.label}
      aria-selected=${tab.selected ? 'true' : 'false'}
      tabindex=${tab.selected ? 0 : -1}
      title=${tab.label}
      @click=${() => on.select(tab.id, { focus: false })}
    >
      <span class="dpk-page-tab-icon" aria-hidden="true">${tab.icon()}</span>
      ${tab.rename === undefined ? html`<span class="dpk-page-tab-label">${tab.label}</span>` : nothing}
      ${tab.pending > 0 ? html`<span class="dpk-page-tab-count">${tab.pending}</span>` : nothing}
    </button>
    ${
      tab.rename === undefined
        ? nothing
        : html`<dpk-inline-edit
            class="dpk-page-tab-label"
            wrap
            truncate
            seamless
            .value=${tab.label}
            .label=${tab.rename.label}
            @dpk-commit=${onCommit(tab.rename.commit)}
          ></dpk-inline-edit>`
    }
    ${
      tab.remove === undefined
        ? nothing
        : html`<button
            class="dpk-page-tab-remove"
            type="button"
            data-page=${tab.id}
            aria-label=${tab.remove.label}
            title=${tab.remove.label}
            @click=${tab.remove.activate}
          >
            ${iconClose()}
          </button>`
    }
  </div>`;

export const renderRail = (tabs: readonly RailTab[], m: RailMessages, on: RailIntents): TemplateResult => html`<nav
  class="dpk-page-rail"
  aria-label=${m.pages}
>
  <div
    class="dpk-page-tabs"
    role="tablist"
    aria-orientation="vertical"
    @keydown=${(event: KeyboardEvent) => {
      // A key typed into the name being edited is that field's own.
      if (!(event.target instanceof Element) || !event.target.matches('[role="tab"]')) return;
      const next = railKeyTarget(
        event.key,
        tabs.findIndex((tab) => tab.selected),
        tabs.length,
      );
      const tab = next === null ? undefined : tabs[next];
      if (tab === undefined) return;
      event.preventDefault();
      on.select(tab.id, { focus: true });
    }}
  >
    ${tabs.map((tab) => renderTab(tab, on))}
  </div>
  ${
    on.add === undefined
      ? nothing
      : html`<button
          class="dpk-page-add"
          type="button"
          aria-label=${on.add.label}
          title=${on.add.label}
          aria-haspopup="menu"
          aria-controls=${SWITCHER_ID}
          aria-expanded=${on.add.open ? 'true' : 'false'}
          @click=${on.add.toggle}
        >
          ${iconPlus()}
        </button>`
  }
</nav>`;
