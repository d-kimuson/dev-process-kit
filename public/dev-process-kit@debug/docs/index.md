# dev-process-kit

Single HTML Artifact Framework — build-free single-file HTML artifacts with a structured draft/feedback loop back to an agent.

## What an artifact is

```text
Artifact = Base Data (JSON baked into the HTML)
         + Template (meaning model + action vocabulary)
         + Draft Actions (the human's change requests, persisted in LocalStorage)
         + Navigation State (URL hash, never a draft action)
         + Slots (author-owned light DOM UI)
```

The template owns meaning: what a "step", a "story" or a sticky note _is_, and which actions apply to it. The framework owns the pipeline, persistence, the review rail and navigation. Your HTML owns the content and the prototype itself. Lit is an implementation detail: the public contract is custom elements, attributes, properties, DOM events and slots.

## Load it

Load the entry for what the page uses, with the version pinned:

| Entry                         | Registers                                    | Use it when                                                    |
| ----------------------------- | -------------------------------------------- | -------------------------------------------------------------- |
| `templates/prototype.js`      | core + the UX prototype template             | the page is a prototype                                        |
| `templates/usm.js`            | core + user story mapping                    | the page is a story map                                        |
| `templates/event-storming.js` | core + the event storming board              | the page is a storming board                                   |
| `templates/grill.js`          | core + the grill template                    | the page grills a design with questions                        |
| `components.js`               | core + every built-in component, no template | the page uses the review rail or the diagram elements directly |
| `index.js`                    | every entry above                            | one URL for everything                                         |

```html
<script type="module" src="https://dev-process-kit.biz-km.workers.dev/dev-process-kit@debug/templates/prototype.js"></script>
```

A template entry is the whole page's framework: it registers the review rail and inline editing too. Add `components.js` when the page also uses the diagram elements directly (grill places its badges over markup you own, and a diagram is markup you own).

Always pin the version. Never generate HTML against a floating URL: a generated artifact must keep working when a new version is published.

## Minimal artifact

```html
<artifact-prototype storage-key="my-flow">
  <!-- 1. base data: the initial meaning state -->
  <script type="application/json">
    { "title": "Signup", "activities": [] }
  </script>

  <!-- 2. author UI, slotted into framework chrome -->
  <p slot="header">…</p>
  <div slot="main">…</div>

  <!-- 3. template-specific light DOM, matched by data-* attributes -->
  <div slot="preview" data-preview-id="google-auth-mobile">…</div>
</artifact-prototype>
```

One HTML file holds exactly one artifact root. An artifact holds many activities / stories / steps / previews — never a second root element.

## The 5 rules that matter most

1. `<script type="module" src=".../dev-process-kit@VERSION/<entry>.js">` — the version is pinned.
2. Base data is one `<script type="application/json">` child of the artifact element, with no envelope. Escape a literal `</script>` inside the JSON as `<\/script>`, or the element ends early and the artifact renders an error.
3. Ids are stable keys baked into the HTML (`google-auth`), never random at runtime. Same id = same meaning.
4. Human edits in the browser are draft actions. Never mutate the meaning state directly; only `dispatch()`.
5. Navigation is the URL hash (`#activity=signup&step=google-auth`), not a draft action.

## Base data

The base data is the state the template would render with zero draft actions. It is JSON, baked into the HTML, and it has **no envelope**:

```json
{ "activities": [] }
```

Not:

```json
{ "template": "prototype", "schema": "prototype/v1", "data": {} }
```

The custom element already names the template and the script URL already pins the framework version. Each template documents its own shape and parses it with strict validation: an unknown key is an error, not a silent no-op. On error the element renders an error banner and starts from an empty artifact (the message is in the shadow DOM banner and the console).

Keep the base data free of drafts, revisions and framework metadata. Missing optional collections default to empty arrays, so a minimal document is often just `{ "title": "…" }`.

### Escaping inside the JSON script block

The base data lives inside an HTML `<script>` element, so a literal `</script>` anywhere in the text — including inside a JSON string — closes the block early: the tail of the JSON becomes page markup and the artifact falls back to the error banner. Escape the solidus:

