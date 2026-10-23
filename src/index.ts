import { registerComponentElements } from './components/index';
import { FRAMEWORK_VERSION } from './core/index';
import { startEntry } from './core/version-loader';
import { VERSION_PARAM } from './core/version-switch';
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
  DpkArchitectureMap,
  DpkCommentPanel,
  DpkDependencyGraph,
  DpkErDiagram,
  DpkEventStorming,
  DpkExampleMapping,
  DpkFormalSpec,
  DpkInlineEdit,
  DpkKanban,
  DpkMindMap,
  DpkSequenceDiagram,
  DpkStateDiagram,
  DpkWhiteboard,
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
  EventStormingState,
  ExampleMappingState,
  FormalSpecData,
  KanbanData,
  MindMapData,
  SequenceDiagramData,
  StateDiagramData,
  WhiteboardState,
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
export * as plain from './templates/plain';
export * as slides from './templates/slides';
export * as taskBoard from './templates/task-board';
export * as delegationPoker from './templates/delegation-poker';

/** The template elements this entry registers, for `window.devProcessKit`. */
const TEMPLATES = ['prototype', 'usm', 'plain', 'slides', 'task-board', 'delegation-poker'] as const;

/** Registers every `dpk-*` custom element. Idempotent. */
export const registerAllElements = (): void => {
  registerComponentElements();
  registerTemplateElements();
  announce(FRAMEWORK_VERSION, TEMPLATES, VERSION_PARAM, import.meta.url);
};

startEntry({
  entry: 'index.js',
  url: import.meta.url,
  templates: TEMPLATES,
  register: () => {
    registerComponentElements();
    registerTemplateElements();
  },
});
