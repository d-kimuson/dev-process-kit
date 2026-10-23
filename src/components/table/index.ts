export { DpkTable } from './element';
export { tableMessages } from './messages';
export type { TableMessages } from './messages';
export {
  ADD_ROW,
  DELETE_ROW,
  emptyTableData,
  parseTableData,
  reduceTableActions,
  REORDER_ROW,
  rowTarget,
  SET_CELL,
  tableRowsTarget,
  visibleGroups,
} from './model';
export type {
  SortDirection,
  TableCellValue,
  TableColumn,
  TableColumnType,
  TableData,
  TableGroup,
  TableRow,
  TableStatusValue,
  TableTone,
  TableViewState,
} from './model';

import { DpkTable } from './element';

export const defineTable = (): void => {
  if (!customElements.get('dpk-table')) customElements.define('dpk-table', DpkTable);
};
