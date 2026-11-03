/**
 * `serveDraftSync`: a host for `dpk-sync-request` over a `Transport` the page
 * supplies. It keeps each reader's unsent ops in storage, sends them one unit
 * at a time and in order, and retries with a capped backoff — at once when
 * the browser comes back online or the tab becomes visible.
 */
import * as v from 'valibot';

import type { StorageLike } from '../persistence';

import { dropHead, enqueue, loadOutbox, markTried, outboxKey, queuedOps, saveOutbox, type Outbox } from './outbox';
import {
  SYNC_PROTOCOL,
  SYNC_REQUEST_EVENT,
  type Author,
  type Cursor,
  type LocalOp,
  type RemoteUpdate,
  type SyncHost,
  type SyncSession,
  type SyncSink,
} from './protocol';

export type Transport = {
  /**
   * Delivers every update after `cursor` (a snapshot for `undefined`) until
   * the returned function is called. An error does not stop listening.
   */
  listen(
    cursor: Cursor | undefined,
    onUpdate: (update: RemoteUpdate) => void,
    onError: (error: unknown) => void,
  ): () => void;
  /**
   * Orders `ops` after everything the host already has. The answer, if any,
   * covers everything after `cursor` — what others did included — like a
   * pull from `cursor` would, and is never older than what `listen`
   * delivered (over a live channel, answer nothing: the channel brings the
   * ops). Throw `{ retryable: false, reason }` to drop the ops for good; any
   * other failure is retried.
   */
  push(ops: readonly LocalOp[], cursor: Cursor | undefined): Promise<RemoteUpdate | void>;
};

export type TransportContext = { readonly storageKey: string; readonly template: string };

/** When the browser may be worth another try: back online, the tab visible again. */
export type WakeSource = (wake: () => void) => () => void;

export type ServeDraftSyncOptions = {
  readonly self: Author;
  readonly transport: (context: TransportContext) => Transport;
  /** Where the requests bubble to. Default: `window`. */
  readonly target?: EventTarget;
  /** Where unsent ops wait across reloads. Default: `localStorage`; `null` keeps them for the page load. */
  readonly storage?: StorageLike | null;
  readonly retry?: { readonly baseMs?: number; readonly maxMs?: number };
  readonly wake?: WakeSource;
};

const requestSchema = v.object({
  protocol: v.literal(SYNC_PROTOCOL),
  storageKey: v.string(),
  template: v.string(),
  connect: v.function(),
});
const rejectionSchema = v.object({ retryable: v.literal(false), reason: v.optional(v.string()) });

/** Starts answering `dpk-sync-request`; the returned function stops it (open sessions stay). */
export const serveDraftSync = (options: ServeDraftSyncOptions): (() => void) => {
  const target = options.target ?? window;
  const chosen = options.storage === undefined ? browserStorage() : options.storage;
  // Without storage the queue still outlives a session: an element closes and reopens one when it moves.
  const storage = chosen ?? memoryStorage();
  const onRequest = (event: Event): void => {
    if (!(event instanceof CustomEvent)) return;
    const request = v.safeParse(requestSchema, event.detail);
    if (!request.success) return;
    const { storageKey, template, connect } = request.output;
    const context = { storageKey, template };
    let transport: Transport;
    try {
      transport = options.transport(context);
    } catch (error) {
      // Unanswered, the element keeps its draft in its own storage.
      console.warn(`[dev-process-kit] no transport for "${storageKey}" (${template}); the draft is not shared.`, error);
      return;
    }
    const host: SyncHost = {
      protocol: SYNC_PROTOCOL,
      self: options.self,
      open: (sink) => openSession(options, storage, transport, context, sink),
    };
    connect(host);
  };
  target.addEventListener(SYNC_REQUEST_EVENT, onRequest);
  return () => target.removeEventListener(SYNC_REQUEST_EVENT, onRequest);
};

const openSession = (
  options: ServeDraftSyncOptions,
  storage: StorageLike,
  transport: Transport,
  context: TransportContext,
  sink: SyncSink,
): SyncSession => {
  const key = outboxKey(context.storageKey, context.template, options.self.id);
  const baseMs = options.retry?.baseMs ?? 1000;
  const maxMs = options.retry?.maxMs ?? 30_000;

  let outbox: Outbox = loadOutbox(storage, key);
  let cursor: Cursor | undefined;
  let closed = false;
  let sending = false;
  let failures = 0;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  /** The last refusal, said until a push goes through. */
  let refusal: { readonly reason: string | undefined } | null = null;
  let listenFailing = false;

  const save = (next: Outbox): void => {
    outbox = next;
    saveOutbox(storage, key, outbox);
  };
  /** Where the session stands, from what it knows; every change of it reports again. */
  const report = (): void => {
    if (refusal !== null) sink.status('error', refusal.reason === undefined ? {} : { reason: refusal.reason });
    else if (retryTimer !== undefined || listenFailing) sink.status('offline');
    else if (cursor === undefined) sink.status('connecting');
    else sink.status(outbox.units.length === 0 ? 'synced' : 'pending');
  };
  const deliver = (update: RemoteUpdate): void => {
    cursor = update.cursor;
    sink.receive(update);
  };

  const send = async (): Promise<void> => {
    if (closed || sending || retryTimer !== undefined) return;
    const unit = outbox.units[0];
    if (unit === undefined) return;
    sending = true;
    save(markTried(outbox));
    try {
      const answer = await transport.push(unit, cursor);
      if (closed) return;
      failures = 0;
      refusal = null;
      listenFailing = false;
      save(dropHead(outbox));
      if (answer !== undefined) deliver(answer);
      report();
    } catch (error) {
      if (closed) return;
      const rejection = v.safeParse(rejectionSchema, error);
      if (rejection.success) {
        save(dropHead(outbox));
        refusal = { reason: rejection.output.reason ?? (error instanceof Error ? error.message : undefined) };
      } else {
        retryTimer = setTimeout(retryNow, Math.min(maxMs, baseMs * 2 ** failures));
        failures += 1;
      }
      report();
    } finally {
      sending = false;
    }
    void send();
  };
  const retryNow = (): void => {
    clearTimeout(retryTimer);
    retryTimer = undefined;
    void send();
  };

  report();
  const stopListening = transport.listen(
    undefined,
    (update) => {
      if (closed) return;
      listenFailing = false;
      deliver(update);
      report();
    },
    () => {
      if (closed) return;
      listenFailing = true;
      report();
    },
  );
  const stopWaking = (options.wake ?? browserWake)(() => {
    if (retryTimer !== undefined) retryNow();
  });

  void send();

  return {
    get pending() {
      return queuedOps(outbox);
    },
    push: (ops) => {
      if (closed || ops.length === 0) return;
      save(enqueue(outbox, ops));
      report();
      void send();
    },
    close: () => {
      closed = true;
      clearTimeout(retryTimer);
      stopListening();
      stopWaking();
    },
  };
};

const browserStorage = (): StorageLike | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    // Access can throw when cookies are blocked: the queue lives as long as the page.
    return null;
  }
};

const memoryStorage = (): StorageLike => {
  const items = new Map<string, string>();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
  };
};

const browserWake: WakeSource = (wake) => {
  const onVisibility = (): void => {
    if (document.visibilityState === 'visible') wake();
  };
  window.addEventListener('online', wake);
  document.addEventListener('visibilitychange', onVisibility);
  return () => {
    window.removeEventListener('online', wake);
    document.removeEventListener('visibilitychange', onVisibility);
  };
};
