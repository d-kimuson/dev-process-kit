export { DpkErDiagram } from './element';
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

import { DpkErDiagram } from './element';

export const defineErDiagram = (): void => {
  if (!customElements.get('dpk-er-diagram')) customElements.define('dpk-er-diagram', DpkErDiagram);
};
