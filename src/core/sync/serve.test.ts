import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DraftAction } from '../types';

import {
  SYNC_PROTOCOL,
  SYNC_REQUEST_EVENT,
  type LocalOp,
  type RemoteUpdate,
  type SyncHost,
  type SyncSession,
  type SyncStatus,
} from './protocol';
import { serveDraftSync, type Transport } from './serve';
import { MemoryStorageLike } from './testing';

const action = (id: string): DraftAction => ({
  id,
  type: 'comment',
  target: { type: 'page', id: 'page' },
  payload: { body: id },
  createdAt: '2026-11-02T00:00:00.000Z',
});
const append = (id: string): LocalOp => ({ kind: 'append', action: action(id) });

type Deferred = { resolve: (value: RemoteUpdate | undefined) => void; reject: (error: unknown) => void };

/** A transport whose pushes the test answers by hand. */
const fakeTransport = () => {
  const pushes: { ops: readonly LocalOp[]; cursor: string | undefined; answer: Deferred }[] = [];
  let onUpdate: ((update: RemoteUpdate) => void) | undefined;
  let onError: ((error: unknown) => void) | undefined;
  const transport: Transport = {
    listen: (_cursor, update, error) => {
      onUpdate = update;
      onError = error;
      return () => {
        onUpdate = undefined;
      };
    },
    push: (ops, cursor) =>
      new Promise((resolve, reject) => {
        pushes.push({ ops, cursor, answer: { resolve, reject } });
      }),
  };
  return {
    transport,
    pushes,
    deliver: (update: RemoteUpdate) => onUpdate?.(update),
    fail: (error: unknown) => onError?.(error),
  };
};

const connect = (options: { storage?: MemoryStorageLike; fake?: ReturnType<typeof fakeTransport> } = {}) => {
  const target = new EventTarget();
  const storage = options.storage ?? new MemoryStorageLike();
  const fake = options.fake ?? fakeTransport();
  let wake = () => {};
  const stop = serveDraftSync({
    self: { id: 'me', name: 'Me' },
    transport: () => fake.transport,
    target,
    storage,
    retry: { baseMs: 100, maxMs: 400 },
    wake: (callback) => {
      wake = callback;
      return () => {};
    },
  });
  let host: SyncHost | undefined;
  target.dispatchEvent(
    new CustomEvent(SYNC_REQUEST_EVENT, {
      detail: { protocol: SYNC_PROTOCOL, storageKey: 'page', template: 'plain', connect: (h: SyncHost) => (host = h) },
    }),
  );
  const received: RemoteUpdate[] = [];
  const pendingAtReceive: (readonly LocalOp[])[] = [];
  const opened: { session?: SyncSession } = {};
  const statuses: { status: SyncStatus; reason?: string | undefined }[] = [];
  if (host === undefined) throw new Error('no host answered');
  const session: SyncSession = host.open({
    receive: (update) => {
      received.push(update);
      pendingAtReceive.push(opened.session?.pending ?? []);
    },
    status: (status, detail) => statuses.push({ status, reason: detail?.reason }),
  });
  opened.session = session;
  return { host, session, received, pendingAtReceive, statuses, storage, fake, stop, wake: () => wake() };
};

const flush = () => vi.advanceTimersByTimeAsync(0);

