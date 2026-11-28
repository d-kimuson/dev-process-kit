/**
 * The state machine's own edge router. It works from the placed boxes alone —
 * never from the layout's ranks — so an authored placement, an automatic one
 * and one the reader dragged apart are all drawn by the same rules:
 *
 * 1. **Sides** (`chooseSides`). Each transition is searched once on an
 *    orthogonal grid from every side of its source to every side of its
 *    target; the cheapest path (length, bends, crossings, how crowded a side
 *    already is) decides which two sides it joins.
 * 2. **Ports** (`assignPorts`). Every transition gets its own point on its
 *    side. Transitions between two states that face each other share one
 *    coordinate on both ends, so they stay straight parallel lines; the bent
 *    ones are ordered by where they turn, so siblings never cross on their
 *    way out. A self transition takes two neighbouring points on a free side.
 * 3. **Routes** (`search`). With the ports fixed, each transition is searched
 *    again. States are solid, a lane another transition already took costs
 *    more than a detour, and a jog too short to read is not allowed.
 * 4. **Labels** (`placeLabels`). Each label takes the spot along its own route
 *    that covers no state, no other label, no arrowhead and no other line.
 *
 * Pure: placed boxes and the transition list in, routes and label points out —
 * so the element and a test can score exactly what is drawn.
 */

import type { LayoutPoint, LayoutResult, PlacedNode } from '../../lib/layout/layered';

import { END_MARKERS, markerZone } from '../../components/diagram/edge/glyphs';
import { placeEdgeLabels, type LabelBox } from '../../lib/layout/edge-labels';
import { routeAroundObstacles } from '../../lib/layout/orthogonal-router';
import { endFrame } from '../../lib/layout/path-steps';

/** A transition, as far as routing it cares. `title` sizes the label. */
export type StateRouteEdge = {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly title?: string;
};

