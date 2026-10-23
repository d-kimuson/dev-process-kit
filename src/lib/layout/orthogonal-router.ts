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
 * 3. A bounded grid search (coordinates compressed from the nearby obstacles'
 *    own edges) with a Dijkstra that prices a direction change, so the
 *    result still reads as a small number of deliberate jogs instead of a
 *    staircase.
 */

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

/** Binary min-heap of `(priority, value)`, used for the grid search below. */
class MinHeap {
  readonly #items: { readonly priority: number; readonly value: number }[] = [];

  push(priority: number, value: number): void {
    this.#items.push({ priority, value });
    let i = this.#items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      const current = this.#items[i]!;
      const above = this.#items[parent]!;
      if (above.priority <= current.priority) break;
      this.#items[parent] = current;
      this.#items[i] = above;
      i = parent;
    }
  }

  pop(): { readonly priority: number; readonly value: number } | undefined {
    const top = this.#items[0];
    const last = this.#items.pop();
    if (top === undefined) return undefined;
    if (this.#items.length > 0 && last !== undefined) {
      this.#items[0] = last;
      let i = 0;
      for (;;) {
        const left = i * 2 + 1;
        const right = i * 2 + 2;
        let smallest = i;
        if (left < this.#items.length && this.#items[left]!.priority < this.#items[smallest]!.priority) smallest = left;
        if (right < this.#items.length && this.#items[right]!.priority < this.#items[smallest]!.priority)
          smallest = right;
        if (smallest === i) break;
        const a = this.#items[i]!;
        this.#items[i] = this.#items[smallest]!;
        this.#items[smallest] = a;
        i = smallest;
      }
    }
    return top;
  }

  get size(): number {
    return this.#items.length;
  }
}

const BEND_PENALTY = 60;
/**
 * Dijkstra cost added for a grid step that would cross an already-routed
 * edge's segment (`avoid`, the same batch-routing hint `routeAroundObstacles`'s
 * simple L-shape tie-break already uses). Priced a little above
 * `BEND_PENALTY` so the search prefers a few extra bends or a modest detour
 * over cutting across existing traffic, but — unlike `obstacles` — never a
 * hard block: `avoid` is a steering hint, not a wall, so a crossing that is
 * genuinely unavoidable still gets a route instead of `gridRoute` giving up.
 * Without this, the grid fallback (unlike the L-shape path above it) was
 * blind to every other edge in the batch, so widening the gap between two
 * Bounded Contexts — which makes a long cross-BC edge more likely to fall
 * through to this fallback, since its straight L-shapes have more obstacles
 * between its now-further-apart endpoints to clear — let it cut straight
 * through a busy local corridor that happened to sit on its cheapest
 * bend-and-distance path, even though a barely-longer detour around that
 * traffic existed (#150 round 2).
 *
 * Tuned, not guessed: a value this small (vs. an initial 500) was chosen
 * because pricing the penalty too high overcorrects — it pulls multiple
 * unrelated long edges toward the same "cheapest" detour lane, so they start
 * crossing each other and the fixture corpus's raw crossing counts rise
 * instead of fall (`synthetic-random-1` 71→77 at an unchanged, un-widened
 * gap, i.e. independent of the Bounded Context spacing this round otherwise
 * widens — see `dev-docs`/the #150 round 2 report for the swept
 * before/after numbers). 100 is the smallest tested value past which every
 * fixture's crossing count, at both the old and the new, much wider BC gap,
 * stayed at or below `LAYOUT_BENCH_CROSSINGS_BASELINE`.
 */
const AVOID_CROSSING_PENALTY = 100;
/** Direction a grid-search state arrived from: `0` only at the very start. */
const NONE = 0;
const HORIZONTAL = 1;
const VERTICAL = 2;

const clamp = (value: number, low: number, high: number): number => Math.min(high, Math.max(low, value));

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

/** How many of `avoid`'s segments a candidate polyline would cross. The crossing-awareness penalty used to pick between otherwise-equal candidate shapes. */
const crossingsAgainst = (points: readonly RoutePoint[], avoid: readonly RouteSegment[]): number => {
  if (avoid.length === 0) return 0;
  let count = 0;
  for (const segment of segmentsOf(points)) for (const other of avoid) if (segmentsCross(segment, other)) count++;
  return count;
};

/**
 * How many times two already-drawn polylines' segments cross each other.
 * `crossingsAgainst` (above) scores one new candidate against a flat list of
 * segments while picking a shape; this scores two finished routes against
 * each other, for a caller scoring a whole batch of routed edges against one
 * another — `view.ts`'s bounded rip-up-reroute pass and its nudge-safety
 * check (never let nudging increase an edge's own crossings).
 */
export const countRouteCrossings = (a: readonly RoutePoint[], b: readonly RoutePoint[]): number =>
  crossingsAgainst(a, segmentsOf(b));

/** How many of `avoid`'s segments the axis-aligned unit segment `a`-`b` would cross. */
const avoidCrossingsOfUnitSegment = (a: RoutePoint, b: RoutePoint, avoid: readonly RouteSegment[]): number => {
  if (avoid.length === 0) return 0;
  let count = 0;
  for (const other of avoid) if (segmentsCross([a, b], other)) count++;
  return count;
};

/**
 * The bounded grid fallback: coordinates compressed from the obstacles near
 * `start`/`end` plus a routing margin, searched with a bend-priced Dijkstra
 * that also prices crossing `avoid` (see `AVOID_CROSSING_PENALTY`). `null`
 * when the search space is empty (start and end coincide) or nothing reaches
 * the target, in which case the caller falls back to a plain L-shape.
 */
const gridRoute = (
  start: RoutePoint,
  end: RoutePoint,
  obstacles: readonly RouteBox[],
  margin: number,
  avoid: readonly RouteSegment[] = [],
): readonly RoutePoint[] | null => {
  const buffer = Math.max(margin * 4, 160);
  const seedLeft = Math.min(start.x, end.x) - buffer;
  const seedRight = Math.max(start.x, end.x) + buffer;
  const seedTop = Math.min(start.y, end.y) - buffer;
  const seedBottom = Math.max(start.y, end.y) + buffer;
  const seed = obstacles.filter(
    (box) => box.x < seedRight && box.x + box.width > seedLeft && box.y < seedBottom && box.y + box.height > seedTop,
  );
  // Grow the window to fully contain every obstacle it already found, so an
  // obstacle that is wider or taller than the seed window can never be
  // clamped into looking like it fills the window with no lane around it.
  const edgeBuffer = Math.max(margin, 40);
  const left = Math.min(seedLeft, ...seed.map((box) => box.x - edgeBuffer));
  const right = Math.max(seedRight, ...seed.map((box) => box.x + box.width + edgeBuffer));
  const top = Math.min(seedTop, ...seed.map((box) => box.y - edgeBuffer));
  const bottom = Math.max(seedBottom, ...seed.map((box) => box.y + box.height + edgeBuffer));
  const relevant = obstacles.filter(
    (box) => box.x < right && box.x + box.width > left && box.y < bottom && box.y + box.height > top,
  );
  if (relevant.length > 120) return null; // bail to the simple fallback rather than search an unbounded grid

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

  // Precompute which unit segments of the grid are clear, once each.
  const hClear: boolean[][] = Array.from({ length: width - 1 }, (_, xi) =>
    Array.from({ length: height }, (_, yi) => !horizontalBlocked(yList[yi]!, xList[xi]!, xList[xi + 1]!, relevant)),
  );
  const vClear: boolean[][] = Array.from({ length: width }, (_, xi) =>
    Array.from({ length: height - 1 }, (_, yi) => !verticalBlocked(xList[xi]!, yList[yi]!, yList[yi + 1]!, relevant)),
  );
  // Same shape as `hClear`/`vClear`, but counting `avoid` crossings per unit
  // segment instead of a hard obstacle block — priced into the search below,
  // not filtered out here, so a route that must cross still gets one.
  const hAvoid: number[][] = Array.from({ length: width - 1 }, (_, xi) =>
    Array.from({ length: height }, (_, yi) =>
      avoidCrossingsOfUnitSegment({ x: xList[xi]!, y: yList[yi]! }, { x: xList[xi + 1]!, y: yList[yi]! }, avoid),
    ),
  );
  const vAvoid: number[][] = Array.from({ length: width }, (_, xi) =>
    Array.from({ length: height - 1 }, (_, yi) =>
      avoidCrossingsOfUnitSegment({ x: xList[xi]!, y: yList[yi]! }, { x: xList[xi]!, y: yList[yi + 1]! }, avoid),
    ),
  );

  const encode = (xi: number, yi: number, dir: number): number => (xi * height + yi) * 3 + dir;
  const dist = new Float64Array(width * height * 3).fill(Number.POSITIVE_INFINITY);
  const prev = new Int32Array(width * height * 3).fill(-1);
  const startState = encode(startX, startY, NONE);
  dist[startState] = 0;
  const heap = new MinHeap();
  heap.push(0, startState);

  while (heap.size > 0) {
    const popped = heap.pop();
    if (popped === undefined) break;
    const { priority, value } = popped;
    if (priority > (dist[value] ?? Number.POSITIVE_INFINITY)) continue;
    const dir = value % 3;
    const cell = (value - dir) / 3;
    const yi = cell % height;
    const xi = (cell - yi) / height;
    if (xi === endX && yi === endY) break;
    const relax = (nextXi: number, nextYi: number, nextDir: number, step: number, avoidHits: number) => {
      const bend = dir !== NONE && dir !== nextDir ? BEND_PENALTY : 0;
      const next = encode(nextXi, nextYi, nextDir);
      const candidate = priority + step + bend + avoidHits * AVOID_CROSSING_PENALTY;
      if (candidate < (dist[next] ?? Number.POSITIVE_INFINITY)) {
        dist[next] = candidate;
        prev[next] = value;
        heap.push(candidate, next);
      }
    };
    if (xi > 0 && (vClear[xi - 1] === undefined ? false : true) && hClear[xi - 1]?.[yi])
      relax(xi - 1, yi, HORIZONTAL, xList[xi]! - xList[xi - 1]!, hAvoid[xi - 1]?.[yi] ?? 0);
    if (xi < width - 1 && hClear[xi]?.[yi])
      relax(xi + 1, yi, HORIZONTAL, xList[xi + 1]! - xList[xi]!, hAvoid[xi]?.[yi] ?? 0);
    if (yi > 0 && vClear[xi]?.[yi - 1])
      relax(xi, yi - 1, VERTICAL, yList[yi]! - yList[yi - 1]!, vAvoid[xi]?.[yi - 1] ?? 0);
    if (yi < height - 1 && vClear[xi]?.[yi])
      relax(xi, yi + 1, VERTICAL, yList[yi + 1]! - yList[yi]!, vAvoid[xi]?.[yi] ?? 0);
  }

  const reachable = [NONE, HORIZONTAL, VERTICAL]
    .map((dir) => encode(endX, endY, dir))
    .filter((state) => Number.isFinite(dist[state]));
  if (reachable.length === 0) return null;
  const best = reachable.reduce((a, b) => ((dist[a] ?? Infinity) <= (dist[b] ?? Infinity) ? a : b));

  const points: RoutePoint[] = [];
  let at: number | undefined = best;
  while (at !== undefined && at >= 0) {
    const dir = at % 3;
    const cell = (at - dir) / 3;
    const yi = cell % height;
    const xi = (cell - yi) / height;
    points.push({ x: xList[xi]!, y: yList[yi]! });
    const previousState: number = prev[at] ?? -1;
    at = previousState === -1 ? undefined : previousState;
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
 */
export const routeAroundObstacles = (
  start: RoutePoint,
  end: RoutePoint,
  obstacles: readonly RouteBox[],
  margin: number,
  avoid: readonly RouteSegment[] = [],
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

  return gridRoute(start, end, inflated, margin, avoid) ?? simplify([start, horizontalFirst, end]);
};
