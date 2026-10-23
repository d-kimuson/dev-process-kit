export { DpkMatrix } from './element';
export {
  allLeaves,
  cellSlot,
  columnHeadSlot,
  CORNER_SLOT,
  CORNER_SUB_SLOT,
  hasSubColumns,
  leafDraggable,
  leavesOf,
  MATRIX_REORDER_COLUMN_EVENT,
  MATRIX_REORDER_ROW_EVENT,
  MATRIX_REORDER_SUB_COLUMN_EVENT,
  rowHeadSlot,
  spanOf,
  subColumnEdgeOf,
  subColumnHeadSlot,
} from './model';
export type {
  MatrixColumn,
  MatrixLeaf,
  MatrixReorderColumnDetail,
  MatrixReorderRowDetail,
  MatrixReorderSubColumnDetail,
  MatrixRow,
  MatrixSubColumn,
} from './model';

import { DpkMatrix } from './element';

export const defineMatrix = (): void => {
  if (!customElements.get('dpk-matrix')) customElements.define('dpk-matrix', DpkMatrix);
};