type Side = 'right' | 'bottom' | 'left' | 'top';
type Box = { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
type Segment = {
  readonly edge: string;
  readonly horizontal: boolean;
  readonly at: number;
  readonly lo: number;
  readonly hi: number;
};

/** Clearance a route keeps from a state it does not join. */
const CLEAR = 10;
/** Straight run a transition keeps where it leaves or enters a state: room for the arrowhead. */
const STUB = 16;
/** Distance between two lanes offered side by side. */
const LANE = 14;
/** Two grid lines closer than this would let a route draw a jog too short to read. */
const MIN_SEP = 12;
const MIN_JOG = 12;
const PORT_GAP = 18;
const PORT_INSET = 14;
const MIN_PORT_GAP = 8;
/** Nothing is drawn closer to the canvas origin than this. */
const CANVAS_MIN = 8;
const BEND_COST = 28;
const CROSS_COST = 36;
/** Two parallel runs closer than this read as one line. */
const NEAR = 8;
const LOOP_SPAN = 28;
const LOOP_REACH = 24;

const LABEL_HEIGHT = 22;
const LABEL_MAX_WIDTH = 168;
const LABEL_FONT = 11.5;
const LABEL_PAD = 16;
/** Gap between a label and the line it sits beside. */
const LABEL_OFFSET = 7;

const SIDES: readonly Side[] = ['right', 'bottom', 'left', 'top'];
/** Direction index: 0 right, 1 down, 2 left, 3 up. A side's index is its outward direction. */
const DX = [1, 0, -1, 0] as const;
const DY = [0, 1, 0, -1] as const;
const directionOf = (side: Side): number => SIDES.indexOf(side);
const isHorizontalSide = (side: Side): boolean => side === 'left' || side === 'right';
const byId = (p: string, q: string): number => (p < q ? -1 : p > q ? 1 : 0);

/** The stretch of a side a port may sit on, along the side's own axis. */
const sideRange = (box: Box, side: Side): { readonly lo: number; readonly hi: number } =>
  isHorizontalSide(side)
    ? { lo: box.y + PORT_INSET, hi: box.y + box.height - PORT_INSET }
    : { lo: box.x + PORT_INSET, hi: box.x + box.width - PORT_INSET };

const portPoint = (box: Box, side: Side, at: number): LayoutPoint => {
  if (side === 'right') return { x: box.x + box.width, y: at };
  if (side === 'left') return { x: box.x, y: at };
  if (side === 'bottom') return { x: at, y: box.y + box.height };
  return { x: at, y: box.y };
};

const stepOut = (point: LayoutPoint, side: Side, distance: number): LayoutPoint => {
  const direction = directionOf(side);
  return { x: point.x + DX[direction]! * distance, y: point.y + DY[direction]! * distance };
};

const simplify = (points: readonly LayoutPoint[]): LayoutPoint[] => {
  const out: LayoutPoint[] = [];
  for (const point of points) {
    const last = out.at(-1);
    if (last && last.x === point.x && last.y === point.y) continue;
    const before = out.at(-2);
    if (last && before && ((before.x === last.x && last.x === point.x) || (before.y === last.y && last.y === point.y)))
      out.pop();
    out.push(point);
  }
  return out;
};

const segmentsOf = (edge: string, points: readonly LayoutPoint[]): Segment[] => {
  const out: Segment[] = [];
  for (let index = 0; index + 1 < points.length; index++) {
    const a = points[index]!;
    const b = points[index + 1]!;
    if (a.y === b.y) out.push({ edge, horizontal: true, at: a.y, lo: Math.min(a.x, b.x), hi: Math.max(a.x, b.x) });
    else out.push({ edge, horizontal: false, at: a.x, lo: Math.min(a.y, b.y), hi: Math.max(a.y, b.y) });
  }
  return out;
};

/** Whether the segment runs through the box grown by `margin`. */
const segmentHitsBox = (a: LayoutPoint, b: LayoutPoint, box: Box, margin: number): boolean =>
  Math.max(a.x, b.x) > box.x - margin &&
  Math.min(a.x, b.x) < box.x + box.width + margin &&
  Math.max(a.y, b.y) > box.y - margin &&
  Math.min(a.y, b.y) < box.y + box.height + margin;

/* ---------------------------------------------------------------------- grid */

type Line = { readonly at: number; readonly priority: number; readonly weight: number };

type Grid = {
  readonly xs: readonly number[];
  readonly ys: readonly number[];
  /** Cost multiplier for travelling *along* the line: the lane beside a state is the cheapest, which keeps the middle of a gap free for labels. */
  readonly xWeight: readonly number[];
  readonly yWeight: readonly number[];
  /** `[yi * nx + xi]`: the step from `xs[xi]` to `xs[xi + 1]` on row `yi` runs through a state. */
  readonly hBlocked: Uint8Array;
  /** `[yi * nx + xi]`: the step from `ys[yi]` to `ys[yi + 1]` on column `xi` runs through a state. */
  readonly vBlocked: Uint8Array;
};

/** Lanes one axis offers: beside every state, and down the middle of every gap between states. */
const laneLines = (intervals: readonly (readonly [number, number])[]): Line[] => {
  const lines: Line[] = [];
  for (const [start, end] of intervals) {
    for (const [index, offset] of [STUB, STUB + LANE, STUB + LANE * 2].entries()) {
      const priority = index === 0 ? 2 : 4;
      const weight = 1 + index * 0.02;
      lines.push({ at: start - offset, priority, weight }, { at: end + offset, priority, weight });
    }
  }
  const sorted = intervals.map(([start, end]) => [start - STUB, end + STUB] as const).sort((a, b) => a[0] - b[0]);
  let reach = sorted[0]?.[1] ?? 0;
  for (const [start, end] of sorted.slice(1)) {
    if (start > reach) {
      const middle = Math.round((reach + start) / 2);
      lines.push({ at: middle, priority: 1, weight: 1.03 });
      for (let step = 1; middle + step * LANE <= start; step++) {
        lines.push(
          { at: middle - step * LANE, priority: 3, weight: 1.03 + step * 0.01 },
          { at: middle + step * LANE, priority: 3, weight: 1.03 + step * 0.01 },
        );
      }
    }
    reach = Math.max(reach, end);
  }
  return lines;
};

const buildAxis = (lines: readonly Line[]): { at: number[]; weight: number[] } => {
  const ordered = lines.filter((line) => line.at >= CANVAS_MIN).sort((a, b) => a.priority - b.priority || a.at - b.at);
  const kept: Line[] = [];
  for (const line of ordered) {
    const clash =
      line.priority === 0
        ? kept.some((other) => other.at === line.at)
        : kept.some((other) => Math.abs(other.at - line.at) < MIN_SEP);
    if (!clash) kept.push(line);
  }
  kept.sort((a, b) => a.at - b.at);
  return { at: kept.map((line) => line.at), weight: kept.map((line) => line.weight) };
};

const buildGrid = (boxes: readonly Box[], extraX: readonly Line[], extraY: readonly Line[]): Grid => {
  const x = buildAxis([...laneLines(boxes.map((box) => [box.x, box.x + box.width] as const)), ...extraX]);
  const y = buildAxis([...laneLines(boxes.map((box) => [box.y, box.y + box.height] as const)), ...extraY]);
  const nx = x.at.length;
  const ny = y.at.length;
  const hBlocked = new Uint8Array(nx * ny);
  const vBlocked = new Uint8Array(nx * ny);
  for (const box of boxes) {
    const left = box.x - CLEAR;
    const right = box.x + box.width + CLEAR;
    const top = box.y - CLEAR;
    const bottom = box.y + box.height + CLEAR;
    for (let yi = 0; yi < ny; yi++) {
      const rowInside = y.at[yi]! > top && y.at[yi]! < bottom;
      const stepInside = yi + 1 < ny && y.at[yi]! < bottom && y.at[yi + 1]! > top;
      if (!rowInside && !stepInside) continue;
      for (let xi = 0; xi < nx; xi++) {
        if (rowInside && xi + 1 < nx && x.at[xi]! < right && x.at[xi + 1]! > left) hBlocked[yi * nx + xi] = 1;
        if (stepInside && x.at[xi]! > left && x.at[xi]! < right) vBlocked[yi * nx + xi] = 1;
      }
    }
  }
  return { xs: x.at, ys: y.at, xWeight: x.weight, yWeight: y.weight, hBlocked, vBlocked };
};

/* -------------------------------------------------------------------- search */

type Terminal = {
  readonly point: LayoutPoint;
  /** Start: the direction the route leaves in. Goal: the direction it must arrive in. */
  readonly direction: number;
  readonly cost: number;
};

type Found = {
  readonly points: readonly LayoutPoint[];
  readonly start: number;
  readonly goal: number;
  readonly cost: number;
};

/**
 * Cheapest orthogonal path from any start to any goal. A state is
 * `(cell, direction, fresh)`; `fresh` marks a step that directly followed a
 * turn and was shorter than `MIN_JOG`, after which the path may not turn again.
 */
const search = (
  grid: Grid,
  starts: readonly Terminal[],
  goals: readonly Terminal[],
  avoid: readonly Segment[],
  self: string,
  /** Off while only the sides are being chosen: every candidate shares the side's midpoint then. */
  separateLanes: boolean,
): Found | null => {
  const { xs, ys } = grid;
  const nx = xs.length;
  const ny = ys.length;
  const cellOf = (point: LayoutPoint): number => {
    const xi = xs.indexOf(point.x);
    const yi = ys.indexOf(point.y);
    return xi < 0 || yi < 0 ? -1 : yi * nx + xi;
  };
  const goalCells = goals.map((goal) => cellOf(goal.point));
  const goalsAt = new Map<number, number[]>();
  for (const [index, cell] of goalCells.entries()) {
    if (cell < 0) continue;
    goalsAt.set(cell, [...(goalsAt.get(cell) ?? []), index]);
  }
  if (goalsAt.size === 0) return null;

  const heuristic = (cell: number): number => {
    const x = xs[cell % nx]!;
    const y = ys[(cell - (cell % nx)) / nx]!;
    let nearest = Infinity;
    for (const [index, goal] of goals.entries()) {
      if (goalCells[index]! < 0) continue;
      nearest = Math.min(nearest, Math.abs(goal.point.x - x) + Math.abs(goal.point.y - y) + goal.cost);
    }
    return nearest;
  };

  const penalties = new Float32Array(nx * ny * 2).fill(-1);
  const stepPenalty = (cell: number, horizontal: boolean): number => {
    const slot = cell * 2 + (horizontal ? 0 : 1);
    const cached = penalties[slot]!;
    if (cached >= 0) return cached;
    const xi = cell % nx;
    const yi = (cell - xi) / nx;
    const at = horizontal ? ys[yi]! : xs[xi]!;
    const lo = horizontal ? xs[xi]! : ys[yi]!;
    const hi = horizontal ? xs[xi + 1]! : ys[yi + 1]!;
    let penalty = 0;
    for (const segment of avoid) {
      if (segment.edge === self) continue;
      if (segment.horizontal === horizontal) {
        if (!separateLanes) continue;
        const distance = Math.abs(segment.at - at);
        if (distance >= NEAR) continue;
        const shared = Math.min(hi, segment.hi) - Math.max(lo, segment.lo);
        if (shared > 0) penalty += shared * (distance < 2 ? 14 : 5);
      } else if (segment.at > lo && segment.at <= hi && at >= segment.lo && at <= segment.hi) {
        penalty += CROSS_COST;
      }
    }
    penalties[slot] = penalty;
    return penalty;
  };

  const size = nx * ny * 8;
  const best = new Float64Array(size).fill(Infinity);
  const previous = new Int32Array(size).fill(-1);
  const origin = new Int32Array(size).fill(-1);
  const heapCost: number[] = [];
  const heapState: number[] = [];
  const push = (cost: number, state: number): void => {
    let index = heapCost.length;
    heapCost.push(cost);
    heapState.push(state);
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (heapCost[parent]! <= cost) break;
      heapCost[index] = heapCost[parent]!;
      heapState[index] = heapState[parent]!;
      index = parent;
    }
    heapCost[index] = cost;
    heapState[index] = state;
  };
  const pop = (): number => {
    const top = heapState[0]!;
    const cost = heapCost.pop()!;
    const state = heapState.pop()!;
    const length = heapCost.length;
    if (length > 0) {
      let index = 0;
      for (;;) {
        let child = index * 2 + 1;
        if (child >= length) break;
        if (child + 1 < length && heapCost[child + 1]! < heapCost[child]!) child++;
        if (heapCost[child]! >= cost) break;
        heapCost[index] = heapCost[child]!;
        heapState[index] = heapState[child]!;
        index = child;
      }
      heapCost[index] = cost;
      heapState[index] = state;
    }
    return top;
  };

  for (const [index, start] of starts.entries()) {
    const cell = cellOf(start.point);
    if (cell < 0) continue;
    const state = (cell * 4 + start.direction) * 2;
    if (start.cost >= best[state]!) continue;
    best[state] = start.cost;
    origin[state] = index;
    push(start.cost + heuristic(cell), state);
  }

  let found: { state: number; goal: number; cost: number } | null = null;
  while (heapCost.length > 0) {
    if (found !== null && heapCost[0]! >= found.cost) break;
    const state = pop();
    const fresh = state % 2 === 1;
    const direction = ((state - (state % 2)) / 2) % 4;
    const cell = (state - (state % 8)) / 8;
    const cost = best[state]!;

    for (const index of goalsAt.get(cell) ?? []) {
      const goal = goals[index]!;
      const turns = goal.direction !== direction;
      if (turns && (fresh || (goal.direction + 2) % 4 === direction)) continue;
      const total = cost + goal.cost + (turns ? BEND_COST : 0);
      if (found === null || total < found.cost) found = { state, goal: index, cost: total };
    }

    const xi = cell % nx;
    const yi = (cell - xi) / nx;
    for (let next = 0; next < 4; next++) {
      if ((next + 2) % 4 === direction) continue;
      const turns = next !== direction;
      if (turns && fresh) continue;
      const nxi = xi + DX[next]!;
      const nyi = yi + DY[next]!;
      if (nxi < 0 || nyi < 0 || nxi >= nx || nyi >= ny) continue;
      const horizontal = next % 2 === 0;
      const stepCell = horizontal ? yi * nx + Math.min(xi, nxi) : Math.min(yi, nyi) * nx + xi;
      if ((horizontal ? grid.hBlocked : grid.vBlocked)[stepCell] === 1) continue;
      const length = horizontal ? Math.abs(xs[nxi]! - xs[xi]!) : Math.abs(ys[nyi]! - ys[yi]!);
      const weight = horizontal ? grid.yWeight[yi]! : grid.xWeight[xi]!;
      const total = cost + length * weight + stepPenalty(stepCell, horizontal) + (turns ? BEND_COST : 0);
      const nextCell = nyi * nx + nxi;
      const nextState = (nextCell * 4 + next) * 2 + (turns && length < MIN_JOG ? 1 : 0);
      if (total >= best[nextState]!) continue;
      best[nextState] = total;
      previous[nextState] = state;
      origin[nextState] = origin[state]!;
      push(total + heuristic(nextCell), nextState);
    }
  }
  if (found === null) return null;

  const points: LayoutPoint[] = [];
  for (let state = found.state; state >= 0; state = previous[state]!) {
    const cell = (state - (state % 8)) / 8;
    points.push({ x: xs[cell % nx]!, y: ys[(cell - (cell % nx)) / nx]! });
  }
  points.reverse();
  return { points, start: origin[found.state]!, goal: found.goal, cost: found.cost };
};

