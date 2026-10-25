# dpk-dialog-panel

A framed box with a header and a floating control menu — the shell every board draws its content in, for your own content. It gives you the title and subtitle, header actions, an optional toolbar row, a scrolling body, maximize, a resize grip, and a pan/zoom canvas mode, without any meaning model of its own: it holds no data and records nothing.

```html
<dpk-dialog-panel heading="注文スキーマ" subject="v2 draft" maximizable resizable>
  <button slot="actions" type="button" class="dpk-btn">検索</button>
  <div slot="toolbar">…</div>
  <p>Anything you like — the body scrolls on its own.</p>
</dpk-dialog-panel>
```

Canvas mode turns the body into a pannable, zoomable surface for absolutely-positioned content:

```html
<dpk-dialog-panel heading="依存関係" canvas content-width="1200" content-height="800" initial="fit-width" align="start">
  <svg width="1200" height="800">…</svg>
  <div slot="overlay" class="legend">凡例</div>
</dpk-dialog-panel>
```

## Attributes and properties

| Name             | Kind               | Meaning                                                                                                                       |
| ---------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `heading`        | attribute/property | Header title. A long one elides; the full text is its tooltip.                                                                |
| `subject`        | attribute/property | Smaller subtitle beside the title. Hidden on narrow screens.                                                                  |
| `maximizable`    | boolean attribute  | Shows the maximize button. The panel then covers the viewport, in the top layer.                                              |
| `maximized`      | boolean attribute  | Whether the panel is covering the viewport. Settable; the button and `Escape` change it too.                                  |
| `resizable`      | boolean attribute  | Shows the resize grip under the body (drag it, or focus it and use the arrow keys; double-click restores the natural height). |
| `canvas`         | boolean attribute  | Makes the body a pan/zoom canvas.                                                                                             |
| `content-width`  | number attribute   | The content box's width in world pixels, for content that lays out absolutely. The content is measured when absent.           |
| `content-height` | number attribute   | The content box's height in world pixels, as above.                                                                           |
| `initial`        | attribute/property | Opening view: `fit` (default), `fit-width`, `actual` (100%, top-left) or `none`.                                              |
| `align`          | attribute/property | Where content smaller than the canvas sits: `center` (default) or `start`.                                                    |
| `fit-mode`       | attribute/property | What the percentage button means: `all` (default) fits the whole content, `width` fits its width and keeps the top in view.   |
| `label`          | attribute/property | Accessible name of the canvas. Defaults to the kit's own.                                                                     |
| `flush`          | boolean attribute  | Drops the body's padding and its scrolling — for a table or another surface that manages its own edges.                       |

## Methods

Only the canvas ones do anything without `canvas`; the rest are no-ops there.

| Method           | Effect                                                                                         |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| `view`           | Read-only property: the current `{ x, y, scale }` of the canvas.                               |
| `fit()`          | Fit the whole content into the canvas.                                                         |
| `fitWidth()`     | Fit the content's width, top-aligned — for tall content read by scrolling.                     |
| `fitTo(box)`     | Fit one world-space `{ x, y, width, height }` box, zooming past 100% if it needs to.           |
| `reset(corner?)` | Go to 100%, with the content's top-left corner (or `corner`, in world pixels) at the canvas's. |
| `zoom(factor)`   | Multiply the scale.                                                                            |
| `apply()`        | Re-apply the current view — after the canvas changed size, say.                                |
| `resetView()`    | Back to the opening view (`initial`).                                                          |

## Events

| Event                 | Detail          | Fired when                                                                                                                    |
| --------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `dpk-maximize-change` | `{ maximized }` | The panel was maximized or restored                                                                                           |
| `dpk-canvas-change`   | `{ view }`      | The canvas moved or zoomed (`{ x, y, scale }`)                                                                                |
| `dpk-canvas-dismiss`  | none            | A press on the canvas background, or `Escape` — **cancelable**. Cancel it when it cleared something, and the key stops there. |

All events bubble and are composed.

## Slots

| Slot       | Holds                                                                                          |
| ---------- | ---------------------------------------------------------------------------------------------- |
| `heading`  | Markup that replaces the `heading` / `subject` title                                           |
| `actions`  | The header's right-hand menu: search boxes, toggles, counters                                  |
| `toolbar`  | A full-width row under the header, above the body                                              |
| (default)  | The body. With `canvas`, the world's content — lay it out in world pixels                      |
| `overlay`  | Canvas only: content that stays put over the canvas, not panned or zoomed (a legend, a notice) |
| `controls` | Extra buttons for the floating control menu, after its own                                     |
| `footer`   | A row under the body                                                                           |

The control menu floats at the bottom right and carries, in order, your `controls`, the zoom controls (with `canvas`), maximize (with `maximizable`) and the grip (with `resizable`). Maximized, it centers at the bottom instead, and an exit button appears at the top right.

## Styling

| Custom property                 | Default | Meaning                                                    |
| ------------------------------- | ------- | ---------------------------------------------------------- |
| `--dpk-dialog-panel-height`     | `auto`  | The panel's height; a canvas needs a definite one to fill. |
| `--dpk-dialog-panel-min-height` | `0`     | Its minimum height.                                        |
| `--dpk-dialog-panel-padding`    | `16px`  | The body's padding (ignored with `flush`).                 |
| `--dpk-canvas-height`           | `420px` | The canvas's height when the panel is not otherwise sized. |
| `--dpk-header-height`           | read    | Keeps a maximized panel clear of the page's own header.    |

The rendered box exposes `part` names `panel`, `header`, `body`, `canvas`, `world`, `controls` and `grip`, and the `--dpk-*` tokens re-theme it like any other component.

## What is not recorded

The panel has no draft. The view, the height and `maximized` are reader-local: they are never sent to the agent and never persisted by the component. Its maximized state is a top-layer popover, so no ancestor's `overflow` or stacking context can clip it; `Escape` restores it unless something inside the panel handled the key first.
