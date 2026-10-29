# dev-process-kit

A one-page design system and review loop for the single HTML files an agent writes and a human
reviews. The public contract is custom elements, attributes, properties, DOM events and slots —
Lit is an implementation detail.

```text
Document = Base Data (JSON baked into the HTML)
         + Page content (a view or a board: meaning model + action vocabulary)
         + Draft Actions (the human's change requests, persisted in LocalStorage)
         + Navigation State (URL hash, never a draft action)
         + Slots (author-owned light DOM UI)
```

## The three tiers

```text
dpk-app              one document: header, review, draft, storage, hash, undo/redo
  dpk-page           one switchable subject: its name and label
    dpk-view-*       page-only content: owns the whole page, cannot be embedded
    dpk-board-*      embeddable content: can sit inside a view, or be a page
  dpk-*              a component inside the content or your own markup
```

- **A view** owns the whole page and cannot be embedded.
- **A board** is a self-contained visual surface. It can be embedded inside a view, and it can be
  the content of a page. The same element is used two ways; placement decides which.
- **A component** is embeddable only and never fills a page.

Each has a page of its own under `docs/views/`, `docs/boards/` and `docs/components/`; a component
such as [`dpk-alternatives`](components/alternatives.md), for instance, lays out the options a
decision weighed and which one it took.

The page content owns meaning: what a "step", a "story" or a sticky note _is_, and which actions
apply to it. Your HTML owns the content.

## Choose a view

Pick the one view whose subject is what you need to agree on with the reader.

| Agree on                                   | View                        |
| ------------------------------------------ | --------------------------- |
| Scope and release slicing                  | `dpk-view-usm`              |
| Screen flow and what each step looks like  | `dpk-view-prototype`        |
| An explanation walked through step by step | `dpk-view-slides`           |
| Where a task shared with the user stands   | `dpk-view-task-board`       |
| Who decides what, between two parties      | `dpk-view-delegation-poker` |
| Anything else                              | `dpk-view-plain`            |

## Choose a board

A board can be a page's content, or sit inside a view.

| Agree on                                  | Board                        |
| ----------------------------------------- | ---------------------------- |
| Domain events, commands and causality     | `dpk-board-event-storming`   |
| Rules of a story, with concrete examples  | `dpk-board-example-mapping`  |
| Loose ideas to group, cluster and connect | `dpk-board-whiteboard`       |
| Schema changes                            | `dpk-board-er-diagram`       |
| States and transitions                    | `dpk-board-state-diagram`    |
| Message order                             | `dpk-board-sequence-diagram` |
| Dependencies and cycles                   | `dpk-board-dependency-graph` |
| Services and boundaries                   | `dpk-board-architecture-map` |
| A topic and its subtopics                 | `dpk-board-mind-map`         |
| Cards in columns                          | `dpk-board-kanban`           |

Every page is a `<dpk-page name="…">` inside one `<dpk-app>`. A page holds one view or board; a
board inside a view is embedded, a board directly inside a page is the page. The app has one
header, one review, one draft and one brief for every page, so the reader reviews and hands off
once, and a comment can point from one page to another: see [page.md](page.md).

