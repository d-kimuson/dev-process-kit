/**
 * The component tier: embeddable elements that never fill a page.
 *
 * They sit inside a view, a board's slot, or the app's light DOM; a page's
 * content must be a view (`dpk-view-*`) or a board (`dpk-board-*`).
 */
export { DpkInlineEdit, defineInlineEdit } from './inline-edit';
export { DpkLineChart, defineLineChart } from './line-chart/index';
export type {
  LineChartAxis,
  LineChartData,
  LineChartGuide,
  LineChartMark,
  LineChartPoint,
  LineChartSeries,
  LineChartTone,
} from './line-chart/index';
export { DpkCommentPanel, defineCommentPanel } from './comment-panel/index';
export type { CommentPanelCallbacks } from './comment-panel/index';
export { DpkFormalSpec, defineFormalSpec, parseFormalSpecData } from './formal-spec/index';
export type { Assurance, Claim, Clause, FormalSpecData, Term } from './formal-spec/index';
export { atomStyles, cardAtom, controlAtom, defineAtomStyles, mockAtom } from './atoms/index';
export { DpkCommentable, defineCommentable } from './commentable/index';
export { DpkExtendRightClick, defineExtendRightClick, parseExtendRightClickData } from './extend-right-click/index';
export type {
  ExtendRightClickConfig,
  ExtendRightClickEntry,
  ExtendRightClickGroup,
  ExtendRightClickItem,
  ExtendRightClickRunDetail,
  ExtendRightClickSubmenu,
  ExtendRightClickTarget,
} from './extend-right-click/index';
export { DpkCommentPopover, defineCommentPopover } from './comment-popover/index';
export { DpkCommentThread, defineCommentThread } from './comment-thread/index';
export type { CommentThreadItem } from './comment-thread/index';
export { DpkTabs, defineTabs } from './tabs/index';
export { DpkChecklist, defineChecklist, parseChecklistData } from './checklist/index';
export type { ChecklistData, ChecklistItem } from './checklist/index';
export { DpkCode, defineCode } from './code/index';
export { DpkCodeGroup, defineCodeGroup, parseCodeGroupData } from './code-group/index';
export type { CodeGroupData, CodeGroupVariant } from './code-group/index';
export { DpkDialogPanel, defineDialogPanel } from './dialog-panel/index';
export type { CanvasInitial } from './dialog-panel/index';
export { DpkBrowser, defineBrowser } from './browser/index';
export { DpkTagFilter, defineTagFilter, parseTagFilterData } from './tag-filter/index';
export type { TagFilterOption } from './tag-filter/index';
export { DpkTable, defineTable, parseTableData } from './table/index';
export type { TableColumn, TableColumnType, TableData, TableRow } from './table/index';
export {
  allLeaves,
  cellSlot,
  columnHeadSlot,
  CORNER_SLOT,
  CORNER_SUB_SLOT,
  DpkMatrix,
  defineMatrix,
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
} from './matrix/index';
export type {
  MatrixColumn,
  MatrixLeaf,
  MatrixReorderColumnDetail,
  MatrixReorderRowDetail,
  MatrixReorderSubColumnDetail,
  MatrixRow,
  MatrixSubColumn,
} from './matrix/index';
export { DpkCombobox, defineCombobox, parseComboboxData } from './combobox/index';
export type { ComboboxOption } from './combobox/index';
export { DpkSelect, defineSelect, parseSelectData } from './select/index';
export type { SelectOption } from './select/index';
export { DpkSelectionBar, defineSelectionBar } from './selection-bar/index';
export { DpkConfirmDialog, defineConfirmDialog } from './confirm-dialog/index';
export type { ConfirmDialogOptions } from './confirm-dialog/index';

import { defineAtomStyles } from './atoms/index';
import { defineBrowser } from './browser/index';
import { defineChecklist } from './checklist/index';
import { defineCodeGroup } from './code-group/index';
import { defineCode } from './code/index';
import { defineCombobox } from './combobox/index';
import { defineCommentPanel } from './comment-panel/index';
import { defineCommentPopover } from './comment-popover/index';
import { defineCommentThread } from './comment-thread/index';
import { defineCommentable } from './commentable/index';
import { defineConfirmDialog } from './confirm-dialog/index';
import { defineDialogPanel } from './dialog-panel/index';
import { defineExtendRightClick } from './extend-right-click/index';
import { defineFormalSpec } from './formal-spec/index';
import { defineInlineEdit } from './inline-edit';
import { defineLineChart } from './line-chart/index';
import { defineMatrix } from './matrix/index';
import { defineSelect } from './select/index';
import { defineSelectionBar } from './selection-bar/index';
import { defineTable } from './table/index';
import { defineTabs } from './tabs/index';
import { defineTagFilter } from './tag-filter/index';

/** Registers the built-in components (idempotent). */
export const registerComponentElements = (): void => {
  defineCommentPanel();
  defineInlineEdit();
  defineLineChart();
  defineFormalSpec();
  registerAtoms();
};

/** Registers the atoms: the document-level CSS classes and the small behavioral elements (idempotent). */
export const registerAtoms = (): void => {
  defineAtomStyles();
  defineCommentable();
  defineCommentPopover();
  defineCommentThread();
  defineTabs();
  defineChecklist();
  defineTable();
  defineMatrix();
  defineCode();
  defineCodeGroup();
  defineCombobox();
  defineSelect();
  defineDialogPanel();
  defineTagFilter();
  defineBrowser();
  defineSelectionBar();
  defineConfirmDialog();
  defineExtendRightClick();
};
