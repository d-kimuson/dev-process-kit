/**
 * A controller's end of a shared draft: the log, the session the host opened
 * for it and where the session stands. The decisions are the pure `log.ts`.
 */
import type { DraftAction } from '../types';

import {
  clearAll,
  clearMark,
  isConnected,
  isOwnEntry,
  isPendingAppend,
  openLog,
  receive,
  reconcile,
  visibleActions,
  visibleEntries,
  withPending,
  type ClearMark,
  type Reach,
  type SyncLog,
  type SyncStep,
} from './log';
import {
  readUpdate,
  type ActionReader,
  type Author,
  type IncomingUpdate,
  type LocalOp,
  type SyncEntry,
  type SyncHost,
  type SyncSession,
  type SyncStatus,
} from './protocol';

export type SyncState = {
  readonly status: SyncStatus;
  readonly reason: string | undefined;
  /** The reader's ops the host has not settled. */
  readonly unsent: number;
};

/** `received` re-derives the draft; `status` only redraws where the session stands. */
export type ChannelChange = 'received' | 'status';

export class SyncChannel {
  #log: SyncLog;
  #entries: readonly SyncEntry[] = [];
  #actions: DraftAction[] = [];
  #session: SyncSession | null = null;
  /** What the reader changed while the session was closed, for the next one. */
  #held: LocalOp[] = [];
  #status: SyncStatus = 'connecting';
  #reason: string | undefined;
  /** Updates the host hands over while it is still opening the session. */
  #early: IncomingUpdate[] | null = null;
  /** The unsent count the last status came with. */
  #told = 0;
  /** Which session's sink may still speak; a closed one's may not. */
  #opened = 0;

  constructor(
    readonly host: SyncHost,
    readonly readAction: ActionReader,
    readonly onChange: (change: ChannelChange) => void,
  ) {
    this.#log = openLog(host.self, []);
    this.#open();
  }

  get self(): Author {
    return this.#log.self;
  }
  /** The same array until what the reader sees changes. */
  get actions(): DraftAction[] {
    return this.#actions;
  }
  get connected(): boolean {
    return isConnected(this.#log);
  }
  get state(): SyncState {
    return { status: this.#status, reason: this.#reason, unsent: this.#pending().length };
  }

  /** The host's stamp; the reader for their own action the host has not stamped yet. */
  authorOf(id: string): Author | undefined {
    const entry = this.#entries.find((item) => item.action.id === id);
    if (entry === undefined) return undefined;
    return entry.author ?? (isOwnEntry(this.#log, entry) ? this.#log.self : undefined);
  }
  isOwn(id: string): boolean {
    const entry = this.#entries.find((item) => item.action.id === id);
    return entry !== undefined && isOwnEntry(this.#log, entry);
  }
  isPending(id: string): boolean {
    return isPendingAppend(this.#log, id);
  }

  /** What the reader would see once `change(next, reach)` went out. */
  preview(next: readonly DraftAction[], reach: Reach): DraftAction[] {
    return visibleActions(reconcile(this.#log, next, reach).log);
  }

  /** Hands the host what changed between what the reader sees and `next`. */
  change(next: readonly DraftAction[], reach: Reach): void {
    this.#apply(reconcile(this.#log, next, reach));
  }

  /** What clearing would cover now; take it when the reader is asked, not when they answer. */
  clearMark(): ClearMark | null {
    return clearMark(this.#log);
  }

  clear(mark: ClearMark | null): void {
    this.#apply(clearAll(this.#log, mark));
  }

  /** Stops hearing from the host. What the reader changes meanwhile waits for `reopen()`. */
  close(): void {
    this.#opened += 1;
    this.#session?.close();
    this.#session = null;
  }

  /** Opens a new session after `close()`; the host answers it from the start. */
  reopen(): void {
    if (this.#session === null) this.#open();
  }

  #open(): void {
    this.#opened += 1;
    const opened = this.#opened;
    this.#early = [];
    const session = this.host.open({
      receive: (input) => {
        if (opened !== this.#opened) return;
        const update = readUpdate(input, this.readAction);
        if (update === null) return;
        if (this.#early === null) this.#receive(update);
        else this.#early.push(update);
      },
      status: (status, detail) => {
        if (opened !== this.#opened) return;
        const unsent = this.#early === null ? this.#pending().length : this.#told;
        if (status === this.#status && detail?.reason === this.#reason && unsent === this.#told) return;
        this.#status = status;
        this.#reason = detail?.reason;
        this.#told = unsent;
        if (this.#early === null) this.onChange('status');
      },
    });
    this.#session = session;
    if (this.#held.length > 0) session.push(this.#held);
    this.#held = [];
    this.#log = withPending(this.#log, session.pending);
    this.#told = session.pending.length;
    const early = this.#early;
    this.#early = null;
    for (const update of early) this.#log = receive(this.#log, update, session.pending);
    this.#show();
  }

  #pending(): readonly LocalOp[] {
    return this.#session?.pending ?? this.#held;
  }

  #apply(step: SyncStep): void {
    this.#log = step.log;
    this.#show();
    if (step.push.length === 0) return;
    if (this.#session === null) this.#held = [...this.#held, ...step.push];
    else this.#session.push(step.push);
  }

  #receive(update: IncomingUpdate): void {
    this.#log = receive(this.#log, update, this.#pending());
    if (this.#show()) this.onChange('received');
  }

  /** Takes what the reader sees from the log; `false` when nothing they see changed. */
  #show(): boolean {
    const entries = visibleEntries(this.#log);
    if (sameEntries(this.#entries, entries)) return false;
    this.#entries = entries;
    this.#actions = entries.map((entry) => entry.action);
    return true;
  }
}

/** The host takes an action once per id, so an id and its author say which entry it is. */
const sameEntries = (a: readonly SyncEntry[], b: readonly SyncEntry[]): boolean =>
  a.length === b.length &&
  a.every((entry, index) => {
    const other = b[index];
    return (
      other !== undefined &&
      entry.action.id === other.action.id &&
      entry.author?.id === other.author?.id &&
      entry.author?.name === other.author?.name
    );
  });
