# dev-process-kit

Web Components for single-file HTML pages that a human reviews in the browser, with a structured draft/feedback loop back to an agent.

```text
Page = Base Data (JSON baked into the HTML)
     + Template (meaning model + action vocabulary)
     + Draft Actions (the human's change requests, persisted in LocalStorage)
     + Navigation State (URL hash, never a draft action)
     + Slots (author-owned light DOM UI)
```

The template owns meaning: what a "step", a "story" or a sticky note _is_, and which actions apply to it. Your HTML owns the content. The public contract is custom elements, attributes, properties, DOM events and slots — Lit is an implementation detail.

## Load it

Load one entry from jsDelivr, with the version pinned: a page has to keep working when a new version is published, so never generate HTML against a floating URL such as `@latest`. `<version>` below is the version these docs belong to — the `v<version>` Git tag you are reading them at.

| Entry                                                                                                                                                                                | Use it when                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `templates/prototype.js` / `templates/usm.js` / `templates/event-storming.js` / `templates/example-mapping.js` / `templates/grill.js` / `templates/plain.js` / `templates/slides.js` | the page is that template (`plain`: none of the others fits — header and review only) |
| `components.js`                                                                                                                                                                      | the page uses the review rail or the diagram elements without a template              |
| `index.js`                                                                                                                                                                           | one URL for everything                                                                |

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/dev-process-kit@<version>/dist/templates/prototype.js"></script>
```

A template entry registers that template, the review rail and inline editing. Add `components.js` when the page also uses the diagram elements directly.

## Minimal page

```html
<dpk-template-prototype storage-key="my-flow">
  <!-- base data: the initial meaning state -->
  <script type="application/json">
    { "title": "Signup", "activities": [] }
  </script>

  <!-- your markup, slotted into framework chrome -->
  <p slot="header">…</p>
  <div slot="main">…</div>
</dpk-template-prototype>
```

One HTML file holds exactly one page root. What goes inside the base data, and which light DOM a template matches, is the template's business: each template documents its own shape under `docs/templates/`.

## Base data

The base data is the state the template would render with zero draft actions. It is JSON, baked into the HTML, and it has **no envelope**: the custom element already names the template and the script URL already pins the version, so `{ "activities": [] }` is the whole document, not `{ "template": …, "schema": …, "data": … }`. Keep it free of drafts, revisions and framework metadata.

Each template parses its own shape with strict validation: an unknown key is an error, not a silent no-op, and the element renders an error banner and starts from an empty state. Missing optional collections default to empty arrays, so a minimal document is often just `{ "title": "…" }`.

### Escaping inside the JSON script block

The base data lives inside an HTML `<script>` element, so a literal `</script>` anywhere in the text — including inside a JSON string — closes the block early: the tail of the JSON becomes page markup and the page falls back to the error banner. Escape the solidus:

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

`id` is the action's own identity (used to delete it), `createdAt` is set by the browser, and `note` is an optional free-form note. Everything else is the template's vocabulary: there is no generic `SET_FIELD` / `DELETE` / `MOVE`. An action describes the desired end state, so replaying a draft produces the same page every time.

### Targets

A target is `{ "type": …, "id": … }`, written `type:id` in DOM attributes and in the review rail. Nested entities use a **path** as the id, because a bare name is not unique across parents:

```text
step:onboarding.account.landing
```

The path states _where_ the target lives, which is the difference between "rename the `landing` step" and a wrong guess at which story's `landing` was meant. A bare id is accepted while it resolves uniquely; dispatch stores canonical paths, and ambiguous shorthand never picks the first match. `{ "type": "page", "id": "<template name>" }` means "the page as a whole".

### Validation and staleness

- **Schema validation** at `dispatch()`: unknown action types and malformed payloads are rejected with issues in the `dpk-error` event, and nothing is persisted.
- **Applicability** is checked at derive time: an action whose target no longer exists stays in the draft as **stale**, is not applied, and is greyed out in the rail with a reason (`target-missing`, `constraint-violated`, `unsupported-action-type`). The brief lists stale actions in a section of their own ("Not applicable to the current base"), apart from the pending comments and changes.
- A no-op patch — the base already says exactly that — is dropped automatically on the next derive. That is how a draft cleans itself when the agent applies it and regenerates the HTML.
- The draft is **interpretive**, not a history: it holds the net change. Actions that cancel out are dropped as soon as they do — adding a note and deleting it again leaves nothing, and so does moving a story away and back. So is an edit the draft makes invisible, such as renaming an entity that is deleted later. Actions are dropped only when the page still means the same without them, and comments, stale actions and component element actions are never dropped.
- `comment` actions accumulate. They are draft actions, not a second channel, and their targets are meaning elements, not arbitrary DOM nodes.

## Persistence

Drafts live in `LocalStorage`, so a reload keeps the review in progress. A stored draft is ignored when its template does not match or when it is not version 1; an action that no longer validates is dropped on its own, not with the rest of the draft. Drafts are per-browser, and nothing is uploaded anywhere.

| Attribute     | Values            | Meaning                                                                   |
| ------------- | ----------------- | ------------------------------------------------------------------------- |
| `storage-key` | string            | LocalStorage key override (recommended for anything a human will re-open) |
| `storage`     | `off` \| `memory` | persistence mode (default: `localStorage`)                                |
| `notes`       | `on`              | opens the review rail on load (default: closed)                           |
| `theme`       | `light` \| `dark` | the default color scheme (see [Color scheme](#color-scheme))              |

## Navigation

Navigation is the URL hash and is completely separate from draft actions: selecting an activity, story, step or note is not a page change.

- The hash is the single source of truth: sidebar selection, internal links, browser back/forward and deep links all agree.
- The element canonicalizes the hash — missing keys are filled from the template's defaults and written back with `replaceState` — so the URL is always shareable. After a draft removes the current target, the hash is re-canonicalized to something that still exists.
- `data-dpk-navigate="step=next"` on any element inside the template element navigates on click; `data-dpk-comment="step:google-auth"` focuses the review composer for that target.

## Element API

Reach the facade with `element.api`, and wait for `element.api.ready` before the first read:

```js
const el = document.querySelector('dpk-template-prototype');
await el.api.ready;

