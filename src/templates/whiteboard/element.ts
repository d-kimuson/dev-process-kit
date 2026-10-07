import { html, nothing, type TemplateResult } from 'lit';

import type { DpkComponentInlineEdit } from '../../components/inline-edit';
import type { Locale } from '../../core/i18n';
import type { ShellRegions, TemplateRenderContext } from '../../core/shell/contracts';

import { composerMessages } from '../../components/comment-composer/messages';
import { presentComposer } from '../../components/comment-composer/present';
import { renderComposer } from '../../components/comment-composer/view';
import { commentBody } from '../../core/comment';
import { TemplateElement } from '../../core/element';
import { PopoverController } from '../../core/popover-controller';
import { targetRef } from '../../core/target';
import { popoverSurface } from '../../core/theme';
import { whiteboardAction } from './actions';
import { newConnectorId, newItem, type NewItemKind } from './commands';
import { whiteboardDefinitionFor } from './definition';
import {
  finishGesture,
  moveBy,
  panTo,
  previewState,
  startConnect,
  startMove,
  startPan,
  startResize,
  updateGesture,
  type WbGesture,
} from './gesture';
import {
  constrainViewport,
  fitRect,
  INITIAL_VIEWPORT,
  panBy,
  sameViewport,
  toCanvas,
  zoomAt,
  type Size,
  type Viewport,
} from './interactions';
import { boardBounds, type Point, type Rect } from './layout';
import { whiteboardMessages, type WhiteboardMessages } from './messages';
import { findConnector, findItem, type WhiteboardState } from './model';
import { renderWhiteboard } from './render/board';
import { renderFrames } from './render/frames';
import { renderSelectionToolbar, type WbSelection } from './render/toolbar';
import { whiteboardStyles } from './styles';
import { isEditing, itemPress, WB_IDLE, type WbMode } from './ui-mode';

const COMPOSER_SIZE = { width: 300, height: 260 };
const stop = (event: Event): void => event.stopPropagation();
/** Canvas units an arrow key moves the selection (Shift: a single unit). */
const NUDGE = 10;

type Context = TemplateRenderContext<WhiteboardState>;

/**
 * `<dpk-template-whiteboard>` — a free-form board, like a shared whiteboard.
 *
 * The element is the seam between the pure parts: it owns the ephemeral UI
 * state (viewport, pointer gesture, mode), measures its canvas, and turns
 * gestures and toolbar intents into actions. Selection (`#item=`) and the frame
 * in focus (`#frame=`) are navigation. Geometry lives in `layout.ts`, pan / zoom
 * in `interactions.ts`, gestures in `gesture.ts`, and drawing in `render/`.
 */
export class DpkTemplateWhiteboard extends TemplateElement<WhiteboardState> {
  static override styles = [TemplateElement.styles, whiteboardStyles, popoverSurface];

  static override properties = {
    mode: { state: true },
    viewport: { state: true },
    gesture: { state: true },
  };

  declare private mode: WbMode;
  declare private viewport: Viewport;
  declare private gesture: WbGesture | undefined;

  /** Typed composer text; read on submit, cleared when the composer closes. */
  #composerDraft = '';
  /** Whether the view has been placed once, and for which frame it was placed last. */
  #placed = false;
  #placedFrame: string | undefined;
  /** The item whose in-place editor has been opened for the current edit. */
  #editorOpened: string | undefined;
  /** The press landed on the item that was already selected: a click then edits it. */
  #pressedSelected = false;
  readonly #popovers = new PopoverController(this);

  constructor() {
    super();
    this.mode = WB_IDLE;
    this.viewport = INITIAL_VIEWPORT;
    this.gesture = undefined;
  }

  protected override definitionFor(locale: Locale) {
    return whiteboardDefinitionFor(locale);
  }

