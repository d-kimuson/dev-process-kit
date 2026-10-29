# dpk-comment-panel

The review panel: the list of draft actions and comments, the stale markers, editing and deletion, and the copy hand-off for the agent. It is a Shadow DOM component, and the only place the framework renders template-specific text — through `describe()` and `serialize()`.

Every template uses the shared panel. Every template floats it in a popover over the page, closed by default and opened by two buttons of the floating menu: **Review comments** (the comment icon) shows the comments for the agent and the composer, and **Activity log** (the history icon) shows the structural changes of the draft. The popover opens beside that menu, aligned to the screen's right edge, and takes the height down to the bottom of the screen; the main column keeps its full width under it. It stays open while the reader works on the page (a comment often points at what they click next), and closes from the pressed toggle or Escape; text half written survives closing it. Each toggle's badge counts its part of the draft, and hovering or focusing an icon button names it. A page with questions gets a third toggle between them for the questions themselves, with an `answered / total` badge (`docs/index.md`, Questions (grill)).

Review comments are requests to the agent ("fix this here"): they live in the draft and leave with the hand-off. They are not the comments a template keeps as part of its content, such as the comments on a user story map's story (`docs/views/usm.md`), which are base data.

## Rendering contract

Action rows are rendered by the template's `describe()` / `serialize()`, and the target choices by `commentTargets()` / `currentTarget()`. `describe()` must not throw when the target has disappeared — stale actions are rendered too, with a `target-missing` / `constraint-violated` / `unsupported-action-type` badge. These hooks are framework internals, not part of the page contract; their signatures are in the repository's developer guide (`dev-docs/guidelines/architecture.md`).

## Composer

The composer dispatches a core `comment` action:

```json
{ "type": "comment", "target": "step:google-auth", "payload": { "body": "…" } }
```

| State                                        | Target                                                                         |
| -------------------------------------------- | ------------------------------------------------------------------------------ |
| an explicit request is pending               | that target (shown as a chip you can clear)                                    |
| the "attach to the current …" checkbox is on | `currentTarget(state, nav)` of the template                                    |
| otherwise                                    | the page as a whole, `page:<content name>` (qualified `@<page>` inside a page) |

The checkbox only appears when the template implements `currentTarget()`. `requestComment(target)` on the template element (or `data-dpk-comment="step:id"` in author markup) pre-fills the composer with that exact target, which is how per-element comment buttons work; the chip shows where the note will land, and clearing it returns to the checkbox. `Ctrl`/`Cmd`+Enter submits, except during IME composition. The `onComment` callback returns the dispatch outcome: a rejected submission retains its text and a successful one clears it.

## Editing a comment

A posted comment has an edit button beside its delete button. It turns the comment into an editor holding its text: `Save` (or `Ctrl`/`Cmd`+Enter) replaces the comment's body, `Cancel` (or Escape) leaves it as it was, and neither fires during IME composition. A blank text cannot be saved; delete the comment instead. An edit changes only the body: the comment keeps its id, target, time and place in the draft, and the stored draft keeps its format, so drafts saved before editing existed load and edit as usual. One comment is edited at a time, separately from the composer's unsent text. Only comments are editable; a structural change is undone by deleting it and making it again. The panel calls `onEditComment(id, body)`; a rejected edit keeps the editor and its text. Without that callback there is no edit button. On a template, `element.api.editComment(id, body)` does the same.

Board-element requests use the same composer, with component labels and stable `element:` references; see `docs/boards/index.md`. They do not create a separate comment history.

## Hand-off

| Button                    | Payload                                                                                                   |
| ------------------------- | --------------------------------------------------------------------------------------------------------- |
| `Send to Claude`          | inside a Claude Artifact only: the brief, posted as a comment sent to Claude (`docs/index.md`)            |
| `Copy changes & comments` | the brief — markdown: template, version, navigation, comments, requested changes, then the canonical JSON |
| `Clear all`               | removes every draft action, changes and review comments alike                                             |

The hand-off and `Clear all` act on the whole draft whichever section the popover shows. `Copy changes & comments` and `Send to Claude` are disabled while the draft is empty. While the popover is closed and there is a draft, the template shell floats the same two buttons at the bottom right, so the review can be handed off without opening it.

`element.api.exportBrief()` returns the same markdown as `Copy changes & comments` (including the stale count), and `element.api.exportDraft()` returns the JSON with `template`, `frameworkVersion` and `exportedAt`. Both are produced from the draft only; the agent receives the base HTML separately, so it can diff intent against the current base.

## Standalone use

The panel is a normal custom element, but it expects a derivation, not a state: assign `definition`, `state`, `navigation` and `derivation`, and re-assign `derivation` after every change. Inside a template the base element does that for you.

| Property (attribute: false)                            | Type                                                   | Purpose                                                                             |
| ------------------------------------------------------ | ------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `definition`                                           | `TemplateDefinition`                                   | `describe` / `serialize` / `commentTargets`                                         |
| `state`                                                | derived state                                          | passed to `describe`                                                                |
| `navigation`                                           | `Navigation`                                           | passed to `commentTargets`                                                          |
| `derivation`                                           | `Derivation`                                           | the draft, comments, stale list                                                     |
| `issues`                                               | `ValidationIssue[]`                                    | last rejected dispatch, rendered as an inline alert                                 |
| `pendingTarget`                                        | `string \| null`                                       | target ref focused by `requestComment()`                                            |
| `exportBrief`                                          | `() => string`                                         | optional canonical host brief (shared fallback otherwise)                           |
| `sendToClaude`                                         | `() => Promise<{ ok: true } \| { ok: false, reason }>` | shows the `Send to Claude` button and runs it; left unset outside a Claude Artifact |
| `onDelete` / `onClear` / `onComment` / `onEditComment` | callbacks                                              | the only way the panel changes anything                                             |

The boolean `embedded` property/attribute hides the panel heading and its copy button when the enclosing template supplies those controls. The composer, draft rows and Clear button remain unchanged.

The `section` property/attribute picks the part of the draft the panel lists: `changes` lists the structural changes alone, without the composer; `comments` lists the review comments with the composer; anything else (the default) lists both, review comments first, each under its own heading.
