/**
 * The side panel: the selected element's detail and the author's sections
 * beside the main column. The owner (`<dpk-page>`, a standalone view or
 * board) keeps a `PanelOwner` and draws `<dpk-internal-layout-panel>` around
 * its body; a board finds the owner with `panelHostOf`.
 */
export { PANEL_HOST, panelHostOf } from './host';
export type { DetailReport, PanelDetail, PanelHost, PanelSectionSpec } from './host';
export { panelMessages } from './messages';
export { DETAIL_SECTION, PANEL_WIDTH, parsePanelMode } from './model';
export type { DetailIntent, PanelMode } from './model';
export { PANEL_ACTIVE_ATTRIBUTE, PANEL_CHANGE_EVENT, PANEL_STATE_EVENT, PanelOwner } from './owner';
export type { PanelChangeDetail, PanelOwnerOptions } from './owner';
