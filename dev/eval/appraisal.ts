/**
 * The ER-specific half of the layout appraisal: the readability failures that
 * `src/lib/layout/metrics.ts`'s generic `scoreLayout` cannot see because they
 * are about *this* component's rendering, not abstract boxes and polylines.
 *
 * Four failure classes were named directly by the reader (v0.3 review):
 *
 * 1. A relation line running parallel to, and exactly on, a card or frame
 *    border — zero gap, so the line and the border read as one stroke.
 * 2. A route leaving a card through its own interior while its port and
 *    cardinality label stay on the opposite edge (`1..N` invisible at the
 *    end the line actually leaves from).
 * 3. A cardinality label drawn on top of its own line or glyph, so the
 *    start end is the hardest one to read.
 * 4. Two relations sharing a lane so exactly that colour is the only
 *    difference; when the shared run is long, neither line can be followed.
 *
 * `scoreLayout` measures crossings, collinear runs, outline proximity and
 * edge length. This module adds the endpoint/label/border diagnostics, plus
 * the default-view legibility numbers (fit scale, effective text size) that
 * say whether any of it can be read without zooming.
 *
 * It is deliberately evaluation-only: none of these values feed the weighted
 * layout score or its ratchet. The loop compares them as a vector so a real
 * readability gain cannot be hidden by an unrelated weighted-total drop.
 */

import {
  scoreLayout,
  type LayoutGeometry,
  type MetricBox,
  type MetricPoint,
  type MetricResult,
} from '../../src/lib/layout/metrics';

export type AppraisalCanvas = { readonly width: number; readonly height: number };

/** One rendered text label: a cardinality at an end, or a relation's own name. */
export type AppraisalLabel = {
  readonly id: string;
  readonly edge: string;
  readonly end: 'start' | 'end' | 'relation';
  readonly kind: 'cardinality' | 'relation';
  readonly text: string;
  readonly box: MetricBox;
};

export type EndpointDiagnostics = {
  /** An end whose first segment points back into its own card instead of away from it. */
  readonly inwardDepartures: number;
  readonly inwardArrivals: number;
  /** A route whose polyline runs through the interior of the card it starts or ends at. */
  readonly throughOwnNode: { readonly incidents: number; readonly length: number };
};

export type BorderDiagnostics = {
  /** Edge segment parallel to, and within `CONTACT_EPSILON` of, any node/frame border. */
  readonly contact: { readonly incidents: number; readonly length: number };
  /** Edge segment parallel to, and within `NEAR_CONTACT_EPSILON` of, any node/frame border. */
  readonly nearContact: { readonly incidents: number; readonly length: number };
};

export type ParallelDiagnostics = {
  /** Two different edges running parallel within `PARALLEL_EPSILON`, long enough to be mistaken for one. */
  readonly nearMiss: { readonly incidents: number; readonly length: number };
};

export type LabelDiagnostics = {
  readonly total: number;
  readonly overNode: number;
  readonly onBorder: number;
  readonly onEdge: number;
  readonly overlappingEachOther: number;
  readonly offCanvas: number;
};

export type DetourDiagnostics = {
  /** Sum of `routed length - straight (Manhattan) port distance` over every non-self edge. */
  readonly excess: number;
  readonly averageRatio: number;
  readonly maxRatio: number;
  /** Edges whose routed length is more than twice the median routed length. */
  readonly longEdges: number;
  /** Length of segments travelling opposite the edge's own start-to-end direction. */
  readonly backwardLength: number;
};

export type Appraisal = {
  readonly score: MetricResult;
  /** `min((canvas - margins) / world, 1)`, the same rule `viewport.ts`'s fit uses. */
  readonly fitScale: number;
  /** `fitScale` applied to the table header / field text's authored px sizes. */
  readonly effectiveTableIdPx: number;
  readonly effectiveFieldPx: number;
  readonly world: { readonly width: number; readonly height: number; readonly aspect: number };
  readonly endpoints: EndpointDiagnostics;
  readonly borders: BorderDiagnostics;
  readonly parallel: ParallelDiagnostics;
  readonly labels: LabelDiagnostics;
  readonly detour: DetourDiagnostics;
  /** Deterministic render-size estimates, independent of the browser. */
  readonly render: { readonly edgePaths: number; readonly edgePathCommands: number; readonly labelTexts: number };
};

/** How many `<path>` elements the view emits per relation: visible stroke, flow dots and the hit target. */
const PATHS_PER_EDGE = 3;

