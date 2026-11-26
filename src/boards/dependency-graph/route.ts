/**
 * Dependency routes: every edge is drawn on one shared grid, one edge at a
 * time, so a line never runs through a module, never shares a lane with a line
 * of another module, and never bends in a jog shorter than the grid's pitch.
 *
 * The shared layered router knows one point per node side and one channel per
 * rank gap, so sibling edges overlapped on one trunk, a cycle's back edge ran
 * under the row and merged into another line, and an edge that skipped a rank
 * crossed whatever stood in between. This router replaces it with a search
 * (A* over grid points, costed by length, bends and crossings) that works from
 * the placed boxes alone — the layout's ranks are never consulted, so a module
 * the reader dragged anywhere is routed by the same rules.
 *
 * What the reader sees:
 * - A module's outgoing edges form one tree: they leave from one port and
 *   branch where they part, so a module that depends on many others reads as
 *   one trunk instead of a fan of look-alike lines. Only edges of the same
 *   source ever share a segment; {@link branchPoint} is where the view puts
 *   the junction dot that tells a branch from a crossing.
 * - Every edge enters its target through a port of its own, with a straight
 *   run in front of it, so each arrowhead stands alone.
 * - An edge leaves the side that faces its target and enters the side that
 *   faces its source. A pair of modules that depend on each other therefore
 *   reads as two parallel lines with opposite arrowheads.
 *
 * Pure and deterministic: no DOM, same placement and edges → same routes.
 */

import type { LayoutPoint, LayoutResult, PlacedNode } from '../../lib/layout/layered';

export type DependencyRouteEdge = { readonly id: string; readonly from: string; readonly to: string };

/** Grid pitch: the gap between two parallel lanes, and the shortest run between two bends. */
export const ROUTE_PITCH = 12;
/** Distance every lane keeps from a module, and the least straight run in front of a port. */
export const ROUTE_CLEARANCE = 24;

const PORT_INSET = 12;
/** How far beyond the outermost modules an edge may loop. */
const GRID_MARGIN = 72;

/* Costs, in grid steps. */
const BEND_COST = 6;
const CROSSING_COST = 4;
/** Running right along a module's clearance: a lane one step further out reads calmer. */
const NEAR_COST = 0.25;
/** Leaving a tree that already exists costs less than opening a second port on the same module. */
const BRANCH_COST = 1;
const NEW_PORT_COST = 3;
/** Per lane a port sits away from where its side wants it; above 1 so the wanted lane beats a shorter path. */
const PORT_OFFSET_COST = 1.25;
const SIDE_COST = { facing: 0, across: 4, away: 12 } as const;
/** A back edge's ports sit this far past the side's middle, so it runs beside the forward edge of the same pair. */
const RETURN_PORT_OFFSET = 27;
/** Just above the middle, so a side whose middle falls between two lanes always picks the upper one. */
const FORWARD_PORT_OFFSET = -1;

/** Directions, clockwise from right; `direction & 1` is the axis (0 horizontal, 1 vertical). */
const DX = [1, 0, -1, 0] as const;
const DY = [0, 1, 0, -1] as const;
const RIGHT = 0;
const DOWN = 1;
const LEFT = 2;
const UP = 3;

type Port = {
  readonly index: number;
  readonly node: number;
  /** The direction pointing out of the module. */
  readonly direction: number;
  readonly border: LayoutPoint;
  /** The first free grid point in front of the port. */
  readonly pin: number;
  /** Signed distance from the middle of the side. */
  readonly offset: number;
  /** 0 while free, otherwise the net that leaves here, or -1 once an edge enters here. */
  owner: number;
};

/** One point of an already routed edge that a later edge of the same source may branch from. */
type TreePoint = { readonly port: Port; readonly cells: readonly number[]; readonly index: number };

type Routed = { readonly from: Port; readonly to: Port; readonly cells: readonly number[] };

class MinHeap {
  readonly #keys: number[] = [];
  readonly #values: number[] = [];

  get size(): number {
    return this.#keys.length;
  }

