# dpk-selection-bar

The floating toolbar a multi-selection shows: how many are selected and what can be done with them. A content-free shell — core supplies only the chrome (the surface, its placement, `Escape`); the host supplies everything inside it (a count, buttons, a select, its own close button), exactly as it already rendered them.

```html
<dpk-selection-bar label="3 selected">
  <span class="my-count">3 selected</span>
  <button class="dpk-btn dpk-btn--accent" type="button">Group</button>
  <button class="dpk-icon-btn" type="button" aria-label="Clear selection">✕</button>
</dpk-selection-bar>
```

Render it conditionally, the same as any other piece of markup, while the host's own selection is non-empty — mounting it claims the bar, unmounting it (the host's own empty-selection branch) releases it.

## Attributes and properties

| Name    | Kind                 | Meaning                                                                                                                                          |
| ------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `label` | attribute            | The toolbar's accessible name (`aria-label`) — the same count or status text the host shows visually. Not rendered by core itself.               |
| `open`  | property (read-only) | Whether this bar is the one currently shown, versus pre-empted by a more recently mounted one. Driven by connecting/disconnecting, not settable. |

## Only one bar at a time

At most one selection bar is shown on a page at once, across every board or component that uses one. Mounting a `<dpk-selection-bar>` claims it; if another one is currently shown, that one is hidden — not cleared. The pre-empted host's own selection is untouched; only its bar steps aside. The most recently mounted bar wins, which in practice is whichever board or component most recently gained a selection.

## Placement and clipping

The bar is lifted into the browser's top layer (the Popover API, `popover="manual"`, shown/hidden imperatively), so no ancestor's `overflow: hidden`, transform or stacking context can clip it — a selection toolbar over a pan/zoom canvas, say. It is placed bottom-center, clear of the page's hand-off dock; this placement is the component's own and is not configurable from outside it.

## Interaction

| Action                             | Result                                                                                                                                                   |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Escape` with focus inside the bar | Fires `dpk-selection-clear` (bubbles, composed); the host decides what that means — normally clearing its selection, which then stops rendering the bar. |

There is no core-rendered close button: a close affordance, if the host wants one, is just another slotted button calling back into the host directly.
