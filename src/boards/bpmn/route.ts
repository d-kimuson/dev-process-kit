import type { LayoutPoint, LayoutResult, PlacedNode } from '../../lib/layout/layered';
import type { BpmnData, BpmnFlow, BpmnNode } from './model';

import { placeEdgeLabels, type LabelBox } from '../../lib/layout/edge-labels';
import {
  horizontalBlocked,
  routeAroundObstacles,
  verticalBlocked,
  type RouteSegment,
} from '../../lib/layout/orthogonal-router';
import { endFrame } from '../../lib/layout/path-steps';
import { staggeredEdgePorts, type EdgePorts, type PortSide } from '../../lib/layout/ports';
import { nudgeParallelRoutes } from '../../lib/layout/route-nudge';
import { edgeReach, markerZone, type EdgeSpec } from '../base/edge';
import { BPMN_PAD_X, type BpmnBands, type BpmnPoolBand } from './layout';
import { flowSpec } from './markers';
import { externalLabel, flowLabelSize, nodeShape, outlinePoint } from './shapes';

/**
 * The BPMN board's own edge router.
 *
 * Sequence flows stay inside their pool, message flows cross the gap between
 * two pools, and associations reach an artifact from the node it annotates.
 * Every end is projected onto its node's actual outline, every route keeps a
 * straight run under its end glyphs, and a final nudge pass pulls parallel
 * runs apart. Pure: placed boxes, bands and flows in; routes and label points
 * out, so a test can score exactly what will be drawn.
 */

const CLEAR = 14;
const STUB = Math.max(17, 0);
const LABEL_MARGIN = 4;

type Box = { readonly x: number; readonly y: number; readonly width: number; readonly height: number };

/** What the element asks the router for after the drawing: label positions live beside the layout. */
export type BpmnRouteExtra = {
  readonly labels: ReadonlyMap<string, LayoutPoint>;
  readonly nodeLabels: ReadonlyMap<string, Box>;
};

const EXTRA = new WeakMap<LayoutResult, BpmnRouteExtra>();

export const bpmnFlowLabelPoint = (layout: LayoutResult | null, id: string): LayoutPoint | null =>
  (layout === null ? undefined : EXTRA.get(layout)?.labels.get(id)) ?? null;

export const bpmnNodeLabelBox = (layout: LayoutResult | null, id: string): Box | null =>
  (layout === null ? undefined : EXTRA.get(layout)?.nodeLabels.get(id)) ?? null;

const clamp = (value: number, low: number, high: number): number => Math.min(high, Math.max(low, value));
const boxOf = (node: PlacedNode): Box => ({ x: node.x, y: node.y, width: node.width, height: node.height });
const centreOf = (node: PlacedNode): LayoutPoint => ({ x: node.x + node.width / 2, y: node.y + node.height / 2 });
const inflate = (box: Box, by: number): Box => ({
  x: box.x - by,
  y: box.y - by,
  width: box.width + by * 2,
  height: box.height + by * 2,
});

const directionOf = (side: PortSide): LayoutPoint => {
  if (side === 'left') return { x: -1, y: 0 };
  if (side === 'right') return { x: 1, y: 0 };
  if (side === 'top') return { x: 0, y: -1 };
  return { x: 0, y: 1 };
};
const stepOut = (point: LayoutPoint, side: PortSide, distance: number): LayoutPoint => {
  const dir = directionOf(side);
  return { x: point.x + dir.x * distance, y: point.y + dir.y * distance };
};

const simplify = (points: readonly LayoutPoint[]): LayoutPoint[] => {
  const out: LayoutPoint[] = [];
  for (const point of points) {
    const last = out.at(-1);
    if (last !== undefined && last.x === point.x && last.y === point.y) continue;
    const before = out.at(-2);
    if (last !== undefined && before !== undefined) {
      const collinear = (before.x === last.x && last.x === point.x) || (before.y === last.y && last.y === point.y);
      if (collinear) {
        out.pop();
        const previous = out.at(-1);
        if (previous !== undefined && previous.x === point.x && previous.y === point.y) continue;
      }
    }
    out.push({ x: Math.round(point.x * 100) / 100, y: Math.round(point.y * 100) / 100 });
  }
  return out;
};

const segmentsOf = (points: readonly LayoutPoint[]): RouteSegment[] =>
  points.slice(1).map((point, index) => [points[index]!, point] as RouteSegment);

const segmentHitsBox = (segment: RouteSegment, box: Box, margin = 0): boolean => {
  const [a, b] = segment;
  return (
    Math.max(a.x, b.x) > box.x - margin &&
    Math.min(a.x, b.x) < box.x + box.width + margin &&
    Math.max(a.y, b.y) > box.y - margin &&
    Math.min(a.y, b.y) < box.y + box.height + margin
  );
};

/** Boxes that wall a sequence flow into its own pool's lane area. */
const poolWalls = (pool: BpmnPoolBand, width: number, contentLeft: number): Box[] => [
  { x: -1000, y: pool.y - 1000, width: width + 2000, height: 1000 },
  { x: -1000, y: pool.y + pool.height, width: width + 2000, height: 1000 },
  { x: -1000, y: pool.y, width: 1000 + contentLeft, height: pool.height },
  { x: width, y: pool.y, width: 1000, height: pool.height },
];

type EndSide = PortSide;

