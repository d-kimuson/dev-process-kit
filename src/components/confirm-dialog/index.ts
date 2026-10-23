export { DpkConfirmDialog } from './element';
export type { ConfirmDialogOptions } from './element';

import { DpkConfirmDialog } from './element';

export const defineConfirmDialog = (): void => {
  if (!customElements.get('dpk-confirm-dialog')) customElements.define('dpk-confirm-dialog', DpkConfirmDialog);
};
