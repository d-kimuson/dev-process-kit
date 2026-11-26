import type { LayoutPoint, LayoutResult, PlacedNode } from '../../lib/layout/layered';
import type { PortSide } from '../../lib/layout/ports';

/**
 * Links of a hand-placed map, routed on a lane grid.
 *
 * Every bend and every port sits on one global grid of `LANE`-spaced lines, and
 * a lane a link already runs along is closed to the next one. That is what
 * makes the drawing readable by construction instead of by repair:
 *
 * - two links never share a lane, and never touch at a corner — they can only
 *   cross at a right angle;
 * - a run between two bends is never shorter than one lane, so there are no
 *   hair-width jogs;
 * - a link keeps `CARD_CLEARANCE` from every card, its own two included: it
 *   leaves and enters by a straight stub and nothing else comes that close.
 *
 * Four things decide where a link is drawn:
 *
 * 1. **The sides that face each other** (`facingLinkSides`), so the flow still
 *    reads left to right. A link those sides leave with a detour — a card
 *    dragged into a corridor too narrow for all its links — is tried on the
 *    other sides that look at its far card, and keeps the pair that draws the
 *    whole map cheapest.
 * 2. **One port per link** on that side, ordered by where the other end is, and
 *    lined up with the port at the other end whenever the two sides overlap —
 *    cards in one row or one column are joined by a straight line.
 * 3. **The cheapest path over the grid**: few bends first, then few crossings,
 *    then staying inside the boundaries the link belongs to. A boundary frame
 *    may be crossed at a right angle but not followed, and its title is never
 *    drawn over.
 * 4. **Room for the label**: when the caller reports that a link's label had to
 *    lie on another link or a boundary's border (`rate`), that link is tried on
 *    the next lanes over and keeps the one whose label lies on nothing.
 *
 * Cards dropped onto each other are routed as one pile (`piled`): links from
 * the other cards end on the pile's edge, and a link between two cards of the
 * pile has no room and is not drawn until they are apart again.
 *
 * Pure: placed cards, boundary frames and the link list in, routes out.
 */

export type LinkRouteEdge = { readonly id: string; readonly from: string; readonly to: string };

export type RouteRect = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

/** A boundary frame as drawn, and the box its title takes. */
export type LinkRouteFrame = { readonly box: RouteRect; readonly title: RouteRect | null };

export type RoutedLinks = ReadonlyMap<string, readonly LayoutPoint[]>;

/** What the label of `link` lies on with the routes as they are: a weight, and the other links under it. */
export type LinkLabelIssue = {
  readonly link: string;
  readonly penalty: number;
  readonly crossing: readonly string[];
};

export type LinkRouteOptions = {
  /** Boundary frames the links must cross squarely instead of following. */
  readonly frames?: readonly LinkRouteFrame[];
  /** Rates a set of routes by where their labels end up; links with an issue are tried on other lanes. */
  readonly rate?: (routes: RoutedLinks) => readonly LinkLabelIssue[];
};

/** Spacing of the grid's lines: the gap between two parallel links, and the shortest run between two bends. */
export const LANE = 12;
/** Distance every link keeps from a card it is not attached to — and the least length of a port's straight stub. */
const CARD_CLEARANCE = 12;
/** Distance kept from a card's corners by a port. */
const PORT_INSET = 14;
/** How close to a frame's border a parallel run counts as following it. */
const FRAME_CLEARANCE = 7;
/** Within this distance a run beside a frame border still reads as belonging to the frame. */
const FRAME_MARGIN = 22;
/** How often the links that found no free lane are moved to the front and everything is routed again. */
const REROUTE_PASSES = 4;
/** Room kept around a frame title. */
const TITLE_CLEARANCE = 2;
/** Preferred gap between two ports of one side; falls back to one lane when the side is crowded. */
const PORT_GAP = LANE * 2;
/** Bends from which a route counts as a detour and its link is tried on other sides. */
const DETOUR_BENDS = 3;
/** How many detouring links are tried on other sides in one routing. */
const RESIDED_LINKS = 2;
/** How many labels are given another lane in one routing, and how many lanes each link is tried on. */
const LABEL_ROUNDS = 6;
const LANE_ATTEMPTS = 8;
/** Bends a link may gain to make room for a label. */
const LABEL_BENDS = 0;

/** Path costs, in lanes of detour a link accepts to avoid each. */
const COST = {
  bend: 8,
  crossing: 10,
  frameBorder: 3,
  besideCard: 0.4,
  besideLink: 0.5,
  besideFrame: 1.5,
  sharedLane: 60,
  /** A link with no route at all. */
  unrouted: 400,
  /** Running where an earlier attempt for the same link ran, when looking for another lane. */
  retried: 3,
} as const;

const EAST = 0;
const SOUTH = 1;
const WEST = 2;
const NORTH = 3;
type Direction = typeof EAST | typeof SOUTH | typeof WEST | typeof NORTH;

