# The change log names the handled draft actions as ranges of `<writer>:<seq>` ids

The page's change log carries one cumulative `addressed` value, such as `k3f9ab12:1-14,x7a2c0d9:1-3`, and every reader's page drops the draft actions it names. Draft action ids are `<writer>:<seq>`, where `writer` is one random id per browser and `seq` counts that browser's actions up from 1.

## Status

accepted

## Context

A draft used to clean itself after a round trip by derivation. Once the agent applied a request and regenerated the HTML, the patch became a no-op against the new base and was dropped. That never covered comments or answers. It also breaks down with a [shared draft](20261102_draft-sync-protocol.md): every reader's actions are kept by the host, the shared draft is never compacted, and a page cannot tell "the author handled this" from "this still applies". So handled requests piled up and were handed to the agent again on every round.

Only the author knows what was handled, so the regenerated page has to say so. The question was how to say it without the statement growing with the page's lifetime:

- **List the ids per revision.** This grows with every round, and dropping old revisions from the log would bring their requests back.
- **Keep UUID ids and list them cumulatively.** This grows without bound for a page that is reviewed often.
- **Number the actions.** If each browser counts its own actions, one browser's handled actions form a range, so a long-lived page needs one short item per writer.

A sequence also needs a counter. An IndexedDB auto-increment key is asynchronous and would make dispatch asynchronous. A synchronous read, add one and write in `localStorage` can hand the same number to two tabs that dispatch at the same instant. Actions come only from a reader's hand, so that race was accepted.

## Decision

- **Ids are `<writer>:<seq>`.** The writer and its last number are kept in `localStorage`, shared by every page of the origin. Without storage, the writer lasts for the page load. Ids of the older UUID form are still read, but nothing names them, so they stay until the reader removes them. This is an intentional incompatibility.
- **`addressed` is cumulative and lives at the top level of the change log**, next to `revisions`. It does not belong to a revision, so dropping old revisions keeps it. The author replaces the value and never appends to it.
- **The brief computes the next value.** The next value is the current value plus, for each writer in the draft, the range from 1 to that writer's highest id, gaps included. One writer's actions reach every reader in the order they were made, so a lower number missing from the draft was already undone or folded away and is not still on its way. To defer a request, the author splits its id out of the range. The next brief fills the gap again, because the request is still in the draft.
- **Every page drops what is named.** An unshared draft drops it from storage. A shared draft sends a `remove` for each named action, whoever wrote it, including one that arrives later. The host already ignores a removal of an action that is gone, so it needs no new op kind and no new rule.

## Consequences

- A handled request no longer comes back, for comments and answers as well as patches, and the value stays one item per writer as long as nothing is deferred.
- The value is only as correct as the author's copy. Writing a range beyond the brief's value would drop requests the author never saw. The brief therefore prints the value to copy, and the docs say not to compute it by hand.
- Two tabs that take the same number at once produce two actions with one id. With a shared draft, the host keeps only the first one. The second is lost, and an `addressed` naming that id drops the first.
- Clearing site data starts a new writer. Its ranges start again from 1 under the new name, which costs one more item.

## References

- [Draft sync protocol](20261102_draft-sync-protocol.md)
- `docs/index.md` (Draft actions, Change notices) and `docs/sync.md` (Notes)