  push(key: number, value: number): void {
    const keys = this.#keys;
    const values = this.#values;
    let at = keys.length;
    keys.push(key);
    values.push(value);
    while (at > 0) {
      const parent = (at - 1) >> 1;
      if (keys[parent]! <= key) break;
      keys[at] = keys[parent]!;
      values[at] = values[parent]!;
      at = parent;
    }
    keys[at] = key;
    values[at] = value;
  }

  pop(): number {
    const keys = this.#keys;
    const values = this.#values;
    const top = values[0]!;
    const key = keys.pop()!;
    const value = values.pop()!;
    const size = keys.length;
    if (size === 0) return top;
    let at = 0;
    for (;;) {
      let child = at * 2 + 1;
      if (child >= size) break;
      if (child + 1 < size && keys[child + 1]! < keys[child]!) child++;
      if (keys[child]! >= key) break;
      keys[at] = keys[child]!;
      values[at] = values[child]!;
      at = child;
    }
    keys[at] = key;
    values[at] = value;
    return top;
  }
}

/** Which side of `node` faces `other`: sideways unless the two share a column. */
const facingDirection = (node: PlacedNode, other: PlacedNode): number => {
  const dx = other.x + other.width / 2 - (node.x + node.width / 2);
  const dy = other.y + other.height / 2 - (node.y + node.height / 2);
  if (Math.abs(dx) >= (node.width + other.width) / 2 || Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? RIGHT : LEFT;
  return dy >= 0 ? DOWN : UP;
};

const sideCost = (direction: number, facing: number): number =>
  direction === facing ? SIDE_COST.facing : (direction ^ facing) === 2 ? SIDE_COST.away : SIDE_COST.across;

const simplify = (points: readonly LayoutPoint[]): readonly LayoutPoint[] => {
  const result: LayoutPoint[] = [];
  for (const point of points) {
    const last = result.at(-1);
    if (last !== undefined && last.x === point.x && last.y === point.y) continue;
    const before = result.at(-2);
    if (
      last !== undefined &&
      before !== undefined &&
      ((before.x === last.x && last.x === point.x) || (before.y === last.y && last.y === point.y))
    ) {
      result[result.length - 1] = point;
      continue;
    }
    result.push(point);
  }
  return result;
};

/**
 * Replaces the placement's routes with grid routes and grows the canvas to
 * hold every drawn point. An edge the search cannot place (modules packed
 * without a free lane between them) keeps the placement's own route.
 */
export const withDependencyRoutes = (placement: LayoutResult, edges: readonly DependencyRouteEdge[]): LayoutResult => {
  const nodes = placement.nodes;
  if (nodes.length === 0 || edges.length === 0) return placement;
  const nodeIndex = new Map(nodes.map((node, index) => [node.id, index]));

  const lowerBound = (least: number): number =>
    Math.floor(Math.min(Math.max(ROUTE_PITCH, least - GRID_MARGIN), least - ROUTE_CLEARANCE) / ROUTE_PITCH);
  const x0 = lowerBound(Math.min(...nodes.map((node) => node.x)));
  const y0 = lowerBound(Math.min(...nodes.map((node) => node.y)));
  const cols = Math.ceil((Math.max(...nodes.map((node) => node.x + node.width)) + GRID_MARGIN) / ROUTE_PITCH) - x0 + 1;
  const rows = Math.ceil((Math.max(...nodes.map((node) => node.y + node.height)) + GRID_MARGIN) / ROUTE_PITCH) - y0 + 1;
  const cellCount = cols * rows;
  const cellOf = (cx: number, cy: number): number =>
    cx < x0 || cy < y0 || cx >= x0 + cols || cy >= y0 + rows ? -1 : (cx - x0) * rows + (cy - y0);
  const cellX = (cell: number): number => (Math.floor(cell / rows) + x0) * ROUTE_PITCH;
  const cellY = (cell: number): number => ((cell % rows) + y0) * ROUTE_PITCH;
  const STEP = [rows, 1, -rows, -1] as const;

  /** 2 inside a module's clearance, 1 right along it, 0 in the open. */
  const zone = new Uint8Array(cellCount);
  const mark = (node: PlacedNode, reach: number, value: number): void => {
    const fromX = Math.max(x0, Math.floor((node.x - reach) / ROUTE_PITCH) + 1);
    const toX = Math.min(x0 + cols - 1, Math.ceil((node.x + node.width + reach) / ROUTE_PITCH) - 1);
    const fromY = Math.max(y0, Math.floor((node.y - reach) / ROUTE_PITCH) + 1);
    const toY = Math.min(y0 + rows - 1, Math.ceil((node.y + node.height + reach) / ROUTE_PITCH) - 1);
    for (let cx = fromX; cx <= toX; cx++) {
      for (let cy = fromY; cy <= toY; cy++) {
        const cell = cellOf(cx, cy);
        if (zone[cell]! < value) zone[cell] = value;
      }
    }
  };
  for (const node of nodes) {
    mark(node, ROUTE_CLEARANCE + ROUTE_PITCH, 1);
    mark(node, ROUTE_CLEARANCE, 2);
  }

  const ports: Port[] = [];
  const portsOf: number[][] = nodes.map(() => []);
  const addPort = (node: number, direction: number, border: LayoutPoint, cx: number, cy: number, offset: number) => {
    const pin = cellOf(cx, cy);
    if (pin < 0 || zone[pin] === 2) return;
    portsOf[node]!.push(ports.length);
    ports.push({ index: ports.length, node, direction, border, pin, offset, owner: 0 });
  };
  nodes.forEach((node, index) => {
    const right = node.x + node.width;
    const bottom = node.y + node.height;
    for (let cy = Math.ceil((node.y + PORT_INSET) / ROUTE_PITCH); cy * ROUTE_PITCH <= bottom - PORT_INSET; cy++) {
      const y = cy * ROUTE_PITCH;
      const offset = y - (node.y + node.height / 2);
      addPort(index, RIGHT, { x: right, y }, Math.ceil((right + ROUTE_CLEARANCE) / ROUTE_PITCH), cy, offset);
      addPort(index, LEFT, { x: node.x, y }, Math.floor((node.x - ROUTE_CLEARANCE) / ROUTE_PITCH), cy, offset);
    }
    for (let cx = Math.ceil((node.x + PORT_INSET) / ROUTE_PITCH); cx * ROUTE_PITCH <= right - PORT_INSET; cx++) {
      const x = cx * ROUTE_PITCH;
      const offset = x - (node.x + node.width / 2);
      addPort(index, DOWN, { x, y: bottom }, cx, Math.ceil((bottom + ROUTE_CLEARANCE) / ROUTE_PITCH), offset);
      addPort(index, UP, { x, y: node.y }, cx, Math.floor((node.y - ROUTE_CLEARANCE) / ROUTE_PITCH), offset);
    }
  });

  /** Per axis, the net (1-based) whose line runs through a grid point; 0 while free. */
  const occupied = [new Int32Array(cellCount), new Int32Array(cellCount)] as const;
  const trees = new Map<number, Map<number, TreePoint>>();
  const cost = new Float64Array(cellCount * 4);
  const previous = new Int32Array(cellCount * 4);

  const route = (source: number, target: number): Routed | null => {
    const net = source + 1;
    const from = nodes[source]!;
    const to = nodes[target]!;
    const self = source === target;
    const back = to.x + to.width / 2 < from.x + from.width / 2;
    const exitFacing = self ? RIGHT : facingDirection(from, to);
    const entryFacing = self ? UP : facingDirection(to, from);
    const portCost = (port: Port, facing: number): number => {
      if (self && port.direction !== facing) return Number.POSITIVE_INFINITY;
      const wanted = back && port.direction === facing ? RETURN_PORT_OFFSET : FORWARD_PORT_OFFSET;
      return sideCost(port.direction, facing) + (Math.abs(port.offset - wanted) / ROUTE_PITCH) * PORT_OFFSET_COST;
    };
    const tree = trees.get(net) ?? new Map<number, TreePoint>();
    trees.set(net, tree);

    const estimate = (cell: number): number => {
      const x = cellX(cell);
      const y = cellY(cell);
      const dx = Math.max(to.x - x, 0, x - (to.x + to.width));
      const dy = Math.max(to.y - y, 0, y - (to.y + to.height));
      return (dx + dy) / ROUTE_PITCH;
    };

    cost.fill(Number.POSITIVE_INFINITY);
    previous.fill(-1);
    const heap = new MinHeap();
    const startPorts = new Map<number, Port>();
    const open = (state: number, value: number, from: number): void => {
      if (value >= cost[state]!) return;
      cost[state] = value;
      previous[state] = from;
      heap.push(value + estimate(state >> 2), state);
    };
    for (const cell of tree.keys()) {
      for (let direction = 0; direction < 4; direction++) open(cell * 4 + direction, BRANCH_COST, -1);
    }
    for (const index of portsOf[source]!) {
      const port = ports[index]!;
      if (port.owner !== 0 || occupied[port.direction & 1]![port.pin] !== 0) continue;
      const value = portCost(port, exitFacing) + (tree.size === 0 ? 0 : NEW_PORT_COST);
      if (!Number.isFinite(value)) continue;
      const state = port.pin * 4 + port.direction;
      if (value >= cost[state]!) continue;
      open(state, value, -1);
      startPorts.set(state, port);
    }

    const goals = new Map<number, Port[]>();
    for (const index of portsOf[target]!) {
      const port = ports[index]!;
      if (port.owner !== 0 || !Number.isFinite(portCost(port, entryFacing))) continue;
      const list = goals.get(port.pin);
      if (list) list.push(port);
      else goals.set(port.pin, [port]);
    }
    if (goals.size === 0) return null;

    /** Goal candidates share the heap with the search states, offset past them. */
    const goalBase = cellCount * 4;
    const goalCost = new Map<number, number>();
    const goalFrom = new Map<number, number>();

    while (heap.size > 0) {
      const state = heap.pop();
      if (state >= goalBase) {
        const end = ports[state - goalBase]!;
        const cells: number[] = [];
        let at = goalFrom.get(state)!;
        let first = at;
        while (at >= 0) {
          cells.push(at >> 2);
          first = at;
          at = previous[at]!;
        }
        cells.reverse();
        const startPort = startPorts.get(first);
        if (startPort !== undefined) return { from: startPort, to: end, cells };
        const branch = tree.get(first >> 2)!;
        return { from: branch.port, to: end, cells: [...branch.cells.slice(0, branch.index), ...cells] };
      }
      const cell = state >> 2;
      const direction = state & 3;
      const reached = cost[state]!;

      for (const port of goals.get(cell) ?? []) {
        const inward = port.direction ^ 2;
        if (direction === port.direction || occupied[port.direction & 1]![cell] !== 0) continue;
        if (startPorts.get(state) === port) continue;
        const total = reached + portCost(port, entryFacing) + (direction === inward ? 0 : BEND_COST);
        const goal = goalBase + port.index;
        if (total >= (goalCost.get(goal) ?? Number.POSITIVE_INFINITY)) continue;
        goalCost.set(goal, total);
        goalFrom.set(goal, state);
        heap.push(total, goal);
      }

      const cx = Math.floor(cell / rows);
      const cy = cell % rows;
      const fromTree = tree.has(cell);
      for (let next = 0; next < 4; next++) {
        if ((next ^ direction) === 2) continue;
        const nx = cx + DX[next]!;
        const ny = cy + DY[next]!;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const neighbour = cell + STEP[next]!;
        if (zone[neighbour] === 2 || tree.has(neighbour)) continue;
        const axis = next & 1;
        if (occupied[axis]![neighbour] !== 0) continue;
        if (occupied[axis]![cell] !== 0 && !fromTree) continue;
        open(
          neighbour * 4 + next,
          reached +
            1 +
            (next === direction ? 0 : BEND_COST) +
            (occupied[1 - axis]![neighbour] === 0 ? 0 : CROSSING_COST) +
            (zone[neighbour] === 1 ? NEAR_COST : 0),
          state,
        );
      }
    }
    return null;
  };

  const commit = (net: number, routed: Routed): void => {
    const { cells } = routed;
    routed.from.owner = net;
    routed.to.owner = -1;
    occupied[routed.from.direction & 1]![cells[0]!] = net;
    occupied[routed.to.direction & 1]![cells.at(-1)!] = net;
    for (let index = 0; index + 1 < cells.length; index++) {
      const axis = Math.abs(cells[index + 1]! - cells[index]!) === 1 ? 1 : 0;
      occupied[axis]![cells[index]!] = net;
      occupied[axis]![cells[index + 1]!] = net;
    }
    /* A branch needs room before the arrowhead it would otherwise sit on: the
       last two points in front of the target's port are never a junction. */
    const tree = trees.get(net)!;
    for (let index = 0; index < cells.length - 2; index++) {
      const cell = cells[index]!;
      if (!tree.has(cell)) tree.set(cell, { port: routed.from, cells, index });
    }
  };

  const centre = (node: PlacedNode): LayoutPoint => ({ x: node.x + node.width / 2, y: node.y + node.height / 2 });
  const span = (edge: DependencyRouteEdge): number => {
    const from = centre(nodes[nodeIndex.get(edge.from)!]!);
    const to = centre(nodes[nodeIndex.get(edge.to)!]!);
    return Math.abs(to.x - from.x) + Math.abs(to.y - from.y);
  };
  /* Shortest first: the edges with the least room to manoeuvre take the
     straight lanes and middle ports, and the long ones weave around them. */
  const ordered = edges
    .filter((edge) => nodeIndex.has(edge.from) && nodeIndex.has(edge.to))
    .map((edge) => ({ edge, span: span(edge) }))
    .sort((a, b) => a.span - b.span || a.edge.id.localeCompare(b.edge.id));

  const drawn = new Map<string, readonly LayoutPoint[]>();
  for (const { edge } of ordered) {
    const source = nodeIndex.get(edge.from)!;
    const routed = route(source, nodeIndex.get(edge.to)!);
    if (routed === null) continue;
    commit(source + 1, routed);
    drawn.set(
      edge.id,
      simplify([
        routed.from.border,
        ...routed.cells.map((cell) => ({ x: cellX(cell), y: cellY(cell) })),
        routed.to.border,
      ]),
    );
  }

  let width = placement.width;
  let height = placement.height;
  for (const points of drawn.values()) {
    for (const point of points) {
      width = Math.max(width, point.x + ROUTE_CLEARANCE);
      height = Math.max(height, point.y + ROUTE_CLEARANCE);
    }
  }
  return {
    ...placement,
    width,
    height,
    routes: placement.routes.map((entry) => ({ id: entry.id, points: drawn.get(entry.id) ?? entry.points })),
  };
};

/**
 * Where `route` leaves the lines of `earlier` routes that start at the same
 * port: the point the view marks with a junction dot. `null` when it shares
 * nothing with them.
 */
export const branchPoint = (
  route: readonly LayoutPoint[],
  earlier: readonly (readonly LayoutPoint[])[],
): LayoutPoint | null => {
  let best: LayoutPoint | null = null;
  let longest = 0;
  for (const other of earlier) {
    let shared = 0;
    let at: LayoutPoint | null = null;
    for (let index = 0; index + 1 < Math.min(route.length, other.length); index++) {
      const a = route[index]!;
      const b = other[index]!;
      if (a.x !== b.x || a.y !== b.y) break;
      const an = route[index + 1]!;
      const bn = other[index + 1]!;
      const al = Math.abs(an.x - a.x) + Math.abs(an.y - a.y);
      const bl = Math.abs(bn.x - b.x) + Math.abs(bn.y - b.y);
      const sameWay =
        Math.sign(an.x - a.x) === Math.sign(bn.x - b.x) && Math.sign(an.y - a.y) === Math.sign(bn.y - b.y);
      if (!sameWay) {
        at = index === 0 ? null : a;
        break;
      }
      shared += Math.min(al, bl);
      at = al <= bl ? an : bn;
      if (al !== bl) break;
    }
    if (at !== null && shared > longest) {
      longest = shared;
      best = at;
    }
  }
  return best;
};
