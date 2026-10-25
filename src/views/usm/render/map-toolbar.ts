import { css, html, type TemplateResult } from 'lit';

import type { ViewRenderContext } from '../../../core/shell/contracts';
import type { UsmMessages } from '../messages';
import type { UsmState } from '../model';

import { renderHighlightToggle } from './highlight';
import { renderMapFilter, type FilterMenu } from './map-filter';

/**
 * The row under the page tabs on the map: the filters on the left, the
 * highlight on the right. It sticks with the tabs while the page scrolls.
 */
export const renderMapToolbar = (
  m: UsmMessages,
  context: ViewRenderContext<UsmState>,
  filterMenu: FilterMenu,
): TemplateResult => html`<div class="map-toolbar" data-testid="usm-map-toolbar">
  ${renderMapFilter(m, context, filterMenu)} ${renderHighlightToggle(m, context)}
</div>`;

export const mapToolbarStyles = css`
  .map-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
    padding: 5px 24px;
    border-bottom: 1px solid var(--dpk-rule);
  }
`;
