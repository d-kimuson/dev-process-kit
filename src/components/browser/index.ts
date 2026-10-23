export { DpkBrowser } from './element';

import { DpkBrowser } from './element';

export const defineBrowser = (): void => {
  if (!customElements.get('dpk-browser')) customElements.define('dpk-browser', DpkBrowser);
};