describe('serveDraftSync', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('answers a request with its reader', () => {
    expect(connect().host.self).toEqual({ id: 'me', name: 'Me' });
  });

  it('sends one unit at a time, in order, with the cursor it stands on', async () => {
    const { session, fake } = connect();
    fake.deliver({ kind: 'snapshot', cursor: 'c0', actions: [] });
    session.push([append('a')]);
    session.push([append('b')]);
    await flush();

    expect(fake.pushes.map((push) => push.ops)).toEqual([[append('a')]]);
    expect(fake.pushes[0]?.cursor).toBe('c0');
    fake.pushes[0]?.answer.resolve({ kind: 'ops', cursor: 'c1', ops: [{ kind: 'append', action: action('a') }] });
    await flush();

    expect(fake.pushes.map((push) => push.ops)).toEqual([[append('a')], [append('b')]]);
    expect(fake.pushes[1]?.cursor).toBe('c1');
  });

  it('hands the answer of a push to the reader after settling it', async () => {
    const { session, fake, received, pendingAtReceive } = connect();
    session.push([append('a')]);
    await flush();
    const answer: RemoteUpdate = { kind: 'snapshot', cursor: 'c1', actions: [action('a')] };
    fake.pushes[0]?.answer.resolve(answer);
    await flush();

    expect(received).toEqual([answer]);
    expect(pendingAtReceive).toEqual([[]]);
  });

  it('keeps unsent ops across a reload and sends them without duplicates', async () => {
    const storage = new MemoryStorageLike();
    const first = connect({ storage });
    first.session.push([append('a')]);
    await flush();
    first.fake.pushes[0]?.answer.reject(new Error('network'));
    await flush();
    first.session.close();

    const second = connect({ storage });
    expect(second.session.pending).toEqual([append('a')]);
    await flush();
    second.fake.pushes[0]?.answer.resolve(undefined);
    await flush();

    expect(second.fake.pushes.map((push) => push.ops)).toEqual([[append('a')]]);
    expect(second.session.pending).toEqual([]);
  });

  it('backs off with a cap and retries at once when woken', async () => {
    const { session, fake, statuses, wake } = connect();
    const failLast = async () => {
      fake.pushes.at(-1)?.answer.reject(new Error('network'));
      await flush();
    };
    session.push([append('a')]);
    await flush();
    await failLast();
    expect(statuses.at(-1)?.status).toBe('offline');

    await vi.advanceTimersByTimeAsync(99);
    expect(fake.pushes).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fake.pushes).toHaveLength(2);
    await failLast();
    // The next try would wait 200ms; coming back online does not.
    wake();
    await flush();
    expect(fake.pushes).toHaveLength(3);
    await failLast();
    // 800ms, capped at 400ms.
    await vi.advanceTimersByTimeAsync(399);
    expect(fake.pushes).toHaveLength(3);
    await vi.advanceTimersByTimeAsync(1);
    expect(fake.pushes).toHaveLength(4);
    expect(new Set(fake.pushes.map((push) => push.ops))).toHaveLength(1);
  });

  it('drops ops the host refuses for good and says why', async () => {
    const { session, fake, statuses } = connect();
    session.push([append('a')]);
    session.push([append('b')]);
    await flush();
    fake.pushes[0]?.answer.reject({ retryable: false, reason: 'read only' });
    await flush();

    expect(statuses).toContainEqual({ status: 'error', reason: 'read only' });
    expect(session.pending).toEqual([append('b')]);
    expect(fake.pushes.map((push) => push.ops)).toEqual([[append('a')], [append('b')]]);
  });

  it('keeps saying why it refused until a push goes through', async () => {
    const { session, fake, statuses } = connect();
    fake.deliver({ kind: 'snapshot', cursor: 'c0', actions: [] });
    session.push([append('a')]);
    await flush();
    fake.pushes[0]?.answer.reject({ retryable: false, reason: 'read only' });
    await flush();
    fake.deliver({ kind: 'ops', cursor: 'c0', ops: [] });
    expect(statuses.at(-1)).toEqual({ status: 'error', reason: 'read only' });

    session.push([append('b')]);
    await flush();
    fake.pushes[1]?.answer.resolve(undefined);
    await flush();
    expect(statuses.at(-1)?.status).toBe('synced');
  });

  it('stays offline while a retry waits, whatever else arrives', async () => {
    const { session, fake, statuses } = connect();
    fake.deliver({ kind: 'snapshot', cursor: 'c0', actions: [] });
    session.push([append('a')]);
    await flush();
    fake.pushes[0]?.answer.reject(new Error('network'));
    await flush();
    session.push([append('b')]);
    fake.deliver({ kind: 'ops', cursor: 'c0', ops: [] });

    expect(statuses.at(-1)?.status).toBe('offline');
  });

  it('is synced at once for a transport that answers while it starts listening', () => {
    const statuses: SyncStatus[] = [];
    const target = new EventTarget();
    serveDraftSync({
      self: { id: 'me' },
      transport: () => ({
        listen: (_cursor, onUpdate) => {
          onUpdate({ kind: 'snapshot', cursor: 'c0', actions: [] });
          return () => {};
        },
        push: async () => {},
      }),
      target,
      storage: null,
      wake: () => () => {},
    });
    target.dispatchEvent(
      new CustomEvent(SYNC_REQUEST_EVENT, {
        detail: {
          protocol: SYNC_PROTOCOL,
          storageKey: 'page',
          template: 'plain',
          connect: (host: SyncHost) => host.open({ receive: () => {}, status: (status) => statuses.push(status) }),
        },
      }),
    );

    expect(statuses.at(-1)).toBe('synced');
  });

  it('leaves a request unanswered when the page cannot make a transport for it', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const target = new EventTarget();
    serveDraftSync({
      self: { id: 'me' },
      transport: () => {
        throw new Error('no API for this page');
      },
      target,
    });
    let answered = false;
    target.dispatchEvent(
      new CustomEvent(SYNC_REQUEST_EVENT, {
        detail: { protocol: SYNC_PROTOCOL, storageKey: 'page', template: 'plain', connect: () => (answered = true) },
      }),
    );

    expect(answered).toBe(false);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('keeps unsent ops for the next session of the page without storage', async () => {
    const fake = fakeTransport();
    const target = new EventTarget();
    serveDraftSync({
      self: { id: 'me' },
      transport: () => fake.transport,
      target,
      storage: null,
      wake: () => () => {},
    });
    const open = (): SyncSession => {
      let session: SyncSession | undefined;
      target.dispatchEvent(
        new CustomEvent(SYNC_REQUEST_EVENT, {
          detail: {
            protocol: SYNC_PROTOCOL,
            storageKey: 'page',
            template: 'plain',
            connect: (host: SyncHost) => (session = host.open({ receive: () => {}, status: () => {} })),
          },
        }),
      );
      if (session === undefined) throw new Error('no host answered');
      return session;
    };
    const first = open();
    first.push([append('a')]);
    first.close();

    expect(open().pending).toEqual([append('a')]);
  });

  it('reports where it stands', async () => {
    const { session, fake, statuses } = connect();
    expect(statuses.at(-1)?.status).toBe('connecting');
    fake.deliver({ kind: 'snapshot', cursor: 'c0', actions: [] });
    expect(statuses.at(-1)?.status).toBe('synced');
    session.push([append('a')]);
    expect(statuses.at(-1)?.status).toBe('pending');
    fake.fail(new Error('down'));
    expect(statuses.at(-1)?.status).toBe('offline');
    await flush();
    fake.pushes[0]?.answer.resolve(undefined);
    await flush();
    expect(statuses.at(-1)?.status).toBe('synced');
  });

  it('stops answering and sending once closed', async () => {
    const { session, fake, received, stop } = connect();
    session.close();
    fake.deliver({ kind: 'snapshot', cursor: 'c0', actions: [] });
    session.push([append('a')]);
    await flush();
    stop();

    expect(received).toEqual([]);
    expect(fake.pushes).toEqual([]);
  });
});
