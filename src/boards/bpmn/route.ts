import type { LayoutPoint, LayoutResult, PlacedNode } from '../../lib/layout/layered';
import type { PortSide } from '../../lib/layout/ports';
import type { BpmnBands, BpmnPoolBand } from './layout';
import type { BpmnData, BpmnFlow, BpmnNode } from './model';

import { placeEdgeLabels, type LabelBox } from '../../lib/layout/edge-labels';
import { routeAroundObstacles, verticalBlocked, type RouteSegment } from '../../lib/layout/orthogonal-router';
import { endFrame } from '../../lib/layout/path-steps';
import { nudgeParallelRoutes } from '../../lib/layout/route-nudge';
import { edgeReach, markerZone, type EdgeSpec } from '../base/edge';
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

const CLEAR = 10;
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
  if (end === 'to') return 'left';
  const dy = centreOf(to).y - centreOf(from).y;
  if (Math.abs(dy) < from.height / 2) return 'right';
  if (fromNode.kind === 'gateway' || fromNode.kind === 'event') return dy > 0 ? 'bottom' : 'top';
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
    const fromPort = outlinePoint(nodeShape(fromNode), from, 'bottom', 0);
    const toPort = outlinePoint(nodeShape(toNode), to, 'bottom', 0);
    return simplify([fromPort, { x: fromPort.x, y: channel }, { x: toPort.x, y: channel }, toPort]);
  }

  const fromAlong =
    fromSide === 'right'
      ? clamp(toCentre.y - fromCentre.y, -from.height / 2 + 12, from.height / 2 - 12)
      : clamp(toCentre.x - fromCentre.x, -from.width / 2 + 12, from.width / 2 - 12);
  const toAlong =
    toSide === 'left'
      ? clamp(fromCentre.y - toCentre.y, -to.height / 2 + 12, to.height / 2 - 12)
      : clamp(fromCentre.x - toCentre.x, -to.width / 2 + 12, to.width / 2 - 12);
  const fromPort = projectPort(fromNode, from, fromSide, {
    x:
      fromSide === 'left' || fromSide === 'right'
        ? from.x + (fromSide === 'right' ? from.width : 0)
        : fromCentre.x + fromAlong,
    y:
      fromSide === 'left' || fromSide === 'right'
        ? fromCentre.y + fromAlong
        : from.y + (fromSide === 'bottom' ? from.height : 0),
  });
  const toPort = projectPort(toNode, to, toSide, {
    x: toSide === 'left' || toSide === 'right' ? to.x + (toSide === 'right' ? to.width : 0) : toCentre.x + toAlong,
    y: toSide === 'left' || toSide === 'right' ? toCentre.y + toAlong : to.y + (toSide === 'bottom' ? to.height : 0),
  });
  const start = stepOut(fromPort, fromSide, reach);
  const goal = stepOut(toPort, toSide, reach);
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

const routeMessage = (context: RouteContext, flow: BpmnFlow, index: number, total: number): readonly LayoutPoint[] => {
  const fromNode = context.nodeById.get(flow.from);
  const toNode = context.nodeById.get(flow.to);
  const from = context.placed.get(flow.from);
  const to = context.placed.get(flow.to);
  const fromPool = poolBandOf(context, flow.from);
  const toPool = poolBandOf(context, flow.to);
  if (fromPool === null || toPool === null) return [];
  const down = toPool.y > fromPool.y;
  const fromSide: 'top' | 'bottom' = down ? 'bottom' : 'top';
  const toSide: 'top' | 'bottom' = down ? 'top' : 'bottom';
  const sourceEdgeY = poolEdgeY(fromPool, fromSide);
  const targetEdgeY = poolEdgeY(toPool, toSide);
  const gapTop = down ? fromPool.y + fromPool.height : toPool.y + toPool.height;
  const gapBottom = down ? toPool.y : fromPool.y;
  const channel = Math.round(gapTop + ((index + 1) * (gapBottom - gapTop)) / (total + 1));

  const otherNodes = [...context.placed.values()]
    .filter((node) => node.id !== flow.from && node.id !== flow.to)
    .map((node) => inflate(boxOf(node), CLEAR));

  const wantedSource =
    from !== undefined ? centreOf(from).x : to !== undefined ? centreOf(to).x : context.placement.width / 2;
  const wantedTarget =
    to !== undefined ? centreOf(to).x : from !== undefined ? centreOf(from).x : context.placement.width / 2;

  const sourceX =
    from !== undefined && fromNode !== undefined
      ? (messageCandidates(fromNode, from, fromSide, wantedSource, otherNodes, sourceEdgeY) ??
        Math.round(from.x + from.width / 2))
      : Math.round(clamp(wantedSource, 8, context.placement.width - 8));
  const targetX =
    to !== undefined && toNode !== undefined
      ? (messageCandidates(toNode, to, toSide, wantedTarget, otherNodes, targetEdgeY) ??
        Math.round(to.x + to.width / 2))
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

  const straight = fromPort.x === toPort.x && verticalClear(fromPort.x, fromPort.y, toPort.y, otherNodes);
  const points = straight
    ? [fromPort, toPort]
    : [fromPort, { x: sourceX, y: channel }, { x: targetX, y: channel }, { x: targetX, y: targetEdgeY }, toPort];
  return simplify(points);
};