```json
{ "body": "… <script>alert(1)<\/script> …" }
```

This matters for any template whose bodies contain HTML or code fences (a step description quoting a script tag, for example). `\/` is valid JSON and parses back to `/`.

## Ids

Ids come from the HTML and are the contract between the base data and the draft actions.

- Never generate ids randomly at runtime for content that lives in the base.
- The same id must keep meaning the same thing. If the concept changes, change the id; if it survives a regeneration, keep it.
- Do not invent ids that collide: a duplicate id is a parse error.
- Ids are referenced as `"<type>:<id>"` in DOM attributes and in the review rail (`step:google-auth`).
- Ids created _by the UI_ (for example "add step") are generated once from the name (`createEntityId`) and then live inside the draft action, so they are stable from that point on.

## Draft actions

A draft action is a structured change request produced by a human in the browser. It is also the canonical payload handed back to the agent.

```json
{
  "id": "9f2c…",
  "type": "SET_STEP_NAME",
  "target": { "type": "step", "id": "google-auth" },
  "payload": { "name": "Google でログイン" },
  "createdAt": "2026-02-01T09:12:44.918Z"
}
```

### Target references

A target is `{ "type": …, "id": … }`, written `type:id` in DOM attributes and in the review rail. Nested entities use a **path** as the id, because a bare name is not unique across parents:

```text
step:onboarding.account.landing          # prototype: activity.story.step
preview:onboarding.account.landing.sm    # prototype prefers the global preview id
step:onboarding.signup                   # usm: activity.step
story:value-prop                         # flat collections keep their bare id
```

- The separator is `.`, so entity ids may not contain one: the base schema validates ids against `[A-Za-z0-9_-]+` and rejects the rest.
- A path is what a draft action carries, and therefore what the agent sees. It states _where_ the target lives, which is the difference between "rename the `landing` step" and a wrong guess at which story's `landing` was meant.
- Templates also accept a bare id when it resolves uniquely (hand-written actions, hand-edited drafts). Dispatch stores resolved targets as canonical paths. Ambiguous shorthand never chooses the first match; use the fully qualified path instead.
- Preview ids stay global: a preview id names a light DOM slot (`data-preview-id`), so the base schema rejects duplicates across the artifact.

The only core-owned target type is `artifact`: `{ "type": "artifact", "id": "<template name>" }` means "the artifact as a whole", and a comment with that target is never stale.

Envelope fields (core-owned):

| Field       | Meaning                                                                           |
| ----------- | --------------------------------------------------------------------------------- |
| `id`        | identity of the draft action itself (used to delete it)                           |
| `type`      | action name from the template vocabulary, or `comment`                            |
| `target`    | `{ type, id }`; the shorthand `"id"` is normalized using the action's target type |
| `payload`   | action-specific data, validated by the action schema                              |
| `note`      | optional free-form note                                                           |
| `createdAt` | ISO timestamp, set by the browser                                                 |

Action vocabulary is **template specific and domain specific**. There is no generic `SET_FIELD` / `DELETE` / `MOVE`. A prototype says `REORDER_STEP`, a USM says `MOVE_STORY`, an event storming board says `LINK_ELEMENTS`.

Patch semantics: an action describes the desired end state, so replaying a draft produces the same artifact every time.