const DIRECTION_OF: Record<PortSide, Direction> = { right: EAST, bottom: SOUTH, left: WEST, top: NORTH };
const OPPOSITE_SIDE: Record<PortSide, PortSide> = { right: 'left', bottom: 'top', left: 'right', top: 'bottom' };
const isHorizontal = (direction: number): boolean => direction === EAST || direction === WEST;

const boxOf = (node: PlacedNode): RouteRect => ({ x: node.x, y: node.y, width: node.width, height: node.height });

const inflate = (box: RouteRect, by: number): RouteRect => ({
  x: box.x - by,
  y: box.y - by,
  width: box.width + by * 2,
  height: box.height + by * 2,
});

const overlaps = (a: RouteRect, b: RouteRect): boolean =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/**
 * The two sides a link between `from` and `to` should use, or `null` when the
 * cards overlap on both axes and no pair of sides faces the other.
 *
 * Cards that are side by side join horizontally even when they are also offset
 * vertically, so a left-to-right flow keeps reading left to right; only cards
 * that share a column join top to bottom.
 */
export const facingLinkSides = (
  from: PlacedNode,
  to: PlacedNode,
): { readonly from: PortSide; readonly to: PortSide } | null => {
  if (to.x >= from.x + from.width) return { from: 'right', to: 'left' };
  if (from.x >= to.x + to.width) return { from: 'left', to: 'right' };
  if (to.y >= from.y + from.height) return { from: 'bottom', to: 'top' };
  if (from.y >= to.y + to.height) return { from: 'top', to: 'bottom' };
  return null;
};

/** The lane grid over the whole map, with what is closed to a link and what earlier links already use. */
type Grid = {
  readonly originX: number;
  readonly originY: number;
  readonly columns: number;
  readonly rows: number;
  /** Inside a card's clearance or a frame title: closed. */
  readonly blocked: Uint8Array;
  /** Next to a card: open, but a run here reads as attached to the card. */
  readonly besideCard: Uint8Array;
  /** On a frame's horizontal border: a horizontal run here would follow the border. */
  readonly alongHorizontalBorder: Uint8Array;
  readonly alongVerticalBorder: Uint8Array;
  /** Near a frame's horizontal border: open, but a horizontal run here crowds the border. */
  readonly nearHorizontalBorder: Uint8Array;
  readonly nearVerticalBorder: Uint8Array;
  /** Which frames contain the point, as a bit set: a change between two points is a border crossed. */
  readonly frames: Int32Array;
  readonly usedHorizontal: Uint8Array;
  readonly usedVertical: Uint8Array;
  /** A bend or a port stub's end: nothing else may pass. */
  readonly corner: Uint8Array;
  /** The link a port stub's end is reserved for, or -1. */
  readonly owner: Int16Array;
};

const createGrid = (cards: readonly RouteRect[], frames: readonly LinkRouteFrame[]): Grid => {
  const boxes = [...cards, ...frames.map((frame) => frame.box)];
  const reach = LANE * 4;
  // The canvas starts at 0: lanes stay on it unless a card itself sits further out.
  const origin = (starts: readonly number[], cardStarts: readonly number[]): number => {
    const lanes = (value: number): number => Math.floor(value / LANE) * LANE;
    return Math.min(Math.max(LANE, lanes(Math.min(...starts) - reach)), lanes(Math.min(...cardStarts) - reach));
  };
  const originX = origin(
    boxes.map((box) => box.x),
    cards.map((card) => card.x),
  );
  const originY = origin(
    boxes.map((box) => box.y),
    cards.map((card) => card.y),
  );
  const columns = Math.ceil((Math.max(...boxes.map((box) => box.x + box.width)) + reach - originX) / LANE) + 1;
  const rows = Math.ceil((Math.max(...boxes.map((box) => box.y + box.height)) + reach - originY) / LANE) + 1;
  const size = columns * rows;
  const grid: Grid = {
    originX,
    originY,
    columns,
    rows,
    blocked: new Uint8Array(size),
    besideCard: new Uint8Array(size),
    alongHorizontalBorder: new Uint8Array(size),
    alongVerticalBorder: new Uint8Array(size),
    nearHorizontalBorder: new Uint8Array(size),
    nearVerticalBorder: new Uint8Array(size),
    frames: new Int32Array(size),
    usedHorizontal: new Uint8Array(size),
    usedVertical: new Uint8Array(size),
    corner: new Uint8Array(size),
    owner: new Int16Array(size).fill(-1),
  };
  /** Marks every grid point strictly inside `box`. */
  const mark = (box: RouteRect, visit: (index: number) => void): void => {
    const fromColumn = Math.max(0, Math.floor((box.x - originX) / LANE) + 1);
    const toColumn = Math.min(columns - 1, Math.ceil((box.x + box.width - originX) / LANE) - 1);
    const fromRow = Math.max(0, Math.floor((box.y - originY) / LANE) + 1);
    const toRow = Math.min(rows - 1, Math.ceil((box.y + box.height - originY) / LANE) - 1);
    for (let row = fromRow; row <= toRow; row++) {
      for (let column = fromColumn; column <= toColumn; column++) visit(row * columns + column);
    }
  };
  for (const card of cards) {
    mark(inflate(card, CARD_CLEARANCE), (index) => (grid.blocked[index] = 1));
    mark(inflate(card, CARD_CLEARANCE + LANE), (index) => (grid.besideCard[index] = 1));
  }
  frames.forEach((frame, bit) => {
    const { box, title } = frame;
    if (title !== null) mark(inflate(title, TITLE_CLEARANCE), (index) => (grid.blocked[index] = 1));
    if (bit < 31) mark(box, (index) => (grid.frames[index] = grid.frames[index]! | (1 << bit)));
    const bands = [
      [FRAME_CLEARANCE, grid.alongHorizontalBorder, grid.alongVerticalBorder],
      [FRAME_MARGIN, grid.nearHorizontalBorder, grid.nearVerticalBorder],
    ] as const;
    for (const [reach, horizontal, vertical] of bands) {
      for (const y of [box.y, box.y + box.height]) {
        mark({ x: box.x - reach, y: y - reach, width: box.width + reach * 2, height: reach * 2 }, (index) => {
          horizontal[index] = 1;
        });
      }
      for (const x of [box.x, box.x + box.width]) {
        mark({ x: x - reach, y: box.y - reach, width: reach * 2, height: box.height + reach * 2 }, (index) => {
          vertical[index] = 1;
        });
      }
    }
  });
  return grid;
};

