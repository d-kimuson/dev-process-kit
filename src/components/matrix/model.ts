/**
 * `<dpk-matrix>`'s data model: rows and columns are plain ids the host
 * assigns; the host supplies every head's and cell's content itself through
 * named slots (see the slot-name builders below) so it keeps its own CSS
 * scope and markup. A column may carry sub-columns (a two-level header, the
 * way USM's activity view bands steps under their activity); a column
 * without any is the degenerate, single-level case.
 */

/** One row of the matrix; `draggable: false` excludes it from both dragging and being a drop anchor (e.g. a trailing "unassigned" or "add" row). */
export type MatrixRow = {
  readonly id: string;
  readonly draggable?: boolean;
};

/** One leaf column nested under a `MatrixColumn` that declares `subColumns`. */
export type MatrixSubColumn = {
  readonly id: string;
  readonly draggable?: boolean;
};

/** One top-level column. Without `subColumns` it is itself the leaf; with them, it bands its sub-columns under one head. */
export type MatrixColumn = {
  readonly id: string;
  readonly draggable?: boolean;
  readonly subColumns?: readonly MatrixSubColumn[];
};

/** One addressable leaf column slot: a plain column, or one of its sub-columns. */
export type MatrixLeaf = {
  readonly columnId: string;
  readonly subColumnId?: string;
};

/** Whether any column declares sub-columns; decides whether the matrix renders one or two header rows. */
export const hasSubColumns = (columns: readonly MatrixColumn[]): boolean =>
  columns.some((column) => (column.subColumns?.length ?? 0) > 0);

/** How many leaf columns a column spans in the grid: its sub-columns, or 1 when it has none. */
export const spanOf = (column: MatrixColumn): number => Math.max(column.subColumns?.length ?? 1, 1);

/** The leaf columns under one column, in order. */
export const leavesOf = (column: MatrixColumn): readonly MatrixLeaf[] => {
  const subs = column.subColumns ?? [];
  if (subs.length === 0) return [{ columnId: column.id }];
  return subs.map((sub) => ({ columnId: column.id, subColumnId: sub.id }));
};

/** Every leaf column across every column, in order. */
export const allLeaves = (columns: readonly MatrixColumn[]): readonly MatrixLeaf[] => columns.flatMap(leavesOf);

/** Whether a leaf's own column (or sub-column) is draggable, the way a row's own flag is read. */
export const leafDraggable = (column: MatrixColumn, leaf: MatrixLeaf): boolean => {
  if (leaf.subColumnId === undefined) return column.draggable !== false;
  return (column.subColumns ?? []).find((sub) => sub.id === leaf.subColumnId)?.draggable !== false;
};

/** Where a sub-column stands in its own column's span (`first`, `last`, both or neither): a lit column draws its sides only along its outer sub-columns. */
export const subColumnEdgeOf = (column: MatrixColumn, subColumnId: string): string => {
  const subs = column.subColumns ?? [];
  return [subs[0]?.id === subColumnId ? 'first' : '', subs.at(-1)?.id === subColumnId ? 'last' : '']
    .filter((edge) => edge !== '')
    .join(' ');
};

/** Slot names: stable, collision-free addressing of host-supplied content. Ids never contain `:` (see `core/target`'s `slugify`), so it is a safe delimiter. */
export const CORNER_SLOT = 'corner';
export const CORNER_SUB_SLOT = 'corner-sub';

export const rowHeadSlot = (rowId: string): string => `row-head:${rowId}`;
export const columnHeadSlot = (columnId: string): string => `col-head:${columnId}`;
export const subColumnHeadSlot = (columnId: string, subColumnId: string): string =>
  `sub-head:${columnId}:${subColumnId}`;

export const cellSlot = (rowId: string, leaf: MatrixLeaf): string =>
  leaf.subColumnId === undefined
    ? `cell:${rowId}:${leaf.columnId}`
    : `cell:${rowId}:${leaf.columnId}:${leaf.subColumnId}`;

/** What a row reorder drop dispatches: `after` is the sibling id to land after (`null` = first), matching the host's own reorder actions. */
export type MatrixReorderRowDetail = {
  readonly rowId: string;
  readonly after: string | null;
};

/** What a column reorder drop dispatches. */
export type MatrixReorderColumnDetail = {
  readonly columnId: string;
  readonly after: string | null;
};

/** What a sub-column reorder drop dispatches; a sub-column only reorders within its own column. */
export type MatrixReorderSubColumnDetail = {
  readonly columnId: string;
  readonly subColumnId: string;
  readonly after: string | null;
};

export const MATRIX_REORDER_ROW_EVENT = 'dpk-matrix-reorder-row';
export const MATRIX_REORDER_COLUMN_EVENT = 'dpk-matrix-reorder-column';
export const MATRIX_REORDER_SUB_COLUMN_EVENT = 'dpk-matrix-reorder-sub-column';
