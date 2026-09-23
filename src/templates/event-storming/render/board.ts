import { clamp } from 'es-toolkit/math';
import { html, nothing, svg, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';

import type { TemplateRenderContext } from '../../../core/shell/contracts';
import type { Viewport } from '../interactions';
import type { EventStormingState, NoteType } from '../model';

import { elementOf } from '../../../lib/dom/element';
import { NOTE_TYPE_LABELS, notePaletteStyle } from '../components/note-card';
import { buildSlices, planSliceBands, sliceArrows, type EsSlice, type SliceArrow } from '../layout';
import { noteCardModeOf, type EsGesture, type EsUiMode, type NoteIntent, type Point } from '../ui-mode';

export const SLOT_W = 132;
export const SLOT_H = 96;
const SLOT_GAP = 10;
/** Horizontal room inside a slice frame; the note's side rail lives in it. */
const SLICE_PAD_X = 24;
/** Vertical room inside a slice frame, above and below the notes. */
const SLICE_PAD_Y = 12;
const SLICE_H = SLOT_H + SLICE_PAD_Y * 2;
/** Breathing room between two slices of a band; connectors live in it. */
const ARROW_GAP = 46;
const ROW_PAD_X = 16;
/** Head room above a band: context labels and hotspot pins sit here. */
const ROW_TOP = 44;
/** Foot room below a band: detour arcs and the add-note chips dip into it. */
const ROW_BOTTOM = 40;
/** How far inside a slice edge a wrapped connection plugs in. */
const ENTRY_PAD = 16;
/** Half the connect-port button. */
const PORT_R = 13;

/** Wall padding: the bands and the arrow layer share this origin. */
const WALL_PAD = 8;
/** Vertical gap between two bands. */
const BAND_GAP = 6;

/** Hotspot pin: a smaller sticky hung over one note's top-right corner. */
const PIN_W = 92;
const PIN_H = 54;
/** Kept clear of the card's own ＋ホットスポット chip, which hugs that corner. */
const PIN_LIFT = 72;
/** Vertical step between several pins on the same note: never overlapping. */
const PIN_STEP = PIN_H + 4;
/** Head room a band needs so a note's stacked pins stay inside it. */
const bandHead = (pinsOnOneNote: number): number =>
  Math.max(ROW_TOP, PIN_LIFT + (pinsOnOneNote - 1) * PIN_STEP - SLICE_PAD_Y);

/** Note roles a hovered slice offers to fill in when it lacks them. */
const CHIP_TYPES: readonly NoteType[] = ['actor', 'command', 'aggregate', 'event', 'policy', 'readmodel', 'external'];

const sliceWidth = (noteCount: number): number => SLICE_PAD_X * 2 + noteCount * SLOT_W + (noteCount - 1) * SLOT_GAP;

/** How many hotspots hang on the busiest note of a slice (0 when there are none). */
const pinsPerNote = (slice: EsSlice | undefined): number => {
  if (slice === undefined) return 0;
  const counts = new Map<string, number>();
  for (const pin of slice.pins) counts.set(pin.targetId, (counts.get(pin.targetId) ?? 0) + 1);
  return Math.max(0, ...counts.values());
};

export type EsBoardHandlers = {
  readonly noteIntent: (noteId: string, intent: NoteIntent) => void;
  readonly addFirst: () => void;
  /** A hovered slice's chip was clicked: add the missing role. */
  readonly attachNote: (sliceId: string, type: NoteType) => void;
  readonly viewportPointerDown: (event: PointerEvent) => void;
  readonly viewportPointerMove: (event: PointerEvent) => void;
  readonly viewportPointerUp: (event: PointerEvent) => void;
  readonly viewportPointerCancel: (event: PointerEvent) => void;
  readonly viewportPointerLeave: (event: PointerEvent) => void;
  readonly viewportWheel: (event: WheelEvent) => void;
  readonly portPointerDown: (sliceId: string, event: PointerEvent) => void;
  readonly slicePointerDown: (sliceId: string, event: PointerEvent) => void;
  readonly zoomStep: (direction: 1 | -1) => void;
  readonly zoomFit: () => void;
  readonly zoomReset: () => void;
  readonly groupSelection: (point: Point) => void;
  readonly assignSelection: (contextId: string) => void;
  readonly stripSelectionContext: () => void;
  readonly clearSelection: () => void;
  /** A link stroke was clicked: select it (additive with shift/⌘/ctrl). */
  readonly linkClick: (linkId: string, additive: boolean) => void;
  /** Delete the current selection: links first, else the selected slices. */
  readonly deleteSelection: () => void;
  readonly keyDown: (event: KeyboardEvent) => void;
  readonly renameContext: (contextId: string, point: Point) => void;
  readonly dissolveContext: (contextId: string) => void;
};

export type EsBoardProps = {
  readonly context: TemplateRenderContext<EventStormingState>;
  readonly mode: EsUiMode;
  /** Pixel budget for one wrapped band of flows (connector gaps included). */
  readonly maxRowWidth: number;
  readonly viewport: Viewport;
  readonly gesture: EsGesture | undefined;
  readonly hoverSliceId: string | undefined;
  readonly selectedSliceIds: readonly string[];
  readonly selectedLinkIds: readonly string[];
  readonly handlers: EsBoardHandlers;
};

type BandGeometry = {
  readonly sliceIds: readonly string[];
  /** Wall-relative left offset: a continuation band sits under its source. */
  readonly x: number;
  readonly width: number;
  readonly height: number;
  /** Wall-absolute top edge of this band's canvas. */
  readonly y: number;
  /** Room above the slices for context labels and stacked hotspot pins. */
  readonly head: number;
  /** The arrow this band continues from the band above, when a wrap cut it. */
  readonly cutFrom: SliceArrow | undefined;
};

/** Everything the renderers need to know about where the slices sit. */
type WallGeometry = {
  readonly slices: readonly EsSlice[];
  readonly bands: readonly BandGeometry[];
  /** Slice id → left edge inside its band's canvas. */
  readonly xOf: ReadonlyMap<string, number>;
  /** Slice id → left edge in wall coordinates (padding excluded). */
  readonly absXOf: ReadonlyMap<string, number>;
  /** Slice id → index of the band it sits in. */
  readonly bandOf: ReadonlyMap<string, number>;
  readonly widthOf: ReadonlyMap<string, number>;
  readonly arrows: readonly SliceArrow[];
  /** Full wall size: bands and the arrow layer are placed inside it absolutely. */
  readonly width: number;
  readonly height: number;
};

const wallGeometry = (state: EventStormingState, slices: readonly EsSlice[], maxRowWidth: number): WallGeometry => {
  const widthOf = new Map(slices.map((slice) => [slice.id, sliceWidth(slice.notes.length)] as const));
  const arrows = sliceArrows(state, slices);
  const planned = planSliceBands(slices, arrows, {
    widthOf: (id) => widthOf.get(id) ?? 0,
    gapX: ARROW_GAP,
    padX: ROW_PAD_X,
    maxWidth: Math.max(maxRowWidth, sliceWidth(1)),
  });
  const xOf = new Map<string, number>();
  const absXOf = new Map<string, number>();
  const bandOf = new Map<string, number>();
  const sliceOf = new Map(slices.map((slice) => [slice.id, slice] as const));
  let y = WALL_PAD;
  const bands = planned.map((band, bandIndex): BandGeometry => {
    // A band cut off a run starts directly under the slice it continues from,
    // so the connection is a short vertical stroke instead of a detour.
    const cutAt = band.cutFrom === undefined ? undefined : absXOf.get(band.cutFrom.from);
    const bandX = cutAt === undefined ? 0 : Math.max(0, cutAt - ROW_PAD_X);
    let cursor = bandX + ROW_PAD_X;
    // Pins stack upward, so a note carrying several of them needs head room.
    const head = bandHead(Math.max(1, ...band.sliceIds.map((id) => pinsPerNote(sliceOf.get(id)))));
    for (const id of band.sliceIds) {
      xOf.set(id, cursor - bandX);
      absXOf.set(id, cursor);
      bandOf.set(id, bandIndex);
      cursor += (widthOf.get(id) ?? 0) + ARROW_GAP;
    }
    const height = head + SLICE_H + ROW_BOTTOM;
    const geometry: BandGeometry = {
      sliceIds: band.sliceIds,
      x: bandX,
      width: cursor - ARROW_GAP + ROW_PAD_X - bandX,
      height,
      y,
      head,
      cutFrom: band.cutFrom,
    };
    y += height + BAND_GAP;
    return geometry;
  });
  const last = bands.at(-1);
  return {
    slices,
    bands,
    xOf,
    absXOf,
    bandOf,
    widthOf,
    arrows,
    width: Math.max(0, ...bands.map((band) => band.x + band.width)) + WALL_PAD * 2,
    height: last === undefined ? WALL_PAD * 2 : last.y + last.height + WALL_PAD,
  };
};

export const renderEsBoard = (props: EsBoardProps): TemplateResult => {
  const { context, maxRowWidth, viewport, handlers } = props;
  const { state } = context;
  const dot = 24 * viewport.zoom;
  const surfaceStyle = `background-size:${dot}px ${dot}px;background-position:${viewport.panX}px ${viewport.panY}px`;
  if (state.elements.length === 0) {
    return html`<div class="board-viewport board-viewport--empty" style=${surfaceStyle}>
      <div class="empty">
        <h2>付箋がまだありません</h2>
        <p>イベントストーミングを開始しましょう。ドメインイベントを時系列に貼るところから始めます。</p>
        <button class="dpk-btn dpk-btn--accent" type="button" @click=${() => handlers.addFirst()}>
          ＋ 最初のイベント
        </button>
      </div>
    </div>`;
  }
  const slices = buildSlices(state);
  const geometry = wallGeometry(state, slices, maxRowWidth);
  return html`
    <div
      class="board-viewport${props.gesture !== undefined ? ' board-viewport--gesturing' : ''}"
      data-testid="es-viewport"
      tabindex="0"
      style=${surfaceStyle}
      @pointerdown=${handlers.viewportPointerDown}
      @pointermove=${handlers.viewportPointerMove}
      @pointerup=${handlers.viewportPointerUp}
      @pointercancel=${handlers.viewportPointerCancel}
      @pointerleave=${handlers.viewportPointerLeave}
      @wheel=${handlers.viewportWheel}
      @keydown=${handlers.keyDown}
    >
      <div
        class="board-content"
        style=${`transform:translate(${viewport.panX}px, ${viewport.panY}px) scale(${viewport.zoom})`}
      >
        <div class="wall" data-testid="es-wall" style=${`width:${geometry.width}px;height:${geometry.height}px`}>
          ${renderArrows(props, geometry)}
          ${geometry.bands.map((band, index) => renderBand(props, geometry, band, index))}
        </div>
      </div>
      ${renderGestureOverlay(props.gesture)} ${renderHud(state, slices)} ${renderZoomControls(props)}
      ${renderSelectionBar(props)}
    </div>
  `;
};

const sliceClass = (props: EsBoardProps, slice: EsSlice): string => {
  const classes = ['slice'];
  if (props.selectedSliceIds.includes(slice.id)) classes.push('slice--selected');
  const gesture = props.gesture;
  if (gesture?.kind === 'connect' && gesture.moved) {
    if (gesture.fromSliceId !== slice.id) classes.push('slice--candidate');
    if (gesture.targetSliceId === slice.id) classes.push('slice--target');
  }
  if (gesture?.kind === 'move-slice' && gesture.moved) {
    if (gesture.sliceId === slice.id) classes.push('slice--lifted');
    if (gesture.drop?.sliceId === slice.id) {
      classes.push(gesture.drop.side === 'before' ? 'slice--insert-before' : 'slice--insert-after');
    }
  }
  return classes.join(' ');
};

const renderBand = (
  props: EsBoardProps,
  geometry: WallGeometry,
  band: BandGeometry,
  bandIndex: number,
): TemplateResult => {
  const { context, mode, gesture, hoverSliceId, handlers } = props;
  const { navigation } = context;
  const bandSlices = band.sliceIds.flatMap((id) => geometry.slices.filter((slice) => slice.id === id));
  const rect = (slice: EsSlice): { x: number; y: number; w: number } => {
    return { x: geometry.xOf.get(slice.id) ?? 0, y: band.head, w: geometry.widthOf.get(slice.id) ?? 0 };
  };
  const noteCard = (note: EsSlice['notes'][number], style: string, compact = false): TemplateResult =>
    html`<dpk-internal-event-storming-note
      style=${style}
      .note=${note}
      .notes=${context.comments.filter((c) => c.target.type === 'element' && c.target.id === note.id)}
      .mode=${noteCardModeOf(mode, note.id)}
      ?focused=${navigation['note'] === note.id}
      ?compact=${compact}
      .onIntent=${(intent: NoteIntent) => handlers.noteIntent(note.id, intent)}
    ></dpk-internal-event-storming-note>`;
  return html`
    <section class="band" data-band=${bandIndex} style=${`left:${WALL_PAD + band.x}px;top:${band.y}px`}>
      <div class="band-canvas" style=${`width:${band.width}px;height:${band.height}px`}>
        ${renderContextRegions(props, geometry, bandIndex)}
        ${bandSlices.map((slice) => {
          const { x, y, w } = rect(slice);
          return html`<div
            class=${sliceClass(props, slice)}
            data-slice-id=${slice.id}
            style=${`left:${x}px;top:${y}px;width:${w}px;height:${SLICE_H}px`}
            @pointerdown=${(event: PointerEvent) => handlers.slicePointerDown(slice.id, event)}
          ></div>`;
        })}
        ${repeat(
          bandSlices.flatMap((slice) => slice.notes.map((note, slot) => ({ slice, note, slot }))),
          ({ note }) => note.id,
          ({ slice, note, slot }) => {
            const { x, y } = rect(slice);
            const noteX = x + SLICE_PAD_X + slot * (SLOT_W + SLOT_GAP);
            return noteCard(
              note,
              `${notePaletteStyle(note.type)};position:absolute;left:${noteX}px;top:${y + SLICE_PAD_Y}px;width:${SLOT_W}px;height:${SLOT_H}px;--es-tilt:${tiltOf(note.id)}deg;z-index:2`,
            );
          },
        )}
        ${repeat(
          bandSlices.flatMap((slice) => {
            const at = rect(slice);
            return slice.notes.flatMap((note, slot) => {
              const pins = slice.pins.filter((pin) => pin.targetId === note.id);
              return pins.map((pin, index) => ({ pin, slot, index, at }));
            });
          }),
          ({ pin }) => pin.note.id,
          ({ pin, slot, index, at }) => {
            const noteX = at.x + SLICE_PAD_X + slot * (SLOT_W + SLOT_GAP);
            const noteY = at.y + SLICE_PAD_Y;
            return noteCard(
              pin.note,
              `${notePaletteStyle(pin.note.type)};position:absolute;left:${noteX + SLOT_W - PIN_W - 6 - index * 10}px;` +
                `top:${noteY - PIN_LIFT - index * PIN_STEP}px;` +
                `width:${PIN_W}px;height:${PIN_H}px;--es-tilt:-2.4deg;z-index:3`,
              true,
            );
          },
        )}
        ${bandSlices.map((slice) => {
          const { x, y, w } = rect(slice);
          const on = hoverSliceId === slice.id || (gesture?.kind === 'connect' && gesture.fromSliceId === slice.id);
          return html`<button
            class="slice-port${on ? ' slice-port--on' : ''}"
            type="button"
            style=${`left:${x + w - PORT_R}px;top:${y + SLICE_H / 2 - PORT_R}px`}
            aria-label="続きを追加（種類を選んで追加 / ドラッグで他のスライスへ接続）"
            title="クリック: 続きの付箋を選んで追加 / ドラッグ: 他のスライスへ接続"
            @pointerdown=${(event: PointerEvent) => handlers.portPointerDown(slice.id, event)}
          >
            →
          </button>`;
        })}
        ${bandSlices.map((slice) => {
          if (hoverSliceId !== slice.id || gesture !== undefined) return nothing;
          const { x, y } = rect(slice);
          const present = new Set(slice.notes.map((note) => note.type));
          const missing = CHIP_TYPES.filter((type) => !present.has(type));
          return html`<div
            class="slice-chips"
            style=${`left:${x}px;top:${y + SLICE_H + 6}px`}
            @pointerdown=${(event: PointerEvent) => event.stopPropagation()}
          >
            ${missing.map(
              (type) =>
                html`<button class="slice-chip" type="button" @click=${() => handlers.attachNote(slice.id, type)}>
                  ＋ ${NOTE_TYPE_LABELS[type]}
                </button>`,
            )}
          </div>`;
        })}
      </div>
    </section>
  `;
};

/* ------------------------------------------------------- bounded contexts */

const renderContextRegions = (
  props: EsBoardProps,
  geometry: WallGeometry,
  bandIndex: number,
): TemplateResult | typeof nothing => {
  const { context, handlers } = props;
  const regions = context.state.contexts.flatMap((boundedContext, index) => {
    const members = geometry.slices.filter((slice) => slice.contextId === boundedContext.id);
    const placed = members.flatMap((slice) => {
      const x = geometry.xOf.get(slice.id);
      const band = geometry.bandOf.get(slice.id);
      return x === undefined || band === undefined ? [] : [{ x, band, width: geometry.widthOf.get(slice.id) ?? 0 }];
    });
    const inBand = placed.filter((entry) => entry.band === bandIndex);
    if (inBand.length === 0) return [];
    const left = Math.min(...inBand.map((entry) => entry.x)) - 10;
    const right = Math.max(...inBand.map((entry) => entry.x + entry.width)) + 10;
    const top = 14;
    const bottom = (geometry.bands[bandIndex]?.head ?? ROW_TOP) + SLICE_H + 12;
    const before = placed.some((entry) => entry.band < bandIndex) ? '… ' : '';
    const after = placed.some((entry) => entry.band > bandIndex) ? ' …' : '';
    const hue = String(index % 5);
    return [
      html`<div
          class="context-region"
          data-hue=${hue}
          style=${`left:${left}px;top:${top}px;width:${right - left}px;height:${bottom - top}px`}
          title=${boundedContext.description ?? boundedContext.name}
        ></div>
        <div
          class="context-label"
          data-hue=${hue}
          style=${`left:${left + 10}px;top:${top}px`}
          @pointerdown=${(event: PointerEvent) => event.stopPropagation()}
        >
          <button
            class="context-label-name"
            type="button"
            title="クリックして名前を変更"
            @click=${(event: MouseEvent) =>
              handlers.renameContext(boundedContext.id, { x: event.clientX, y: event.clientY })}
          >
            ${before}${boundedContext.name}${after}
          </button>
          <button
            class="context-label-x"
            type="button"
            aria-label=${`コンテキスト「${boundedContext.name}」を解体`}
            title="コンテキストを解体（付箋は残ります）"
            @click=${() => handlers.dissolveContext(boundedContext.id)}
          >
            ✕
          </button>
        </div>`,
    ];
  });
  return regions.length > 0 ? html`${regions}` : nothing;
};

/* -------------------------------------------------------- gesture overlay */

const renderGestureOverlay = (gesture: EsGesture | undefined): TemplateResult | typeof nothing => {
  if (gesture === undefined || !gesture.moved) return nothing;
  if (gesture.kind === 'connect') {
    return html`<svg class="gesture-layer" aria-hidden="true">
      ${svg`<path class="connect-line" d=${`M ${gesture.start.x} ${gesture.start.y} L ${gesture.current.x} ${gesture.current.y}`}></path>
      <circle class="connect-tip" cx=${gesture.current.x} cy=${gesture.current.y} r="5"></circle>`}
    </svg>`;
  }
  if (gesture.kind === 'select') {
    const left = Math.min(gesture.start.x, gesture.current.x);
    const top = Math.min(gesture.start.y, gesture.current.y);
    const width = Math.abs(gesture.current.x - gesture.start.x);
    const height = Math.abs(gesture.current.y - gesture.start.y);
    return html`<div
      class="select-rect"
      style=${`left:${left}px;top:${top}px;width:${width}px;height:${height}px`}
    ></div>`;
  }
  return nothing;
};

/* ------------------------------------------------------------ floating UI */

const renderHud = (state: EventStormingState, slices: readonly EsSlice[]): TemplateResult => {
  return html`<div class="board-hud">
    <span>${state.elements.length} 付箋</span>
    <span>${slices.length} スライス</span>
    <span>${state.contexts.length} コンテキスト</span>
    <span class="board-hint">ホイール: 移動 · ピンチ: ズーム · 背景ドラッグ: 範囲選択</span>
  </div>`;
};

const renderZoomControls = (props: EsBoardProps): TemplateResult => {
  const { viewport, handlers } = props;
  return html`<div class="board-zoom" @pointerdown=${(event: PointerEvent) => event.stopPropagation()}>
    <button type="button" aria-label="縮小" @click=${() => handlers.zoomStep(-1)}>−</button>
    <button type="button" class="board-zoom-pct" title="100% に戻す" @click=${() => handlers.zoomReset()}>
      ${Math.round(viewport.zoom * 100)}%
    </button>
    <button type="button" aria-label="拡大" @click=${() => handlers.zoomStep(1)}>＋</button>
    <button type="button" aria-label="全体を表示" title="全体を表示" @click=${() => handlers.zoomFit()}>⛶</button>
  </div>`;
};

const renderSelectionBar = (props: EsBoardProps): TemplateResult | typeof nothing => {
  const { context, selectedSliceIds, selectedLinkIds, handlers } = props;
  if (selectedLinkIds.length === 0 && selectedSliceIds.length === 0) return nothing;
  const contexts = context.state.contexts;
  if (selectedLinkIds.length > 0) {
    return html`<div class="board-selection" @pointerdown=${(event: PointerEvent) => event.stopPropagation()}>
      <span class="board-selection-count">${selectedLinkIds.length} 本のリンクを選択中</span>
      <button class="dpk-btn dpk-btn--accent" type="button" @click=${() => handlers.deleteSelection()}>
        リンクを削除
      </button>
      <span class="board-selection-hint">Delete でも削除できます</span>
      <button class="dpk-icon-btn" type="button" aria-label="選択解除" @click=${() => handlers.clearSelection()}>
        ✕
      </button>
    </div>`;
  }
  return html`<div class="board-selection" @pointerdown=${(event: PointerEvent) => event.stopPropagation()}>
    <span class="board-selection-count">${selectedSliceIds.length} スライスを選択中</span>
    <button
      class="dpk-btn dpk-btn--accent"
      type="button"
      @click=${(event: MouseEvent) => handlers.groupSelection({ x: event.clientX, y: event.clientY })}
    >
      コンテキストにまとめる
    </button>
    ${
      contexts.length > 0
        ? html`<select
            class="dpk-select"
            aria-label="既存コンテキストへ追加"
            @change=${(event: Event) => {
              const select = elementOf(event.target, HTMLSelectElement);
              if (select === null) return;
              if (select.value !== '') handlers.assignSelection(select.value);
              select.value = '';
            }}
          >
            <option value="" selected>既存へ追加…</option>
            ${contexts.map((c) => html`<option value=${c.id}>${c.name}</option>`)}
          </select>`
        : nothing
    }
    <button class="dpk-btn" type="button" @click=${() => handlers.stripSelectionContext()}>コンテキスト解除</button>
    <button class="dpk-btn" type="button" @click=${() => handlers.deleteSelection()}>削除</button>
    <button class="dpk-icon-btn" type="button" aria-label="選択解除" @click=${() => handlers.clearSelection()}>
      ✕
    </button>
  </div>`;
};

/* ------------------------------------------------------------------ arrows */

type Pt = {
  readonly x: number;
  readonly y: number;
};

type Curve = {
  readonly d: string;
  readonly mid: Pt;
};

/** One slice on the wall, in wall coordinates. */
type SliceBox = {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly band: number;
};

const cubic = (p0: Pt, p1: Pt, p2: Pt, p3: Pt): Curve => {
  return {
    d: `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${p3.x} ${p3.y}`,
    mid: { x: (p0.x + 3 * p1.x + 3 * p2.x + p3.x) / 8, y: (p0.y + 3 * p1.y + 3 * p2.y + p3.y) / 8 },
  };
};

const arrowDef = (): TemplateResult => {
  return svg`<marker id="es-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
    <path d="M0,0 L8,4 L0,8 z"></path>
  </marker>`;
};

/**
 * The arrow layer spans the whole wall, in wall coordinates. Neighbours read as
 * a straight stroke through the gap between them; an arrow that skips over
 * slices arcs under its band, and one that wraps arcs through the wall's left
 * gutter — never a marker instead of a line. Every stroke carries an invisible
 * hit path, so a mistaken connection can be picked and deleted.
 */
const renderArrows = (props: EsBoardProps, geometry: WallGeometry): TemplateResult => {
  const marker = 'url(#es-arrow)';
  const parts: TemplateResult[] = [];
  const boxAt = (sliceId: string): SliceBox | undefined => {
    const x = geometry.absXOf.get(sliceId);
    const bandIndex = geometry.bandOf.get(sliceId);
    const band = bandIndex === undefined ? undefined : geometry.bands[bandIndex];
    if (x === undefined || bandIndex === undefined || band === undefined) return undefined;
    return { x: WALL_PAD + x, y: band.y + band.head, w: geometry.widthOf.get(sliceId) ?? 0, band: bandIndex };
  };
  const bandBottom = (bandIndex: number): number => {
    const band = geometry.bands[bandIndex];
    return band === undefined ? 0 : band.y + band.height;
  };
  const push = (arrow: SliceArrow, d: string, label: Pt, anchor: 'middle' | 'start' | 'end'): void => {
    parts.push(
      svg`<path class="link-hit" d=${d} @pointerdown=${(event: PointerEvent) => event.stopPropagation()} @click=${(
        event: MouseEvent,
      ) => props.handlers.linkClick(arrow.id, event.shiftKey || event.metaKey || event.ctrlKey)}></path>`,
    );
    const selected = props.selectedLinkIds.includes(arrow.id) ? ' is-selected' : '';
    parts.push(svg`<path class="link-path${selected}" d=${d} marker-end=${marker}></path>`);
    if (arrow.label === undefined) return;
    const dx = { start: 6, end: -6, middle: 0 }[anchor];
    parts.push(
      svg`<text class="link-label" x=${label.x + dx} y=${label.y - 6} text-anchor=${anchor}>${arrow.label}</text>`,
    );
  };
  for (const arrow of geometry.arrows) {
    const from = boxAt(arrow.from);
    const to = boxAt(arrow.to);
    if (from === undefined || to === undefined) continue;
    if (from.band === to.band) {
      const forward = to.x >= from.x + from.w;
      const apart = forward ? to.x - (from.x + from.w) : from.x - (to.x + to.w);
      if (apart <= ARROW_GAP + 2) {
        const y = from.y + SLICE_H / 2;
        const start = forward ? from.x + from.w : from.x;
        const end = forward ? to.x : to.x + to.w;
        push(arrow, `M ${start} ${y} L ${end} ${y}`, { x: (start + end) / 2, y }, 'middle');
        continue;
      }
      const curve = bandArc(from, to, bandBottom(from.band) - ROW_BOTTOM / 2);
      push(arrow, curve.d, curve.mid, 'middle');
      continue;
    }
    // Wrapped: drop (or rise) straight into the target from the gap between the
    // two bands, next to its edge, instead of travelling back to the wall margin.
    const lower = from.y < to.y;
    const startX = from.x + ENTRY_PAD;
    const endX = clamp(startX, to.x + ENTRY_PAD, to.x + to.w - ENTRY_PAD);
    const start = { x: startX, y: lower ? from.y + SLICE_H : from.y };
    const end = { x: endX, y: lower ? to.y : to.y + SLICE_H };
    const gapY = lower
      ? (bandBottom(from.band) + (geometry.bands[to.band]?.y ?? 0)) / 2
      : (bandBottom(to.band) + (geometry.bands[from.band]?.y ?? 0)) / 2;
    push(
      arrow,
      roundedPath([start, { x: start.x, y: gapY }, { x: end.x, y: gapY }, end]),
      { x: end.x - 6, y: gapY },
      'end',
    );
  }
  return svg`<svg class="links-layer" width=${geometry.width} height=${geometry.height}>
    <defs>${arrowDef()}</defs>
    ${parts}
  </svg>`;
};

/**
 * Routes an arrow that skips over its neighbours: it leaves and enters through
 * the bottom edges and dips under the whole band, so the stroke stays off the
 * slices it passes.
 */
const bandArc = (from: SliceBox, to: SliceBox, dip: number): Curve => {
  const bottom = from.y + SLICE_H;
  if (to.x >= from.x + from.w) {
    const start = { x: from.x + from.w - 18, y: bottom };
    const end = { x: to.x + 18, y: bottom };
    return cubic(start, { x: start.x + 48, y: dip }, { x: end.x - 48, y: dip }, end);
  }
  const start = { x: from.x + 18, y: bottom };
  const end = { x: to.x + to.w - 18, y: bottom };
  return cubic(start, { x: start.x - 48, y: dip }, { x: end.x + 48, y: dip }, end);
};

/**
 * An orthogonal polyline with rounded corners: the route a wrapped connection
 * takes through the wall's gutters.
 */
const roundedPath = (points: readonly Pt[], radius = 10): string => {
  let d = `M ${points[0]?.x ?? 0} ${points[0]?.y ?? 0}`;
  for (let i = 1; i < points.length - 1; i += 1) {
    const previous = points[i - 1];
    const corner = points[i];
    const next = points[i + 1];
    if (previous === undefined || corner === undefined || next === undefined) continue;
    const inX = Math.sign(corner.x - previous.x);
    const inY = Math.sign(corner.y - previous.y);
    const outX = Math.sign(next.x - corner.x);
    const outY = Math.sign(next.y - corner.y);
    const inLength = Math.hypot(corner.x - previous.x, corner.y - previous.y);
    const outLength = Math.hypot(next.x - corner.x, next.y - corner.y);
    const r = Math.max(0, Math.min(radius, inLength / 2, outLength / 2));
    d +=
      ` L ${corner.x - inX * r} ${corner.y - inY * r}` +
      ` Q ${corner.x} ${corner.y} ${corner.x + outX * r} ${corner.y + outY * r}`;
  }
  const last = points.at(-1);
  return last === undefined ? d : `${d} L ${last.x} ${last.y}`;
};

/** Deterministic sticky-note tilt so the wall looks hand-placed, not jittery. */
const tiltOf = (id: string): number => {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) % 997;
  return ((hash % 17) - 8) * 0.09;
};