const pointOf = (grid: Grid, index: number): LayoutPoint => ({
  x: grid.originX + (index % grid.columns) * LANE,
  y: grid.originY + Math.floor(index / grid.columns) * LANE,
});

const indexAt = (grid: Grid, x: number, y: number): number | null => {
  const column = Math.round((x - grid.originX) / LANE);
  const row = Math.round((y - grid.originY) / LANE);
  if (column < 0 || row < 0 || column >= grid.columns || row >= grid.rows) return null;
  return row * grid.columns + column;
};

/** A place on a card side a link can attach to: the point on the border, and the grid point its stub ends on. */
type Slot = { readonly at: number; readonly port: LayoutPoint; readonly stubEnd: number };

type LinkEnd = {
  readonly link: number;
  readonly end: 'from' | 'to';
  readonly node: PlacedNode;
  readonly other: PlacedNode;
  readonly side: PortSide;
  slot: Slot | null;
};

type LinkEnds = { readonly from: LinkEnd; readonly to: LinkEnd };

/** The slots of one card side, in order along it. */
const slotsOf = (
  grid: Grid,
  node: PlacedNode,
  side: PortSide,
  cards: readonly RouteRect[],
  titles: readonly RouteRect[],
): readonly Slot[] => {
  const vertical = side === 'left' || side === 'right';
  const start = (vertical ? node.y : node.x) + PORT_INSET;
  const end = (vertical ? node.y + node.height : node.x + node.width) - PORT_INSET;
  const border =
    side === 'left' ? node.x : side === 'right' ? node.x + node.width : side === 'top' ? node.y : node.y + node.height;
  const outwards = side === 'right' || side === 'bottom';
  const reach = outwards
    ? Math.ceil((border + CARD_CLEARANCE) / LANE) * LANE
    : Math.floor((border - CARD_CLEARANCE) / LANE) * LANE;
  const own = boxOf(node);
  const slots: Slot[] = [];
  for (let at = Math.ceil(start / LANE) * LANE; at <= end; at += LANE) {
    const port = vertical ? { x: border, y: at } : { x: at, y: border };
    const stubEnd = vertical ? indexAt(grid, reach, at) : indexAt(grid, at, reach);
    if (stubEnd === null || grid.blocked[stubEnd] === 1) continue;
    const tip = pointOf(grid, stubEnd);
    const stub: RouteRect = {
      x: Math.min(port.x, tip.x) - 1,
      y: Math.min(port.y, tip.y) - 1,
      width: Math.abs(port.x - tip.x) + 2,
      height: Math.abs(port.y - tip.y) + 2,
    };
    if (titles.some((title) => overlaps(stub, inflate(title, TITLE_CLEARANCE)))) continue;
    if (cards.some((card) => !sameBox(card, own) && overlaps(stub, inflate(card, 4)))) continue;
    slots.push({ at, port, stubEnd });
  }
  return slots;
};

const sameBox = (a: RouteRect, b: RouteRect): boolean =>
  a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;

