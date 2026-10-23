export { DpkInternalLayoutApp } from './element';

import { DpkInternalLayoutApp } from './element';

export const defineLayoutApp = (): void => {
  if (!customElements.get('dpk-internal-layout-app'))
    customElements.define('dpk-internal-layout-app', DpkInternalLayoutApp);
};
