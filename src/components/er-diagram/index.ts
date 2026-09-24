export { DpkComponentErDiagram } from './element';
export { erDiagramMessages } from './messages';
export type { ErDiagramMessages } from './messages';
export { TABLE_WIDTH, emptyErData, fieldOffset, fieldRowHeight, parseErData, tableHeight } from './model';
export type { ErData, ErField, ErFieldDiff, ErKey, ErRelation, ErStatus, ErTableDiff } from './model';

import { DpkComponentErDiagram } from './element';

export const defineErDiagram = (): void => {
  if (!customElements.get('dpk-component-er-diagram'))
    customElements.define('dpk-component-er-diagram', DpkComponentErDiagram);
};