const centreAlong = (node: PlacedNode, side: PortSide): number =>
  side === 'left' || side === 'right' ? node.y + node.height / 2 : node.x + node.width / 2;

const centreAcross = (node: PlacedNode, side: PortSide): number =>
  side === 'left' || side === 'right' ? node.x + node.width / 2 : node.y + node.height / 2;

/**
 * Gives every link end a slot on its card side.
 *
 * The ends of one side are ordered by where their other card is, so two links
 * leaving one side do not cross on the way out, and are spread around the
 * side's middle. Then each link whose two sides overlap is moved onto one
 * shared line where both sides have room for it, which is what turns a link
 * between two cards of one row into a straight line.
 */
const assignPorts = (
  grid: Grid,
  pairs: readonly LinkEnds[],
  cards: readonly RouteRect[],
  titles: readonly RouteRect[],
): void => {
  const sides = new Map<string, LinkEnd[]>();
  for (const end of pairs.flatMap((pair) => [pair.from, pair.to])) {
    const key = `${end.node.id}\u0000${end.side}`;
    sides.set(key, [...(sides.get(key) ?? []), end]);
  }
  const slotsBySide = new Map<string, readonly Slot[]>();
  const taken = new Map<number, LinkEnd>();
  for (const [key, group] of sides) {
    const first = group[0]!;
    const slots = slotsOf(grid, first.node, first.side, cards, titles);
    slotsBySide.set(key, slots);
    group.sort(
      (a, b) =>
        centreAlong(a.other, a.side) - centreAlong(b.other, b.side) ||
        Math.abs(centreAcross(b.other, b.side) - centreAcross(b.node, b.side)) -
          Math.abs(centreAcross(a.other, a.side) - centreAcross(a.node, a.side)) ||
        a.link - b.link,
    );
    if (slots.length === 0) continue;
    const span = slots.at(-1)!.at - slots[0]!.at;
    const gap =
      group.length <= 1 ? 0 : Math.min(PORT_GAP, Math.max(LANE, Math.floor(span / (group.length - 1) / LANE) * LANE));
    const middle = centreAlong(first.node, first.side);
    let floor = Number.NEGATIVE_INFINITY;
    group.forEach((end, index) => {
      const wanted = middle + (index - (group.length - 1) / 2) * gap;
      const free = slots.filter((slot) => slot.at >= floor && !taken.has(slot.stubEnd));
      const slot = free.reduce<Slot | null>(
        (best, candidate) =>
          best === null || Math.abs(candidate.at - wanted) < Math.abs(best.at - wanted) ? candidate : best,
        null,
      );
      if (slot === null) return;
      end.slot = slot;
      taken.set(slot.stubEnd, end);
      floor = slot.at + LANE;
    });
  }

  const keyOf = (end: LinkEnd): string => `${end.node.id}\u0000${end.side}`;
  /** Whether `end` may move to `slot` without passing a neighbour on its side. */
  const fits = (end: LinkEnd, slot: Slot): boolean => {
    const holder = taken.get(slot.stubEnd);
    if (holder !== undefined && holder !== end) return false;
    const group = sides.get(keyOf(end)) ?? [];
    const index = group.indexOf(end);
    const before = group[index - 1]?.slot;
    const after = group[index + 1]?.slot;
    return (
      (before === undefined || before === null || slot.at >= before.at + LANE) &&
      (after === undefined || after === null || slot.at <= after.at - LANE)
    );
  };
  for (const { from, to } of pairs) {
    if (from.slot === null || to.slot === null || from.slot.at === to.slot.at) continue;
    const toSlots = new Map((slotsBySide.get(keyOf(to)) ?? []).map((slot) => [slot.at, slot] as const));
    const midpoint = (from.slot.at + to.slot.at) / 2;
    const shared = (slotsBySide.get(keyOf(from)) ?? [])
      .flatMap((slot) => {
        const partner = toSlots.get(slot.at);
        return partner === undefined ? [] : [{ slot, partner }];
      })
      .filter(({ slot, partner }) => fits(from, slot) && fits(to, partner))
      .sort((a, b) => Math.abs(a.slot.at - midpoint) - Math.abs(b.slot.at - midpoint) || a.slot.at - b.slot.at)[0];
    if (shared === undefined) continue;
    taken.delete(from.slot.stubEnd);
    taken.delete(to.slot.stubEnd);
    from.slot = shared.slot;
    to.slot = shared.partner;
    taken.set(shared.slot.stubEnd, from);
    taken.set(shared.partner.stubEnd, to);
  }
};

/** A binary min-heap of search states, ordered by priority and then by insertion, so equal paths resolve the same way every time. */
class Frontier {
  readonly #keys: number[] = [];
  readonly #states: number[] = [];
  readonly #order: number[] = [];
  #sequence = 0;

  get size(): number {
    return this.#keys.length;
  }