/** Which side of an end a flow uses, before ports are fanned. */
const sideFor = (
  flow: BpmnFlow,
  end: 'from' | 'to',
  from: PlacedNode,
  to: PlacedNode,
  fromNode: BpmnNode,
  toNode: BpmnNode,
): EndSide => {
  if (flow.kind === 'association') {
    const sideForBox = (own: PlacedNode, other: PlacedNode): PortSide => {
      const start = centreOf(own);
      const finish = centreOf(other);
      const ddx = finish.x - start.x;
      const ddy = finish.y - start.y;
      if (Math.abs(ddx) >= Math.abs(ddy)) return ddx >= 0 ? 'right' : 'left';
      return ddy >= 0 ? 'bottom' : 'top';
    };
    return end === 'from' ? sideForBox(from, to) : sideForBox(to, from);
  }
  if (flow.kind === 'message') {
    const own = end === 'from' ? fromNode : toNode;
    const other = end === 'from' ? toNode : fromNode;
    const ownPool = own.pool;
    const otherPool = other.pool;
    // A pool end has no node; its band decides above/below.
    return ownPool !== null && otherPool !== null && ownPool === otherPool
      ? 'bottom'
      : (() => {
          const ownY = centreOf(end === 'from' ? from : to).y;
          const otherY = centreOf(end === 'from' ? to : from).y;
          return otherY < ownY ? 'top' : 'bottom';
        })();
  }
  const forward = centreOf(to).x >= centreOf(from).x;
  if (!forward) return 'bottom';
  const facing = (own: PlacedNode, other: PlacedNode): PortSide => {
    const dx = centreOf(other).x - centreOf(own).x;
    const dy = centreOf(other).y - centreOf(own).y;
    if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'right' : 'left';
    return dy >= 0 ? 'bottom' : 'top';
  };
  const facingEntry = (own: PlacedNode, other: PlacedNode): PortSide => {
    // `own` is the gateway/event being entered; the side that faces `other`
    // is the side pointing at it, not away from it.
    const dx = centreOf(other).x - centreOf(own).x;
    const dy = centreOf(other).y - centreOf(own).y;
    if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'right' : 'left';
    return dy >= 0 ? 'bottom' : 'top';
  };
  if (end === 'to') {
    if (toNode.kind === 'gateway' || toNode.kind === 'event') return facingEntry(to, from);
    return 'left';
  }
  const dy = centreOf(to).y - centreOf(from).y;
  if (fromNode.kind === 'gateway' || fromNode.kind === 'event') return facing(from, to);
  if (Math.abs(dy) < from.height / 2) return 'right';
  return 'right';
};

/** A port point projected onto the node's outline. */
const projectPort = (node: BpmnNode, placed: PlacedNode, side: PortSide, point: LayoutPoint): LayoutPoint => {
  const shape = nodeShape(node);
  const along =
    shape === 'circle' || shape === 'diamond'
      ? 0
      : side === 'left' || side === 'right'
        ? point.y - (placed.y + placed.height / 2)
        : point.x - (placed.x + placed.width / 2);
  return outlinePoint(shape, placed, side, along);
};

/** The nearest x on a node's side to `wanted`, and every other candidate inward from it. */
const sideCandidates = (placed: PlacedNode, side: PortSide, wanted: number, inset: number): readonly number[] => {
  const low = (side === 'left' || side === 'right' ? placed.y : placed.x) + inset;
  const high = (side === 'left' || side === 'right' ? placed.y + placed.height : placed.x + placed.width) - inset;
  if (low >= high) return [Math.round((low + high) / 2)];
  const values: number[] = [];
  const start = Math.round(clamp(wanted, low, high));
  values.push(start);
  for (let offset = 8; offset <= high - low; offset += 8) {
    const before = start - offset;
    const after = start + offset;
    if (before >= low) values.push(before);
    if (after <= high) values.push(after);
  }
  return values;
};

const verticalClear = (x: number, top: number, bottom: number, obstacles: readonly Box[]): boolean =>
  !verticalBlocked(x, Math.min(top, bottom), Math.max(top, bottom), obstacles);

type RouteContext = {
  readonly placement: LayoutResult;
  readonly data: BpmnData;
  readonly bands: BpmnBands;
  readonly nodeById: ReadonlyMap<string, BpmnNode>;
  readonly placed: ReadonlyMap<string, PlacedNode>;
  readonly poolById: ReadonlyMap<string, BpmnPoolBand>;
  readonly labelBoxes: readonly Box[];
  readonly ports: ReadonlyMap<string, EdgePorts>;
  readonly messageOffsets: ReadonlyMap<string, number>;
  readonly routes: Map<string, readonly LayoutPoint[]>;
  readonly avoid: RouteSegment[];
};

/** The pool a node or pool-end belongs to. */
const poolBandOf = (context: RouteContext, id: string): BpmnPoolBand | null => {
  const node = context.nodeById.get(id);
  const pool = node?.pool ?? id;
  return context.poolById.get(pool) ?? null;
};

const poolEdgeY = (pool: BpmnPoolBand, side: 'top' | 'bottom'): number =>
  side === 'top' ? pool.y : pool.y + pool.height;

const horizontalSide = (side: PortSide): boolean => side === 'left' || side === 'right';
const fixedPort = (node: BpmnNode): boolean => node.kind === 'event' || node.kind === 'gateway';

const pointAt = (placed: PlacedNode, side: PortSide, value: number): LayoutPoint =>
  horizontalSide(side)
    ? { x: side === 'right' ? placed.x + placed.width : placed.x, y: value }
    : { x: value, y: side === 'bottom' ? placed.y + placed.height : placed.y };

/**
 * Two ends whose ports are a hair apart (a task's fanned port against a
 * gateway's midpoint, say) would draw a jog too short to read. When both sides
 * run on one axis, move the flexible end(s) onto a shared coordinate; an
 * event's or gateway's midpoint never moves.
 */
const alignPorts = (
  fromNode: BpmnNode,
  from: PlacedNode,
  fromSide: PortSide,
  fromPort: LayoutPoint,
  toNode: BpmnNode,
  to: PlacedNode,
  toSide: PortSide,
  toPort: LayoutPoint,
): readonly [LayoutPoint, LayoutPoint] => {
  if (horizontalSide(fromSide) !== horizontalSide(toSide)) return [fromPort, toPort];
  const diff = horizontalSide(fromSide) ? Math.abs(fromPort.y - toPort.y) : Math.abs(fromPort.x - toPort.x);
  if (diff === 0 || diff >= 12) return [fromPort, toPort];
  const value = horizontalSide(fromSide)
    ? fixedPort(fromNode)
      ? fromPort.y
      : fixedPort(toNode)
        ? toPort.y
        : (fromPort.y + toPort.y) / 2
    : fixedPort(fromNode)
      ? fromPort.x
      : fixedPort(toNode)
        ? toPort.x
        : (fromPort.x + toPort.x) / 2;
  return [
    projectPort(fromNode, from, fromSide, pointAt(from, fromSide, value)),
    projectPort(toNode, to, toSide, pointAt(to, toSide, value)),
  ];
};

