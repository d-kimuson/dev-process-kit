# dpk-component-comment-panel

The review rail: the list of draft actions and comments, the stale markers, deletion, and the copy hand-off for the agent. It is a Shadow DOM component, and the only place the framework renders template-specific text — through `describe()` and `serialize()`.

Every template uses the shared panel. Most templates place it in a notes rail, closed by default and toggled by the floating comment button. Grill embeds it in the **Review** tab beside its questions and uses one combined copy button (`docs/templates/grill.md`).

## Rendering contract

Action rows are rendered by the template's `describe()` / `serialize()`, and the target choices by `commentTargets()` / `currentTarget()`. `describe()` must not throw when the target has disappeared — stale actions are rendered too, with a `target-missing` / `constraint-violated` / `unsupported-action-type` badge. These hooks are framework internals, not part of the page contract; their signatures are in the repository's developer guide (`dev-docs/guidelines/architecture.md`).

## Composer

The composer dispatches a core `comment` action:

```json
{ "type": "comment", "target": "step:google-auth", "payload": { "body": "…" } }
```

| State                                        | Target                                      |
| -------------------------------------------- | ------------------------------------------- |
| an explicit request is pending               | that target (shown as a chip you can clear) |
| the "attach to the current …" checkbox is on | `currentTarget(state, nav)` of the template |
| otherwise                                    | the page as a whole, `page:<template name>` |

The checkbox only appears when the template implements `currentTarget()`. `requestComment(target)` on the template element (or `data-dpk-comment="step:id"` in author markup) pre-fills the composer with that exact target, which is how per-element comment buttons work; the chip shows where the note will land, and clearing it returns to the checkbox. `Ctrl`/`Cmd`+Enter submits, except during IME composition. The `onComment` callback returns the dispatch outcome: a rejected submission retains its text and a successful one clears it.

Diagram-element requests use the same composer, with component labels and stable `element:` references; see `docs/components/diagrams.md`. They do not create a separate comment history.

## Hand-off

| Button          | Payload                                                                                        |
| --------------- | ---------------------------------------------------------------------------------------------- |
| `Claude に送る` | inside a Claude Artifact only: the brief, posted as a comment sent to Claude (`docs/index.md`) |
| `Copy JSON`     | `serializeDraft(actions)` — the canonical draft, an array of action objects                    |
| `Copy brief`    | markdown: template, version, navigation, comments, requested changes, then the canonical JSON  |
| `Clear`         | removes every draft action                                                                     |

`element.api.exportBrief()` returns the same markdown as `Copy brief` (including the stale count), and `element.api.exportDraft()` returns the JSON with `template`, `frameworkVersion` and `exportedAt`. Both are produced from the draft only; the agent receives the base HTML separately, so it can diff intent against the current base.

## Standalone use

The panel is a normal custom element, but it expects a derivation, not a state: assign `definition`, `state`, `navigation` and `derivation`, and re-assign `derivation` after every change. Inside a template the base element does that for you.

| Property (attribute: false)          | Type                                                   | Purpose                                                                            |
| ------------------------------------ | ------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `definition`                         | `TemplateDefinition`                                   | `describe` / `serialize` / `commentTargets`                                        |
| `state`                              | derived state                                          | passed to `describe`                                                               |
| `navigation`                         | `Navigation`                                           | passed to `commentTargets`                                                         |
| `derivation`                         | `Derivation`                                           | the draft, comments, stale list                                                    |
| `issues`                             | `ValidationIssue[]`                                    | last rejected dispatch, rendered as an inline alert                                |
| `pendingTarget`                      | `string \| null`                                       | target ref focused by `requestComment()`                                           |
| `exportBrief`                        | `() => string`                                         | optional canonical host brief (shared fallback otherwise)                          |
| `sendToClaude`                       | `() => Promise<{ ok: true } \| { ok: false, reason }>` | shows the `Claude に送る` button and runs it; left unset outside a Claude Artifact |
| `onDelete` / `onClear` / `onComment` | callbacks                                              | the only way the panel changes anything                                            |

The boolean `embedded` property/attribute hides the panel heading and its copy buttons when the enclosing template supplies those controls. The composer, draft rows and Clear button remain unchanged.
