import * as v from 'valibot';

import type { ElementActionResult } from '../../core/element-actions';
import type { DraftAction } from '../../core/types';
import type { TableMessages } from './messages';

import { elementRefSegments } from '../diagram/model';

/**
 * Domain model of a generic table of records: typed columns, authored once,
 * and rows a reviewer can sort, group and filter without touching the data,
 * plus add, edit, delete and reorder through element actions (`reduceTableActions`)
 * the same way `dpk-kanban` records moves and new cards.
 */

export const TABLE_TONES = ['gray', 'blue', 'green', 'amber', 'violet', 'red'] as const;
export type TableTone = (typeof TABLE_TONES)[number];

export const TABLE_COLUMN_TYPES = ['text', 'number', 'tag', 'status', 'person'] as const;
export type TableColumnType = (typeof TABLE_COLUMN_TYPES)[number];

export type TableColumn = {
  readonly id: string;
  readonly label: string;
  readonly type: TableColumnType;
  readonly sortable: boolean;
};

export type TableStatusValue = { readonly label: string; readonly tone: TableTone };

export type TableCellValue =
  | { readonly type: 'text'; readonly value: string | null }
  | { readonly type: 'number'; readonly value: number | null }
  | { readonly type: 'tag'; readonly value: readonly string[] }
  | { readonly type: 'status'; readonly value: TableStatusValue | null }
  | { readonly type: 'person'; readonly value: string | null };

export type TableRow = {
  readonly id: string;
  readonly cells: Readonly<Record<string, TableCellValue>>;
  /** Question references for the page's questions (see `docs/index.md`, Questions (grill)). */
  readonly questions?: string;
};

export type TableData = {
  readonly columns: readonly TableColumn[];
  readonly rows: readonly TableRow[];
};

export const emptyTableData = (): TableData => ({ columns: [], rows: [] });

/* -------------------------------------------------------------------- parse */

const columnSchema = v.strictObject({
  id: v.pipe(v.string(), v.minLength(1)),
  label: v.pipe(v.string(), v.minLength(1)),
  type: v.picklist(TABLE_COLUMN_TYPES),
  sortable: v.optional(v.boolean()),
});

const statusValueSchema = v.strictObject({ label: v.string(), tone: v.picklist(TABLE_TONES) });

/** Loosely-shaped raw cell: which shape is actually allowed depends on the column's type. */
const rawCellSchema = v.union([v.string(), v.number(), v.null(), v.array(v.string()), statusValueSchema]);

const rowSchema = v.strictObject({
  id: v.pipe(v.string(), v.minLength(1)),
  cells: v.optional(v.record(v.string(), rawCellSchema), {}),
  questions: v.optional(v.string()),
});

const tableSchema = v.strictObject({
  columns: v.array(columnSchema),
  rows: v.optional(v.array(rowSchema), []),
});

/** A cell's raw JSON shape, before it is checked against its column's declared type. */
type RawCell = string | number | readonly string[] | TableStatusValue | null;

const parseCell = (column: TableColumn, raw: RawCell | undefined): TableCellValue => {
  switch (column.type) {
    case 'text':
      if (raw === undefined || raw === null) return { type: 'text', value: null };
      if (typeof raw === 'string') return { type: 'text', value: raw };
      break;
    case 'number':
      if (raw === undefined || raw === null) return { type: 'number', value: null };
      if (typeof raw === 'number') return { type: 'number', value: raw };
      break;
    case 'person':
      if (raw === undefined || raw === null) return { type: 'person', value: null };
      if (typeof raw === 'string') return { type: 'person', value: raw };
      break;
    case 'tag':
      if (raw === undefined) return { type: 'tag', value: [] };
      if (Array.isArray(raw)) return { type: 'tag', value: raw };
      break;
    case 'status':
      if (raw === undefined || raw === null) return { type: 'status', value: null };
      if (typeof raw === 'object' && !Array.isArray(raw) && 'tone' in raw) return { type: 'status', value: raw };
      break;
  }
  throw new Error(`cell for column "${column.id}" does not match its type "${column.type}"`);
};

