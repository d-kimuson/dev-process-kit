export { DpkInternalLayoutSidebar } from './element';
export { DEFAULT_SIDEBAR_LAYOUT, DEFAULT_SIDEBAR_PANE, SIDEBAR_WIDTH } from './model';
export type { SidebarLayout, SidebarNarrow, SidebarPane, SidebarSide } from './model';

import { DpkInternalLayoutSidebar } from './element';

export const defineLayoutSidebar = (): void => {
  if (!customElements.get('dpk-internal-layout-sidebar'))
    customElements.define('dpk-internal-layout-sidebar', DpkInternalLayoutSidebar);
};