const routeSequence = (context: RouteContext, flow: BpmnFlow, spec: EdgeSpec): readonly LayoutPoint[] => {
  const fromNode = context.nodeById.get(flow.from)!;
  const toNode = context.nodeById.get(flow.to)!;
  const from = context.placed.get(flow.from)!;
  const to = context.placed.get(flow.to)!;
  const pool = poolBandOf(context, flow.from);
  if (pool === null) return [centreOf(from), centreOf(to)];
  const forward = centreOf(to).x >= centreOf(from).x;
  const fromSide = sideFor(flow, 'from', from, to, fromNode, toNode);
  const toSide = sideFor(flow, 'to', from, to, fromNode, toNode);
  const reach = Math.max(STUB, edgeReach(spec));
  const fromCentre = centreOf(from);
  const toCentre = centreOf(to);

  if (!forward) {
    const lane = [...pool.lanes].find((band) => from.y >= band.y && from.y < band.y + band.height);
    const laneBottom = lane === undefined ? pool.y + pool.height : lane.y + lane.height;
    const index = [...context.data.edges]
      .filter((edge) => edge.kind === 'sequence')
      .filter((edge) => {
        const source = context.placed.get(edge.from);
        const target = context.placed.get(edge.to);
        return (
          source !== undefined &&
          target !== undefined &&
          centreOf(target).x < centreOf(source).x &&
          (context.nodeById.get(edge.from)?.pool ?? null) === fromNode.pool
        );
      })
      .sort((p, q) => (p.id < q.id ? -1 : p.id > q.id ? 1 : 0))
      .findIndex((edge) => edge.id === flow.id);
    const channel = Math.min(pool.y + pool.height - 8, laneBottom + 8 + Math.max(0, index) * 14);
    const loopFrom = context.ports.get(flow.id)?.from;
    const loopTo = context.ports.get(flow.id)?.to;
    const fromPort = projectPort(
      fromNode,
      from,
      'bottom',
      loopFrom?.point ?? { x: fromCentre.x, y: from.y + from.height },
    );
    const toPort = projectPort(toNode, to, 'bottom', loopTo?.point ?? { x: toCentre.x, y: to.y + to.height });
    return simplify([fromPort, { x: fromPort.x, y: channel }, { x: toPort.x, y: channel }, toPort]);
  }

  const fromEnd = context.ports.get(flow.id)?.from;
  const toEnd = context.ports.get(flow.id)?.to;
  const [fromPort, toPort] = alignPorts(
    fromNode,
    from,
    fromEnd?.side ?? fromSide,
    projectPort(fromNode, from, fromEnd?.side ?? fromSide, fromEnd?.point ?? { x: fromCentre.x, y: fromCentre.y }),
    toNode,
    to,
    toEnd?.side ?? toSide,
    projectPort(toNode, to, toEnd?.side ?? toSide, toEnd?.point ?? { x: toCentre.x, y: toCentre.y }),
  );
  const outgoing = stepOut(fromPort, fromEnd?.side ?? fromSide, reach);
  const incoming = stepOut(toPort, toEnd?.side ?? toSide, reach);
  const start = outgoing;
  const goal = incoming;
  const walls = poolWalls(pool, context.placement.width, context.bands.contentLeft);
  const obstacles = [
    ...context.labelBoxes,
    ...[...context.placed.values()]
      .filter((node) => node.id !== flow.from && node.id !== flow.to)
      .map((node) => inflate(boxOf(node), CLEAR)),
    ...context.bands.pools
      .filter((band) => band.id !== pool.id)
      .map((band) => inflate({ x: 0, y: band.y, width: context.placement.width, height: band.height }, CLEAR)),
  ];
  const middle = routeAroundObstacles(
    start,
    goal,
    obstacles,
    CLEAR,
    context.avoid,
    [boxOf(from), boxOf(to)],
    [...walls, boxOf(from), boxOf(to)],
  );
  return simplify([fromPort, ...middle, toPort]);
};

const messageCandidates = (
  node: BpmnNode,
  placed: PlacedNode,
  side: 'top' | 'bottom',
  wanted: number,
  obstacles: readonly Box[],
  edgeY: number,
): number | null => {
  const shape = nodeShape(node);
  const inset = shape === 'circle' ? placed.width / 2 : shape === 'diamond' ? placed.width / 2 : 12;
  const candidates =
    shape === 'circle' || shape === 'diamond'
      ? [Math.round(placed.x + placed.width / 2)]
      : sideCandidates(placed, side, wanted, inset);
  const portY = side === 'top' ? placed.y : placed.y + placed.height;
  const found = candidates.find((x) => verticalClear(x, portY, edgeY, obstacles));
  return found ?? null;
};

const fallbackPortX = (node: BpmnNode, placed: PlacedNode, wanted: number): number => {
  const shape = nodeShape(node);
  if (shape === 'circle' || shape === 'diamond') return Math.round(placed.x + placed.width / 2);
  return Math.round(clamp(wanted, placed.x + 12, placed.x + placed.width - 12));
};

type MessageGap = { readonly top: number; readonly bottom: number };
type MessageGaps = {
  readonly source: MessageGap;
  readonly target: MessageGap;
  readonly adjacent: boolean;
  readonly channelFor: (gap: MessageGap) => number;
};

/** The gap(s) a message must run through, and the channel it owns in each. */
const messageGaps = (context: RouteContext, flow: BpmnFlow): MessageGaps | null => {
  const fromPool = poolBandOf(context, flow.from);
  const toPool = poolBandOf(context, flow.to);
  if (fromPool === null || toPool === null) return null;
  const pools = [...context.bands.pools].sort((a, b) => a.y - b.y);
  const sourceIndex = pools.findIndex((pool) => pool.id === fromPool.id);
  const targetIndex = pools.findIndex((pool) => pool.id === toPool.id);
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return null;
  const down = targetIndex > sourceIndex;
  const sourceNeighbour = pools[sourceIndex + (down ? 1 : -1)];
  const targetNeighbour = pools[targetIndex + (down ? -1 : 1)];
  if (sourceNeighbour === undefined || targetNeighbour === undefined) return null;
  const between = (upper: BpmnPoolBand, lower: BpmnPoolBand): MessageGap => ({
    top: upper.y + upper.height,
    bottom: lower.y,
  });
  const source = down ? between(fromPool, sourceNeighbour) : between(sourceNeighbour, fromPool);
  const target = down ? between(targetNeighbour, toPool) : between(toPool, targetNeighbour);
  const same = (a: MessageGap, b: MessageGap): boolean => a.top === b.top && a.bottom === b.bottom;
  const messages = context.data.edges
    .filter((edge) => edge.kind === 'message')
    .sort((p, q) => (p.id < q.id ? -1 : p.id > q.id ? 1 : 0));
  const channelFor = (gap: MessageGap): number => {
    const users = messages.filter((message) => {
      const info = messageGapsFor(message);
      return info !== null && (same(info.source, gap) || same(info.target, gap));
    });
    const index = Math.max(
      0,
      users.findIndex((message) => message.id === flow.id),
    );
    return Math.round(gap.top + ((index + 1) * (gap.bottom - gap.top)) / (users.length + 1));
  };
  // `channelFor` asks about every message, including the one being routed; a
  // tiny memo keyed by flow id keeps that from recursing forever.
  const cache = messageGapCache.get(context) ?? new Map<string, MessageGaps | null>();
  messageGapCache.set(context, cache);
  const messageGapsFor = (message: BpmnFlow): MessageGaps | null => {
    if (message.id === flow.id) return info;
    const known = cache.get(message.id);
    if (known !== undefined) return known;
    cache.set(message.id, null);
    const computed = messageGaps(context, message);
    cache.set(message.id, computed);
    return computed;
  };
  const info: MessageGaps = { source, target, adjacent: Math.abs(sourceIndex - targetIndex) === 1, channelFor };
  cache.set(flow.id, info);
  return info;
};