  #before(a: number, b: number): boolean {
    return this.#keys[a]! < this.#keys[b]! || (this.#keys[a] === this.#keys[b] && this.#order[a]! < this.#order[b]!);
  }

  #swap(a: number, b: number): void {
    for (const list of [this.#keys, this.#states, this.#order]) {
      const held = list[a]!;
      list[a] = list[b]!;
      list[b] = held;
    }
  }

  push(key: number, state: number): void {
    this.#keys.push(key);
    this.#states.push(state);
    this.#order.push(this.#sequence++);
    let at = this.#keys.length - 1;
    while (at > 0) {
      const parent = (at - 1) >> 1;
      if (!this.#before(at, parent)) break;
      this.#swap(at, parent);
      at = parent;
    }
  }

  pop(): number {
    const top = this.#states[0]!;
    const last = this.#keys.length - 1;
    this.#swap(0, last);
    this.#keys.pop();
    this.#states.pop();
    this.#order.pop();
    let at = 0;
    for (;;) {
      const left = at * 2 + 1;
      const right = left + 1;
      let least = at;
      if (left < last && this.#before(left, least)) least = left;
      if (right < last && this.#before(right, least)) least = right;
      if (least === at) break;
      this.#swap(at, least);
      at = least;
    }
    return top;
  }
}

/**
 * The cheapest path over the grid from one stub end to the other, as grid
 * indices, or `null` when the open lanes do not connect them. `strict` keeps
 * every lane rule; without it a link may share a lane or follow a frame at a
 * high price, which is the last resort before giving up on the grid.
 */
const search = (
  grid: Grid,
  link: number,
  start: number,
  startDirection: Direction,
  goal: number,
  goalDirection: Direction,
  strict: boolean,
  avoid: Float32Array | null = null,
): { readonly path: readonly number[]; readonly cost: number } | null => {
  const { columns, rows } = grid;
  const step = [1, columns, -1, -columns] as const;
  const states = columns * rows * 4;
  const cost = new Float64Array(states).fill(Number.POSITIVE_INFINITY);
  const previous = new Int32Array(states).fill(-1);
  const goalColumn = goal % columns;
  const goalRow = Math.floor(goal / columns);
  const remaining = (index: number): number =>
    Math.abs((index % columns) - goalColumn) + Math.abs(Math.floor(index / columns) - goalRow);
  const frontier = new Frontier();
  const visit = (state: number, value: number, from: number): void => {
    if (value >= cost[state]!) return;
    cost[state] = value;
    previous[state] = from;
    frontier.push(value + remaining(state >> 2), state);
  };
  visit(start * 4 + startDirection, 0, -1);
  let reached = -1;
  while (frontier.size > 0) {
    const state = frontier.pop();
    const index = state >> 2;
    const direction = state & 3;
    const value = cost[state]!;
    if (index === goal && direction === goalDirection) {
      reached = state;
      break;
    }
    const own = grid.owner[index] === link;
    const turned = previous[state] !== -1 && previous[state]! >> 2 === index;
    const free =
      own ||
      (grid.usedHorizontal[index] === 0 &&
        grid.usedVertical[index] === 0 &&
        (!strict || (grid.alongHorizontalBorder[index] === 0 && grid.alongVerticalBorder[index] === 0)));
    if (!turned && free) {
      visit(index * 4 + ((direction + 1) & 3), value + COST.bend, state);
      visit(index * 4 + ((direction + 3) & 3), value + COST.bend, state);
    }
    const column = index % columns;
    const row = Math.floor(index / columns);
    if (
      (direction === EAST && column === columns - 1) ||
      (direction === WEST && column === 0) ||
      (direction === SOUTH && row === rows - 1) ||
      (direction === NORTH && row === 0)
    ) {
      continue;
    }
    const next = index + step[direction]!;
    if (grid.blocked[next] === 1) continue;
    const owner = grid.owner[next]!;
    if (owner !== -1 && owner !== link) continue;
    if (grid.corner[next] === 1 && owner !== link) continue;
    const horizontal = isHorizontal(direction);
    const same = horizontal ? grid.usedHorizontal[next] : grid.usedVertical[next];
    const across = horizontal ? grid.usedVertical[next] : grid.usedHorizontal[next];
    const along = horizontal ? grid.alongHorizontalBorder[next] : grid.alongVerticalBorder[next];
    const near = horizontal ? grid.nearHorizontalBorder[next] : grid.nearVerticalBorder[next];
    if (strict && (same === 1 || along === 1)) continue;
    const side = horizontal ? columns : 1;
    const neighbours = horizontal
      ? (grid.usedHorizontal[next - side] ?? 0) + (grid.usedHorizontal[next + side] ?? 0)
      : (grid.usedVertical[next - side] ?? 0) + (grid.usedVertical[next + side] ?? 0);
    visit(
      next * 4 + direction,
      value +
        1 +
        (same === 1 || along === 1 ? COST.sharedLane : 0) +
        (across === 1 ? COST.crossing : 0) +
        (grid.frames[next] !== grid.frames[index] ? COST.frameBorder : 0) +
        (grid.besideCard[next] === 1 ? COST.besideCard : 0) +
        (near === 1 ? COST.besideFrame : 0) +
        neighbours * COST.besideLink +
        (avoid === null ? 0 : avoid[next]!),
      state,
    );
  }
  if (reached === -1) return null;
  const path: number[] = [];
  for (let state = reached; state !== -1; state = previous[state]!) {
    const index = state >> 2;
    if (path.at(-1) !== index) path.push(index);
  }
  return { path: path.reverse(), cost: cost[reached]! };
};

/** Closes the lanes `path` runs along, and its bends, to the links routed after it. */
const occupy = (grid: Grid, path: readonly number[]): void => {
  path.forEach((index, at) => {
    const before = path[at - 1];
    const after = path[at + 1];
    if (before === undefined || after === undefined || after - index !== index - before) {
      grid.corner[index] = 1;
      grid.usedHorizontal[index] = 1;
      grid.usedVertical[index] = 1;
      return;
    }
    if (Math.abs(after - index) === 1) grid.usedHorizontal[index] = 1;
    else grid.usedVertical[index] = 1;
  });
};

/** Drops points that only continue the previous direction, so a route reads as its real turns. */
const simplify = (points: readonly LayoutPoint[]): readonly LayoutPoint[] => {
  const out: LayoutPoint[] = [];
  for (const point of points) {
    const a = out.at(-2);
    const b = out.at(-1);
    if (b !== undefined && b.x === point.x && b.y === point.y) continue;
    if (a !== undefined && b !== undefined && ((a.x === b.x && b.x === point.x) || (a.y === b.y && b.y === point.y))) {
      out[out.length - 1] = point;
      continue;
    }
    out.push(point);
  }
  return out;
};

type Sides = { readonly from: PortSide; readonly to: PortSide };

/**
 * The side pairs a link may use, the facing pair first: each end's side looks
 * at the other card along one axis, and last come the two pairs that leave and
 * arrive on the same side, which is the short way past a card standing between
 * two cards of one row. Empty when the cards overlap.
 */
const sideChoices = (from: PlacedNode, to: PlacedNode): readonly Sides[] => {
  const facing = facingLinkSides(from, to);
  if (facing === null) return [];
  const dx = to.x + to.width / 2 - (from.x + from.width / 2);
  const dy = to.y + to.height / 2 - (from.y + from.height / 2);
  const horizontal: Sides | null =
    dx === 0 ? null : dx > 0 ? { from: 'right', to: 'left' } : { from: 'left', to: 'right' };
  const vertical: Sides | null =
    dy === 0 ? null : dy > 0 ? { from: 'bottom', to: 'top' } : { from: 'top', to: 'bottom' };
  const mixed: readonly Sides[] =
    horizontal === null || vertical === null
      ? []
      : [
          { from: horizontal.from, to: vertical.to },
          { from: vertical.from, to: horizontal.to },
        ];
  const around: readonly Sides[] =
    facing.from === 'left' || facing.from === 'right'
      ? [
          { from: 'top', to: 'top' },
          { from: 'bottom', to: 'bottom' },
        ]
      : [
          { from: 'left', to: 'left' },
          { from: 'right', to: 'right' },
        ];
  const seen = new Set<string>();
  return [facing, horizontal, vertical, ...mixed, ...around].flatMap((sides) => {
    if (sides === null || seen.has(`${sides.from}>${sides.to}`)) return [];
    seen.add(`${sides.from}>${sides.to}`);
    return [sides];
  });
};

/**
 * The cards as the router sees them: cards dropped onto each other stand as
 * one pile, each taking the box around them all, so a link to any of them ends
 * on the pile's edge instead of running under the card on top.
 */
const piled = (nodes: readonly PlacedNode[]): readonly PlacedNode[] => {
  const pile = nodes.map((_, index) => index);
  const rootOf = (index: number): number => (pile[index] === index ? index : (pile[index] = rootOf(pile[index]!)));
  nodes.forEach((node, index) => {
    for (let other = 0; other < index; other++) {
      if (overlaps(boxOf(node), boxOf(nodes[other]!))) pile[rootOf(index)] = rootOf(other);
    }
  });
  if (pile.every((root, index) => root === index)) return nodes;
  return nodes.map((node, index) => {
    const members = nodes.filter((_, other) => rootOf(other) === rootOf(index));
    if (members.length === 1) return node;
    const x = Math.min(...members.map((member) => member.x));
    const y = Math.min(...members.map((member) => member.y));
    return {
      ...node,
      x,
      y,
      width: Math.max(...members.map((member) => member.x + member.width)) - x,
      height: Math.max(...members.map((member) => member.y + member.height)) - y,
    };
  });
};

const bendsOf = (points: readonly LayoutPoint[]): number => Math.max(0, points.length - 2);

/**
 * Replaces the layout's routes with grid-routed ones. A link whose card side
 * has no room left for a port keeps the layout's own route, and a link between
 * two cards that overlap is not drawn.
 */
export const withFacingRoutes = (
  placement: LayoutResult,
  links: readonly LinkRouteEdge[],
  options: LinkRouteOptions = {},
): LayoutResult => {
  const byId = new Map(piled(placement.nodes).map((node) => [node.id, node]));
  const usable = links.filter((link) => byId.has(link.from) && byId.has(link.to));
  if (usable.length === 0) return placement;
  const frames = options.frames ?? [];
  const cards = [...byId.values()].map(boxOf);
  const titles = frames.flatMap((frame) => (frame.title === null ? [] : [frame.title]));
  const original = new Map(placement.routes.map((route) => [route.id, route.points] as const));
  const choices = usable.map((link) => {
    const from = byId.get(link.from)!;
    const to = byId.get(link.to)!;
    return from.id === to.id ? [] : sideChoices(from, to);
  });
  const overlapping = (index: number): boolean => {
    const link = usable[index]!;
    return link.from !== link.to && overlaps(boxOf(byId.get(link.from)!), boxOf(byId.get(link.to)!));
  };

  const span = (index: number): number => {
    const link = usable[index]!;
    const from = byId.get(link.from)!;
    const to = byId.get(link.to)!;
    return Math.abs(to.x - from.x) + Math.abs(to.y - from.y);
  };
  const order = usable
    .map((_, index) => index)
    .sort((a, b) => span(a) - span(b) || usable[a]!.id.localeCompare(usable[b]!.id));

  /** Routes every link, each on the sides `chosen` gives it or else on its facing ones. */
  const routeWith = (chosen: ReadonlyMap<number, Sides>) => {
    const grid = createGrid(cards, frames);
    const pairs = usable.flatMap((link, index): LinkEnds[] => {
      const sides = chosen.get(index) ?? choices[index]![0];
      if (sides === undefined) return [];
      const from = byId.get(link.from)!;
      const to = byId.get(link.to)!;
      return [
        {
          from: { link: index, end: 'from', node: from, other: to, side: sides.from, slot: null },
          to: { link: index, end: 'to', node: to, other: from, side: sides.to, slot: null },
        },
      ];
    });
    assignPorts(grid, pairs, cards, titles);
    const endsOf = new Map(pairs.map((pair) => [pair.from.link, pair] as const));
    for (const end of pairs.flatMap((pair) => [pair.from, pair.to])) {
      if (end.slot === null) continue;
      grid.owner[end.slot.stubEnd] = end.link;
      grid.corner[end.slot.stubEnd] = 1;
    }
    const reserved = grid.corner.slice();

    /** Routes every link in `sequence`; `crowded` lists the links that found no lane of their own. */
    const routeAll = (sequence: readonly number[]) => {
      grid.usedHorizontal.fill(0);
      grid.usedVertical.fill(0);
      grid.corner.set(reserved);
      const routed = new Map<string, readonly LayoutPoint[]>();
      const paths = new Map<number, readonly number[]>();
      const costs = new Map<number, number>();
      const crowded: number[] = [];
      for (const index of sequence) {
        const link = usable[index]!;
        const pair = endsOf.get(index);
        const from = pair?.from;
        const to = pair?.to;
        const fallback = overlapping(index) ? [] : (original.get(link.id) ?? []);
        if (from === undefined || to === undefined || from.slot === null || to.slot === null) {
          routed.set(link.id, fallback);
          costs.set(index, COST.unrouted);
          continue;
        }
        const startDirection = DIRECTION_OF[from.side];
        const goalDirection = DIRECTION_OF[OPPOSITE_SIDE[to.side]];
        const open = search(grid, index, from.slot.stubEnd, startDirection, to.slot.stubEnd, goalDirection, true);
        const found =
          open ?? search(grid, index, from.slot.stubEnd, startDirection, to.slot.stubEnd, goalDirection, false);
        if (open === null) crowded.push(index);
        if (found === null) {
          routed.set(link.id, fallback);
          costs.set(index, COST.unrouted);
          continue;
        }
        occupy(grid, found.path);
        paths.set(index, found.path);
        costs.set(index, found.cost);
        routed.set(link.id, simplify([from.slot.port, ...found.path.map((at) => pointOf(grid, at)), to.slot.port]));
      }
      return { routed, paths, costs, crowded };
    };
    // A link squeezed out by the ones routed before it goes first on the next pass.
    let sequence: readonly number[] = order;
    let last = routeAll(sequence);
    let best = last;
    for (let pass = 0; pass < REROUTE_PASSES && last.crowded.length > 0; pass++) {
      const first = new Set(last.crowded);
      sequence = [...sequence.filter((index) => first.has(index)), ...sequence.filter((index) => !first.has(index))];
      last = routeAll(sequence);
      if (last.crowded.length < best.crowded.length) best = last;
    }
    const total = [...best.costs.values()].reduce((sum, value) => sum + value, 0);
    return { ...best, grid, endsOf, reserved, total };
  };

  let routing = routeWith(new Map());
  const chosen = new Map<number, Sides>();
  const detouring = usable
    .map((_, index) => index)
    .filter((index) => {
      if (choices[index]!.length < 2) return false;
      const points = routing.routed.get(usable[index]!.id) ?? [];
      return !routing.paths.has(index) || routing.crowded.includes(index) || bendsOf(points) >= DETOUR_BENDS;
    })
    .sort((a, b) => (routing.costs.get(b) ?? 0) - (routing.costs.get(a) ?? 0) || a - b)
    .slice(0, RESIDED_LINKS);
  for (const index of detouring) {
    for (const sides of choices[index]!.slice(1, 4)) {
      const trial = routeWith(new Map(chosen).set(index, sides));
      if (trial.total >= routing.total - 1) continue;
      routing = trial;
      chosen.set(index, sides);
    }
  }

  const { grid, endsOf, reserved } = routing;
  const routed = new Map(routing.routed);
  const paths = new Map(routing.paths);
  const { rate } = options;
  if (rate !== undefined) {
    const weigh = (issues: readonly LinkLabelIssue[]): number => issues.reduce((sum, issue) => sum + issue.penalty, 0);
    const indexOf = new Map(usable.map((link, index) => [link.id, index] as const));
    let issues = rate(routed);
    let weight = weigh(issues);
    const handled = new Set<string>();
    /** Tries `index` on the lanes next to its own, and keeps the one that lightens the labels most. */
    const relane = (index: number): boolean => {
      const link = usable[index]!;
      const pair = endsOf.get(index);
      const own = paths.get(index);
      if (pair === undefined || pair.from.slot === null || pair.to.slot === null || own === undefined) return false;
      grid.usedHorizontal.fill(0);
      grid.usedVertical.fill(0);
      grid.corner.set(reserved);
      for (const [other, path] of paths) if (other !== index) occupy(grid, path);
      const bends = bendsOf(routed.get(link.id) ?? []);
      const avoid = new Float32Array(grid.columns * grid.rows);
      const tried = new Set([own.join(',')]);
      let marks = own;
      let moved = false;
      for (let attempt = 0; attempt < LANE_ATTEMPTS && weight > 0; attempt++) {
        for (const at of marks.slice(1, -1)) avoid[at] = avoid[at]! + COST.retried;
        const found = search(
          grid,
          index,
          pair.from.slot.stubEnd,
          DIRECTION_OF[pair.from.side],
          pair.to.slot.stubEnd,
          DIRECTION_OF[OPPOSITE_SIDE[pair.to.side]],
          true,
          avoid,
        );
        if (found === null) break;
        marks = found.path;
        const key = found.path.join(',');
        if (tried.has(key)) continue;
        tried.add(key);
        const points = simplify([pair.from.slot.port, ...found.path.map((at) => pointOf(grid, at)), pair.to.slot.port]);
        if (bendsOf(points) > bends + LABEL_BENDS) continue;
        const trial = rate(new Map(routed).set(link.id, points));
        if (weigh(trial) >= weight) continue;
        routed.set(link.id, points);
        paths.set(index, found.path);
        issues = trial;
        weight = weigh(trial);
        moved = true;
      }
      return moved;
    };
    for (let round = 0; round < LABEL_ROUNDS && weight > 0; round++) {
      const issue = issues
        .filter((candidate) => candidate.penalty > 0 && !handled.has(candidate.link))
        .sort((a, b) => b.penalty - a.penalty || a.link.localeCompare(b.link))[0];
      if (issue === undefined) break;
      handled.add(issue.link);
      for (const id of [issue.link, ...issue.crossing.slice(0, 2)]) {
        const index = indexOf.get(id);
        if (index !== undefined && relane(index)) break;
      }
    }
  }

  const routes = usable.map((link) => ({ id: link.id, points: routed.get(link.id) ?? [] }));
  const drawn = [
    ...routes.flatMap((route) => route.points),
    ...placement.nodes.map((node) => ({ x: node.x + node.width, y: node.y + node.height })),
  ];
  return {
    ...placement,
    width: Math.max(placement.width, ...drawn.map((point) => point.x)),
    height: Math.max(placement.height, ...drawn.map((point) => point.y)),
    routes: [...placement.routes.filter((route) => !usable.some((link) => link.id === route.id)), ...routes],
  };
};
