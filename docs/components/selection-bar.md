# dpk-selection-bar

The floating toolbar a multi-selection shows: how many are selected, what can be done with them, and a button to clear the selection. Every board that acts on several elements at once uses it, so the reader finds bulk actions in the same place with the same look on every board.

```js
bar.count = 3;
bar.actions = [
  {
    name: 'move',
    label: 'Move',
    options: [
      { value: 'todo', label: 'ToDo' },
      { value: 'done', label: 'Done' },
    ],
  },
  { name: 'delete', label: 'Delete', tone: 'accent' },
];
bar.addEventListener('dpk-selection-action', (event) => apply(event.detail));
bar.addEventListener('dpk-selection-clear', () => clearSelection());
```

```html
<dpk-selection-bar></dpk-selection-bar>
```

Render it while the host has a selection to act on, the same as any other piece of markup: mounting it claims the bar, unmounting it releases it.

## Attributes and properties

| Name      | Kind                          | Meaning                                                                                                                                          |
| --------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `count`   | attribute / property (number) | How many are selected. The bar shows it in the page's language: `3 selected` / `3 件選択`.                                                       |
| `label`   | attribute / property (string) | Replaces the count text, for a selection the count alone does not name (`2 links selected`). It is also the toolbar's accessible name.           |
| `actions` | property                      | The buttons, in order (see below).                                                                                                               |
| `open`    | property (read-only)          | Whether this bar is the one currently shown, versus pre-empted by a more recently mounted one. Driven by connecting/disconnecting, not settable. |

The clear button (`×`) is always last; the host does not supply it. Children in the default slot follow the action buttons, for a control the actions cannot express.

### An action

| Field      | Meaning                                                                                               |
| ---------- | ----------------------------------------------------------------------------------------------------- |
| `name`     | Sent back in the event's `action`.                                                                    |
| `label`    | The button text.                                                                                      |
| `tone`     | `'accent'` for the primary action.                                                                    |
| `disabled` | The button cannot be pressed.                                                                         |
| `options`  | The button opens a menu of these choices instead of acting at once.                                   |
| `entry`    | `{ placeholder }`: a text field at the end of the menu; `Enter` sends its trimmed text as the choice. |

An option has a `value`, a `label`, and optionally `disabled`, a `hint` shown beside the label (`2/3`), and `checked`. An option with `checked` (`true`, `false` or `'mixed'` when only some of the selection has it) is an on/off choice: the menu stays open after it, so several can be switched in a row, and the host updates `checked` from its new state. A menu of plain options closes after a choice.

## Events

| Event                  | Detail                                                                                                                                                                                                                                                                 |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dpk-selection-action` | `{ action, value, entered, rect }`: the action's `name`; the chosen option's `value` or the typed text (`null` for a button without a menu); `entered` is `true` for typed text; `rect` is the pressed control's screen rectangle, for a popup the host opens from it. |
| `dpk-selection-clear`  | None. The clear button or `Escape` was pressed; the host clears its selection, which stops rendering the bar.                                                                                                                                                          |

Both bubble and are composed.

## Only one bar at a time

At most one selection bar is shown on a page at once, across every board or component that uses one. Mounting a `<dpk-selection-bar>` claims it; if another one is currently shown, that one is hidden — not cleared. The pre-empted host's own selection is untouched; only its bar steps aside. The most recently mounted bar wins, which in practice is whichever board or component most recently gained a selection.

## Placement and clipping

The bar is lifted into the browser's top layer (the Popover API, `popover="manual"`), so no ancestor's `overflow: hidden`, transform or stacking context can clip it — a selection toolbar over a pan/zoom canvas, say. It is placed bottom-center of the page's main column: clear of the hand-off dock, beside the side panel when the panel is open, and above the panel's bottom sheet on a narrow screen. It hides while the panel covers the main column (maximized, or a full-height sheet). Below 640px the count and the clear button share the first row and the actions wrap onto the rows below. The placement is the component's own and is not configurable from outside it.

## Interaction

| Action                               | Result                                                                                   |
| ------------------------------------ | ---------------------------------------------------------------------------------------- |
| A button without a menu              | Fires `dpk-selection-action` with `value: null`                                          |
| A button with a menu                 | Opens the menu above the bar, focus on its first item; pressing it again closes the menu |
| `↑` / `↓` / `Home` / `End` in a menu | Moves between the menu's items                                                           |
| A click outside the bar              | Closes the menu                                                                          |
| `Escape` with focus inside the bar   | Closes the menu if one is open; otherwise fires `dpk-selection-clear`                    |
