import { clamp } from 'es-toolkit/math';

/**
 * The height a static canvas needs to show its whole content box at scale
 * <= 100%, for a figure embedded in the page's flow rather than a fixed-height
 * canvas. The scale is the width-fit one (`fit()`'s own `(width - 24)` margin),
 * and the height is that scaled content plus the 20px margin `fit()` leaves at
 * the top and bottom, so the viewport's fit needs no panning or zooming.
 * Without content the notice still needs room to sit. `minScale` is the
 * viewport's own lower bound, so the two can never drift.
 */
export const naturalCanvasHeight = (
  canvasWidth: number,
  content: { readonly width: number; readonly height: number } | null,
  minScale: number,
): number => {
  if (content === null || content.width <= 0 || content.height <= 0) return 160;
  const scale = clamp((canvasWidth - 24) / content.width, minScale, 1);
  return Math.ceil(content.height * scale + 40);
};

/** One element on the way from a wheel event's target up to the panel. */
export type ScrollBox = {
  readonly overflowX: string;
  readonly scrollLeft: number;
  readonly scrollWidth: number;
  readonly clientWidth: number;
  readonly overflowY: string;
  readonly scrollTop: number;
  readonly scrollHeight: number;
  readonly clientHeight: number;
};

/**
 * Whether a wheel turn of `(deltaX, deltaY)` scrolls something inside the
 * panel. While the panel covers the viewport nothing behind it is visible,
 * so a turn that scrolls nothing inside must not scroll the page either —
 * in either axis: a sideways turn at a box's left or right edge must not
 * chain into the browser's swipe back/forward navigation.
 */
export const scrollsInside = (path: readonly ScrollBox[], deltaX: number, deltaY: number): boolean =>
  path.some((box) => {
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (box.overflowX !== 'auto' && box.overflowX !== 'scroll') return false;
      if (box.scrollWidth <= box.clientWidth) return false;
      return deltaX > 0 ? box.scrollLeft + box.clientWidth < box.scrollWidth - 1 : deltaX < 0 && box.scrollLeft > 0;
    }
    if (box.overflowY !== 'auto' && box.overflowY !== 'scroll') return false;
    if (box.scrollHeight <= box.clientHeight) return false;
    return deltaY > 0 ? box.scrollTop + box.clientHeight < box.scrollHeight - 1 : deltaY < 0 && box.scrollTop > 0;
  });

/** The smallest height the resize grip leaves a panel. */
export const PANEL_MIN_HEIGHT = 160;

/** The panel height after dragging the grip `delta` pixels from `start`. */
export const draggedPanelHeight = (start: number, delta: number, min = PANEL_MIN_HEIGHT): number =>
  Math.max(min, Math.round(start + delta));

/** The panel height after a key on the focused grip, or `null` for a key it does not use. */
export const keyedPanelHeight = (
  current: number,
  key: string,
  shift: boolean,
  min = PANEL_MIN_HEIGHT,
): number | null => {
  const step = shift ? 96 : 24;
  if (key === 'ArrowDown') return draggedPanelHeight(current, step, min);
  if (key === 'ArrowUp') return draggedPanelHeight(current, -step, min);
  return null;
};
