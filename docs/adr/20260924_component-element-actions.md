# Record component edits as element actions in the enclosing artifact's draft

A component inside an artifact (a diagram, an author-owned provider) records change requests against its own elements in the enclosing artifact's draft, next to that template's actions and comments. The core stores and orders these element actions but never interprets them; the component replays them against its own data and reports how each one applied.

## Status

accepted

## Context

Components were comment-only by design: a diagram exposes `commentTargets`, and the enclosing template stores comments on `element:<provider-id>/<kind>/<id>` in its draft. Edits were template-only because each template's reducer owns its base data, and a component's data is not part of that base.

Letting readers add a topic to a mind map (and later, similar edits on other diagrams) breaks that split. Three places could hold such an edit:

- **The component itself** (its own storage). Every component would reinvent persistence, the review list, stale handling and the agent brief, and the reader would find the edits of one page in several places.
- **The template's vocabulary.** Every template, including Plain, would need to know every component's actions. Components are meant to be placed in any template without the template knowing them.
- **The enclosing artifact's draft, uninterpreted.** One draft, one review list and one brief, as for comments; the component remains the only code that knows what its actions mean.

## Decision

- **Element actions live in the enclosing artifact's draft.** A component emits cancelable, bubbling, composed `artifact-element-action` with `{ type, target, payload }`. `type` is `CONSTANT_CASE`, and `target` must be one of the component's registered comment targets. The nearest artifact validates and stores the action, then calls `preventDefault()` once it has accepted it, as with `artifact-comment-submit`.
- **The core never interprets them.** A draft action on a target that has a provider segment and is not a comment is an element action, whatever its type. It is stored in sequence and never deduped. It never changes template state, and it takes no part in the template's vocabulary. Template-owned `element:<id>` targets have no provider segment, because entity ids cannot contain `/`, so they keep their template meaning.
- **The component replays and reports.** The artifact assigns each provider its own actions (`elementActions`, keyed by the provider's unique `id`) synchronously after every change. The component applies them to its own authored data and exposes `elementActionResults`: `{ id, title, summary?, tone?, stale? }` per action. It then emits `artifact-comment-targets-change`. The artifact uses these results for applied/stale, the review list and the brief. A result counts only when the provider that owns the action reports it, and an action with no result is stale (`target-missing`), exactly like a comment on a component that is not there.
- **The agent applies element actions to the component's JSON.** The brief lists them with the rest and tells the agent that `element:<id>/…` changes belong to that component's own data, following the vocabulary on the component's page.

## Consequences

- Any template, Plain included, records component edits and shows them in its review rail beside its own actions and comments, with one storage, undo and hand-off path. A component documents its vocabulary on its own page, and a template never has to learn it.
- A component that accepts actions becomes a reducer over its own data. It must keep the authored data separate from the replayed view, report a result for every action it receives, and treat unknown types as stale rather than throwing.
- An element action is only as meaningful as its component: if the component is missing, renamed or of another kind, its actions stay in the draft as stale entries until the component returns. Renaming a component's `id` orphans its actions, just as it orphans its comments.
- A standalone component (outside any artifact) has nobody to accept its actions. It must treat an unacknowledged event as a failure and keep the user's input.
- The provider contract grows by one event and two properties, and those are now part of the public API.

## References

- [Diagram components: custom component providers](../components/diagrams.md)
- [artifact-mind-map](../components/mind-map.md)
