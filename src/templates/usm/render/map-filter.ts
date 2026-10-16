import { css, html, nothing, type TemplateResult } from 'lit';

import type { TemplateRenderContext } from '../../../core/shell/contracts';
import type { UsmMessages } from '../messages';

import { iconCheck } from '../../../core/icons';
import {
  filterOptionIds,
  isFiltered,
  MAP_FILTER_KEYS,
  mapFilterOf,
  mapFilterParam,
  NO_VALUE,
  toggleFilterValue,
  type MapFilter,
  type MapFilterKey,
} from '../map-filter';
import { findEstimate, type UsmState } from '../model';
import { statusViews } from '../status-view';
import { statusIcon, statusToneStyle } from './tone';

/** The one filter menu the map may have open, and how to open or close it. */
export type FilterMenu = {
  readonly openFor: MapFilterKey | null;
  readonly toggle: (key: MapFilterKey) => void;
  readonly close: () => void;
};

/** One choice of a filter, as its menu lists it. */
type FilterOption = {
  readonly id: string;
  readonly name: string;
  readonly count: number;
  readonly mark: TemplateResult | typeof nothing;
  readonly style: string;
};

/**
 * The map's filters in one row: a select-like trigger per filter (status,
 * label, estimate) that opens a menu of its choices. A filter the map has no
 * choices for is left out.
 */
export const renderMapFilter = (
  m: UsmMessages,
  context: TemplateRenderContext<UsmState>,
  menu: FilterMenu,
): TemplateResult | typeof nothing => {
  const { state } = context;
  const keys = MAP_FILTER_KEYS.filter((key) => filterOptionIds(state, key).length > 0);
  if (keys.length === 0) return nothing;
  const filter = mapFilterOf(state, context.navigation);
  const clear = Object.fromEntries(MAP_FILTER_KEYS.map((key) => [key, null]));
  return html`<div class="map-toolbar" role="group" aria-label=${m.filterLabel} data-testid="usm-map-filter">
    ${keys.map((key) => renderFilterSelect(m, context, filter, key, menu))}
    ${isFiltered(filter) ? html`<a class="filter-clear" href=${context.hashFor(clear)}>${m.clearFilter}</a>` : nothing}
  </div>`;
};

const renderFilterSelect = (
  m: UsmMessages,
  context: TemplateRenderContext<UsmState>,
  filter: MapFilter,
  key: MapFilterKey,
  menu: FilterMenu,
): TemplateResult => {
  const selected = filter[key];
  const options = filterOptions(m, context.state, key);
  const chosen = options.filter((option) => selected.has(option.id));
  const open = menu.openFor === key;
  return html`<span class="filter-field">
    <button
      class="dpk-select filter-select"
      type="button"
      data-filter-trigger=${key}
      data-active=${String(chosen.length > 0)}
      aria-haspopup="menu"
      aria-expanded=${String(open)}
      @click=${() => menu.toggle(key)}
    >
      <span class="filter-key">${m.filterKeyLabel(key)}</span>
      <span class="filter-value">${summary(m, chosen)}</span>
    </button>
    ${open ? renderFilterMenu(m, context, key, selected, options, menu) : nothing}
  </span>`;
};

/** "All", the one choice, or the first choice and how many more. */
const summary = (m: UsmMessages, chosen: readonly FilterOption[]): string => {
  const [first] = chosen;
  if (!first) return m.filterAll;
  return chosen.length === 1 ? first.name : `${first.name} +${chosen.length - 1}`;
};

/** The choices of a filter as checkboxes; picking one keeps the menu open for the next. */
const renderFilterMenu = (
  m: UsmMessages,
  context: TemplateRenderContext<UsmState>,
  key: MapFilterKey,
  selected: ReadonlySet<string>,
  options: readonly FilterOption[],
  menu: FilterMenu,
): TemplateResult => html`<div
  id="filter-menu"
  class="comment-pop filter-menu"
  popover="manual"
  role="menu"
  aria-label=${m.filterKeyLabel(key)}
  data-filter=${key}
  @keydown=${(event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    menu.close();
  }}
>
  <a
    class="filter-option"
    role="menuitemcheckbox"
    data-option=""
    aria-checked=${String(selected.size === 0)}
    href=${context.hashFor({ [key]: null })}
  >
    <span class="filter-check">${selected.size === 0 ? iconCheck() : nothing}</span>
    <span class="filter-name">${m.filterAll}</span>
  </a>
  ${options.map((option) => {
    const on = selected.has(option.id);
    return html`<a
      class="filter-option"
      role="menuitemcheckbox"
      data-option=${option.id}
      data-none=${option.id === NO_VALUE ? 'true' : nothing}
      aria-checked=${String(on)}
      style=${option.style}
      href=${context.hashFor({ [key]: mapFilterParam(context.state, key, toggleFilterValue(selected, option.id)) })}
    >
      <span class="filter-check">${on ? iconCheck() : nothing}</span>
      ${option.mark}
      <span class="filter-name" title=${option.name}>${option.name}</span>
      <span class="filter-count">${option.count}</span>
    </a>`;
  })}
</div>`;