The only core-owned action type is `comment` (see [Comments](#comments)).

## The action pipeline

```text
dispatch(action)
  → validate (schema)       invalid actions are rejected and never stored
  → normalize               string target → { type, id }
  → derive state            base + draft actions, template applyAction
  → prune                   drop no-op patches (already reflected in the base)
  → persist draft           LocalStorage
  → notify + render + review rail
```

The pipeline is not hookable. Extension points are UI-side: slots, plus `describe()` / `serialize()` from the template.

Two validation moments:

1. **Schema validation** at `dispatch()`: unknown action types and malformed payloads are rejected with issues in the `artifact-error` event. Nothing is persisted.
2. **Applicability validation** at derive time: an action whose target no longer exists in the current base is kept in the draft but marked **stale**, is not applied, and is shown greyed out in the review rail with a reason (`target-missing`, `constraint-violated`, `unsupported-action-type`). Delete it from the rail when you do not want it any more.

Derived state is `reduce(base, draftActions, applyAction)`. The meaning state is never mutated by UI code.

### Compaction without a compaction strategy

- Only **adjacent patch** actions with the same `(type, target)` (or vocabulary dedupe key) are compacted. The last value wins. A patch never moves across an intervening action: that action may depend on the earlier value.
- Order/reference-dependent operations (`REORDER_*`, `MOVE_*`, `UNLINK_ELEMENTS`) use **sequence** mode and retain dispatch order, even when adjacent.
- A no-op patch — the base already says exactly that — is dropped automatically on the next derive. This is how "the agent already applied my change and regenerated the HTML" cleans the draft by itself.
- `comment` actions always accumulate. Add-style patches are keyed by the id they create; a re-applied addition is dropped as a no-op.

### Atomic UI commands

`dispatchBatch(inputs)` validates and applies each input against the preceding result, then commits the entire command once. Schema or applicability failure rejects the whole batch: no partial actions, persistence, or change notification. The failure is exposed through issues / `artifact-error`. A successful batch persists once and sends one draft-change notification. This is for compound commands such as "add a note and link it"; ordinary `dispatch()` still keeps schema-valid but inapplicable actions as stale feedback.

## Persistence

Drafts are stored in `LocalStorage` so a reload or browser reopen keeps the review in progress.

- Default key: `dev-process-kit:draft:<pathname><search>:<template>`
- Override it with `storage-key="..."` (recommended for anything a human will re-open).
- `storage="off"` disables persistence; `storage="memory"` keeps it in memory only (useful for embedded/demo artifacts).
- A stored draft is ignored when its template does not match, when it is not version 1, or when an action no longer validates.

Drafts are per-browser. Nothing is uploaded anywhere.

## Navigation

Navigation is the URL hash and is completely separate from draft actions. Selecting an activity, story, step or note is not an artifact change.

```text
#activity=signup&story=register&step=google-auth
```

- The hash is the single source of truth: sidebar selection, internal links, browser back/forward and deep links all agree.
- The element canonicalizes the hash: missing keys are filled from the template's `resolveNavigation()` defaults and written back with `replaceState`, so the URL is always shareable.
- After a draft removes the current target (for example deleting the current step) the hash is re-canonicalized to something that still exists.
- `data-artifact-navigate="step=next"` on any element inside the artifact (including inside your prototype markup) performs navigation on click.
- `data-artifact-comment="step:google-auth"` focuses the review composer for that target.

## Comments

Free comments are draft actions, not a second channel:

```json
{
  "type": "comment",
  "target": { "type": "step", "id": "google-auth" },
  "payload": { "body": "Google ログイン後の説明を追加したい" }
}
```

Targets are template meaning elements (activity / story / step / note / section), not arbitrary DOM nodes. Comment validity is checked against the **final derived state**, irrespective of dispatch order. Deleting its target makes it stale; removing the deletion makes it live again.

## Element API

### Attributes

| Attribute     | Values            | Meaning                                    |
| ------------- | ----------------- | ------------------------------------------ |
| `storage-key` | string            | LocalStorage key override                  |
| `storage`     | `off` \| `memory` | persistence mode (default: `localStorage`) |
| `notes`       | `off`             | hides the review rail                      |

### Properties and methods

Reach the facade with `element.artifact` (or wait for it with `element.artifact.ready` before the first read):

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
el.artifact.dispatchBatch(inputs); // atomic compound command
el.artifact.removeAction(id);
el.artifact.clearActions();
el.artifact.importDraft(actions); // replace the whole draft (exported JSON)

el.artifact.navigate({ step: 'google-auth' });
el.artifact.hashFor({ step: 'google-auth' }); // canonical "#activity=…#step=…"

el.artifact.snapshot(); // { base, state, navigation, actions, comments, stale, issues }
el.artifact.exportDraft(); // { template, frameworkVersion, exportedAt, actions }
el.artifact.exportBrief(); // markdown hand-off for the agent
el.artifact.subscribe(fn); // returns an unsubscribe function
```

`dispatch()` returns `{ ok: true, id }` or `{ ok: false, issues }`. `dispatchBatch()` returns `{ ok: true, ids }` or `{ ok: false, issues }`.

`subscribe(fn)` observes the complete snapshot: draft changes, navigation changes, and rejected-dispatch issues. A subsequent successful change clears previous issues before notifying. Navigation remains independent of drafts and does not emit `artifact-change` or persist a draft.

### Events

| Event               | Detail           | Fired when                                      |
| ------------------- | ---------------- | ----------------------------------------------- |
| `artifact-change`   | snapshot         | draft changed / derived state changed           |
| `artifact-navigate` | `{ navigation }` | hash navigation changed                         |
| `artifact-error`    | `{ issues }`     | a dispatch was rejected                         |
| `artifact-commit`   | `{ value }`      | from `artifact-inline-edit` (bubbles, composed) |

All events bubble and are composed.

### Core components

| Element                  | Purpose                                                        |
| ------------------------ | -------------------------------------------------------------- |
| `artifact-comment-panel` | the review rail (see `docs/components/comment-panel.md`)       |
| `artifact-inline-edit`   | inline text/multiline editor that only emits `artifact-commit` |

### Diagram components

Reusable diagrams that answer a design question on their own. They are components, not templates: no draft actions, no review rail, no navigation, so they can be dropped into any page — or into `slot="main"` of an artifact.

| Element                     | Answers                                       |
| --------------------------- | --------------------------------------------- |
| `artifact-state-diagram`    | what states exist and what moves between them |
| `artifact-sequence-diagram` | in what order participants talk               |
| `artifact-dependency-graph` | what depends on what, and what is circular    |
| `artifact-er-diagram`       | what changed between two schema snapshots     |
| `artifact-architecture-map` | which services exist, in which boundary       |

They share one interaction contract (data via a JSON child or the `data` property, a `Single` / `AND` / `OR` tag filter, selection with related-element highlighting, bounded pan/zoom, a details panel, `--diagram-height`): `docs/components/diagrams.md`. Each element's own data shape is documented on its page under `docs/components/`.

The `artifact-grill` template wraps one of them (or any markup) in a review loop: its question list is the sidebar, its answers are draft actions, and its Q badges attach to the diagram data through `questions` — `docs/templates/grill.md`.

The artifact chrome itself carries only the title, the artifact slots and a meta line (`dev-process-kit@<version> · <template> · <n> draft · <n> note`); the footer row exists only when someone slots content into `slot="footer"`.

## Slots and light DOM sugar

| Slot      | Owner  | Notes                                                               |
| --------- | ------ | ------------------------------------------------------------------- |
| `header`  | author | appended after the template header content                          |
| `sidebar` | author | appended after the template sidebar content                         |
| `main`    | author | appended after the template main content                            |
| `footer`  | author | appended after the framework footer                                 |
| `preview` | author | template-specific; matched to preview metadata by `data-preview-id` |

Framework chrome (shell, sidebar, review rail, preview frames) is Shadow DOM. Everything you write stays in the light DOM, so your CSS and JS work normally. Custom properties declared on `:host` (`--af-*`) are inherited into your light DOM content, so you can reuse the palette without importing anything.

### Talking to the framework from slotted UI

Slot content is your code, so it reaches the artifact through the public API and DOM events — never through framework internals:

```html
<aside slot="main" id="inspector">
  <p data-role="summary"></p>
  <button data-role="bump">説明を足す</button>
</aside>

<script type="module">
  const artifact = document.querySelector('artifact-prototype');
  await artifact.artifact.ready; // never read state before ready

  const inspector = document.getElementById('inspector');
  const render = () => {
    const state = artifact.artifact.state; // read-only view
    inspector.querySelector('[data-role="summary"]').textContent =
      `${state.activities.length} activities · ${artifact.artifact.actions.length} draft actions`;
  };

  inspector.querySelector('[data-role="bump"]').addEventListener('click', () => {
    artifact.artifact.comment('step:landing', '説明を足したい');
  });

  artifact.addEventListener('artifact-change', render);
  render();
</script>
```

- Read `artifact.artifact.state` / `.base` / `.actions` — treat them as immutable.
- Change things only with `.dispatch()` / `.comment()` / `.navigate()`.
- Re-render on `artifact-change` and `artifact-navigate`.
- `data-artifact-navigate` / `data-artifact-comment` cover the common cases with no JavaScript at all.

## Styling tokens

Declared on `:host`, inherited into light DOM:

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

## Template contract

A template is a module that provides meaning, not UI plumbing:

```ts
export interface TemplateDefinition<S> {
  name: string;
  label: string;
  parseBase(input: unknown): S; // strict; throws on authoring mistakes
  emptyBase(): S;
  actions: Record<string, ActionDescriptor>;
  apply(state: S, action: DraftAction): S | null; // pure; null = not applicable
  hasTarget(state: S, target: ActionTarget): boolean;
  canonicalTarget?(state: S, target: ActionTarget): ActionTarget; // resolve unique shorthand
  describe(action: DraftAction, state: S, base?: S): ActionDescription;
  serialize(action: DraftAction): string;
  resolveNavigation(state: S, nav: Navigation): Navigation;
  commentTargets(state: S, nav: Navigation): CommentTargetOption[];

  /** What the reader is looking at now — powers the composer's attach checkbox. */
  currentTarget?(state: S, nav: Navigation): CommentTargetOption | null;
  title(state: S): string;
}
```

`apply` is a pure function of `(state, action)`. No DOM, no storage, no time. That is what makes drafts replayable, testable, and predictable for generated code. `describe` / `serialize` are the only template code the core review rail calls, which is what keeps the core free of domain vocabulary.

The element side extends `ArtifactElement<S>` and implements `renderRegions()`; the base class owns the shell, the review rail, the pipeline, persistence, navigation and preview routing. Templates must not re-implement any of that.

### Gotchas when writing a template

- `describe(action, state, base?)`: `state` is the derived state, so a naive before/after summary would print the _new_ value twice. Use the optional `base` (the state before any draft action) for the "before" side; lookups there fail for entities the draft itself created, which is fine — drop the "before" part.
- Slot assignment does not cross shadow roots. If a template renders previews or any author-owned light DOM, the `<slot>` must be in the template element's own render output, not inside a nested custom element's shadow root.
- Lit renders a child template whose root is an SVG element in the HTML namespace unless you use its `svg` tag. Use `svg` for SVG-rooted fragments, otherwise the elements exist in the DOM but are never painted.
- A `var(--af-*)` inside an SVG presentation attribute (`stroke="..."`) is not substituted; put SVG paint in the stylesheet instead.

Division of responsibility, in one line each:

```text
Core       pipeline, persistence, validation, derived state, review rail, shell
Template   meaning model, action vocabulary, applyAction, describe, layout
Your HTML  base data, slot content, prototype markup and app logic
```

## Review and the hand-off

The review rail produces two clipboard payloads: the canonical draft JSON (`Copy JSON`) and a readable hand-off brief (`Copy brief`). Hand the brief to the agent: it applies the requested end state to the base HTML, keeps the ids of the concepts that survived, and drops the draft envelope from the JSON. Nothing in the artifact mutates the base data — human edits are always draft actions — so the HTML you get back is the new source of truth.

## Read next

| Question                          | Read                                                                  |
| --------------------------------- | --------------------------------------------------------------------- |
| The template I am actually using  | `docs/templates/<name>.md` (prototype / usm / event-storming / grill) |
| The component I am actually using | `docs/components/<name>.md` (comment-panel / diagrams / …)            |

Read only the template page you are actually using, plus this page.
