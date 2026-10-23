export { DpkDialogPanel } from './element';
export type { CanvasInitial } from './canvas-controller';
export { scrollsInside } from './model';
export type { ScrollBox } from './model';

import { DpkDialogPanel } from './element';

export const defineDialogPanel = (): void => {
  if (!customElements.get('dpk-dialog-panel')) customElements.define('dpk-dialog-panel', DpkDialogPanel);
};
