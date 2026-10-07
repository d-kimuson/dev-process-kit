/**
 * Pure canvas geometry: the box of everything on the board, where a connector
 * leaves and enters its items, and what lies under a point. Everything here is
 * in canvas coordinates.
 */
import type { WbConnectorRoute, WbItem, WhiteboardState } from './model';

export type Point = { readonly x: number; readonly y: number };
export type Rect = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };

/** The box around every item, or `null` for an empty board. */
export const boardBounds = (items: readonly Rect[]): Rect | null => {
  if (items.length === 0) return null;
  const left = Math.min(...items.map((item) => item.x));
  const top = Math.min(...items.map((item) => item.y));
  const right = Math.max(...items.map((item) => item.x + item.w));
  const bottom = Math.max(...items.map((item) => item.y + item.h));
  return { x: left, y: top, w: right - left, h: bottom - top };
};

/** Frames are painted first, so everything else stays on top of the area it sits in. */
export const paintOrder = (state: WhiteboardState): readonly WbItem[] => [
  ...state.items.filter((item) => item.kind === 'frame'),
  ...state.items.filter((item) => item.kind !== 'frame'),
];

const isEllipse = (item: WbItem): boolean => item.kind === 'shape' && item.shape === 'ellipse';

/**
 * Where a ray from the item's center towards `toward` crosses the item's
 * outline (an ellipse for an elliptic shape, the box for everything else).
 */
export const outlinePoint = (item: WbItem, toward: Point): Point => {
  const cx = item.x + item.w / 2;
  const cy = item.y + item.h / 2;
  const dx = toward.x - cx;
  const dy = toward.y - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const hw = item.w / 2;
  const hh = item.h / 2;
  const t = isEllipse(item)
    ? 1 / Math.sqrt((dx / hw) ** 2 + (dy / hh) ** 2)
    : Math.min(dx === 0 ? Infinity : hw / Math.abs(dx), dy === 0 ? Infinity : hh / Math.abs(dy));
  return { x: cx + dx * t, y: cy + dy * t };
};

export const centerOf = (rect: Rect): Point => ({ x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 });

export type ConnectorGeometry = {
  readonly start: Point;
  readonly end: Point;
  /** Where the label sits: halfway along the visible stroke. */
  readonly mid: Point;
};

/** A straight stroke from outline to outline, aimed center to center. */
export const connectorGeometry = (from: WbItem, to: WbItem): ConnectorGeometry => {
  const start = outlinePoint(from, centerOf(to));
  const end = outlinePoint(to, centerOf(from));
  return { start, end, mid: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 } };
};

export type ConnectorPath = {
  /** The SVG path data of the stroke. */
  readonly d: string;
  /** Where the label sits: the middle of the stroke. */
  readonly mid: Point;
};

const xy = (point: Point): string => `${point.x} ${point.y}`;

/**
 * The stroke for a route. A straight line runs outline to outline; an elbow
 * and an S-curve leave and enter through the facing sides (left/right when the
 * items are further apart across than down, top/bottom otherwise) and turn,
 * or bend, halfway between them.
 */
export const connectorPath = (from: WbItem, to: WbItem, route: WbConnectorRoute): ConnectorPath => {
  if (route === 'straight') {
    const { start, end, mid } = connectorGeometry(from, to);
    return { d: `M ${xy(start)} L ${xy(end)}`, mid };
  }
  const a = centerOf(from);
  const b = centerOf(to);
  const across = Math.abs(b.x - a.x) >= Math.abs(b.y - a.y);
  const forward = across ? b.x >= a.x : b.y >= a.y;
  const side = (item: WbItem, leading: boolean): Point => {
    const center = centerOf(item);
    return across
      ? { x: leading ? item.x + item.w : item.x, y: center.y }
      : { x: center.x, y: leading ? item.y + item.h : item.y };
  };
  const start = side(from, forward);
  const end = side(to, !forward);
  const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  const bend1 = across ? { x: mid.x, y: start.y } : { x: start.x, y: mid.y };
  const bend2 = across ? { x: mid.x, y: end.y } : { x: end.x, y: mid.y };
  const d =
    route === 'elbow'
      ? `M ${xy(start)} L ${xy(bend1)} L ${xy(bend2)} L ${xy(end)}`
      : `M ${xy(start)} C ${xy(bend1)} ${xy(bend2)} ${xy(end)}`;
  return { d, mid };
};

