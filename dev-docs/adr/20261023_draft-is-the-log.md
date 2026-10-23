# The draft is the log of what the reader did, with undo and redo

The draft no longer compacts by result. It is the plain, ordered log of the actions the reader produced, and the core gives the reader undo and redo over that log.

## Status

accepted. Supersedes [20260924_interpretive-drafts](20260924_interpretive-drafts.md).

## Context

The previous decision kept the draft interpretive: the core searched for sets of actions whose removal left the derived state unchanged, and dropped them, so an addition deleted again (or a move and its move back) left nothing behind. This made the review rail and the agent brief show only the net change.

In practice this traded one surprise for another. The reader's own sequence of edits — including ones they want the agent to see, such as trying a change and backing it out — could vanish from the draft without an explicit undo, and the search's candidate sets (contiguous runs, "related" entities guessed from target ids and string payloads) were a second, harder-to-predict notion of equality sitting next to the actual derived state. The reader also had no way to undo a single step: removing an action meant finding it in the review rail and deleting it by hand, with no redo if they changed their mind.

What the reader actually wants is simpler: the draft is what happened, in order, and Cmd+Z/Ctrl+Z takes the last step back.

## Decision

- **The draft is a plain log.** The core no longer tries to cancel one action against another by comparing results. Every dispatched action stays in the draft until the reader removes it (by hand, or with undo) or the base stops supporting it (stale).
- **Two narrower rules survive, because they are not about history:**
  - A patch the base (or an earlier action) already satisfies is dropped as a no-op on the next derive — the draft never asks for a change that is not one.
  - Patch actions to the same target are deduped when adjacent: editing the same field twice in a row replaces the first draft entry with the second rather than keeping both. This keeps a draft close to one entry per edit instead of one per keystroke or per intermediate autosave, and it predates this decision.
- **`canonicalState` stays in the template contract**, because the no-op check above still needs it: without it, a patch that only rewrites incidental structure a template never shows (for example a global order only shown per lane) is not recognized as unchanged.
- **Undo and redo live in the core (`DraftController`), not per template.** `undo()` removes the draft's last entry and re-derives; `redo()` replays the most recently undone entry. Every entry the reader produced is in scope, comments included — a comment is as much a part of "what happened" as any other action. A new call to `dispatch`/`dispatchBatch`/`editComment`/`removeAction`/`clearActions`/`replaceActions`/`setBase` clears the redo stack, the same as any undo history. The redo stack is in-memory only: a reload restores the persisted draft but not what had just been undone, which keeps persistence unchanged and the feature simple.
- **The reader drives this with the keyboard and with header buttons**, both core-owned shell pieces: Cmd+Z/Ctrl+Z to undo, Shift+Cmd+Z/Ctrl+Shift+Z/Ctrl+Y to redo, ignored while focus is in a text field or `contenteditable` so native text-editing undo keeps working.

## Consequences

- The review rail and the agent brief now show every step, including ones that net out to nothing: adding something and deleting it again shows both. This is the explicit goal — the agent sees what the reader actually tried, not the core's guess at their intent.
- Patch-field dedupe means undoing a repeatedly-edited field steps back past every edit since the field was last touched, not one keystroke at a time: the intermediate values were never kept. This is an accepted, pre-existing limit of patch dedupe, not something undo changes.
- Compaction's result-equality search (candidate runs, `canonicalState`-aware comparison across arbitrary action sets) is gone; only the single-action no-op check still uses `canonicalState`.
- Undo/redo apply to the whole draft a `DraftController` owns. For a page with boards, that is the page's combined, board-qualified draft: the page's own header is where undo/redo live, not each board's.
