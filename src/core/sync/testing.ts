import type { StorageLike } from '../persistence';

import {
  SYNC_PROTOCOL,
  SYNC_REQUEST_EVENT,
  type Author,
  type LocalOp,
  type RemoteOp,
  type RemoteUpdate,
  type SyncHost,
  type SyncedAction,
} from './protocol';
import { serveDraftSync, type Transport } from './serve';

/** A `localStorage` stand-in for tests. */
export class MemoryStorageLike implements StorageLike {
  readonly #items = new Map<string, string>();

  getItem(key: string): string | null {
    return this.#items.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.#items.set(key, value);
  }

  removeItem(key: string): void {
    this.#items.delete(key);
  }
}

type Listener = { cursor: number | undefined; readonly onUpdate: (update: RemoteUpdate) => void };

/**
 * A host's server as the docs ask for it: it orders ops and stamps their
 * author, takes an append once per id, ignores a remove of an absent action,
 * clears up to a cursor and answers a range holding a clear with a snapshot.
 * Every change reaches every listener a turn after the push is answered.
 */
export class MemorySyncHub {
  readonly events: RemoteOp[] = [];
  #rows: { readonly action: SyncedAction; readonly at: number }[] = [];
  readonly #seen = new Set<string>();
  readonly #listeners = new Set<Listener>();
  online = true;

  get actions(): readonly SyncedAction[] {
    return this.#rows.map((row) => row.action);
  }

  /** How many sessions listen now. */
  get listening(): number {
    return this.#listeners.size;
  }

  transport(author: Author): Transport {
    return {
      listen: (cursor, onUpdate) => {
        const listener: Listener = { cursor: cursor === undefined ? undefined : Number(cursor), onUpdate };
        this.#listeners.add(listener);
        setTimeout(() => this.#send(listener), 0);
        return () => this.#listeners.delete(listener);
      },
      push: async (ops) => {
        if (!this.online) throw new Error('offline');
        this.#apply(author, ops);
        setTimeout(() => {
          for (const listener of this.#listeners) this.#send(listener);
        }, 0);
      },
    };
  }

  /** Answers every listener again with a snapshot, as a server that always answers one would. */
  resend(): void {
    for (const listener of this.#listeners) {
      listener.cursor = this.events.length;
      listener.onUpdate({ kind: 'snapshot', cursor: String(this.events.length), actions: this.actions });
    }
  }

  #apply(author: Author, ops: readonly LocalOp[]): void {
    for (const op of ops) {
      switch (op.kind) {
        case 'append': {
          if (this.#seen.has(op.action.id)) break;
          this.#seen.add(op.action.id);
          const action = { ...op.action, author };
          this.events.push({ kind: 'append', action });
          this.#rows.push({ action, at: this.events.length });
          break;
        }
        case 'remove':
          if (!this.#rows.some((row) => row.action.id === op.id)) break;
          this.#rows = this.#rows.filter((row) => row.action.id !== op.id);
          this.events.push(op);
          break;
        case 'clear': {
          const upTo = Number(op.upTo);
          this.#rows = this.#rows.filter((row) => row.at > upTo);
          this.events.push(op);
          break;
        }
      }
    }
  }

  #send(listener: Listener): void {
    if (!this.#listeners.has(listener)) return;
    const cursor = String(this.events.length);
    const after = listener.cursor;
    if (after === this.events.length) return;
    const ops = after === undefined ? [] : this.events.slice(after);
    listener.cursor = this.events.length;
    if (after === undefined || ops.some((op) => op.kind === 'clear')) {
      listener.onUpdate({ kind: 'snapshot', cursor, actions: this.actions });
    } else {
      listener.onUpdate({ kind: 'ops', cursor, ops });
    }
  }
}

/** A reader's host over `hub`, as `serveDraftSync` answers an element's request. */
export const hostOn = (hub: MemorySyncHub, self: Author, storage: StorageLike = new MemoryStorageLike()): SyncHost => {
  const target = new EventTarget();
  serveDraftSync({
    self,
    transport: () => hub.transport(self),
    target,
    storage,
    retry: { baseMs: 1, maxMs: 1 },
    wake: () => () => {},
  });
  let host: SyncHost | undefined;
  target.dispatchEvent(
    new CustomEvent(SYNC_REQUEST_EVENT, {
      detail: { protocol: SYNC_PROTOCOL, storageKey: 'page', template: 'tiny', connect: (h: SyncHost) => (host = h) },
    }),
  );
  if (host === undefined) throw new Error('no host answered');
  return host;
};

/** Lets the hub and the hosts take every turn they have queued. */
export const settle = async (): Promise<void> => {
  for (let turn = 0; turn < 10; turn += 1) await new Promise((resolve) => setTimeout(resolve, 2));
};