/* --------------------------------------------------------------------- sides */

type Link = StateRouteEdge & { readonly a: Box; readonly b: Box };

type SideChoice = {
  readonly from: Side;
  readonly to: Side;
  readonly points: readonly LayoutPoint[];
  readonly cost: number;
};

/** Where on `side` a transition towards `other` would sit if nothing else used that side. */
const sideAnchor = (box: Box, side: Side, other: Box): number => {
  const own = sideRange(box, side);
  const their = sideRange(other, side);
  const lo = Math.max(own.lo, their.lo);
  const hi = Math.min(own.hi, their.hi);
  return Math.round(lo <= hi ? (lo + hi) / 2 : (own.lo + own.hi) / 2);
};

const sideCapacity = (box: Box, side: Side): number => {
  const range = sideRange(box, side);
  return Math.floor((range.hi - range.lo) / PORT_GAP) + 1;
};

type Loads = Map<string, Record<Side, number>>;

const loadOf = (loads: Loads, id: string): Record<Side, number> => {
  let load = loads.get(id);
  if (!load) {
    load = { right: 0, bottom: 0, left: 0, top: 0 };
    loads.set(id, load);
  }
  return load;
};

/** A side that is already busy costs a little; one that is full costs more than most detours. */
const loadCost = (loads: Loads, id: string, box: Box, side: Side): number => {
  const load = loadOf(loads, id)[side];
  return load * 8 + Math.max(0, load - sideCapacity(box, side) + 1) * 120;
};

