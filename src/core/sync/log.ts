/**
 * The reader's side of a shared draft, without I/O: the log the host
 * confirmed, the reader's own ops not settled yet, and what the reader sees.
 *
 * The host's order is the truth. The reader's own pending ops are laid on top
 * of it until the host settles them; settling is by acknowledgement (the op
 * left the host's pending list), never by looking for the op in the log —
 * an acknowledged append another reader cleared right away is never seen.
 */
import type { DraftAction } from '../types';

import {
  sameOp,
  type Author,
  type Cursor,
  type IncomingOp,
  type IncomingUpdate,
  type LocalOp,
  type SyncEntry,
} from './protocol';

type Confirmed = { readonly entry: SyncEntry; readonly seq: number };
type Pending = {
  readonly op: LocalOp;
  /** For a clear: the confirmed ids the reader saw when it asked for it. */
  readonly covers: ReadonlySet<string>;
};
type Mark = { readonly cursor: Cursor; readonly seq: number };

export type SyncLog = {
  readonly self: Author;
  readonly confirmed: readonly Confirmed[];
  readonly cursor: Cursor | undefined;
  /** Which update each cursor came with, so a clear can say what it covers. */
  readonly marks: readonly Mark[];
  readonly seq: number;
  readonly pending: readonly Pending[];
};

/** A change of the log, and the ops to hand the host for it. */
export type SyncStep = { readonly log: SyncLog; readonly push: readonly LocalOp[] };

/** What a clear covers: the cursor the reader stood on and what it saw there. */
export type ClearMark = { readonly upTo: Cursor; readonly covers: ReadonlySet<string> };

const MARK_LIMIT = 64;
const NO_COVERS: ReadonlySet<string> = new Set();

export const openLog = (self: Author, pending: readonly LocalOp[]): SyncLog =>
  withPending({ self, confirmed: [], cursor: undefined, marks: [], seq: 0, pending: [] }, pending);

/** Takes the host's pending list as the reader's, keeping what a clear the reader asked for covers. */
export const withPending = (log: SyncLog, outbox: readonly LocalOp[]): SyncLog => ({
  ...log,
  pending: outbox.map((op) => log.pending.find((item) => sameOp(item.op, op)) ?? { op, covers: NO_COVERS }),
});

/** Whether the reader has heard from the host yet. */
export const isConnected = (log: SyncLog): boolean => log.cursor !== undefined;

/** The confirmed log with the reader's own pending ops on top. */
export const visibleEntries = (log: SyncLog): SyncEntry[] =>
  log.pending.reduce<SyncEntry[]>(
    (entries, { op, covers }) => {
      switch (op.kind) {
        case 'append':
          return entries.some((entry) => entry.action.id === op.action.id)
            ? entries
            : [...entries, { action: op.action, author: log.self }];
        case 'remove':
          return entries.filter((entry) => entry.action.id !== op.id);
        case 'clear':
          return entries.filter((entry) => !covers.has(entry.action.id));
      }
    },
    log.confirmed.map(({ entry }) => entry),
  );

export const visibleActions = (log: SyncLog): DraftAction[] => visibleEntries(log).map((entry) => entry.action);

export const isOwnEntry = (log: SyncLog, entry: SyncEntry): boolean => entry.author?.id === log.self.id;

/** Whether the action is the reader's own and the host has not confirmed it yet. */
export const isPendingAppend = (log: SyncLog, id: string): boolean =>
  log.pending.some(({ op }) => op.kind === 'append' && op.action.id === id);

/**
 * Lays an update from the host over the confirmed log, then settles the
 * reader's pending ops: those no longer in `outbox` (the host's pending list).
 */
export const receive = (log: SyncLog, update: IncomingUpdate, outbox: readonly LocalOp[]): SyncLog => {
  const seq = log.seq + 1;
  const laid = update.kind === 'snapshot' ? laySnapshot(update.entries, seq) : layOps(log, update.ops, seq);
  return {
    ...log,
    confirmed: [...laid],
    cursor: update.cursor,
    marks: [...(update.kind === 'snapshot' ? [] : log.marks), { cursor: update.cursor, seq }].slice(-MARK_LIMIT),
    seq,
    pending: log.pending.filter(({ op }) => outbox.some((queued) => sameOp(queued, op))),
  };
};

const laySnapshot = (entries: readonly SyncEntry[], seq: number): Confirmed[] => {
  const seen = new Set<string>();
  return entries.flatMap((entry) => {
    if (seen.has(entry.action.id)) return [];
    seen.add(entry.action.id);
    return [{ entry, seq }];
  });
};

