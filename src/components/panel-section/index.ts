export { DpkPanelSection } from './element';

import { DpkPanelSection } from './element';

export const definePanelSection = (): void => {
  if (!customElements.get('dpk-panel-section')) customElements.define('dpk-panel-section', DpkPanelSection);
};