const stubClear = (point: LayoutPoint, side: Side, boxes: readonly Box[], own: Box): boolean => {
  const end = stepOut(point, side, STUB);
  if (end.x < CANVAS_MIN || end.y < CANVAS_MIN) return false;
  return !boxes.some((box) => box !== own && segmentHitsBox(point, end, box, CLEAR));
};

type SideEnd = { readonly side: Side; readonly port: LayoutPoint; readonly stub: LayoutPoint };

/** One candidate end per side of `box` whose stub is not walled in by a neighbour. */
const sideEnds = (box: Box, other: Box, boxes: readonly Box[]): SideEnd[] =>
  SIDES.flatMap((side) => {
    const port = portPoint(box, side, sideAnchor(box, side, other));
    return stubClear(port, side, boxes, box) ? [{ side, port, stub: stepOut(port, side, STUB) }] : [];
  });

const axisLines = (points: readonly LayoutPoint[], weight: number): { readonly x: Line[]; readonly y: Line[] } => ({
  x: points.map((point) => ({ at: point.x, priority: 0, weight })),
  y: points.map((point) => ({ at: point.y, priority: 0, weight })),
});

const centerOf = (box: Box): LayoutPoint => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });

const chooseSides = (links: readonly Link[], boxes: readonly Box[], loads: Loads): Map<string, SideChoice> => {
  const distance = (link: Link): number =>
    Math.abs(centerOf(link.a).x - centerOf(link.b).x) + Math.abs(centerOf(link.a).y - centerOf(link.b).y);
  const candidates = [...links]
    .sort((p, q) => distance(p) - distance(q) || byId(p.id, q.id))
    .map((link) => ({
      link,
      starts: sideEnds(link.a, link.b, boxes),
      goals: sideEnds(link.b, link.a, boxes),
    }));
  const stubs = axisLines(
    candidates.flatMap((entry) => [...entry.starts, ...entry.goals].map((end) => end.stub)),
    1,
  );
  const grid = buildGrid(boxes, stubs.x, stubs.y);
  const avoid: Segment[] = [];
  const chosen = new Map<string, SideChoice>();
  for (const { link, starts, goals } of candidates) {
    const found = search(
      grid,
      starts.map((end) => ({
        point: end.stub,
        direction: directionOf(end.side),
        cost: loadCost(loads, link.from, link.a, end.side),
      })),
      goals.map((end) => ({
        point: end.stub,
        direction: (directionOf(end.side) + 2) % 4,
        cost: loadCost(loads, link.to, link.b, end.side),
      })),
      avoid,
      link.id,
      false,
    );
    const start = found === null ? starts[0] : starts[found.start];
    const goal = found === null ? goals[0] : goals[found.goal];
    const from = start?.side ?? 'right';
    const to = goal?.side ?? 'left';
    const points =
      found === null || !start || !goal
        ? [centerOf(link.a), centerOf(link.b)]
        : simplify([start.port, ...found.points, goal.port]);
    chosen.set(link.id, { from, to, points, cost: found?.cost ?? Infinity });
    loadOf(loads, link.from)[from]++;
    loadOf(loads, link.to)[to]++;
    avoid.push(...segmentsOf(link.id, points));
  }
  return chosen;
};