Decisions you still need from the reader are not a view of their own: any view or board can ask
them with [Questions (grill)](#questions-grill).

## Load it

Load one entry from jsDelivr, with the version pinned: a page has to keep working when a new
version is published, so never generate HTML against a floating URL such as `@latest`.
`<version>` below is the version these docs belong to — the `v<version>` Git tag you are reading
them at.

| Entry                                                                                                                              | Use it when                                       |
| ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `views/usm.js` / `views/prototype.js` / `views/plain.js` / `views/slides.js` / `views/task-board.js` / `views/delegation-poker.js` | the page is that view                             |
| `boards.js`                                                                                                                        | the page uses a board, embedded or as its content |
| `components.js`                                                                                                                    | the page uses components without a view           |
| `index.js`                                                                                                                         | one URL for everything                            |

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/dev-process-kit@<version>/dist/views/prototype.js"></script>
```

A view entry registers that view, `<dpk-app>`, `<dpk-page>`, the review rail and inline editing.
Add `boards.js` when the page uses a board — this is how `dpk-board-event-storming`,
`dpk-board-example-mapping`, `dpk-board-whiteboard` and the rest are loaded, embedded in a view or
hosted as a page's content. Add `components.js` when the page uses components the view does not
carry. `index.js` is the union of all of them.

## Minimal document

```html
<dpk-app storage-key="my-flow">
  <script type="application/json">
    { "title": "Signup" }
  </script>

  <dpk-page name="flow" label="Flow">
    <dpk-view-prototype>
      <!-- base data: the initial meaning state -->
      <script type="application/json">
        { "title": "Signup", "activities": [] }
      </script>

      <!-- your markup, slotted into framework chrome -->
      <p slot="header">…</p>
      <div slot="main">…</div>
    </dpk-view-prototype>
  </dpk-page>
</dpk-app>
```

One HTML file holds exactly one `<dpk-app>`. The header names the document, and the switcher in it
names the page shown when there is more than one; the switcher's **+** adds a page
([page.md](page.md)). What goes inside the base data, and which light DOM a view
matches, is the view's business: each view documents its own shape under `docs/views/`.

## Page height

Every view and board is a bounded shell: its header stays on top, the floating menu floats over
it, the supplements bar sits at the bottom of the main column, and the sidebar, main column and
review popover each scroll on their own. That
needs the document's height on the `<dpk-app>` element, and the same `<style>` block hides the
element until its custom element is defined, so the light DOM inside (your markup, the base
data's text) does not flash on screen before the kit's own chrome paints over it — `loadKit` /
the jsDelivr `<script type="module">` runs after the document parses, so without this the page is
briefly just your content with none of the kit's UI:

```html
<style>
  html,
  body {
    height: 100%;
    margin: 0;
  }
  dpk-app {
    display: block;
    height: 100%;
  }

  /* Hide the root element until it upgrades, so its light DOM does not flash
     before the kit paints. The animation is a safety net: if the script never
     loads, the content still shows after a couple of seconds instead of
     staying hidden forever. */
  body > :not(:defined) {
    visibility: hidden;
    animation: dpk-reveal 0s 2s forwards;
  }
  @keyframes dpk-reveal {
    to {
      visibility: visible;
    }
  }
</style>
```

Put the element directly in `body`, with no wrapper or padding around it. This one form works in a
local file and inside a Claude Artifact ([claude-artifact.md](claude-artifact.md)); do not size the
element with `100vh` / `100dvh`, which overflows a host that pads the page. Without a height, the
app falls back to the window's height (less a Claude Artifact's safe-area padding), so it still
fills the window. Set the height anyway: the fallback assumes the element is the whole page, and
only the height you give it follows the page you actually wrote.

`body > :not(:defined)` only ever matches the one root element — ordinary elements are always
"defined" — so it works whichever root the page uses (`<dpk-app>`, a view or board on its own, or
a component such as `<dpk-board-er-diagram>`), with nothing to rename when you change it.

## Base data

> **Base data comes first.** The base data is the **first** `<script type="application/json">` child of its content element (`<dpk-app>`, `<dpk-view-*>`, `<dpk-board-*>` or a component). The [questions](#questions-grill) block (`data-dpk-grill`) and the [change log](#change-notices) block (`data-dpk-changes`) are written **after** it — either of the two first, but never before the base data. This is the page's contract, not a detail of the current build: released bundles up to `0.2.1` (the latest on npm) read a component's first JSON child as its base data and do not skip the option blocks, so an option block written first opens the page to an error banner such as `Invalid key: Expected "states" but received undefined`. The current sources do skip both blocks, but a page is read by whichever bundle its URL pins, so never rely on that. Write the attribute exactly too — a stray character in `data-dpk-grill` makes the block an ordinary JSON child, which the element then reads as base data. `src/docs-script-order.test.ts` fails if any HTML example in `docs/**` or `README.md` writes an option block first.

The base data is the state the content would render with zero draft actions. It is JSON, baked into the HTML, and it has **no envelope**: the custom element already names the view and the script URL already pins the version, so `{ "activities": [] }` is the whole document, not `{ "view": …, "schema": …, "data": … }`. Keep it free of drafts, revisions and framework metadata.

Each view or board parses its own shape with strict validation: an unknown key is an error, not a silent no-op, and the element renders an error banner and starts from an empty state. Missing optional collections default to empty arrays, so a minimal document is often just `{ "title": "…" }`.

### Escaping inside the JSON script block

The base data lives inside an HTML `<script>` element, so a literal `</script>` anywhere in the text — including inside a JSON string — closes the block early: the tail of the JSON becomes page markup and the page falls back to the error banner. Escape the solidus:

```json
{ "body": "… <script>alert(1)<\/script> …" }
```

`\/` is valid JSON and parses back to `/`. This matters for any view whose bodies contain HTML or code fences (a step description quoting a script tag, for example).

## Ids

Ids come from the HTML and are the contract between the base data and the draft actions. Never generate them randomly at runtime for content that lives in the base: if the concept changes, change the id; if it survives a regeneration, keep it.

- Ids are referenced as `"<type>:<id>"` in DOM attributes and in the review rail (`step:google-auth`).
- An id has to be unique where it identifies a path element or a slot; a duplicate is a parse error. Which ids that covers, and which characters are allowed, is the content's rule — see its page.
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

`id` is the action's own identity (used to delete it), `createdAt` is set by the browser, and `note` is an optional free-form note. Everything else is the content's vocabulary: there is no generic `SET_FIELD` / `DELETE` / `MOVE`. An action describes the desired end state, so replaying a draft produces the same page every time.

### Targets

A target is `{ "type": …, "id": … }`, written `type:id` in DOM attributes and in the review rail. Nested entities use a **path** as the id, because a bare name is not unique across parents:

```text
step:onboarding.account.landing
```

The path states _where_ the target lives, which is the difference between "rename the `landing` step" and a wrong guess at which story's `landing` was meant. A bare id is accepted while it resolves uniquely; dispatch stores canonical paths, and ambiguous shorthand never picks the first match. `{ "type": "page", "id": "<view name>" }` means "the page as a whole".

### Validation and staleness

- **Schema validation** at `dispatch()`: unknown action types and malformed payloads are rejected with issues in the `dpk-error` event, and nothing is persisted.
- **Applicability** is checked at derive time: an action whose target no longer exists stays in the draft as **stale**, is not applied, and is greyed out in the rail with a reason (`target-missing`, `constraint-violated`, `unsupported-action-type`). The brief lists stale actions in a section of their own ("Not applicable to the current base"), apart from the pending comments and changes.
- A no-op patch — the base already says exactly that — is dropped automatically on the next derive. That is how a draft cleans itself when the agent applies it and regenerates the HTML.
- The draft is the **plain log** of what the reader did, in order: adding a note and deleting it again shows both steps, and so does moving a story away and back. Adjacent patches to the same target still replace one another, so editing a field twice in a row leaves one entry, not one per keystroke.
- The reader can **undo and redo** this log — Cmd+Z/Ctrl+Z and Shift+Cmd+Z/Ctrl+Shift+Z/Ctrl+Y, or the buttons in the floating menu — ignored while focus is in a text field so native text-editing undo keeps working. Undo removes the draft's last entry (comments included) and redo replays it; dispatching a new action clears the redo stack. The redo stack does not survive a reload.
- `comment` actions accumulate. They are draft actions, not a second channel, and their targets are meaning elements, not arbitrary DOM nodes.

## Persistence

Drafts live in `LocalStorage`, so a reload keeps the review in progress. A stored draft is ignored when its view does not match or when it is not version 1; an action that no longer validates is dropped on its own, not with the rest of the draft. Drafts are per-browser, and nothing is uploaded anywhere.

Text the reader has typed but not sent yet — a comment in a composer, a name in an inline edit, any text field the kit renders — is kept in `sessionStorage` (key `<storage key>:unsent-text`) for the tab's session. When a reload, a republished page or a stray `Esc` closes the field, opening the same field again puts the text back, as long as the field starts from the same text it did then. Sending the text into the draft, or pressing a Cancel button beside the field, forgets it. Your own markup (a prototype's mock form) is left alone. Under `storage="off"` / `"memory"` it is kept for this page load only.

| Attribute     | Values                           | Meaning                                                                                                 |
| ------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `storage-key` | string                           | LocalStorage key override (recommended for anything a human will re-open)                               |
| `storage`     | `off` \| `memory`                | persistence mode (default: `localStorage`)                                                              |
| `notes`       | `on` \| `changes` \| `questions` | opens the review popover on load at the review comments, the changes or the questions (default: closed) |
| `theme`       | `light` \| `dark`                | the default color scheme (see [Color scheme](#color-scheme))                                            |

## Navigation

Navigation is the URL hash and is completely separate from draft actions: selecting an activity, story, step or note is not a page change.

- The hash is the single source of truth: sidebar selection, internal links, browser back/forward and deep links all agree.
- The element canonicalizes the hash — missing keys are filled from the content's defaults and written back with `replaceState` — so the URL is always shareable. After a draft removes the current target, the hash is re-canonicalized to something that still exists.
- Inside a Claude Artifact all of this works within the page; only a deep link from outside does not reach it ([claude-artifact.md](claude-artifact.md)).
- `data-dpk-navigate="step=next"` on any element inside the content element navigates on click; `data-dpk-comment="step:google-auth"` focuses the review composer for that target.

## Element API

Reach the facade with `element.api`, and wait for `element.api.ready` before the first read:

```js
const el = document.querySelector('dpk-view-prototype');
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
el.api.exportDraft(); // { view, frameworkVersion, exportedAt, actions }
el.api.exportBrief(); // markdown hand-off for the agent
el.api.subscribe(fn); // returns an unsubscribe function
```

`dispatch()` returns `{ ok: true, id }` or `{ ok: false, issues }`; `dispatchBatch()` returns `{ ok: true, ids }` or `{ ok: false, issues }`, and any failure rejects the whole batch. `subscribe(fn)` observes the complete snapshot — draft changes, navigation changes and rejected-dispatch issues — and a subsequent successful change clears previous issues before notifying. Navigation does not emit `dpk-change` and does not persist a draft.

| Event          | Detail           | Fired when                                 |
| -------------- | ---------------- | ------------------------------------------ |
| `dpk-change`   | snapshot         | draft changed / derived state changed      |
| `dpk-navigate` | `{ navigation }` | hash navigation changed                    |
| `dpk-error`    | `{ issues }`     | a dispatch was rejected                    |
| `dpk-commit`   | `{ value }`      | from `dpk-inline-edit` (bubbles, composed) |

All events bubble and are composed. `dpk-comment-panel` (the review rail) and `dpk-inline-edit` (the inline editor, `docs/components/inline-edit.md`) are registered by every entry; a view or a board is page content, not a component — a view owns the page, a board can be embedded or own it — and its comments and element actions go into the page's draft. `dpk-formal-spec` (verified properties restated in plain words, `docs/components/formal-spec.md`) is a component; its comments work the same way. `dpk-comment-popover` (`docs/components/comment-popover.md`) is that same contextual composer on its own, for markup that is not one of these: wrap any trigger in it and toggle `open`. Each view and board has a page under `docs/views/` or `docs/boards/`; each component under `docs/components/`.

## Slots and styling

| Slot         | Notes                                                                                                                                                 |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `header`     | appended after the page title, in the screen's header row (see [Framework chrome](#framework-chrome))                                                 |
| `sidebar`    | appended after the view sidebar content                                                                                                               |
| `aside`      | a second sidebar, on the side of the main column the view's sidebar leaves free; drawn (with its edge and button) only when you slot content in       |
| `main`       | appended after the view main content                                                                                                                  |
| `footer`     | appended after the framework footer                                                                                                                   |
| `preview`    | view-specific; the view documents how it matches your markup                                                                                          |
| `supplement` | supporting material (an ERD, a checklist, a sequence diagram), named tabs in a bar at the bottom of the main column — see [Supplements](#supplements) |

### Framework chrome

Every page has the same two pieces of chrome, drawn by the element that owns the page: the app, or
the view or board when it is used on its own. They hold no meaning of yours, and neither is a
draft action.

- **The header** is the fixed row across the top: the kit's mark, the page switcher whenever there is a
  page to switch to or a content to add (the name of the page shown is in its own label, and **+**
  adds one), the page's title as its `h1` (ellipsized, with the whole title on hover), then the
  content's own header controls and your `slot="header"` markup, and, at the end, the language
  select, the theme toggle and the settings gear. The gear opens the settings dialog: the page's own
  switches and any section its view renders, in one frame whose height stays the same as the reader
  switches sections. The row wraps rather than squeezing its
  content, and on a phone the title takes a row of its own.
- **The floating menu** carries the page's own controls, in one row or one column: the grip, undo and
  redo, the review's sections (**Review comments**, **Activity log**, and **Questions** while the page
  asks any), then Check Mode and the changes bell. The reader drags it by its grip and it snaps to
  the nearest edge on release; its orientation follows that edge, so it is one row along the top or
  bottom and one column along the left or right. Focusing the grip and pressing an arrow key docks
  it to that edge, and Home / End send it to the start or the end of the edge it is on. Where it was
  left is remembered per content (`localStorage` key `dev-process-kit:menu:<content>`) and clamped
  into the window on restore and on resize; it is the reader's own state, never part of the draft and
  never sent to the agent. It keeps clear of the header row, so a menu docked to the top edge never
  covers the title or its controls.

A page inside `<dpk-app>` draws neither of them: the app owns the screen. Its own header controls
sit in a bar under the app's header instead, with no title of their own, since the header above
already names the document and there is one of each of these per screen.

Icon buttons name themselves with a tooltip and an `aria-label`. Everything in the floating menu has
a keyboard path: Tab reaches each button, the shortcut above it works anywhere on the page, and
Escape closes the review first.

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

Every view renders light or dark, and its header carries a sun / moon toggle for the reader. The scheme is decided in this order, strongest first:

1. the reader's toggle — remembered per browser for every page of the origin (for this page load only under `storage="off"` / `"memory"`); toggling back to the default forgets it
2. the `theme` attribute on the content element
3. `<html data-theme="light|dark">` on the page — how a host such as the Claude Artifact viewer passes its reader's choice down
4. the OS preference (`prefers-color-scheme`)

The app sets `color-scheme` on itself, and the color tokens switch with it, so author content that uses `var(--dpk-*)` follows without extra CSS. Hard-coded colors do not: write page CSS with the tokens, and do not paint `html` / `body` with a fixed background (leave the page ground to the view). A mockup that must stay light can set `color-scheme: light` on its own container. A component used on its own follows the page's `color-scheme` (light when the page declares none).

### Theme

`--dpk-accent*` and `--dpk-blue*` come from two inputs, `--dpk-brand-primary` and `--dpk-brand-secondary`. The kit already redeclares them from these two inputs on every component's host and on the document `:root`, so setting them there is enough — a class in your own page CSS, or an inline `style`, on any ancestor up to and including the `<html>` root. For a point in the tree with neither boundary (light DOM slotted into an already-instantiated component, an app screen a view renders with its own brand), set the two inputs on an element that also carries the `data-dpk-theme` attribute (shipped with the CSS atoms, so it travels with them); every `.dpk-btn`, chip, badge, input, card, link and focus ring under that element then recolors to match, in both color schemes. Leave the inputs unset and an element keeps the kit's own indigo-violet and blue. This is how a prototyped application screen can carry its own brand inside `dpk-view-prototype` while the kit's own chrome stays `dev-process-kit`'s colors (see [Prototype](views/prototype.md)).

### Language

The kit's own text — the review rail, the kit's chrome, board controls and the titles of draft actions — follows the page's `lang`. Every element uses the closest `lang` attribute: its own, then its ancestors', through shadow roots. Only the primary subtag counts (`ja-JP` is `ja`). The kit ships English (`en`) and Japanese (`ja`); a missing or unsupported `lang` renders English.

```html
<html lang="ja">
  …
  <dpk-view-usm lang="ja" storage-key="checkout-usm">…</dpk-view-usm>
</html>
```

Write `lang` on `<html>`, and also on the content element when you do not control `<html>` (a Claude Artifact wraps your file in its own document). The language is read when the element connects; changing `lang` afterwards has no effect.

The header has a language select that starts on that language. The reader's pick switches the app and every element inside it, and is remembered per origin (`localStorage` key `dev-process-kit:locale`) unless `storage` is `off` or `memory`. Picking the page's own language forgets the pick. The app applies a pick by setting its own `lang`, so do not read that attribute back as the page's language. Your content (base data, slot markup, a board's `heading` / `subject`) is never translated. The hand-off brief keeps its headings and instructions in English for the agent; the action titles in it follow the page's language.

### Sidebar width and folding

The reader can resize the content sidebar by dragging the edge that faces the main column, or by focusing that edge and pressing the arrow keys (they move the edge; Shift for larger steps, Home / End for the narrowest and widest). Double-clicking the edge restores the content's default width. The width stays between 180px and 560px and is remembered per content for the whole app (`localStorage` key `dev-process-kit:sidebar-width:<content>`) unless `storage` is `off` or `memory`. A side with nothing in it has no edge and no button.

The round button on that edge folds the sidebar away entirely; a button floating at that end of the main column brings it back (both are ordinary buttons, so Tab and Enter / Space work, and they carry `aria-expanded`). The folded state is remembered the same way as the width (`localStorage` key `dev-process-kit:sidebar-collapsed:<content>`). Grill has no such button: its own Questions / Review button already folds its rail.

The `aside` sidebar on the other side resizes and folds the same way, on its own, under the same keys with `:aside` appended (`dev-process-kit:sidebar-width:<content>:aside`). On a narrow screen the `aside` sidebar opens as a drawer over the main column.

### Version

The page runs the version of `dev-process-kit` its own URL pins, and the settings dialog offers no
other: a page defines a custom element once, so switching versions needs a fresh page. A
`?dpk-version=<version>` on the page's URL hands the page to that version instead — the entry the page
loads imports that version's same entry from jsDelivr and defines nothing itself. Nothing else about
the page changes — the markup and base data stay the ones you wrote, so a version older than the page
may not render everything in it.

- Only an exact version is honoured (`1.2.3`, `1.2.3-beta.1`); anything else, or the version already running, leaves the page on its pinned version. When the version asked for cannot be loaded (it does not exist, or lacks that entry), the pinned version runs the page and logs why.
- A version from before this switch was built in renders no control of its own; the entry that handed the page over then puts a select into the content's `header` slot. It lists the published versions, and `Pinned by the page` while the URL asks for another one, so the reader can always come back.
- Your pinned URL stays the contract: never write `?dpk-version=` into a link to make a page run another version, and never load `@latest`. The parameter is for the reader trying a version out by hand.
- `window.devProcessKit` names the version that defined the elements (`version`), the views it registered (`views`), and the query parameter above (`versionParam`).

### Supplements

Slot each piece of supporting material as its own element with a `data-name`:

```html
<section slot="supplement" data-name="ERD"><dpk-board-er-diagram>…</dpk-board-er-diagram></section>
<section slot="supplement" data-name="Checklist">
  <ul>
    …
  </ul>
</section>
<section slot="supplement" data-name="Sequence">
  <dpk-board-sequence-diagram>…</dpk-board-sequence-diagram>
</section>
```

The shell lines the names up, in the order written, in a bar the full width of the main column, pinned to its bottom. The reader presses a name to open that supplement alone, growing upward over the content; pressing another switches, and pressing the open one folds it. The chevron at the start of the bar folds it too, and reopens the supplement last opened (the first, before any). One without a `data-name` is labelled "Memo". The bar is rendered only while at least one supplement is slotted, and follows ones added later. A supplement may hold the boards (load `components.js` too).

Every supplement opens at one height — 320px, the same for every tab and every page load — so switching tabs never moves the drawer: a shorter supplement leaves the rest of it empty and a taller one scrolls inside. The reader changes that height by dragging the drawer's top edge, or with the arrow keys on it once focused (Shift for a larger step, Home / End for the shortest and the tallest, a double-click for the default), clamped between 140px and 160px short of the window; it is the reader's own state, remembered per browser for that template (`localStorage` key `dev-process-kit:supplements-height:<content>`, for this page load only under `storage` `off` / `memory`) and never written to the draft.

The `memo` slot is gone: content left in `slot="memo"` is not shown, and the console says so. Wrap it in a `slot="supplement"` element instead.

## Review and the hand-off

The review rail's `Copy changes & comments` button puts the hand-off brief on the clipboard: readable markdown that ends with the canonical draft JSON. Once there is a draft, the same `Copy changes & comments` (and `Send to Claude`, below) also floats at the bottom right while the rail is closed, so a reader who only wants to hand the review back does not have to open it. Hand the brief to the agent: it applies the requested end state to the base HTML, keeps the ids of the concepts that survived, and drops the draft envelope from the JSON. The page never mutates its own base data, so the HTML the agent writes back is the new source of truth.

The floating menu's Undo/Redo buttons (and Cmd+Z/Ctrl+Z, Shift+Cmd+Z/Ctrl+Shift+Z/Ctrl+Y) step through that log one entry at a time; each is disabled when there is nothing to undo or redo. An app with pages shows these once, in the app's own menu: undo and redo apply to the whole app's draft, not to one page at a time.

Inside a Claude Artifact published with the `comments` capability, the rail also offers **Send to Claude**: the brief is posted as a comment sent to the Claude session that published the page, pinned to the content element. A brief over the 4 KiB comment limit is stored as a document in the `reviews` collection of the artifact's database (when the page also declares `db`), and the comment points at it; the document holds `brief` (the same markdown) and `draft` (the canonical JSON). The button appears only when the viewer can send to Claude right now; a failed send says why and leaves the copy button as the way on. Elsewhere nothing changes.

## Questions (grill)

Any view can ask the reader questions — decisions you still need from them — alongside its usual content ([ADR](../dev-docs/adr/20261016_grill-in-core.md)). Put them in a script of their own, another child of the content element, **after** its [base data](#base-data) (base data first, always):

```html
<dpk-app storage-key="checkout-usm">
  <script type="application/json">
    { "title": "Checkout" }
  </script>
  <dpk-page name="scope" label="Scope">
    <dpk-view-usm>
      <script type="application/json">
        { "activities": [] }
      </script>
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
    </dpk-view-usm>
  </dpk-page>
</dpk-app>
```

Leave the block out until there is a question to ask. A malformed block renders an error banner; the base data keeps working regardless.

On an [app with pages](page.md#questions), each page keeps its questions in a block of its own, and the app asks them all in one panel.

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

Mark page content a question is about with `data-grill-questions="Q1 Q4"` (space-separated refs), either in your own light DOM markup or, inside a board's data, on a node, field or message that supports it (see `docs/boards/index.md`, `docs/components/kanban.md`, `docs/components/mind-map.md`, `docs/components/table.md`), or on a card a view or board renders from its base data: give the card `questions` (`"Q1 Q4"`) as its own page lists (usm, task-board, delegation-poker; event-storming, example-mapping, whiteboard). The shell lays a badge for each reference over the main column — on the right, level with the element, for your own markup; on the corner of a board node (following its pan and zoom) or of a view's card. A reference no question matches is ignored, and pressing a badge opens that question.

### The questions toggle

A question-mark toggle appears in the floating menu after **Review comments** and **Activity log**, but only while the page has questions; its badge reads `answered / total`. It opens the same review popover, on a **Questions** tab instead of the comments list; `notes="questions"` on the content element opens the popover there on load (alongside the existing `"on"` / `"comments"` / `"changes"`). With `history`, the tab is a round select — current questions first, then earlier rounds newest first, each read-only.

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

When you regenerate a page at the reader's request, tell them what changed. Put a change log **after** the [base data](#base-data) — base data first, always — as another child of the content element. It is the page's history: **each regeneration appends one version at the end**, and earlier versions stay as they were. Written before the base data, it is read as the base data by a released bundle that does not skip option blocks, and the page opens to the error banner.

```html
<dpk-view-usm storage-key="checkout-usm">
  <script type="application/json">
    { "activities": [] }
  </script>
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
</dpk-view-usm>
```

- `revisions` lists the versions **oldest first**; the last one is this version of the page. On each regeneration, add a new entry at the end with a new `revision` name (unique in the log) and **only the changes made in that regeneration**. Do not edit, merge or repeat the changes of earlier versions. You may drop versions from the start once the log gets long.
- Each change has a `title`, and optionally a `body`, an `id` (unique within its version; the position is used when omitted, so give ids when the list can be reordered), a `target` (`type:id`, as in [Targets](#targets)) and a `navigate` (hash syntax, `view=flow&screen=cart`) for where it is seen when the target alone does not say.
- Leave the block out until there is something to announce. A log of one version may also be written as `{ "revision": "…", "changes": [ … ] }`.
- The change log is not base data: the view never reads it, and a malformed log shows a banner without touching the page.

The floating menu gets a bell (after Check Mode), and each reader is told only what is new to them:

- A reader who opens the page for the first time is told only this version's changes, not the whole history.
- A returning reader is told every version since the one they left unread changes in. If that version has been dropped from the log, they are told every version kept.
- Only this version's unread changes pop up as toasts (three at a time; each fades after a few seconds unless pointed at). Older unread changes wait on the bell.
- The bell's badge counts every unread change. Opening the bell lists every version kept, newest first, and clears the toasts.
- Each change is marked as seen on its own. One with a **Show** is seen when the reader follows it, from its toast or its card. One without a **Show** is seen when the list shows its card.
- A toast that is closed or fades away, and a card whose **Show** is not followed, leave their change on the badge.
- **Mark all as read** (in the list, and under the toasts when there are several) clears every unread change at once.
- Where the reader is in the history is remembered in `localStorage` under the key `<storage key>:seen-changes`. Under `storage="off"` / `"memory"` it lasts only for this page load, so every load counts as a first visit.

**Show** (on a toast or in the list) navigates to where the target is seen, brings it into view and highlights it for a few seconds. Views and boards mark the elements their targets render as; each view page lists the targets it can show. In your own markup — the plain view's sections, a prototype's slotted screens — mark the element yourself with `data-dpk-target="type:id"` (space-separated when one element stands for several targets). A change with only `navigate` just navigates; one with neither has no **Show**.

## Check Mode

A toggle in the floating menu, after the review's own sections, lets the reader tally what they have already looked over during a long review, independent of comments or questions. Turning it on shows a small badge at the corner of every element already marked `data-dpk-target` — the same marker [Change notices](#change-notices)' **Show** and the [context menu](#context-menu) use, so most views need no change to support it: a content page's own [targets](#targets) list is what Check Mode covers. Clicking a badge marks it checked; clicking again clears it.

A badge is a child of the box its target is laid out in, so it travels with the target — a scroll of its own column, a diagram pan, a zoom, a maximized panel — instead of being pinned over the page ([ADR](../dev-docs/adr/20261026_badge-portals.md)). A target panned out of a diagram's canvas takes its badge out of view with it.

Not everything marked for **Show** is a unit the reader works through. A diagram's relation lines and links, a message, and a board's axis heads — a USM activity's column head, a step's head, a milestone row's head — keep the target so **Show** can point at them, and say `data-dpk-check="off"` to opt out of Check Mode; a badge on a header that stays on screen while its cards scroll under it would tally the axis, not the work. The attribute opts out the whole subtree below the element that carries it, and any other value still counts as a target. In your own markup, use it the same way — checkable items do not need it, and a container of them must not carry it.

A checked element that a later change log entry targets (its `target` matching the same ref) shows "(?)" instead, until the reader checks it again — Check Mode reuses the change log already on the page rather than tracking changes on its own, so a page with no change log never goes stale, only checked or not.

This state is entirely the reader's: it lives in `localStorage` under `<storage key>:check-mode`, the same way the change notices' own read history does, and it is never written into the draft or the hand-off brief — the agent never sees it. Turning Check Mode off clears every mark, so the reader is asked to confirm first, with the same prompt as `docs/components/confirm-dialog.md` — unless nothing is checked yet, in which case it turns off at once.

## Context menu

A plain right-click anywhere on the page opens a menu instead of the browser's own, with whatever applies to what was clicked: **Copy text** (when it is one of the content's targets — the same ones `data-dpk-target`/[Targets](#targets) mark), **Give feedback** (when that target accepts comments — feedback to the agent, distinct from any comments a page keeps of its own), and **Reset view** on a board, regardless of target. A view, board or component may add its own entries (for example, "Duplicate" or "Delete" where supported); its own page says so when it does. Labels stay short — this is not where explanations live.

Shift+right-click, and a plain right-click inside a text field or an editable region, always get the browser's own menu (cut/paste and spellcheck need it). Inside the custom menu: arrow keys move, Enter/Space runs the highlighted entry, Escape or a click elsewhere closes it.

Your own markup can add entries too, without writing a component: wrap it in `<dpk-extend-right-click>` and list the selectors and entries in a JSON child ([extend-right-click.md](components/extend-right-click.md)). It needs a `dpk-view-*` above it, which is where the menu lives.

## Read next

| Question                          | Read                                                                                                                                                                                                                                         |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The view or board I am using      | `docs/views/<name>.md` (usm / prototype / plain / slides / task-board / delegation-poker) or `docs/boards/<name>.md` (ER / state / sequence / dependency / architecture / mind map / event storming / example mapping / whiteboard / kanban) |
| The component I am actually using | `docs/components/<name>.md` (comment-panel / inline-edit / comment-thread / formal-spec / line-chart / code-group / table / select / alternatives / extend-right-click / …)                                                                  |
| Several pages in one app          | `docs/page.md`                                                                                                                                                                                                                               |
| Publishing as a Claude Artifact   | `docs/claude-artifact.md`                                                                                                                                                                                                                    |

Read the page for what you are actually using, plus this one.
