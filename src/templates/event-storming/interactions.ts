/**
 * Pure geometry for the board's pointer interactions: pan/zoom arithmetic,
 * hit-testing against measured slice rects, and the MOVE_ELEMENT batch that
 * reorders a whole slice. The element wires these to pointer events.
 */
import { clamp } from 'es-toolkit/math';
import { isEqual } from 'es-toolkit/predicate';

export type Viewport = {
  readonly panX: number;
  readonly panY: number;
  readonly zoom: number;
};

export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 2;

export const panBy = (viewport: Viewport, dx: number, dy: number): Viewport => {
  return { ...viewport, panX: viewport.panX + dx, panY: viewport.panY + dy };
};

/** Zooms by `factor` while the world point under the cursor stays put. */
export const zoomAt = (viewport: Viewport, cursorX: number, cursorY: number, factor: number): Viewport => {
  const zoom = clamp(viewport.zoom * factor, ZOOM_MIN, ZOOM_MAX);
  const worldX = (cursorX - viewport.panX) / viewport.zoom;
  const worldY = (cursorY - viewport.panY) / viewport.zoom;
  return { panX: cursorX - worldX * zoom, panY: cursorY - worldY * zoom, zoom };
};

export type Size = {
  readonly width: number;
  readonly height: number;
};

/** Centers the content in the view, shrinking (never enlarging) it to fit. */
export const fitViewport = (content: Size, view: Size, padding: number): Viewport => {
  const availableW = Math.max(1, view.width - padding * 2);
  const availableH = Math.max(1, view.height - padding * 2);
  const zoom = Math.max(
    ZOOM_MIN,
    Math.min(1, availableW / Math.max(1, content.width), availableH / Math.max(1, content.height)),
  );
  return {
    panX: (view.width - content.width * zoom) / 2,
    panY: (view.height - content.height * zoom) / 2,
    zoom,
  };
};

/**
 * Keeps the wall on screen: the content box grown by `buffer` may not be panned
 * out of the view, and content smaller than the view is centered on that axis.
 * The diagram viewport constrains its pan the same way.
 */
export const constrainViewport = (viewport: Viewport, content: Size, view: Size, buffer: number): Viewport => {
  const axis = (offset: number, start: number, size: number, viewportSize: number): number => {
    const scaled = size * viewport.zoom;
    if (scaled <= viewportSize) return (viewportSize - scaled) / 2 - start * viewport.zoom;
    return Math.min(-start * viewport.zoom, Math.max(viewportSize - (start + size) * viewport.zoom, offset));
  };
  return {
    zoom: viewport.zoom,
    panX: axis(viewport.panX, -buffer, content.width + buffer * 2, view.width),
    panY: axis(viewport.panY, -buffer, content.height + buffer * 2, view.height),
  };
};

/* ------------------------------------------------------------- hit testing */

export type Rect = {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
};

export type IdRect = {
  readonly id: string;
  readonly rect: Rect;
};

const contains = (rect: Rect, x: number, y: number): boolean => {
  return x >= rect.left && x <= rect.left + rect.width && y >= rect.top && y <= rect.top + rect.height;
};

/** The id whose rect contains the point; later entries paint on top and win. */
export const hitRect = (rects: readonly IdRect[], x: number, y: number): string | undefined => {
  for (let i = rects.length - 1; i >= 0; i -= 1) {
    const entry = rects[i];
    if (entry !== undefined && contains(entry.rect, x, y)) return entry.id;
  }
  return undefined;
};

/** Which side of a hovered slice a drop lands on: left half before, right after. */
export const dropSide = (rect: Rect, x: number): 'before' | 'after' => {
  return x < rect.left + rect.width / 2 ? 'before' : 'after';
};

/** Ids whose rects intersect the selection rectangle, in paint order. */
export const rectsInBand = (rects: readonly IdRect[], band: Rect): readonly string[] => {
  return rects
    .filter(
      ({ rect }) =>
        rect.left < band.left + band.width &&
        band.left < rect.left + rect.width &&
        rect.top < band.top + band.height &&
        band.top < rect.top + rect.height,
    )
    .map(({ id }) => id);
};

/* -------------------------------------------------------------- slice move */

export type MoveStep = {
  readonly id: string;
  readonly after: string | null;
};

/**
 * The MOVE_ELEMENT batch that puts a whole slice before/after another one.
 * Slice order derives from the first appearance of any member, so every
 * member moves: the first lands after the element preceding the insertion
 * point, and the rest chain behind it.
 */
export const sliceMovePlan = (
  order: readonly string[],
  movingIds: readonly string[],
  targetIds: readonly string[],
  side: 'before' | 'after',
): readonly MoveStep[] => {
  const moving = new Set(movingIds);
  if (targetIds.some((id) => moving.has(id))) return [];
  const rest = order.filter((id) => !moving.has(id));
  const targetIndexes = targetIds.map((id) => rest.indexOf(id)).filter((index) => index >= 0);
  if (targetIndexes.length === 0) return [];
  const insertIndex = side === 'before' ? Math.min(...targetIndexes) : Math.max(...targetIndexes) + 1;
  const steps: MoveStep[] = [];
  let after: string | null = rest[insertIndex - 1] ?? null;
  for (const id of order) {
    if (!moving.has(id)) continue;
    steps.push({ id, after });
    after = id;
  }
  return steps;
};

/**
 * `sliceMovePlan` minus the plans that are already satisfied: a connect gesture
 * must not record draft actions that change nothing.
 */
export const sliceMoveSteps = (
  order: readonly string[],
  movingIds: readonly string[],
  targetIds: readonly string[],
  side: 'before' | 'after',
): readonly MoveStep[] => {
  const plan = sliceMovePlan(order, movingIds, targetIds, side);
  if (plan.length === 0) return plan;
  const next = [...order];
  for (const step of plan) {
    const at = next.indexOf(step.id);
    const member = at < 0 ? undefined : next[at];
    if (member === undefined) continue;
    next.splice(at, 1);
    next.splice(step.after === null ? 0 : next.indexOf(step.after) + 1, 0, member);
  }
  return isEqual(next, order) ? [] : plan;
};
