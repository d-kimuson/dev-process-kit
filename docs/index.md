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

## Choose a template

Pick the one template whose subject is what you need to agree on with the reader.

| Agree on                                   | Template                         |
| ------------------------------------------ | -------------------------------- |
| Scope and release slicing                  | `usm`                            |
| Domain events, commands and causality      | `event-storming`                 |
| Rules of a story, with concrete examples   | `example-mapping`                |
| Screen flow and what each step looks like  | `prototype`                      |
| An explanation walked through step by step | `slides`                         |
| Where a task shared with the user stands   | `task-board`                     |
| Who decides what, between you and the user | `delegation-poker`               |
| Loose ideas to group, cluster and connect  | `whiteboard`                     |
| Anything else                              | `plain`, with diagram components |

Decisions you still need from the reader are not a template of their own: any template can ask them with [Questions (grill)](#questions-grill).

## Load it

Load one entry from jsDelivr, with the version pinned: a page has to keep working when a new version is published, so never generate HTML against a floating URL such as `@latest`. `<version>` below is the version these docs belong to — the `v<version>` Git tag you are reading them at.

| Entry                                                                                                                                                                                                                                                   | Use it when                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `templates/prototype.js` / `templates/usm.js` / `templates/event-storming.js` / `templates/example-mapping.js` / `templates/plain.js` / `templates/slides.js` / `templates/task-board.js` / `templates/delegation-poker.js` / `templates/whiteboard.js` | the page is that template (`plain`: none of the others fits — header and review only) |
| `components.js`                                                                                                                                                                                                                                         | the page uses the review rail or the diagram elements without a template              |
| `index.js`                                                                                                                                                                                                                                              | one URL for everything                                                                |

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

## Page height

Every template is a bounded shell: its header stays on top, the supplements bar at the bottom of the main column, and the sidebar, main column and review popover each scroll on their own. That needs the page's height on the template element:

```html
<style>
  html,
  body {
    height: 100%;
    margin: 0;
  }
  dpk-template-prototype {
    display: block;
    height: 100%;
  }
</style>
```

Put the element directly in `body`, with no wrapper or padding around it. This one form works in a local file and inside a Claude Artifact ([claude-artifact.md](claude-artifact.md)); do not size the element with `100vh` / `100dvh`, which overflows a host that pads the page. Without a height, the template falls back to the window's height (less a Claude Artifact's safe-area padding), so it still fills the window. Set the height anyway: the fallback assumes the element is the whole page, and only the height you give it follows the page you actually wrote.

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

Text the reader has typed but not sent yet — a comment in a composer, a name in an inline edit, any text field the kit renders — is kept in `sessionStorage` (key `<storage key>:unsent-text`) for the tab's session. When a reload, a republished page or a stray `Esc` closes the field, opening the same field again puts the text back, as long as the field starts from the same text it did then. Sending the text into the draft forgets it. Your own markup (a prototype's mock form) is left alone. Under `storage="off"` / `"memory"` it is kept for this page load only.