/* --------------------------------------------------------------------- ports */

type SideItem = {
  readonly key: string;
  readonly edge: string;
  /** -1 turns towards the start of the side, +1 towards its end, 0 runs straight on; ±2 is a self transition. */
  readonly cls: number;
  /** How far out the route makes its first turn, and how far it runs after it. */
  readonly depth: number;
  readonly reach: number;
  /** Coordinate shared with the other end of a straight transition. */
  readonly anchor: number | null;
  /** Width the item takes on the side: a self transition holds both of its ports. */
  readonly span: number;
};

const turnOf = (
  points: readonly LayoutPoint[],
  side: Side,
): { readonly cls: number; readonly depth: number; readonly reach: number } => {
  const [p0, p1, p2] = points;
  if (!p0 || !p1 || !p2) return { cls: 0, depth: 0, reach: 0 };
  const along = isHorizontalSide(side) ? p2.y - p1.y : p2.x - p1.x;
  return {
    cls: Math.sign(along),
    depth: Math.abs(p1.x - p0.x) + Math.abs(p1.y - p0.y),
    reach: Math.abs(along),
  };
};

/**
 * Order along a side. Among the routes that turn the same way, the one that
 * turns nearest the state sits outermost, so none crosses a sibling.
 */
const compareItems = (p: SideItem, q: SideItem, middle: number): number => {
  if (p.cls !== q.cls) return p.cls - q.cls;
  if (p.cls === -1) return p.depth - q.depth || q.reach - p.reach || byId(p.key, q.key);
  if (p.cls === 1) return q.depth - p.depth || p.reach - q.reach || byId(p.key, q.key);
  return (p.anchor ?? middle) - (q.anchor ?? middle) || byId(p.key, q.key);
};

/** Spreads one side's sorted items along `[lo, hi]`, keeping every anchored item on its anchor. */
const placeSide = (items: readonly SideItem[], lo: number, hi: number): Map<string, number> => {
  const placed = new Map<string, number>();
  const spansOf = (list: readonly SideItem[]): number => list.reduce((sum, item) => sum + item.span, 0);
  const centre = (list: readonly SideItem[]): void => {
    const spans = spansOf(list);
    const gap = list.length < 2 ? 0 : Math.max(4, Math.min(PORT_GAP, (hi - lo - spans) / (list.length - 1)));
    let at = (lo + hi) / 2 - (spans + gap * (list.length - 1)) / 2;
    for (const item of list) {
      placed.set(item.key, Math.round(at));
      at += item.span + gap;
    }
  };
  const between = (list: readonly SideItem[], from: number, to: number): void => {
    const gap = Math.max(4, Math.min(PORT_GAP, (to - from - spansOf(list)) / (list.length + 1)));
    let at = from + gap;
    for (const item of list) {
      placed.set(item.key, Math.round(at));
      at += item.span + gap;
    }
  };
  /** Stacks a run against the anchor it belongs beside, as close as the port gap allows. */
  const stack = (list: readonly SideItem[], anchor: number, towardsStart: boolean): void => {
    if (list.length === 0) return;
    const room = towardsStart ? anchor - lo : hi - anchor;
    const gap = Math.max(4, Math.min(PORT_GAP, (room - spansOf(list)) / list.length));
    let at = anchor;
    for (const item of towardsStart ? [...list].reverse() : list) {
      if (towardsStart) {
        at -= gap + item.span;
        placed.set(item.key, Math.round(at));
      } else {
        at += gap;
        placed.set(item.key, Math.round(at));
        at += item.span;
      }
    }
  };

  const anchored = items.flatMap((item, index) => (item.anchor === null ? [] : [index]));
  const first = anchored[0];
  const last = anchored.at(-1);
  if (first === undefined || last === undefined) {
    centre(items);
    return placed;
  }
  for (const index of anchored) placed.set(items[index]!.key, items[index]!.anchor!);
  stack(items.slice(0, first), items[first]!.anchor!, true);
  stack(items.slice(last + 1), items[last]!.anchor!, false);
  for (let index = 0; index + 1 < anchored.length; index++) {
    const from = anchored[index]!;
    const to = anchored[index + 1]!;
    between(items.slice(from + 1, to), items[from]!.anchor!, items[to]!.anchor!);
  }
  return placed;
};

