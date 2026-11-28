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

/** One measured width of a static canvas, and the height it needed. */
export type StaticCanvasSample = { readonly width: number; readonly height: number };

/**
 * What the static sizer remembers between measurements: the last two widths
 * it applied, and — once a width has alternated back to the one from two
 * syncs ago — the frozen pair and the larger of its two heights.
 */
export type StaticCanvasState = {
  readonly samples: readonly StaticCanvasSample[];
  readonly settled: { readonly widths: readonly [number, number]; readonly height: number } | null;
};

export const EMPTY_STATIC_CANVAS: StaticCanvasState = { samples: [], settled: null };

export type StaticCanvasResolution = { readonly state: StaticCanvasState; readonly height: number };

/**
 * Picks the height a static canvas should take for the width just measured.
 *
 * The width can change on its own for a reason the content did not cause: a
 * classic page scrollbar appearing or disappearing shifts it by ~15px, which
 * changes the fitted scale and therefore the natural height, which can bring
 * the scrollbar back — a loop. The rule that ends it: when the new width is
 * the one from two syncs ago, the width is oscillating between two values, so
 * keep the larger height (the one that fits the wider of the pair) and stop
 * changing it while either of those widths comes back. A genuinely different
 * width ends the freeze and starts a new pair.
 */
export const resolveStaticCanvasSize = (
  state: StaticCanvasState,
  width: number,
  height: number,
): StaticCanvasResolution => {
  const settled = state.settled;
  if (settled !== null) {
    if (width === settled.widths[0] || width === settled.widths[1]) {
      return { state, height: settled.height };
    }
    return { state: { samples: [...state.samples, { width, height }].slice(-2), settled: null }, height };
  }
  const twoAgo = state.samples[state.samples.length - 2];
  if (twoAgo !== undefined && width === twoAgo.width) {
    const previous = state.samples[state.samples.length - 1];
    // `twoAgo` exists, so the history has a last entry too; the guard keeps
    // the types honest without asserting.
    if (previous === undefined) return { state, height };
    const stable = Math.max(height, previous.height);
    return {
      state: { samples: state.samples, settled: { widths: [twoAgo.width, previous.width], height: stable } },
      height: stable,
    };
  }
  return { state: { samples: [...state.samples, { width, height }].slice(-2), settled: null }, height };
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
