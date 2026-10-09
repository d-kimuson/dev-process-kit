import { html, nothing, type TemplateResult } from 'lit';

import type { Locale } from '../../core/i18n';
import type { ShellRegions, TemplateRenderContext } from '../../core/shell/contracts';
import type { ActionInput } from '../../core/types';

import { composerMessages } from '../../components/comment-composer/messages';
import { presentComposer } from '../../components/comment-composer/present';
import { renderComposer } from '../../components/comment-composer/view';
import { commentBody } from '../../core/comment';
import { TemplateElement } from '../../core/element';
import { PopoverController } from '../../core/popover-controller';
import { targetRef } from '../../core/target';
import { popoverSurface } from '../../core/theme';
import { whiteboardAction } from './actions';
import { arrangeActions, arrangeOptions, type ArrangeDirection } from './arrange';
import { caretOffsetAt } from './caret';
import { newConnectorId, newItem, type NewItemKind } from './commands';
import { whiteboardDefinitionFor } from './definition';
import { editedText } from './editor';
import {
  finishGesture,
  marqueeRect,
  marqueeSelection,
  moveBy,
  panTo,
  previewState,
  startConnect,
  startGroundPress,
  startMarquee,
  startMove,
  startPan,
  startResize,
  updateGesture,
  type WbGesture,
} from './gesture';
import {
  constrainViewport,
  fitRect,
  focusRect,
  INITIAL_VIEWPORT,
  keepInside,
  panBy,
  revealRect,
  sameViewport,
  toCanvas,
  zoomAt,
  type Size,
  type Viewport,
} from './interactions';
import { boardBounds, grownToHold, type Point, type Rect } from './layout';
import { whiteboardMessages, type WhiteboardMessages } from './messages';
import {
  findConnector,
  findItem,
  hasColor,
  hasFontSize,
  type WbColor,
  type WbFontSize,
  type WbItem,
  type WhiteboardState,
} from './model';
import { FONT_SCALE, renderWhiteboard } from './render/board';
import { renderFrames } from './render/frames';
import { renderSelectionToolbar, type WbSelection } from './render/toolbar';
import { parseSelection, serializeSelection, toggleSelection } from './selection';
import { whiteboardStyles } from './styles';
import { isEditing, WB_IDLE, type WbMode } from './ui-mode';

const COMPOSER_SIZE = { width: 300, height: 260 };
const stop = (event: Event): void => event.stopPropagation();
/** Canvas units an arrow key moves the selection (Shift: a single unit). */
const NUDGE = 10;
/** Room the selection toolbar keeps from the edges of the view. */
const TOOLBAR_MARGIN = 8;
/** Wide enough a margin around a fitted view that the add toolbar on the left never covers the board. */
const FIT_PADDING = 72;

type Context = TemplateRenderContext<WhiteboardState>;

/** Where the last press landed: a double-click edits an item, and adds a sticky only on open ground. */
type WbPress =
  | { readonly on: 'item'; readonly itemId: string }
  /** Empty canvas, or the empty inside of a frame. */
  | { readonly on: 'ground' }
  /** A handle, a connector, or a pan. */
  | { readonly on: 'other' };

type ClientPoint = { readonly clientX: number; readonly clientY: number };

const isDefined = <T>(value: T | undefined): value is T => value !== undefined;

/**
 * `<dpk-template-whiteboard>` — a free-form board, like a shared whiteboard.
 *
 * The element is the seam between the pure parts: it owns the ephemeral UI
 * state (viewport, pointer gesture, mode), measures its canvas, and turns
 * gestures and toolbar intents into actions. Selection (`#item=a,b`) and the
 * frame in focus (`#frame=`) are navigation. Geometry lives in `layout.ts`,
 * pan / zoom in `interactions.ts`, gestures in `gesture.ts`, stacking order in
 * `arrange.ts`, and drawing in `render/`.
 */
export class DpkTemplateWhiteboard extends TemplateElement<WhiteboardState> {
  static override styles = [TemplateElement.styles, whiteboardStyles, popoverSurface];

  static override properties = {
    mode: { state: true },
    viewport: { state: true },
    gesture: { state: true },
    panReady: { state: true },
    arrangeMenu: { state: true },
  };