const messageGapCache = new WeakMap<RouteContext, Map<string, MessageGaps | null>>();

/**
 * A vertical leg that steps sideways around whatever blocks it. The sideways
 * run happens one stub away from the port, inside the pool if it must: a
 * message may dodge its own pool's nodes, while its cross-pool horizontal runs
 * still happen only in the gaps.
 */
const verticalLeg = (
  start: LayoutPoint,
  end: LayoutPoint,
  blockers: readonly Box[],
  preference: 'left' | 'right',
): LayoutPoint[] => {
  if (start.x === end.x && verticalClear(start.x, start.y, end.y, blockers)) return [start, end];
  const sign = Math.sign(end.y - start.y) || 1;
  const span = Math.abs(end.y - start.y);
  const mids = [...new Set([Math.min(STUB, span / 2), Math.min(16, span / 2), Math.min(24, span / 2)])]
    .map((distance) => start.y + sign * distance)
    .filter((mid) => Math.abs(mid - start.y) >= 8 && Math.abs(mid - end.y) >= 8);
  const crossing = blockers.filter(
    (box) =>
      start.x > box.x &&
      start.x < box.x + box.width &&
      Math.min(start.y, end.y) < box.y + box.height &&
      Math.max(start.y, end.y) > box.y,
  );
  const left = crossing.length === 0 ? null : Math.min(...crossing.map((box) => box.x)) - 8;
  const right = crossing.length === 0 ? null : Math.max(...crossing.map((box) => box.x + box.width)) + 8;
  const sides = [left, right].filter((side): side is number => side !== null);
  if (preference === 'right') sides.reverse();
  for (const mid of mids) {
    for (const side of sides) {
      const first = { x: start.x, y: mid };
      const second = { x: side, y: mid };
      const third = { x: side, y: end.y };
      const fourth = { x: start.x, y: end.y };
      if (
        horizontalBlocked(mid, Math.min(start.x, side), Math.max(start.x, side), blockers) ||
        !verticalClear(side, mid, end.y, blockers) ||
        horizontalBlocked(end.y, Math.min(side, start.x), Math.max(side, start.x), blockers)
      )
        continue;
      return simplify([start, first, second, third, fourth]);
    }
  }
  return [start, end];
};

const routeMessage = (context: RouteContext, flow: BpmnFlow): readonly LayoutPoint[] => {
  const fromNode = context.nodeById.get(flow.from);
  const toNode = context.nodeById.get(flow.to);
  const from = context.placed.get(flow.from);
  const to = context.placed.get(flow.to);
  const fromPool = poolBandOf(context, flow.from);
  const toPool = poolBandOf(context, flow.to);
  const gaps = messageGaps(context, flow);
  if (fromPool === null || toPool === null || gaps === null) return [];
  const down = toPool.y > fromPool.y;
  const fromSide: 'top' | 'bottom' = down ? 'bottom' : 'top';
  const toSide: 'top' | 'bottom' = down ? 'top' : 'bottom';
  const sourceEdgeY = poolEdgeY(fromPool, fromSide);
  const targetEdgeY = poolEdgeY(toPool, toSide);
  const sourceChannel = gaps.channelFor(gaps.source);
  const targetChannel = gaps.adjacent ? sourceChannel : gaps.channelFor(gaps.target);

  const otherNodes = [...context.placed.values()]
    .filter((node) => node.id !== flow.from && node.id !== flow.to)
    .map((node) => inflate(boxOf(node), CLEAR));

  const offset = context.messageOffsets.get(flow.id) ?? 0;
  const wantedSource =
    (from !== undefined ? centreOf(from).x : to !== undefined ? centreOf(to).x : context.placement.width / 2) + offset;
  const wantedTarget =
    (to !== undefined ? centreOf(to).x : from !== undefined ? centreOf(from).x : context.placement.width / 2) + offset;

  const sourceX =
    from !== undefined && fromNode !== undefined
      ? (messageCandidates(fromNode, from, fromSide, wantedSource, otherNodes, sourceEdgeY) ??
        fallbackPortX(fromNode, from, wantedSource))
      : Math.round(clamp(wantedSource, 8, context.placement.width - 8));
  const targetX =
    to !== undefined && toNode !== undefined
      ? (messageCandidates(toNode, to, toSide, wantedTarget, otherNodes, targetEdgeY) ??
        fallbackPortX(toNode, to, wantedTarget))
      : Math.round(clamp(wantedTarget, 8, context.placement.width - 8));

  const fromPort: LayoutPoint =
    from !== undefined && fromNode !== undefined
      ? projectPort(fromNode, from, fromSide, {
          x: sourceX,
          y: fromSide === 'top' ? from.y : from.y + from.height,
        })
      : { x: sourceX, y: sourceEdgeY };
  const toPort: LayoutPoint =
    to !== undefined && toNode !== undefined
      ? projectPort(toNode, to, toSide, { x: targetX, y: toSide === 'top' ? to.y : to.y + to.height })
      : { x: targetX, y: targetEdgeY };

  const alignedX = fromPort.x === toPort.x ? fromPort.x : sourceX === targetX ? sourceX : null;
  if (alignedX !== null && verticalClear(alignedX, fromPort.y, toPort.y, otherNodes)) {
    return simplify([fromPort, { ...fromPort, x: alignedX }, { ...toPort, x: alignedX }, toPort]);
  }

  const preference = offset > 0 ? 'right' : 'left';
  const sourceLeg = verticalLeg(fromPort, { x: sourceX, y: sourceChannel }, otherNodes, preference);
  const targetLeg = [...verticalLeg(toPort, { x: targetX, y: targetChannel }, otherNodes, preference)].reverse();

  if (gaps.adjacent) {
    return simplify([...sourceLeg, { x: targetX, y: sourceChannel }, ...targetLeg]);
  }
  // A non-adjacent pair has another pool between them. The vertical part runs
  // in the pool's right-hand padding, clear of every node, and the horizontal
  // parts stay in the gaps above and below the intervening pool.
  const corridor = context.placement.width - 12;
  return simplify([
    ...sourceLeg,
    { x: corridor, y: sourceChannel },
    { x: corridor, y: targetChannel },
    { x: targetX, y: targetChannel },
    ...targetLeg,
  ]);
};

