/**
 * Channel/track nudging: a post-process over a whole batch of *already*
 * routed edges (each one routed independently, one at a time, by
 * `orthogonal-router.ts`), so parallel lines sharing a corridor — or a line
 * running right along a frame border it does not cross but also does not
 * clear — get pulled apart into separate, parallel tracks instead of
 * coinciding. This is what `scoreLayout`'s `collinearOverlap` term measures;
 * this module is the fix for it.
 *
 * Deliberately narrow in scope: for each route, only its single longest
 * *interior* segment (a bend-to-bend run that touches neither port) is ever
 * considered for nudging. A port is never moved — nudging only ever slides a
 * free-floating middle run sideways, adjusting the (also untouched-port)
 * segments on either side implicitly by moving the shared corner. This keeps
 * the operation strictly local per edge (no cascading re-routing) and keeps
 * every safety check reasoned about one segment, one obstacle list, at a time.
 */

import type { LayoutPoint } from './layered';

import { horizontalBlocked, verticalBlocked, type RouteBox } from './orthogonal-router';

export type NudgeInput = {
  readonly id: string;
  readonly points: readonly LayoutPoint[];
  /** The exact obstacle set this route was already computed clear of — re-checked before sliding it. */
  readonly obstacles: readonly RouteBox[];
  /** Frame boxes this edge belongs to (so excluded from `obstacles`) — nudged away from when hugged. */
  readonly ownFrames?: readonly RouteBox[];
};

export type NudgeOptions = {
  /** Gap kept between two different edges' tracks once they are pulled apart. */
  readonly trackSpacing?: number;
  /** Minimum distance kept from an own frame's border before a run counts as "hugging" it. */
  readonly frameClearance?: number;
};

const DEFAULTS = { trackSpacing: 6, frameClearance: 6 } as const;

type Orientation = 'vertical' | 'horizontal';

type Candidate = {
  readonly edgeId: string;
  readonly segIndex: number;
  readonly orientation: Orientation;
  coord: number;
  readonly rangeMin: number;
  readonly rangeMax: number;
  readonly obstacles: readonly RouteBox[];
};

/** The longest interior segment of a route (touches neither the start nor the end port), if any. */
const longestInteriorSegment = (
  points: readonly LayoutPoint[],
): { readonly segIndex: number; readonly orientation: Orientation } | null => {
  if (points.length < 4) return null;
  let best: { segIndex: number; orientation: Orientation; length: number } | null = null;
  for (let segIndex = 1; segIndex <= points.length - 3; segIndex++) {
    const a = points[segIndex]!;
    const b = points[segIndex + 1]!;
    const orientation: Orientation = a.x === b.x ? 'vertical' : 'horizontal';
    const length = orientation === 'vertical' ? Math.abs(b.y - a.y) : Math.abs(b.x - a.x);
    if (best === null || length > best.length) best = { segIndex, orientation, length };
  }
  return best;
};

const rangesOverlap = (aMin: number, aMax: number, bMin: number, bMax: number): boolean => aMax >= bMin && bMax >= aMin;

/** Pushes `coord` at least `clearance` away from any own-frame border it runs alongside. */
const clearOwnFrames = (candidate: Candidate, ownFrames: readonly RouteBox[], clearance: number): number => {
  let coord = candidate.coord;
  for (const frame of ownFrames) {
    const borders =
      candidate.orientation === 'vertical'
        ? rangesOverlap(candidate.rangeMin, candidate.rangeMax, frame.y, frame.y + frame.height)
          ? [frame.x, frame.x + frame.width]
          : []
        : rangesOverlap(candidate.rangeMin, candidate.rangeMax, frame.x, frame.x + frame.width)
          ? [frame.y, frame.y + frame.height]
          : [];
    for (const border of borders) {
      const distance = Math.abs(coord - border);
      if (distance < clearance) {
        const direction = coord >= border ? 1 : -1;
        coord += direction * (clearance - distance);
      }
    }
  }
  return coord;
};

/** Whether sliding a candidate's segment to `coord` would run it through an obstacle. */
const isBlocked = (candidate: Candidate, coord: number): boolean =>
  candidate.orientation === 'vertical'
    ? verticalBlocked(coord, candidate.rangeMin, candidate.rangeMax, candidate.obstacles)
    : horizontalBlocked(coord, candidate.rangeMin, candidate.rangeMax, candidate.obstacles);

/** The furthest point toward `desired` (from `original`, which must itself be safe) that stays clear of obstacles. */
const safeCoord = (candidate: Candidate, original: number, desired: number): number => {
  let coord = desired;
  let attempts = 0;
  while (isBlocked(candidate, coord) && attempts < 8) {
    coord = (coord + original) / 2;
    attempts++;
  }
  return isBlocked(candidate, coord) ? original : coord;
};

