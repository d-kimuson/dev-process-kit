/**
 * Framework internals: the draft-action pipeline, persistence, navigation, the
 * artifact element base and the contracts templates implement.
 *
 * Nothing here knows about a template, and nothing here is a custom element —
 * the shipped elements live in `src/components` and `src/templates`.
 */
export { FRAMEWORK_VERSION } from './version';
export { ArtifactElement } from './element';
export type { ArtifactApi, ArtifactSnapshot, ShellRegions, TemplateRenderContext } from './shell/contracts';
export { ArtifactController } from './controller';
export type { ArtifactControllerOptions, DraftExport } from './controller';
export { derive, liveActions, commentTargetKey } from './derive';
export type { Derivation, StaleAction, StaleReason } from './derive';
export { buildAgentBrief } from './export';
export { COMMENT_ACTION, serializeDraft, appendAction, dedupeKeyOf } from './action';
export { COMMENT_DESCRIPTOR, commentActionSchema, commentBody } from './comment';
export {
  assertNever,
  defineAction,
  draftActionEnvelopeSchema,
  entityDedupeKey,
  parseTemplateAction,
  payloadFor,
  targetSchema,
} from './schema';
export type { ActionName, ActionSpec, ActionSpecs, PayloadOfSpec, TemplateAction } from './schema';
export { parseHash, formatHash, patchNavigation, EMPTY_NAVIGATION } from './navigation';
export { createActionId, createEntityId, parseTargetRef, slugify, targetRef, toTarget } from './target';
export { WebStorageDraftStorage, MemoryDraftStorage, defaultStorage, defaultStorageKey } from './persistence';
export type { DraftStorage, StorageLike } from './persistence';
export { tokens, controls } from './theme';
export {
  iconArrowDown,
  iconArrowUp,
  iconClose,
  iconComment,
  iconGrip,
  iconLink,
  iconMove,
  iconPencil,
  iconPlus,
  iconTrash,
} from './icons';
export type {
  ActionDescriptor,
  ActionDescription,
  ActionInput,
  ActionMode,
  ActionTarget,
  ActionTone,
  ApplyResult,
  CommentTargetOption,
  DispatchOutcome,
  BatchDispatchOutcome,
  DraftAction,
  Navigation,
  NavigationPatch,
  TemplateDefinition,
  ValidationIssue,
} from './types';