  protected override renderRegions(context: Context): ShellRegions {
    const m = whiteboardMessages(this.locale);
    const hasFrames = context.state.items.some((item) => item.kind === 'frame');
    const state = previewState(context.state, this.gesture);
    return {
      ...(hasFrames
        ? {
            sidebar: renderFrames({
              m,
              state: context.state,
              focused: context.navigation['frame'],
              focusFrame: (frameId) => this.#focusFrame(frameId),
              showBoard: () => this.#showBoard(),
            }),
          }
        : { sidebarHidden: true }),
      main: renderWhiteboard({
        m,
        context,
        state,
        viewport: this.viewport,
        gesture: this.gesture,
        mode: this.mode,
        selectedId: context.navigation['item'],
        overlay: this.#renderOverlay(context, state, m),
        handlers: {
          canvasPointerDown: (event) => this.#onCanvasPointerDown(event),
          canvasPointerMove: (event) => this.#onPointerMove(event),
          canvasPointerUp: (event) => this.#onPointerUp(event),
          canvasPointerCancel: () => (this.gesture = undefined),
          canvasWheel: (event) => this.#onWheel(event),
          canvasDblClick: (event) => this.#onCanvasDblClick(event),
          canvasKeyDown: (event) => this.#onKeyDown(event),
          itemPointerDown: (itemId, event) => this.#onItemPointerDown(itemId, event),
          itemDblClick: (itemId, event) => {
            event.stopPropagation();
            this.mode = { kind: 'editing', itemId };
          },
          resizePointerDown: (itemId, event) =>
            this.#onHandlePointerDown(
              event,
              startResize(context.state, itemId, event.pointerId, this.#canvasPoint(event)),
            ),
          connectPointerDown: (itemId, event) =>
            this.#onHandlePointerDown(event, startConnect(itemId, event.pointerId, this.#canvasPoint(event))),
          connectorPointerDown: (connectorId, event) => this.#onConnectorPointerDown(connectorId, event),
          commitText: (itemId, text) => context.dispatch(whiteboardAction.setText(itemId, text)),
          editEnded: (itemId) => this.#endEdit(itemId),
          addItem: (kind) => this.#addItem(kind, this.#viewCenter()),
          zoomStep: (direction) => this.#zoomBy(direction === 1 ? 1.2 : 1 / 1.2),
          zoomFit: () => this.#showBoard(),
          zoomReset: () => this.#zoomBy(1 / this.viewport.zoom),
        },
      }),
    };
  }

  protected override updated(): void {
    super.updated();
    // Nothing is drawn until the base data has been read.
    if (this.#canvasEl() === null) return;
    this.#placeView();
    this.#openEditor();
    this.#openComposer();
  }

  /* -------------------------------------------------------------- overlay */

  #renderOverlay(context: Context, state: WhiteboardState, m: WhiteboardMessages): TemplateResult | typeof nothing {
    const selectedId = context.navigation['item'];
    const item = findItem(state, selectedId);
    const connector = findConnector(state, selectedId);
    const selection: WbSelection | undefined =
      item !== undefined
        ? { kind: 'item', item }
        : connector !== undefined
          ? { kind: 'connector', connector }
          : undefined;
    if (selection === undefined || this.mode.kind === 'connecting') return nothing;
    if (selection.kind === 'item' && isEditing(this.mode, selection.item.id)) return nothing;
    const ref =
      selection.kind === 'item'
        ? targetRef({ type: 'item', id: selection.item.id })
        : targetRef({ type: 'connector', id: selection.connector.id });
    const commenting = this.mode.kind === 'commenting' && this.mode.target === ref;
    const toolbar = renderSelectionToolbar({
      m,
      state,
      viewport: this.viewport,
      selection,
      commenting,
      comments: context.commentCount(ref),
      handlers: {
        setColor: (itemId, color) => context.dispatch(whiteboardAction.setColor(itemId, color)),
        edit: (itemId) => (this.mode = { kind: 'editing', itemId }),
        connect: (fromId) => (this.mode = { kind: 'connecting', fromId }),
        toggleComment: (target) => {
          this.#composerDraft = '';
          this.mode = commenting ? WB_IDLE : { kind: 'commenting', target };
        },
        deleteItem: (itemId) => {
          context.dispatch(whiteboardAction.deleteItem(itemId));
          this.mode = WB_IDLE;
        },
        setLabel: (connectorId, label) => context.dispatch(whiteboardAction.setConnectorLabel(connectorId, label)),
        deleteConnector: (connectorId) => {
          context.dispatch(whiteboardAction.deleteConnector(connectorId));
          this.mode = WB_IDLE;
        },
      },
    });
    // The composer is the toolbar's sibling, so none of the toolbar's styles leak into it.
    // It floats in the top layer but still sits in the canvas: presses in it must not reach the board.
    return html`${toolbar}
      <div class="wb-composer" @pointerdown=${stop} @dblclick=${stop}>
        ${commenting ? this.#renderComposer(context, ref) : nothing}
      </div>`;
  }