const routeAssociation = (context: RouteContext, flow: BpmnFlow, spec: EdgeSpec): readonly LayoutPoint[] => {
  const fromNode = context.nodeById.get(flow.from);
  const toNode = context.nodeById.get(flow.to);
  const from = context.placed.get(flow.from);
  const to = context.placed.get(flow.to);
  if (fromNode === undefined || toNode === undefined || from === undefined || to === undefined) return [];
  const fromSide = sideFor(flow, 'from', from, to, fromNode, toNode);
  const toSide = sideFor(flow, 'to', from, to, fromNode, toNode);
  const fromEnd = context.ports.get(flow.id)?.from;
  const toEnd = context.ports.get(flow.id)?.to;
  const [fromPort, toPort] = alignPorts(
    fromNode,
    from,
    fromEnd?.side ?? fromSide,
    projectPort(fromNode, from, fromEnd?.side ?? fromSide, fromEnd?.point ?? centreOf(from)),
    toNode,
    to,
    toEnd?.side ?? toSide,
    projectPort(toNode, to, toEnd?.side ?? toSide, toEnd?.point ?? centreOf(to)),
  );
  const reach = Math.max(STUB, edgeReach(spec));
  const start = stepOut(fromPort, fromEnd?.side ?? fromSide, reach);
  const goal = stepOut(toPort, toEnd?.side ?? toSide, reach);
  const obstacles = [
    ...context.labelBoxes,
    ...[...context.placed.values()]
      .filter((node) => node.id !== flow.from && node.id !== flow.to)
      .map((node) => inflate(boxOf(node), CLEAR)),
  ];
  const middle = routeAroundObstacles(
    start,
    goal,
    obstacles,
    CLEAR,
    context.avoid,
    [boxOf(from), boxOf(to)],
    [boxOf(from), boxOf(to)],
  );
  return simplify([fromPort, ...middle, toPort]);
};

/** Places the text drawn outside event/gateway/dataObject boxes, below first. */
const placeNodeLabels = (context: RouteContext, width: number, height: number): ReadonlyMap<string, Box> => {
  const placed = new Map<string, Box>();
  const nodeBoxes = [...context.placed.values()].map(boxOf);
  const routes = [...context.routes.values()].map(segmentsOf);
  for (const node of [...context.data.nodes].sort((p, q) => (p.id < q.id ? -1 : p.id > q.id ? 1 : 0))) {
    const label = externalLabel(node);
    const at = context.placed.get(node.id);
    if (label === null || at === undefined) continue;
    const centreX = Math.round(at.x + at.width / 2 - label.width / 2);
    const centreY = Math.round(at.y + at.height / 2 - label.height / 2);
    const candidates: Box[] = [];
    for (const gap of [4, 12, 24, 40, 60]) {
      candidates.push(
        { x: centreX, y: at.y + at.height + gap, width: label.width, height: label.height },
        { x: centreX, y: at.y - label.height - gap, width: label.width, height: label.height },
        { x: at.x + at.width + gap, y: centreY, width: label.width, height: label.height },
        { x: at.x - label.width - gap, y: centreY, width: label.width, height: label.height },
      );
    }
    const inside = (box: Box): boolean =>
      box.x >= LABEL_MARGIN &&
      box.y >= LABEL_MARGIN &&
      box.x + box.width <= width - LABEL_MARGIN &&
      box.y + box.height <= height - LABEL_MARGIN;
    const free = (box: Box): boolean =>
      inside(box) &&
      !nodeBoxes.some((other) => overlap(box, other, 3)) &&
      ![...placed.values()].some((other) => overlap(box, other, LABEL_MARGIN)) &&
      !routes.some((segments) => segments.some((segment) => segmentHitsBox(segment, box, 2)));
    const score = (box: Box): number =>
      routes.reduce(
        (total, segments) => total + segments.filter((segment) => segmentHitsBox(segment, box, 2)).length,
        0,
      );
    const ranked = candidates
      .map((box) => ({ box, free: free(box), crossings: score(box) }))
      // A free side first; when every side is crossed, take the one crossed least.
      .sort((p, q) => Number(q.free) - Number(p.free) || p.crossings - q.crossings);
    placed.set(node.id, ranked[0]?.box ?? candidates[0]!);
  }
  return placed;
};

const overlap = (a: Box, b: Box, margin: number): boolean =>
  a.x < b.x + b.width + margin &&
  a.x + a.width > b.x - margin &&
  a.y < b.y + b.height + margin &&
  a.y + a.height > b.y - margin;

const headBoxes = (bands: BpmnBands): Box[] =>
  bands.pools.flatMap((pool) => [
    { x: 0, y: pool.y, width: Math.max(0, bands.contentLeft - BPMN_PAD_X), height: pool.height },
    ...pool.lanes.map((lane) => ({
      x: Math.max(0, bands.contentLeft - BPMN_PAD_X),
      y: lane.y,
      width: BPMN_PAD_X,
      height: lane.height,
    })),
  ]);

type LaneSegment = {
  readonly id: string;
  readonly index: number;
  readonly horizontal: boolean;
  readonly at: number;
  readonly lo: number;
  readonly hi: number;
  readonly other: number;
};

