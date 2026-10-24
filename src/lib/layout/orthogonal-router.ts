/**
 * A general-purpose orthogonal (Manhattan) router: finds a polyline from
 * `start` to `end` that never runs through the interior of any obstacle box,
 * for *any* relative position of `start` and `end` — left-to-right,
 * right-to-left, above, below, or anywhere in a 2D pack.
 *
 * `layered.ts`'s own `routeEdges` only ever has to connect ranks that
 * increase left to right, so its routing picks a side (forward or backward)
 * and never checks for obstacles along the way. That stopped being a safe
 * assumption once nodes are placed by a 2D pack (`compoundLayout`) rather
 * than along one rank axis: two tables in different Bounded Context boxes
 * can end up anywhere relative to each other, including directly above or
 * below, and a straight or naively-jogged line between them can run straight
 * through a third table. This module is the fix: it is the one place that
 * actually avoids obstacles, reused by the ER view's real route (`view.ts`'s
 * `detourRoute`/`relationRoute`) and by the layout metric, so the metric
 * always scores exactly what gets drawn.
 *
 * Strategy, cheapest first:
 * 1. A straight line, when the ports already line up.
 * 2. A single-bend L-shape, in whichever of its two orientations is clear.
 * 3. A 2-bend "lane" detour (#152 round 2): the mid-run's coordinate is one
 *    of a handful of candidates taken directly from the blocking obstacles'
 *    own (already margin-inflated) borders — not a coordinate-compressed
 *    pixel grid walked by Dijkstra. Checking a candidate costs the same
 *    handful of `horizontalBlocked`/`verticalBlocked` calls the L-shape path
 *    above already pays; there is no grid to build. See `laneDetour`.
 * 4. A tiny, rarely-reached Dijkstra over a small local grid, only for the
 *    pathological case where no 2-bend lane exists at all (obstacles packed
 *    densely enough that every single candidate line is itself blocked
 *    somewhere). See `rareFallbackRoute`. Kept only as a correctness net —
 *    `dev/layout-bench.ts`'s fixture corpus reaches it for exactly 2 of its
 *    541 edges (both in dense real/synthetic fixtures), so it is sized and
 *    implemented for correctness and brevity, not for speed: a plain
 *    linear-scan Dijkstra (no binary heap) is plenty fast at the handful of
 *    grid states this ever actually searches.
 *
 * Earlier shape (#150/#151 round 2) searched every blocked case with a full
 * grid-plus-Dijkstra fallback, steering away from already-routed traffic
 * (`AVOID_CROSSING_PENALTY`) and from hugging a border
 * (`OUTLINE_HUG_STEP_PENALTY`) via per-step cost penalties, with a conditional
 * second "richer" search when the first still hugged. Profiling (#152 round
 * 2) found that fallback was ~95% of all routing time on the densest fixture
 * (`er-complex`, 51 edges) — not because it ran often, but because building
 * its coordinate-compressed grid and its six same-shaped boolean/avoid/hug
 * arrays is quadratic in the number of nearby obstacles, paid again for every
 * edge that fell through to it. The idea itself, not just its cost, was the
 * problem: a dense per-pixel search with tuned steering penalties to avoid
 * hugging a border, when `margin` (the obstacle inflation every route is
 * already kept clear of, 20 in `er-diagram/element.ts`) is wider than
 * `OUTLINE_HUG_CLEARANCE` (6) — so a route that merely keeps its margin
 * clearance from an obstacle it detours around is *already* far enough from
 * that obstacle's true border to never count as hugging it, by construction,
 * with no penalty needed. `laneDetour` below is built on exactly that: its
 * candidate coordinates are the margin-inflated borders themselves, so a
 * lane that uses one is never a hug of the obstacle that produced it.
 */

import { routeHugsOutline } from './metrics';

