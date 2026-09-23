# dev-process-kit

Single HTML Artifact Framework — build-free single-file HTML artifacts with a structured draft/feedback loop back to an agent.

```text
Artifact = Base Data (JSON baked into the HTML)
         + Template (meaning model + action vocabulary)
         + Draft Actions (the human's change requests, persisted in LocalStorage)
         + Navigation State (URL hash, never a draft action)
         + Slots (author-owned light DOM UI)
```

The template owns meaning: what a "step", a "story" or a sticky note _is_, and which actions apply to it. Your HTML owns the content. The public contract is custom elements, attributes, properties, DOM events and slots — Lit is an implementation detail.

## Load it

Load one entry, with the version pinned: an artifact has to keep working when a new version is published, so never generate HTML against a floating URL.

| Entry                                                                                                                                                        | Use it when                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `templates/prototype.js` / `templates/usm.js` / `templates/event-storming.js` / `templates/example-mapping.js` / `templates/grill.js` / `templates/plain.js` | the page is that template (`plain`: none of the others fits — header and review only) |
| `components.js`                                                                                                                                              | the page uses the review rail or the diagram elements without a template              |
| `index.js`                                                                                                                                                   | one URL for everything                                                                |

```html
<script type="module" src="https://dev-process-kit.biz-km.workers.dev/dev-process-kit@debug/templates/prototype.js"></script>
```

A template entry registers that template, the review rail and inline editing. Add `components.js` when the page also uses the diagram elements directly.

## Minimal artifact

```html
<artifact-prototype storage-key="my-flow">
  <!-- base data: the initial meaning state -->
  <script type="application/json">
    { "title": "Signup", "activities": [] }
  </script>

  <!-- your markup, slotted into framework chrome -->
  <p slot="header">…</p>
  <div slot="main">…</div>
</artifact-prototype>
```

One HTML file holds exactly one artifact root. What goes inside the base data, and which light DOM a template matches, is the template's business: each template documents its own shape under `docs/templates/`.

## Base data

The base data is the state the template would render with zero draft actions. It is JSON, baked into the HTML, and it has **no envelope**: the custom element already names the template and the script URL already pins the version, so `{ "activities": [] }` is the whole document, not `{ "template": …, "schema": …, "data": … }`. Keep it free of drafts, revisions and framework metadata.

Each template parses its own shape with strict validation: an unknown key is an error, not a silent no-op, and the element renders an error banner and starts from an empty artifact. Missing optional collections default to empty arrays, so a minimal document is often just `{ "title": "…" }`.

### Escaping inside the JSON script block

The base data lives inside an HTML `<script>` element, so a literal `</script>` anywhere in the text — including inside a JSON string — closes the block early: the tail of the JSON becomes page markup and the artifact falls back to the error banner. Escape the solidus:

```json
{ "body": "… <script>alert(1)<\/script> …" }
```

`\/` is valid JSON and parses back to `/`. This matters for any template whose bodies contain HTML or code fences (a step description quoting a script tag, for example).

## Ids

Ids come from the HTML and are the contract between the base data and the draft actions. Never generate them randomly at runtime for content that lives in the base: if the concept changes, change the id; if it survives a regeneration, keep it.

- Ids are referenced as `"<type>:<id>"` in DOM attributes and in the review rail (`step:google-auth`).
- An id has to be unique where it identifies a path element or a slot; a duplicate is a parse error. Which ids that covers, and which characters are allowed, is the template's rule — see its page.
- Ids created _by the UI_ (for example "add step") are generated once from the name and then live inside the draft action, so they are stable from that point on.

## Draft actions

A draft action is a structured change request produced by a human in the browser. It is also the canonical payload handed back to the agent:

```json
{
  "id": "9f2c…",
  "type": "SET_STEP_NAME",
  "target": { "type": "step", "id": "google-auth" },
  "payload": { "name": "Google でログイン" },
  "createdAt": "2026-02-01T09:12:44.918Z"
}
```

