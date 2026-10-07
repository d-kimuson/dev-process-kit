import { html, nothing, svg, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';

import type { TemplateRenderContext } from '../../../core/shell/contracts';
import type { WbGesture } from '../gesture';
import type { Viewport } from '../interactions';
import type { WhiteboardMessages } from '../messages';

import { onCommit } from '../../../lib/dom/events';
import { NEW_ITEM_KINDS, type NewItemKind } from '../commands';
import { centerOf, connectorGeometry, outlinePoint, paintOrder } from '../layout';
import { findItem, itemText, type WbConnector, type WbItem, type WhiteboardState } from '../model';
import { isEditing, type WbMode } from '../ui-mode';
import { colorStyle } from './palette';

export type WbBoardHandlers = {
  readonly canvasPointerDown: (event: PointerEvent) => void;
  readonly canvasPointerMove: (event: PointerEvent) => void;
  readonly canvasPointerUp: (event: PointerEvent) => void;
  readonly canvasPointerCancel: (event: PointerEvent) => void;
  readonly canvasWheel: (event: WheelEvent) => void;
  readonly canvasDblClick: (event: MouseEvent) => void;
  readonly canvasKeyDown: (event: KeyboardEvent) => void;
  readonly itemPointerDown: (itemId: string, event: PointerEvent) => void;
  readonly itemDblClick: (itemId: string, event: MouseEvent) => void;
  readonly resizePointerDown: (itemId: string, event: PointerEvent) => void;
  readonly connectPointerDown: (itemId: string, event: PointerEvent) => void;
  readonly connectorPointerDown: (connectorId: string, event: PointerEvent) => void;
  /** The in-place editor committed a changed text. */
  readonly commitText: (itemId: string, text: string) => void;
  /** The in-place editor lost focus or was cancelled. */
  readonly editEnded: (itemId: string) => void;
  readonly addItem: (kind: NewItemKind) => void;
  readonly zoomStep: (direction: 1 | -1) => void;
  readonly zoomFit: () => void;
  readonly zoomReset: () => void;
};

export type WbBoardProps = {
  readonly m: WhiteboardMessages;
  readonly context: TemplateRenderContext<WhiteboardState>;
  /** The state as drawn: the derived state with the gesture in flight applied. */
  readonly state: WhiteboardState;
  readonly viewport: Viewport;
  readonly gesture: WbGesture | undefined;
  readonly mode: WbMode;
  /** The selected item or connector (`#item=`). */
  readonly selectedId: string | undefined;
  /** The selection toolbar and composer, already positioned in screen space. */
  readonly overlay: TemplateResult | typeof nothing;
  readonly handlers: WbBoardHandlers;
};

const ADD_LABEL = {
  sticky: 'addSticky',
  text: 'addText',
  rect: 'addRect',
  ellipse: 'addEllipse',
  frame: 'addFrame',
} as const satisfies Record<NewItemKind, keyof WhiteboardMessages>;

/** The dot grid scrolls and scales with the canvas, so panning reads as moving the board. */
const surfaceStyle = (viewport: Viewport): string => {
  const dot = 24 * viewport.zoom;
  return `background-size:${dot}px ${dot}px;background-position:${viewport.x}px ${viewport.y}px`;
};

export const renderWhiteboard = (props: WbBoardProps): TemplateResult => {
  const { m, state, viewport, gesture, mode, handlers } = props;
  const classes = ['wb-canvas'];
  if (gesture?.moved === true) classes.push('wb-canvas--gesturing');
  if (gesture?.kind === 'pan' && gesture.moved) classes.push('wb-canvas--panning');
  if (mode.kind === 'connecting' || gesture?.kind === 'connect') classes.push('wb-canvas--connecting');
  const ordered = paintOrder(state);
  return html`<div
    class=${classes.join(' ')}
    data-testid="wb-canvas"
    tabindex="0"
    role="application"
    aria-label=${m.canvasLabel}
    style=${surfaceStyle(viewport)}
    @pointerdown=${handlers.canvasPointerDown}
    @pointermove=${handlers.canvasPointerMove}
    @pointerup=${handlers.canvasPointerUp}
    @pointercancel=${handlers.canvasPointerCancel}
    @wheel=${handlers.canvasWheel}
    @dblclick=${handlers.canvasDblClick}
    @keydown=${handlers.canvasKeyDown}
  >
    <div
      class="wb-world"
      style=${`transform:translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom});--wb-zoom:${viewport.zoom}`}
    >
      ${repeat(
        ordered,
        (item) => item.id,
        (item) => renderItem(props, item),
      )}
      ${renderConnectors(props)} ${renderLabels(props)}
    </div>
    ${state.items.length === 0 ? html`<p class="wb-hint wb-hint--empty">${m.emptyHint}</p>` : nothing}
    ${mode.kind === 'connecting' ? html`<p class="wb-hint" role="status">${m.connectingHint}</p>` : nothing}
    ${gesture?.moved === true ? nothing : props.overlay} ${renderTools(m, handlers)}
    ${renderZoom(m, viewport, handlers)}
  </div>`;
};

