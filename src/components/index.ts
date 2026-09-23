/**
 * The framework's built-in custom elements. These are part of the public
 * contract (`artifact-comment-panel`, `artifact-inline-edit`), so they live
 * outside `src/core` together with their registration.
 */
export { ArtifactInlineEdit, defineInlineEdit } from './inline-edit';
export { ArtifactCommentPanel, defineCommentPanel } from './comment-panel/index';
export type { CommentPanelCallbacks } from './comment-panel/index';
export { ArtifactStateDiagram, STATE_DIAGRAM_TAG, defineStateDiagram, parseStateData } from './state-diagram/index';
export type { StateDiagramData, StateNode, StateTransition } from './state-diagram/index';
export {
  ArtifactSequenceDiagram,
  SEQUENCE_DIAGRAM_TAG,
  defineSequenceDiagram,
  parseSequenceData,
} from './sequence-diagram/index';
export type { SequenceDiagramData, SequenceMessage, SequenceParticipant } from './sequence-diagram/index';
export { ArtifactDependencyGraph, DEPENDENCY_GRAPH_TAG, defineDependencyGraph } from './dependency-graph/index';
export type { DependencyData, DependencyModule } from './dependency-graph/index';
export { ArtifactErDiagram, ER_DIAGRAM_TAG, defineErDiagram } from './er-diagram/index';
export type { ErData, ErTableDiff } from './er-diagram/index';
export { ARCHITECTURE_MAP_TAG, ArtifactArchitectureMap, defineArchitectureMap } from './architecture-map/index';
export type { ArchitectureData, ArchitectureService } from './architecture-map/index';
export { ArtifactMindMap, MIND_MAP_TAG, defineMindMap, parseMindMapData } from './mind-map/index';
export type { MindMapData, MindMapNode, MindMapSide } from './mind-map/index';
export { ArtifactKanban, KANBAN_TAG, defineKanban, parseKanbanData } from './kanban/index';
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
export const registerCoreElements = (): void => {
  defineCommentPanel();
  defineInlineEdit();
  registerDiagramElements();
};
