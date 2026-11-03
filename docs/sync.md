# Sharing a draft

By default a draft lives in the reader's browser ([Persistence](index.md#persistence)). A page
can share it instead: every reader sees the others' changes and comments, each under its
author's name, and the hand-off carries all of them. The page supplies the server; the kit
supplies the browser side.

There are two layers, and a host may use either:

- **The event.** An element that owns a draft (a view, `<dpk-app>`, a board on its own) asks for
  a host once, before it restores its draft, with a `dpk-sync-request` event. Whatever answers it
  shares the draft. This interface is the contract.
- **`sync.js`.** `serveDraftSync` answers that event for you. It keeps unsent changes across
  reloads, sends them in order, retries, and talks to your server through a `Transport` — the
  bundled `polling`, or one of your own.

Without a host nothing changes: the draft stays in `localStorage`.

## Quick start

Load `sync.js` from the same version as the view, and call `serveDraftSync` in a module script
**before** the view's entry, so the host listens before the view asks:

```html
<script type="module">
  import { serveDraftSync, polling } from 'https://cdn.jsdelivr.net/npm/dev-process-kit@<version>/dist/sync.js';

  serveDraftSync({
    self: { id: currentUser.id, name: currentUser.name },
    transport: ({ storageKey, template }) =>
      polling({
        pull: (cursor) => api.get(`/drafts/${storageKey}/${template}`, { after: cursor }),
        push: (ops, cursor) => api.post(`/drafts/${storageKey}/${template}`, { ops, after: cursor }),
      }),
  });
</script>
<script type="module" src="https://cdn.jsdelivr.net/npm/dev-process-kit@<version>/dist/views/plain.js"></script>
```

`sync.js` defines no element and does not load Lit.

## What the reader sees

- The header says where sharing stands: **Syncing** until the host's first answer (the page shows
  the base data meanwhile), **Synced**, **n unsent**, **Offline** or **Sync error** (the host's
  reason is in its tooltip).
- Each entry in the review names its author (`author.name`).
- The server's order is the draft's order. The reader's own unsent changes sit on top of it, and
  one that another reader's change left without a target (say, an edit of an item someone
  deleted) is dropped quietly. A comment is kept, as in an unshared draft.
- **Undo** takes back the reader's own last change, never another reader's. **Redo** lasts for the
  page load only.
- **Delete** in the review removes the entry whoever wrote it, and `api.importDraft` replaces
  everyone's entries with the imported ones: like the rest of the draft, these are shared.
- Two edits of the same thing fold into one only while both are the reader's own and unsent; once
  sent, an edit is a new entry, since someone may have seen the first.
- A comment can be edited only by its author. The edit reaches the others as a new comment that
  replaces the old one.
- **Clear all** asks first, because it removes other readers' changes too. It removes what the
  reader saw when asked; what others add while the question is open stays.

Every kind of action is shared: changes, comments, answers and component actions.

A board used on its own shares its draft too, but it has no header or review: it shows no status,
author names or warning before clearing.

## The event

```ts
type SyncRequestDetail = {
  protocol: 1;
  storageKey: string; // the element's storage key (`storage-key`, or the default)
  template: string; // the view or board name
  connect(host: SyncHost): void; // call it inside the dispatch; later calls are ignored
};
```

The event bubbles and is composed. A host answers by calling `connect`, synchronously:

```ts
type SyncHost = { protocol: 1; self: Author; open(sink: SyncSink): SyncSession };
type Author = { id: string; name?: string };

type SyncSink = {
  receive(update: RemoteUpdate): void;
  status(status: 'connecting' | 'synced' | 'pending' | 'offline' | 'error', detail?: { reason?: string }): void;
};
type SyncSession = {
  readonly pending: LocalOp[]; // the reader's ops not settled yet, those from before a reload included
  push(ops: LocalOp[]): void;
  close(): void;
};

type Cursor = string; // opaque: never compared, only handed back
type SyncedAction = DraftAction & { author?: Author };
type RemoteUpdate =
  { kind: 'snapshot'; cursor: Cursor; actions: SyncedAction[] } | { kind: 'ops'; cursor: Cursor; ops: RemoteOp[] };
type RemoteOp =
  { kind: 'append'; action: SyncedAction } | { kind: 'remove'; id: string } | { kind: 'clear'; upTo: Cursor };
type LocalOp =
  { kind: 'append'; action: DraftAction } | { kind: 'remove'; id: string } | { kind: 'clear'; upTo: Cursor };
```

