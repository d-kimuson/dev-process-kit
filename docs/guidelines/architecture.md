# Architecture Guideline

## Dependency direction

The framework has four conceptual layers:

```text
lib <- core <- components <- templates
```

`lib` contains small helpers that know nothing about the artifact framework. `core` owns the artifact pipeline without knowing any template. Components provide reusable public UI, and templates provide domain-specific models and actions. Genuinely shared behavior belongs in a lower layer rather than coupling templates to one another.

Entrypoints assemble these layers into public distributions; they are not shared implementation modules.

The published trees are generated artifacts. Their sources of truth are `src/**` and the consumer documentation; do not implement changes in `public/` or `public-dev/`.

## State and actions

An artifact has a base state and an ordered draft of human actions. The visible state is derived by reducing those actions over the base state. UI code must not mutate domain state directly; every human-authored change enters through the action pipeline.

Applying an action is a pure operation. It returns the next state, or `null` when the action cannot apply to the current base. This distinction lets the review rail preserve and explain stale or incompatible actions instead of silently discarding them.

The draft is interpretive: it states the net change, not how the reader got there. After every change the core drops each set of template actions whose removal leaves the artifact meaning the same (an addition deleted again, a move and its move back), together with the actions that only existed to edit what was removed. Removal is judged only by the resulting state, so it can never change what the draft asks for. See the [ADR](../adr/20260924_interpretive-drafts.md).

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
- When the state stores an order that the template never shows (for example the global order of stories that are only ever shown per cell), implement `canonicalState` so that two states meaning the same artifact compare equal. Otherwise a move and its move back may not cancel.
- A slot only distributes light DOM belonging to its own host. Author-owned preview content therefore needs a slot in the template element that owns that light DOM.
- SVG fragments must be created in the SVG namespace. Keep theme-driven SVG paint in styles rather than relying on CSS variables inside presentation attributes.

## Browser capability assumptions

The DOM type library includes APIs that may exist in only one browser engine. Type acceptance is therefore not evidence of browser support. Treat feature detection and real-browser verification as part of adopting a browser API whose availability is not universal.