| Attribute     | Values                           | Meaning                                                                                                 |
| ------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `storage-key` | string                           | LocalStorage key override (recommended for anything a human will re-open)                               |
| `storage`     | `off` \| `memory`                | persistence mode (default: `localStorage`)                                                              |
| `notes`       | `on` \| `changes` \| `questions` | opens the review popover on load at the review comments, the changes or the questions (default: closed) |
| `theme`       | `light` \| `dark`                | the default color scheme (see [Color scheme](#color-scheme))                                            |

## Navigation

Navigation is the URL hash and is completely separate from draft actions: selecting an activity, story, step or note is not a page change.

- The hash is the single source of truth: sidebar selection, internal links, browser back/forward and deep links all agree.
- The element canonicalizes the hash — missing keys are filled from the template's defaults and written back with `replaceState` — so the URL is always shareable. After a draft removes the current target, the hash is re-canonicalized to something that still exists.
- Inside a Claude Artifact all of this works within the page; only a deep link from outside does not reach it ([claude-artifact.md](claude-artifact.md)).
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
el.api.editComment(id, '言い直したコメント'); // new body; the comment keeps its target and place
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

All events bubble and are composed. `dpk-component-comment-panel` (the review rail) and `dpk-component-inline-edit` (the inline editor) are registered by every entry; the diagram elements are components, not templates — no review rail, no navigation of their own; their comments and element actions go into the enclosing template's draft — and have their own pages under `docs/components/`. `dpk-component-formal-spec` (verified properties restated in plain words, `docs/components/formal-spec.md`) works the same way for comments.

## Slots and styling

| Slot         | Notes                                                                                                                                                 |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `header`     | appended after the template header content                                                                                                            |
| `sidebar`    | appended after the template sidebar content                                                                                                           |
| `main`       | appended after the template main content                                                                                                              |
| `footer`     | appended after the framework footer                                                                                                                   |
| `preview`    | template-specific; the template documents how it matches your markup                                                                                  |
| `supplement` | supporting material (an ERD, a checklist, a sequence diagram), named tabs in a bar at the bottom of the main column — see [Supplements](#supplements) |

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

### Sidebar width and folding

The reader can resize the template sidebar by dragging the edge that faces the main column, or by focusing that edge and pressing the arrow keys (they move the edge; Shift for larger steps, Home / End for the narrowest and widest). Double-clicking the edge restores the template's default width. The width stays between 180px and 560px and is remembered per template for every page of the origin (`localStorage` key `dev-process-kit:sidebar-width:<template>`) unless `storage` is `off` or `memory`. Templates without a sidebar have no edge.

The round button on that edge folds the sidebar away and leaves a narrow strip with a button that brings it back (both are ordinary buttons, so Tab and Enter / Space work, and they carry `aria-expanded`). The folded state is remembered the same way as the width (`localStorage` key `dev-process-kit:sidebar-collapsed:<template>`). Grill has no such button: its own Questions / Review button already folds its rail.

### Version

The template header shows the version running the page (`dev-process-kit@<version>`) as a select. When the reader first reaches for it, it lists every version published to npm (from jsDelivr's API, `data.jsdelivr.com`), the `latest` one marked; where that API cannot be reached, only the running version is listed. Picking a version reloads the page with `?dpk-version=<version>`, and the entry the page loads hands the page to that version's same entry on jsDelivr instead of defining its own elements: a document defines a custom element once, so switching needs a fresh page. Nothing else about the page changes — the markup and base data stay the ones you wrote, so a version older than the page may not render everything in it.

- Only an exact version is honoured (`1.2.3`, `1.2.3-beta.1`); anything else, or the version already running, leaves the page on its pinned version. When the version asked for cannot be loaded (it does not exist, or lacks that entry), the pinned version runs the page and logs why.
- While the URL overrides the version, the select also offers `Pinned by the page`, which drops the parameter.
- A version from before this select renders none of its own; the entry that handed the page over then puts one into the template's `header` slot, so the reader can always come back.
- Your pinned URL stays the contract: never write `?dpk-version=` into a link to make a page run another version, and never load `@latest`. The parameter is for the reader trying a version out.
- `window.devProcessKit` names the version that defined the elements (`version`), the templates it registered (`templates`), and the query parameter above (`versionParam`).

### Supplements

Slot each piece of supporting material as its own element with a `data-name`:

```html
<section slot="supplement" data-name="ERD"><dpk-component-er-diagram>…</dpk-component-er-diagram></section>
<section slot="supplement" data-name="Checklist">
  <ul>
    …
  </ul>
</section>
<section slot="supplement" data-name="Sequence">
  <dpk-component-sequence-diagram>…</dpk-component-sequence-diagram>
</section>
```

The shell lines the names up, in the order written, in a bar the full width of the main column, pinned to its bottom. The reader presses a name to open that supplement alone, growing upward over the content; pressing another switches, and pressing the open one folds it. One without a `data-name` is labelled "Memo". The bar is rendered only while at least one supplement is slotted, and follows ones added later. A supplement may hold the diagram elements (load `components.js` too).

The `memo` slot is gone: content left in `slot="memo"` is not shown, and the console says so. Wrap it in a `slot="supplement"` element instead.

## Review and the hand-off

The review rail's `Copy changes & comments` button puts the hand-off brief on the clipboard: readable markdown that ends with the canonical draft JSON. Once there is a draft, the same `Copy changes & comments` (and `Send to Claude`, below) also floats at the bottom right while the rail is closed, so a reader who only wants to hand the review back does not have to open it. Hand the brief to the agent: it applies the requested end state to the base HTML, keeps the ids of the concepts that survived, and drops the draft envelope from the JSON. The page never mutates its own base data, so the HTML the agent writes back is the new source of truth.

Inside a Claude Artifact published with the `comments` capability, the rail also offers **Send to Claude**: the brief is posted as a comment sent to the Claude session that published the page, pinned to the template element. A brief over the 4 KiB comment limit is stored as a document in the `reviews` collection of the artifact's database (when the page also declares `db`), and the comment points at it; the document holds `brief` (the same markdown) and `draft` (the canonical JSON). The button appears only when the viewer can send to Claude right now; a failed send says why and leaves the copy button as the way on. Elsewhere nothing changes.

## Questions (grill)

Any template can ask the reader questions — decisions you still need from them — alongside its usual content ([ADR](../dev-docs/adr/20261016_grill-in-core.md)). Put them in a script of their own, another child of the template element, separate from the base data:

```html
<dpk-template-usm storage-key="checkout-usm">
  <script type="application/json" data-dpk-grill>
    {
      "questions": [
        {
          "id": "reservation-table",
          "ref": "Q1",
          "title": "在庫予約テーブルは本当に必要？",
          "description": "在庫数を直接減らす案と比べて、予約を第一級の概念にするかを決めます。",
          "note": "予約が残ったまま消えると、在庫が永久に引当たままになる。",
          "options": [
            { "id": "own-table", "label": "専用テーブルで予約を持ち、有効期限と解放を明示的に管理する" },
            { "id": "counter", "label": "在庫テーブルに確保数のカラムを足し、予約は持たない" }
          ]
        }
      ]
    }
  </script>
  <script type="application/json">
    { "activities": [] }
  </script>
</dpk-template-usm>
```

Leave the block out until there is a question to ask. A malformed block renders an error banner; the base data keeps working regardless.

| Field         | Required | Meaning                                          |
| ------------- | -------- | ------------------------------------------------ |
| `questions[]` | yes      | The current round's questions, in reading order. |
| `history[]`   | no       | Earlier rounds, oldest first (see below).        |

Per question:

| Field         | Required | Meaning                                                               |
| ------------- | -------- | --------------------------------------------------------------------- |
| `id`          | yes      | Stable key. It is what an answer or a comment targets (`grill:<id>`). |
| `ref`         | no       | Display label (`Q1`). Defaults to the 1-based position.               |
| `title`       | yes      | The question.                                                         |
| `description` | no       | Why it matters; shown when the question is open.                      |
| `note`        | no       | One-line provocation shown with the description.                      |
| `options`     | no       | `[{ id, label }]`, rendered as `(a)`, `(b)`, … choices.               |
| `freeText`    | no       | `false` renders a select-only question (default `true`).              |

Duplicate question ids and duplicate option ids are errors. Answers to the current questions never appear in the base JSON — they are what the reader produced.

### Earlier rounds (`history`)

When you revise the page with the next round of questions, move the answered round into `history` instead of dropping it, so the reader can look back at what was already decided:

```json
{
  "questions": [{ "id": "refund-failure", "title": "返金が失敗し続けたらどうする？", "options": [] }],
  "history": [
    {
      "label": "v1",
      "questions": [
        {
          "id": "reservation-table",
          "title": "在庫予約テーブルは本当に必要？",
          "options": [],
          "answer": { "kind": "option", "optionId": "own-table" }
        }
      ]
    }
  ]
}
```

`label` names the round in the round select (defaults to `v1`, `v2`, … by position), and each question carries the same fields as above plus `answer` (the recorded `option` / `free` payload, copied from the reader's `answer` action; omit when left unanswered). An earlier round is read-only — nothing can answer or comment on it, and it is not part of the hand-off — and its question ids may repeat ids of other rounds (ids are unique within a round). An `answer` naming an unknown option is an error.

### Marking what a question is about

Mark page content a question is about with `data-grill-questions="Q1 Q4"` (space-separated refs), either in your own light DOM markup or, inside a diagram component's data, on a node, field or message that supports it (see `docs/components/diagrams.md`, `docs/components/kanban.md`, `docs/components/mind-map.md`). The shell lays a badge for each reference over the main column — on the right, level with the element, for your own markup; on the diagram node's corner, following its pan and zoom. A reference no question matches is ignored, and pressing a badge opens that question.

### The questions toggle

A question-mark toggle appears in the header between **Changes** and **Review comments**, but only while the page has questions; its badge reads `answered / total`. It opens the same review popover, on a **Questions** tab instead of the comments list; `notes="questions"` on the template element opens the popover there on load (alongside the existing `"on"` / `"comments"` / `"changes"`). With `history`, the tab is a round select — current questions first, then earlier rounds newest first, each read-only.

### Answers

An answer is a core-owned draft action, `answer`, targeting `grill:<id>`:

```json
{
  "type": "answer",
  "target": { "type": "grill", "id": "reservation-table" },
  "payload": { "kind": "option", "optionId": "own-table" }
}
```

The payload is `{ kind: 'option', optionId }`, `{ kind: 'free', text }` or `{ kind: 'clear' }`. One answer per question: answering again replaces the previous answer, and `clear` returns it to unanswered. An answer naming a question or option that is gone in the next version is **stale**, exactly like any other draft action. Questions are also comment targets, so a reviewer can leave a note on one without answering it. Answers are exported in the brief with the hand-off, alongside the other requested changes.

On the next round, move the questions the reader answered into `history` together with their `answer`, and put the new round in `questions`.

## Change notices

When you regenerate a page at the reader's request, tell them what changed. Put a change log beside the base data, as another child of the template element. It is the page's history: **each regeneration appends one version at the end**, and earlier versions stay as they were.

```html
<dpk-template-usm storage-key="checkout-usm">
  <script type="application/json" data-dpk-changes>
    {
      "revisions": [
        {
          "revision": "2026-10-12.1",
          "changes": [{ "id": "flow", "title": "Split checkout into address and payment" }]
        },
        {
          "revision": "2026-10-13.1",
          "changes": [
            {
              "id": "guest-pay",
              "title": "Added guest checkout",
              "body": "Per the comment on step:pay.",
              "target": "story:checkout.pay.guest"
            },
            { "id": "copy", "title": "Tightened the wording on every step" }
          ]
        }
      ]
    }
  </script>
  <script type="application/json">
    { "activities": [] }
  </script>
</dpk-template-usm>
```

- `revisions` lists the versions **oldest first**; the last one is this version of the page. On each regeneration, add a new entry at the end with a new `revision` name (unique in the log) and **only the changes made in that regeneration**. Do not edit, merge or repeat the changes of earlier versions. You may drop versions from the start once the log gets long.
- Each change has a `title`, and optionally a `body`, an `id` (unique within its version; the position is used when omitted, so give ids when the list can be reordered), a `target` (`type:id`, as in [Targets](#targets)) and a `navigate` (hash syntax, `view=flow&screen=cart`) for where it is seen when the target alone does not say.
- Leave the block out until there is something to announce. A log of one version may also be written as `{ "revision": "…", "changes": [ … ] }`.
- The change log is not base data: the template never reads it, and a malformed log shows a banner without touching the page.

The header gets a bell, and each reader is told only what is new to them:

- A reader who opens the page for the first time is told only this version's changes, not the whole history.
- A returning reader is told every version since the one they left unread changes in. If that version has been dropped from the log, they are told every version kept.
- Only this version's unread changes pop up as toasts (three at a time; each fades after a few seconds unless pointed at). Older unread changes wait on the bell.
- The bell's badge counts every unread change. Opening the bell lists every version kept, newest first, and clears the toasts.
- Each change is marked as seen on its own. One with a **Show** is seen when the reader follows it, from its toast or its card. One without a **Show** is seen when the list shows its card.
- A toast that is closed or fades away, and a card whose **Show** is not followed, leave their change on the badge.
- **Mark all as read** (in the list, and under the toasts when there are several) clears every unread change at once.
- Where the reader is in the history is remembered in `localStorage` under the key `<storage key>:seen-changes`. Under `storage="off"` / `"memory"` it lasts only for this page load, so every load counts as a first visit.

**Show** (on a toast or in the list) navigates to where the target is seen, brings it into view and highlights it for a few seconds. Templates mark the elements their targets render as; each template page lists the targets it can show. In your own markup — plain's sections, a prototype's slotted screens — mark the element yourself with `data-dpk-target="type:id"` (space-separated when one element stands for several targets). A change with only `navigate` just navigates; one with neither has no **Show**.

## Read next

| Question                          | Read                                                                                                                                          |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| The template I am actually using  | `docs/templates/<name>.md` (prototype / usm / event-storming / example-mapping / plain / slides / task-board / delegation-poker / whiteboard) |
| The component I am actually using | `docs/components/<name>.md` (comment-panel / diagrams / formal-spec / …)                                                                      |
| Publishing as a Claude Artifact   | `docs/claude-artifact.md`                                                                                                                     |

Read the page for what you are actually using, plus this one.