/** Union-find over candidate indices, merging two that share (near enough) the same line and overlap along it. */
const clusterIndices = (items: readonly Candidate[], mergeEps: number): readonly number[] => {
  const parent = items.map((_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]!]!;
      i = parent[i]!;
    }
    return i;
  };
  const union = (a: number, b: number): void => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i]!;
      const b = items[j]!;
      if (Math.abs(a.coord - b.coord) <= mergeEps && rangesOverlap(a.rangeMin, a.rangeMax, b.rangeMin, b.rangeMax)) {
        union(i, j);
      }
    }
  }
  return items.map((_, i) => find(i));
};

/**
 * Pulls apart any routes sharing a corridor, and pushes a route off its own
 * frame's border, without ever moving a port. Pure and deterministic: same
 * input, same output, every time — ties (equal edge ids cannot occur; ids are
 * unique) never arise, and every ordering decision below sorts by `id`.
 */
export const nudgeParallelRoutes = (
  edges: readonly NudgeInput[],
  options: NudgeOptions = {},
): ReadonlyMap<string, readonly LayoutPoint[]> => {
  const trackSpacing = options.trackSpacing ?? DEFAULTS.trackSpacing;
  const frameClearance = options.frameClearance ?? DEFAULTS.frameClearance;

  const candidates: Candidate[] = [];
  const ownFramesById = new Map<string, readonly RouteBox[]>();
  for (const edge of edges) {
    const found = longestInteriorSegment(edge.points);
    if (found === null) continue;
    const a = edge.points[found.segIndex]!;
    const b = edge.points[found.segIndex + 1]!;
    const coord = found.orientation === 'vertical' ? a.x : a.y;
    const [rangeMin, rangeMax] =
      found.orientation === 'vertical'
        ? [Math.min(a.y, b.y), Math.max(a.y, b.y)]
        : [Math.min(a.x, b.x), Math.max(a.x, b.x)];
    candidates.push({
      edgeId: edge.id,
      segIndex: found.segIndex,
      orientation: found.orientation,
      coord,
      rangeMin,
      rangeMax,
      obstacles: edge.obstacles,
    });
    if (edge.ownFrames !== undefined) ownFramesById.set(edge.id, edge.ownFrames);
  }

  // Rule 1: clear each candidate's own frame borders first, so grouping (rule 2) clusters around the cleared position.
  for (const candidate of candidates) {
    const ownFrames = ownFramesById.get(candidate.edgeId);
    if (ownFrames !== undefined && ownFrames.length > 0) {
      candidate.coord = clearOwnFrames(candidate, ownFrames, frameClearance);
    }
  }

  // Rule 2: cluster candidates sharing a line and overlapping along it, then spread each cluster into separate tracks.
  const result = new Map<string, readonly LayoutPoint[]>();
  const byEdge = new Map(edges.map((edge) => [edge.id, edge] as const));
  const applied = new Set<string>();

  for (const orientation of ['vertical', 'horizontal'] as const) {
    const items = candidates.filter((c) => c.orientation === orientation);
    if (items.length === 0) continue;
    const roots = clusterIndices(items, trackSpacing);
    const groups = new Map<number, Candidate[]>();
    for (let i = 0; i < items.length; i++) {
      const root = roots[i]!;
      const bucket = groups.get(root);
      if (bucket) bucket.push(items[i]!);
      else groups.set(root, [items[i]!]);
    }
    for (const group of groups.values()) {
      const sorted = [...group].sort((a, b) => a.edgeId.localeCompare(b.edgeId));
      const center = sorted.reduce((sum, c) => sum + c.coord, 0) / sorted.length;
      sorted.forEach((candidate, index) => {
        const desired =
          sorted.length === 1 ? candidate.coord : center + (index - (sorted.length - 1) / 2) * trackSpacing;
        const original = byEdge.get(candidate.edgeId)!.points[candidate.segIndex]![
          orientation === 'vertical' ? 'x' : 'y'
        ];
        const finalCoord = safeCoord(candidate, original, desired);
        const edge = byEdge.get(candidate.edgeId)!;
        const points = (result.get(candidate.edgeId) ?? edge.points).map((point, index2) => {
          if (index2 !== candidate.segIndex && index2 !== candidate.segIndex + 1) return point;
          return orientation === 'vertical' ? { x: finalCoord, y: point.y } : { x: point.x, y: finalCoord };
        });
        result.set(candidate.edgeId, points);
        applied.add(candidate.edgeId);
      });
    }
  }

  for (const edge of edges) if (!applied.has(edge.id)) result.set(edge.id, edge.points);
  return result;
};
