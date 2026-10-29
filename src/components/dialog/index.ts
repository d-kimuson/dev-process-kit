export { DpkDialog } from './element';
export type { DialogCloseDetail, DialogCloseReason, DialogSize } from './element';

import { DpkDialog } from './element';

export const defineDialog = (): void => {
  if (!customElements.get('dpk-dialog')) customElements.define('dpk-dialog', DpkDialog);
};
