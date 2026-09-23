import { registerCoreElements } from './components/index';
import { FRAMEWORK_VERSION } from './core/index';
/**
 * dev-process-kit — Single HTML Artifact Framework.
 *
 * The `index.js` entry: every template and every component in one file. Pages that use
 * one template should load that template's entry instead (`templates/<name>.js`); this
 * one is the union, and the entry the docs and samples pin when they do not care.
 *
 * Public contract (design §3): custom elements, attributes, properties, DOM
 * events and slots. Lit is an implementation detail and is never re-exported.
 */
import { announce } from './lib/announce';
import { registerTemplateElements } from './templates/index';

/**
 * Kept as a public alias for compatibility: structural equality is
 * `es-toolkit`'s `isEqual` (a superset that also handles Date/Map/Set).
 */
export { isEqual as deepEqual } from 'es-toolkit/predicate';
export { FRAMEWORK_VERSION } from './core/version';
export {
  ArtifactElement,
  ArtifactController,
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
  ArtifactArchitectureMap,
  ArtifactCommentPanel,
  ArtifactDependencyGraph,
  ArtifactErDiagram,
  ArtifactInlineEdit,
  ArtifactKanban,
  ArtifactMindMap,
  ArtifactSequenceDiagram,
  ArtifactStateDiagram,
  registerCoreElements,
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
  ArtifactApi,
  ArtifactSnapshot,
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

/** The template elements this entry registers, for `window.artifactFramework`. */
const TEMPLATES = ['prototype', 'usm', 'event-storming', 'example-mapping', 'grill', 'plain'] as const;

/** Registers every `artifact-*` custom element. Idempotent. */
export const registerArtifactFramework = (): void => {
  registerCoreElements();
  registerTemplateElements();
  announce(FRAMEWORK_VERSION, TEMPLATES);
};

registerArtifactFramework();
