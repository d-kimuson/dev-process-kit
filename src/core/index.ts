/**
 * Framework internals: the draft-action pipeline, persistence, navigation, the
 * template element base and the contracts templates implement.
 *
 * Nothing here knows about a template, and nothing here is a custom element —
 * the shipped elements live in `src/components` and `src/views`.
 */
export { FRAMEWORK_VERSION } from './version';
export { ViewElement } from './element';
export type { ViewApi, ViewSnapshot, ShellRegions, ViewRenderContext } from './shell/contracts';
export { DraftController } from './controller';
export type { DraftControllerOptions, DraftExport } from './controller';
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
  parseViewAction,
  payloadFor,
  targetSchema,
} from './schema';
export type { ActionName, ActionSpec, ActionSpecs, PayloadOfSpec, ViewAction } from './schema';
export { parseHash, formatHash, patchNavigation, EMPTY_NAVIGATION } from './navigation';
export { createActionId, createEntityId, parseTargetRef, slugify, targetRef, toTarget } from './target';
export { WebStorageDraftStorage, MemoryDraftStorage, defaultStorage, defaultStorageKey } from './persistence';
export type { DraftStorage, StorageLike } from './persistence';
// The element's side of sharing a draft; the host's side is the `sync` entry.
export { SYNC_PROTOCOL, SYNC_REQUEST_EVENT } from './sync/protocol';
export type {
  Author,
  Cursor,
  LocalOp,
  RemoteOp,
  RemoteUpdate,
  SyncedAction,
  SyncHost,
  SyncRequestDetail,
  SyncSession,
  SyncSink,
  SyncStatus,
} from './sync/protocol';
export { tokens, controls } from './theme';
export type { SidebarLayout, SidebarNarrow, SidebarSide } from './layouts/index';
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
  ViewDefinition,
  ValidationIssue,
} from './types';
