# Hold several templates as boards of one page

A page can hold several templates, of different kinds, as boards. A new page host element, `<dpk-page>`, owns everything that is one per page: the header, the review, the draft and its storage, the brief and the hand-off, the questions, the change notices, the version switch and the URL hash. Each `dpk-template-*` inside it is a board: it keeps its semantic model, action vocabulary and regions, and leaves the shell to the page. A template that is the page root on its own keeps working unchanged, as a page with one board.

## Status

accepted

## Context

Readers increasingly need to agree on several things at once: the scope of a feature (`usm`), its domain events (`event-storming`) and its screens (`prototype`). Today one HTML file holds exactly one template root, so an agent splits that work across several pages. Each page has its own review, draft, storage key and brief. The reader then reviews and hands off several times, and a comment cannot point from one board to another.

Two directions were considered:

- **Drop the template abstraction and build everything from components inside Plain.** This would merge two contracts: a template's definition, which the core interprets (reducer, `canonicalState`, interpretive dedupe), and a component's element actions, which it does not. But a board still needs a reducer, canonicalization and navigation, so a "board component" would be a template without its shell under another name. It would also erase a layout distinction that is real. Full-viewport boards with gestures, toolbars and their own sidebar (whiteboard, event-storming) cannot sit inline in prose the way a diagram does. Every published page would break too.
- **Keep templates and let a page hold several of them.** If templates simply sat side by side, each would bring its own header, review, storage and hash. The hashes would collide, and the review and the brief would split into one per board. The page would lose the property that one page means one review and one brief.

The templates already differ mostly in their definition and their regions. The shell is shared code in `TemplateElement`, so it can move into a host.

## Decision

- **The shell moves from the template to the page.** The core gains a page host that owns the header (title, version, notices, language, theme), the review toggles and popover, one draft controller, storage, the brief and the Claude hand-off, the questions (`data-dpk-grill`), the change notices (`data-dpk-changes`) and the hash. A template contributes its definition and its regions (sidebar, main, footer, header controls, settings) and nothing else.
- **`<dpk-page>` is the new public root, and templates are its boards.** It is a new role next to template and component, and it is the only element named without a role suffix. Its children are `dpk-template-*` elements with a `board="<id>"` attribute. Board ids follow the common id rule (letters, digits, `_`, `-`) and are unique in the page. The board order is document order. A left icon rail switches the visible board; inactive boards stay mounted and are hidden. The page's own base data is a JSON child that holds at least its `title`.
- **A standalone template is a page with one board.** A `dpk-template-*` with no `<dpk-page>` ancestor creates its page host implicitly. Its markup, attributes, storage record, hash, target strings, brief and `element.api` stay exactly as they are today. Existing pages and the docs pinned to earlier tags keep working.
- **One draft, scoped by board.** Each draft action inside a page carries the id of the board it belongs to. Each board's actions are validated, applied, canonicalized and deduped by that board's definition against that board's base, as today. The page's draft is the union, kept in one order. The core still never interprets an action across boards. An action whose board is gone is stale (`target-missing`), like an action on a missing target.
- **Targets are qualified by board, and a board-relative target needs no qualifier.** The string form is `<type>:<id>@<board>` (`story:checkout.pay@scope`). The qualifier is split off at the last `@`. Board ids cannot contain `@`, so the split is unambiguous even when a component's own `id` contains one. A target without `@<board>` resolves to the board the attribute or call belongs to: the nearest board element for `data-dpk-comment` and `data-dpk-navigate`, and the board itself for `board.api`. The same markup therefore works in a board and as a standalone template. A qualified target makes cross-board comments, links and questions possible. `page:page` means the page as a whole, and a board's `page:<template>` means that board.
- **The hash is namespaced by board.** Inside a page, `board=<id>` names the visible board, and each board's keys are prefixed with its id (`#board=domain&scope.activity=signup&domain.event=paid`). Every board keeps its position, and any board position can be deep-linked. A standalone template keeps unprefixed keys.
- **The brief and storage are per page.** The brief groups pending changes, comments and stale actions by board, under the board's label and template, and states which component JSON or board base data each section applies to. One storage record holds the page's draft. A stored action is checked against the template name of its board, and an action for a board whose template changed is dropped, just as a whole record is dropped today when its template does not match.
- **The page API wraps the board APIs.** `page.api` exposes the page-wide snapshot, draft, brief and navigation. `board.api` keeps today's shape for its own slice and dispatches through the page with its board fixed.

## Consequences

- Agents can put scope, domain and screens on one page, and the reader reviews and hands off once. A comment can now point across boards.
- The page host becomes the largest single responsibility in the core. Splitting `TemplateElement` into a page host and a board must happen before any multi-board behavior, and it must not change a standalone template's observable behavior. The existing template tests are the guard.
- A template can no longer assume that it owns the window. Boards are hidden and shown, so a board that measures its layout (whiteboard, event-storming, prototype devices) must lay out again when it becomes visible. A board's header controls and settings appear only while it is the visible board.
- The naming convention gains a third role: a page host named `dpk-page`. The lint rule that ties tag names to directories must accept it.
- Template-level persisted UI state (sidebar width and fold, keyed by template name today) has to be keyed by board inside a page. Otherwise two boards of the same template would share it.
- The two action contracts stay separate. Template actions get interpretive dedupe and component element actions do not. Merging them, for example so that a mind map can be a board, remains possible later and is not part of this decision.

## References

- [Template responsibility](../guidelines/architecture.md#template-responsibility)
- [Record component edits as element actions in the enclosing template's draft](20260924_component-element-actions.md)
- [Interpretive drafts](20260924_interpretive-drafts.md)
- [Name the public contract after the project: `dpk-*`](20260924_dpk-naming.md)
