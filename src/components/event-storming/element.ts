import { html, nothing, type CSSResultGroup, type TemplateResult } from 'lit';

import type { ElementActionResult } from '../../core/element-actions';
import type { ActionInput, CommentTargetOption, DraftAction } from '../../core/types';

import { PopoverController } from '../../core/popover-controller';
import { SelectController } from '../../core/select/controller';
import { pointAnchor } from '../../lib/dom/popover';
import { ElementChromeBase, isActionPayload } from '../diagram/element';
import { chromeStyles } from '../diagram/styles';
import { eventStormingAction } from './actions';
import { defineEsNoteCard, notePaletteStyle } from './components/note-card';
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
import { eventStormingMessages } from './messages';
import {
  allNoteIds,
  emptyEventStormingBase,
  findContext,
  findNote,
  parseEventStormingBase,
  type EventStormingState,
  type NoteType,
} from './model';
import { PinHeightsController } from './pin-heights';
import { reduceEventStormingActions } from './reduce';
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

/** What the chrome's own comment trigger (and `hasSelection`) addresses: one sticky note. */
export type EsSelectionRef = { readonly kind: 'note'; readonly id: string };

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
/** Narrowest useful band: one single-note slice plus its padding. */
const SLICE_MIN_ROW = 132 * 2;
/** The page-wide target id the board's own "whole board" actions and comment anchor share. */
const BOARD_ANCHOR = 'event-storming';

/**
 * `<dpk-event-storming>` — the big picture wall (ADR 20261023_diagram-as-board).
 *
 * The element is the seam between the pure parts: it owns the ephemeral UI
 * state (mode, viewport, pointer gesture, hover, selection), measures its own
 * size to decide where the slice timeline wraps and its hotspot pins to stack
 * them, and turns intents into element actions. Placement lives in `layout.ts`,
 * gesture math in `interactions.ts`, rendering in `render/board.ts` (pin
 * stacking in `render/pin-stack.ts`), the sticky note in `components/note-card.ts`.
 * Comments are the chrome's own contextual trigger, rendered beside each note.
 */
export class DpkEventStorming extends ElementChromeBase<EventStormingState, EsSelectionRef> {
  static override styles: CSSResultGroup = [chromeStyles, eventStormingStyles];

  // Ephemeral UI state (mode, viewport, gesture, selection) is plain fields, not
  // Lit reactive properties: `ElementChromeBase.properties` is an unannotated
  // object literal, so TypeScript's static-side inheritance check requires any
  // subclass override to be structurally identical to it, not just a superset.
  // The rest of this file calls `requestUpdate()` after mutating these (see
  // `whiteboard`'s `#mode` for the same pattern).
  private mode: EsUiMode = ES_IDLE;
  private boardWidth = FALLBACK_WIDTH;
  private viewport: Viewport = { panX: 24, panY: 16, zoom: 1 };
  private gesture: EsGesture | undefined = undefined;
  private hoverSliceId: string | undefined = undefined;
  private selectedSliceIds: readonly string[] = [];
  private selectedLinkIds: readonly string[] = [];
  private naming: EsNaming | undefined = undefined;

  #resize: ResizeObserver | undefined;
  readonly #popovers = new PopoverController(this);
  readonly #pinHeights = new PinHeightsController(this);
  /** The one-shot "assign to an existing context" command select in the selection bar. */
  readonly #assignSelect = new SelectController(this);

  protected override parseData(input: unknown): EventStormingState {
    return parseEventStormingBase(input);
  }

  protected override emptyData(): EventStormingState {
    return emptyEventStormingBase();
  }

  protected override reduceElementActions(
    data: EventStormingState,
    actions: readonly DraftAction[],
  ): { readonly data: EventStormingState; readonly results: readonly ElementActionResult[] } {
    return reduceEventStormingActions(eventStormingMessages(this.locale), data, actions);
  }

  protected override defaultHeading(): string {
    return eventStormingMessages(this.locale).heading;
  }