`id` is the action's own identity (used to delete it), `createdAt` is set by the browser, and `note` is an optional free-form note. Everything else is the template's vocabulary: there is no generic `SET_FIELD` / `DELETE` / `MOVE`. An action describes the desired end state, so replaying a draft produces the same artifact every time.

### Targets

A target is `{ "type": …, "id": … }`, written `type:id` in DOM attributes and in the review rail. Nested entities use a **path** as the id, because a bare name is not unique across parents:

```text
step:onboarding.account.landing
```

The path states _where_ the target lives, which is the difference between "rename the `landing` step" and a wrong guess at which story's `landing` was meant. A bare id is accepted while it resolves uniquely; dispatch stores canonical paths, and ambiguous shorthand never picks the first match. `{ "type": "artifact", "id": "<template name>" }` means "the artifact as a whole".

### Validation and staleness

- **Schema validation** at `dispatch()`: unknown action types and malformed payloads are rejected with issues in the `artifact-error` event, and nothing is persisted.
- **Applicability** is checked at derive time: an action whose target no longer exists stays in the draft as **stale**, is not applied, and is greyed out in the rail with a reason (`target-missing`, `constraint-violated`, `unsupported-action-type`).
- A no-op patch — the base already says exactly that — is dropped automatically on the next derive. That is how a draft cleans itself when the agent applies it and regenerates the HTML.
- The draft is **interpretive**, not a history: it holds the net change. Actions that cancel out are dropped as soon as they do — adding a note and deleting it again leaves nothing, and so does moving a story away and back. So is an edit the draft makes invisible, such as renaming an entity that is deleted later. Actions are dropped only when the artifact still means the same without them, and comments, stale actions and component element actions are never dropped.
- `comment` actions accumulate. They are draft actions, not a second channel, and their targets are meaning elements, not arbitrary DOM nodes.

## Persistence

Drafts live in `LocalStorage`, so a reload keeps the review in progress. A stored draft is ignored when its template does not match or when it is not version 1; an action that no longer validates is dropped on its own, not with the rest of the draft. Drafts are per-browser, and nothing is uploaded anywhere.

| Attribute     | Values            | Meaning                                                                   |
| ------------- | ----------------- | ------------------------------------------------------------------------- |
| `storage-key` | string            | LocalStorage key override (recommended for anything a human will re-open) |
| `storage`     | `off` \| `memory` | persistence mode (default: `localStorage`)                                |
| `notes`       | `on`              | opens the review rail on load (default: closed)                           |

## Navigation

Navigation is the URL hash and is completely separate from draft actions: selecting an activity, story, step or note is not an artifact change.

- The hash is the single source of truth: sidebar selection, internal links, browser back/forward and deep links all agree.
- The element canonicalizes the hash — missing keys are filled from the template's defaults and written back with `replaceState` — so the URL is always shareable. After a draft removes the current target, the hash is re-canonicalized to something that still exists.
- `data-artifact-navigate="step=next"` on any element inside the artifact navigates on click; `data-artifact-comment="step:google-auth"` focuses the review composer for that target.

## Element API

Reach the facade with `element.artifact`, and wait for `element.artifact.ready` before the first read:

```js
const el = document.querySelector('artifact-prototype');
await el.artifact.ready;

el.artifact.state; // derived meaning state (read-only)
el.artifact.base; // base state, drafts not applied
el.artifact.actions; // draft actions
el.artifact.comments; // draft comments
el.artifact.stale; // [{ action, reason }] not applicable to the base
el.artifact.navigation; // resolved navigation from the hash
el.artifact.issues; // issues from the last rejected dispatch

el.artifact.dispatch({ type: 'SET_STEP_NAME', target: 'landing', payload: { name: 'LP' } });
el.artifact.comment('step:landing', 'ここに説明がほしい');
el.artifact.dispatchBatch(inputs); // compound command, committed atomically
el.artifact.removeAction(id);
el.artifact.clearActions();
el.artifact.importDraft(actions); // replace the whole draft (exported JSON)

el.artifact.navigate({ step: 'google-auth' });
el.artifact.hashFor({ step: 'google-auth' }); // canonical "#activity=…&step=…"

el.artifact.snapshot(); // { base, state, navigation, actions, comments, stale, issues }
el.artifact.exportDraft(); // { template, frameworkVersion, exportedAt, actions }
el.artifact.exportBrief(); // markdown hand-off for the agent
el.artifact.subscribe(fn); // returns an unsubscribe function
```