const laneSegments = (id: string, points: readonly LayoutPoint[]): LaneSegment[] =>
  points.slice(1).flatMap((point, index) => {
    const a = points[index]!;
    if (a.x !== point.x && a.y !== point.y) return [];
    const horizontal = a.y === point.y;
    return [
      {
        id,
        index,
        horizontal,
        at: horizontal ? a.y : a.x,
        lo: horizontal ? Math.min(a.x, point.x) : Math.min(a.y, point.y),
        hi: horizontal ? Math.max(a.x, point.x) : Math.max(a.y, point.y),
        other: horizontal ? point.x : point.y,
      },
    ];
  });

const enterBox = (a: LayoutPoint, b: LayoutPoint, box: Box): boolean =>
  Math.max(a.x, b.x) > box.x + 0.01 &&
  Math.min(a.x, b.x) < box.x + box.width - 0.01 &&
  Math.max(a.y, b.y) > box.y + 0.01 &&
  Math.min(a.y, b.y) < box.y + box.height - 0.01;

/**
 * Pulls apart two routes that ended up sharing one drawn line after the shared
 * nudge pass (it only moves each route's longest interior run). A collinear
 * overlap is separated by sliding one involved interior segment sideways,
 * never a port run, and only when the slide keeps every segment out of a node.
 */
const separateLanes = (
  initial: ReadonlyMap<string, readonly LayoutPoint[]>,
  obstacles: readonly Box[],
): ReadonlyMap<string, readonly LayoutPoint[]> => {
  const routes = new Map([...initial].map(([id, points]) => [id, [...points]] as const));
  for (let pass = 0; pass < 80; pass++) {
    const segments = [...routes].flatMap(([id, points]) => laneSegments(id, points));
    let pair: readonly [LaneSegment, LaneSegment] | null = null;
    for (let i = 0; i < segments.length && pair === null; i++) {
      for (let j = i + 1; j < segments.length; j++) {
        const a = segments[i]!;
        const b = segments[j]!;
        if (a.id === b.id || a.horizontal !== b.horizontal || Math.abs(a.at - b.at) >= 16) continue;
        if (Math.min(a.hi, b.hi) - Math.max(a.lo, b.lo) <= 4) continue;
        pair = [a, b];
        break;
      }
    }
    if (pair === null) break;
    const [first, second] = pair;
    let changed = false;
    for (const [mover, other] of [
      [first, second],
      [second, first],
    ] as const) {
      const points = routes.get(mover.id);
      if (points === undefined) continue;
      if (mover.index < 1 || mover.index > points.length - 3) continue;
      const axis = mover.horizontal ? 'y' : 'x';
      const away = mover.at === other.at ? 1 : mover.at < other.at ? -1 : 1;
      for (const distance of [16, 24, 32, 40, 56, -16, -24, -32, -40, -56]) {
        const value = mover.at + away * distance;
        const moved = points.map((point, index) =>
          index === mover.index || index === mover.index + 1 ? { ...point, [axis]: value } : point,
        );
        const simplified = simplify(moved);
        let safe = true;
        for (let index = 0; index + 1 < simplified.length; index++) {
          if (obstacles.some((box) => enterBox(simplified[index]!, simplified[index + 1]!, box))) safe = false;
        }
        const stubStart = Math.hypot(simplified[1]!.x - simplified[0]!.x, simplified[1]!.y - simplified[0]!.y);
        const stubEnd = Math.hypot(
          simplified.at(-1)!.x - simplified.at(-2)!.x,
          simplified.at(-1)!.y - simplified.at(-2)!.y,
        );
        if (!safe || stubStart < 12.5 || stubEnd < 12.5) continue;
        routes.set(mover.id, simplified);
        changed = true;
        break;
      }
      if (changed) break;
    }
    if (!changed) break;
  }
  return routes;
};

type ParallelBorder = {
  readonly horizontal: boolean;
  readonly at: number;
  readonly lo: number;
  readonly hi: number;
};

const borderList = (nodes: readonly PlacedNode[], bands: BpmnBands, width: number): ParallelBorder[] => {
  const borders: ParallelBorder[] = [];
  for (const node of nodes) {
    borders.push(
      {
        horizontal: true,
        at: node.y,
        lo: node.x,
        hi: node.x + node.width,
      },
      {
        horizontal: true,
        at: node.y + node.height,
        lo: node.x,
        hi: node.x + node.width,
      },
      {
        horizontal: false,
        at: node.x,
        lo: node.y,
        hi: node.y + node.height,
      },
      {
        horizontal: false,
        at: node.x + node.width,
        lo: node.y,
        hi: node.y + node.height,
      },
    );
  }
  for (const pool of bands.pools) {
    for (const band of [pool, ...pool.lanes]) {
      borders.push(
        { horizontal: true, at: band.y, lo: 0, hi: width },
        {
          horizontal: true,
          at: band.y + band.height,
          lo: 0,
          hi: width,
        },
        { horizontal: false, at: 0, lo: band.y, hi: band.y + band.height },
        {
          horizontal: false,
          at: width,
          lo: band.y,
          hi: band.y + band.height,
        },
      );
    }
  }
  return borders;
};

const lengthOf = (a: LayoutPoint, b: LayoutPoint): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/**
 * Keeps a route off the borders it runs beside. A run parallel to a node,
 * lane or pool border within 6px is slid 6px clear, on the side it already
 * occupies; port runs are never moved (their segment touches the route's end)
 * and a move that would pierce a node or leave a stub too short is skipped.
 */
