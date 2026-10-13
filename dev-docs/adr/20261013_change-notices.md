# Announce what changed with a change log beside the base data

A page may carry a change log, `<script type="application/json" data-dpk-changes>`, next to its base data. The shell reads it apart from the template, announces the changes this reader has not seen as toasts and an unread badge on a header bell, and remembers what was seen per revision in the browser. "Show" on a change navigates to its target and highlights the element a template or the author marked with `data-dpk-target`.

## Status

accepted

## Context

A reader reviews a page, hands the draft back, and the agent regenerates the whole HTML. The new page looks like the old one with differences scattered over tabs, scenarios and a pannable canvas; the reader has to hunt for what their review changed, and what the agent changed on its own goes unnoticed.

The forces:

- **The base data has no envelope** and holds only the state to render. Revision metadata in it would have to be carried through every template's strict schema and would leak into what the agent edits as the page's content.
- **Only the agent knows what changed and why.** The kit sees one version of the page at a time; diffing against the previous version would need that version, which a regenerated file no longer has.
- **Readers re-open the same page.** An announcement that repeats on every load turns into noise; one that never repeats misses a reader who was away.
- **Targets are already the shared vocabulary** of drafts and comments (`type:id`), but they name meaning, not DOM nodes, and many templates render them behind tabs, folds or a canvas viewport.

Alternatives considered:

- **A `changes` key in each template's base data.** Every template would need to parse and ignore it, and it would break the rule that base data is free of revisions.
- **Diffing in the browser** against a stored copy of the previous base. Works only for readers who saw the previous version in the same browser, and yields structural diffs without the author's intent.
- **A component the author places.** The bell belongs in the shared header so every template announces changes the same way, which only the shell can guarantee.

## Decision

- **The change log is a separate, optional script element** marked `data-dpk-changes`, with a strict schema of its own (`revision`, and changes with `title`, optional `body`, `id`, `target`, `navigate`). The template never reads it; a malformed log is reported in a banner and leaves the page working.
- **Only the changes since the previous version**, written by the agent at regeneration. The kit keeps no history.
- **Read state is per revision and per browser**, stored under the page's storage key. A change is seen once the reader opens the list, closes its toast or follows it; a toast that times out unattended stays unread. A new revision starts unread.
- **"Show" resolves a target through the template**: the template's `navigationFor` turns it into a navigation patch, its `showTarget` hook opens what navigation cannot (a tab it keeps to itself, a fold, a canvas viewport), and the shell then finds the element marked `data-dpk-target` (space-separated refs) across shadow roots, scrolls it into view and highlights it with a short animation.
- **Toasts follow the Sonner pattern** (stacked, timed, paused on hover) but are built with Lit in the shell, since Sonner is React-only.

## Consequences

- Readers see what changed without a server, and a page without a change log is unchanged.
- The agent has to write the log on every regeneration and bump `revision`; a forgotten bump re-uses the previous read state and hides the new changes from readers who saw the old ones.
- Every template has to mark the elements its targets render as and keep `navigationFor` / `showTarget` in step with its navigation. An unmarked target navigates but highlights nothing.
- The shared header gains a control, and the shell owns a second JSON script contract next to the base data.