const routeAssociation = (context: RouteContext, flow: BpmnFlow, spec: EdgeSpec): readonly LayoutPoint[] => {
  const fromNode = context.nodeById.get(flow.from);
  const toNode = context.nodeById.get(flow.to);
  const from = context.placed.get(flow.from);
  const to = context.placed.get(flow.to);
  if (fromNode === undefined || toNode === undefined || from === undefined || to === undefined) return [];
  const fromSide = sideFor(flow, 'from', from, to, fromNode, toNode);
  const toSide = sideFor(flow, 'to', from, to, fromNode, toNode);
  const fromPort = projectPort(fromNode, from, fromSide, {
    x:
      fromSide === 'left' || fromSide === 'right'
        ? from.x + (fromSide === 'right' ? from.width : 0)
        : from.x + from.width / 2,
    y:
      fromSide === 'left' || fromSide === 'right'
        ? from.y + from.height / 2
        : from.y + (fromSide === 'bottom' ? from.height : 0),
  });
  const toPort = projectPort(toNode, to, toSide, {
    x: toSide === 'left' || toSide === 'right' ? to.x + (toSide === 'right' ? to.width : 0) : to.x + to.width / 2,
    y: toSide === 'left' || toSide === 'right' ? to.y + to.height / 2 : to.y + (toSide === 'bottom' ? to.height : 0),
  });
  const reach = Math.max(STUB, edgeReach(spec));
  const start = stepOut(fromPort, fromSide, reach);
  const goal = stepOut(toPort, toSide, reach);
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
  for (const node of [...context.data.nodes].sort((p, q) => (p.id < q.id ? -1 : p.id > q.id ? 1 : 0))) {
    const label = externalLabel(node);
    const at = context.placed.get(node.id);
    if (label === null || at === undefined) continue;
    const candidates: Box[] = [
      {
        x: Math.round(at.x + at.width / 2 - label.width / 2),
        y: at.y + at.height + 4,
        width: label.width,
        height: label.height,
      },
      {
        x: Math.round(at.x + at.width / 2 - label.width / 2),
        y: at.y - label.height - 4,
        width: label.width,
        height: label.height,
      },
      {
        x: at.x + at.width + 4,
        y: Math.round(at.y + at.height / 2 - label.height / 2),
        width: label.width,
        height: label.height,
      },
    ];
    const free = (box: Box): boolean => {
      if (
        box.x < LABEL_MARGIN ||
        box.y < LABEL_MARGIN ||
        box.x + box.width > width - LABEL_MARGIN ||
        box.y + box.height > height - LABEL_MARGIN
      )
        return false;
      if (nodeBoxes.some((other) => overlap(box, other, 3))) return false;
      if ([...placed.values()].some((other) => overlap(box, other, LABEL_MARGIN))) return false;
      for (const points of context.routes.values()) {
        const segments = segmentsOf(points);
        if (segments.some((segment) => segmentHitsBox(segment, box, 2))) return false;
      }
      return true;
    };
    const chosen = candidates.find(free) ?? candidates[0]!;
    placed.set(node.id, chosen);
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
    { x: 0, y: pool.y, width: Math.max(0, bands.contentLeft - 32), height: pool.height },
    ...pool.lanes.map((lane) => ({
      x: Math.max(0, bands.contentLeft - 32),
      y: lane.y,
      width: 32,
      height: lane.height,
    })),
  ]);

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

  const context: RouteContext = {
    placement,
    data,
    bands,
    nodeById,
    placed,
    poolById,
    labelBoxes: [],
    routes: new Map(),
    avoid: [],
  };
  const messageIndex = new Map<string, { index: number; total: number }>();
  const messageGroups = new Map<string, BpmnFlow[]>();
  for (const flow of messages) {
    const pool = poolBandOf(context, flow.from)?.id ?? '';
    const target = poolBandOf(context, flow.to);
    const key = `${pool}|${target !== null && target.y > (poolById.get(pool)?.y ?? 0) ? 'down' : 'up'}`;
    const bucket = messageGroups.get(key) ?? [];
    bucket.push(flow);
    messageGroups.set(key, bucket);
  }
  for (const bucket of messageGroups.values()) {
    bucket.sort((p, q) => (p.id < q.id ? -1 : p.id > q.id ? 1 : 0));
    bucket.forEach((flow, index) => messageIndex.set(flow.id, { index, total: bucket.length }));
  }

  for (const flow of ordered) {
    const source = nodeById.get(flow.from) ?? null;
    const spec = flowSpec(flow, source);
    const points =
      flow.kind === 'sequence'
        ? routeSequence(context, flow, spec)
        : flow.kind === 'message'
          ? (() => {
              const at = messageIndex.get(flow.id) ?? { index: 0, total: 1 };
              return routeMessage(context, flow, at.index, at.total);
            })()
          : routeAssociation(context, flow, spec);
    context.routes.set(flow.id, points);
    context.avoid.push(...segmentsOf(points));
  }

  const obstacles = [...placed.values()].map((node) => inflate(boxOf(node), CLEAR));
  const nudged = nudgeParallelRoutes(
    [...context.routes].map(([id, points]) => ({ id, points, obstacles })),
    { trackSpacing: 6, frameClearance: 6, minPortRun: STUB },
  );
  for (const [id, points] of nudged) context.routes.set(id, simplify(points));

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
