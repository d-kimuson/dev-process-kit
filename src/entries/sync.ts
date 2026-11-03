/**
 * `sync.js` — the host side of sharing a draft among readers.
 *
 * A page that shares its draft loads this next to its view's entry and calls
 * `serveDraftSync` before the view starts: every element that owns a draft
 * asks for a host with `dpk-sync-request`, and the one this serves connects
 * it to the host's server through a `Transport` (`polling`, or one of the
 * host's own). Without it, the draft stays in localStorage.
 *
 * It defines no element and carries no view, so it loads without Lit. The
 * event's interface is the contract; this is one implementation of it.
 *
 * `ENTRIES` in `vite.config.ts` is what publishes this file as `sync.js`.
 */
export { polling, type PollingOptions, type Visibility } from '../core/sync/polling';
export {
  SYNC_PROTOCOL,
  SYNC_REQUEST_EVENT,
  type Author,
  type Cursor,
  type LocalOp,
  type RemoteOp,
  type RemoteUpdate,
  type SyncedAction,
  type SyncHost,
  type SyncRequestDetail,
  type SyncSession,
  type SyncSink,
  type SyncStatus,
} from '../core/sync/protocol';
export {
  serveDraftSync,
  type ServeDraftSyncOptions,
  type Transport,
  type TransportContext,
  type WakeSource,
} from '../core/sync/serve';
export type { StorageLike } from '../core/persistence';
