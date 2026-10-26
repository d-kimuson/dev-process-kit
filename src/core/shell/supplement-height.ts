/**
 * How tall the supplements drawer is.
 *
 * The drawer keeps one height across every tab — shorter content leaves the
 * rest of it empty, taller content scrolls inside — so switching tabs never
 * moves it. The reader changes that height by dragging the drawer's top edge,
 * or with the keyboard on it; every height they set passes through these
 * functions, so it is always a whole number of pixels that leaves the page
 * above the drawer room to show.
 */
export const SUPPLEMENT_HEIGHT = {
  /** The height the drawer opens at, and the one a double-click restores. */
  default: 320,
  min: 140,
  /** One arrow key press. */
  step: 24,
  /** One arrow key press with Shift. */
  largeStep: 96,
} as const;

/**
 * What the drawer leaves above itself when it is as tall as it may be: the
 * shell header, its own bar, and a band of the content it opens over, so the
 * page never disappears behind it. `styles.ts` keeps the same reserve in the
 * drawer's `max-height`, for a window that resizes before the shell re-renders.
 */
const TOP_RESERVE = 160;

/** The window height assumed where there is no window to measure (SSR, tests). */
export const FALLBACK_VIEWPORT_HEIGHT = 800;

/** The tallest the drawer may be in a window `viewportHeight` tall. */
export const supplementHeightMax = (viewportHeight: number): number =>
  Math.max(SUPPLEMENT_HEIGHT.min, Math.round(viewportHeight - TOP_RESERVE));

/** `height` held between the minimum and what the window leaves, to the pixel. */
export const clampSupplementHeight = (height: number, viewportHeight: number): number =>
  Math.round(Math.min(supplementHeightMax(viewportHeight), Math.max(SUPPLEMENT_HEIGHT.min, height)));

/** Where a drag started: the pointer, and the drawer's height at that moment. */
export type SupplementDrag = {
  readonly startY: number;
  readonly startHeight: number;
};

/** The height with the drawer's top edge under the pointer: dragging up grows it. */
export const draggedSupplementHeight = (drag: SupplementDrag, clientY: number, viewportHeight: number): number =>
  clampSupplementHeight(drag.startHeight + drag.startY - clientY, viewportHeight);

export type SupplementKey = {
  readonly key: string;
  readonly shiftKey: boolean;
};

/**
 * The height after a key press on the edge, or `null` for a key it does not
 * use. The arrows move the edge the way it points; Home and End go to the
 * shortest and the tallest.
 */
export const keyedSupplementHeight = (
  height: number,
  { key, shiftKey }: SupplementKey,
  viewportHeight: number,
): number | null => {
  const step = shiftKey ? SUPPLEMENT_HEIGHT.largeStep : SUPPLEMENT_HEIGHT.step;
  switch (key) {
    case 'ArrowUp':
      return clampSupplementHeight(height + step, viewportHeight);
    case 'ArrowDown':
      return clampSupplementHeight(height - step, viewportHeight);
    case 'Home':
      return clampSupplementHeight(SUPPLEMENT_HEIGHT.min, viewportHeight);
    case 'End':
      return supplementHeightMax(viewportHeight);
    default:
      return null;
  }
};

/** A stored height, or `null` when the value is not one; the window clamps it on the way out. */
export const parseSupplementHeight = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= SUPPLEMENT_HEIGHT.min ? Math.round(value) : null;

/** The window the drawer sits in, as the height it may not outgrow. */
export const windowViewportHeight = (): number => {
  if (typeof window === 'undefined') return FALLBACK_VIEWPORT_HEIGHT;
  return window.innerHeight || document.documentElement.clientHeight || FALLBACK_VIEWPORT_HEIGHT;
};