`dispatch()` returns `{ ok: true, id }` or `{ ok: false, issues }`; `dispatchBatch()` returns `{ ok: true, ids }` or `{ ok: false, issues }`, and any failure rejects the whole batch. `subscribe(fn)` observes the complete snapshot — draft changes, navigation changes and rejected-dispatch issues — and a subsequent successful change clears previous issues before notifying. Navigation does not emit `artifact-change` and does not persist a draft.

| Event               | Detail           | Fired when                                      |
| ------------------- | ---------------- | ----------------------------------------------- |
| `artifact-change`   | snapshot         | draft changed / derived state changed           |
| `artifact-navigate` | `{ navigation }` | hash navigation changed                         |
| `artifact-error`    | `{ issues }`     | a dispatch was rejected                         |
| `artifact-commit`   | `{ value }`      | from `artifact-inline-edit` (bubbles, composed) |

All events bubble and are composed. `artifact-comment-panel` (the review rail) and `artifact-inline-edit` (the inline editor) are registered by every entry; the diagram elements are components, not templates — no review rail, no navigation of their own; their comments and element actions go into the enclosing template's draft — and have their own pages under `docs/components/`.

## Slots and styling

| Slot      | Notes                                                                |
| --------- | -------------------------------------------------------------------- |
| `header`  | appended after the template header content                           |
| `sidebar` | appended after the template sidebar content                          |
| `main`    | appended after the template main content                             |
| `footer`  | appended after the framework footer                                  |
| `preview` | template-specific; the template documents how it matches your markup |
| `memo`    | floating memo; only rendered when you slot content into it           |

Framework chrome (shell, sidebar, review rail, preview frames) is Shadow DOM; everything you write stays in the light DOM, so your CSS and JS work normally. The `--af-*` custom properties declared on `:host` are inherited into your content, so you can reuse the palette without importing anything:

```text
--af-paper --af-paper-raised --af-paper-sunken
--af-ink --af-ink-soft --af-ink-faint
--af-rule --af-rule-strong
--af-accent --af-accent-soft
--af-blue --af-blue-soft --af-green --af-green-soft
--af-amber --af-amber-soft --af-violet --af-violet-soft
--af-display --af-body --af-mono
--af-radius --af-shadow
```

Slot content reaches the artifact through the public API and DOM events, never through framework internals: read `state` / `base` / `actions` as immutable values, change things only with `dispatch()` / `comment()` / `navigate()`, and re-render on `artifact-change` and `artifact-navigate`.

## Review and the hand-off

The review rail produces two clipboard payloads: the canonical draft JSON (`Copy JSON`) and a readable hand-off brief (`Copy brief`). Hand the brief to the agent: it applies the requested end state to the base HTML, keeps the ids of the concepts that survived, and drops the draft envelope from the JSON. The artifact never mutates its own base data, so the HTML the agent writes back is the new source of truth.

## Read next

| Question                          | Read                                                                                            |
| --------------------------------- | ----------------------------------------------------------------------------------------------- |
| The template I am actually using  | `docs/templates/<name>.md` (prototype / usm / event-storming / example-mapping / grill / plain) |
| The component I am actually using | `docs/components/<name>.md` (comment-panel / diagrams / …)                                      |

Read the page for what you are actually using, plus this one.
