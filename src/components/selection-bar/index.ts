export { DpkSelectionBar } from './element';

import { DpkSelectionBar } from './element';

export const defineSelectionBar = (): void => {
  if (!customElements.get('dpk-selection-bar')) customElements.define('dpk-selection-bar', DpkSelectionBar);
};