  protected override shellClass(): string {
    return 'event-storming';
  }

  protected override commentItems(): readonly CommentTargetOption[] {
    const state = this.items();
    const m = eventStormingMessages(this.locale);
    return [
      { value: this.commentRef('page', BOARD_ANCHOR), label: m.wholeBoard },
      ...state.elements.map((note) => ({ value: this.commentRef('note', note.id), label: note.name })),
      ...state.contexts.map((context) => ({ value: this.commentRef('context', context.id), label: context.name })),
    ];
  }

  protected override hasSelection(selection: EsSelectionRef): boolean {
    return findNote(this.items(), selection.id) !== undefined;
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
      if (width !== undefined && width > 0) {
        this.boardWidth = width;
        this.requestUpdate();
      }
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

  protected override render(): TemplateResult {
    this.prepareRender();
    const m = eventStormingMessages(this.locale);
    const chrome = this.chromeMessages;
    const subject = this.subject ?? this.defaultSubject();
    return html`
      <dpk-dialog-panel
        class=${this.shellClass()}
        flush
        ?maximizable=${this.frameControls}
        ?resizable=${this.frameControls}
        heading=${this.heading ?? this.defaultHeading()}
        subject=${subject === '' ? nothing : subject}
        @dpk-maximize-change=${() => this.closeComposer()}
      >
        ${this.renderToolbarActionsSlot()} ${this.renderTagFilterRow()}
        ${
          this.dataError !== null
            ? html`<p class="es-notice" role="alert">${chrome.dataError}<br />${this.dataError}</p>`
            : html`${renderEsBoard({
                m,
                state: this.items(),
                mode: this.mode,
                maxRowWidth: this.#maxRowWidth(),
                pinHeights: this.#pinHeights.heights,
                viewport: this.viewport,
                gesture: this.gesture,
                hoverSliceId: this.hoverSliceId,
                selectedSliceIds: this.selectedSliceIds,
                selectedLinkIds: this.selectedLinkIds,
                selectedNoteId: this.selection?.kind === 'note' ? this.selection.id : undefined,
                assignSelect: this.#assignSelect,
                commentRef: (kind, id) => this.commentRef(kind, id),
                handlers: {
                  noteIntent: (noteId, intent) => this.#onNoteIntent(noteId, intent),
                  addFirst: () => this.#addFirstEvent(),
                  attachNote: (sliceId, type) => this.#attachNote(sliceId, type),
                  viewportPointerDown: (event) => this.#onViewportPointerDown(event),
                  viewportPointerMove: (event) => this.#onViewportPointerMove(event),
                  viewportPointerUp: (event) => this.#onViewportPointerUp(event),
                  viewportPointerCancel: () => {
                    this.gesture = undefined;
                    this.requestUpdate();
                  },
                  viewportPointerLeave: () => {
                    if (this.gesture === undefined) {
                      this.hoverSliceId = undefined;
                      this.requestUpdate();
                    }
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
                      this.requestUpdate();
                    }
                  },
                  assignSelection: (contextId) => this.#assignSelection(contextId),
                  stripSelectionContext: () => this.#assignSelection(null),
                  clearSelection: () => {
                    this.selectedSliceIds = [];
                    this.selectedLinkIds = [];
                    this.requestUpdate();
                  },
                  linkClick: (linkId, additive) => this.#selectLink(linkId, additive),
                  deleteSelection: () => this.#deleteSelection(),
                  keyDown: (event) => this.#onKeyDown(event),
                  renameContext: (contextId, point) => {
                    this.naming = { kind: 'rename-context', contextId, point };
                    this.requestUpdate();
                  },
                  dissolveContext: (contextId) => this.#dispatch(eventStormingAction.deleteContext(contextId)),
                },
              })}
              ${this.mode.kind === 'append' ? this.#renderAppendMenu(this.mode.sliceId) : nothing}
              ${this.naming !== undefined ? this.#renderContextPop(this.naming) : nothing} `
        }
      </dpk-dialog-panel>
      ${this.renderSelection()}
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
    this.requestUpdate();
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
      if (el.tagName.toLowerCase() === 'dpk-internal-event-storming-note') return;
      if (el.matches('button, select, textarea, input, a')) return;
    }
    const point = this.#local(event);
    // Pressing bare wall drops whatever edit or picker was open.
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
      if (hit !== this.hoverSliceId) {
        this.hoverSliceId = hit;
        this.requestUpdate();
      }
      return;
    }
    this.gesture = moveGesture(gesture, { pointerId: event.pointerId, point }, this.#sliceRects(), DRAG_THRESHOLD);
    this.requestUpdate();
  }