el.api.state; // derived meaning state (read-only)
el.api.base; // base state, drafts not applied
el.api.actions; // draft actions
el.api.comments; // draft comments
el.api.stale; // [{ action, reason }] not applicable to the base
el.api.navigation; // resolved navigation from the hash
el.api.issues; // issues from the last rejected dispatch

el.api.dispatch({ type: 'SET_STEP_NAME', target: 'landing', payload: { name: 'LP' } });
el.api.comment('step:landing', 'ここに説明がほしい');
el.api.dispatchBatch(inputs); // compound command, committed atomically
el.api.removeAction(id);
el.api.clearActions();
el.api.importDraft(actions); // replace the whole draft (exported JSON)

el.api.navigate({ step: 'google-auth' });
el.api.hashFor({ step: 'google-auth' }); // canonical "#activity=…&step=…"

el.api.snapshot(); // { base, state, navigation, actions, comments, stale, issues }
el.api.exportDraft(); // { template, frameworkVersion, exportedAt, actions }
el.api.exportBrief(); // markdown hand-off for the agent
el.api.subscribe(fn); // returns an unsubscribe function
```

`dispatch()` returns `{ ok: true, id }` or `{ ok: false, issues }`; `dispatchBatch()` returns `{ ok: true, ids }` or `{ ok: false, issues }`, and any failure rejects the whole batch. `subscribe(fn)` observes the complete snapshot — draft changes, navigation changes and rejected-dispatch issues — and a subsequent successful change clears previous issues before notifying. Navigation does not emit `dpk-change` and does not persist a draft.

| Event          | Detail           | Fired when                                           |
| -------------- | ---------------- | ---------------------------------------------------- |
| `dpk-change`   | snapshot         | draft changed / derived state changed                |
| `dpk-navigate` | `{ navigation }` | hash navigation changed                              |
| `dpk-error`    | `{ issues }`     | a dispatch was rejected                              |
| `dpk-commit`   | `{ value }`      | from `dpk-component-inline-edit` (bubbles, composed) |

All events bubble and are composed. `dpk-component-comment-panel` (the review rail) and `dpk-component-inline-edit` (the inline editor) are registered by every entry; the diagram elements are components, not templates — no review rail, no navigation of their own; their comments and element actions go into the enclosing template's draft — and have their own pages under `docs/components/`.

## Slots and styling

| Slot      | Notes                                                                |
| --------- | -------------------------------------------------------------------- |
| `header`  | appended after the template header content                           |
| `sidebar` | appended after the template sidebar content                          |
| `main`    | appended after the template main content                             |
| `footer`  | appended after the framework footer                                  |
| `preview` | template-specific; the template documents how it matches your markup |
| `memo`    | floating memo; only rendered when you slot content into it           |

Framework chrome (shell, sidebar, review rail, preview frames) is Shadow DOM; everything you write stays in the light DOM, so your CSS and JS work normally. The `--dpk-*` custom properties declared on `:host` are inherited into your content, so you can reuse the palette without importing anything:

```text
--dpk-paper --dpk-paper-raised --dpk-paper-sunken --dpk-paper-inset
--dpk-ink --dpk-ink-soft --dpk-ink-faint
--dpk-rule --dpk-rule-strong --dpk-rule-hover
--dpk-accent --dpk-accent-strong --dpk-accent-bright --dpk-accent-soft --dpk-accent-ink
--dpk-blue --dpk-blue-strong --dpk-blue-soft --dpk-green --dpk-green-soft
--dpk-amber --dpk-amber-soft --dpk-violet --dpk-violet-soft
--dpk-danger --dpk-danger-soft --dpk-shade
--dpk-display --dpk-body --dpk-mono
--dpk-radius-xs --dpk-radius-sm --dpk-radius --dpk-radius-lg --dpk-radius-xl
--dpk-shadow-xs --dpk-shadow-sm --dpk-shadow --dpk-shadow-lg --dpk-bevel --dpk-focus
--dpk-ease --dpk-ease-spring --dpk-glass --dpk-dots
```

`--dpk-bevel` is the top-edge highlight of a raised surface (combine it with a shadow: `box-shadow: var(--dpk-bevel), var(--dpk-shadow-sm)`), `--dpk-glass` a translucent background for floating chrome (pair it with `backdrop-filter`), and `--dpk-dots` a dot-grid `background` layer for canvases.

Slot content reaches the page through the public API and DOM events, never through framework internals: read `state` / `base` / `actions` as immutable values, change things only with `dispatch()` / `comment()` / `navigate()`, and re-render on `dpk-change` and `dpk-navigate`.

### Color scheme

Every template renders light or dark, and its header carries a sun / moon toggle for the reader. The scheme is decided in this order, strongest first:

1. the reader's toggle — remembered per browser for every page of the origin (for this page load only under `storage="off"` / `"memory"`); toggling back to the default forgets it
2. the `theme` attribute on the template element
3. `<html data-theme="light|dark">` on the page — how a host such as the Claude Artifact viewer passes its reader's choice down
4. the OS preference (`prefers-color-scheme`)

The template sets `color-scheme` on itself, and the color tokens switch with it, so author content that uses `var(--dpk-*)` follows without extra CSS. Hard-coded colors do not: write page CSS with the tokens, and do not paint `html` / `body` with a fixed background (leave the page ground to the template). A mockup that must stay light can set `color-scheme: light` on its own container. A component used on its own follows the page's `color-scheme` (light when the page declares none).

### Language

The kit's own text — the review rail, template chrome, diagram controls and the titles of draft actions — follows the page's `lang`. Every element uses the closest `lang` attribute: its own, then its ancestors', through shadow roots. Only the primary subtag counts (`ja-JP` is `ja`). The kit ships English (`en`) and Japanese (`ja`); a missing or unsupported `lang` renders English.

```html
<html lang="ja">
  …
  <dpk-template-usm lang="ja" storage-key="checkout-usm">…</dpk-template-usm>
