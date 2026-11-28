# The selection bar renders the count, the actions and their menus

## Status

accepted. Supersedes the content-free shell of [ADR: A shared selection action bar, lifted into the top layer](20261023_selection-bar.md); its top layer, its one-bar-at-a-time coordinator and its placement stand.

## Context

`<dpk-selection-bar>` was a content-free shell: core drew the surface and placed it, and each host slotted in its own count, buttons, select and close button. Event Storming was the only host, so nothing pulled two bars toward one look.

Kanban's bulk actions (move the picked cards, put a tag on them or take it off) lived in a section of the side panel. The panel is where one selected element's detail is read and edited; bulk actions there opened the panel for a multi-selection and left the panel showing a form instead of a detail. Readers expect bulk actions on a floating bar that names how many are selected and offers what can be done to them, the same on every board.

With a content-free shell, a second host would draw its own count text, its own close button and its own menus. Two boards would differ in wording ("2 件選択" against "2 スライスを選択中"), in the close button's look, and in how a choice from a list is offered (a native select against a menu). The shell gave a shared place, not a shared UI.

Moving Kanban to the bar also needs choices from lists the shell cannot express without each host building them: a target column, and tags that are on for some cards and off for others.

## Decision

The bar renders its controls from data. The host gives it the count (or a label that replaces the count text), and a list of actions. Each action is a button; an action with options opens a menu above the bar. An option with `checked` is an on/off choice (`'mixed'` when only part of the selection has it) and keeps the menu open, so several tags can be switched in a row. An action can end its menu with a text field, for a value that is not yet among the options (a new tag). The bar always ends with its own clear button.

The bar reports back with two events: `dpk-selection-action` (the action, the chosen value or typed text, and the pressed control's rectangle for a popup the host opens from it) and `dpk-selection-clear` (the clear button or `Escape`). The host keeps the selection and the meaning of every action; the bar knows nothing of cards or slices.

The bar's text (`N selected` / `N 件選択`, the clear button's name) follows the page's language like the rest of core's chrome.

The bar keeps clear of the side panel. The panel's layout publishes how much of the screen the panel takes on the right or at the bottom, and whether it covers the main column; the bar centers itself on what is left and hides while the panel covers the column. The values are inherited custom properties, so the bar reads them though it paints in the top layer.

The default slot stays, after the action buttons, for a control the action list cannot express.

## Consequences

- Every board that acts on a multi-selection shows the same bar: the same count wording, the same buttons, the same menus and the same clear button. A board adds bulk actions by listing them, without markup or styles of its own.
- The bar now has copy, a menu with keyboard handling, and a layout that depends on the side panel's published values. The panel's layout and the bar share an implicit contract through three custom properties; changing how the panel sizes itself means keeping them correct.
- A control that needs more than buttons, menus of options and a text field (a slider, a color picker) does not fit the action list. It goes into the slot and loses the shared look, or the action list grows a new kind.
- Whiteboard's selection toolbar, anchored above the selection and holding per-type tools, is still separate; this decision does not address it.
- The panel's support for a section a component adds (`addSection`, the board's `panelSections`) lost its only user when Kanban's bulk section moved to the bar.

## References

- [ADR: A shared selection action bar, lifted into the top layer](20261023_selection-bar.md)
- [ADR: The selected element's detail and the author's notes share one side panel](20261128_side-panel-for-selection-detail.md)
