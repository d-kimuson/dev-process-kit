import { html, nothing, type TemplateResult } from 'lit';

import type { ShellRegions, TemplateRenderContext } from '../../core/shell/contracts';

import { ArtifactElement } from '../../core/element';
import { PopoverController } from '../../core/popover-controller';
import { createEntityId } from '../../core/target';
import { popoverSurface } from '../../core/theme';
import { pointAnchor } from '../../lib/dom/popover';
import { eventStormingAction } from './actions';
import { defineEsNoteCard, NOTE_TYPE_LABELS, notePaletteStyle } from './components/note-card';
import { eventStormingDefinition } from './definition';
import { moveGesture } from './gesture';
import {
  constrainViewport,
  fitViewport,
  hitRect,
  panBy,
  rectsInBand,
  sliceMovePlan,
  sliceMoveSteps,
  zoomAt,
  type IdRect,
  type Rect,
  type Size,
  type Viewport,
} from './interactions';
import { attachAnchor, buildSlices, connectionEndpoints, sliceVoice, type EsSlice } from './layout';
import { allNoteIds, findContext, findNote, type EventStormingState, type NoteType } from './model';
import { renderEsBoard } from './render/board';
import { eventStormingStyles } from './styles';
import {
  ES_IDLE,
  reduceNoteIntent,
  type EsGesture,
  type EsNaming,
  type EsUiMode,
  type NoteIntent,
  type Point,
} from './ui-mode';

const CONTEXT_POP_SIZE = { width: 260, height: 150 };
const APPEND_MENU_SIZE = { width: 236, height: 210 };
/** Slack around the wall that the reader may still pan into. */
const VIEW_BUFFER = 64;

/** Note types the connect port offers as the next step of a slice. */
const APPEND_TYPES: readonly NoteType[] = ['event', 'command', 'aggregate', 'actor', 'policy', 'readmodel', 'external'];

/** Width the wall assumes before the first measurement (and under jsdom). */
const FALLBACK_WIDTH = 1200;
/** Pointer travel below this is a click, not a drag. */
const DRAG_THRESHOLD = 5;
/** How far outside a slice frame the hover affordances (port, chips) live. */
const HOVER_PAD = { x: 20, top: 46, bottom: 40 };

/**
 * `<artifact-event-storming>` — the big picture wall.
 *
 * The element is the seam between the pure parts: it owns the ephemeral UI
 * state (mode, viewport, pointer gesture, hover, selection), measures its own
 * size to decide where the slice timeline wraps, and turns intents into
 * actions. Placement lives in `layout.ts`, gesture math in `interactions.ts`,
 * rendering in `render/board.ts`, the sticky note in `components/note-card.ts`.
 */
export class EventStormingElement extends ArtifactElement<EventStormingState> {
  static override styles = [ArtifactElement.styles, eventStormingStyles, popoverSurface];

  readonly definition = eventStormingDefinition;

  static override properties = {
    mode: { state: true },
    boardWidth: { state: true },
    viewport: { state: true },
    gesture: { state: true },
    hoverSliceId: { state: true },
    selectedSliceIds: { state: true },
    selectedLinkIds: { state: true },
    naming: { state: true },
  };

  declare private mode: EsUiMode;
  declare private boardWidth: number;
  declare private viewport: Viewport;
  declare private gesture: EsGesture | undefined;
  declare private hoverSliceId: string | undefined;
  declare private selectedSliceIds: readonly string[];
  declare private selectedLinkIds: readonly string[];
  declare private naming: EsNaming | undefined;

  #resize: ResizeObserver | undefined;
  readonly #popovers = new PopoverController(this);

  constructor() {
    super();
    this.mode = ES_IDLE;
    this.boardWidth = FALLBACK_WIDTH;
    this.viewport = { panX: 24, panY: 16, zoom: 1 };
    this.gesture = undefined;
    this.hoverSliceId = undefined;
    this.selectedSliceIds = [];
    this.selectedLinkIds = [];
    this.naming = undefined;
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#resize?.disconnect();
    this.#resize = undefined;
  }

