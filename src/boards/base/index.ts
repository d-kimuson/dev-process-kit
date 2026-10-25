/**
 * Shared diagram foundation.
 *
 * `BoardCanvasElement` owns the interaction every graph-shaped diagram has (data
 * intake, tag filter, layout, selection, pan/zoom, contextual comments); the pure
 * helpers next to it are the parts a component reuses directly.
 */
export { BoardCanvasElement } from './element';
export { diagramMessages } from './messages';
export type { DiagramMessages } from './messages';
export { diagramStyles } from './styles';
export {
  EMPTY_REACH,
  EMPTY_TAG_STATE,
  classNames,
  clearTags,
  cycleMembership,
  findCycles,
  isCycleEdge,
  reach,
  setTagMatch,
  stateOf,
  tagCounts,
  tagStateMatches,
  toggleTag,
} from './model';
export type {
  DiagramData,
  DiagramEdgeInput,
  DiagramEdgeRef,
  DiagramNodeInput,
  DiagramSelection,
  ElementState,
  Reach,
  TagCount,
  TagMatch,
  TagState,
} from './model';
export { changeSummary, presentStats } from './present';
export { constrainView, createViewport, expandedBounds, MAX_SCALE, MIN_SCALE } from './viewport';
export type {
  ViewState,
  ViewportAlign,
  ViewportBounds,
  ViewportBox,
  ViewportController,
  ViewportOptions,
} from './viewport';
export { arrowDefinitions, pathData } from './view';
export type { ArrowDefinition } from './view';