type Ports = {
  /** `${edge}:from` / `${edge}:to` → the port point; a self transition has both on one side. */
  readonly points: Map<string, LayoutPoint>;
  readonly loopSides: Map<string, Side>;
  /** Transitions that share one coordinate on both ends. */
  readonly straight: Set<string>;
};

const FACING: Readonly<Record<Side, Side>> = { right: 'left', left: 'right', top: 'bottom', bottom: 'top' };

const facesAcross = (a: Box, side: Side, b: Box): boolean => {
  if (side === 'right') return b.x >= a.x + a.width;
  if (side === 'left') return b.x + b.width <= a.x;
  if (side === 'bottom') return b.y >= a.y + a.height;
  return b.y + b.height <= a.y;
};

/** Each transition between two facing states gets one coordinate both ends agree on. */
const straightAnchors = (
  links: readonly Link[],
  sides: ReadonlyMap<string, SideChoice>,
  boxes: readonly Box[],
): Map<string, number> => {
  const groups = new Map<string, { link: Link; forward: boolean }[]>();
  for (const link of links) {
    const choice = sides.get(link.id);
    if (!choice || FACING[choice.from] !== choice.to || !facesAcross(link.a, choice.from, link.b)) continue;
    const forward = choice.from === 'right' || choice.from === 'bottom';
    const [first, second] = forward ? [link.from, link.to] : [link.to, link.from];
    const key = `${first}|${second}|${isHorizontalSide(choice.from) ? 'h' : 'v'}`;
    groups.set(key, [...(groups.get(key) ?? []), { link, forward }]);
  }
  const anchors = new Map<string, number>();
  for (const members of groups.values()) {
    const { link } = members[0]!;
    const side = sides.get(link.id)!.from;
    const own = sideRange(link.a, side);
    const their = sideRange(link.b, side);
    const lo = Math.max(own.lo, their.lo);
    const hi = Math.min(own.hi, their.hi);
    if (lo > hi) continue;
    const gap = members.length === 1 ? 0 : Math.min(PORT_GAP, (hi - lo) / (members.length - 1));
    if (members.length > 1 && gap < MIN_PORT_GAP) continue;
    members.sort((p, q) => Number(q.forward) - Number(p.forward) || byId(p.link.id, q.link.id));
    const start = (lo + hi) / 2 - (gap * (members.length - 1)) / 2;
    const coordinates = members.map((_, index) => Math.round(start + gap * index));
    const corridorClear = coordinates.every((at) => {
      const p = portPoint(link.a, side, at);
      const q = portPoint(link.b, FACING[side], at);
      return !boxes.some((box) => box !== link.a && box !== link.b && segmentHitsBox(p, q, box, CLEAR));
    });
    if (!corridorClear) continue;
    for (const [index, member] of members.entries()) anchors.set(member.link.id, coordinates[index]!);
  }
  return anchors;
};

const LOOP_SIDE_ORDER: readonly Side[] = ['top', 'bottom', 'right', 'left'];

/** A self transition takes the freest side that has room outside it for the loop and its label. */
const loopSide = (box: Box, id: string, boxes: readonly Box[], loads: Loads): Side => {
  const room = LOOP_REACH + LABEL_HEIGHT + LABEL_OFFSET + CLEAR;
  let best: Side = 'top';
  let bestCost = Infinity;
  for (const [index, side] of LOOP_SIDE_ORDER.entries()) {
    const area: Box = {
      x: side === 'left' ? box.x - room : side === 'right' ? box.x + box.width : box.x,
      y: side === 'top' ? box.y - room : side === 'bottom' ? box.y + box.height : box.y,
      width: isHorizontalSide(side) ? room : box.width,
      height: isHorizontalSide(side) ? box.height : room,
    };
    const blocked =
      area.x < CANVAS_MIN ||
      area.y < CANVAS_MIN ||
      boxes.some(
        (other) =>
          other !== box &&
          other.x < area.x + area.width &&
          other.x + other.width > area.x &&
          other.y < area.y + area.height &&
          other.y + other.height > area.y,
      );
    const cost = loadOf(loads, id)[side] * 100 + (blocked ? 1000 : 0) + index;
    if (cost < bestCost) {
      bestCost = cost;
      best = side;
    }
  }
  return best;
};