const inside = (rect: Rect, point: Point): boolean =>
  point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;

/**
 * The size that holds `overflow` more of an item's content: taller by just
 * that much, the width kept. `undefined` when it already fits.
 */
export const grownToHold = (item: Rect, overflow: number): { w: number; h: number } | undefined =>
  overflow > 0.5 ? { w: item.w, h: Math.ceil(item.h + overflow) } : undefined;

/** The frames whose area holds a point, innermost (smallest) first. */
export const framesAt = (state: WhiteboardState, point: Point): readonly WbItem[] =>
  state.items.filter((item) => item.kind === 'frame' && inside(item, point)).sort((a, b) => a.w * a.h - b.w * b.h);

/**
 * The topmost item under a point: anything painted over a frame wins, and of
 * nested frames the innermost one. `except` skips the item being dragged.
 */
export const itemAt = (state: WhiteboardState, point: Point, except?: string): WbItem | undefined => {
  const order = paintOrder(state);
  for (let index = order.length - 1; index >= 0; index -= 1) {
    const item = order[index];
    if (item === undefined || item.id === except || item.kind === 'frame') continue;
    if (inside(item, point)) return item;
  }
  let frame: WbItem | undefined;
  for (const item of order) {
    if (item.kind !== 'frame' || item.id === except || !inside(item, point)) continue;
    if (frame === undefined || item.w * item.h < frame.w * frame.h) frame = item;
  }
  return frame;
};

/** The box spanned by two corners, whichever way they were dragged out. */
export const rectBetween = (a: Point, b: Point): Rect => ({
  x: Math.min(a.x, b.x),
  y: Math.min(a.y, b.y),
  w: Math.abs(a.x - b.x),
  h: Math.abs(a.y - b.y),
});

const encloses = (outer: Rect, inner: Rect): boolean =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.w <= outer.x + outer.w &&
  inner.y + inner.h <= outer.y + outer.h;

/**
 * What a dragged-out selection area picks, in `items` order: anything it
 * touches, but a frame only when the area holds it whole — a frame is the
 * ground the reader starts the drag on, not a target.
 */
export const itemsInRect = (state: WhiteboardState, rect: Rect): readonly WbItem[] =>
  state.items.filter((item) => (item.kind === 'frame' ? encloses(rect, item) : overlaps(rect, item, 0)));

export const overlaps = (a: Rect, b: Rect, gap: number): boolean =>
  a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;

/**
 * Where a new box of `box`'s size lands near `box`: there if it covers
 * nothing, else the nearest free spot on rings around it. Frames are areas to
 * drop things into, so they only stand in the way of a new frame (which would
 * otherwise swallow what it lands on). Falls back to `box` itself.
 */
export const freeSpot = (state: WhiteboardState, box: Rect, avoidFrames = false, gap = 16, rings = 6): Point => {
  const obstacles = avoidFrames ? state.items : state.items.filter((item) => item.kind !== 'frame');
  const free = (candidate: Rect): boolean => !obstacles.some((item) => overlaps(candidate, item, gap));
  if (free(box)) return { x: box.x, y: box.y };
  const stepX = box.w + gap;
  const stepY = box.h + gap;
  for (let ring = 1; ring <= rings; ring += 1) {
    const candidates: Point[] = [];
    for (let dy = -ring; dy <= ring; dy += 1) {
      for (let dx = -ring; dx <= ring; dx += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) === ring)
          candidates.push({ x: box.x + dx * stepX, y: box.y + dy * stepY });
      }
    }
    // Nearest first, so the new box stays where the reader is looking.
    candidates.sort((a, b) => Math.hypot(a.x - box.x, a.y - box.y) - Math.hypot(b.x - box.x, b.y - box.y));
    const spot = candidates.find((candidate) => free({ ...box, ...candidate }));
    if (spot !== undefined) return spot;
  }
  return { x: box.x, y: box.y };
};