/** Exact or near-exact contact: the line and the border are one stroke to the eye. */
const CONTACT_EPSILON = 1.5;
/** Wider than contact: a visible but still unreadably small gap. */
const NEAR_CONTACT_EPSILON = 4;
/** Two edges closer than this are one lane, not two readable lines. */
const PARALLEL_EPSILON = 4;
/** Ignore a shared run too short to matter (a port stub, not a corridor). */
const MIN_PARALLEL_OVERLAP = 8;
/** `scoreLayout`'s own shape thresholds, reused so the two reports agree. */
const MIN_BORDER_OVERLAP = 1;

const segments = (points: readonly MetricPoint[]): readonly (readonly [MetricPoint, MetricPoint])[] =>
  points.slice(1).map((point, i) => [points[i]!, point] as const);

const segmentLength = (a: MetricPoint, b: MetricPoint): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

const boxesOverlap = (a: MetricBox, b: MetricBox): boolean =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/** The length of a segment's portion strictly inside `box` (same rule as `metrics.ts`). */
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

/** The shared length of two parallel segments (or 0 when perpendicular / too far apart). */
const collinearOverlapLength = (
  a: readonly [MetricPoint, MetricPoint],
  b: readonly [MetricPoint, MetricPoint],
  epsilon: number,
): number => {
  const [a1, a2] = a;
  const [b1, b2] = b;
  const aVertical = a1.x === a2.x;
  const bVertical = b1.x === b2.x;
  if (aVertical !== bVertical) return 0;
  if (aVertical) {
    if (Math.abs(a1.x - b1.x) > epsilon) return 0;
    const aTop = Math.min(a1.y, a2.y);
    const aBottom = Math.max(a1.y, a2.y);
    const bTop = Math.min(b1.y, b2.y);
    const bBottom = Math.max(b1.y, b2.y);
    return Math.max(0, Math.min(aBottom, bBottom) - Math.max(aTop, bTop));
  }
  if (Math.abs(a1.y - b1.y) > epsilon) return 0;
  const aLeft = Math.min(a1.x, a2.x);
  const aRight = Math.max(a1.x, a2.x);
  const bLeft = Math.min(b1.x, b2.x);
  const bRight = Math.max(b1.x, b2.x);
  return Math.max(0, Math.min(aRight, bRight) - Math.max(aLeft, bLeft));
};

const borderSegmentsOf = (box: MetricBox): readonly (readonly [MetricPoint, MetricPoint])[] => [
  [
    { x: box.x, y: box.y },
    { x: box.x + box.width, y: box.y },
  ],
  [
    { x: box.x, y: box.y + box.height },
    { x: box.x + box.width, y: box.y + box.height },
  ],
  [
    { x: box.x, y: box.y },
    { x: box.x, y: box.y + box.height },
  ],
  [
    { x: box.x + box.width, y: box.y },
    { x: box.x + box.width, y: box.y + box.height },
  ],
];

const plus = (counts: { incidents: number; length: number }, length: number): void => {
  counts.incidents += 1;
  counts.length += length;
};

const nodeBoxOf = (geometry: LayoutGeometry, id: string): MetricBox | undefined =>
  geometry.nodes.find((node) => node.id === id)?.box;

type PortSide = { readonly normal: MetricPoint };

/** The side of `box` a port sits on, or null when it is not on a border (a hand-authored centre port). */
const portSideOf = (point: MetricPoint, box: MetricBox): PortSide | null => {
  const distances: readonly (readonly [PortSide, number])[] = [
    [{ normal: { x: -1, y: 0 } }, Math.abs(point.x - box.x)],
    [{ normal: { x: 1, y: 0 } }, Math.abs(point.x - (box.x + box.width))],
    [{ normal: { x: 0, y: -1 } }, Math.abs(point.y - box.y)],
    [{ normal: { x: 0, y: 1 } }, Math.abs(point.y - (box.y + box.height))],
  ];
  const [side, distance] = distances.reduce((best, next) => (next[1] < best[1] ? next : best), distances[0]!);
  return distance <= 2 ? side : null;
};

/** The next point that is not a duplicate of `point`, looking in `points` in the given order. */
const nextDistinct = (points: readonly MetricPoint[], start: number, step: 1 | -1): MetricPoint | null => {
  const origin = points[start];
  if (origin === undefined) return null;
  for (let index = start + step; index >= 0 && index < points.length; index += step) {
    const candidate = points[index];
    if (candidate === undefined) return null;
    if (candidate.x !== origin.x || candidate.y !== origin.y) return candidate;
  }
  return null;
};

const isInward = (outward: MetricPoint, vector: MetricPoint): boolean =>
  outward.x * vector.x + outward.y * vector.y < -0.5;

