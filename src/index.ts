import { defineAppElement } from './app/index';
import { registerBoardElements } from './boards/index';
import { registerComponentElements } from './components/index';
import { FRAMEWORK_VERSION } from './core/index';
import { startEntry } from './core/version-loader';
import { VERSION_PARAM } from './core/version-switch';
/**
 * dev-process-kit.
 *
 * The `index.js` entry: every template and every component in one file. Pages that use
 * one template should load that template's entry instead (`views/<name>.js`); this
 * one is the union, and the entry the docs and samples pin when they do not care.
 *
 * Public contract: custom elements, attributes, properties, DOM
 * events and slots. Lit is an implementation detail and is never re-exported.
 */
import { announce } from './lib/announce';
import { definePageElement } from './page/index';
import { registerViewElements } from './views/index';

export { FRAMEWORK_VERSION } from './core/version';
export {
  ViewElement,
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
  parseViewAction,
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
export { DpkCommentPanel, DpkFormalSpec, DpkInlineEdit, registerComponentElements } from './components/index';
export type { CommentPanelCallbacks, FormalSpecData } from './components/index';
export {
  BoardCanvasChromeElement,
  BoardCanvasElement,
  BoardChromeBase,
  DpkBoardArchitectureMap,
  DpkBoardDependencyGraph,
  DpkBoardErDiagram,
  DpkBoardEventStorming,
  DpkBoardExampleMapping,
  DpkBoardKanban,
  DpkBoardMindMap,
  DpkBoardSequenceDiagram,
  DpkBoardStateDiagram,
  DpkBoardWhiteboard,
  registerBoardElements,
} from './boards/index';
export type {
  ArchitectureData,
  ArchitectureService,
  DependencyData,
  DependencyModule,
  ErData,
  ErTableDiff,
  EventStormingState,
  ExampleMappingState,
  KanbanData,
  MindMapData,
  SequenceDiagramData,
  StateDiagramData,
  WhiteboardState,
} from './boards/index';
export { DpkApp, defineAppElement } from './app/index';
export { DpkPage, definePageElement } from './page/index';
export type {
  ActionDescriptor,
  ActionSpec,
  ActionSpecs,
  ViewAction,
  ActionDescription,
  ActionInput,
  ActionTarget,
  ActionTone,
  ViewApi,
  ViewSnapshot,
  CommentTargetOption,
  DispatchOutcome,
  BatchDispatchOutcome,
  DraftAction,
  DraftStorage,
  Navigation,
  NavigationPatch,
  ShellRegions,
  StaleAction,
  ViewDefinition,
  ViewRenderContext,
  ValidationIssue,
} from './core/index';

export { registerViewElements } from './views/index';
export * as prototype from './views/prototype';
export * as usm from './views/usm';
export * as plain from './views/plain';
export * as slides from './views/slides';
export * as taskBoard from './views/task-board';
export * as delegationPoker from './views/delegation-poker';

/** The view elements this entry registers, for `window.devProcessKit`. */
const VIEWS = ['prototype', 'usm', 'plain', 'slides', 'task-board', 'delegation-poker'] as const;

/** Registers every `dpk-*` custom element. Idempotent. */
export const registerAllElements = (): void => {
  registerComponentElements();
  registerBoardElements();
  registerViewElements();
  defineAppElement();
  definePageElement();
  announce(FRAMEWORK_VERSION, VIEWS, VERSION_PARAM, import.meta.url);
};

startEntry({
  entry: 'index.js',
  url: import.meta.url,
  views: VIEWS,
  register: () => {
    registerComponentElements();
    registerBoardElements();
    registerViewElements();
    defineAppElement();
    definePageElement();
  },
});
