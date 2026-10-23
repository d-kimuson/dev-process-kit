# A diagram declares its own `variant`, and canvas-only screens become diagrams

Every `dpk-<name>` diagram carries a `variant` attribute: `embedded` (default, can be maximized inside whatever it sits in) or `board`, which renders full-screen chrome and lets the diagram act as a whole board of `<dpk-page>`, owning its own draft through the same core layer a template uses. Whiteboard, Event Storming and Example Mapping — screens that are nothing but a canvas — move from templates to diagrams so they gain this for free; USM, Task Board, Prototype, Slides, Delegation Poker and Plain keep their own regions (headers, rails, modes) that a diagram's contract does not model, so they stay templates.

## Status

accepted. Settles, for whiteboard, the open question in [20261022_page-as-the-base-form.md](20261022_page-as-the-base-form.md) ("Whole-screen templates that own the full viewport... still need their own answer to how they sit inside a page's chrome"); slides is a presentation mode, not a canvas, and stays unsettled by this decision.

## Context

A diagram (ER diagram, mind map, dependency graph, …) was always a component embedded inside some template's canvas or body, per [20260924_component-element-actions.md](20260924_component-element-actions.md): its edits are element actions recorded in the enclosing template's draft, and it has no draft of its own. Three screens, though, were written as templates (`dpk-template-whiteboard`, `dpk-template-event-storming`, `dpk-template-example-mapping`) for no reason tied to their layout — each is a single canvas, full stop, with no header fields, no rail, no modes beyond what any diagram already has. Keeping them as templates meant duplicating a template's whole machinery (its own `TemplateDefinition`, its own draft wiring) for exactly the behavior a diagram component already has, and it meant they could not be embedded inside another template (e.g. a whiteboard dropped into a Plain page) the way every other diagram can.

The reverse gap also existed: a diagram had no way to be the whole subject of a page. An ER diagram that is the point of a page (a page whose only board is its schema) had no path to becoming a board of `<dpk-page>` — only a `dpk-template-*` could be placed there, per [20261020_multi-board-pages.md](20261020_multi-board-pages.md) and `src/core/page/host.ts`'s board contract.

Both gaps have the same shape: a diagram and a board differ in where they get their draft from and how much of the screen they own, not in what kind of thing they are. Closing one without the other would have left diagrams that can only ever be embedded, and board-only screens that can never be embedded.

## Decision

- **`variant: 'embedded' | 'board'`, an attribute, not a placement guess.** Every diagram (`ElementChromeBase` in `src/components/diagram/element.ts`) declares `variant`, reflected, defaulting to `embedded`. `embedded` is today's behavior: the diagram sits inside a dialog panel that can be maximized and resized, and its edits are element actions reported to an enclosing provider. `board` renders full-bleed chrome with no maximize or resize affordance, since the diagram already owns the whole screen. The attribute is explicit because placement cannot stand in for it: a diagram embedded inside a `<dpk-page>` board still wants `embedded` chrome, and a diagram meant to fill the screen should say so even before it is placed.
- **Whether a diagram owns a draft is `board !== null`, read exactly as a template reads it.** A diagram becomes a board of `<dpk-page>` the same way a template does: a `board="<id>"` attribute directly inside `<dpk-page>` (`boardIdOf`, `src/core/page/host.ts`). This is independent of `variant` — a page author sets both (`variant="board"` for the chrome, `board="<id>"` for the hosting) because they answer different questions, chrome and data ownership, that happen to coincide for every board built so far but are not the same axis.
- **One core layer drives both a template's draft and a diagram-as-board's draft.** `src/core/diagram-board.ts` exports `diagramBoardDefinition`, a `TemplateDefinition` factory with trivial state (`Record<string, never>`, `apply` always returns `null`) wrapped in `withComponentSnapshot` (`src/core/comment-targets.ts`) so the diagram's own element actions and comment targets are recognized exactly as they already are for an embedded diagram's host. `ElementChromeBase` drives a `DraftController` with it when hosted, dispatching through `boardHostOf`/`resolveBoardTarget` exactly as `TemplateElement.dispatch` does, and sets `data-template` on itself so an enclosing page's provider scan treats it as an opaque board rather than a flat component. Core still never imports a component; the contract (`DiagramBoardSource`, `diagramBoardDefinition`) is a plain function added to core, and `ElementChromeBase` is the only thing that calls it. No diagram gets its own template-like machinery — they all share this one factory.
- **A screen that is only a canvas is a diagram, not a template.** Whiteboard, Event Storming and Example Mapping become diagram components (`dpk-whiteboard`, `dpk-event-storming`, `dpk-example-mapping`, per [20260924_dpk-naming.md](20260924_dpk-naming.md)'s `dpk-<name>` form). Each works embedded (inside Plain, or any other template, maximizable) and as a full-screen board (`variant="board"` directly inside `<dpk-page>`), through the same `ElementChromeBase` contract every other diagram already has. A screen that owns regions beyond a canvas — USM's backbone and milestone rail, Task Board's columns, Prototype's scenario rail, Slides' deck chrome, Delegation Poker's round state, Plain's sections — stays a template; a diagram's contract has no room for those regions, and forcing them into one would grow the diagram base to cover every template's layout instead of the reverse.
- **No compatibility.** `dpk-template-whiteboard`, `dpk-template-event-storming` and `dpk-template-example-mapping`, and their template entries, are removed outright, not aliased. The project has shipped no stable release carrying them under incompatible behavior yet, matching the precedent in [20260924_dpk-naming.md](20260924_dpk-naming.md).

## Consequences

- A diagram author picks `variant` once and gets the right chrome; getting `board` right without also hosting the element inside `<dpk-page>` with a matching `board` id is a page authoring mistake the same way a template without a `board` attribute is — the element simply never gets a draft, nothing breaks silently.
- Whiteboard, Event Storming and Example Mapping lose whatever templates offer that diagrams do not: there is no case in this release where that was in use (none has header fields, a rail, or modes beyond a canvas and comments), so nothing is lost.
- A page that pinned an earlier version and used `dpk-template-whiteboard`/`-event-storming`/`-example-mapping` stops working on an upgrade; it must be rewritten against the new tags. No compatibility shim is provided, consistent with how this project has always treated a tag rename.
- `src/core/page/host.ts` and `src/core/page/definition.ts` describe a board as "a `dpk-template-*` with a `board` attribute"; that description now undercounts — a board is any element, template or diagram, that reads `board` the same way.
- Slides remains a template with no board-diagram answer; a future decision may still need to settle how a whole-viewport presentation mode sits inside `<dpk-page>`'s chrome.

## References

- [20260924_component-element-actions.md](20260924_component-element-actions.md)
- [20260924_dpk-naming.md](20260924_dpk-naming.md)
- [20261020_multi-board-pages.md](20261020_multi-board-pages.md)
- [20261022_page-as-the-base-form.md](20261022_page-as-the-base-form.md)
- `src/core/diagram-board.ts`
- `src/components/diagram/element.ts`