An op leaves `pending` once the host has it, or has refused it for good; the element reads
`pending` again on every update. A `kind` the element does not know is ignored, and an action
that does not validate is dropped from what the reader sees — nothing is written back for it.

## `serveDraftSync`

```ts
serveDraftSync({
  self: Author,
  transport: ({ storageKey, template }) => Transport,
  target?: EventTarget,          // where the requests bubble to; default `window`
  storage?: StorageLike | null,  // where unsent ops wait; default `localStorage`
  retry?: { baseMs?: number; maxMs?: number }, // default 1000 / 30000
}): () => void                   // stops answering
```

- One push at a time, in order. Unsent ops are kept in storage under the storage key, the
  template and `self.id`, so a reload sends them once.
- A failed push is retried with a capped exponential backoff, and at once when the browser comes
  back online or the tab becomes visible. The header says **Offline** meanwhile.
- A push rejected with `{ retryable: false, reason }` drops those ops and reports `error` with the
  reason, until a later push goes through.
- When `transport` throws, the request is left unanswered and the draft stays in the reader's
  `localStorage`.
- With `storage: null`, unsent ops wait for the page load only.
- A push's answer, if any, goes to the element like any update.

### `Transport`

```ts
type Transport = {
  listen(
    cursor: Cursor | undefined,
    onUpdate: (update: RemoteUpdate) => void,
    onError: (error: unknown) => void,
  ): () => void;
  push(ops: LocalOp[], cursor: Cursor | undefined): Promise<RemoteUpdate | void>;
};
```

- `listen` delivers every update after `cursor` — a snapshot for `undefined` — until the returned
  function is called. An error does not stop it.
- `push` hands the server `ops` and `cursor`, the last cursor the element received. Its answer
  covers **everything after `cursor`**, other readers' ops included, as a pull from `cursor` would,
  and is never older than what `listen` delivered. A transport with a live channel (WebSocket,
  SSE) answers nothing: the channel brings the ops.
- Throw `{ retryable: false, reason }` for a push the server will never take; anything else is
  retried.

### `polling`

```ts
polling({
  intervalMs?: number, // default 5000
  pull(cursor: Cursor | undefined): Promise<RemoteUpdate>,
  push(ops: LocalOp[], cursor: Cursor | undefined): Promise<RemoteUpdate | void>,
}): Transport
```

Pulls and pushes take turns, so an answer never overtakes another, and `push` is given the cursor
of the last answer. A hidden tab does not pull, and pulls at once when shown. A push without an
answer is followed by a pull at once.

## What the server does

The kit trusts the server for the order and for who wrote what:

- **Order.** Append ops to one log per storage key and template, in the order they arrive. The
  log's position is the cursor.
- **Author.** Stamp each appended action with the author of the request (from your session, not
  from the body).
- **Idempotence.** Take an append once per action id: a retry after a lost answer sends it again.
  Ignore a `remove` of an action that is not there.
- **Clear.** `clear { upTo }` removes the actions appended at or before `upTo`, and keeps the later
  ones.
- **Answers.** Answer a pull, or a push's `cursor`, with the ops after it. When that range holds a
  `clear`, answer with a snapshot instead: a reader cannot tell which of its actions the clear
  covered from the ops alone.

[`dev/sync-demo/hub.ts`](../dev/sync-demo/hub.ts) in the repository is a small in-memory log that
follows these rules, and `dev/sync-demo/` serves it to the samples for trying the protocol locally.

## Notes

- The element asks once. A host registered after the element started does not share it.
- Removed from the page, an element closes its session; put back, it opens a new one and sends
  what the reader changed meanwhile. Moving it keeps the session.
- Unsent changes are stored under `self.id`, and two tabs of the same reader write the same
  entry: while both are offline, a reload may restore only the queue of the tab that wrote last.
  The other tab still sends its own while it stays open, and the server's idempotent append
  makes an op sent by both tabs count once.
- Text typed but not sent yet stays in `sessionStorage`, as in an unshared draft.
