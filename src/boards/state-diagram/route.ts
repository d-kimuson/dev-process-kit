/**
 * The state machine's own edge router: the rank-aware route the shared layered
 * layout draws, plus the three things a transition diagram needs and the
 * shared router cannot know about.
 *
 * 1. **One port per transition, not one per card side.** Every transition used
 *    to leave its state from the side's midpoint and enter the next one at the
 *    next side's midpoint, so two transitions out of the same state were drawn
 *    as a single stroke until their first bend. `lib/layout/ports.ts` fans each
 *    side's ports apart in the reader's own order (counterpart first, then id).
 * 2. **One lane per transition, not one channel per rank gap.** A shared
 *    channel x between two ranks put every sibling transition's vertical run on
 *    one line. Each transition now gets its own lane inside that gap, in the
 *    same order as the ports that feed it, which is what keeps a fan-out from
 *    crossing itself.
 * 3. **A rank-skipping transition goes around, not through.** `A → C` with `B`
 *    in the skipped rank ran straight through `B`'s card. When the plain lane
 *    route is blocked by a state it does not join, the transition is handed to
 *    `lib/layout/orthogonal-router.ts`'s obstacle-aware router instead.
 *
 * Backward transitions keep the shared layout's own shape (out of the bottom,
 * under every row, back up into the bottom), just with fanned ports and their
 * own under-row lane. After every route is drawn, `nudgeParallelRoutes` pulls
 * apart whatever interior runs still coincide.
 *
 * Pure: placed boxes and the transition list in, routes out — so the element
 * and a test can score exactly what is drawn.
 */

import type { LayoutPoint, LayoutResult, PlacedNode } from '../../lib/layout/layered';

import {
  crossingsAgainst,
  horizontalBlocked,
  routeAroundObstacles,
  verticalBlocked,
  type RouteBox,
  type RouteSegment,
} from '../../lib/layout/orthogonal-router';
import { fanOffset, staggeredEdgePorts, type EdgePorts, type FanEnd, type PortSide } from '../../lib/layout/ports';
import { nudgeParallelRoutes, type NudgeInput } from '../../lib/layout/route-nudge';

/** A transition, as far as routing it cares. */
export type StateRouteEdge = { readonly id: string; readonly from: string; readonly to: string };

export type StateRouteOptions = {
  /** Gap between two transition ports on one side of a state. */
  readonly portGap?: number;
  /** Gap between two transition lanes in one rank gap. */
  readonly laneGap?: number;
  /** Clearance the obstacle-aware fallback keeps from a state it routes around. */
  readonly margin?: number;
};

const DEFAULTS = { portGap: 16, laneGap: 10, margin: 12 } as const;
/** Distance kept from a state's corners by a port, and from a rank gap's edges by a lane. */
const PORT_INSET = 12;
const LANE_INSET = 14;
/** How far below the lowest row a backward transition's under-row lane sits, and how much each one after it steps down. */
const BACK_LANE_OFFSET = 18;
const BACK_LANE_STEP = 14;
/** How far a self-transition's loop stands off its own card. */
const SELF_LOOP_REACH = 22;
/**
 * The straight run a transition keeps out of a port before its first bend: the
 * arrowhead is drawn along the port's own direction, and a bend any closer
 * reads as the line starting beside the card rather than on it.
 */
const PORT_ESCAPE = 18;
/** Adjacent-swap passes over one rank gap's lanes, and the group size past which the search is skipped. */
const LANE_PASSES = 4;
const LANE_SEARCH_CAP = 10;

type Config = Required<StateRouteOptions>;

/** The outward unit normal of a card side. */
const outward = (side: PortSide): LayoutPoint => {
  switch (side) {
    case 'left':
      return { x: -1, y: 0 };
    case 'right':
      return { x: 1, y: 0 };
    case 'top':
      return { x: 0, y: -1 };
    case 'bottom':
      return { x: 0, y: 1 };
  }
};