/* ------------------------------------------------------------------ items */

const itemClass = (props: WbBoardProps, item: WbItem): string => {
  const classes = ['wb-item', `wb-item--${item.kind}`];
  if (item.kind === 'shape') classes.push(`wb-item--${item.shape}`);
  if (props.selectedId === item.id) classes.push('is-selected');
  if (isEditing(props.mode, item.id)) classes.push('is-editing');
  const gesture = props.gesture;
  if (gesture?.kind === 'move' && gesture.moved && gesture.origins.some((origin) => origin.id === item.id)) {
    classes.push('is-lifted');
  }
  if (gesture?.kind === 'connect' && gesture.targetId === item.id) classes.push('is-target');
  return classes.join(' ');
};

const renderItem = (props: WbBoardProps, item: WbItem): TemplateResult => {
  const { m, context, handlers } = props;
  const box = `left:${item.x}px;top:${item.y}px;width:${item.w}px;height:${item.h}px`;
  const style = item.kind === 'text' ? box : `${box};${colorStyle(item.color)}`;
  const comments = context.commentCount({ type: 'item', id: item.id });
  const selected = props.selectedId === item.id && props.gesture?.moved !== true;
  const press = (event: PointerEvent): void => handlers.itemPointerDown(item.id, event);
  return html`<div
    class=${itemClass(props, item)}
    style=${style}
    data-item-id=${item.id}
    data-kind=${item.kind}
    @pointerdown=${item.kind === 'frame' ? nothing : press}
    @dblclick=${(event: MouseEvent) => handlers.itemDblClick(item.id, event)}
  >
    ${
      item.kind === 'frame'
        ? html`<div class="wb-frame-title" @pointerdown=${press}>${renderText(props, item)}</div>`
        : html`<div class="wb-item-body">${renderText(props, item)}</div>`
    }
    ${comments > 0 ? html`<span class="wb-flag" title=${m.commentCount(comments)}>${comments}</span>` : nothing}
    ${
      selected
        ? html`<span
              class="wb-handle wb-handle--resize"
              role="presentation"
              title=${m.resizeHandle}
              @pointerdown=${(event: PointerEvent) => handlers.resizePointerDown(item.id, event)}
            ></span>
            <span
              class="wb-handle wb-handle--connect"
              role="presentation"
              title=${m.connectHandle}
              @pointerdown=${(event: PointerEvent) => handlers.connectPointerDown(item.id, event)}
            ></span>`
        : nothing
    }
  </div>`;
};

const renderText = (props: WbBoardProps, item: WbItem): TemplateResult => {
  const { m, handlers } = props;
  const text = itemText(item);
  if (!isEditing(props.mode, item.id)) return html`<span class="wb-text">${text}</span>`;
  return html`<dpk-component-inline-edit
    class="wb-editor"
    ?seamless=${true}
    ?multiline=${item.kind !== 'frame'}
    ?wrap=${item.kind === 'frame'}
    .value=${text}
    .placeholder=${m.textPlaceholder}
    .label=${item.kind === 'frame' ? m.renameFrame : m.editText}
    @dpk-commit=${onCommit((value) => handlers.commitText(item.id, value))}
    @focusout=${() => handlers.editEnded(item.id)}
    @keydown=${(event: KeyboardEvent) => {
      if (event.key === 'Escape') handlers.editEnded(item.id);
    }}
  ></dpk-component-inline-edit>`;
};

/* ------------------------------------------------------------- connectors */

const arrowMarker = (): TemplateResult =>
  svg`<marker id="wb-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
    <path d="M0,0 L10,5 L0,10 z"></path>
  </marker>`;

const ends = (state: WhiteboardState, connector: WbConnector): [WbItem, WbItem] | undefined => {
  const from = findItem(state, connector.from);
  const to = findItem(state, connector.to);
  return from === undefined || to === undefined ? undefined : [from, to];
};

