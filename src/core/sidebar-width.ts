/**
 * How wide the shell's sidebar is drawn.
 *
 * The reader resizes it by dragging the edge that faces the main column, or
 * with the keyboard on that edge; every width that reaches the shell passes
 * through these functions, so it is always a whole number of pixels within the
 * bounds.
 */
export const SIDEBAR_WIDTH = {
  min: 180,
  max: 560,
  /** One arrow key press. */
  step: 16,
  /** One arrow key press with Shift. */
  largeStep: 64,
} as const;

/** Which side of the main column the sidebar sits on; its resizable edge faces the other way. */
export type SidebarSide = 'left' | 'right';

/** What a template declares about its sidebar. */
export type SidebarLayout = {
  readonly side: SidebarSide;
  /** The width before the reader resizes it, and the one a double-click restores. */
  readonly defaultWidth: number;
  /**
   * Whether the shell offers the reader a button to fold the sidebar away.
   * Defaults to `true`; a template with its own fold control sets `false`.
   */
  readonly collapsible?: boolean;
};

export const DEFAULT_SIDEBAR_LAYOUT: SidebarLayout = { side: 'left', defaultWidth: 260 };

const clamp = (width: number): number => Math.round(Math.min(SIDEBAR_WIDTH.max, Math.max(SIDEBAR_WIDTH.min, width)));

/** A stored width, or `null` when the value is not one. */
export const parseSidebarWidth = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? clamp(value) : null;

/** How far the sidebar grows when its edge moves `dx` pixels to the right. */
const growth = (side: SidebarSide, dx: number): number => (side === 'left' ? dx : -dx);

/** Where a drag started: the pointer and the width at that moment. */
export type SidebarDrag = {
  readonly side: SidebarSide;
  readonly startX: number;
  readonly startWidth: number;
};

export const draggedSidebarWidth = (drag: SidebarDrag, clientX: number): number =>
  clamp(drag.startWidth + growth(drag.side, clientX - drag.startX));

export type SidebarKey = {
  readonly key: string;
  readonly shiftKey: boolean;
};

/**
 * The width after a key press on the edge, or `null` when the key does not
 * resize. The arrows move the edge; Home and End go to the narrowest and widest.
 */
export const keyedSidebarWidth = (width: number, side: SidebarSide, { key, shiftKey }: SidebarKey): number | null => {
  const step = shiftKey ? SIDEBAR_WIDTH.largeStep : SIDEBAR_WIDTH.step;
  switch (key) {
    case 'ArrowLeft':
      return clamp(width + growth(side, -step));
    case 'ArrowRight':
      return clamp(width + growth(side, step));
    case 'Home':
      return SIDEBAR_WIDTH.min;
    case 'End':
      return SIDEBAR_WIDTH.max;
    default:
      return null;
  }
};

/** A stored collapsed flag, or `null` when the value is not one. */
export const parseSidebarCollapsed = (value: unknown): boolean | null => (typeof value === 'boolean' ? value : null);

/** What the fold button does, and which way its chevron points: towards where the sidebar goes. */
export type SidebarToggle = {
  readonly action: 'collapse' | 'expand';
  readonly points: SidebarSide;
};

const opposite = (side: SidebarSide): SidebarSide => (side === 'left' ? 'right' : 'left');

export const sidebarToggle = (side: SidebarSide, collapsed: boolean): SidebarToggle =>
  collapsed ? { action: 'expand', points: opposite(side) } : { action: 'collapse', points: side };