const layOps = (log: SyncLog, ops: readonly IncomingOp[], seq: number): readonly Confirmed[] =>
  ops.reduce<readonly Confirmed[]>((confirmed, op) => {
    switch (op.kind) {
      case 'append':
        return confirmed.some(({ entry }) => entry.action.id === op.entry.action.id)
          ? confirmed
          : [...confirmed, { entry: op.entry, seq }];
      case 'remove':
        return confirmed.filter(({ entry }) => entry.action.id !== op.id);
      case 'clear': {
        // A cursor this reader received tells exactly what the clear covers;
        // for one it never received, everything it received before goes.
        const upToSeq = log.marks.find((mark) => mark.cursor === op.upTo)?.seq ?? seq - 1;
        return confirmed.filter((item) => item.seq > upToSeq);
      }
    }
  }, log.confirmed);

export const appendOwn = (log: SyncLog, action: DraftAction): SyncStep => {
  const op: LocalOp = { kind: 'append', action };
  return { log: { ...log, pending: [...log.pending, { op, covers: NO_COVERS }] }, push: [op] };
};

/**
 * Takes an action back. The remove stays pending even for an append not
 * confirmed yet: that append may already be on the wire and be confirmed.
 * Another reader's action is only taken back when `others` says so.
 */
export const retract = (log: SyncLog, id: string, options?: { readonly others?: boolean }): SyncStep => {
  const entry = visibleEntries(log).find((item) => item.action.id === id);
  if (entry === undefined) return { log, push: [] };
  if (!isOwnEntry(log, entry) && options?.others !== true) return { log, push: [] };
  const op: LocalOp = { kind: 'remove', id };
  const pending = log.pending.filter((item) => !(item.op.kind === 'append' && item.op.action.id === id));
  return { log: { ...log, pending: [...pending, { op, covers: NO_COVERS }] }, push: [op] };
};

/** What clearing now would cover, `null` before the host answered. Taken when the reader is asked. */
export const clearMark = (log: SyncLog): ClearMark | null =>
  log.cursor === undefined
    ? null
    : { upTo: log.cursor, covers: new Set(log.confirmed.map(({ entry }) => entry.action.id)) };

/**
 * Clears what the reader saw at `mark` and takes back every own action on
 * top of it. What others added after the mark stays.
 */
export const clearAll = (log: SyncLog, mark: ClearMark | null): SyncStep => {
  const own = visibleEntries(log).filter(
    (entry) => isOwnEntry(log, entry) && !(mark?.covers.has(entry.action.id) ?? false),
  );
  const retracted = own.reduce<SyncStep>(
    (step, entry) => {
      const next = retract(step.log, entry.action.id);
      return { log: next.log, push: [...step.push, ...next.push] };
    },
    { log, push: [] },
  );
  if (mark === null) return retracted;
  const op: LocalOp = { kind: 'clear', upTo: mark.upTo };
  return {
    log: { ...retracted.log, pending: [...retracted.log.pending, { op, covers: mark.covers }] },
    push: [...retracted.push, op],
  };
};

/** How many of the reader's ops are waiting for the host. */
export const pendingCount = (log: SyncLog): number => log.pending.length;

/**
 * Which actions a change may take back: only own ones not confirmed yet (a
 * dispatch folding into the reader's last edit), any own one (undo), or any
 * at all (the reader deleting an entry; the host decides).
 */
export type Reach = 'pending' | 'own' | 'any';

/**
 * Turns the draft the reader's change computed into ops: what left it is
 * taken back as far as `reach` allows, what is new is appended in order.
 */
export const reconcile = (log: SyncLog, next: readonly DraftAction[], reach: Reach): SyncStep => {
  const kept = new Set(next.map((action) => action.id));
  const visible = visibleEntries(log);
  const shown = new Set(visible.map((entry) => entry.action.id));
  const left = visible.filter((entry) => !kept.has(entry.action.id) && reaches(log, entry, reach));
  const retracted = left.reduce<SyncStep>(
    (step, entry) => {
      const taken = retract(step.log, entry.action.id, { others: reach === 'any' });
      return { log: taken.log, push: [...step.push, ...taken.push] };
    },
    { log, push: [] },
  );
  return next
    .filter((action) => !shown.has(action.id))
    .reduce<SyncStep>((step, action) => {
      const appended = appendOwn(step.log, action);
      return { log: appended.log, push: [...step.push, ...appended.push] };
    }, retracted);
};

const reaches = (log: SyncLog, entry: SyncEntry, reach: Reach): boolean => {
  switch (reach) {
    case 'pending':
      return isPendingAppend(log, entry.action.id);
    case 'own':
      return isOwnEntry(log, entry);
    case 'any':
      return true;
  }
};
