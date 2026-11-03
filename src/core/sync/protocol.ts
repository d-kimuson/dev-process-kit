/**
 * The contract between an element that owns a draft and the host that shares
 * it among readers (`dpk-sync-request`). The event's interface is the source
 * of truth; `dev-process-kit/sync` is one implementation of the host side.
 *
 * Every union is discriminated by `kind`, and a `kind` this version does not
 * know is ignored, so adding a kind is a compatible change. `protocol` only
 * goes up when the meaning of an existing kind changes.
 */
import * as v from 'valibot';

import type { DraftAction } from '../types';

import { draftActionEnvelopeSchema } from '../schema';

export const SYNC_REQUEST_EVENT = 'dpk-sync-request';
export const SYNC_PROTOCOL = 1;

/** Opaque to dpk: never compared, only handed back. */
export type Cursor = string;
export type Author = { readonly id: string; readonly name?: string };
export type SyncedAction = DraftAction & { readonly author?: Author };

export type RemoteOp =
  | { readonly kind: 'append'; readonly action: SyncedAction }
  | { readonly kind: 'remove'; readonly id: string }
  | { readonly kind: 'clear'; readonly upTo: Cursor };

export type LocalOp =
  | { readonly kind: 'append'; readonly action: DraftAction }
  | { readonly kind: 'remove'; readonly id: string }
  | { readonly kind: 'clear'; readonly upTo: Cursor };

export type RemoteUpdate =
  | { readonly kind: 'snapshot'; readonly cursor: Cursor; readonly actions: readonly SyncedAction[] }
  | { readonly kind: 'ops'; readonly cursor: Cursor; readonly ops: readonly RemoteOp[] };

export type SyncStatus = 'connecting' | 'synced' | 'pending' | 'offline' | 'error';

export type SyncSink = {
  receive(update: RemoteUpdate): void;
  status(status: SyncStatus, detail?: { readonly reason?: string }): void;
};

export type SyncSession = {
  /**
   * The reader's own ops the host has not settled yet (those from before a
   * reload included). Read again on every update: an op that left it was
   * acknowledged, or rejected for good.
   */
  readonly pending: readonly LocalOp[];
  push(ops: readonly LocalOp[]): void;
  close(): void;
};

export type SyncHost = {
  readonly protocol: typeof SYNC_PROTOCOL;
  readonly self: Author;
  open(sink: SyncSink): SyncSession;
};

export type SyncRequestDetail = {
  readonly protocol: typeof SYNC_PROTOCOL;
  readonly storageKey: string;
  readonly template: string;
  /** Called synchronously, inside the dispatch. Without a call the draft stays in localStorage. */
  connect(host: SyncHost): void;
};

/** An op and the op that settles it are the same op: the same kind about the same thing. */
export const sameOp = (a: LocalOp, b: LocalOp): boolean => opKey(a) === opKey(b);

const opKey = (op: LocalOp): string => {
  switch (op.kind) {
    case 'append':
      return `append:${op.action.id}`;
    case 'remove':
      return `remove:${op.id}`;
    case 'clear':
      return `clear:${op.upTo}`;
  }
};

// ------------------------------------------------------------ reading input

const authorSchema = v.object({
  id: v.pipe(v.string(), v.minLength(1)),
  name: v.exactOptional(v.string()),
});
const cursorSchema = v.string();
const idSchema = v.pipe(v.string(), v.minLength(1));

const snapshotSchema = v.object({ kind: v.literal('snapshot'), cursor: cursorSchema, actions: v.array(v.unknown()) });
const opsSchema = v.object({ kind: v.literal('ops'), cursor: cursorSchema, ops: v.array(v.unknown()) });
const updateSchema = v.variant('kind', [snapshotSchema, opsSchema]);
const appendSchema = v.object({ kind: v.literal('append'), action: v.unknown() });
const removeSchema = v.object({ kind: v.literal('remove'), id: idSchema });
const clearSchema = v.object({ kind: v.literal('clear'), upTo: cursorSchema });
const remoteOpSchema = v.variant('kind', [appendSchema, removeSchema, clearSchema]);
const localOpSchema = v.variant('kind', [
  v.object({ kind: v.literal('append'), action: draftActionEnvelopeSchema }),
  removeSchema,
  clearSchema,
]);
const authorOfSchema = v.object({ author: v.fallback(v.optional(authorSchema), undefined) });

/** An action as the reader's draft holds it, with who wrote it. */
export type SyncEntry = { readonly action: DraftAction; readonly author: Author | undefined };

export type IncomingOp =
  | { readonly kind: 'append'; readonly entry: SyncEntry }
  | { readonly kind: 'remove'; readonly id: string }
  | { readonly kind: 'clear'; readonly upTo: Cursor };

export type IncomingUpdate =
  | { readonly kind: 'snapshot'; readonly cursor: Cursor; readonly entries: readonly SyncEntry[] }
  | { readonly kind: 'ops'; readonly cursor: Cursor; readonly ops: readonly IncomingOp[] };

/** What the template accepts of an action, or `null`. */
export type ActionReader = (input: unknown) => DraftAction | null;

/**
 * Reads an update from the host. An update of a kind this version does not
 * know is `null`; an op of an unknown kind, or an action the template does
 * not accept, is left out. Nothing is written back.
 */
export const readUpdate = (input: unknown, readAction: ActionReader): IncomingUpdate | null => {
  const parsed = v.safeParse(updateSchema, input);
  if (!parsed.success) return null;
  const update = parsed.output;
  if (update.kind === 'snapshot') {
    return {
      kind: 'snapshot',
      cursor: update.cursor,
      entries: update.actions.flatMap((action) => {
        const entry = readEntry(action, readAction);
        return entry === null ? [] : [entry];
      }),
    };
  }
  return {
    kind: 'ops',
    cursor: update.cursor,
    ops: update.ops.flatMap((input): IncomingOp[] => {
      const op = v.safeParse(remoteOpSchema, input);
      if (!op.success) return [];
      if (op.output.kind !== 'append') return [op.output];
      const entry = readEntry(op.output.action, readAction);
      return entry === null ? [] : [{ kind: 'append', entry }];
    }),
  };
};

const readEntry = (input: unknown, readAction: ActionReader): SyncEntry | null => {
  const action = readAction(input);
  if (action === null) return null;
  const author = v.safeParse(authorOfSchema, input);
  return { action, author: author.success ? author.output.author : undefined };
};

/** Reads ops kept by a host (an outbox in storage); anything unreadable is left out. */
export const readLocalOps = (input: unknown): LocalOp[] => {
  if (!Array.isArray(input)) return [];
  return input.flatMap((item) => {
    const op = v.safeParse(localOpSchema, item);
    return op.success ? [op.output] : [];
  });
};
