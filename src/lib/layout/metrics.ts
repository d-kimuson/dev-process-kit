/**
 * A layout-complexity score: a single pure function from final, already-drawn
 * geometry (node boxes, frame boxes, routed edge polylines) to a breakdown of
 * what makes a layout hard to read, plus a weighted total.
 *
 * This exists so layout quality is something to measure and drive down, not
 * something to eyeball. `scoreLayout` takes geometry only — it knows nothing
 * about ER tables, Bounded Contexts or any other domain — so it is reusable
 * for any diagram this repo lays out, and it is cheap to unit test with tiny,
 * hand-built boxes and polylines instead of a whole rendered diagram.
 *
 * Callers must pass the *actual* drawn polylines (e.g. the ER view's
 * `relationRoute` output), not the layout engine's raw ranks-and-ports route —
 * a score over anything else would not reflect what the reader sees.
 */

export type MetricBox = { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
export type MetricPoint = { readonly x: number; readonly y: number };
/**
 * One edge's actual drawn route: an ordered polyline from one port to
 * another. `from`/`to` are the node ids it joins — named explicitly, not
 * inferred from where the polyline happens to start, so an edge is never
 * mistakenly charged for passing through its own endpoint.
 */
export type MetricEdge = {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly points: readonly MetricPoint[];
};

export type LayoutGeometry = {
  /** Every node (table, card, …) actually placed, keyed by id. */
  readonly nodes: readonly { readonly id: string; readonly box: MetricBox }[];
  /** Every drawn edge. */
  readonly edges: readonly MetricEdge[];
  /**
   * Frame boxes an edge may legitimately cross without penalty when it joins
   * a node inside that very frame (e.g. an aggregate/BC frame around one of
   * the edge's own endpoints). Anything else an edge's segments cross counts
   * as a frame violation.
   */
  readonly frames?: readonly { readonly id: string; readonly box: MetricBox; readonly members: readonly string[] }[];
};

export type MetricBreakdown = {
  /** Two edges' segments crossing each other. */
  readonly crossings: number;
  /** An edge segment passing through a node box it does not start or end at: how many (node, edge) pairs, and their total length inside. */
  readonly edgeThroughNode: { readonly incidents: number; readonly length: number };
  /** An edge crossing a frame box that contains neither of its endpoints. */
  readonly frameViolations: number;
  readonly totalEdgeLength: number;
  readonly totalBends: number;
  /** Node/frame boxes overlapping another node/frame box they are not nested inside. Must be 0 for a valid layout. */
  readonly overlaps: number;
  /** How far the overall bounding box's aspect ratio sits from 16:10, as `abs(ratio - 1.6)`. */
  readonly aspectDeviation: number;
  /** Bounding box area not covered by any node, as a fraction of the bounding box (0 = fully packed). */
  readonly wastedArea: number;
};

export type MetricResult = MetricBreakdown & { readonly total: number };

/** Weight of each breakdown term in the combined score. Tuned so hard violations dominate, cosmetics tie-break. */
export const METRIC_WEIGHTS: Readonly<Record<keyof MetricBreakdown, number>> = {
  crossings: 12,
  edgeThroughNode: 30, // per incident; `edgeThroughNode.length` is also charged, below, at a lower per-pixel rate
  frameViolations: 20,
  totalEdgeLength: 0.01,
  totalBends: 2,
  overlaps: 10_000, // a hard invariant: any overlap must dominate every other term
  aspectDeviation: 40,
  wastedArea: 60,
};
/** Per-pixel charge for an edge's total length spent inside node boxes it does not join (on top of the per-incident weight above). */
const EDGE_THROUGH_NODE_LENGTH_WEIGHT = 0.05;

const segments = (points: readonly MetricPoint[]): readonly (readonly [MetricPoint, MetricPoint])[] =>
  points.slice(1).map((point, i) => [points[i]!, point] as const);

const boxesOverlap = (a: MetricBox, b: MetricBox): boolean =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

const isNested = (inner: MetricBox, outer: MetricBox): boolean =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.width <= outer.x + outer.width &&
  inner.y + inner.height <= outer.y + outer.height;

/** Whether two axis-aligned segments cross at a point interior to both (touching at a shared endpoint does not count). */
const segmentsCross = (a: readonly [MetricPoint, MetricPoint], b: readonly [MetricPoint, MetricPoint]): boolean => {
  const [a1, a2] = a;
  const [b1, b2] = b;
  const aVertical = a1.x === a2.x;
  const bVertical = b1.x === b2.x;
  if (aVertical === bVertical) return false; // parallel axis-aligned segments never "cross" in the sense scored here
  const [v1, v2, h1, h2] = aVertical ? [a1, a2, b1, b2] : [b1, b2, a1, a2];
  const x = v1.x;
  const y = h1.y;
  const vTop = Math.min(v1.y, v2.y);
  const vBottom = Math.max(v1.y, v2.y);
  const hLeft = Math.min(h1.x, h2.x);
  const hRight = Math.max(h1.x, h2.x);
  return x > hLeft && x < hRight && y > vTop && y < vBottom;
};

/** The length of a segment's portion that lies strictly inside `box`. */
const segmentLengthInBox = (a: MetricPoint, b: MetricPoint, box: MetricBox): number => {
  if (a.x === b.x) {
    const x = a.x;
    if (x <= box.x || x >= box.x + box.width) return 0;
    const top = Math.max(Math.min(a.y, b.y), box.y);
    const bottom = Math.min(Math.max(a.y, b.y), box.y + box.height);
    return Math.max(0, bottom - top);
  }
  const y = a.y;
  if (y <= box.y || y >= box.y + box.height) return 0;
  const left = Math.max(Math.min(a.x, b.x), box.x);
  const right = Math.min(Math.max(a.x, b.x), box.x + box.width);
  return Math.max(0, right - left);
};

const segmentLength = (a: MetricPoint, b: MetricPoint): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/** A polyline's bends: points where the direction changes: `length - 2` for a simple path with `length >= 2`, 0 otherwise. */
const bendsOf = (points: readonly MetricPoint[]): number => Math.max(0, points.length - 2);

/**
 * Scores a layout's final, already-routed geometry. Pure: no DOM, no layout
 * engine calls — everything it needs is already in `geometry`.
 */
export const scoreLayout = (geometry: LayoutGeometry): MetricResult => {
  const edgeList = geometry.edges;

  // Crossings: every pair of distinct edges, every pair of their segments.
  let crossings = 0;
  for (let i = 0; i < edgeList.length; i++) {
    const a = edgeList[i]!;
    const aSegs = segments(a.points);
    for (let j = i + 1; j < edgeList.length; j++) {
      const b = edgeList[j]!;
      const bSegs = segments(b.points);
      for (const segA of aSegs) for (const segB of bSegs) if (segmentsCross(segA, segB)) crossings++;
    }
  }

  // Edge-through-node: every edge against every node it does not start or end at.
  let edgeThroughNodeIncidents = 0;
  let edgeThroughNodeLength = 0;
  for (const node of geometry.nodes) {
    for (const edge of edgeList) {
      if (edge.from === node.id || edge.to === node.id) continue;
      const segs = segments(edge.points);
      let lengthInside = 0;
      for (const [a, b] of segs) lengthInside += segmentLengthInBox(a, b, node.box);
      if (lengthInside > 0) {
        edgeThroughNodeIncidents++;
        edgeThroughNodeLength += lengthInside;
      }
    }
  }

  // Frame violations: an edge whose segments enter a frame that contains neither of its own endpoint nodes.
  let frameViolations = 0;
  for (const frame of geometry.frames ?? []) {
    const members = new Set(frame.members);
    for (const edge of edgeList) {
      if (members.has(edge.from) || members.has(edge.to)) continue;
      const segs = segments(edge.points);
      const crossesFrame = segs.some(([a, b]) => segmentLengthInBox(a, b, frame.box) > 0);
      if (crossesFrame) frameViolations++;
    }
  }

  let totalEdgeLength = 0;
  let totalBends = 0;
  for (const edge of edgeList) {
    totalBends += bendsOf(edge.points);
    for (const [a, b] of segments(edge.points)) totalEdgeLength += segmentLength(a, b);
  }

  // Overlaps: any two node boxes overlapping, or a frame overlapping another box it is not cleanly nested in/around.
  let overlaps = 0;
  const allBoxes = [
    ...geometry.nodes.map((n) => ({ kind: 'node' as const, box: n.box })),
    ...(geometry.frames ?? []).map((f) => ({ kind: 'frame' as const, box: f.box })),
  ];
  for (let i = 0; i < allBoxes.length; i++) {
    for (let j = i + 1; j < allBoxes.length; j++) {
      const a = allBoxes[i]!;
      const b = allBoxes[j]!;
      if (a.kind === 'node' && b.kind === 'node' && boxesOverlap(a.box, b.box)) overlaps++;
      else if (a.kind !== b.kind && boxesOverlap(a.box, b.box) && !isNested(a.box, b.box) && !isNested(b.box, a.box))
        overlaps++;
    }
  }

  // Aspect ratio and wasted area, from the overall bounding box of every node.
  const left = Math.min(...geometry.nodes.map((n) => n.box.x));
  const top = Math.min(...geometry.nodes.map((n) => n.box.y));
  const right = Math.max(...geometry.nodes.map((n) => n.box.x + n.box.width));
  const bottom = Math.max(...geometry.nodes.map((n) => n.box.y + n.box.height));
  const boundWidth = Math.max(1, right - left);
  const boundHeight = Math.max(1, bottom - top);
  const aspectDeviation = Math.abs(boundWidth / boundHeight - 1.6);
  const coveredArea = geometry.nodes.reduce((sum, n) => sum + n.box.width * n.box.height, 0);
  const boundArea = boundWidth * boundHeight;
  const wastedArea = boundArea === 0 ? 0 : Math.max(0, 1 - coveredArea / boundArea);

  const breakdown: MetricBreakdown = {
    crossings,
    edgeThroughNode: { incidents: edgeThroughNodeIncidents, length: edgeThroughNodeLength },
    frameViolations,
    totalEdgeLength,
    totalBends,
    overlaps,
    aspectDeviation,
    wastedArea,
  };
  const total =
    breakdown.crossings * METRIC_WEIGHTS.crossings +
    breakdown.edgeThroughNode.incidents * METRIC_WEIGHTS.edgeThroughNode +
    breakdown.edgeThroughNode.length * EDGE_THROUGH_NODE_LENGTH_WEIGHT +
    breakdown.frameViolations * METRIC_WEIGHTS.frameViolations +
    breakdown.totalEdgeLength * METRIC_WEIGHTS.totalEdgeLength +
    breakdown.totalBends * METRIC_WEIGHTS.totalBends +
    breakdown.overlaps * METRIC_WEIGHTS.overlaps +
    breakdown.aspectDeviation * METRIC_WEIGHTS.aspectDeviation +
    breakdown.wastedArea * METRIC_WEIGHTS.wastedArea;

  return { ...breakdown, total };
};
