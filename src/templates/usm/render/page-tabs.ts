import { html, nothing, type TemplateResult } from 'lit';

import type { TemplateRenderContext } from '../../../core/shell/contracts';
import type { UsmTab } from '../board-tabs';
import type { UsmMessages } from '../messages';
import type { UsmState } from '../model';

import { renderViewTabs } from './board';

/**
 * The bar above the content: the page tabs (map / milestones / statuses), and on the map
 * the grouping toggle that only makes sense there.
 */
export const renderBoardBar = (
  m: UsmMessages,
  context: TemplateRenderContext<UsmState>,
  current: UsmTab,
): TemplateResult => {
  const { state } = context;
  return html`
    <div class="board-bar">
      <div class="page-tabs" role="tablist" aria-label=${m.pageTabsLabel}>
        ${renderPageTab(context, 'map', current, m.mapTab, state.stories.length)}
        ${renderPageTab(context, 'milestones', current, m.milestonesTab, state.milestones.length)}
        ${renderPageTab(context, 'statuses', current, m.statusesTab, state.statuses.length)}
      </div>
      ${
        current === 'map' && state.activities.some((activity) => activity.steps.length > 0)
          ? renderViewTabs(m, context)
          : nothing
      }
    </div>
  `;
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
