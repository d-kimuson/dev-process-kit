import { registerComponentElements } from './components/index';
import { FRAMEWORK_VERSION } from './core/index';
/**
 * dev-process-kit.
 *
 * The `index.js` entry: every template and every component in one file. Pages that use
 * one template should load that template's entry instead (`templates/<name>.js`); this
 * one is the union, and the entry the docs and samples pin when they do not care.
 *
 * Public contract: custom elements, attributes, properties, DOM
 * events and slots. Lit is an implementation detail and is never re-exported.
 */
import { announce } from './lib/announce';
import { registerTemplateElements } from './templates/index';

export { FRAMEWORK_VERSION } from './core/version';
export {
  TemplateElement,
  DraftController,
  COMMENT_ACTION,
  buildAgentBrief,
  commentBody,
  defineAction,
  derive,
  entityDedupeKey,
  formatHash,
  parseHash,
  patchNavigation,
  payloadFor,
  parseTemplateAction,
  assertNever,
  targetRef,
  parseTargetRef,
  createEntityId,
  slugify,
  MemoryDraftStorage,
  WebStorageDraftStorage,
  defaultStorage,
  defaultStorageKey,
} from './core/index';
export {
  DpkComponentArchitectureMap,
  DpkComponentCommentPanel,
  DpkComponentDependencyGraph,
  DpkComponentErDiagram,
  DpkComponentInlineEdit,
  DpkComponentKanban,
  DpkComponentMindMap,
  DpkComponentSequenceDiagram,
  DpkComponentStateDiagram,
  registerComponentElements,
  registerDiagramElements,
} from './components/index';
export type {
  ArchitectureData,
  ArchitectureService,
  CommentPanelCallbacks,
  DependencyData,
  DependencyModule,
  ErData,
  ErTableDiff,
  KanbanData,
  MindMapData,
  SequenceDiagramData,
  StateDiagramData,
} from './components/index';
export type {
  ActionDescriptor,
  ActionSpec,
  ActionSpecs,
  TemplateAction,
  ActionDescription,
  ActionInput,
  ActionTarget,
  ActionTone,
  TemplateApi,
  TemplateSnapshot,
  CommentTargetOption,
  DispatchOutcome,
  BatchDispatchOutcome,
  DraftAction,
  DraftStorage,
  Navigation,
  NavigationPatch,
  ShellRegions,
  StaleAction,
  TemplateDefinition,
  TemplateRenderContext,
  ValidationIssue,
} from './core/index';

export { registerTemplateElements } from './templates/index';
export * as prototype from './templates/prototype';
export * as usm from './templates/usm';
export * as eventStorming from './templates/event-storming';
export * as exampleMapping from './templates/example-mapping';
export * as grill from './templates/grill';
export * as plain from './templates/plain';
export * as slides from './templates/slides';
export * as taskBoard from './templates/task-board';

/** The template elements this entry registers, for `window.devProcessKit`. */
const TEMPLATES = [
  'prototype',
  'usm',
  'event-storming',
  'example-mapping',
  'grill',
  'plain',
  'slides',
  'task-board',
] as const;

/** Registers every `dpk-*` custom element. Idempotent. */
export const registerAllElements = (): void => {
  registerComponentElements();
  registerTemplateElements();
  announce(FRAMEWORK_VERSION, TEMPLATES);
};

registerAllElements();