const clearBorderHugs = (
  initial: ReadonlyMap<string, readonly LayoutPoint[]>,
  nodes: readonly PlacedNode[],
  bands: BpmnBands,
  width: number,
): ReadonlyMap<string, readonly LayoutPoint[]> => {
  const routes = new Map([...initial].map(([id, points]) => [id, [...points]] as const));
  const borders = borderList(nodes, bands, width);
  const boxes = nodes.map(boxOf);
  for (let pass = 0; pass < 120; pass++) {
    let changed = false;
    for (const [id, original] of routes) {
      let points = original;
      for (let index = 1; index + 2 < points.length; index++) {
        const a = points[index]!;
        const b = points[index + 1]!;
        if (a.x !== b.x && a.y !== b.y) continue;
        const horizontal = a.y === b.y;
        const at = horizontal ? a.y : a.x;
        const lo = horizontal ? Math.min(a.x, b.x) : Math.min(a.y, b.y);
        const hi = horizontal ? Math.max(a.x, b.x) : Math.max(a.y, b.y);
        const near = borders.filter(
          (border) =>
            border.horizontal === horizontal &&
            Math.abs(at - border.at) < 7.5 &&
            Math.min(hi, border.hi) - Math.max(lo, border.lo) > 4,
        );
        if (near.length === 0) continue;
        const candidates = new Set<number>();
        for (const border of borders) {
          if (border.horizontal !== horizontal) continue;
          if (Math.min(hi, border.hi) - Math.max(lo, border.lo) <= 4) continue;
          candidates.add(border.at - 8);
          candidates.add(border.at + 8);
        }
        const valid = [...candidates]
          .filter((value) => value !== at)
          .sort((p, q) => Math.abs(p - at) - Math.abs(q - at));
        for (const target of valid) {
          // A position has to clear every border it runs beside, not just the
          // one that prompted the move: a lane edge and a node top can be only
          // 12px apart, and then only the other side of the edge is usable.
          const clears = borders.every(
            (border) =>
              border.horizontal !== horizontal ||
              Math.min(hi, border.hi) - Math.max(lo, border.lo) <= 4 ||
              Math.abs(target - border.at) >= 6.5,
          );
          if (!clears) continue;
          const moved = points.map((point, at2) =>
            at2 === index || at2 === index + 1 ? { ...point, [horizontal ? 'y' : 'x']: target } : point,
          );
          const simplified = simplify(moved);
          const safe =
            simplified.slice(1).every((point, segment) => {
              const start = simplified[segment]!;
              if (lengthOf(start, point) < 12) return false;
              return !boxes.some((box) => enterBox(start, point, box));
            }) &&
            Math.hypot(simplified[1]!.x - simplified[0]!.x, simplified[1]!.y - simplified[0]!.y) >= 12.5 &&
            Math.hypot(simplified.at(-1)!.x - simplified.at(-2)!.x, simplified.at(-1)!.y - simplified.at(-2)!.y) >=
              12.5;
          if (!safe) continue;
          points = simplified;
          changed = true;
          break;
        }
        if (changed) break;
      }
      routes.set(id, points);
    }
    if (!changed) break;
  }
  return routes;
};

/**
 * Replaces the placement's empty routes with BPMN's own, and records where the
 * node labels and flow labels go.
 */