  declare private mode: WbMode;
  declare private viewport: Viewport;
  declare private gesture: WbGesture | undefined;
  /** Space is held on the canvas: a drag pans instead of selecting. */
  declare private panReady: boolean;
  /** The toolbar's stacking order menu is open. */
  declare private arrangeMenu: boolean;

  /** Typed composer text; read on submit, cleared when the composer closes. */
  #composerDraft = '';
  /** Whether the view has been placed once, and for which frame it was placed last. */
  #placed = false;
  #placedFrame: string | undefined;
  /** The view is still the one a fit chose: until the reader pans or zooms, a canvas that changes size fits again. */
  #fitted = false;
  /** Watches the canvas, once it is drawn, for a change of size. */
  #resize: ResizeObserver | undefined;
  #observed: HTMLElement | undefined;
  /** The item whose in-place editor has been focused for the current edit. */
  #editorOpened: string | undefined;
  /** Where the caret goes when the editor opens; `undefined` puts it at the end. */
  #caret: number | undefined;
  #lastPress: WbPress = { on: 'other' };
  /** The press landed on the item that was already the whole selection: a click then edits it. */
  #pressedSelected = false;
  /** The press landed on one item of a larger selection: a click (no drag) then selects just it. */
  #pressedInGroup = false;
  #pressPoint: ClientPoint | undefined;
  readonly #popovers = new PopoverController(this);

  constructor() {
    super();
    this.mode = WB_IDLE;
    this.viewport = INITIAL_VIEWPORT;
    this.gesture = undefined;
    this.panReady = false;
    this.arrangeMenu = false;
  }

  protected override definitionFor(locale: Locale) {
    return whiteboardDefinitionFor(locale);
  }

  protected override renderRegions(context: Context): ShellRegions {
    const m = whiteboardMessages(this.locale);
    const hasFrames = context.state.items.some((item) => item.kind === 'frame');
    const state = previewState(context.state, this.gesture);
    const marquee = marqueeRect(this.gesture);
    const selected =
      marquee !== undefined && this.gesture !== undefined
        ? marqueeSelection(context.state, this.gesture)
        : parseSelection(context.navigation['item']);
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
        selectedIds: new Set(selected),
        marquee,
        panReady: this.panReady,
        overlay: this.#renderOverlay(context, state, m),
        handlers: {
          canvasPointerDown: (event) => this.#onCanvasPointerDown(event),
          canvasPointerMove: (event) => this.#onPointerMove(event),
          canvasPointerUp: (event) => this.#onPointerUp(event),
          canvasPointerCancel: () => (this.gesture = undefined),
          canvasWheel: (event) => this.#onWheel(event),
          canvasDblClick: (event) => this.#onCanvasDblClick(event),
          canvasKeyDown: (event) => this.#onKeyDown(event),
          canvasKeyUp: (event) => {
            if (event.key === ' ') this.panReady = false;
            if (event.key === 'Shift') this.#holdRatio(false);
          },
          canvasBlur: () => (this.panReady = false),
          itemPointerDown: (itemId, event) => this.#onItemPointerDown(itemId, event),
          resizePointerDown: (itemId, event) =>
            this.#onHandlePointerDown(
              event,
              startResize(context.state, itemId, event.pointerId, this.#canvasPoint(event)),
            ),
          connectPointerDown: (itemId, event) =>
            this.#onHandlePointerDown(event, startConnect(itemId, event.pointerId, this.#canvasPoint(event))),
          connectorPointerDown: (connectorId, event) => this.#onConnectorPointerDown(connectorId, event),
          editBlur: (itemId, value) => this.#finishEdit(itemId, value),
          editKeyDown: (itemId, event) => this.#onEditKeyDown(itemId, event),
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
    const canvas = this.#canvasEl();
    if (canvas === null) return;
    this.#observeCanvas(canvas);
    this.#placeView();
    this.#fitToolbar();
    this.#openEditor();
    this.#openComposer();
  }

  /**
   * Keeps the selection toolbar on screen when its selection sits at an edge
   * of the view. The nudge lives in custom properties, so a re-render that
   * moves the toolbar drops it and the next measure starts from scratch.
   */
  #fitToolbar(): void {
    const canvas = this.#canvasEl();
    const bar = this.renderRoot.querySelector<HTMLElement>('.wb-toolbar');
    if (canvas === null || bar === null) return;
    const nudge = (axis: 'x' | 'y'): number => Number.parseFloat(bar.style.getPropertyValue(`--wb-nudge-${axis}`)) || 0;
    const view = canvas.getBoundingClientRect();
    const first = bar.getBoundingClientRect();
    // Level with the add-toolbar on the left, the bar keeps to its right instead of covering it.
    const tools = this.renderRoot.querySelector('.wb-tools')?.getBoundingClientRect();
    const top = first.top - nudge('y');
    const beside = tools !== undefined && top < tools.bottom && top + first.height > tools.top;
    const floor = beside ? tools.right - view.left : 0;
    bar.style.setProperty('--wb-toolbar-floor', `${floor}px`);
    // Measured again: the floor narrows how wide the bar may grow.
    const box = bar.getBoundingClientRect();
    const x = keepInside(box.left - nudge('x') - view.left, box.width, view.width, TOOLBAR_MARGIN, floor);
    const y = keepInside(box.top - nudge('y') - view.top, box.height, view.height, TOOLBAR_MARGIN);
    bar.style.setProperty('--wb-nudge-x', `${x}px`);
    bar.style.setProperty('--wb-nudge-y', `${y}px`);
  }

