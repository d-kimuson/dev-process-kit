/**
 * Where the floating menu sits, and which way it lies.
 *
 * The reader drags the menu anywhere on the screen; on release it snaps to the
 * nearest edge, and its orientation follows that edge: a menu on the top or
 * bottom edge is one row, on the left or right edge one column. Orientation is
 * therefore never a separate setting — it is `orientationOf(dock.edge)`.
 *
 * Every position the menu takes passes through these functions, so it is
 * always inside the area the shell leaves it (the viewport less the header
 * row)
 * with a margin, at the pixel: a stored dock from a wider window, a drag past
 * the edge, and a keyboard move all come out the same way.
 */

/** The edge of the screen the menu is docked to. */
export type MenuEdge = 'top' | 'right' | 'bottom' | 'left';

/** Which way the menu lies: one row along a horizontal edge, one column along a vertical one. */
export type MenuOrientation = 'horizontal' | 'vertical';

/**
 * A docked menu: the edge it hangs from, and how far its start is from that
 * edge's start (along the top/bottom edge it is the left inset, along the
 * left/right edge the top inset). The offset already includes the margin.
 */
export type MenuDock = {
  readonly edge: MenuEdge;
  readonly offset: number;
};

/** The menu's own box, and the box it may occupy, in viewport pixels. */
export type MenuSize = {
  readonly width: number;
  readonly height: number;
};

export type MenuArea = {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
};

/** A free position (a drag in progress), in the same space as `MenuArea`. */
export type MenuBox = {
  readonly left: number;
  readonly top: number;
};

/** A measured rect, as `getBoundingClientRect()` reports it. */
export type MeasuredRect = MenuSize & MenuBox;

export const FLOATING_MENU = {
  /** The gap the menu keeps from the edges of its area, at its dock and at both ends. */
  margin: 12,
  /** The dock the menu opens at: the top of the right edge, clear of the header row and of the hand-off dock. */
  default: { edge: 'right', offset: 12 } as MenuDock,
} as const;

const EDGES: readonly MenuEdge[] = ['top', 'right', 'bottom', 'left'];

/** The menu lies along its edge: one row on a top/bottom dock, one column on a left/right one. */
export const orientationOf = (edge: MenuEdge): MenuOrientation =>
  edge === 'top' || edge === 'bottom' ? 'horizontal' : 'vertical';

/** How long the edge is, and how long the menu is along it. */
const extentOf = (edge: MenuEdge, size: MenuSize, area: MenuArea): { available: number; own: number } =>
  orientationOf(edge) === 'horizontal'
    ? { available: area.width, own: size.width }
    : { available: area.height, own: size.height };

/**
 * `offset` held between the two margins of its edge. An area too small for the
 * menu and both margins keeps the start margin, so the menu still hangs from
 * the edge rather than from the far side.
 */
export const clampMenuOffset = (edge: MenuEdge, offset: number, size: MenuSize, area: MenuArea): number => {
  const { available, own } = extentOf(edge, size, area);
  const min = FLOATING_MENU.margin;
  const max = Math.max(min, available - own - FLOATING_MENU.margin);
  return Math.round(Math.min(max, Math.max(min, offset)));
};

/** A dock with its offset held inside its edge. */
export const clampMenuDock = (dock: MenuDock, size: MenuSize, area: MenuArea): MenuDock => ({
  edge: dock.edge,
  offset: clampMenuOffset(dock.edge, dock.offset, size, area),
});

/** Where a docked menu is drawn, as the fixed offsets a style carries. */
export const dockedMenuBox = (dock: MenuDock, size: MenuSize, area: MenuArea): MenuBox => {
  const { margin } = FLOATING_MENU;
  switch (dock.edge) {
    case 'top':
      return { left: area.left + dock.offset, top: area.top + margin };
    case 'bottom':
      return { left: area.left + dock.offset, top: area.top + area.height - size.height - margin };
    case 'left':
      return { left: area.left + margin, top: area.top + dock.offset };
    case 'right':
      return { left: area.left + area.width - size.width - margin, top: area.top + dock.offset };
  }
};

/**
 * One side of the area, and how far in from it something is drawn: a CSS inset,
 * which is placed without knowing the size of the box it places.
 */
export type MenuInset = {
  readonly side: MenuEdge;
  readonly value: number;
};

/**
 * Where a docked menu is drawn before it has been measured: the same dock, said
 * as insets from the edges of its area. A menu hanging from the right or the
 * bottom edge is placed by that edge's own inset, so the size it does not have
 * yet is not needed — the first render already draws it at its dock, and the
 * measurement only corrects the position afterwards.
 */
export const dockedMenuInsets = (dock: MenuDock, area: MenuArea): readonly MenuInset[] => {
  const { margin } = FLOATING_MENU;
  switch (dock.edge) {
    case 'top':
      return [
        { side: 'top', value: area.top + margin },
        { side: 'left', value: area.left + dock.offset },
      ];
    case 'bottom':
      return [
        { side: 'bottom', value: margin },
        { side: 'left', value: area.left + dock.offset },
      ];
    case 'left':
      return [
        { side: 'left', value: area.left + margin },
        { side: 'top', value: area.top + dock.offset },
      ];
    case 'right':
      return [
        { side: 'right', value: margin },
        { side: 'top', value: area.top + dock.offset },
      ];
  }
};

