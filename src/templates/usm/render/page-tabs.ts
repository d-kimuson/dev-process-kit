import { html, nothing, type TemplateResult } from 'lit';

import type { TemplateRenderContext } from '../../../core/shell/contracts';
import type { UsmMessages } from '../messages';
import type { UsmState } from '../model';

import { usmTabsOf, type UsmTab } from '../board-tabs';
import { renderViewTabs } from './board';
import { renderFeaturesMenu, type FeaturesMenu } from './features-menu';

/**
 * The bar above the content: the page tabs (the map, its milestones, statuses
 * and labels, and the tabs of the features that are on), on the map the
 * grouping toggle that only makes sense there, and the features menu.
 */
export const renderBoardBar = (
  m: UsmMessages,
  context: TemplateRenderContext<UsmState>,
  current: UsmTab,
  featuresMenu: FeaturesMenu,
): TemplateResult => {
  const { state } = context;
  return html`
    <div class="board-bar">
      <div class="page-tabs" role="tablist" aria-label=${m.pageTabsLabel}>
        ${usmTabsOf(state).map((tab) => renderPageTab(context, tab, current, tabLabel(m, tab), tabCount(state, tab)))}
      </div>
      ${
        current === 'map' && state.activities.some((activity) => activity.steps.length > 0)
          ? renderViewTabs(m, context)
          : nothing
      }
      ${renderFeaturesMenu(m, context, featuresMenu)}
    </div>
  `;
};

const tabLabel = (m: UsmMessages, tab: UsmTab): string => {
  switch (tab) {
    case 'map':
      return m.mapTab;
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
  context: TemplateRenderContext<UsmState>,
  tab: UsmTab,
  current: UsmTab,
  label: string,
  count: number,
): TemplateResult => {
  const selected = tab === current;
  return html`<a
    role="tab"
    data-tab=${tab}
    aria-selected=${selected ? 'true' : 'false'}
    href=${context.hashFor({ tab: tab === 'map' ? null : tab })}
    >${label}<span class="page-tab-count">${count}</span></a
  >`;
};
