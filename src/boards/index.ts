/**
 * The board tier: embeddable visual surfaces that can also fill a page.
 *
 * A board is `BoardChromeBase` (or `BoardCanvasElement` for the pan/zoom
 * graphs). It can sit inside a view, or be the content of `<dpk-page>`.
 * Components that never fill a page stay in `src/components`.
 */
export { BoardChromeBase, isActionPayload } from './base/element';
export { BoardCanvasChromeElement, BoardCanvasElement } from './base/element';
export { diagramMessages } from './base/messages';
export type { DiagramMessages } from './base/messages';
export { diagramStyles } from './base/styles';
export { DpkBoardArchitectureMap, defineArchitectureMap } from './architecture-map/index';
export type {
  ArchitectureBoundary,
  ArchitectureData,
  ArchitectureLink,
  ArchitectureService,
  BoundaryBox,
  BoundaryKind,
  ServiceArtwork,
} from './architecture-map/index';
export { DpkBoardDependencyGraph, defineDependencyGraph } from './dependency-graph/index';
export type { DependencyData, DependencyDirection, DependencyLink, DependencyModule } from './dependency-graph/index';
export { DpkBoardErDiagram, defineErDiagram } from './er-diagram/index';
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
} from './er-diagram/index';
export { DpkBoardEventStorming, defineEventStorming } from './event-storming/index';
export type { EventStormingState } from './event-storming/index';
export { DpkBoardExampleMapping, defineExampleMapping } from './example-mapping/index';
export type { ExampleMappingState, MappingCard, MappingCardKind } from './example-mapping/index';
export { DpkBoardKanban, defineKanban } from './kanban/index';
export type { KanbanCard, KanbanColor, KanbanColumn, KanbanData } from './kanban/index';
export { DpkBoardMindMap, defineMindMap } from './mind-map/index';
export type { MindMapData, MindMapNode, MindMapSide } from './mind-map/index';
export { DpkBoardSequenceDiagram, defineSequenceDiagram } from './sequence-diagram/index';
export type { SequenceDiagramData, SequenceMessage, SequenceParticipant } from './sequence-diagram/index';
export { DpkBoardStateDiagram, defineStateDiagram } from './state-diagram/index';
export type { StateDiagramData, StateNode, StateTransition } from './state-diagram/index';
export { DpkBoardWhiteboard, defineWhiteboard } from './whiteboard/index';
export type { WhiteboardState } from './whiteboard/index';

import { defineArchitectureMap } from './architecture-map/index';
import { defineDependencyGraph } from './dependency-graph/index';
import { defineErDiagram } from './er-diagram/index';
import { defineEventStorming } from './event-storming/index';
import { defineExampleMapping } from './example-mapping/index';
import { defineKanban } from './kanban/index';
import { defineMindMap } from './mind-map/index';
import { defineSequenceDiagram } from './sequence-diagram/index';
import { defineStateDiagram } from './state-diagram/index';
import { defineWhiteboard } from './whiteboard/index';

/** Registers every board element (idempotent). */
export const registerBoardElements = (): void => {
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