export const parseTableData = (input: unknown): TableData => {
  const parsed = v.parse(tableSchema, input);
  const columnIds = new Set<string>();
  const columns: TableColumn[] = parsed.columns.map((column): TableColumn => {
    if (columnIds.has(column.id)) throw new Error(`duplicate column id: ${column.id}`);
    columnIds.add(column.id);
    return { id: column.id, label: column.label, type: column.type, sortable: column.sortable ?? true };
  });
  const byId = new Map(columns.map((column) => [column.id, column]));
  const rowIds = new Set<string>();
  const rows: TableRow[] = parsed.rows.map((row): TableRow => {
    if (rowIds.has(row.id)) throw new Error(`duplicate row id: ${row.id}`);
    rowIds.add(row.id);
    for (const key of Object.keys(row.cells)) {
      if (!byId.has(key)) throw new Error(`row "${row.id}" has a cell for unknown column "${key}"`);
    }
    const cells: Record<string, TableCellValue> = {};
    for (const column of columns) cells[column.id] = parseCell(column, row.cells[column.id] as RawCell | undefined);
    return row.questions === undefined ? { id: row.id, cells } : { id: row.id, cells, questions: row.questions };
  });
  return { columns, rows };
};

/* --------------------------------------------------------------- view state */

export type SortDirection = 'asc' | 'desc';

export type TableViewState = {
  readonly sort: { readonly column: string; readonly direction: SortDirection } | null;
  readonly groupBy: string | null;
  readonly filter: string;
};

export const INITIAL_VIEW_STATE: TableViewState = { sort: null, groupBy: null, filter: '' };

const cellText = (cell: TableCellValue): string => {
  switch (cell.type) {
    case 'text':
    case 'person':
      return cell.value ?? '';
    case 'number':
      return cell.value === null ? '' : String(cell.value);
    case 'tag':
      return cell.value.join(' ');
    case 'status':
      return cell.value?.label ?? '';
  }
};

const cellCompareKey = (cell: TableCellValue): string | number => {
  if (cell.type === 'number') return cell.value ?? -Infinity;
  return cellText(cell).toLowerCase();
};

export const matchesFilter = (row: TableRow, filter: string): boolean => {
  const needle = filter.trim().toLowerCase();
  if (needle === '') return true;
  return Object.values(row.cells).some((cell) => cellText(cell).toLowerCase().includes(needle));
};

export type TableGroup = { readonly key: string; readonly label: string; readonly rows: readonly TableRow[] };

/** Applies filter, sort and grouping to the authored rows, in that order. Pure. */
export const visibleGroups = (data: TableData, view: TableViewState): readonly TableGroup[] => {
  const filtered = data.rows.filter((row) => matchesFilter(row, view.filter));
  const sort = view.sort;
  const sorted =
    sort === null
      ? filtered
      : [...filtered].sort((a, b) => {
          const left = cellCompareKey(a.cells[sort.column] ?? { type: 'text', value: null });
          const right = cellCompareKey(b.cells[sort.column] ?? { type: 'text', value: null });
          const cmp = left < right ? -1 : left > right ? 1 : 0;
          return sort.direction === 'asc' ? cmp : -cmp;
        });
  if (view.groupBy === null) return [{ key: '', label: '', rows: sorted }];
  const groupBy = view.groupBy;
  const order: string[] = [];
  const byKey = new Map<string, TableRow[]>();
  for (const row of sorted) {
    const cell = row.cells[groupBy];
    const label = cell === undefined ? '' : cellText(cell);
    const key = label === '' ? '\u0000empty' : label;
    if (!byKey.has(key)) {
      order.push(key);
      byKey.set(key, []);
    }
    byKey.get(key)?.push(row);
  }
  return order.map((key) => ({ key, label: key === '\u0000empty' ? '' : key, rows: byKey.get(key) ?? [] }));
};

/* ---------------------------------------------------------- element actions */

export const ADD_ROW = 'ADD_ROW';
export const SET_CELL = 'SET_CELL';
export const DELETE_ROW = 'DELETE_ROW';
export const REORDER_ROW = 'REORDER_ROW';

/** `<table-id>/table/rows` — the row collection as a whole, the target `ADD_ROW` appends to. */
export const tableRowsTarget = (tableId: string): string => `element:${encodeURIComponent(tableId)}/table/rows`;

export const rowTarget = (tableId: string, rowId: string): string =>
  `element:${encodeURIComponent(tableId)}/row/${encodeURIComponent(rowId)}`;

const rowIdOfTarget = (targetId: string): string | null => {
  const segments = elementRefSegments(targetId);
  return segments?.length === 3 && segments[1] === 'row' ? (segments[2] ?? null) : null;
};

const isRowsTarget = (targetId: string): boolean => {
  const segments = elementRefSegments(targetId);
  return segments?.length === 3 && segments[1] === 'table' && segments[2] === 'rows';
};

const rawCellValueSchema = v.union([v.string(), v.number(), v.null(), v.array(v.string()), statusValueSchema]);

const addRowPayloadSchema = v.object({
  id: v.pipe(v.string(), v.minLength(1)),
  cells: v.optional(v.record(v.string(), rawCellValueSchema), {}),
});