</html>
```

Write `lang` on `<html>`, and also on the template element when you do not control `<html>` (a Claude Artifact wraps your file in its own document). The language is read when the element connects; changing `lang` afterwards has no effect.

The template header has a language select that starts on that language. The reader's pick switches the template and every element inside it, and is remembered per origin (`localStorage` key `dev-process-kit:locale`) unless `storage` is `off` or `memory`. Picking the page's own language forgets the pick. The template applies a pick by setting its own `lang`, so do not read that attribute back as the page's language. Your content (base data, slot markup, a diagram's `heading` / `subject`) is never translated. The hand-off brief keeps its headings and instructions in English for the agent; the action titles in it follow the page's language.

## Review and the hand-off

The review rail produces two clipboard payloads: the canonical draft JSON (`Copy JSON`) and a readable hand-off brief (`Copy brief`). Hand the brief to the agent: it applies the requested end state to the base HTML, keeps the ids of the concepts that survived, and drops the draft envelope from the JSON. The page never mutates its own base data, so the HTML the agent writes back is the new source of truth.

Inside a Claude Artifact published with the `comments` capability, the rail also offers **Send to Claude**: the brief is posted as a comment sent to the Claude session that published the page, pinned to the template element. A brief over the 4 KiB comment limit is stored as a document in the `reviews` collection of the artifact's database (when the page also declares `db`), and the comment points at it; the document holds `brief` (the same markdown) and `draft` (the canonical JSON). The button appears only when the viewer can send to Claude right now; a failed send says why and leaves the copy buttons as the way on. Elsewhere nothing changes.

## Read next

| Question                          | Read                                                                                                     |
| --------------------------------- | -------------------------------------------------------------------------------------------------------- |
| The template I am actually using  | `docs/templates/<name>.md` (prototype / usm / event-storming / example-mapping / grill / plain / slides) |
| The component I am actually using | `docs/components/<name>.md` (comment-panel / diagrams / …)                                               |

Read the page for what you are actually using, plus this one.