const assignPorts = (
  links: readonly Link[],
  loops: readonly Link[],
  sides: ReadonlyMap<string, SideChoice>,
  boxes: readonly Box[],
  loads: Loads,
): Ports => {
  const anchors = straightAnchors(links, sides, boxes);
  const bySide = new Map<string, { box: Box; side: Side; items: SideItem[] }>();
  const sideOf = (id: string, box: Box, side: Side): { box: Box; side: Side; items: SideItem[] } => {
    const key = `${id}|${side}`;
    let entry = bySide.get(key);
    if (!entry) {
      entry = { box, side, items: [] };
      bySide.set(key, entry);
    }
    return entry;
  };
  for (const link of links) {
    const choice = sides.get(link.id);
    if (!choice) continue;
    const anchor = anchors.get(link.id) ?? null;
    const ends = [
      { key: `${link.id}:from`, id: link.from, box: link.a, side: choice.from, points: choice.points },
      { key: `${link.id}:to`, id: link.to, box: link.b, side: choice.to, points: [...choice.points].reverse() },
    ];
    for (const end of ends) {
      const turn = anchor === null ? turnOf(end.points, end.side) : { cls: 0, depth: 0, reach: 0 };
      sideOf(end.id, end.box, end.side).items.push({ key: end.key, edge: link.id, ...turn, anchor, span: 0 });
    }
  }
  const loopSides = new Map<string, Side>();
  for (const loop of loops) {
    const side = loopSide(loop.a, loop.from, boxes, loads);
    loadOf(loads, loop.from)[side] += 2;
    loopSides.set(loop.id, side);
    const entry = sideOf(loop.from, loop.a, side);
    const towardsEnd = entry.items.filter((item) => item.cls >= 1).length;
    const towardsStart = entry.items.filter((item) => item.cls <= -1).length;
    entry.items.push({
      key: `${loop.id}:loop`,
      edge: loop.id,
      cls: towardsEnd <= towardsStart ? 2 : -2,
      depth: 0,
      reach: 0,
      anchor: null,
      span: LOOP_SPAN,
    });
  }

  const points = new Map<string, LayoutPoint>();
  for (const { box, side, items } of bySide.values()) {
    const range = sideRange(box, side);
    const middle = (range.lo + range.hi) / 2;
    const placed = placeSide(
      [...items].sort((p, q) => compareItems(p, q, middle)),
      range.lo,
      range.hi,
    );
    for (const item of items) {
      const at = placed.get(item.key) ?? middle;
      if (item.span === 0) {
        points.set(item.key, portPoint(box, side, at));
      } else {
        points.set(`${item.edge}:from`, portPoint(box, side, at));
        points.set(`${item.edge}:to`, portPoint(box, side, at + item.span));
      }
    }
  }
  return { points, loopSides, straight: new Set(anchors.keys()) };
};

/* -------------------------------------------------------------------- labels */

const charWidth = (char: string): number => {
  const code = char.codePointAt(0) ?? 0;
  if (code >= 0x2e80) return LABEL_FONT;
  if (char === ' ') return LABEL_FONT * 0.32;
  if (/[A-Z]/.test(char)) return LABEL_FONT * 0.68;
  if (/[a-z0-9]/.test(char)) return LABEL_FONT * 0.58;
  return LABEL_FONT * 0.5;
};

/** Size of a label chip, estimated from its text: the router runs before anything is drawn. */
export const stateLabelSize = (title: string): { readonly width: number; readonly height: number } => {
  let width = LABEL_PAD;
  for (const char of title) width += charWidth(char);
  return { width: Math.min(LABEL_MAX_WIDTH, Math.ceil(width)), height: LABEL_HEIGHT };
};

const LABEL_RATIOS = [0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8, 0.1, 0.9, 0, 1] as const;

/** The box each transition's arrowhead occupies, kept clear of so a label never covers it. */
const arrowZonesOf = (routes: ReadonlyMap<string, readonly LayoutPoint[]>): LabelBox[] =>
  [...routes.values()].flatMap((points) => {
    if (points.length < 2) return [];
    return [markerZone(END_MARKERS.arrow, endFrame(points, 'end'))];
  });

/**
 * Where each transition's label goes, through the shared placer: on the
 * transition's own line where it fits, else beside it, avoiding the states,
 * the other labels and the arrowheads.
 */
const placeLabels = (
  edges: readonly StateRouteEdge[],
  routes: ReadonlyMap<string, readonly LayoutPoint[]>,
  boxes: readonly Box[],
): Map<string, LayoutPoint> => {
  // Self transitions and short routes have the fewest spots to choose from, so they choose first.
  const requests = edges.flatMap((edge) => {
    const points = routes.get(edge.id);
    if (points === undefined || points.length < 2) return [];
    return [
      {
        id: edge.id,
        points,
        size: stateLabelSize(edge.title ?? ''),
        priority: edge.from === edge.to ? 1 : 0,
      },
    ];
  });
  const placed = placeEdgeLabels(
    requests,
    { boxes, zones: arrowZonesOf(routes), lines: routes },
    { ratios: LABEL_RATIOS },
  );
  return new Map([...placed].map(([id, placement]) => [id, placement.center] as const));
};

/* ---------------------------------------------------------------------- main */

const LABELS = new WeakMap<LayoutResult, ReadonlyMap<string, LayoutPoint>>();