const boxOf = (node: PlacedNode): RouteBox => ({ x: node.x, y: node.y, width: node.width, height: node.height });

/** Whether any segment of `points` runs through the open interior of any of `boxes`. */
const runsThrough = (points: readonly LayoutPoint[], boxes: readonly RouteBox[]): boolean =>
  points.slice(1).some((next, index) => {
    const previous = points[index];
    if (previous === undefined) return false;
    return previous.x === next.x
      ? verticalBlocked(previous.x, Math.min(previous.y, next.y), Math.max(previous.y, next.y), boxes)
      : horizontalBlocked(previous.y, Math.min(previous.x, next.x), Math.max(previous.x, next.x), boxes);
  });

/** Drops points that only continue the previous direction, so a route reads as its real turns. */
const simplify = (points: readonly LayoutPoint[]): readonly LayoutPoint[] => {
  const out: LayoutPoint[] = [];
  for (const point of points) {
    const a = out.at(-2);
    const b = out.at(-1);
    if (a !== undefined && b !== undefined && a.x === b.x && b.x === point.x) {
      out[out.length - 1] = point;
      continue;
    }
    if (a !== undefined && b !== undefined && a.y === b.y && b.y === point.y) {
      out[out.length - 1] = point;
      continue;
    }
    if (b !== undefined && b.x === point.x && b.y === point.y) continue;
    out.push(point);
  }
  return out;
};

const segmentsOf = (points: readonly LayoutPoint[]): readonly RouteSegment[] =>
  points.slice(1).map((point, index) => [points[index]!, point] as const);

/**
 * Which side of a state a transition leaves and enters by: forward transitions
 * read left to right, so they leave the right side and arrive at the left one;
 * everything else (backward, same-rank, or a self-transition) leaves and
 * arrives from below, where the under-row lane is. A self-transition splits its
 * two ends — out of the right side, back into the bottom — so its loop never
 * shares a port with itself.
 */
const stateSides = (from: PlacedNode, to: PlacedNode, end: FanEnd): PortSide => {
  if (from.id === to.id) return end === 'from' ? 'right' : 'bottom';
  const forward = from.layer < to.layer || (from.layer === to.layer && to.x > from.x + 12);
  if (!forward) return 'bottom';
  return end === 'from' ? 'right' : 'left';
};

/**
 * The lane inside one rank gap that each forward transition running through it
 * uses.
 *
 * Lanes start in the same order as the ports that feed them, which is the
 * reader's order and the non-crossing one when a fan runs one way. It is not
 * always the non-crossing one when the fan runs both ways — an edge leaving a
 * low port for a target further down has to reach past the vertical run of an
 * edge above it — so adjacent lanes are then swapped while the swap removes a
 * crossing between the two. That is a local search over at most a lane gap's
 * worth of transitions, deterministic (strict improvement only, in index
 * order), and it can never make the group worse than the order it started in.
 */