const renderConnectors = (props: WbBoardProps): TemplateResult => {
  const { state, handlers, gesture } = props;
  const strokes = state.connectors.map((connector) => {
    const pair = ends(state, connector);
    if (pair === undefined) return nothing;
    const { start, end } = connectorGeometry(...pair);
    const d = `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
    const selected = props.selectedId === connector.id ? ' is-selected' : '';
    return svg`<g data-connector-id=${connector.id}>
      <path class="wb-link-hit" d=${d} @pointerdown=${(event: PointerEvent) =>
        handlers.connectorPointerDown(connector.id, event)}></path>
      <path class=${`wb-link${selected}`} d=${d} marker-end=${connector.style === 'arrow' ? 'url(#wb-arrow)' : nothing}></path>
    </g>`;
  });
  let draft: TemplateResult | typeof nothing = nothing;
  if (gesture?.kind === 'connect' && gesture.moved) {
    const from = findItem(state, gesture.fromId);
    const target = gesture.targetId === undefined ? undefined : findItem(state, gesture.targetId);
    if (from !== undefined) {
      const end = target === undefined ? gesture.current : outlinePoint(target, centerOf(from));
      const start = outlinePoint(from, end);
      draft = svg`<path class="wb-link wb-link--draft" d=${`M ${start.x} ${start.y} L ${end.x} ${end.y}`} marker-end="url(#wb-arrow)"></path>`;
    }
  }
  return html`<svg class="wb-links" width="1" height="1" aria-hidden="true">
    <defs>${arrowMarker()}</defs>
    ${strokes} ${draft}
  </svg>`;
};

/** Labels are HTML, so they wrap, take the theme's type and can be clicked like the stroke. */
const renderLabels = (props: WbBoardProps): TemplateResult[] => {
  const { state, context, handlers } = props;
  return state.connectors.flatMap((connector) => {
    const pair = ends(state, connector);
    const comments = context.commentCount({ type: 'connector', id: connector.id });
    if (pair === undefined || (connector.label === undefined && comments === 0)) return [];
    const { mid } = connectorGeometry(...pair);
    const selected = props.selectedId === connector.id ? ' is-selected' : '';
    return [
      html`<div
        class=${`wb-link-label${selected}`}
        data-connector-label=${connector.id}
        style=${`left:${mid.x}px;top:${mid.y}px`}
        @pointerdown=${(event: PointerEvent) => handlers.connectorPointerDown(connector.id, event)}
      >
        ${connector.label ?? nothing}
        ${comments > 0 ? html`<span class="wb-flag wb-flag--inline">${comments}</span>` : nothing}
      </div>`,
    ];
  });
};

/* ------------------------------------------------------------------- chrome */

const stopPress = (event: Event): void => event.stopPropagation();

const renderTools = (m: WhiteboardMessages, handlers: WbBoardHandlers): TemplateResult =>
  html`<div class="wb-tools" role="toolbar" aria-label=${m.toolsLabel} @pointerdown=${stopPress} @dblclick=${stopPress}>
    ${NEW_ITEM_KINDS.map(
      (kind) =>
        html`<button
          type="button"
          class="wb-tool"
          data-add=${kind}
          title=${m[ADD_LABEL[kind]]}
          aria-label=${m[ADD_LABEL[kind]]}
          @click=${() => handlers.addItem(kind)}
        >
          <span class=${`wb-tool-icon wb-tool-icon--${kind}`} aria-hidden="true"></span>
        </button>`,
    )}
  </div>`;

const renderZoom = (m: WhiteboardMessages, viewport: Viewport, handlers: WbBoardHandlers): TemplateResult =>
  html`<div class="wb-zoom" @pointerdown=${stopPress} @dblclick=${stopPress}>
    <button type="button" aria-label=${m.zoomOut} @click=${() => handlers.zoomStep(-1)}>−</button>
    <button type="button" class="wb-zoom-pct" title=${m.zoomReset} @click=${() => handlers.zoomReset()}>
      ${Math.round(viewport.zoom * 100)}%
    </button>
    <button type="button" aria-label=${m.zoomIn} @click=${() => handlers.zoomStep(1)}>+</button>
    <button type="button" aria-label=${m.zoomFit} title=${m.zoomFit} @click=${() => handlers.zoomFit()}>⛶</button>
  </div>`;