const setCellPayloadSchema = v.object({ column: v.pipe(v.string(), v.minLength(1)), value: rawCellValueSchema });

const reorderPayloadSchema = v.object({ before: v.union([v.string(), v.null()]) });

/**
 * Replays `ADD_ROW` / `SET_CELL` / `DELETE_ROW` / `REORDER_ROW` element actions
 * over the authored table, in order. Each action is reported on: applied, or
 * why it is stale. Pure.
 */
export const reduceTableActions = (
  m: TableMessages,
  data: TableData,
  actions: readonly DraftAction[],
): { readonly data: TableData; readonly results: readonly ElementActionResult[] } => {
  let rows = [...data.rows];
  const byId = (id: string): number => rows.findIndex((row) => row.id === id);
  const results: ElementActionResult[] = actions.map((action): ElementActionResult => {
    if (action.type === ADD_ROW) {
      if (!isRowsTarget(action.target.id)) return { id: action.id, title: m.addRowTitle, stale: 'target-missing' };
      const payload = v.safeParse(addRowPayloadSchema, action.payload);
      if (!payload.success || byId(payload.output.id) >= 0) {
        return { id: action.id, title: m.addRowTitle, stale: 'constraint-violated' };
      }
      const cells: Record<string, TableCellValue> = {};
      for (const column of data.columns) {
        cells[column.id] = parseCell(column, payload.output.cells[column.id] as RawCell | undefined);
      }
      rows = [...rows, { id: payload.output.id, cells }];
      return { id: action.id, title: m.addRowTitle, summary: m.addRowSummary(payload.output.id), tone: 'create' };
    }
    if (action.type === SET_CELL) {
      const rowId = rowIdOfTarget(action.target.id);
      const index = rowId === null ? -1 : byId(rowId);
      const payload = v.safeParse(setCellPayloadSchema, action.payload);
      const row = index < 0 ? undefined : rows[index];
      if (row === undefined || !payload.success) {
        return { id: action.id, title: m.setCellTitle, stale: 'target-missing' };
      }
      const column = data.columns.find((candidate) => candidate.id === payload.output.column);
      if (column === undefined) return { id: action.id, title: m.setCellTitle, stale: 'constraint-violated' };
      let cell: TableCellValue;
      try {
        cell = parseCell(column, payload.output.value as RawCell);
      } catch {
        return { id: action.id, title: m.setCellTitle, stale: 'constraint-violated' };
      }
      rows = rows.map((candidate, i) =>
        i === index ? { ...candidate, cells: { ...candidate.cells, [column.id]: cell } } : candidate,
      );
      return { id: action.id, title: m.setCellTitle, summary: m.setCellSummary(row.id, column.label), tone: 'update' };
    }
    if (action.type === DELETE_ROW) {
      const rowId = rowIdOfTarget(action.target.id);
      const index = rowId === null ? -1 : byId(rowId);
      if (index < 0) return { id: action.id, title: m.deleteRowTitle, stale: 'target-missing' };
      const row = rows[index];
      rows = rows.filter((_, i) => i !== index);
      return { id: action.id, title: m.deleteRowTitle, summary: m.deleteRowSummary(row?.id ?? ''), tone: 'delete' };
    }
    if (action.type === REORDER_ROW) {
      const rowId = rowIdOfTarget(action.target.id);
      const index = rowId === null ? -1 : byId(rowId);
      const payload = v.safeParse(reorderPayloadSchema, action.payload);
      if (index < 0 || !payload.success) return { id: action.id, title: m.reorderRowTitle, stale: 'target-missing' };
      const before = payload.output.before;
      const beforeIndex = before === null ? rows.length : byId(before);
      if (before !== null && (beforeIndex < 0 || before === rowId)) {
        return { id: action.id, title: m.reorderRowTitle, stale: 'constraint-violated' };
      }
      const row = rows[index];
      if (row === undefined) return { id: action.id, title: m.reorderRowTitle, stale: 'target-missing' };
      const withoutRow = rows.filter((_, i) => i !== index);
      const insertAt =
        before === null ? withoutRow.length : withoutRow.findIndex((candidate) => candidate.id === before);
      rows =
        insertAt < 0 ? [...withoutRow, row] : [...withoutRow.slice(0, insertAt), row, ...withoutRow.slice(insertAt)];
      return { id: action.id, title: m.reorderRowTitle, summary: m.reorderRowSummary(row.id), tone: 'move' };
    }
    return { id: action.id, title: action.type, stale: 'unsupported-action-type' };
  });
  return { data: { columns: data.columns, rows }, results };
};
