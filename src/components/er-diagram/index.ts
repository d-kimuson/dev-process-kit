export { DpkComponentErDiagram } from './element';
export { erDiagramMessages } from './messages';
export type { ErDiagramMessages } from './messages';
export {
  TABLE_WIDTH,
  cardinalityText,
  emptyErData,
  fieldOffset,
  fieldRowHeight,
  parseErData,
  tableHeight,
} from './model';
export type {
  ErCardinality,
  ErData,
  ErField,
  ErFieldDiff,
  ErKey,
  ErMultiplicity,
  ErRelation,
  ErRelationMeaning,
  ErStatus,
  ErTableDiff,
} from './model';

import { DpkComponentErDiagram } from './element';

export const defineErDiagram = (): void => {
  if (!customElements.get('dpk-component-er-diagram'))
    customElements.define('dpk-component-er-diagram', DpkComponentErDiagram);
};