  #onViewportPointerUp(event: PointerEvent): void {
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
      else if (gesture.targetSliceId !== undefined) this.#connectSlices(gesture.fromSliceId, gesture.targetSliceId);
      this.requestUpdate();
      return;
    }
    if (gesture.kind === 'move-slice') {
      if (!gesture.moved) {
        this.selectedSliceIds = this.selectedSliceIds.includes(gesture.sliceId)
          ? this.selectedSliceIds.filter((id) => id !== gesture.sliceId)
          : [...this.selectedSliceIds, gesture.sliceId];
        this.requestUpdate();
        return;
      }
      if (gesture.drop !== undefined) this.#moveSlice(gesture.sliceId, gesture.drop.sliceId, gesture.drop.side);
      this.requestUpdate();
      return;
    }
    if (!gesture.moved) {
      this.selectedSliceIds = [];
      this.requestUpdate();
      return;
    }
    const band: Rect = {
      left: Math.min(gesture.start.x, gesture.current.x),
      top: Math.min(gesture.start.y, gesture.current.y),
      width: Math.abs(gesture.current.x - gesture.start.x),
      height: Math.abs(gesture.current.y - gesture.start.y),
    };
    this.selectedSliceIds = [...rectsInBand(this.#sliceRects(), band)];
    this.requestUpdate();
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
    this.requestUpdate();
  }

  /* --------------------------------------------------------------- intents */

  /** A note asked for something: apply the side effect, then the mode transition. */
  #onNoteIntent(noteId: string, intent: NoteIntent): void {
    switch (intent.kind) {
      case 'select':
        this.select({ kind: 'note', id: noteId });
        break;
      case 'rename':
        this.#dispatch(eventStormingAction.setElementName(noteId, intent.name));
        break;
      case 'delete':
        this.#dispatch(eventStormingAction.deleteElement(noteId));
        if (this.selection?.kind === 'note' && this.selection.id === noteId) this.select(null);
        break;
      case 'add-hotspot':
        this.#createHotspot(noteId);
        break;
    }
    this.mode = reduceNoteIntent(this.mode, noteId, intent);
    this.requestUpdate();
  }

  /* ------------------------------------------------------- slice mutations */

  #sliceById(sliceId: string): EsSlice | undefined {
    return buildSlices(this.items()).find((slice) => slice.id === sliceId);
  }

  #membersOf(slice: EsSlice | undefined): string[] {
    return slice === undefined ? [] : [...slice.notes, ...slice.pins.map((pin) => pin.note)].map((note) => note.id);
  }

  /** A port drag landed on another slice: link source voice → target head. */
  #connectSlices(fromSliceId: string, toSliceId: string): void {
    if (fromSliceId === toSliceId) return;
    const state = this.items();
    const slices = buildSlices(state);
    const from = slices.find((slice) => slice.id === fromSliceId);
    const to = slices.find((slice) => slice.id === toSliceId);
    const endpoints = from && to ? connectionEndpoints(from, to) : undefined;
    if (from === undefined || to === undefined || endpoints === undefined) return;
    if (state.links.some((link) => link.from === endpoints.from && link.to === endpoints.to)) return;
    const taken = state.links.map((link) => link.id);
    // A forward connection pulls its target right behind the source's voice:
    // the arrow the reader just drew stays a short stroke, and the layout's
    // parent choice (the latest cause before a slice) follows along.
    const order = state.elements.map((note) => note.id);
    const anchor = sliceVoice(from)?.id;
    const steps =
      anchor !== undefined && slices.indexOf(to) > slices.indexOf(from)
        ? sliceMoveSteps(order, this.#membersOf(to), [anchor], 'after')
        : [];
    this.#dispatchAll([
      eventStormingAction.linkElements(createLinkId(`link-${endpoints.from}`, taken), endpoints.from, endpoints.to, {
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
    this.requestUpdate();
  }

  /** The picked type was chosen: create that note and chain it onto the slice. */
  #appendNote(sliceId: string, type: NoteType): void {
    const state = this.items();
    const slice = this.#sliceById(sliceId);
    const source = slice ? sliceVoice(slice) : undefined;
    if (source === undefined) {
      this.mode = ES_IDLE;
      this.requestUpdate();
      return;
    }
    const id = createNoteId(`new-${type}`, allNoteIds(state));
    const taken = state.links.map((link) => link.id);
    const ok = this.#dispatchAll([
      eventStormingAction.addElement(id, type, eventStormingMessages(this.locale).noteTypeLabel(type)),
      eventStormingAction.linkElements(createLinkId(`link-${source.id}`, taken), source.id, id, { kind: 'flow' }),
    ]);
    if (!ok) {
      this.mode = ES_IDLE;
      this.requestUpdate();
      return;
    }
    this.select({ kind: 'note', id });
    this.mode = { kind: 'editing', noteId: id };
    this.requestUpdate();
  }

  /** A note's hotspot tool: pin a fresh hotspot onto that very note. */
  #createHotspot(noteId: string): void {
    const state = this.items();
    const id = createNoteId('new-hotspot', allNoteIds(state));
    const taken = state.links.map((link) => link.id);
    const ok = this.#dispatchAll([
      eventStormingAction.addElement(id, 'hotspot', eventStormingMessages(this.locale).noteTypeLabel('hotspot')),
      eventStormingAction.linkElements(createLinkId(`link-${id}`, taken), id, noteId, { kind: 'member' }),
    ]);
    if (!ok) return;
    this.select({ kind: 'note', id });
    this.mode = { kind: 'editing', noteId: id };
    this.requestUpdate();
  }

  /** A chip on a hovered slice was clicked: add the note into that slice. */
  #attachNote(sliceId: string, type: NoteType): void {
    const slice = this.#sliceById(sliceId);
    const anchor = slice === undefined ? undefined : attachAnchor(slice, type);
    if (anchor === undefined) return;
    const state = this.items();
    const id = createNoteId(`new-${type}`, allNoteIds(state));
    const [from, to] = anchor.incoming ? [id, anchor.anchorId] : [anchor.anchorId, id];
    const taken = state.links.map((link) => link.id);
    const ok = this.#dispatchAll([
      eventStormingAction.addElement(id, type, eventStormingMessages(this.locale).noteTypeLabel(type)),
      eventStormingAction.linkElements(createLinkId(`link-${from}`, taken), from, to, { kind: 'member' }),
    ]);
    if (!ok) return;
    this.select({ kind: 'note', id });
    this.mode = { kind: 'editing', noteId: id };
    this.requestUpdate();
  }

  /** A slice was dropped beside another: move every member, chained in order. */
  #moveSlice(movingSliceId: string, targetSliceId: string, side: 'before' | 'after'): void {
    const state = this.items();
    const steps = sliceMovePlan(
      state.elements.map((note) => note.id),
      this.#membersOf(this.#sliceById(movingSliceId)),
      this.#membersOf(this.#sliceById(targetSliceId)),
      side,
    );
    this.#dispatchAll(steps.map((step) => eventStormingAction.moveElement(step.id, step.after)));
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
    this.requestUpdate();
    this.#viewportEl()?.focus();
  }

  /** Delete key or the selection bar's button: links first, then slices. */
  #deleteSelection(): void {
    const state = this.items();
    if (this.selectedLinkIds.length > 0) {
      const doomed = state.links.filter((link) => this.selectedLinkIds.includes(link.id));
      this.#dispatchAll(doomed.map((link) => eventStormingAction.unlinkElements(link.from, link.to)));
      this.selectedLinkIds = [];
      this.requestUpdate();
      return;
    }
    if (this.selectedSliceIds.length === 0) return;
    const slices = buildSlices(state);
    const members = this.selectedSliceIds.flatMap((id) => this.#membersOf(slices.find((slice) => slice.id === id)));
    this.#dispatchAll(members.map((member) => eventStormingAction.deleteElement(member)));
    this.selectedSliceIds = [];
    this.requestUpdate();
  }

  /** The board's own keys: clear the selection, or delete what is selected. */
  #onKeyDown(event: KeyboardEvent): void {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Escape') {
      this.selectedSliceIds = [];
      this.selectedLinkIds = [];
      this.requestUpdate();
      return;
    }
    if (event.key !== 'Delete' && event.key !== 'Backspace') return;
    // Typing somewhere (inline edit, naming popover) owns the key.
    if (this.mode.kind !== 'idle' || this.naming !== undefined) return;
    event.preventDefault();
    if (this.selectedLinkIds.length > 0 || this.selectedSliceIds.length > 0) {
      this.#deleteSelection();
      return;
    }
    const focused = this.selection?.kind === 'note' ? this.selection.id : undefined;
    if (focused === undefined || findNote(this.items(), focused) === undefined) return;
    this.#dispatch(eventStormingAction.deleteElement(focused));
    this.select(null);
  }

  /* ------------------------------------------------------ bounded contexts */

  #assignSelection(contextId: string | null): void {
    const state = this.items();
    const slices = buildSlices(state);
    const members = this.selectedSliceIds.flatMap((id) => this.#membersOf(slices.find((slice) => slice.id === id)));
    const ok = this.#dispatchAll(members.map((member) => eventStormingAction.setElementContext(member, contextId)));
    if (ok) {
      this.selectedSliceIds = [];
      this.requestUpdate();
    }
  }

  #confirmNaming(naming: EsNaming): void {
    const input = this.renderRoot.querySelector<HTMLInputElement>('#context-name');
    const name = input?.value.trim() ?? '';
    if (name === '') return;
    if (naming.kind === 'rename-context') {
      const ok = this.#dispatch(eventStormingAction.setContextName(naming.contextId, name));
      if (ok) {
        this.naming = undefined;
        this.requestUpdate();
      }
      return;
    }
    const state = this.items();
    const id = createContextId(
      'context',
      state.contexts.map((c) => c.id),
    );
    const slices = buildSlices(state);
    const members = naming.sliceIds.flatMap((sliceId) => this.#membersOf(slices.find((slice) => slice.id === sliceId)));
    const ok = this.#dispatchAll([
      eventStormingAction.addContext(id, name),
      ...members.map((member) => eventStormingAction.setElementContext(member, id)),
    ]);
    if (!ok) return;
    this.selectedSliceIds = [];
    this.naming = undefined;
    this.requestUpdate();
  }

  #renderContextPop(naming: EsNaming): TemplateResult {
    const m = eventStormingMessages(this.locale);
    const current = naming.kind === 'rename-context' ? (findContext(this.items(), naming.contextId)?.name ?? '') : '';
    return html`<div id="context-pop" class="comment-pop context-pop" popover="manual">
      <span class="dpk-label"> ${naming.kind === 'create-context' ? m.newContextTitle : m.renameContextTitle} </span>
      <input
        id="context-name"
        class="dpk-input"
        type="text"
        placeholder=${m.contextNamePlaceholder}
        .value=${current}
        @keydown=${(event: KeyboardEvent) => {
          if (event.key === 'Enter') this.#confirmNaming(naming);
          if (event.key === 'Escape') {
            this.naming = undefined;
            this.requestUpdate();
          }
        }}
      />
      <div class="pop-actions">
        <button
          class="dpk-btn"
          type="button"
          data-dpk-text-discard
          @click=${() => {
            this.naming = undefined;
            this.requestUpdate();
          }}
        >
          ${m.cancel}
        </button>
        <button class="dpk-btn dpk-btn--accent" type="button" @click=${() => this.#confirmNaming(naming)}>
          ${naming.kind === 'create-context' ? m.create : m.save}
        </button>
      </div>
    </div>`;
  }

  /* --------------------------------------------------------------- pickers */

  #renderAppendMenu(sliceId: string): TemplateResult {
    const m = eventStormingMessages(this.locale);
    const slice = this.#sliceById(sliceId);
    const from = slice === undefined ? undefined : sliceVoice(slice);
    return html`<div id="append-menu" class="comment-pop append-menu" popover="manual">
      <span class="dpk-label">${from === undefined ? m.appendMenuNext : m.appendMenuAfter(from.name)}</span>
      <div class="type-options">
        ${APPEND_TYPES.map(
          (type) =>
            html`<button
              class="type-chip"
              type="button"
              data-type=${type}
              style=${notePaletteStyle(type)}
              @click=${() => this.#appendNote(sliceId, type)}
            >
              ${m.noteTypeLabel(type)}
            </button>`,
        )}
      </div>
      <div class="pop-actions">
        <button
          class="dpk-btn"
          type="button"
          @click=${() => {
            this.mode = ES_IDLE;
            this.requestUpdate();
          }}
        >
          ${m.cancel}
        </button>
      </div>
    </div>`;
  }

  /** The empty state's only affordance: the first domain event of the wall. */
  #addFirstEvent(): void {
    const state = this.items();
    const id = createNoteId('new-event', allNoteIds(state));
    const ok = this.#dispatch(
      eventStormingAction.addElement(id, 'event', eventStormingMessages(this.locale).noteTypeLabel('event')),
    );
    if (!ok) {
      this.mode = ES_IDLE;
      this.requestUpdate();
      return;
    }
    this.select({ kind: 'note', id });
    // Straight into renaming: a fresh sticky note with a placeholder name is noise.
    this.mode = { kind: 'editing', noteId: id };
    this.requestUpdate();
  }

  /* ------------------------------------------------------------ mutations */

  #dispatch(input: ActionInput): boolean {
    const { target, payload } = input;
    if (typeof target === 'string') return false;
    return this.dispatchElementAction(input.type, [target.type, target.id], isActionPayload(payload) ? payload : {});
  }

  /** Dispatches every input in order; `true` only when every one was accepted. */
  #dispatchAll(inputs: readonly ActionInput[]): boolean {
    let ok = true;
    for (const input of inputs) if (!this.#dispatch(input)) ok = false;
    return ok;
  }
}

/** A fresh id for a note, not already in `taken`. */
const createNoteId = (prefix: string, taken: readonly string[]): string => freshId(prefix, taken);
/** A fresh id for a link, not already in `taken`. */
const createLinkId = (prefix: string, taken: readonly string[]): string => freshId(prefix, taken);
/** A fresh id for a bounded context, not already in `taken`. */
const createContextId = (prefix: string, taken: readonly string[]): string => freshId(prefix, taken);

const freshId = (prefix: string, taken: readonly string[]): string => {
  const used = new Set(taken);
  if (!used.has(prefix)) return prefix;
  let n = 2;
  while (used.has(`${prefix}-${n}`)) n += 1;
  return `${prefix}-${n}`;
};

export const defineEventStorming = (): void => {
  defineEsNoteCard();
  if (!customElements.get('dpk-event-storming')) customElements.define('dpk-event-storming', DpkEventStorming);
};
