/**
 * One draft's log, kept the way `docs/sync.md` ("What the server does") asks a
 * server to keep it: ops in arrival order, each append stamped with the
 * request's author and taken once per id, a remove of nothing ignored, a clear
 * up to a cursor, and a snapshot for a range that holds a clear.
 *
 * A cursor is `<epoch>-<position>`. The epoch changes when the server starts
 * or resets, so a reader holding a cursor from before gets a snapshot.
 */

/** What the server keeps of an action: its id and whatever else the reader sent. */
export type StoredAction = { readonly id: string; readonly [key: string]: unknown };
export type DemoAuthor = { readonly id: string; readonly name: string };

export type IncomingOp =
  | { readonly kind: 'append'; readonly action: StoredAction }
  | { readonly kind: 'remove'; readonly id: string }
  | { readonly kind: 'clear'; readonly upTo: string };

export type LoggedOp =
  | { readonly kind: 'append'; readonly action: StoredAction & { readonly author: DemoAuthor } }
  | { readonly kind: 'remove'; readonly id: string }
  | { readonly kind: 'clear'; readonly upTo: string };

/** An op as the log viewer shows it: who sent it, and when. */
export type LogEntry = { readonly op: LoggedOp; readonly by: DemoAuthor; readonly at: string };

export type Update =
  | { readonly kind: 'snapshot'; readonly cursor: string; readonly actions: readonly StoredAction[] }
  | { readonly kind: 'ops'; readonly cursor: string; readonly ops: readonly LoggedOp[] };

type Row = { readonly action: StoredAction & { readonly author: DemoAuthor }; readonly position: number };

export class DraftLog {
  readonly #epoch: string;
  readonly #entries: LogEntry[] = [];
  #rows: Row[] = [];
  readonly #seen = new Set<string>();

  constructor(epoch: string) {
    this.#epoch = epoch;
  }

  get entries(): readonly LogEntry[] {
    return this.#entries;
  }

  get actions(): readonly StoredAction[] {
    return this.#rows.map((row) => row.action);
  }

  get cursor(): string {
    return `${this.#epoch}-${this.#entries.length}`;
  }

  /** Orders `ops` after everything logged; `true` when the log changed. */
  apply(author: DemoAuthor, ops: readonly IncomingOp[]): boolean {
    const before = this.#entries.length;
    for (const op of ops) {
      const logged = this.#take(author, op);
      if (logged !== null) this.#entries.push({ op: logged, by: author, at: new Date().toISOString() });
    }
    return this.#entries.length !== before;
  }

  /** Everything after `after`: the ops, or a snapshot when there is no cursor, a foreign one or a clear. */
  answer(after: string | undefined): Update {
    const cursor = this.cursor;
    const from = this.#position(after);
    const ops = from === undefined ? null : this.#entries.slice(from).map((entry) => entry.op);
    if (ops === null || ops.some((op) => op.kind === 'clear'))
      return { kind: 'snapshot', cursor, actions: this.actions };
    return { kind: 'ops', cursor, ops };
  }

  #take(author: DemoAuthor, op: IncomingOp): LoggedOp | null {
    switch (op.kind) {
      case 'append': {
        if (this.#seen.has(op.action.id)) return null;
        this.#seen.add(op.action.id);
        const action = { ...op.action, author };
        this.#rows.push({ action, position: this.#entries.length + 1 });
        return { kind: 'append', action };
      }
      case 'remove': {
        if (!this.#rows.some((row) => row.action.id === op.id)) return null;
        this.#rows = this.#rows.filter((row) => row.action.id !== op.id);
        return op;
      }
      case 'clear': {
        const upTo = this.#position(op.upTo);
        if (upTo === undefined) return null;
        this.#rows = this.#rows.filter((row) => row.position > upTo);
        return op;
      }
    }
  }

  /** The position a cursor this log gave stands for; `undefined` for any other. */
  #position(cursor: string | undefined): number | undefined {
    const match = /^(.+)-(\d+)$/.exec(cursor ?? '');
    if (match?.[1] !== this.#epoch) return undefined;
    const position = Number(match[2]);
    return position <= this.#entries.length ? position : undefined;
  }
}

/** Every draft the server keeps, one log per storage key and template. */
export class DraftHub {
  #epoch = 0;
  #logs = new Map<string, DraftLog>();
  readonly #started = Date.now().toString(36);

  log(storageKey: string, template: string): DraftLog {
    const key = `${storageKey} / ${template}`;
    const existing = this.#logs.get(key);
    if (existing !== undefined) return existing;
    const created = new DraftLog(`${this.#started}.${this.#epoch}`);
    this.#logs.set(key, created);
    return created;
  }

  get logs(): ReadonlyMap<string, DraftLog> {
    return this.#logs;
  }

  /** Forgets every draft; readers holding an old cursor get a snapshot. */
  reset(): void {
    this.#epoch += 1;
    this.#logs = new Map();
  }
}
