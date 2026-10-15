# Let the host page provide a shared draft store

A template element asks its page for a draft store before restoring its draft. A host that answers can keep one draft for every reader of the page and push other readers' changes in as they happen.

## Status

proposed

## Context

Drafts live in each reader's `LocalStorage`, so a review is one person's. Pages are increasingly opened by several people at once — shared through an internal hosting app, for instance — and they want to see each other's comments and moves on a board as they make them, without a round-trip through the agent.

Several shapes were possible:

- **A Firebase (or other vendor) adapter inside the kit** would tie the package to one backend, its SDK size and its authentication, while the identity of the reader is known only to the host.
- **An attribute naming a backend URL** would make the kit define a wire protocol and an auth scheme.
- **A DOM event the host answers** keeps the public contract browser-native: the kit defines only the store's shape, and the host brings the backend and the reader's identity.

## Decision

- **The element asks, the host provides.** `dpk-storage-request` carries the template, the storage key and `provide(storage, { author })`. With no answer the element keeps its default store, so standalone pages behave exactly as before.
- **The store contract stays synchronous and gains `subscribe`.** `load` may return nothing and the first pushed snapshot fills the draft, so the controller and its derivation stay synchronous. A pushed snapshot is validated and shown but never normalized or written back, so readers do not echo each other.
- **The reader is an optional `author` on the action envelope.** It is stamped by the controller, not chosen per action, and is carried through validation, the draft JSON and the review rail.
- **Merging is the host's job.** The kit hands the host the whole draft on every change; a host that stores one record per action and deletes only what the reader saw keeps concurrent additions from overwriting each other.

## Consequences

- A shared draft is still a draft: everyone's changes are change requests against the agent's base, and the hand-off sends all of them.
- Compaction works across readers. An addition by one reader and its deletion by another cancel, which suits a shared board but means the review no longer records who disagreed.
- Templates whose draft is one person's answer (delegation poker's hidden cards, grill answers) lose their meaning when shared; a host should not share them, or the kit has to learn which templates may be shared.
- Any reader can edit or remove any action in the rail; there is no ownership rule yet.
- The store contract is now part of the public surface and has to stay compatible.
