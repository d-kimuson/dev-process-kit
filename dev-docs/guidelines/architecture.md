# Architecture Guideline

## Dependency direction

The framework has four conceptual layers:

```text
lib <- core <- components <- templates
```

`lib` contains small helpers that know nothing about dev-process-kit. `core` owns the draft pipeline without knowing any template. Components provide reusable public UI, and templates provide domain-specific models and actions. Genuinely shared behavior belongs in a lower layer rather than coupling templates to one another.

The whole-screen layouts (`dpk-internal-layout-*`) live in `core`, internal to the shell: `src/core/layouts/<name>/` registers `dpk-internal-layout-<name>`. The criterion is whether the element divides **the whole screen** (fixed bars, the scrolling column, a sidebar on either side of the main column, the page's rail). They are not exported or documented for authors: a page gets these regions through the slots of its template or `<dpk-page>`, a region with no content draws nothing, and what floats over the screen (the floating menu) is one fixed element per screen, drawn by the element that owns the page's chrome ([ADR](../adr/20261022_page-as-the-base-form.md)). Anything that lays out part of the screen (a toolbar, a canvas, a card grid) is a component or an atom class instead. A template asks the shell for a layout through `sidebarLayout` and `mainLayout` rather than overriding the shell's classes.

Entrypoints assemble these layers into public distributions; they are not shared implementation modules.

`dist/` is generated output whose source of truth is `src/**`; do not implement changes in it.

## State and actions

A template element has a base state and an ordered draft of human actions. The visible state is derived by reducing those actions over the base state. UI code must not mutate domain state directly; every human-authored change enters through the action pipeline.

Applying an action is a pure operation. It returns the next state, or `null` when the action cannot apply to the current base. This distinction lets the review rail preserve and explain stale or incompatible actions instead of silently discarding them.

The draft is the plain log of what the reader did, in order: nothing is dropped because it cancels out with something else, so an addition deleted again still shows both steps, and so does a move and its move back. The core still cleans up two narrower things that are not about history: a patch the base (or an earlier patch) already satisfies is dropped as a no-op, and adjacent patches to the same target replace one another so a draft stays one entry per edit rather than one per keystroke. The reader can undo and redo this log (keyboard shortcuts and the floating menu's buttons, core-owned, not per template); a new action clears the redo stack. See the [ADR](../adr/20261023_draft-is-the-log.md), which supersedes the earlier interpretive-drafts ADR.

Navigation describes what the reader is viewing. It is not a draft action and must not become part of the authored change history.

## Public boundary

The public contract consists only of Custom Elements and their attributes, properties, events, and slots. Lit and the internal TypeScript modules are implementation details. New behavior should fit this browser-native boundary instead of exposing framework internals.

Validate all data that crosses the public or persistence boundary before it reaches domain logic. Derive static types from the runtime schema so the two contracts cannot drift independently.

## UI responsibilities

Keep state transitions, presentation derivation, rendering, and effects distinct:

- **Model** defines immutable UI state, intents, and transitions.
- **Presentation** derives a view model from domain and UI state without touching the DOM.
- **View** renders the view model and emits intents.
- **Adapter** owns Custom Element lifecycle, state replacement, focus, clipboard access, subscriptions, and external callbacks.

Pass view models to views rather than domain services or template definitions. Read event values at the view boundary. Do not clear pending user input when an external callback fails.

Use controllers for the lifetime of observers and subscriptions, not as an alternative home for state transitions. Key editable children by entity identity so unfinished input cannot migrate to another entity after rerendering.

Prefer a shared template inside an existing shadow root when UI must share slots and styling. Adding a nested Custom Element also adds a shadow boundary, which changes slot routing and CSS behavior.

## Template responsibility

A template supplies a semantic model and action vocabulary; it does not reimplement the core pipeline. The core owns the shell, review rail, persistence, navigation, and preview routing. A template owns parsing its base data, applying and describing its actions, resolving navigation, and rendering its domain regions.

Keep these semantic details in mind:

- Action descriptions receive the state after the draft has been applied. Use the optional base state for a meaningful “before” value. An entity created by the draft has no corresponding value in the base.
- When the state stores an order that the template never shows (for example the global order of stories that are only ever shown per cell), implement `canonicalState` so that two states meaning the same page compare equal. Otherwise a patch that only touches that incidental structure is not recognized as a no-op and lingers in the draft.
- A slot only distributes light DOM belonging to its own host. Author-owned preview content therefore needs a slot in the template element that owns that light DOM.
- SVG fragments must be created in the SVG namespace. Keep theme-driven SVG paint in styles rather than relying on CSS variables inside presentation attributes.

## Browser capability assumptions

The DOM type library includes APIs that may exist in only one browser engine. Type acceptance is therefore not evidence of browser support. Treat feature detection and real-browser verification as part of adopting a browser API whose availability is not universal.