const filterOptions = (m: UsmMessages, state: UsmState, key: MapFilterKey): readonly FilterOption[] => {
  const count = (test: (story: UsmState['stories'][number]) => boolean): number => state.stories.filter(test).length;
  switch (key) {
    case 'status':
      return statusViews(state).map((view) => ({
        id: view.id,
        name: view.name,
        count: count((story) => story.statusId === view.id),
        mark: statusIcon(view),
        style: statusToneStyle(view.tone),
      }));
    case 'label':
      return filterOptionIds(state, key).map((id) => {
        const label = state.labels.find((each) => each.id === id);
        return {
          id,
          name: label?.name ?? m.noLabel,
          count: count((story) => (label ? (story.labelIds ?? []).includes(id) : (story.labelIds ?? []).length === 0)),
          mark: html`<span class="filter-dot"></span>`,
          style: statusToneStyle(label?.tone),
        };
      });
    case 'estimate':
      return filterOptionIds(state, key).map((id) => {
        const estimate = findEstimate(state, id);
        return {
          id,
          name: estimate?.name ?? m.unestimatedFilter,
          count: count((story) => (story.estimateId ?? NO_VALUE) === id),
          mark: estimate ? html`<span class="filter-points">${estimate.points}pt</span>` : nothing,
          style: '',
        };
      });
  }
};

export const mapFilterStyles = css`
  .map-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin: 16px 0 12px;
  }
  .filter-field {
    min-width: 0;
  }
  .filter-select {
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
    width: auto;
    max-width: 260px;
    text-align: left;
  }
  .filter-select[data-active='true'] {
    border-color: color-mix(in oklab, var(--dpk-blue) 55%, var(--dpk-rule-strong));
    background-color: color-mix(in oklab, var(--dpk-blue) 8%, var(--dpk-paper-raised));
  }
  .filter-key {
    flex: none;
    color: var(--dpk-ink-faint);
    font-size: 11.5px;
    font-weight: 600;
  }
  .filter-value {
    min-width: 0;
    overflow: hidden;
    color: var(--dpk-ink);
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .filter-clear {
    margin-left: 2px;
    color: var(--dpk-blue);
    font-size: 12px;
    font-weight: 600;
    text-decoration: none;
  }
  .filter-clear:hover {
    text-decoration: underline;
  }
  .comment-pop.filter-menu {
    gap: 1px;
    padding: 6px;
  }
  .filter-option {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 30px;
    padding: 4px 8px;
    border-radius: var(--dpk-radius-sm);
    color: var(--dpk-ink);
    font-size: 12.5px;
    font-weight: 550;
    text-decoration: none;
  }
  .filter-option[data-none] .filter-name {
    color: var(--dpk-ink-soft);
    font-style: italic;
  }
  .filter-option:hover,
  .filter-option:focus-visible {
    outline: none;
    background: var(--dpk-paper-sunken);
  }
  .filter-option:focus-visible {
    box-shadow: var(--dpk-focus);
  }
  .filter-check {
    flex: none;
    display: inline-grid;
    place-items: center;
    width: 16px;
    height: 16px;
    color: var(--dpk-blue);
  }
  .filter-check svg {
    width: 14px;
    height: 14px;
  }
  .filter-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .filter-dot {
    flex: none;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--usm-tone, var(--dpk-ink-faint));
  }
  .filter-points,
  .filter-count {
    color: var(--dpk-ink-faint);
    font-family: var(--dpk-mono);
    font-size: 10.5px;
    font-variant-numeric: tabular-nums;
  }
`;
