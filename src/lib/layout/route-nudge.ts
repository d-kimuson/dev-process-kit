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
  /**
   * This edge's own table(s) and own frame(s) — every box excluded from
   * `obstacles` above so the edge is never blocked by the very card or frame
   * it leaves from (see `view.ts`'s `relationRoute`) — nudged away from when
   * hugged. Originally just frames (#151 round 2's first pass only covered
   * the Bounded Context border half of the user's report); widened to also
   * include the edge's own table(s), since the other half of that same
   * report — `legacy_api_tokens`'s relation running down its *own card's*
   * left border before ever reaching the frame — was a hug this module could
   * not see at all: `orthogonal-router.ts`'s Dijkstra clearance cost already
   * steers a fresh route off both, but nudging's own two rules (clear, then
   * re-clear after track spacing) only re-checked the frame half, so a hug
   * against the own table that survived routing — or one track spacing
   * reintroduced — was never caught.
   */
  readonly ownFrames?: readonly RouteBox[];
};

export type NudgeOptions = {
  /** Gap kept between two different edges' tracks once they are pulled apart. */
  readonly trackSpacing?: number;
  /** Minimum distance kept from an own frame's border before a run counts as "hugging" it. */
  readonly frameClearance?: number;
  /**
   * Straight run kept at either end of a route, between a port and the first
   * bend: a nudge may pull tracks apart, but never into it.
   *
   * Some views draw end decoration (an arrowhead, a crow's foot, an
   * end-cardinality circle) laid out along the port's own outgoing direction,
   * assuming the stroke continues straight underneath it — see the ER view's
   * `endGlyph` and `PORT_STRAIGHT`. The router already leaves each port
   * straight for that long, but a nudge slides the bend-to-bend segment next
   * to a port sideways, which changes that stub's length: measured on
   * `er-complex`, a track sharing a corridor moved 6px inward and left a
   * `0..N` end's "zero" circle 2px beyond the line's first corner. So the
   * caller that draws such decoration passes its own reach here, and a
   * candidate whose slide would shorten a stub below it is held at the bound
   * instead — sliding the other way, or not at all, stays allowed.
   */
  readonly minPortRun?: number;
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

/**
 * Pushes `coord` at least `clearance` away from any of `boxes`'s borders it
 * runs alongside — own frames (always; they are never a hard obstacle for
 * this edge) or, when `checkBlocked` is set, the edge's own hard `obstacles`
 * too (#151 round 2): sliding a segment sideways for track spacing (rule 2,
 * below) can land it newly within clearance of an obstacle's border it
 * never used to run alongside, which is itself exactly the hugging problem
 * this whole module exists to fix elsewhere — nudging must not reintroduce
 * it. Checked with `isBlocked` so a push away from one box's border can
 * never land the segment inside a *different* obstacle; a push that would
 * is skipped rather than applied, leaving `coord` as close as it safely can.
 */
const clearBorders = (
  candidate: Candidate,
  boxes: readonly RouteBox[],
  clearance: number,
  checkBlocked: boolean,
): number => {
  let coord = candidate.coord;
  for (const box of boxes) {
    const borders =
      candidate.orientation === 'vertical'
        ? rangesOverlap(candidate.rangeMin, candidate.rangeMax, box.y, box.y + box.height)
          ? [box.x, box.x + box.width]
          : []
        : rangesOverlap(candidate.rangeMin, candidate.rangeMax, box.x, box.x + box.width)
          ? [box.y, box.y + box.height]
          : [];
    for (const border of borders) {
      const distance = Math.abs(coord - border);
      if (distance < clearance) {
        const direction = coord >= border ? 1 : -1;
        const pushed = coord + direction * (clearance - distance);
        if (!checkBlocked || !isBlocked(candidate, pushed)) coord = pushed;
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

/** Whether sliding a candidate's segment to `coord` would run it within `clearance` of one of `boxes`'s borders. */
const hugsBorder = (candidate: Candidate, coord: number, boxes: readonly RouteBox[], clearance: number): boolean =>
  boxes.some((box) => {
    const borders =
      candidate.orientation === 'vertical'
        ? rangesOverlap(candidate.rangeMin, candidate.rangeMax, box.y, box.y + box.height)
          ? [box.x, box.x + box.width]
          : []
        : rangesOverlap(candidate.rangeMin, candidate.rangeMax, box.x, box.x + box.width)
          ? [box.y, box.y + box.height]
          : [];
    return borders.some((border) => Math.abs(coord - border) < clearance);
  });

/**
 * The furthest point toward `desired` (from `original`, which must itself be
 * safe) that stays clear of obstacles and — when `hugBoxes` is given — does
 * not newly run within `hugClearance` of one of its borders either (#151
 * round 2): track spacing (rule 2, below) picks `desired` purely from where
 * the *other* tracks in its cluster sit, so it can land a track back onto an
 * own frame's border even though rule 1 already cleared it before
 * clustering. Retreating toward `original` — the same, already-safe
 * mechanism `isBlocked` uses, not a separate sideways push — means this can
 * only ever pull a track closer to where it already was, never somewhere
 * new, so it cannot reintroduce a crossing with some other edge nudging has
 * no visibility into; an unconditional post-hoc push measurably could
 * (swept against the fixture corpus, raising `synthetic-random-2`'s
 * crossing count past its ratchet) and was rejected for exactly that reason.
 */
const safeCoord = (
  candidate: Candidate,
  original: number,
  desired: number,
  hugBoxes: readonly RouteBox[] = [],
  hugClearance = 0,
): number => {
  const unsafe = (coord: number): boolean =>
    isBlocked(candidate, coord) || (hugBoxes.length > 0 && hugsBorder(candidate, coord, hugBoxes, hugClearance));
  let coord = desired;
  let attempts = 0;
  while (unsafe(coord) && attempts < 8) {
    coord = (coord + original) / 2;
    attempts++;
  }
  return unsafe(coord) ? original : coord;
};

/**
 * The coordinate range a candidate's segment may slide into without
 * shortening the straight run at either end of its route below `minPortRun`.
 *
 * A route's first and last runs are port stubs: `port → corner`, along the
 * axis the segment after them does *not* move on (the two are perpendicular
 * at a genuine bend). Sliding such a segment moves that corner along the
 * stub's own axis, so the stub's signed length becomes
 * `(coord - port) * side`; the bound keeps that on the port's own side and at
 * least `minPortRun` long. Both ends are constrained, because a four-point
 * route's single interior segment is the corner for both.
 *
 * `low > high` means the two ends cannot both be served at once (a route
 * shorter than two stub runs): callers then leave that candidate untouched.
 */
const portRunRange = (
  points: readonly LayoutPoint[],
  segIndex: number,
  orientation: Orientation,
  minPortRun: number,
): { readonly low: number; readonly high: number } => {
  const axis = orientation === 'vertical' ? 'x' : 'y';
  let low = Number.NEGATIVE_INFINITY;
  let high = Number.POSITIVE_INFINITY;
  const bound = (port: LayoutPoint, corner: LayoutPoint): void => {
    const side = Math.sign(corner[axis] - port[axis]);
    if (side === 0) return;
    const limit = port[axis] + side * minPortRun;
    if (side > 0) low = Math.max(low, limit);
    else high = Math.min(high, limit);
  };
  const last = points.length - 1;
  if (segIndex === 1) bound(points[0]!, points[1]!);
  if (segIndex + 1 === last - 1) bound(points[last]!, points[last - 1]!);
  return { low, high };
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
  const minPortRun = options.minPortRun ?? 0;

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

  // Rule 1: clear each candidate's own frame borders first, so grouping
  // (rule 2) clusters around the cleared position.
  for (const candidate of candidates) {
    const ownFrames = ownFramesById.get(candidate.edgeId);
    if (ownFrames !== undefined && ownFrames.length > 0) {
      candidate.coord = clearBorders(candidate, ownFrames, frameClearance, false);
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
        const spread =
          sorted.length === 1 ? candidate.coord : center + (index - (sorted.length - 1) / 2) * trackSpacing;
        const edge = byEdge.get(candidate.edgeId)!;
        const original = edge.points[candidate.segIndex]![orientation === 'vertical' ? 'x' : 'y'];
        // Separating tracks must not eat the straight run either end glyph is
        // drawn on (`minPortRun`): hold the slide at that bound, which only
        // ever moves the track *back* toward where it already was, so every
        // safety check below still reasons about the same, already-clear
        // segment. Both ends unservable at once (`low > high`) leaves the
        // candidate exactly where it is.
        const { low, high } = portRunRange(edge.points, candidate.segIndex, orientation, minPortRun);
        const desired = minPortRun > 0 ? (low > high ? original : Math.min(high, Math.max(low, spread))) : spread;
        // Track spacing (just above) picks `desired` purely from where the
        // *other* tracks in the cluster sit — it can land a track back
        // within clearance of its own frame's border even though rule 1
        // already cleared it before clustering (#151 round 2). Guarded the
        // same way `isBlocked` already is: `safeCoord` retreats toward
        // `original` (the already-safe, pre-nudge position), so a track can
        // only ever end up closer to where it already was, never somewhere
        // new — unlike a separate sideways push, which measurably could
        // (and did, against the fixture corpus) land a track into a new
        // crossing with some other edge nudging has no visibility into.
        const finalCoord = safeCoord(
          candidate,
          original,
          desired,
          ownFramesById.get(candidate.edgeId) ?? [],
          frameClearance,
        );
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