/** Where the router put a transition's label on `layout`: the centre of the chip. */
export const stateLabelPoint = (layout: LayoutResult | null, id: string): LayoutPoint | null =>
  (layout === null ? undefined : LABELS.get(layout)?.get(id)) ?? null;

const loopRoute = (from: LayoutPoint, to: LayoutPoint, side: Side): LayoutPoint[] => [
  from,
  stepOut(from, side, LOOP_REACH),
  stepOut(to, side, LOOP_REACH),
  to,
];

type Pending = {
  readonly link: Link;
  readonly choice: SideChoice;
  readonly from: LayoutPoint;
  readonly to: LayoutPoint;
  readonly start: LayoutPoint;
  readonly goal: LayoutPoint;
};

/** Replaces `placement.routes` with this board's own, and records where each label goes. */
export const withStateRoutes = (placement: LayoutResult, edges: readonly StateRouteEdge[]): LayoutResult => {
  const nodes = new Map<string, PlacedNode>(placement.nodes.map((node) => [node.id, node]));
  const boxes: readonly Box[] = placement.nodes;
  const usable: Link[] = edges.flatMap((edge) => {
    const a = nodes.get(edge.from);
    const b = nodes.get(edge.to);
    return a && b ? [{ ...edge, a, b }] : [];
  });
  const links = usable.filter((edge) => edge.from !== edge.to);
  const loops = usable.filter((edge) => edge.from === edge.to);

  const loads: Loads = new Map();
  const sides = chooseSides(links, boxes, loads);
  const ports = assignPorts(links, loops, sides, boxes, loads);

  const routes = new Map<string, readonly LayoutPoint[]>();
  let avoid: Segment[] = [];
  for (const loop of loops) {
    const from = ports.points.get(`${loop.id}:from`);
    const to = ports.points.get(`${loop.id}:to`);
    const side = ports.loopSides.get(loop.id);
    if (!from || !to || !side) continue;
    const points = loopRoute(from, to, side);
    routes.set(loop.id, points);
    avoid.push(...segmentsOf(loop.id, points));
  }

  const pending: Pending[] = [];
  for (const link of links) {
    const choice = sides.get(link.id);
    const from = ports.points.get(`${link.id}:from`);
    const to = ports.points.get(`${link.id}:to`);
    if (!choice || !from || !to) continue;
    if (ports.straight.has(link.id)) {
      routes.set(link.id, [from, to]);
      avoid.push(...segmentsOf(link.id, [from, to]));
      continue;
    }
    const start = stepOut(from, choice.from, STUB);
    const goal = stepOut(to, choice.to, STUB);
    pending.push({ link, choice, from, to, start, goal });
    avoid.push(...segmentsOf(link.id, [from, start]), ...segmentsOf(link.id, [goal, to]));
  }
  const portLines = axisLines(
    pending.flatMap((entry) => [entry.from, entry.to]),
    1,
  );
  const stubLines = axisLines(
    pending.flatMap((entry) => [entry.start, entry.goal]),
    1,
  );
  const grid = buildGrid(boxes, [...portLines.x, ...stubLines.x], [...portLines.y, ...stubLines.y]);
  pending.sort((p, q) => p.choice.cost - q.choice.cost || byId(p.link.id, q.link.id));
  for (const { link, choice, from, to, start, goal } of pending) {
    const found = search(
      grid,
      [{ point: start, direction: directionOf(choice.from), cost: 0 }],
      [{ point: goal, direction: (directionOf(choice.to) + 2) % 4, cost: 0 }],
      avoid,
      link.id,
      true,
    );
    const points =
      found === null
        ? routeAroundObstacles(
            from,
            to,
            boxes.filter((box) => box !== link.a && box !== link.b),
            CLEAR,
          )
        : simplify([from, ...found.points, to]);
    routes.set(link.id, points);
    avoid.push(...segmentsOf(link.id, points));
  }
  // The first pass routes each transition blind to the ones after it; a second one lets it step around them.
  for (const { link, choice, from, to, start, goal } of pending) {
    const found = search(
      grid,
      [{ point: start, direction: directionOf(choice.from), cost: 0 }],
      [{ point: goal, direction: (directionOf(choice.to) + 2) % 4, cost: 0 }],
      avoid,
      link.id,
      true,
    );
    if (found === null) continue;
    const points = simplify([from, ...found.points, to]);
    routes.set(link.id, points);
    avoid = [...avoid.filter((segment) => segment.edge !== link.id), ...segmentsOf(link.id, points)];
  }

  const labels = placeLabels(usable, routes, boxes);
  const margin = 24;
  let width = placement.width;
  let height = placement.height;
  for (const points of routes.values()) {
    for (const point of points) {
      width = Math.max(width, point.x + margin);
      height = Math.max(height, point.y + margin);
    }
  }
  for (const edge of usable) {
    const center = labels.get(edge.id);
    if (!center) continue;
    const size = stateLabelSize(edge.title ?? '');
    width = Math.max(width, center.x + size.width / 2 + margin);
    height = Math.max(height, center.y + size.height / 2 + margin);
  }

  const result: LayoutResult = {
    ...placement,
    width,
    height,
    routes: edges.map((edge) => ({ id: edge.id, points: routes.get(edge.id) ?? [] })),
  };
  LABELS.set(result, labels);
  return result;
};
