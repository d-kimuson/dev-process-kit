# A right-click menu assembled from duck-typed, composed-path contributions

A page-wide context menu replaces the browser's default menu on a plain right-click. Its items come from whatever the click landed on — a component, a board, the shell itself — discovered the same way `element-actions.ts` and `comment-targets.ts` already discover their providers, with no new hook added to `TemplateDefinition`.

## Status

accepted

## Context

Every template and component needed a consistent place to offer "what can I do with this" on right-click: copy a link to it, comment on it, reset a diagram's view, insert something new at a position, duplicate or delete it. Three shapes were possible:

- **A hook on `TemplateDefinition`.** Every template would gain a required method, and components (which `TemplateDefinition` does not describe at all) would still need a separate mechanism.
- **A hardcoded menu per feature.** The shell would need to know about whiteboard items, diagram nodes, task cards and so on by name, breaking the rule that core never imports components or templates.
- **A duck-typed `ContextMenuProvider` found along the event's `composedPath()`,** mirroring `getElementActions`/`commentTargets`: any element — component, template, page — may expose `getContextMenuItems(request)`, and whichever elements the click passed through are asked, innermost first (the order `composedPath()` already returns them in).

The common case — copy the clicked thing's text, copy a link to it, comment on it, reset a diagram's view — needed no per-component code at all: `TemplateDefinition.navigationFor`/`hasTarget` and `TemplateElement`'s own public `hashFor`/`requestComment` already describe it. Diagram-insertion ("add a diagram here") additionally needed an extensible catalog of diagram components, since core cannot import them and a sibling effort (converting Whiteboard, Event Storming and Example Mapping into diagram components in their own right) was underway concurrently and would keep adding entries.

## Decision

- **Contract (`src/core/context-menu/types.ts`):** a flat ADT — `ContextMenuItem | ContextMenuSubmenu` grouped into `ContextMenuGroup`s — plus `ContextMenuProvider = { getContextMenuItems(request): readonly ContextMenuGroup[] | null }`. An item carries only `id`, `label`, `run()`, `disabled?`, `danger?`; the menu interprets nothing and stores no domain knowledge, exactly like a `TemplateSetting`.
- **Discovery (`./provider.ts`):** `collectContextMenuGroups(path, request)` asks every node on `event.composedPath()` that implements `getContextMenuItems`, in the path's own (innermost-first) order — no extra sorting. `resolveContextMenuTarget(path)` reuses the existing `data-dpk-target`/`data-dpk-comment` attribute convention and `parseTargetRef` (`./reveal.ts`, `./target.ts`) to find what was clicked; `findMethodProvider(path, name)` is the same duck-typed lookup `resetView()` uses.
- **Common actions (`./common-actions.ts`), no per-component code:** copy text (from the matched element's `textContent`), copy link (`TemplateDefinition.navigationFor` + `TemplateElement.hashFor`), comment (`TemplateDefinition.hasTarget` + `TemplateElement.requestComment`), and reset view (any element along the path with a callable `resetView()` — independent of whether a target was resolved at all). These map onto behaviour that already exists; no new review semantics were invented.
- **Model (`./model.ts`), pure:** `ContextMenuState` plus transitions (`openContextMenu`, `moveActive`, `openSubmenuById`/`openActiveSubmenu`/`closeActiveSubmenu`, `activate`). `activate` returns a transition and an effect to run, rather than running it — the controller decides when.
- **Controller (`./controller.ts`):** a `ReactiveController` self-attached to the host template element's own `contextmenu` listener (`hostConnected`/`hostDisconnected`, mirroring `DismissController`'s listen-on-host pattern) — no edit to `connectedCallback` was needed. It positions the menu with the existing popover helper (`pointAnchor` + `openPopover`, `placement: 'right-start'`), composes `DismissController` for outside-click/Escape, and moves focus into the surface so arrow keys reach it.
- **Rendering (`./render.ts`, `./styles.ts`):** reuses the shell's existing `.dpk-settings`/`.dpk-settings-option` chrome (the settings menu's own classes) for consistent chrome, adding only the highlighted-row, danger-tone, heading, divider and submenu-flyout rules. `role="menu"`/`"menuitem"`, arrow keys, Enter/Space, Escape.
- **Native menu passthrough:** Shift+right-click always gets the native menu; so does a plain right-click inside an `input`, a `textarea` or a `contenteditable` region, since editing needs Cut and spellcheck entries the custom menu does not reimplement.
- **Diagram-insertion catalog (`src/components/diagram/registry.ts`):** `registerDiagram({ tag, label, seed })` / `listDiagrams()`. Each diagram component's own `index.ts` registers itself once, using its existing `label` (reusing that component's own `heading` message, not a second copy of the name) and its existing `empty*Data()` thunk as the seed. A picker reads `listDiagrams()` instead of naming components, so a diagram turned out of a template (as Whiteboard, Event Storming and Example Mapping were, concurrently) joins the catalog by registering itself, with no change to whichever board offers "add a diagram here".
- **Wiring (`src/core/element.ts`):** one field (`#contextMenu`), the styles array, and the `render()` return wrapped to also render the menu's surface — four minimal, pattern-matched edits, no touch to `renderChrome`/`#renderBoardChrome` or the lifecycle callbacks.
- **Diagram insertion is not wired into any board in this slice.** Every template directory had concurrent, uncommitted edits in flight when this was implemented, and Whiteboard specifically was mid-conversion into an embeddable diagram component by that concurrent effort — writing insertion code against its current shape risked direct edit conflicts and likely needing a rewrite once that conversion landed. The registry and the menu framework are ready; a future, uncontested session wires `getContextMenuItems` (duplicate/delete/add-diagram) into whichever board picks it up first.
- **Diagram-internal targets are out of scope.** `data-dpk-target`/`data-dpk-comment` is a template-rendering convention (items, connectors, cards, steps); the six diagram components expose comment-targetability through a `commentTargets` _property_, not DOM attributes, and nothing in a diagram's own nodes/edges is attribute-marked. The common-actions group therefore cannot offer "copy link" or "comment" on an individual diagram node or edge — only "reset view," which is duck-typed independently of target resolution, is available there today.

## Consequences

- Every existing board and component gets a right-click menu with copy/comment/reset-view for free, with zero per-board code, because the common-actions group only reads surfaces each `TemplateDefinition`/`TemplateElement` already exposes.
- A component or template that wants more (duplicate, delete, "add a diagram here") implements one method, `getContextMenuItems`, discovered automatically by its position on the composed path — no registration elsewhere.
- The diagram catalog is a second, small registry alongside `element-actions`/`comment-targets`'s per-provider lookups; any diagram component that forgets to call `registerDiagram` from its own `define*()` simply never appears in an insertion picker, failing quietly rather than loudly.
- No visual feedback (toast) on a successful "copy" exists yet, to avoid touching a notice/toast system under concurrent edit; a silent clipboard write is the only confirmation in this slice.
- Right-click on an individual diagram node or edge offers only "reset view," not "copy link"/"comment," until diagram-internal targets grow an equivalent attribute-based (or provider-based) resolution path.

## References

- [Record component edits as element actions](20260924_component-element-actions.md)
- [docs/components/diagrams.md](../../docs/components/diagrams.md)
