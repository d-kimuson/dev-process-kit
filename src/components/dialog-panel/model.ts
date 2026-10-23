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