const laneOf = (
  edges: readonly StateRouteEdge[],
  byId: ReadonlyMap<string, PlacedNode>,
  ports: ReadonlyMap<string, EdgePorts>,
  config: Config,
): ReadonlyMap<string, number> => {
  type Member = { readonly id: string; readonly point: LayoutPoint; readonly end: LayoutPoint };
  const groups = new Map<string, { readonly low: number; readonly high: number; members: Member[] }>();
  for (const edge of edges) {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    const ends = ports.get(edge.id);
    if (from === undefined || to === undefined || ends === undefined || from.id === to.id) continue;
    if (ends.from.side !== 'right' || !(from.layer < to.layer)) continue;
    // A rank gap is the horizontal room between the source column's right edge
    // and the target column's left edge. Transitions sharing it must share its
    // lanes, so the key is that gap itself rather than the two ranks.
    const low = from.x + from.width;
    const high = to.x;
    const key = `${Math.round(low * 2)}|${Math.round(high * 2)}`;
    const group = groups.get(key) ?? { low, high, members: [] };
    group.members.push({ id: edge.id, point: ends.from.point, end: ends.to.point });
    groups.set(key, group);
  }

  const lanes = new Map<string, number>();
  for (const group of groups.values()) {
    const inset = Math.min(LANE_INSET, (group.high - group.low) / 2);
    const low = group.low + inset;
    const high = group.high - inset;
    const seed = [...group.members].sort((a, b) => a.point.y - b.point.y || a.id.localeCompare(b.id));
    const laneXs = (order: readonly Member[]): readonly number[] =>
      order.map((_, index) => fanOffset(low, high, order.length, index, config.laneGap));
    const routeFor = (member: Member, lane: number): readonly LayoutPoint[] =>
      simplify([member.point, { x: lane, y: member.point.y }, { x: lane, y: member.end.y }, member.end]);
    const cost = (order: readonly Member[]): number => {
      const xs = laneXs(order);
      let total = 0;
      for (let i = 0; i < order.length; i++) {
        const a = routeFor(order[i]!, xs[i]!);
        for (let j = i + 1; j < order.length; j++) {
          total += crossingsAgainst(a, segmentsOf(routeFor(order[j]!, xs[j]!)));
        }
      }
      return total;
    };

    let order = [...seed];
    let best = order.length > LANE_SEARCH_CAP ? Number.POSITIVE_INFINITY : cost(order);
    if (Number.isFinite(best)) {
      for (let pass = 0; pass < LANE_PASSES && best > 0; pass++) {
        for (let index = 0; index + 1 < order.length; index++) {
          const swapped = [...order];
          const a = swapped[index]!;
          swapped[index] = swapped[index + 1]!;
          swapped[index + 1] = a;
          const candidate = cost(swapped);
          if (candidate < best) {
            best = candidate;
            order = swapped;
          }
        }
      }
    }
    const xs = laneXs(order);
    order.forEach((member, index) => lanes.set(member.id, xs[index]!));
  }
  return lanes;
};

/**
 * The transitions' drawn routes for one layout. Every placement — the computed
 * one and the reader's dragged one — goes through here, so a drag never drops
 * back to the shared layout's coarser route.
 */
