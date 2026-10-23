export { DpkTabs } from './element';
export { keyTarget, selectedIndex } from './model';

import { DpkTabs } from './element';

export const defineTabs = (): void => {
  if (!customElements.get('dpk-tabs')) customElements.define('dpk-tabs', DpkTabs);
};