export type RoutePoint = { readonly x: number; readonly y: number };
export type RouteBox = { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
/** One already-drawn segment from an edge routed earlier in the same batch, to steer a new route away from. */
export type RouteSegment = readonly [RoutePoint, RoutePoint];

/**
 * A vertical run at `x` between `yTop` and `yBottom` passes through an
 * obstacle's open interior. Exported for `route-nudge.ts`, which must re-check
 * clearance itself before sliding an already-routed segment sideways.
 */
export const verticalBlocked = (x: number, yTop: number, yBottom: number, obstacles: readonly RouteBox[]): boolean =>
  obstacles.some(
    (box) => x > box.x && x < box.x + box.width && Math.max(box.y, yTop) < Math.min(box.y + box.height, yBottom) - 1e-6,
  );

/** A horizontal run at `y` between `xLeft` and `xRight` passes through an obstacle's open interior. See `verticalBlocked`. */
export const horizontalBlocked = (y: number, xLeft: number, xRight: number, obstacles: readonly RouteBox[]): boolean =>
  obstacles.some(
    (box) => y > box.y && y < box.y + box.height && Math.max(box.x, xLeft) < Math.min(box.x + box.width, xRight) - 1e-6,
  );

/** Drops a point that only continues the previous direction, so a route reads as its real turns. */
const simplify = (points: readonly RoutePoint[]): readonly RoutePoint[] => {
  const out: RoutePoint[] = [];
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

/** A polyline's consecutive point pairs, as segments. */
const segmentsOf = (points: readonly RoutePoint[]): readonly RouteSegment[] =>
  points.slice(1).map((point, i) => [points[i]!, point] as const);

/** Whether two axis-aligned segments cross at a point interior to both (a shared endpoint does not count). */
const segmentsCross = (a: RouteSegment, b: RouteSegment): boolean => {
  const [a1, a2] = a;
  const [b1, b2] = b;
  const aVertical = a1.x === a2.x;
  const bVertical = b1.x === b2.x;
  if (aVertical === bVertical) return false; // parallel axis-aligned segments never "cross" here; collinear overlap is a separate concern (route-nudge.ts)
  const [v1, v2, h1, h2] = aVertical ? [a1, a2, b1, b2] : [b1, b2, a1, a2];
  const x = v1.x;
  const y = h1.y;
  const vTop = Math.min(v1.y, v2.y);
  const vBottom = Math.max(v1.y, v2.y);
  const hLeft = Math.min(h1.x, h2.x);
  const hRight = Math.max(h1.x, h2.x);
  return x > hLeft && x < hRight && y > vTop && y < vBottom;
};

/**
 * How many of `avoid`'s segments a candidate polyline would cross. The
 * crossing-awareness penalty this module's own shape selection uses to pick
 * between otherwise-equal candidates; exported for `view.ts`'s port-side
 * selection, which scores candidate ports the same way before any of them is
 * actually committed to.
 */
export const crossingsAgainst = (points: readonly RoutePoint[], avoid: readonly RouteSegment[]): number => {
  if (avoid.length === 0) return 0;
  let count = 0;
  for (const segment of segmentsOf(points)) for (const other of avoid) if (segmentsCross(segment, other)) count++;
  return count;
};

/**
 * Candidate coordinates for a 2-bend detour's middle run, taken directly from
 * the obstacles that actually matter to it: every obstacle whose span on the
 * *other* axis overlaps the middle run's own span (e.g., for a vertical
 * middle run from `start.y` to `end.y`, every obstacle whose y-range
 * overlaps that span contributes its left and right edge as a candidate
 * x-coordinate — a lane right next to that obstacle, already a full `margin`
 * from its true border since `obstacles` here is margin-inflated). This is
 * the whole "corridor" idea: lanes come from the packed boxes themselves,
 * not from a pixel grid.
 */
const laneCandidates = (
  rangeLow: number,
  rangeHigh: number,
  obstacles: readonly RouteBox[],
  perpendicular: 'x' | 'y',
): readonly number[] => {
  const set = new Set<number>();
  for (const box of obstacles) {
    const overlaps =
      perpendicular === 'x'
        ? box.y < rangeHigh && box.y + box.height > rangeLow
        : box.x < rangeHigh && box.x + box.width > rangeLow;
    if (!overlaps) continue;
    if (perpendicular === 'x') {
      set.add(box.x);
      set.add(box.x + box.width);
    } else {
      set.add(box.y);
      set.add(box.y + box.height);
    }
  }
  return [...set];
};

type ShapeCandidate = { readonly points: readonly RoutePoint[]; readonly hugs: boolean; readonly length: number };

const manhattanLength = (points: readonly RoutePoint[]): number =>
  segmentsOf(points).reduce((sum, [a, b]) => sum + Math.abs(a.x - b.x) + Math.abs(a.y - b.y), 0);

/**
 * The "horizontal, then vertical, then horizontal" family of 2-bend
 * detours: `start` runs across to some `midX`, then the whole vertical gap
 * to `end`'s row, then across to `end`. Every valid `midX` is tried (there
 * are rarely more than a handful — one pair per obstacle actually in the
 * way), each checked clear with the same obstacle tests the L-shape path
 * uses; the caller picks among whatever this returns.
 */
const horizontalVerticalHorizontal = (
  start: RoutePoint,
  end: RoutePoint,
  obstacles: readonly RouteBox[],
  outlines: readonly RouteBox[],
): readonly ShapeCandidate[] => {
  const midXs = laneCandidates(Math.min(start.y, end.y), Math.max(start.y, end.y), obstacles, 'x');
  const out: ShapeCandidate[] = [];
  for (const midX of midXs) {
    const leg1Clear = !horizontalBlocked(start.y, Math.min(start.x, midX), Math.max(start.x, midX), obstacles);
    const leg2Clear = !verticalBlocked(midX, Math.min(start.y, end.y), Math.max(start.y, end.y), obstacles);
    const leg3Clear = !horizontalBlocked(end.y, Math.min(midX, end.x), Math.max(midX, end.x), obstacles);
    if (!leg1Clear || !leg2Clear || !leg3Clear) continue;
    const points = simplify([start, { x: midX, y: start.y }, { x: midX, y: end.y }, end]);
    out.push({ points, hugs: routeHugsOutline(points, outlines), length: manhattanLength(points) });
  }
  return out;
};

/** The "vertical, then horizontal, then vertical" mirror of `horizontalVerticalHorizontal`. */
const verticalHorizontalVertical = (
  start: RoutePoint,
  end: RoutePoint,
  obstacles: readonly RouteBox[],
  outlines: readonly RouteBox[],
): readonly ShapeCandidate[] => {
  const midYs = laneCandidates(Math.min(start.x, end.x), Math.max(start.x, end.x), obstacles, 'y');
  const out: ShapeCandidate[] = [];
  for (const midY of midYs) {
    const leg1Clear = !verticalBlocked(start.x, Math.min(start.y, midY), Math.max(start.y, midY), obstacles);
    const leg2Clear = !horizontalBlocked(midY, Math.min(start.x, end.x), Math.max(start.x, end.x), obstacles);
    const leg3Clear = !verticalBlocked(end.x, Math.min(midY, end.y), Math.max(midY, end.y), obstacles);
    if (!leg1Clear || !leg2Clear || !leg3Clear) continue;
    const points = simplify([start, { x: start.x, y: midY }, { x: end.x, y: midY }, end]);
    out.push({ points, hugs: routeHugsOutline(points, outlines), length: manhattanLength(points) });
  }
  return out;
};

/**
 * Picks the best of a batch of candidate shapes: a route that does not hug
 * any of `outlines` always beats one that does (replacing the old Dijkstra's
 * per-step hug penalty with a hard preference — there is no search to steer,
 * only a short list to filter), then fewer crossings against already-routed
 * traffic (replacing `AVOID_CROSSING_PENALTY`), then the shorter route.
 */
const pickBest = (
  candidates: readonly ShapeCandidate[],
  avoid: readonly RouteSegment[],
): { readonly points: readonly RoutePoint[]; readonly hugs: boolean } | null => {
  if (candidates.length === 0) return null;
  let best = candidates[0]!;
  let bestCrossings = crossingsAgainst(best.points, avoid);
  for (const candidate of candidates.slice(1)) {
    const crossings = crossingsAgainst(candidate.points, avoid);
    const better =
      candidate.hugs !== best.hugs
        ? !candidate.hugs
        : crossings !== bestCrossings
          ? crossings < bestCrossings
          : candidate.length < best.length;
    if (better) {
      best = candidate;
      bestCrossings = crossings;
    }
  }
  return { points: best.points, hugs: best.hugs };
};

/**
 * The 2-bend lane detour: tries both bend orientations (`horizontalVerticalHorizontal`,
 * `verticalHorizontalVertical`) and keeps the best candidate across both, by
 * `pickBest`'s preference order. `null` when neither orientation found even
 * one fully clear candidate — a dense pack where every lane the obstacles
 * themselves suggest is itself blocked by some other obstacle — in which
 * case the caller falls back to `rareFallbackRoute`.
 */
const laneDetour = (
  start: RoutePoint,
  end: RoutePoint,
  obstacles: readonly RouteBox[],
  avoid: readonly RouteSegment[],
  outlines: readonly RouteBox[],
): { readonly points: readonly RoutePoint[]; readonly hugs: boolean } | null =>
  pickBest(
    [
      ...horizontalVerticalHorizontal(start, end, obstacles, outlines),
      ...verticalHorizontalVertical(start, end, obstacles, outlines),
    ],
    avoid,
  );

const clamp = (value: number, low: number, high: number): number => Math.min(high, Math.max(low, value));

/**
 * The correctness net for the rare case `laneDetour` finds nothing: a plain
 * BFS over a coordinate-compressed grid built only from the obstacles near
 * `start`/`end` — no bend pricing, no `avoid` steering, no hug steering,
 * unlike the Dijkstra fallback this replaces. This only has to guarantee
 * *a* clear route exists; everything about which clear route reads best
 * (hug-avoidance, crossing-awareness) is already handled by `laneDetour`'s
 * candidate preference above whenever it finds a route at all, and a few
 * extra bends on the rare edge that falls through to this function (2 of
 * `dev/layout-bench.ts`'s 541-edge fixture corpus) cost nothing `scoreLayout`
 * weighs heavily. Dropping bend-awareness also drops the need to track a
 * direction per grid cell (the old fallback's ×3 state blow-up) and, with
 * it, the need for a priority queue at all: a plain FIFO queue finds the
 * fewest-hops path through an unweighted grid just as correctly, and BFS's
 * own hop count already favours fewer, longer-straight-run bends over many
 * short zig-zags without any penalty term to tune.
 *
 * The window is grown to fully contain every obstacle that pokes into the
 * initial `start`/`end`-centered buffer, not just clamped to it: a bug
 * found on `er-complex` (#152) showed what goes wrong otherwise — an
 * obstacle wider or taller than the buffer gets clamped into looking like
 * it fills the window edge-to-edge with no lane around it, so the grid
 * graph itself is disconnected even though a real detour exists just
 * outside the window. That made this function return `null` for a
 * genuinely routable case, and the caller's only other fallback is an
 * *unchecked* straight L-shape — silently reintroducing the exact "route
 * drawn straight through a table" bug this whole module exists to prevent.
 * Growing the window is the fix, not a tighter bail-out: shrinking the
 * buffer instead would only make this triggering obstacle smaller relative
 * to the window, not avoid the underlying problem for a larger one.
 */
const rareFallbackRoute = (
  start: RoutePoint,
  end: RoutePoint,
  obstacles: readonly RouteBox[],
  margin: number,
): readonly RoutePoint[] | null => {
  const seedBuffer = Math.max(margin * 4, 160);
  const seedLeft = Math.min(start.x, end.x) - seedBuffer;
  const seedRight = Math.max(start.x, end.x) + seedBuffer;
  const seedTop = Math.min(start.y, end.y) - seedBuffer;
  const seedBottom = Math.max(start.y, end.y) + seedBuffer;
  const seed = obstacles.filter(
    (box) => box.x < seedRight && box.x + box.width > seedLeft && box.y < seedBottom && box.y + box.height > seedTop,
  );
  const edgeBuffer = Math.max(margin, 40);
  const left = Math.min(seedLeft, ...seed.map((box) => box.x - edgeBuffer));
  const right = Math.max(seedRight, ...seed.map((box) => box.x + box.width + edgeBuffer));
  const top = Math.min(seedTop, ...seed.map((box) => box.y - edgeBuffer));
  const bottom = Math.max(seedBottom, ...seed.map((box) => box.y + box.height + edgeBuffer));
  const relevant = obstacles.filter(
    (box) => box.x < right && box.x + box.width > left && box.y < bottom && box.y + box.height > top,
  );
  if (relevant.length > 120) return null;

  const xs = new Set([start.x, end.x, left, right]);
  const ys = new Set([start.y, end.y, top, bottom]);
  for (const box of relevant) {
    xs.add(clamp(box.x, left, right));
    xs.add(clamp(box.x + box.width, left, right));
    ys.add(clamp(box.y, top, bottom));
    ys.add(clamp(box.y + box.height, top, bottom));
  }
  const xList = [...xs].sort((a, b) => a - b);
  const yList = [...ys].sort((a, b) => a - b);
  const width = xList.length;
  const height = yList.length;
  const startX = xList.indexOf(start.x);
  const startY = yList.indexOf(start.y);
  const endX = xList.indexOf(end.x);
  const endY = yList.indexOf(end.y);
  if (startX < 0 || startY < 0 || endX < 0 || endY < 0) return null;

  const hClear: boolean[][] = Array.from({ length: width - 1 }, (_, xi) =>
    Array.from({ length: height }, (_, yi) => !horizontalBlocked(yList[yi]!, xList[xi]!, xList[xi + 1]!, relevant)),
  );
  const vClear: boolean[][] = Array.from({ length: width }, (_, xi) =>
    Array.from({ length: height - 1 }, (_, yi) => !verticalBlocked(xList[xi]!, yList[yi]!, yList[yi + 1]!, relevant)),
  );

  // Plain BFS over grid cells (`encode`'s state is just `xi, yi` — no
  // per-direction tags to blow the state count up 3x): a FIFO queue and a
  // "visited" check are all that is needed to find a fewest-hops path
  // through an unweighted grid.
  const encode = (xi: number, yi: number): number => xi * height + yi;
  const cellCount = width * height;
  const prev = new Int32Array(cellCount).fill(-1);
  const visited = new Uint8Array(cellCount);
  const startCell = encode(startX, startY);
  const endCell = encode(endX, endY);
  visited[startCell] = 1;
  const queue = [startCell];
  // `queue` grows while this iterates (`visit` below pushes onto it); a
  // `for...of` over an array re-reads `length` each step, so it still visits
  // cells appended during the loop — no separate read/write index needed.
  for (const current of queue) {
    if (current === endCell) break;
    const yi = current % height;
    const xi = (current - yi) / height;
    const visit = (nextXi: number, nextYi: number) => {
      const next = encode(nextXi, nextYi);
      if (visited[next]) return;
      visited[next] = 1;
      prev[next] = current;
      queue.push(next);
    };
    if (xi > 0 && hClear[xi - 1]?.[yi]) visit(xi - 1, yi);
    if (xi < width - 1 && hClear[xi]?.[yi]) visit(xi + 1, yi);
    if (yi > 0 && vClear[xi]?.[yi - 1]) visit(xi, yi - 1);
    if (yi < height - 1 && vClear[xi]?.[yi]) visit(xi, yi + 1);
  }
  if (!visited[endCell]) return null;

  const points: RoutePoint[] = [];
  let at = endCell;
  for (;;) {
    const yi = at % height;
    const xi = (at - yi) / height;
    points.push({ x: xList[xi]!, y: yList[yi]! });
    if (at === startCell) break;
    at = prev[at]!;
  }
  points.reverse();
  return simplify(points);
};

/**
 * Routes `start` to `end` around `obstacles` (inflated by `margin` on every
 * side), trying the cheapest shape first. Always returns at least
 * `[start, end]`, even when no fully clear path was found, so a caller never
 * has to handle "no route" as a separate case — a crammed corner is a metric
 * score to drive down, not a crash.
 *
 * `avoid` is a batch-routing concern, not an obstacle: segments from edges
 * already routed earlier in the same batch (see `view.ts`'s `relationRoutes`).
 * They never block a candidate shape outright — only `obstacles` do that —
 * but when more than one shape is equally obstacle-clear, the one crossing
 * fewer of them wins, so a batch of edges routed one at a time still comes
 * out mutually crossing-aware instead of each being blind to the others.
 *
 * `outlines`: every node's and every frame's *true* box, used to prefer a
 * non-hugging lane detour over a hugging one when both are obstacle-clear
 * (see `laneDetour`/`pickBest`). Kept separate from `obstacles` because the
 * box actually worth steering clear of hugging is typically the edge's own
 * table or its own aggregate frame, both deliberately excluded from
 * `obstacles` so the edge is never blocked by the very card or frame it
 * leaves from. Omitted entirely, this changes nothing but the hug preference.
 */
export const routeAroundObstacles = (
  start: RoutePoint,
  end: RoutePoint,
  obstacles: readonly RouteBox[],
  margin: number,
  avoid: readonly RouteSegment[] = [],
  outlines: readonly RouteBox[] = [],
): readonly RoutePoint[] => {
  if (start.x === end.x && start.y === end.y) return [start, end];
  const inflated = obstacles.map((box) => ({
    x: box.x - margin,
    y: box.y - margin,
    width: box.width + margin * 2,
    height: box.height + margin * 2,
  }));

  if (start.x === end.x) {
    if (!verticalBlocked(start.x, Math.min(start.y, end.y), Math.max(start.y, end.y), inflated)) return [start, end];
  } else if (start.y === end.y) {
    if (!horizontalBlocked(start.y, Math.min(start.x, end.x), Math.max(start.x, end.x), inflated)) return [start, end];
  }

  const horizontalFirst = { x: end.x, y: start.y };
  const verticalFirst = { x: start.x, y: end.y };
  const freeVia = (corner: RoutePoint): boolean => {
    const leg1 =
      corner.y === start.y
        ? !horizontalBlocked(start.y, Math.min(start.x, corner.x), Math.max(start.x, corner.x), inflated)
        : !verticalBlocked(start.x, Math.min(start.y, corner.y), Math.max(start.y, corner.y), inflated);
    const leg2 =
      corner.y === end.y
        ? !horizontalBlocked(end.y, Math.min(corner.x, end.x), Math.max(corner.x, end.x), inflated)
        : !verticalBlocked(end.x, Math.min(corner.y, end.y), Math.max(corner.y, end.y), inflated);
    return leg1 && leg2;
  };
  // Tried in this order, not the reverse, because it measurably reduces
  // edge-edge crossings across the layout-complexity bench's fixture corpus
  // (`dev/layout-bench.ts`): ER cards read wider than tall, so two lines
  // leaving nearby ports tend to separate from each other sooner — before
  // the long horizontal run where they would otherwise run side by side —
  // when each drops into its own lane first instead of fanning out
  // horizontally right away. This is only the tie-break now: when `avoid`
  // is non-empty and both shapes are clear, whichever actually crosses fewer
  // already-routed segments wins regardless of this preference.
  const verticalOk = freeVia(verticalFirst);
  const horizontalOk = freeVia(horizontalFirst);

  if (verticalOk && horizontalOk) {
    const verticalShape = simplify([start, verticalFirst, end]);
    const horizontalShape = simplify([start, horizontalFirst, end]);
    const verticalCrossings = crossingsAgainst(verticalShape, avoid);
    const horizontalCrossings = crossingsAgainst(horizontalShape, avoid);
    return horizontalCrossings < verticalCrossings ? horizontalShape : verticalShape;
  }
  if (verticalOk) return simplify([start, verticalFirst, end]);
  if (horizontalOk) return simplify([start, horizontalFirst, end]);

  const lane = laneDetour(start, end, inflated, avoid, outlines);
  if (lane !== null) return lane.points;
  return rareFallbackRoute(start, end, inflated, margin) ?? simplify([start, horizontalFirst, end]);
};
