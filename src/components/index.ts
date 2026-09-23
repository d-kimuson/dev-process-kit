/**
 * The framework's built-in custom elements. These are part of the public
 * contract (`dpk-component-comment-panel`, `dpk-component-inline-edit`), so they live
 * outside `src/core` together with their registration.
 */
export { DpkComponentInlineEdit, defineInlineEdit } from './inline-edit';
export { DpkComponentCommentPanel, defineCommentPanel } from './comment-panel/index';
export type { CommentPanelCallbacks } from './comment-panel/index';
export { DpkComponentStateDiagram, defineStateDiagram, parseStateData } from './state-diagram/index';
export type { StateDiagramData, StateNode, StateTransition } from './state-diagram/index';
export { DpkComponentSequenceDiagram, defineSequenceDiagram, parseSequenceData } from './sequence-diagram/index';
export type { SequenceDiagramData, SequenceMessage, SequenceParticipant } from './sequence-diagram/index';
export { DpkComponentDependencyGraph, defineDependencyGraph } from './dependency-graph/index';
export type { DependencyData, DependencyModule } from './dependency-graph/index';
export { DpkComponentErDiagram, defineErDiagram } from './er-diagram/index';
export type { ErData, ErTableDiff } from './er-diagram/index';
export { DpkComponentArchitectureMap, defineArchitectureMap } from './architecture-map/index';
export type { ArchitectureData, ArchitectureService } from './architecture-map/index';
export { DpkComponentMindMap, defineMindMap, parseMindMapData } from './mind-map/index';
export type { MindMapData, MindMapNode, MindMapSide } from './mind-map/index';
export { DpkComponentKanban, defineKanban, parseKanbanData } from './kanban/index';
export type { KanbanCard, KanbanColor, KanbanColumn, KanbanData } from './kanban/index';

import { defineArchitectureMap } from './architecture-map/index';
import { defineCommentPanel } from './comment-panel/index';
import { defineDependencyGraph } from './dependency-graph/index';
import { defineErDiagram } from './er-diagram/index';
import { defineInlineEdit } from './inline-edit';
import { defineKanban } from './kanban/index';
import { defineMindMap } from './mind-map/index';
import { defineSequenceDiagram } from './sequence-diagram/index';
import { defineStateDiagram } from './state-diagram/index';

/** Registers the diagram elements (idempotent). */
export const registerDiagramElements = (): void => {
  defineStateDiagram();
  defineSequenceDiagram();
  defineDependencyGraph();
  defineErDiagram();
  defineArchitectureMap();
  defineMindMap();
  defineKanban();
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
};