  protected override firstUpdated(): void {
    if (typeof ResizeObserver === 'undefined') return;
    this.#resize = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width !== undefined && width > 0) this.boardWidth = width;
    });
    this.#resize.observe(this);
  }

  protected override updated(): void {
    super.updated();
    // The wall can grow or shrink with the content: re-apply the pan limits.
    this.#setViewport(this.viewport);
    // The pickers float in the top layer at the point that opened them;
    // leaving the mode removes them from the DOM.
    if (this.mode.kind === 'append') this.#openAt('#append-menu', this.mode.point, APPEND_MENU_SIZE);
    if (this.naming !== undefined) this.#openAt('#context-pop', this.naming.point, CONTEXT_POP_SIZE, '#context-name');
  }

  #openAt(selector: string, point: Point, size: { width: number; height: number }, focus?: string): void {
    const surface = this.renderRoot.querySelector<HTMLElement>(selector);
    if (!surface || surface.matches(':popover-open')) return;
    this.#popovers.open(surface, pointAnchor(point.x, point.y), size);
    if (focus === undefined) return;
    const target = this.renderRoot.querySelector<HTMLElement>(focus);
    target?.focus();
    // Typing should replace the current name, not append to it.
    if (target instanceof HTMLInputElement) target.select();
  }

  #maxRowWidth(): number {
    return Math.max(SLICE_MIN_ROW, this.boardWidth - 96);
  }

  protected override renderRegions(context: TemplateRenderContext<EventStormingState>): ShellRegions {
    return { main: this.#renderMain(context) };
  }

  #renderMain(context: TemplateRenderContext<EventStormingState>): TemplateResult {
    return html`
      ${renderEsBoard({
        context,
        mode: this.mode,
        maxRowWidth: this.#maxRowWidth(),
        viewport: this.viewport,
        gesture: this.gesture,
        hoverSliceId: this.hoverSliceId,
        selectedSliceIds: this.selectedSliceIds,
        selectedLinkIds: this.selectedLinkIds,
        handlers: {
          noteIntent: (noteId, intent) => this.#onNoteIntent(noteId, intent),
          addFirst: () => this.#addFirstEvent(context),
          attachNote: (sliceId, type) => this.#attachNote(context, sliceId, type),
          viewportPointerDown: (event) => this.#onViewportPointerDown(event),
          viewportPointerMove: (event) => this.#onViewportPointerMove(event),
          viewportPointerUp: (event) => this.#onViewportPointerUp(context, event),
          viewportPointerCancel: () => (this.gesture = undefined),
          viewportPointerLeave: () => {
            if (this.gesture === undefined) this.hoverSliceId = undefined;
          },
          viewportWheel: (event) => this.#onWheel(event),
          portPointerDown: (sliceId, event) => this.#onPortPointerDown(sliceId, event),
          slicePointerDown: (sliceId, event) => this.#onSlicePointerDown(sliceId, event),
          zoomStep: (direction) => this.#zoomStep(direction),
          zoomFit: () => this.#zoomFit(),
          zoomReset: () => this.#zoomBy(1 / this.viewport.zoom),
          groupSelection: (point) => {
            if (this.selectedSliceIds.length > 0) {
              this.naming = { kind: 'create-context', sliceIds: this.selectedSliceIds, point };
            }
          },
          assignSelection: (contextId) => this.#assignSelection(context, contextId),
          stripSelectionContext: () => this.#assignSelection(context, null),
          clearSelection: () => {
            this.selectedSliceIds = [];
            this.selectedLinkIds = [];
          },
          linkClick: (linkId, additive) => this.#selectLink(linkId, additive),
          deleteSelection: () => this.#deleteSelection(context),
          keyDown: (event) => this.#onKeyDown(context, event),
          renameContext: (contextId, point) => (this.naming = { kind: 'rename-context', contextId, point }),
          dissolveContext: (contextId) => context.dispatch(eventStormingAction.deleteContext(contextId)),
        },
      })}
      ${this.mode.kind === 'append' ? this.#renderAppendMenu(context, this.mode.sliceId) : nothing}
      ${this.naming !== undefined ? this.#renderContextPop(context, this.naming) : nothing}
    `;
  }

  /* -------------------------------------------------------------- pointers */

  #viewportEl(): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>('.board-viewport');
  }

  #local(event: { clientX: number; clientY: number }): Point {
    const rect = this.#viewportEl()?.getBoundingClientRect();
    return rect === undefined
      ? { x: event.clientX, y: event.clientY }
      : { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  /** Slice frame rects in viewport-local pixels, optionally padded for hover. */
  #sliceRects(pad?: { x: number; top: number; bottom: number }): IdRect[] {
    const viewport = this.#viewportEl();
    if (viewport === null) return [];
    const origin = viewport.getBoundingClientRect();
    return [...this.renderRoot.querySelectorAll<HTMLElement>('[data-slice-id]')].map((el) => {
      const r = el.getBoundingClientRect();
      return {
        id: el.dataset['sliceId'] ?? '',
        rect: {
          left: r.left - origin.left - (pad?.x ?? 0),
          top: r.top - origin.top - (pad?.top ?? 0),
          width: r.width + (pad?.x ?? 0) * 2,
          height: r.height + (pad?.top ?? 0) + (pad?.bottom ?? 0),
        },
      };
    });
  }

  #startGesture(event: PointerEvent, gesture: EsGesture): void {
    const viewport = this.#viewportEl();
    if (viewport === null) return;
    viewport.setPointerCapture(event.pointerId);
    this.gesture = gesture;
  }

  #onPortPointerDown(sliceId: string, event: PointerEvent): void {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    const point = this.#local(event);
    this.#startGesture(event, {
      kind: 'connect',
      pointerId: event.pointerId,
      fromSliceId: sliceId,
      start: point,
      current: point,
      moved: false,
    });
  }

  #onSlicePointerDown(sliceId: string, event: PointerEvent): void {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    const point = this.#local(event);
    this.#startGesture(event, {
      kind: 'move-slice',
      pointerId: event.pointerId,
      sliceId,
      start: point,
      current: point,
      moved: false,
    });
  }

  #onViewportPointerDown(event: PointerEvent): void {
    if (event.button !== 0 || this.gesture !== undefined) return;
    // The background starts a selection sweep; anything interactive does not.
    for (const el of event.composedPath()) {
      if (el === event.currentTarget) break;
      if (!(el instanceof Element)) continue;
      if (el.tagName.toLowerCase() === 'artifact-es-note') return;
      if (el.matches('button, select, textarea, input, a')) return;
    }
    const point = this.#local(event);
    // Pressing bare wall acknowledges the inline edit that is open, and drops
    // whatever was selected or asked for.
    if (this.mode.kind === 'editing' || this.mode.kind === 'append') this.mode = ES_IDLE;
    this.selectedLinkIds = [];
    this.#startGesture(event, {
      kind: 'select',
      pointerId: event.pointerId,
      start: point,
      current: point,
      moved: false,
    });
  }

  #onViewportPointerMove(event: PointerEvent): void {
    const gesture = this.gesture;
    const point = this.#local(event);
    if (gesture === undefined) {
      const hit = hitRect(this.#sliceRects(HOVER_PAD), point.x, point.y);
      if (hit !== this.hoverSliceId) this.hoverSliceId = hit;
      return;
    }
    this.gesture = moveGesture(gesture, { pointerId: event.pointerId, point }, this.#sliceRects(), DRAG_THRESHOLD);
  }

  #onViewportPointerUp(context: TemplateRenderContext<EventStormingState>, event: PointerEvent): void {
    const current = this.gesture;
    if (current === undefined || event.pointerId !== current.pointerId) return;
    const gesture = moveGesture(
      current,
      { pointerId: event.pointerId, point: this.#local(event) },
      this.#sliceRects(),
      DRAG_THRESHOLD,
    );
    this.gesture = undefined;
    if (gesture.kind === 'connect') {
      if (!gesture.moved) this.#openAppendMenu(gesture.fromSliceId);
      else if (gesture.targetSliceId !== undefined) {
        this.#connectSlices(context, gesture.fromSliceId, gesture.targetSliceId);
      }
      return;
    }
    if (gesture.kind === 'move-slice') {
      if (!gesture.moved) {
        this.selectedSliceIds = this.selectedSliceIds.includes(gesture.sliceId)
          ? this.selectedSliceIds.filter((id) => id !== gesture.sliceId)
          : [...this.selectedSliceIds, gesture.sliceId];
        return;
      }
      if (gesture.drop !== undefined) {
        this.#moveSlice(context, gesture.sliceId, gesture.drop.sliceId, gesture.drop.side);
      }
      return;
    }
    if (!gesture.moved) {
      this.selectedSliceIds = [];
      return;
    }
    const band: Rect = {
      left: Math.min(gesture.start.x, gesture.current.x),
      top: Math.min(gesture.start.y, gesture.current.y),
      width: Math.abs(gesture.current.x - gesture.start.x),
      height: Math.abs(gesture.current.y - gesture.start.y),
    };
    this.selectedSliceIds = [...rectsInBand(this.#sliceRects(), band)];
  }

  #onWheel(event: WheelEvent): void {
    event.preventDefault();
    const point = this.#local(event);
    // A trackpad pinch arrives as a ctrl-modified wheel; plain wheel pans.
    this.#setViewport(
      event.ctrlKey || event.metaKey
        ? zoomAt(this.viewport, point.x, point.y, Math.exp(-event.deltaY * 0.01))
        : panBy(this.viewport, -event.deltaX, -event.deltaY),
    );
  }

  #zoomBy(factor: number): void {
    const rect = this.#viewportEl()?.getBoundingClientRect();
    this.#setViewport(zoomAt(this.viewport, (rect?.width ?? 0) / 2, (rect?.height ?? 0) / 2, factor));
  }

  #zoomStep(direction: 1 | -1): void {
    this.#zoomBy(direction === 1 ? 1.2 : 1 / 1.2);
  }

  #zoomFit(): void {
    const rect = this.#viewportEl()?.getBoundingClientRect();
    const content = this.#contentSize();
    if (rect === undefined || content === undefined) return;
    this.#setViewport(fitViewport(content, { width: rect.width, height: rect.height }, 48));
  }

  /** The wall's own box: the content the pan limits are measured against. */
  #contentSize(): Size | undefined {
    const wall = this.renderRoot.querySelector<HTMLElement>('.wall');
    return wall === null ? undefined : { width: wall.offsetWidth, height: wall.offsetHeight };
  }

  /** Applies a viewport change, keeping the wall (plus a buffer) on screen. */
  #setViewport(next: Viewport): void {
    const rect = this.#viewportEl()?.getBoundingClientRect();
    const content = this.#contentSize();
    const clamped =
      rect === undefined || content === undefined || content.width === 0 || rect.width === 0
        ? next
        : constrainViewport(next, content, { width: rect.width, height: rect.height }, VIEW_BUFFER);
    const current = this.viewport;
    if (clamped.panX === current.panX && clamped.panY === current.panY && clamped.zoom === current.zoom) return;
    this.viewport = clamped;
  }

  /* --------------------------------------------------------------- intents */

  /** A note asked for something: apply the side effect, then the mode transition. */
  #onNoteIntent(noteId: string, intent: NoteIntent): void {
    const context = this.context();
    switch (intent.kind) {
      case 'select':
        context.navigate({ note: noteId });
        break;
      case 'rename':
        context.dispatch(eventStormingAction.setElementName(noteId, intent.name));
        break;
      case 'comment':
        context.dispatch({ type: 'comment', target: `element:${noteId}`, payload: { body: intent.body } });
        break;
      case 'delete':
        context.dispatch(eventStormingAction.deleteElement(noteId));
        if (context.navigation['note'] === noteId) context.navigate({ note: null });
        break;
      case 'add-hotspot':
        this.#createHotspot(context, noteId);
        break;
      case 'toggle-comment':
      case 'dismiss':
        break;
    }
    this.mode = reduceNoteIntent(this.mode, noteId, intent);
  }

  /* ------------------------------------------------------- slice mutations */

  #sliceById(state: EventStormingState, sliceId: string): EsSlice | undefined {
    return buildSlices(state).find((slice) => slice.id === sliceId);
  }

  #membersOf(slice: EsSlice | undefined): string[] {
    return slice === undefined ? [] : [...slice.notes, ...slice.pins.map((pin) => pin.note)].map((note) => note.id);
  }

  /** A port drag landed on another slice: link source voice → target head. */
  #connectSlices(context: TemplateRenderContext<EventStormingState>, fromSliceId: string, toSliceId: string): void {
    if (fromSliceId === toSliceId) return;
    const slices = buildSlices(context.state);
    const from = slices.find((slice) => slice.id === fromSliceId);
    const to = slices.find((slice) => slice.id === toSliceId);
    const endpoints = from && to ? connectionEndpoints(from, to) : undefined;
    if (from === undefined || to === undefined || endpoints === undefined) return;
    if (context.state.links.some((link) => link.from === endpoints.from && link.to === endpoints.to)) return;
    const taken = context.state.links.map((link) => link.id);
    // A forward connection pulls its target right behind the source's voice:
    // the arrow the reader just drew stays a short stroke, and the layout's
    // parent choice (the latest cause before a slice) follows along.
    const order = context.state.elements.map((note) => note.id);
    const anchor = sliceVoice(from)?.id;
    const steps =
      anchor !== undefined && slices.indexOf(to) > slices.indexOf(from)
        ? sliceMoveSteps(order, this.#membersOf(to), [anchor], 'after')
        : [];
    context.dispatchBatch([
      eventStormingAction.linkElements(createEntityId(`link-${endpoints.from}`, taken), endpoints.from, endpoints.to, {
        kind: 'flow',
      }),
      ...steps.map((step) => eventStormingAction.moveElement(step.id, step.after)),
    ]);
  }

  /** Client coordinates of a slice's connect port, where the append menu opens. */
  #portPoint(sliceId: string): Point | undefined {
    const viewport = this.#viewportEl();
    const rect = this.#sliceRects().find((entry) => entry.id === sliceId)?.rect;
    if (viewport === null || rect === undefined) return undefined;
    const origin = viewport.getBoundingClientRect();
    return { x: origin.left + rect.left + rect.width, y: origin.top + rect.top + rect.height / 2 };
  }

  /** A port was clicked: ask which note continues the slice before adding one. */
  #openAppendMenu(sliceId: string): void {
    const point = this.#portPoint(sliceId);
    if (point === undefined) return;
    this.mode = { kind: 'append', sliceId, point };
  }

  /** The picked type was chosen: create that note and chain it onto the slice. */
  #appendNote(context: TemplateRenderContext<EventStormingState>, sliceId: string, type: NoteType): void {
    const slice = this.#sliceById(context.state, sliceId);
    const source = slice ? sliceVoice(slice) : undefined;
    if (source === undefined) {
      this.mode = ES_IDLE;
      return;
    }
    const id = createEntityId(`new-${type}`, allNoteIds(context.state));
    const taken = context.state.links.map((link) => link.id);
    const outcome = context.dispatchBatch([
      eventStormingAction.addElement(id, type, NOTE_TYPE_LABELS[type]),
      eventStormingAction.linkElements(createEntityId(`link-${source.id}`, taken), source.id, id, { kind: 'flow' }),
    ]);
    if (!outcome.ok) {
      this.mode = ES_IDLE;
      return;
    }
    context.navigate({ note: id });
    this.mode = { kind: 'editing', noteId: id };
  }

  /** A note's hotspot tool: pin a fresh hotspot onto that very note. */
  #createHotspot(context: TemplateRenderContext<EventStormingState>, noteId: string): void {
    const id = createEntityId('new-hotspot', allNoteIds(context.state));
    const taken = context.state.links.map((link) => link.id);
    const outcome = context.dispatchBatch([
      eventStormingAction.addElement(id, 'hotspot', NOTE_TYPE_LABELS.hotspot),
      eventStormingAction.linkElements(createEntityId(`link-${id}`, taken), id, noteId, { kind: 'member' }),
    ]);
    if (!outcome.ok) return;
    context.navigate({ note: id });
    this.mode = { kind: 'editing', noteId: id };
  }

  /** A chip on a hovered slice was clicked: add the note into that slice. */
  #attachNote(context: TemplateRenderContext<EventStormingState>, sliceId: string, type: NoteType): void {
    const slice = this.#sliceById(context.state, sliceId);
    const anchor = slice === undefined ? undefined : attachAnchor(slice, type);
    if (anchor === undefined) return;
    const id = createEntityId(`new-${type}`, allNoteIds(context.state));
    const [from, to] = anchor.incoming ? [id, anchor.anchorId] : [anchor.anchorId, id];
    const taken = context.state.links.map((link) => link.id);
    const outcome = context.dispatchBatch([
      eventStormingAction.addElement(id, type, NOTE_TYPE_LABELS[type]),
      eventStormingAction.linkElements(createEntityId(`link-${from}`, taken), from, to, { kind: 'member' }),
    ]);
    if (!outcome.ok) return;
    context.navigate({ note: id });
    this.mode = { kind: 'editing', noteId: id };
  }

  /** A slice was dropped beside another: move every member, chained in order. */
  #moveSlice(
    context: TemplateRenderContext<EventStormingState>,
    movingSliceId: string,
    targetSliceId: string,
    side: 'before' | 'after',
  ): void {
    const state = context.state;
    const steps = sliceMovePlan(
      state.elements.map((note) => note.id),
      this.#membersOf(this.#sliceById(state, movingSliceId)),
      this.#membersOf(this.#sliceById(state, targetSliceId)),
      side,
    );
    context.dispatchBatch(steps.map((step) => eventStormingAction.moveElement(step.id, step.after)));
  }

  /* ------------------------------------------------------------ selection */

  /** A link stroke was clicked; shift/⌘/ctrl extends the selection. */
  #selectLink(linkId: string, additive: boolean): void {
    if (this.mode.kind === 'editing') this.mode = ES_IDLE;
    this.selectedSliceIds = [];
    this.selectedLinkIds = !additive
      ? [linkId]
      : this.selectedLinkIds.includes(linkId)
        ? this.selectedLinkIds.filter((id) => id !== linkId)
        : [...this.selectedLinkIds, linkId];
    this.#viewportEl()?.focus();
  }

  /** Delete key or the selection bar's button: links first, then slices. */
  #deleteSelection(context: TemplateRenderContext<EventStormingState>): void {
    if (this.selectedLinkIds.length > 0) {
      const doomed = context.state.links.filter((link) => this.selectedLinkIds.includes(link.id));
      context.dispatchBatch(doomed.map((link) => eventStormingAction.unlinkElements(link.from, link.to)));
      this.selectedLinkIds = [];
      return;
    }
    if (this.selectedSliceIds.length === 0) return;
    const slices = buildSlices(context.state);
    const members = this.selectedSliceIds.flatMap((id) => this.#membersOf(slices.find((slice) => slice.id === id)));
    context.dispatchBatch(members.map((member) => eventStormingAction.deleteElement(member)));
    this.selectedSliceIds = [];
  }

  /** The board's own keys: clear the selection, or delete what is selected. */
  #onKeyDown(context: TemplateRenderContext<EventStormingState>, event: KeyboardEvent): void {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Escape') {
      this.selectedSliceIds = [];
      this.selectedLinkIds = [];
      return;
    }
    if (event.key !== 'Delete' && event.key !== 'Backspace') return;
    // Typing somewhere (inline edit, composer, popover) owns the key.
    if (this.mode.kind !== 'idle' || this.naming !== undefined) return;
    event.preventDefault();
    if (this.selectedLinkIds.length > 0 || this.selectedSliceIds.length > 0) {
      this.#deleteSelection(context);
      return;
    }
    const focused = context.navigation['note'];
    if (focused === undefined || findNote(context.state, focused) === undefined) return;
    context.dispatch(eventStormingAction.deleteElement(focused));
    context.navigate({ note: null });
  }

  /* ------------------------------------------------------ bounded contexts */

  #assignSelection(context: TemplateRenderContext<EventStormingState>, contextId: string | null): void {
    const slices = buildSlices(context.state);
    const members = this.selectedSliceIds.flatMap((id) => this.#membersOf(slices.find((slice) => slice.id === id)));
    const outcome = context.dispatchBatch(
      members.map((member) => eventStormingAction.setElementContext(member, contextId)),
    );
    if (outcome.ok) this.selectedSliceIds = [];
  }

  #confirmNaming(context: TemplateRenderContext<EventStormingState>, naming: EsNaming): void {
    const input = this.renderRoot.querySelector<HTMLInputElement>('#context-name');
    const name = input?.value.trim() ?? '';
    if (name === '') return;
    if (naming.kind === 'rename-context') {
      const outcome = context.dispatch(eventStormingAction.setContextName(naming.contextId, name));
      if (outcome.ok) this.naming = undefined;
      return;
    }
    const id = createEntityId(
      'context',
      context.state.contexts.map((c) => c.id),
    );
    const slices = buildSlices(context.state);
    const members = naming.sliceIds.flatMap((sliceId) => this.#membersOf(slices.find((slice) => slice.id === sliceId)));
    const outcome = context.dispatchBatch([
      eventStormingAction.addContext(id, name),
      ...members.map((member) => eventStormingAction.setElementContext(member, id)),
    ]);
    if (!outcome.ok) return;
    this.selectedSliceIds = [];
    this.naming = undefined;
  }

  #renderContextPop(context: TemplateRenderContext<EventStormingState>, naming: EsNaming): TemplateResult {
    const current = naming.kind === 'rename-context' ? (findContext(context.state, naming.contextId)?.name ?? '') : '';
    return html`<div id="context-pop" class="comment-pop context-pop" popover="manual">
      <span class="af-label">
        ${naming.kind === 'create-context' ? '新しい境界づけられたコンテキスト' : 'コンテキスト名を変更'}
      </span>
      <input
        id="context-name"
        class="af-input"
        type="text"
        placeholder="コンテキスト名"
        .value=${current}
        @keydown=${(event: KeyboardEvent) => {
          if (event.key === 'Enter') this.#confirmNaming(context, naming);
          if (event.key === 'Escape') this.naming = undefined;
        }}
      />
      <div class="pop-actions">
        <button class="af-btn" type="button" @click=${() => (this.naming = undefined)}>キャンセル</button>
        <button class="af-btn af-btn--accent" type="button" @click=${() => this.#confirmNaming(context, naming)}>
          ${naming.kind === 'create-context' ? '作成' : '保存'}
        </button>
      </div>
    </div>`;
  }

  /* --------------------------------------------------------------- pickers */

  /** The empty state's only affordance: the first domain event of the wall. */
  #renderAppendMenu(context: TemplateRenderContext<EventStormingState>, sliceId: string): TemplateResult {
    const slice = this.#sliceById(context.state, sliceId);
    const from = slice === undefined ? undefined : sliceVoice(slice);
    return html`<div id="append-menu" class="comment-pop append-menu" popover="manual">
      <span class="af-label">${from === undefined ? '続きに追加する付箋' : `「${from.name}」の続きに追加`}</span>
      <div class="type-options">
        ${APPEND_TYPES.map(
          (type) =>
            html`<button
              class="type-chip"
              type="button"
              data-type=${type}
              style=${notePaletteStyle(type)}
              @click=${() => this.#appendNote(context, sliceId, type)}
            >
              ${NOTE_TYPE_LABELS[type]}
            </button>`,
        )}
      </div>
      <div class="pop-actions">
        <button class="af-btn" type="button" @click=${() => (this.mode = ES_IDLE)}>キャンセル</button>
      </div>
    </div>`;
  }

  #addFirstEvent(context: TemplateRenderContext<EventStormingState>): void {
    const id = createEntityId('new-event', allNoteIds(context.state));
    const outcome = context.dispatch(eventStormingAction.addElement(id, 'event', NOTE_TYPE_LABELS.event));
    if (!outcome.ok) {
      this.mode = ES_IDLE;
      return;
    }
    context.navigate({ note: id });
    // Straight into renaming: a fresh sticky note with a placeholder name is noise.
    this.mode = { kind: 'editing', noteId: id };
  }
}

/** Narrowest useful band: one single-note slice plus its padding. */
const SLICE_MIN_ROW = 132 * 2;

export const defineEventStormingElement = (tag = 'artifact-event-storming'): void => {
  defineEsNoteCard();
  if (!customElements.get(tag)) customElements.define(tag, EventStormingElement);
};