  #renderComposer(context: Context, ref: string): TemplateResult {
    const notes = context.comments.filter((comment) => targetRef(comment.target) === ref).map(commentBody);
    const label = this.definition.commentTargets(context.state, context.navigation).find((t) => t.value === ref)?.label;
    return renderComposer(
      composerMessages(this.locale),
      presentComposer(this.#composerDraft, notes, label === undefined ? {} : { label }),
      (intent) => {
        if (intent.kind === 'input') {
          this.#composerDraft = intent.body;
          this.requestUpdate();
          return;
        }
        if (intent.kind === 'comment') {
          const outcome = context.dispatch({ type: 'comment', target: ref, payload: { body: intent.body } });
          if (!outcome.ok) return;
        }
        this.#composerDraft = '';
        this.mode = WB_IDLE;
      },
    );
  }

  /** The composer floats in the top layer, next to the toolbar's comment button. */
  #openComposer(): void {
    if (this.mode.kind !== 'commenting') return;
    const surface = this.renderRoot.querySelector<HTMLElement>('.wb-composer .comment-pop');
    const button = this.renderRoot.querySelector('.wb-toolbar [data-role="comment"]');
    if (!surface || !button || surface.matches(':popover-open')) return;
    this.#popovers.open(surface, button, COMPOSER_SIZE);
    surface.querySelector('textarea')?.focus();
  }

  /* ------------------------------------------------------------- editing */

  #openEditor(): void {
    if (this.mode.kind !== 'editing') {
      this.#editorOpened = undefined;
      return;
    }
    const { itemId } = this.mode;
    if (this.#editorOpened === itemId) return;
    const editor = this.renderRoot.querySelector<DpkComponentInlineEdit>(
      `.wb-item[data-item-id="${CSS.escape(itemId)}"] dpk-component-inline-edit`,
    );
    if (!editor) return;
    this.#editorOpened = itemId;
    editor.startEditing();
  }

  /** The editor lost focus or was cancelled; its own commit (if any) has already been queued. */
  #endEdit(itemId: string): void {
    queueMicrotask(() => {
      if (isEditing(this.mode, itemId)) this.mode = WB_IDLE;
    });
  }

  /* ------------------------------------------------------------ pointers */

  #canvasEl(): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>('.wb-canvas');
  }

  #canvasSize(): Size {
    const canvas = this.#canvasEl();
    return { width: canvas?.clientWidth ?? 0, height: canvas?.clientHeight ?? 0 };
  }

  /** A pointer position relative to the canvas element. */
  #local(event: { clientX: number; clientY: number }): Point {
    const rect = this.#canvasEl()?.getBoundingClientRect();
    return rect === undefined
      ? { x: event.clientX, y: event.clientY }
      : { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  #canvasPoint(event: { clientX: number; clientY: number }): Point {
    return toCanvas(this.viewport, this.#local(event));
  }

  #viewCenter(): Point {
    const { width, height } = this.#canvasSize();
    return toCanvas(this.viewport, { x: width / 2, y: height / 2 });
  }

  #capture(event: PointerEvent, gesture: WbGesture | undefined): void {
    if (gesture === undefined) return;
    const canvas = this.#canvasEl();
    // Feature-detected: not every DOM implementation offers pointer capture.
    if (canvas !== null && typeof canvas.setPointerCapture === 'function') {
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch {
        /* the pointer is already gone; the gesture still ends on pointerup */
      }
    }
    this.gesture = gesture;
  }

  /** Focus moves to the canvas, so its keys work and an open editor commits by blurring. */
  #focusCanvas(): void {
    this.#canvasEl()?.focus({ preventScroll: true });
  }

  #onCanvasPointerDown(event: PointerEvent): void {
    if (event.button !== 0 || this.gesture !== undefined) return;
    if (this.mode.kind === 'editing' || this.mode.kind === 'commenting') this.mode = WB_IDLE;
    this.#capture(event, startPan(event.pointerId, this.#local(event)));
  }

  #onItemPointerDown(itemId: string, event: PointerEvent): void {
    if (event.button !== 0) return;
    // The board never pans from an item, whatever the item does with the press.
    event.stopPropagation();
    const context = this.context();
    const press = itemPress(this.mode, itemId);
    if (press === 'keep-editing') return;
    event.preventDefault();
    this.#focusCanvas();
    if (press === 'connect' && this.mode.kind === 'connecting') {
      this.#connect(context, this.mode.fromId, itemId);
      this.mode = WB_IDLE;
      return;
    }
    if (this.mode.kind !== 'idle') this.mode = WB_IDLE;
    this.#pressedSelected = context.navigation['item'] === itemId;
    if (!this.#pressedSelected) context.navigate({ item: itemId });
    this.#capture(event, startMove(context.state, itemId, event.pointerId, this.#canvasPoint(event)));
  }

  #onHandlePointerDown(event: PointerEvent, gesture: WbGesture | undefined): void {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    this.#focusCanvas();
    this.#capture(event, gesture);
  }

  #onConnectorPointerDown(connectorId: string, event: PointerEvent): void {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    this.#focusCanvas();
    this.mode = WB_IDLE;
    this.context().navigate({ item: connectorId });
  }

  #onPointerMove(event: PointerEvent): void {
    const gesture = this.gesture;
    if (gesture === undefined || gesture.pointerId !== event.pointerId) return;
    if (gesture.kind === 'pan') {
      const step = panTo(gesture, this.#local(event));
      this.gesture = step.gesture;
      this.#setViewport(panBy(this.viewport, step.dx, step.dy));
      return;
    }
    this.gesture = updateGesture(
      this.context().state,
      gesture,
      event.pointerId,
      this.#canvasPoint(event),
      this.viewport.zoom,
    );
  }

  #onPointerUp(event: PointerEvent): void {
    const gesture = this.gesture;
    if (gesture === undefined || gesture.pointerId !== event.pointerId) return;
    const context = this.context();
    const final =
      gesture.kind === 'pan'
        ? gesture
        : updateGesture(context.state, gesture, event.pointerId, this.#canvasPoint(event), this.viewport.zoom);
    this.gesture = undefined;
    const outcome = finishGesture(context.state, final);
    switch (outcome.kind) {
      case 'none':
        return;
      case 'dispatch':
        context.dispatchBatch(outcome.inputs);
        return;
      case 'connect':
        this.#connect(context, outcome.from, outcome.to);
        return;
      case 'click':
        if (outcome.itemId === undefined) {
          // A click on bare canvas drops the selection and whatever was asked for.
          this.mode = WB_IDLE;
          if (context.navigation['item'] !== undefined) context.navigate({ item: null });
          return;
        }
        // A second click on a selected item edits it in place.
        if (final.kind === 'move' && this.#pressedSelected) this.mode = { kind: 'editing', itemId: outcome.itemId };
        return;
    }
  }

  #onWheel(event: WheelEvent): void {
    event.preventDefault();
    // A trackpad pinch arrives as a ctrl-modified wheel; a plain wheel pans.
    if (event.ctrlKey || event.metaKey) {
      this.#setViewport(zoomAt(this.viewport, this.#local(event), Math.exp(-event.deltaY * 0.01)));
    } else {
      this.#setViewport(panBy(this.viewport, -event.deltaX, -event.deltaY));
    }
  }

  #onCanvasDblClick(event: MouseEvent): void {
    this.#addItem('sticky', this.#canvasPoint(event));
  }

  #onKeyDown(event: KeyboardEvent): void {
    // Typing somewhere (editor, composer, label) owns its keys.
    if (event.target !== event.currentTarget) return;
    const context = this.context();
    const selected = context.navigation['item'];
    const item = findItem(context.state, selected);
    const connector = findConnector(context.state, selected);
    const arrows: Record<string, readonly [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const direction = arrows[event.key];
    if (event.key === 'Escape') {
      if (this.mode.kind !== 'idle') this.mode = WB_IDLE;
      else if (selected !== undefined) context.navigate({ item: null });
    } else if ((event.key === 'Delete' || event.key === 'Backspace') && (item ?? connector) !== undefined) {
      if (item !== undefined) context.dispatch(whiteboardAction.deleteItem(item.id));
      else if (connector !== undefined) context.dispatch(whiteboardAction.deleteConnector(connector.id));
      this.mode = WB_IDLE;
    } else if (event.key === 'Enter' && item !== undefined) {
      this.mode = { kind: 'editing', itemId: item.id };
    } else if (direction !== undefined) {
      const step = event.shiftKey ? 1 : NUDGE;
      if (item !== undefined)
        context.dispatchBatch(moveBy(context.state, item.id, direction[0] * step, direction[1] * step));
      else this.#setViewport(panBy(this.viewport, -direction[0] * 40, -direction[1] * 40));
    } else if (event.key === '+' || event.key === '=') this.#zoomBy(1.2);
    else if (event.key === '-') this.#zoomBy(1 / 1.2);
    else if (event.key === '0') this.#showBoard();
    else return;
    event.preventDefault();
  }

  /* ------------------------------------------------------------ mutations */

  #addItem(kind: NewItemKind, center: Point): void {
    const context = this.context();
    const item = newItem(context.state, whiteboardMessages(this.locale), kind, center);
    if (!context.dispatch(whiteboardAction.addItem(item)).ok) return;
    context.navigate({ item: item.id });
    this.mode = { kind: 'editing', itemId: item.id };
  }

  #connect(context: Context, from: string, to: string): void {
    if (from === to) return;
    const existing = context.state.connectors.find((connector) => connector.from === from && connector.to === to);
    if (existing !== undefined) {
      context.navigate({ item: existing.id });
      return;
    }
    const id = newConnectorId(context.state, from, to);
    if (context.dispatch(whiteboardAction.connect(id, from, to)).ok) context.navigate({ item: id });
  }

  /* ------------------------------------------------------------- viewport */

  #setViewport(next: Viewport): void {
    const clamped = constrainViewport(next, boardBounds(this.context().state.items), this.#canvasSize());
    if (!sameViewport(clamped, this.viewport)) this.viewport = clamped;
  }

  #zoomBy(factor: number): void {
    const { width, height } = this.#canvasSize();
    this.#setViewport(zoomAt(this.viewport, { x: width / 2, y: height / 2 }, factor));
  }

  #fit(rect: Rect | null): boolean {
    const size = this.#canvasSize();
    if (rect === null || size.width <= 0 || size.height <= 0) return false;
    this.#setViewport(fitRect(rect, size));
    return true;
  }

  #focusFrame(frameId: string): void {
    const context = this.context();
    context.navigate({ frame: frameId });
    this.#placedFrame = frameId;
    this.#fit(findItem(context.state, frameId) ?? null);
  }

  #showBoard(): void {
    const context = this.context();
    if (context.navigation['frame'] !== undefined) context.navigate({ frame: null });
    this.#placedFrame = undefined;
    this.#fit(boardBounds(context.state.items));
  }

  /**
   * The view opens on the frame the URL names, or on the whole board, once
   * the canvas has a size; a later `#frame=` (a link, the back button) flies
   * there too.
   */
  #placeView(): void {
    const context = this.context();
    const frame = context.navigation['frame'];
    if (this.#placed && frame === this.#placedFrame) return;
    if (frame === undefined && this.#placed) {
      this.#placedFrame = undefined;
      return;
    }
    const target = frame === undefined ? boardBounds(context.state.items) : (findItem(context.state, frame) ?? null);
    const size = this.#canvasSize();
    if (size.width <= 0 || size.height <= 0) return;
    // An empty board opens with its origin in the middle, where the first item lands.
    if (target === null) this.viewport = { x: size.width / 2, y: size.height / 2, zoom: 1 };
    else this.#fit(target);
    this.#placed = true;
    this.#placedFrame = frame;
  }
}

export const defineWhiteboardElement = (): void => {
  if (!customElements.get('dpk-template-whiteboard'))
    customElements.define('dpk-template-whiteboard', DpkTemplateWhiteboard);
};
