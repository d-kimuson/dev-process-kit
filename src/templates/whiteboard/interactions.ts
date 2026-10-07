/**
 * Pure pan / zoom arithmetic for the board. A viewport maps a canvas point `p`
 * to the screen point `p * zoom + (x, y)`, relative to the canvas element.
 */
import { clamp } from 'es-toolkit/math';

import type { Point, Rect } from './layout';

export type Viewport = { readonly x: number; readonly y: number; readonly zoom: number };
export type Size = { readonly width: number; readonly height: number };

export const ZOOM_MIN = 0.1;
export const ZOOM_MAX = 2.5;
export const INITIAL_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };

/** Screen pixels of the board that always stay in view, so the reader cannot pan it away. */
const KEEP_VISIBLE = 96;

export const toCanvas = (viewport: Viewport, screen: Point): Point => ({
  x: (screen.x - viewport.x) / viewport.zoom,
  y: (screen.y - viewport.y) / viewport.zoom,
});

export const toScreen = (viewport: Viewport, canvas: Point): Point => ({
  x: canvas.x * viewport.zoom + viewport.x,
  y: canvas.y * viewport.zoom + viewport.y,
});

export const panBy = (viewport: Viewport, dx: number, dy: number): Viewport => ({
  ...viewport,
  x: viewport.x + dx,
  y: viewport.y + dy,
});

/** Zooms by `factor` while the canvas point under `at` stays where it is. */
export const zoomAt = (viewport: Viewport, at: Point, factor: number): Viewport => {
  const zoom = clamp(viewport.zoom * factor, ZOOM_MIN, ZOOM_MAX);
  const anchor = toCanvas(viewport, at);
  return { zoom, x: at.x - anchor.x * zoom, y: at.y - anchor.y * zoom };
};

/** Centers `rect` in the view, as large as fits but never above `maxZoom`. */
export const fitRect = (rect: Rect, view: Size, padding = 48, maxZoom = 1): Viewport => {
  const width = Math.max(1, view.width - padding * 2);
  const height = Math.max(1, view.height - padding * 2);
  const zoom = clamp(Math.min(width / Math.max(1, rect.w), height / Math.max(1, rect.h)), ZOOM_MIN, maxZoom);
  return {
    zoom,
    x: view.width / 2 - (rect.x + rect.w / 2) * zoom,
    y: view.height / 2 - (rect.y + rect.h / 2) * zoom,
  };
};

/**
 * The canvas is open-ended, but not endless: the reader may pan anywhere as
 * long as a strip of the board stays on screen, so it can never get lost.
 */
export const constrainViewport = (viewport: Viewport, board: Rect | null, view: Size): Viewport => {
  if (board === null || view.width <= 0 || view.height <= 0) return viewport;
  const axis = (offset: number, start: number, size: number, extent: number): number => {
    const keep = Math.min(KEEP_VISIBLE, extent / 2);
    const min = keep - (start + size) * viewport.zoom;
    const max = extent - keep - start * viewport.zoom;
    return clamp(offset, Math.min(min, max), Math.max(min, max));
  };
  return {
    zoom: viewport.zoom,
    x: axis(viewport.x, board.x, board.w, view.width),
    y: axis(viewport.y, board.y, board.h, view.height),
  };
};

/**
 * The view after bringing `rect` into it: unchanged when the rect is already
 * on screen (with `margin` to spare), else centered on it at the same zoom.
 */
export const revealRect = (viewport: Viewport, rect: Rect, view: Size, margin = 24): Viewport => {
  const left = rect.x * viewport.zoom + viewport.x;
  const top = rect.y * viewport.zoom + viewport.y;
  const right = left + rect.w * viewport.zoom;
  const bottom = top + rect.h * viewport.zoom;
  if (left >= margin && top >= margin && right <= view.width - margin && bottom <= view.height - margin)
    return viewport;
  return {
    zoom: viewport.zoom,
    x: view.width / 2 - (rect.x + rect.w / 2) * viewport.zoom,
    y: view.height / 2 - (rect.y + rect.h / 2) * viewport.zoom,
  };
};

export const sameViewport = (a: Viewport, b: Viewport): boolean => a.x === b.x && a.y === b.y && a.zoom === b.zoom;