const endpointDiagnostics = (geometry: LayoutGeometry): EndpointDiagnostics => {
  let inwardDepartures = 0;
  let inwardArrivals = 0;
  const throughOwnNode = { incidents: 0, length: 0 };
  for (const edge of geometry.edges) {
    const points = edge.points;
    const first = points[0];
    const last = points.at(-1);
    if (first === undefined || last === undefined) continue;
    const sourceBox = nodeBoxOf(geometry, edge.from);
    const targetBox = nodeBoxOf(geometry, edge.to);
    if (sourceBox !== undefined) {
      const side = portSideOf(first, sourceBox);
      const next = nextDistinct(points, 0, 1);
      if (side !== null && next !== null && isInward(side.normal, { x: next.x - first.x, y: next.y - first.y })) {
        inwardDepartures += 1;
      }
    }
    if (targetBox !== undefined) {
      const side = portSideOf(last, targetBox);
      const previous = nextDistinct(points, points.length - 1, -1);
      if (
        side !== null &&
        previous !== null &&
        isInward(side.normal, { x: previous.x - last.x, y: previous.y - last.y })
      ) {
        inwardArrivals += 1;
      }
    }
    for (const box of [sourceBox, targetBox]) {
      if (box === undefined) continue;
      let inside = 0;
      for (const [a, b] of segments(points)) inside += segmentLengthInBox(a, b, box);
      if (inside > 0) plus(throughOwnNode, inside);
    }
  }
  return { inwardDepartures, inwardArrivals, throughOwnNode };
};

const borderDiagnostics = (geometry: LayoutGeometry): BorderDiagnostics => {
  const contact = { incidents: 0, length: 0 };
  const nearContact = { incidents: 0, length: 0 };
  const boxes = [...geometry.nodes.map((node) => node.box), ...(geometry.frames ?? []).map((frame) => frame.box)];
  for (const edge of geometry.edges) {
    for (const [a, b] of segments(edge.points)) {
      for (const box of boxes) {
        for (const border of borderSegmentsOf(box)) {
          const near = collinearOverlapLength([a, b], border, NEAR_CONTACT_EPSILON);
          if (near <= MIN_BORDER_OVERLAP) continue;
          plus(nearContact, near);
          const exact = collinearOverlapLength([a, b], border, CONTACT_EPSILON);
          if (exact > MIN_BORDER_OVERLAP) plus(contact, exact);
        }
      }
    }
  }
  return { contact, nearContact };
};

const parallelDiagnostics = (geometry: LayoutGeometry): ParallelDiagnostics => {
  const nearMiss = { incidents: 0, length: 0 };
  for (let i = 0; i < geometry.edges.length; i++) {
    const a = geometry.edges[i]!;
    const aSegments = segments(a.points);
    for (let j = i + 1; j < geometry.edges.length; j++) {
      const b = geometry.edges[j]!;
      for (const aSegment of aSegments) {
        for (const bSegment of segments(b.points)) {
          const overlap = collinearOverlapLength(aSegment, bSegment, PARALLEL_EPSILON);
          if (overlap > MIN_PARALLEL_OVERLAP) plus(nearMiss, overlap);
        }
      }
    }
  }
  return { nearMiss };
};

const labelDiagnostics = (
  labels: readonly AppraisalLabel[],
  geometry: LayoutGeometry,
  world: { readonly width: number; readonly height: number },
): LabelDiagnostics => {
  let overNode = 0;
  let onBorder = 0;
  let onEdge = 0;
  let overlappingEachOther = 0;
  let offCanvas = 0;
  const outlines = [...geometry.nodes.map((node) => node.box), ...(geometry.frames ?? []).map((frame) => frame.box)];
  for (const label of labels) {
    // Label boxes share the geometry's world coordinates. Comparing them with
    // the *canvas* was a coordinate-system bug: every label to the right of
    // the viewport width was reported off-canvas even though the world (and
    // the default fit) contains it. The world box is the correct bound.
    if (
      label.box.x < 0 ||
      label.box.y < 0 ||
      label.box.x + label.box.width > world.width ||
      label.box.y + label.box.height > world.height
    ) {
      offCanvas += 1;
    }
    if (geometry.nodes.some((node) => boxesOverlap(label.box, node.box))) overNode += 1;
    if (
      outlines.some((box) =>
        borderSegmentsOf(box).some(
          ([a, b]) =>
            // A border is a line; the label box owns any part of it that falls inside.
            Math.max(
              0,
              Math.min(Math.max(a.x, b.x), label.box.x + label.box.width) - Math.max(Math.min(a.x, b.x), label.box.x),
            ) *
              Math.max(
                0,
                Math.min(Math.max(a.y, b.y), label.box.y + label.box.height) -
                  Math.max(Math.min(a.y, b.y), label.box.y),
              ) >
            0,
        ),
      )
    ) {
      onBorder += 1;
    }
    if (
      geometry.edges.some((edge) => segments(edge.points).some(([a, b]) => segmentLengthInBox(a, b, label.box) > 0.5))
    ) {
      onEdge += 1;
    }
  }
  for (let i = 0; i < labels.length; i++) {
    for (let j = i + 1; j < labels.length; j++) {
      if (boxesOverlap(labels[i]!.box, labels[j]!.box)) overlappingEachOther += 1;
    }
  }
  return { total: labels.length, overNode, onBorder, onEdge, overlappingEachOther, offCanvas };
};