export const withBpmnRoutes = (placement: LayoutResult, data: BpmnData, bands: BpmnBands): LayoutResult => {
  const nodeById = new Map(data.nodes.map((node) => [node.id, node]));
  const placed = new Map(placement.nodes.map((node) => [node.id, node]));
  const poolById = new Map(bands.pools.map((pool) => [pool.id, pool]));

  const sequence = data.edges.filter((flow) => flow.kind === 'sequence');
  const messages = data.edges.filter((flow) => flow.kind === 'message');
  const associations = data.edges.filter((flow) => flow.kind === 'association');
  const ordered = [
    ...[...sequence].sort((p, q) => {
      const rank = (id: string): number => placed.get(id)?.layer ?? 0;
      return rank(p.from) - rank(q.from) || (p.id < q.id ? -1 : p.id > q.id ? 1 : 0);
    }),
    ...messages,
    ...associations,
  ];

  const nodeFlows = data.edges.filter((flow) => placed.has(flow.from) && placed.has(flow.to));
  const specialSides = new Map<string, PortSide>();
  for (const node of data.nodes) {
    if (node.kind !== 'event' && node.kind !== 'gateway') continue;
    const ends: { readonly flow: BpmnFlow; readonly end: 'from' | 'to' }[] = [];
    for (const flow of nodeFlows) {
      // An association may take any free side; a sequence must get the side
      // that faces its source, or it climbs over the gateway to reach the
      // opposite one. Allocate associations in the later pass, after these.
      if (flow.kind === 'association') continue;
      if (flow.from === node.id) ends.push({ flow, end: 'from' });
      else if (flow.to === node.id) ends.push({ flow, end: 'to' });
    }
    // A message keeps the side that faces its pool first: it has nowhere else
    // to go, while a sequence can take an alternative side without leaving.
    ends.sort((p, q) => {
      const byKind = Number(q.flow.kind === 'message') - Number(p.flow.kind === 'message');
      return byKind || (p.flow.id < q.flow.id ? -1 : p.flow.id > q.flow.id ? 1 : 0);
    });
    const used = new Set<PortSide>();
    for (const { flow, end } of ends) {
      const from = placed.get(flow.from);
      const to = placed.get(flow.to);
      const fromNode = nodeById.get(flow.from);
      const toNode = nodeById.get(flow.to);
      if (from === undefined || to === undefined || fromNode === undefined || toNode === undefined) continue;
      const base = sideFor(flow, end, from, to, fromNode, toNode);
      // When a gateway's facing side is taken, an outgoing branch prefers a
      // vertical side over crossing back through the gateway; an incoming
      // branch first tries the other horizontal side.
      const preferred: PortSide[] =
        end === 'from' ? [base, 'bottom', 'top', 'right', 'left'] : [base, 'left', 'right', 'top', 'bottom'];
      const order = preferred.filter((side, at, list) => list.indexOf(side) === at);
      const side = order.find((candidate) => !used.has(candidate)) ?? order[0]!;
      used.add(side);
      specialSides.set(`${node.id}|${flow.id}|${end}`, side);
    }
  }
  const usedSides = new Map<string, Set<PortSide>>();
  const use = (nodeId: string, side: PortSide): void => {
    const set = usedSides.get(nodeId) ?? new Set<PortSide>();
    set.add(side);
    usedSides.set(nodeId, set);
  };
  for (const flow of nodeFlows) {
    if (flow.kind === 'association') continue;
    const from = placed.get(flow.from);
    const to = placed.get(flow.to);
    const fromNode = nodeById.get(flow.from);
    const toNode = nodeById.get(flow.to);
    if (from === undefined || to === undefined || fromNode === undefined || toNode === undefined) continue;
    use(
      flow.from,
      specialSides.get(`${flow.from}|${flow.id}|from`) ?? sideFor(flow, 'from', from, to, fromNode, toNode),
    );
    use(flow.to, specialSides.get(`${flow.to}|${flow.id}|to`) ?? sideFor(flow, 'to', from, to, fromNode, toNode));
  }
  for (const flow of nodeFlows) {
    if (flow.kind !== 'association') continue;
    const from = placed.get(flow.from);
    const to = placed.get(flow.to);
    const fromNode = nodeById.get(flow.from);
    const toNode = nodeById.get(flow.to);
    if (from === undefined || to === undefined || fromNode === undefined || toNode === undefined) continue;
    for (const end of ['from', 'to'] as const) {
      const nodeId = end === 'from' ? flow.from : flow.to;
      const base = sideFor(flow, end, from, to, fromNode, toNode);
      const taken = usedSides.get(nodeId);
      if (taken === undefined || !taken.has(base)) continue;
      const alternative = (['top', 'bottom', 'left', 'right'] as PortSide[]).find((side) => !taken.has(side));
      if (alternative !== undefined) {
        specialSides.set(`${nodeId}|${flow.id}|${end}`, alternative);
        use(nodeId, alternative);
      }
    }
  }

  const ports = staggeredEdgePorts([...placed.values()], nodeFlows, {
    gap: 32,
    sideOf: ({ node, edge, end }) => {
      const special = specialSides.get(`${node.id}|${edge.id}|${end}`);
      if (special !== undefined) return special;
      const flow = data.edges.find((candidate) => candidate.id === edge.id);
      const from = placed.get(edge.from);
      const to = placed.get(edge.to);
      const fromNode = nodeById.get(edge.from);
      const toNode = nodeById.get(edge.to);
      if (
        flow === undefined ||
        from === undefined ||
        to === undefined ||
        fromNode === undefined ||
        toNode === undefined
      )
        return 'right';
      return sideFor(flow, end, from, to, fromNode, toNode);
    },
  });

  const messageColumns = new Map<string, BpmnFlow[]>();
  for (const flow of data.edges) {
    if (flow.kind !== 'message') continue;
    const source = placed.get(flow.from);
    if (source === undefined) continue;
    const key = String(Math.round(centreOf(source).x));
    const bucket = messageColumns.get(key) ?? [];
    bucket.push(flow);
    messageColumns.set(key, bucket);
  }
  const messageOffsets = new Map<string, number>();
  for (const bucket of messageColumns.values()) {
    bucket.sort((p, q) => (p.id < q.id ? -1 : p.id > q.id ? 1 : 0));
    bucket.forEach((flow, index) => {
      messageOffsets.set(flow.id, Math.round((index - (bucket.length - 1) / 2) * 16));
    });
  }

  const context: RouteContext = {
    placement,
    data,
    bands,
    nodeById,
    placed,
    poolById,
    labelBoxes: [],
    ports,
    messageOffsets,
    routes: new Map(),
    avoid: [],
  };
  for (const flow of ordered) {
    const source = nodeById.get(flow.from) ?? null;
    const spec = flowSpec(flow, source);
    const points =
      flow.kind === 'sequence'
        ? routeSequence(context, flow, spec)
        : flow.kind === 'message'
          ? routeMessage(context, flow)
          : routeAssociation(context, flow, spec);
    context.routes.set(flow.id, points);
    context.avoid.push(...segmentsOf(points));
  }

  const obstacles = [...placed.values()].map((node) => inflate(boxOf(node), CLEAR));
  const separationObstacles = [...placed.values()].map(boxOf);
  const nudged = nudgeParallelRoutes(
    [...context.routes].map(([id, points]) => ({ id, points, obstacles })),
    { trackSpacing: 16, frameClearance: 6, minPortRun: STUB },
  );
  for (const [id, points] of nudged) context.routes.set(id, simplify(points));
  for (let round = 0; round < 2; round++) {
    const separated = separateLanes(context.routes, separationObstacles);
    for (const [id, points] of separated) context.routes.set(id, points);
    const clear = clearBorderHugs(context.routes, [...placed.values()], bands, placement.width);
    for (const [id, points] of clear) context.routes.set(id, points);
  }

  const nodeLabels = placeNodeLabels({ ...context, routes: context.routes }, placement.width, placement.height);
  const labelBoxes = [...nodeLabels.values()];

  const labelRequests = data.edges.flatMap((flow) => {
    const label = flow.label ?? flow.condition;
    const points = context.routes.get(flow.id);
    if (label === null || label === '' || points === undefined || points.length < 2) return [];
    return [{ id: flow.id, points, size: flowLabelSize(label) }];
  });
  const zones: LabelBox[] = data.edges.flatMap((flow) => {
    const points = context.routes.get(flow.id);
    if (points === undefined || points.length < 2) return [];
    const source = nodeById.get(flow.from) ?? null;
    const spec = flowSpec(flow, source);
    const parts: LabelBox[] = [];
    if (spec.start !== null) parts.push(markerZone(spec.start, endFrame(points, 'start')));
    if (spec.end !== null) parts.push(markerZone(spec.end, endFrame(points, 'end')));
    // Keep a caption clear of every end, not only a marked one: the probe
    // treats the whole arrowhead box as the glyph.
    for (const end of [points[0], points.at(-1)]) {
      if (end !== undefined) parts.push({ x: end.x - 12, y: end.y - 12, width: 24, height: 24 });
    }
    return parts;
  });
  const placedLabels = placeEdgeLabels(
    labelRequests,
    {
      boxes: [...placed.values()].map(boxOf).concat(labelBoxes, headBoxes(bands)),
      zones,
      lines: context.routes,
    },
    { offset: 7, lineKeep: 14, endKeep: 12, minRun: 12 },
  );
  const labels = new Map([...placedLabels].map(([id, value]) => [id, value.center] as const));

  let width = placement.width;
  let height = placement.height;
  for (const points of context.routes.values()) {
    for (const point of points) {
      width = Math.max(width, point.x + 24);
      height = Math.max(height, point.y + 24);
    }
  }
  for (const [id, center] of labels) {
    const flow = data.edges.find((edge) => edge.id === id);
    if (flow === undefined) continue;
    const size = flowLabelSize(flow.label ?? flow.condition ?? '');
    width = Math.max(width, center.x + size.width / 2 + 16);
    height = Math.max(height, center.y + size.height / 2 + 16);
  }
  for (const box of labelBoxes) {
    width = Math.max(width, box.x + box.width + 16);
    height = Math.max(height, box.y + box.height + 16);
  }

  const result: LayoutResult = {
    ...placement,
    width,
    height,
    routes: data.edges.map((flow) => ({ id: flow.id, points: context.routes.get(flow.id) ?? [] })),
  };
  EXTRA.set(result, { labels, nodeLabels });
  return result;
};