export const withStateRoutes = (
  placement: LayoutResult,
  edges: readonly StateRouteEdge[],
  options: StateRouteOptions = {},
): LayoutResult => {
  const config: Config = { ...DEFAULTS, ...options };
  const byId = new Map(placement.nodes.map((node) => [node.id, node]));
  const usable = edges.filter((edge) => byId.has(edge.from) && byId.has(edge.to));
  if (usable.length === 0) return placement;

  const ports = staggeredEdgePorts(placement.nodes, usable, {
    inset: PORT_INSET,
    gap: config.portGap,
    sideOf: ({ edge, end }) => {
      const from = byId.get(edge.from);
      const to = byId.get(edge.to);
      return from !== undefined && to !== undefined ? stateSides(from, to, end) : 'right';
    },
  });
  const lanes = laneOf(usable, byId, ports, config);
  const original = new Map(placement.routes.map((route) => [route.id, route.points] as const));
  const boxById = new Map(placement.nodes.map((node) => [node.id, boxOf(node)] as const));
  const obstaclesExcept = (from: PlacedNode, to: PlacedNode): readonly RouteBox[] =>
    placement.nodes.filter((node) => node.id !== from.id && node.id !== to.id).map(boxOf);

  // Short transitions first, so a long one detours around the ones already
  // drawn instead of the other way round; then by id, for determinism.
  const span = (edge: StateRouteEdge): number => {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    if (from === undefined || to === undefined) return 0;
    return Math.abs(to.x - from.x) + Math.abs(to.y - from.y);
  };
  const order = [...usable].sort((a, b) => span(a) - span(b) || a.id.localeCompare(b.id));

  let backIndex = 0;
  const avoid: RouteSegment[] = [];
  const routed = new Map<string, readonly LayoutPoint[]>();
  for (const edge of order) {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    const ends = ports.get(edge.id);
    const previous = original.get(edge.id) ?? [];
    if (from === undefined || to === undefined || ends === undefined) {
      routed.set(edge.id, previous);
      avoid.push(...segmentsOf(previous));
      continue;
    }
    const start = ends.from.point;
    const end = ends.to.point;
    const own = [boxById.get(from.id)!, boxById.get(to.id)!];
    const others = obstaclesExcept(from, to);
    const candidate = ((): readonly LayoutPoint[] => {
      if (from.id === to.id) {
        const right = from.x + from.width;
        return simplify([
          start,
          { x: right + SELF_LOOP_REACH, y: start.y },
          { x: right + SELF_LOOP_REACH, y: end.y + SELF_LOOP_REACH },
          { x: end.x, y: end.y + SELF_LOOP_REACH },
          end,
        ]);
      }
      if (ends.from.side === 'bottom') {
        // Backward: under every row, in this transition's own lane, and back up.
        const laneY = Math.max(start.y, end.y) + BACK_LANE_OFFSET + backIndex * BACK_LANE_STEP;
        backIndex += 1;
        return simplify([start, { x: start.x, y: laneY }, { x: end.x, y: laneY }, end]);
      }
      const lane = lanes.get(edge.id) ?? (start.x + end.x) / 2;
      const plain = simplify([start, { x: lane, y: start.y }, { x: lane, y: end.y }, end]);
      if (!runsThrough(plain, others)) return plain;
      // A rank-skipping transition: its own lane's cross-section is occupied by
      // a state it does not join, so let the general router find a way around.
      // Each end leaves its port straight first, or the detour's first turn
      // would run down the card's own border.
      const startNormal = outward(ends.from.side);
      const endNormal = outward(ends.to.side);
      const middle = routeAroundObstacles(
        { x: start.x + startNormal.x * PORT_ESCAPE, y: start.y + startNormal.y * PORT_ESCAPE },
        { x: end.x + endNormal.x * PORT_ESCAPE, y: end.y + endNormal.y * PORT_ESCAPE },
        others,
        config.margin,
        avoid,
        [...own, ...others],
        own,
      );
      return simplify([start, ...middle, end]);
    })();
    // Cutting through a state is never an improvement, whatever shape the
    // route takes; the shared layout's own route is the fallback of last resort.
    const chosen = runsThrough(candidate, others) && !runsThrough(previous, others) ? previous : candidate;
    routed.set(edge.id, chosen);
    avoid.push(...segmentsOf(chosen));
  }

  const inputs: NudgeInput[] = usable.map((edge) => {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    const own = from !== undefined && to !== undefined ? [boxById.get(from.id)!, boxById.get(to.id)!] : [];
    return {
      id: edge.id,
      points: routed.get(edge.id) ?? [],
      obstacles: from !== undefined && to !== undefined ? obstaclesExcept(from, to) : [],
      ownFrames: own,
    };
  });
  // Ports are never moved: this only separates interior runs that still
  // coincide (two under-row lanes, two lanes one gap could not spread).
  const nudged = nudgeParallelRoutes(inputs, { minPortRun: 0 });

  const routes = usable.map((edge) => ({ id: edge.id, points: nudged.get(edge.id) ?? routed.get(edge.id) ?? [] }));
  const drawn = [
    ...routes.flatMap((route) => route.points),
    ...placement.nodes.map((node) => ({ x: node.x + node.width, y: node.y + node.height })),
  ];
  return {
    ...placement,
    width: Math.max(placement.width, ...drawn.map((point) => point.x)),
    height: Math.max(placement.height, ...drawn.map((point) => point.y)),
    routes: [...placement.routes.filter((route) => !usable.some((edge) => edge.id === route.id)), ...routes],
  };
};
