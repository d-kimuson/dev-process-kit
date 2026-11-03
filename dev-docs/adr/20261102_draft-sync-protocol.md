# Share a draft as a server-ordered op log behind an event

An element that owns a draft asks for a host with a `dpk-sync-request` event. A host that answers turns the draft into a log the server orders, with the reader's own unsent ops on top. `dev-process-kit/sync` is one host implementation and is not the contract.

## Status

accepted

## Context

A draft used to live in the reader's browser only. Reviews done by several people, as in issue #31, need everyone to see one draft, with each entry's author, while the kit stays a static bundle with no server of its own. Whoever hosts the page owns identity, storage and transport, and these differ from one host to another: polling, WebSocket, or a platform API.

The alternatives were:

- **A CRDT or OT library.** It merges without a server, but it brings a dependency and a storage format into every page. The draft is already an append-mostly list of actions with ids, so a full merge algorithm buys little.
- **Syncing the derived state.** That loses the per-action authorship and the hand-off's list of requests, which are what the review is for.
- **A kit-defined server API.** It would tie the kit to one backend shape, and a host that already has a realtime channel could not reuse it.

A model of the protocol in Quint (two and three readers, random interleavings of pushes, lost answers, reloads and clears) found five ways a naive version loses or resurrects actions:

- a push answered only with its own ops, which loses actions after a retry and lets a clear delete what the reader never saw;
- a clear sent as ops, which leaves readers disagreeing about what it covered;
- settling a pending op when it shows up in an update rather than when the host acknowledges it;
- a clear that leaves the clearing reader's own unsent actions alive;
- folding an undo into a push that was already sent once.

The rules below are the fixes, and the example tests in `src/core/sync/*.test.ts` keep them.

## Decision

- **The event is the contract.** `dpk-sync-request` carries the storage key, the template and a `connect(host)` callback. The element asks once, before it restores the draft. A host speaks `protocol: 1` with discriminated unions, and the element ignores kinds it does not know, so new kinds are compatible changes. Without an answer, nothing changes.
- **The server orders, the reader rebases.** The draft is the server's log (`append` / `remove` / `clear { upTo }`). The reader's unsent ops are applied on top of it until the host acknowledges them. Own unsent actions that the log made stale are dropped quietly.
- **Authorship bounds what a reader may take back.** Undo, comment edits and folding only touch the reader's own actions, and folding only touches own unsent ones. An edit that has been sent goes out as a new action. Redo uses a fresh id, because the server has already seen the old one.
- **Answers are complete and ordered.** A push carries the last cursor the reader received. Its answer covers everything after that cursor and never goes behind what `listen` delivered; a live channel answers nothing. When a range includes a clear, the server answers with a snapshot.
- **Clear is bounded by what the reader saw.** The reader is asked first. The clear sends `clear { upTo: <cursor when asked> }` and also retracts the reader's own actions, so what others add during the question survives.
- **The host side keeps the hard parts.** `serveDraftSync` keeps the outbox in localStorage per storage key, template and `self.id`, sends one unit at a time, backs off with a cap, and drops ops rejected with `retryable: false`. A transport only moves bytes.

## Consequences

- Hosts can bring their own identity, storage and transport, and the kit adds no dependency. In exchange, the server has to follow rules the kit cannot check: order, author stamping, idempotent append per id, clear up to a cursor, a snapshot for a clear range, and complete answers. `docs/sync.md` states them, and a server that breaks them breaks convergence.
- While shared, the draft is not compacted or pruned the way a local draft is. An edit after sending adds an entry rather than replacing one, so shared drafts grow longer.
- The protocol has no merge for concurrent edits of the same thing. The server's order decides: the action it orders last wins.
- Delete and import are not bounded by authorship: a reader can remove another reader's entry, as they can see it. A host that needs per-author permissions refuses those removes with `retryable: false`.
- Two tabs of one reader write the same outbox entry. While both are offline, a reload can restore only the last writer's queue. Server idempotence keeps the result free of duplicates, but an op can be lost if its tab closes before it is sent.
- Changing the meaning of an existing kind requires `protocol: 2` and a host that speaks both.

## References

- Issue #31: https://github.com/d-kimuson/dev-process-kit/issues/31
- [docs/sync.md](../../docs/sync.md)
