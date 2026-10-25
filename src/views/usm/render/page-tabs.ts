import { css, html, nothing, type TemplateResult } from 'lit';
import { Ellipsis } from 'lucide';

import type { ViewRenderContext } from '../../../core/shell/contracts';
import type { UsmMessages } from '../messages';
import type { UsmState } from '../model';

import { lucide } from '../../../core/icons';
import { usmTabsOf, type UsmTab } from '../board-tabs';
import { renderViewTabs } from './board';

/**
 * The head that stays at the top while the content scrolls: the board bar
 * and, under it, the map's toolbar when the map shows one.
 */
export const renderBoardHead = (bar: TemplateResult, toolbar: TemplateResult | typeof nothing): TemplateResult =>
  html`<div class="board-head" data-testid="usm-board-head">${bar}${toolbar}</div>`;

const iconMore = lucide(Ellipsis);

/**
 * The page tabs that do not fit on the bar's line (measured by the host) and
 * the menu that lists them behind the more button.
 */
export type TabsMenu = {
  readonly folded: ReadonlySet<string>;
  /** The least width the tabs' row needs: the current tab and the more button. */
  readonly minimum: number;
  readonly open: boolean;
  readonly toggle: () => void;
  readonly close: () => void;
};

/**
 * The bar above the content: the page tabs (the map, its milestones, statuses
 * and labels, and the tabs of the features that are on), on the map the
 * grouping toggle that only makes sense there. The optional features are
 * switched on from the settings in the shared header. The tabs keep to one line: the ones that do not fit fold behind a more button,
 * all but the current one.
 */
export const renderBoardBar = (
  m: UsmMessages,
  context: ViewRenderContext<UsmState>,
  current: UsmTab,
  tabsMenu: TabsMenu,
): TemplateResult => {
  const { state } = context;
  const tabs = usmTabsOf(state);
  const folded = tabs.filter((tab) => tabsMenu.folded.has(tab));
  return html`
    <div class="board-bar">
      <div class="page-nav" style=${`min-width: ${tabsMenu.minimum}px`}>
        <div class="page-tabs dpk-tabstrip" role="tablist" aria-label=${m.pageTabsLabel}>
          ${tabs.map((tab) =>
            renderPageTab(context, tab, current, tabLabel(m, tab), tabCount(state, tab), tabsMenu.folded.has(tab)),
          )}
        </div>
        <button
          class="dpk-btn dpk-btn--ghost tabs-more"
          type="button"
          data-tabs-more-trigger
          data-unused=${String(folded.length === 0)}
          aria-label=${m.moreTabsLabel}
          aria-haspopup="menu"
          aria-expanded=${String(tabsMenu.open)}
          @click=${tabsMenu.toggle}
        >
          ${iconMore()}
        </button>
        ${
          tabsMenu.open && folded.length > 0
            ? html`<div
                id="tabs-menu"
                class="comment-pop tabs-menu"
                popover="manual"
                role="menu"
                aria-label=${m.moreTabsLabel}
                @keydown=${(event: KeyboardEvent) => {
                  if (event.key !== 'Escape') return;
                  event.preventDefault();
                  tabsMenu.close();
                }}
              >
                ${folded.map(
                  (tab) =>
                    html`<a
                      class="tabs-menu-item"
                      role="menuitem"
                      data-tab=${tab}
                      href=${context.hashFor({ tab: tab === 'map' ? null : tab })}
                      @click=${tabsMenu.close}
                      >${tabLabel(m, tab)}<span class="dpk-count">${tabCount(state, tab)}</span></a
                    >`,
                )}
              </div>`
            : nothing
        }
      </div>
      ${
        current === 'map' && state.activities.some((activity) => activity.steps.length > 0)
          ? renderViewTabs(m, context)
          : nothing
      }
    </div>
  `;
};

const tabLabel = (m: UsmMessages, tab: UsmTab): string => {
  switch (tab) {
    case 'map':
      return m.mapTab;
    case 'table':
      return m.tableTab;
    case 'milestones':
      return m.milestonesTab;
    case 'statuses':
      return m.statusesTab;
    case 'labels':
      return m.labelsTab;
    case 'members':
      return m.membersTab;
    case 'burndown':
      return m.burndownTab;
  }
};

const tabCount = (state: UsmState, tab: UsmTab): number => {
  switch (tab) {
    case 'map':
      return state.stories.length;
    case 'table':
      return state.stories.length;
    case 'milestones':
      return state.milestones.length;
    case 'statuses':
      return state.statuses.length;
    case 'labels':
      return state.labels.length;
    case 'members':
      return state.members.length;
    case 'burndown':
      return state.snapshots.length;
  }
};

const renderPageTab = (
  context: ViewRenderContext<UsmState>,
  tab: UsmTab,
  current: UsmTab,
  label: string,
  count: number,
  folded: boolean,
): TemplateResult => {
  const selected = tab === current;
  return html`<a
    role="tab"
    data-tab=${tab}
    data-overflow=${folded ? '' : nothing}
    aria-hidden=${folded ? 'true' : nothing}
    tabindex=${folded ? '-1' : nothing}
    aria-selected=${selected ? 'true' : 'false'}
    href=${context.hashFor({ tab: tab === 'map' ? null : tab })}
    >${label}<span class="dpk-count">${count}</span></a
  >`;
};

/** The more menu's popover: as wide as a tab's name and count, as tall as its entries. */
export const TABS_MENU_ITEM_HEIGHT = 36;
export const TABS_MENU_PADDING = 12;
export const TABS_MENU_WIDTH = 220;

export const pageTabsStyles = css`
  /* The tabs and their more button share what the bar's line leaves; the line
     wraps only when even the current tab and the button do not fit. */
  .page-nav {
    display: flex;
    flex: 1 1 0;
    align-items: center;
    gap: 4px;
    max-width: 100%;
  }
  /* A folded tab stays laid out, out of sight, so it can still be measured. */
  .page-tabs [role='tab'][data-overflow] {
    position: absolute;
    top: 0;
    left: 0;
    visibility: hidden;
    pointer-events: none;
  }
  .tabs-more {
    flex: none;
    padding: 6px 8px;
  }
  .tabs-more svg {
    width: 16px;
    height: 16px;
  }
  .tabs-more[aria-expanded='true'] {
    background: var(--dpk-paper-inset);
    color: var(--dpk-ink);
  }
  .tabs-more[data-unused='true'] {
    position: absolute;
    visibility: hidden;
    pointer-events: none;
  }
  .comment-pop.tabs-menu {
    gap: 2px;
    padding: 6px;
  }
  .tabs-menu-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 8px 10px;
    border-radius: var(--dpk-radius-sm);
    color: var(--dpk-ink);
    font-size: 13px;
    font-weight: 600;
    text-decoration: none;
  }
  .tabs-menu-item:hover,
  .tabs-menu-item:focus-visible {
    outline: none;
    background: var(--dpk-paper-sunken);
  }
`;
