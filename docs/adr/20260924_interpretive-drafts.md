# Keep drafts interpretive: drop actions that cancel out

A draft states what should change, not the history of how the reader got there. After every change, the core drops each set of template actions whose removal leaves the artifact meaning the same.

## Status

accepted

## Context

The draft was designed as an accumulating log. Patch actions were deduped per target, and a patch that the base already satisfied was dropped, but everything else piled up: adding a note and deleting it again left two actions, and moving a story away and back left two moves. The review rail and the agent brief then showed changes that did not change anything, and the agent had to work out that they cancel.

Two approaches were possible:

- **Per-template inverse rules** (DELETE cancels ADD, a move back cancels a move). Every template would need rules for every pair of actions, and a rule that is slightly wrong silently drops a change the reader asked for.
- **Judging by the result.** Try removing candidate sets of actions and keep the removal only when the derived state still means the same. A loose candidate search can then miss a cancellation, but it can never drop a real change.

## Decision

- **The core compacts the draft by result.** After a dispatch (and when a draft is restored or replaced), the core tries candidate sets around each new action: contiguous runs that end where they started, and earlier actions that name the same entities. A set is removed only if the derived state then means the same as before. Actions that lose their target because of the removal (a rename of a note that is no longer added) are removed with it, under the same condition.
- **Comments, stale actions and component element actions are never removed.** The core cannot judge the effect of an element action, a comment is not a change, and a stale action is kept so the reader can see why it no longer applies.
- **"Means the same" is decided by the template.** A template may implement `canonicalState` to rewrite incidental structure (such as the global order of items that are only shown per lane) before states are compared. Without it, states are compared as they are.

## Consequences

- The review rail and the brief show the net change. Undoing by hand is as good as removing actions from the draft.
- A cancellation depends on the candidate search. An unusual sequence that cancels out may stay in the draft. That is harmless, and it can be improved without changing the contract.
- A template whose state stores an order it never shows must implement `canonicalState`, or moves that visually return to the start will not cancel.
- Compaction re-derives the draft for each candidate. Drafts are small, but the cost grows with the number of related actions. The run scan over the whole draft happens only for newly dispatched actions.