  /* ------------------------------------------------------------ selection */

  #selected(): readonly string[] {
    return parseSelection(this.context().navigation['item']);
  }

  #select(ids: readonly string[]): void {
    const context = this.context();
    const next = serializeSelection(ids);
    if (context.navigation['item'] === next) return;
    this.arrangeMenu = false;
    context.navigate({ item: next ?? null });
  }

  #selectedItems(state: WhiteboardState): readonly WbItem[] {
    return this.#selected()
      .map((id) => findItem(state, id))
      .filter(isDefined);
  }

  /* -------------------------------------------------------------- overlay */

  #renderOverlay(context: Context, state: WhiteboardState, m: WhiteboardMessages): TemplateResult | typeof nothing {
    if (this.mode.kind === 'editing') return nothing;
    const ids = this.#selected();
    const items = this.#selectedItems(state);
    const connector = ids.length === 1 ? findConnector(state, ids[0]) : undefined;
    const selection: WbSelection | undefined =
      connector !== undefined
        ? { kind: 'connector', connector }
        : items.length > 0
          ? { kind: 'items', items }
          : undefined;
    if (selection === undefined) return nothing;
    // Comments attach to one thing, so only a single selection offers them.
    const [only] = items;
    const ref =
      connector !== undefined
        ? targetRef({ type: 'connector', id: connector.id })
        : items.length === 1 && only !== undefined
          ? targetRef({ type: 'item', id: only.id })
          : undefined;
    const commenting = ref !== undefined && this.mode.kind === 'commenting' && this.mode.target === ref;
    const toolbar = renderSelectionToolbar({
      m,
      state,
      viewport: this.viewport,
      selection,
      arrange: arrangeOptions(state, ids),
      arrangeMenuOpen: this.arrangeMenu,
      commenting,
      comments: ref === undefined ? 0 : context.commentCount(ref),
      handlers: {
        setColor: (color) => this.#setColor(color),
        setFontSize: (fontSize) => this.#setFontSize(fontSize),
        arrange: (direction) => {
          this.arrangeMenu = false;
          this.#arrange(direction);
        },
        toggleArrangeMenu: () => (this.arrangeMenu = !this.arrangeMenu),
        toggleComment: (target) => {
          this.#composerDraft = '';
          this.mode = commenting ? WB_IDLE : { kind: 'commenting', target };
        },
        deleteSelection: () => this.#deleteSelection(),
        setLabel: (connectorId, label) => context.dispatch(whiteboardAction.setConnectorLabel(connectorId, label)),
        setRoute: (connectorId, route) => {
          if (findConnector(context.state, connectorId)?.route !== route)
            context.dispatch(whiteboardAction.setConnectorRoute(connectorId, route));
        },
      },
    });
    // The composer is the toolbar's sibling, so none of the toolbar's styles leak into it.
    // It floats in the top layer but still sits in the canvas: presses in it must not reach the board.
    return html`${toolbar}
      <div class="wb-composer" @pointerdown=${stop} @dblclick=${stop}>
        ${commenting && ref !== undefined ? this.#renderComposer(context, ref) : nothing}
      </div>`;
  }

  #renderComposer(context: Context, ref: string): TemplateResult {
    const notes = context.comments.filter((comment) => targetRef(comment.target) === ref).map(commentBody);
    const label = this.definition.commentTargets(context.state, context.navigation).find((t) => t.value === ref)?.label;
    return renderComposer(
      composerMessages(this.locale),
      presentComposer(this.#composerDraft, notes, { key: ref, ...(label === undefined ? {} : { label }) }),
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

  #editorField(itemId: string): HTMLInputElement | HTMLTextAreaElement | null {
    return this.renderRoot.querySelector<HTMLInputElement | HTMLTextAreaElement>(
      `.wb-item[data-item-id="${CSS.escape(itemId)}"] .wb-editor`,
    );
  }

  /**
   * Starts typing into an item. `at` is the click that asked for it: the caret
   * lands under it (measured on the shown text, which the field lays out the
   * same way), else at the end. The text is never selected as a whole.
   */
  #enterEdit(itemId: string, at?: ClientPoint): void {
    if (isEditing(this.mode, itemId)) return;
    this.#commitEditor();
    const context = this.context();
    if (findItem(context.state, itemId) === undefined) return;
    const text =
      at === undefined
        ? null
        : this.renderRoot.querySelector(`.wb-item[data-item-id="${CSS.escape(itemId)}"] .wb-text`);
    this.#caret = text === null || at === undefined ? undefined : caretOffsetAt(text, at.clientX, at.clientY);
    const ids = this.#selected();
    if (ids.length !== 1 || ids[0] !== itemId) this.#select([itemId]);
    this.mode = { kind: 'editing', itemId };
  }

  #openEditor(): void {
    if (this.mode.kind !== 'editing') {
      this.#editorOpened = undefined;
      return;
    }
    const { itemId } = this.mode;
    if (this.#editorOpened === itemId) return;
    const field = this.#editorField(itemId);
    if (field === null) return;
    this.#editorOpened = itemId;
    field.focus({ preventScroll: true });
    const at = Math.min(this.#caret ?? field.value.length, field.value.length);
    field.setSelectionRange(at, at);
    this.#caret = undefined;
  }

  /**
   * Ends the edit of `itemId` with what its field holds, at once: the field
   * may be gone by the next microtask (any press re-renders the board), so
   * nothing here waits.
   */
  #finishEdit(itemId: string, raw: string): void {
    if (!isEditing(this.mode, itemId)) return;
    this.mode = WB_IDLE;
    this.#editorOpened = undefined;
    const context = this.context();
    const item = findItem(context.state, itemId);
    const text = item === undefined ? undefined : editedText(item, raw);
    if (item === undefined || text === undefined) return;
    this.#dispatchAll([whiteboardAction.setText(itemId, text), ...this.#fitText(item)]);
  }

  /**
   * Grows an item that its text no longer fits (after an edit, or at
   * `fontSize` before it is drawn at that size), so no text is cut off.
   */
  #fitText(item: WbItem, fontSize?: WbFontSize): readonly ActionInput[] {
    if (!hasFontSize(item)) return [];
    const size = grownToHold(item, this.#textOverflow(item.id, fontSize));
    return size === undefined ? [] : [whiteboardAction.resize(item.id, size.w, size.h)];
  }

  /**
   * How much taller an item's text (or its open editor) is than the room its
   * box gives it, in canvas units: layout sizes are not scaled by the zoom.
   * With `fontSize`, the item is measured briefly at that size.
   */
  #textOverflow(itemId: string, fontSize?: WbFontSize): number {
    const el = this.renderRoot.querySelector<HTMLElement>(`.wb-item[data-item-id="${CSS.escape(itemId)}"]`);
    const body = el?.querySelector<HTMLElement>('.wb-item-body');
    if (el === null || el === undefined || body === null || body === undefined) return 0;
    const style = el.getAttribute('style') ?? '';
    if (fontSize !== undefined) el.style.setProperty('--wb-font-scale', String(FONT_SCALE[fontSize]));
    const field = body.querySelector<HTMLElement>('.wb-editor');
    const content =
      field === null ? (body.querySelector<HTMLElement>('.wb-text')?.offsetHeight ?? 0) : field.scrollHeight;
    const overflow = content - body.clientHeight;
    el.setAttribute('style', style);
    return overflow;
  }

  /** Commits an open editor before anything else changes the board. */
  #commitEditor(): void {
    if (this.mode.kind !== 'editing') return;
    const { itemId } = this.mode;
    const field = this.#editorField(itemId);
    if (field === null) {
      this.mode = WB_IDLE;
      return;
    }
    this.#finishEdit(itemId, field.value);
  }

  #onEditKeyDown(itemId: string, event: KeyboardEvent): void {
    if (event.isComposing) return;
    if (event.key === 'Escape') {
      // Leaves without committing: the blur that follows finds the edit already over.
      event.preventDefault();
      this.mode = WB_IDLE;
      this.#focusCanvas();
      return;
    }
    const oneLine = findItem(this.context().state, itemId)?.kind === 'frame';
    if (event.key === 'Enter' && (oneLine || event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      // Blurring commits.
      this.#focusCanvas();
    }
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
  #local(event: ClientPoint): Point {
    const rect = this.#canvasEl()?.getBoundingClientRect();
    return rect === undefined
      ? { x: event.clientX, y: event.clientY }
      : { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  #canvasPoint(event: ClientPoint): Point {
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

  /** Focus moves to the canvas, so its keys work. */
  #focusCanvas(): void {
    this.#canvasEl()?.focus({ preventScroll: true });
  }

  /**
   * Empty canvas (a frame's empty inside included): a drag draws a selection
   * area, Shift adds to the selection; inside a selected frame it moves the
   * selection instead. The board pans with the middle button, with Space
   * held, or under a finger.
   */
  #onCanvasPointerDown(event: PointerEvent): void {
    if (this.gesture !== undefined) return;
    const pan = event.button === 1 || (event.button === 0 && (this.panReady || event.pointerType === 'touch'));
    if (!pan && event.button !== 0) return;
    this.#commitEditor();
    if (this.mode.kind === 'commenting') this.mode = WB_IDLE;
    this.arrangeMenu = false;
    this.#focusCanvas();
    if (pan) {
      // The middle button would otherwise start the browser's autoscroll.
      event.preventDefault();
      this.#lastPress = { on: 'other' };
      this.#capture(event, startPan(event.pointerId, this.#local(event)));
      return;
    }
    this.#lastPress = { on: 'ground' };
    const context = this.context();
    const ids = this.#selected().filter((id) => findItem(context.state, id) !== undefined);
    const gesture = event.shiftKey
      ? startMarquee(event.pointerId, this.#canvasPoint(event), ids)
      : startGroundPress(context.state, ids, event.pointerId, this.#canvasPoint(event), []);
    // A click (no drag) inside a selected frame narrows a larger selection to the frame; it never edits.
    this.#pressedSelected = false;
    this.#pressedInGroup = gesture.kind === 'move' && ids.length > 1;
    this.#capture(event, gesture);
  }

  #onItemPointerDown(itemId: string, event: PointerEvent): void {
    // Anything but a plain press (middle button, Space held) pans, from an item too.
    if (event.button !== 0 || this.panReady || this.gesture !== undefined) return;
    event.stopPropagation();
    this.#lastPress = { on: 'item', itemId };
    if (isEditing(this.mode, itemId)) {
      // Typing goes on: a press in the field moves the caret, one on the item's edge keeps the focus.
      const inField = event.target instanceof Element && event.target.closest('.wb-editor') !== null;
      if (!inField) event.preventDefault();
      return;
    }
    this.#commitEditor();
    event.preventDefault();
    this.#focusCanvas();
    this.arrangeMenu = false;
    if (this.mode.kind !== 'idle') this.mode = WB_IDLE;
    const context = this.context();
    const ids = this.#selected();
    if (event.shiftKey) {
      this.#pressedSelected = false;
      this.#pressedInGroup = false;
      this.#select(toggleSelection(ids, itemId));
      return;
    }
    this.#pressedSelected = ids.length === 1 && ids[0] === itemId;
    this.#pressedInGroup = ids.length > 1 && ids.includes(itemId);
    this.#pressPoint = { clientX: event.clientX, clientY: event.clientY };
    if (!ids.includes(itemId)) this.#select([itemId]);
    const carry = this.#pressedInGroup ? ids : [itemId];
    this.#capture(event, startMove(context.state, itemId, event.pointerId, this.#canvasPoint(event), carry));
  }

  #onHandlePointerDown(event: PointerEvent, gesture: WbGesture | undefined): void {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    this.#lastPress = { on: 'other' };
    this.#commitEditor();
    this.#focusCanvas();
    this.#capture(event, gesture);
  }

  #onConnectorPointerDown(connectorId: string, event: PointerEvent): void {
    if (event.button !== 0 || this.panReady) return;
    event.stopPropagation();
    event.preventDefault();
    this.#lastPress = { on: 'other' };
    this.#commitEditor();
    this.#focusCanvas();
    this.mode = WB_IDLE;
    this.#select([connectorId]);
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
      event.shiftKey,
    );
  }

  /** Shift pressed or let go mid-resize reshapes the item at once, without waiting for the pointer to move. */
  #holdRatio(keepRatio: boolean): void {
    const gesture = this.gesture;
    if (gesture?.kind !== 'resize' || gesture.keepRatio === keepRatio) return;
    this.gesture = updateGesture(
      this.context().state,
      gesture,
      gesture.pointerId,
      gesture.current,
      this.viewport.zoom,
      keepRatio,
    );
  }

  #onPointerUp(event: PointerEvent): void {
    const gesture = this.gesture;
    if (gesture === undefined || gesture.pointerId !== event.pointerId) return;
    const context = this.context();
    const final =
      gesture.kind === 'pan'
        ? gesture
        : updateGesture(
            context.state,
            gesture,
            event.pointerId,
            this.#canvasPoint(event),
            this.viewport.zoom,
            event.shiftKey,
          );
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
      case 'select':
        this.#select(outcome.ids);
        return;
      case 'click':
        if (final.kind === 'pan' || final.kind === 'marquee') {
          // A click on open ground drops the selection; one inside a frame selects the frame.
          this.mode = WB_IDLE;
          const base = final.kind === 'marquee' ? final.base : [];
          if (outcome.itemId !== undefined)
            this.#select(base.length > 0 ? toggleSelection(base, outcome.itemId) : [outcome.itemId]);
          else if (base.length === 0) this.#select([]);
          return;
        }
        if (final.kind !== 'move' || outcome.itemId === undefined) return;
        // A second click on the selected item edits it in place, the caret where it was clicked.
        if (this.#pressedSelected) this.#enterEdit(outcome.itemId, this.#pressPoint);
        else if (this.#pressedInGroup) this.#select([outcome.itemId]);
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

  /**
   * Pointer capture sends the double-click to the canvas whatever was under
   * it, so the press it ended decides: an item is edited, open ground (a
   * frame's inside too) gets a new sticky.
   */
  #onCanvasDblClick(event: MouseEvent): void {
    const press = this.#lastPress;
    if (press.on === 'item') this.#enterEdit(press.itemId, event);
    else if (press.on === 'ground') this.#addItem('sticky', this.#canvasPoint(event));
  }

  #onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Shift') this.#holdRatio(true);
    // Typing somewhere (editor, composer, label) owns its keys.
    if (event.target !== event.currentTarget) return;
    const context = this.context();
    const ids = this.#selected();
    const items = this.#selectedItems(context.state);
    const [only] = items;
    const mod = event.metaKey || event.ctrlKey;
    const arrows: Record<string, readonly [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const direction = arrows[event.key];
    if (event.key === ' ') {
      this.panReady = true;
    } else if (event.key === 'Escape') {
      if (this.mode.kind !== 'idle') this.mode = WB_IDLE;
      else if (ids.length > 0) this.#select([]);
    } else if ((event.key === 'Delete' || event.key === 'Backspace') && ids.length > 0) {
      this.#deleteSelection();
    } else if (event.key === 'Enter' && items.length === 1 && only !== undefined) {
      this.#enterEdit(only.id);
    } else if (mod && event.key.toLowerCase() === 'a') {
      this.#select(context.state.items.map((item) => item.id));
    } else if ((event.key === ']' || event.key === '[') && ids.length > 0) {
      const up = event.key === ']';
      this.#arrange(mod ? (up ? 'front' : 'back') : up ? 'forward' : 'backward');
    } else if (direction !== undefined) {
      const step = event.shiftKey ? 1 : NUDGE;
      if (items.length > 0)
        context.dispatchBatch(
          moveBy(
            context.state,
            items.map((item) => item.id),
            direction[0] * step,
            direction[1] * step,
          ),
        );
      else this.#setViewport(panBy(this.viewport, -direction[0] * 40, -direction[1] * 40));
    } else if (event.key === '+' || event.key === '=') this.#zoomBy(1.2);
    else if (event.key === '-') this.#zoomBy(1 / 1.2);
    else if (event.key === '0') this.#showBoard();
    else return;
    event.preventDefault();
  }

  /* ------------------------------------------------------------ mutations */

  #dispatchAll(inputs: readonly ActionInput[]): void {
    if (inputs.length > 0) this.context().dispatchBatch(inputs);
  }

  #setColor(color: WbColor): void {
    const items = this.#selectedItems(this.context().state);
    this.#dispatchAll(
      items
        .filter(hasColor)
        .flatMap((item) => (item.color === color ? [] : [whiteboardAction.setColor(item.id, color)])),
    );
  }

  #setFontSize(fontSize: WbFontSize): void {
    const items = this.#selectedItems(this.context().state);
    this.#dispatchAll(
      items
        .filter(hasFontSize)
        .flatMap((item) =>
          item.fontSize === fontSize
            ? []
            : [whiteboardAction.setFontSize(item.id, fontSize), ...this.#fitText(item, fontSize)],
        ),
    );
  }

  #arrange(direction: ArrangeDirection): void {
    this.#dispatchAll(arrangeActions(this.context().state, this.#selected(), direction));
  }

  /** Connectors first: deleting an item takes its connectors along, which would leave theirs stale. */
  #deleteSelection(): void {
    const { state } = this.context();
    const ids = this.#selected();
    this.#dispatchAll([
      ...ids.filter((id) => findConnector(state, id) !== undefined).map((id) => whiteboardAction.deleteConnector(id)),
      ...ids.filter((id) => findItem(state, id) !== undefined).map((id) => whiteboardAction.deleteItem(id)),
    ]);
    this.mode = WB_IDLE;
  }

  #addItem(kind: NewItemKind, center: Point): void {
    this.#commitEditor();
    const context = this.context();
    const item = newItem(context.state, whiteboardMessages(this.locale), kind, center);
    if (!context.dispatch(whiteboardAction.addItem(item)).ok) return;
    // The free spot may lie off screen; the reader should see what they just added.
    const size = this.#canvasSize();
    if (size.width > 0 && size.height > 0) this.#setViewport(revealRect(this.viewport, item, size));
    this.#select([item.id]);
    this.#caret = undefined;
    this.mode = { kind: 'editing', itemId: item.id };
  }

  #connect(context: Context, from: string, to: string): void {
    if (from === to) return;
    const existing = context.state.connectors.find((connector) => connector.from === from && connector.to === to);
    if (existing !== undefined) {
      this.#select([existing.id]);
      return;
    }
    const id = newConnectorId(context.state, from, to);
    if (context.dispatch(whiteboardAction.connect(id, from, to)).ok) this.#select([id]);
  }

  /* ------------------------------------------------------------- viewport */

  #setViewport(next: Viewport): void {
    this.#fitted = false;
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
    this.#setViewport(fitRect(rect, size, FIT_PADDING));
    this.#fitted = true;
    return true;
  }

  /** The board, or the part of it a fit can show (see `focusRect`). */
  #boardFocus(): Rect | null {
    return focusRect(this.context().state.items, this.#canvasSize(), FIT_PADDING);
  }

  #observeCanvas(canvas: HTMLElement): void {
    if (this.#observed === canvas || typeof ResizeObserver === 'undefined') return;
    this.#resize ??= new ResizeObserver(() => this.#refit());
    if (this.#observed) this.#resize.unobserve(this.#observed);
    this.#resize.observe(canvas);
    this.#observed = canvas;
  }

  /** The canvas changed size: place the view if it never was, and fit it again if the reader has not moved it. */
  #refit(): void {
    if (!this.#placed) {
      this.#placeView();
      return;
    }
    if (!this.#fitted) return;
    const frame = this.#placedFrame;
    this.#fit(frame === undefined ? this.#boardFocus() : (findItem(this.context().state, frame) ?? null));
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#resize?.disconnect();
    this.#resize = undefined;
    this.#observed = undefined;
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
    this.#fit(this.#boardFocus());
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
    const target = frame === undefined ? this.#boardFocus() : (findItem(context.state, frame) ?? null);
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