const detourDiagnostics = (geometry: LayoutGeometry): DetourDiagnostics => {
  let totalExcess = 0;
  let totalRatio = 0;
  let maxRatio = 0;
  let count = 0;
  let backwardLength = 0;
  const lengths: number[] = [];
  for (const edge of geometry.edges) {
    const points = edge.points;
    const first = points[0];
    const last = points.at(-1);
    if (first === undefined || last === undefined || points.length < 2) continue;
    let routed = 0;
    for (const [a, b] of segments(points)) routed += segmentLength(a, b);
    lengths.push(routed);
    if (edge.from === edge.to) continue;
    const manhattan = Math.abs(last.x - first.x) + Math.abs(last.y - first.y);
    const excess = Math.max(0, routed - manhattan);
    totalExcess += excess;
    totalRatio += routed / Math.max(1, manhattan);
    maxRatio = Math.max(maxRatio, routed / Math.max(1, manhattan));
    count += 1;
    const horizontal = Math.abs(last.x - first.x) >= Math.abs(last.y - first.y);
    const positive = horizontal ? last.x >= first.x : last.y >= first.y;
    for (const [a, b] of segments(points)) {
      const delta = horizontal ? b.x - a.x : b.y - a.y;
      if (delta !== 0 && delta > 0 !== positive) backwardLength += Math.abs(delta);
    }
  }
  const sorted = [...lengths].sort((a, b) => a - b);
  const median = sorted.length === 0 ? 0 : (sorted[Math.floor(sorted.length / 2)] ?? 0);
  return {
    excess: totalExcess,
    averageRatio: count === 0 ? 0 : totalRatio / count,
    maxRatio,
    longEdges: lengths.filter((length) => length > median * 2).length,
    backwardLength,
  };
};

/** The viewport's own fit rule: whole world visible, never above 100%. */
export const fitScaleFor = (
  canvas: AppraisalCanvas,
  world: { readonly width: number; readonly height: number },
): number =>
  Math.min(
    Math.max(0, (canvas.width - 24) / Math.max(1, world.width)),
    Math.max(0, (canvas.height - 40) / Math.max(1, world.height)),
    1,
  );

/** Deterministic path-command cost: the same geometry the browser will render, counted without a browser. */
const renderDiagnostics = (geometry: LayoutGeometry, labels: readonly AppraisalLabel[]): Appraisal['render'] => {
  let commands = 0;
  for (const edge of geometry.edges) {
    // One `M` plus every point after the first, including the curved/rounded representation.
    commands += Math.max(1, edge.points.length);
  }
  // The view draws the same `d` three times per edge (visible, flow, hit),
  // so the deterministic render estimate has to count all three; counting
  // one under-reported the cost this loop is meant to protect.
  return {
    edgePaths: geometry.edges.length * PATHS_PER_EDGE,
    edgePathCommands: commands * PATHS_PER_EDGE,
    labelTexts: labels.length,
  };
};

/**
 * Scores one fixture and returns both the existing weighted breakdown and the
 * ER-specific readability vector. Pure: same input, same output.
 */
export const appraiseGeometry = (
  geometry: LayoutGeometry,
  labels: readonly AppraisalLabel[],
  canvas: AppraisalCanvas,
  world: { readonly width: number; readonly height: number },
): Appraisal => {
  const fitScale = fitScaleFor(canvas, world);
  return {
    score: scoreLayout(geometry),
    fitScale,
    effectiveTableIdPx: fitScale * 13,
    effectiveFieldPx: fitScale * 11,
    world: { ...world, aspect: world.width / Math.max(1, world.height) },
    endpoints: endpointDiagnostics(geometry),
    borders: borderDiagnostics(geometry),
    parallel: parallelDiagnostics(geometry),
    labels: labelDiagnostics(labels, geometry, world),
    detour: detourDiagnostics(geometry),
    render: renderDiagnostics(geometry, labels),
  };
};