/** Where a menu is drawn: the docked box once it is measurable, else the insets that place it there. */
export type MenuPlacement = {
  readonly dock: MenuDock;
  readonly box: MenuBox | null;
  readonly insets: readonly MenuInset[];
};

/** A sub-pixel difference between where a box is drawn and where it belongs is not a placement. */
const PLACED_TOLERANCE = 1;

/** Whether the menu is already drawn where this state would draw it. */
export const menuPlacedAt = (drawn: MenuBox, box: MenuBox): boolean =>
  Math.abs(drawn.left - box.left) <= PLACED_TOLERANCE && Math.abs(drawn.top - box.top) <= PLACED_TOLERANCE;

/** The box's own distance to each edge of the area. */
const edgeGaps = (box: MenuBox, size: MenuSize, area: MenuArea): Record<MenuEdge, number> => ({
  top: box.top - area.top,
  right: area.left + area.width - (box.left + size.width),
  bottom: area.top + area.height - (box.top + size.height),
  left: box.left - area.left,
});

/**
 * The edge the box is nearest to. Each distance is measured to the box's own
 * side on that edge, so a wide menu that has barely left the top keeps
 * hanging from the top. A box reaching two edges equally takes the first of
 * `top`, `right`, `bottom`, `left`.
 */
export const nearestMenuEdge = (box: MenuBox, size: MenuSize, area: MenuArea): MenuEdge => {
  const gaps = edgeGaps(box, size, area);
  let nearest: MenuEdge = 'top';
  for (const edge of EDGES) if (gaps[edge] < gaps[nearest]) nearest = edge;
  return nearest;
};

/**
 * The dock a free box snaps to: the nearest edge, and how far the box's start
 * lies from that edge's start, held inside it.
 */
export const dockedMenuAt = (box: MenuBox, size: MenuSize, area: MenuArea): MenuDock => {
  const edge = nearestMenuEdge(box, size, area);
  const offset = orientationOf(edge) === 'horizontal' ? box.left - area.left : box.top - area.top;
  return { edge, offset: clampMenuOffset(edge, offset, size, area) };
};

/** Where a drag started: the pointer, and the box the menu had at that moment. */
export type MenuDrag = {
  readonly startX: number;
  readonly startY: number;
  readonly box: MenuBox;
};

/** The free box with its grab point under the pointer. */
export const draggedMenuBox = (drag: MenuDrag, clientX: number, clientY: number): MenuBox => ({
  left: Math.round(drag.box.left + clientX - drag.startX),
  top: Math.round(drag.box.top + clientY - drag.startY),
});

/** The dock a drag lands on: the nearest edge to where the reader let go. */
export const droppedMenuDock = (
  drag: MenuDrag,
  clientX: number,
  clientY: number,
  size: MenuSize,
  area: MenuArea,
): MenuDock => dockedMenuAt(draggedMenuBox(drag, clientX, clientY), size, area);

export type MenuKey = {
  readonly key: string;
};

const EDGE_OF_KEY: Readonly<Record<string, MenuEdge | undefined>> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'top',
  ArrowDown: 'bottom',
};

/**
 * The dock after a key press on the grip, or `null` for a key it does not use.
 * The arrows dock the menu to the edge they point at, keeping its offset along
 * that edge where it fits; Home and End send it to the start and the end of
 * the edge it is already on.
 */
export const keyedMenuDock = (dock: MenuDock, { key }: MenuKey, size: MenuSize, area: MenuArea): MenuDock | null => {
  const edge = EDGE_OF_KEY[key];
  if (edge !== undefined) return clampMenuDock({ edge, offset: dock.offset }, size, area);
  const { available, own } = extentOf(dock.edge, size, area);
  const max = Math.max(FLOATING_MENU.margin, available - own - FLOATING_MENU.margin);
  if (key === 'Home') return { edge: dock.edge, offset: FLOATING_MENU.margin };
  if (key === 'End') return { edge: dock.edge, offset: max };
  return null;
};

/** The menu's measured box; `null` before it is in the document. */
export const measuredMenu = (element: Element): MeasuredRect | null => {
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
};

const isMenuEdge = (value: unknown): value is MenuEdge =>
  typeof value === 'string' && EDGES.some((edge) => edge === value);

/** Whether a value read back from storage is a dock this version understands. */
export const parseMenuDock = (value: unknown): MenuDock | null => {
  if (typeof value !== 'object' || value === null) return null;
  const { edge, offset } = value as { edge?: unknown; offset?: unknown };
  if (typeof offset !== 'number' || !Number.isFinite(offset)) return null;
  if (!isMenuEdge(edge)) return null;
  return { edge, offset: Math.round(offset) };
};
