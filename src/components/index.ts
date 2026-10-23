/**
 * The framework's built-in custom elements. These are part of the public
 * contract (`dpk-comment-panel`, `dpk-inline-edit`), so they live
 * outside `src/core` together with their registration.
 */
export { DpkInlineEdit, defineInlineEdit } from './inline-edit';
export { DpkCommentPanel, defineCommentPanel } from './comment-panel/index';
export type { CommentPanelCallbacks } from './comment-panel/index';
export { DpkStateDiagram, defineStateDiagram, parseStateData } from './state-diagram/index';
export type { StateDiagramData, StateNode, StateTransition } from './state-diagram/index';
export { DpkSequenceDiagram, defineSequenceDiagram, parseSequenceData } from './sequence-diagram/index';
export type { SequenceDiagramData, SequenceMessage, SequenceParticipant } from './sequence-diagram/index';
export { DpkDependencyGraph, defineDependencyGraph } from './dependency-graph/index';
export type { DependencyData, DependencyModule } from './dependency-graph/index';
export { DpkErDiagram, defineErDiagram } from './er-diagram/index';
export type { ErData, ErTableDiff } from './er-diagram/index';
export { DpkArchitectureMap, defineArchitectureMap } from './architecture-map/index';
export type { ArchitectureData, ArchitectureService } from './architecture-map/index';
export { DpkMindMap, defineMindMap, parseMindMapData } from './mind-map/index';
export type { MindMapData, MindMapNode, MindMapSide } from './mind-map/index';
export { DpkKanban, defineKanban, parseKanbanData } from './kanban/index';
export type { KanbanCard, KanbanColor, KanbanColumn, KanbanData } from './kanban/index';
export { DpkExampleMapping, defineExampleMapping } from './example-mapping/index';
export type { ExampleMappingState, MappingCard, MappingCardKind } from './example-mapping/index';
export { DpkWhiteboard, defineWhiteboard } from './whiteboard/index';
export type { WhiteboardState } from './whiteboard/index';
export { DpkEventStorming, defineEventStorming } from './event-storming/index';
export type { EventStormingState } from './event-storming/index';
export { DpkFormalSpec, defineFormalSpec, parseFormalSpecData } from './formal-spec/index';
export type { Assurance, Claim, Clause, FormalSpecData, Term } from './formal-spec/index';
export { atomStyles, cardAtom, controlAtom, defineAtomStyles, mockAtom } from './atoms/index';
export { DpkCommentable, defineCommentable } from './commentable/index';
export { DpkCommentPopover, defineCommentPopover } from './comment-popover/index';
export { DpkCommentThread, defineCommentThread } from './comment-thread/index';
export type { CommentThreadItem } from './comment-thread/index';
export { DpkTabs, defineTabs } from './tabs/index';
export { DpkChecklist, defineChecklist, parseChecklistData } from './checklist/index';
export type { ChecklistData, ChecklistItem } from './checklist/index';
export { DpkCode, defineCode } from './code/index';
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

import { defineArchitectureMap } from './architecture-map/index';
import { defineAtomStyles } from './atoms/index';
import { defineBrowser } from './browser/index';
import { defineChecklist } from './checklist/index';
import { defineCode } from './code/index';
import { defineCombobox } from './combobox/index';
import { defineCommentPanel } from './comment-panel/index';
import { defineCommentPopover } from './comment-popover/index';
import { defineCommentThread } from './comment-thread/index';
import { defineCommentable } from './commentable/index';
import { defineConfirmDialog } from './confirm-dialog/index';
import { defineDependencyGraph } from './dependency-graph/index';
import { defineDialogPanel } from './dialog-panel/index';
import { defineErDiagram } from './er-diagram/index';
import { defineEventStorming } from './event-storming/index';
import { defineExampleMapping } from './example-mapping/index';
import { defineFormalSpec } from './formal-spec/index';
import { defineInlineEdit } from './inline-edit';
import { defineKanban } from './kanban/index';
import { defineMatrix } from './matrix/index';
import { defineMindMap } from './mind-map/index';
import { defineSelect } from './select/index';
import { defineSelectionBar } from './selection-bar/index';
import { defineSequenceDiagram } from './sequence-diagram/index';
import { defineStateDiagram } from './state-diagram/index';
import { defineTable } from './table/index';
import { defineTabs } from './tabs/index';
import { defineTagFilter } from './tag-filter/index';
import { defineWhiteboard } from './whiteboard/index';

/** Registers the diagram elements (idempotent). */
export const registerDiagramElements = (): void => {
  defineStateDiagram();
  defineSequenceDiagram();
  defineDependencyGraph();
  defineErDiagram();
  defineArchitectureMap();
  defineMindMap();
  defineKanban();
  defineExampleMapping();
  defineWhiteboard();
  defineEventStorming();
};

/**
 * Registers the built-in custom elements (idempotent).
 *
 * The name is kept from when these elements lived in `src/core`: it is exported
 * from the public entrypoint and referenced by the docs.
 */
export const registerComponentElements = (): void => {
  defineCommentPanel();
  defineInlineEdit();
  registerDiagramElements();
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
  defineCombobox();
  defineSelect();
  defineDialogPanel();
  defineTagFilter();
  defineBrowser();
  defineSelectionBar();
  defineConfirmDialog();
};
