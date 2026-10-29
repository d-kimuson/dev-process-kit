import type { LayoutPoint, LayoutResult, PlacedNode } from '../../lib/layout/layered';

import { routeAroundObstacles, type RouteBox, type RouteSegment } from '../../lib/layout/orthogonal-router';
import { facingPortSide, staggeredEdgePorts, type PortSide } from '../../lib/layout/ports';
import { nudgeParallelRoutes, type NudgeInput } from '../../lib/layout/route-nudge';

/**
 * Links of a hand-placed map. The shared fixed layout routes as if every card
 * sat in one row (out on the right, in on the left), so a link between stacked
 * cards loops through them. Here a link leaves and enters by the sides that
 * face each other, and — unlike the one-elbow rule this replaced — it is routed
 * around the cards that are in the way.
 *
 * Three things decide where a link is drawn:
 *
 * 1. **The sides that face each other**, so the flow still reads left to right:
 *    cards that do not overlap horizontally join right-to-left, cards that do
 *    join top-to-bottom.
 * 2. **One port per link** on that side (`lib/layout/ports.ts`), so two links
 *    leaving one card are not drawn on top of each other.
 * 3. **The obstacle-aware router** (`lib/layout/orthogonal-router.ts`), with
 *    every other card as an obstacle and the link's own two cards as boxes it
 *    must not enter, so `A → C` with `B` between them bends around `B` instead
 *    of running through it.
 *
 * Afterwards `nudgeParallelRoutes` pulls apart any interior runs that still
 * coincide, without moving a port. Pure: placed cards and the link list in,
 * routes out.
 */

export type LinkRouteEdge = { readonly id: string; readonly from: string; readonly to: string };

export type LinkRouteOptions = {
  /** Clearance kept around a card the link routes past. */
  readonly margin?: number;
  /** Gap between two links' ports on one card side. */
  readonly portGap?: number;
};

const DEFAULTS = { margin: 16, portGap: 16 } as const;
/** Distance kept from a card's corners by a port. */
const PORT_INSET = 12;
/** Straight run kept out of a port before the link's first bend, so the arrowhead sits on a straight tail. */
const PORT_ESCAPE = 16;
/** Rough label metrics: a CJK glyph is about one em at the label's 9.5px, Latin a little over half. */
const LABEL_HEIGHT = 11;

type Config = Required<LinkRouteOptions>;

const boxOf = (node: PlacedNode): RouteBox => ({ x: node.x, y: node.y, width: node.width, height: node.height });

/** Whether any segment of `points` runs through the open interior of any of `boxes`. */
const runsThrough = (points: readonly LayoutPoint[], boxes: readonly RouteBox[]): boolean =>
  points.slice(1).some((next, index) => {
    const previous = points[index];
    if (previous === undefined) return false;
    const left = Math.min(previous.x, next.x);
    const right = Math.max(previous.x, next.x);
    const top = Math.min(previous.y, next.y);
    const bottom = Math.max(previous.y, next.y);
    return boxes.some((box) =>
      previous.x === next.x
        ? previous.x > box.x && previous.x < box.x + box.width && top < box.y + box.height && bottom > box.y
        : previous.y > box.y && previous.y < box.y + box.height && left < box.x + box.width && right > box.x,
    );
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

/**
 * The two sides a link between `from` and `to` should use, or `null` when the
 * cards overlap on both axes and no pair of sides faces the other.
 *
 * Cards that are side by side join horizontally even when they are also offset
 * vertically, so a left-to-right flow keeps reading left to right; only cards
 * that share a column join top to bottom.
 */
export const facingLinkSides = (
  from: PlacedNode,
  to: PlacedNode,
): { readonly from: PortSide; readonly to: PortSide } | null => {
  if (to.x >= from.x + from.width) return { from: 'right', to: 'left' };
  if (from.x >= to.x + to.width) return { from: 'left', to: 'right' };
  if (to.y >= from.y + from.height) return { from: 'bottom', to: 'top' };
  if (from.y >= to.y + to.height) return { from: 'top', to: 'bottom' };
  return null;
};

/**
 * The point a link's label goes to: inside one of the route's runs, never on a
 * corner and never on the arrowhead, and never on top of a card.
 *
 * The route's own preferred point (`routeLabelPoint`) is tried first; a route
 * that runs past a card falls back to the middle of its longest clear run. The
 * previous placement used `points[floor(length / 2)]`, which is a corner for
 * every route with an even number of points — exactly where the elbow and the
 * arrowhead are.
 */
export const linkLabelPoint = (
  points: readonly LayoutPoint[],
  cards: readonly RouteBox[],
  label: string,
): LayoutPoint => {
  const first = points[0];
  const last = points.at(-1);
  if (first === undefined || last === undefined) return { x: 0, y: 0 };
  if (points.length <= 2) return { x: (first.x + last.x) / 2, y: (first.y + last.y) / 2 };
  const width = estimatedLabelWidth(label);
  const boxAt = (point: LayoutPoint): RouteBox => ({
    x: point.x,
    y: point.y - 6 - LABEL_HEIGHT + 2,
    width,
    height: LABEL_HEIGHT,
  });
  const clear = (point: LayoutPoint): boolean => {
    const box = boxAt(point);
    return !cards.some(
      (card) =>
        box.x < card.x + card.width &&
        card.x < box.x + box.width &&
        box.y < card.y + card.height &&
        card.y < box.y + box.height,
    );
  };
  const preferred =
    points.length === 4
      ? { x: (points[1]!.x + points[2]!.x) / 2, y: (points[1]!.y + points[2]!.y) / 2 }
      : midpointOfLongestRun(points);
  if (clear(preferred)) return preferred;
  const runs = points
    .slice(1)
    .map((next, index) => {
      const previous = points[index]!;
      return {
        point: { x: (previous.x + next.x) / 2, y: (previous.y + next.y) / 2 },
        length: Math.abs(next.x - previous.x) + Math.abs(next.y - previous.y),
      };
    })
    .sort((a, b) => b.length - a.length);
  return runs.find((run) => clear(run.point))?.point ?? preferred;
};

const midpointOfLongestRun = (points: readonly LayoutPoint[]): LayoutPoint => {
  let best = { point: { x: points[0]!.x, y: points[0]!.y }, length: -1 };
  for (let index = 0; index + 1 < points.length; index++) {
    const a = points[index]!;
    const b = points[index + 1]!;
    const length = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
    if (length > best.length) best = { point: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, length };
  }
  return best.point;
};

const estimatedLabelWidth = (text: string): number => {
  let width = 0;
  for (const char of text) width += (char.codePointAt(0) ?? 0) >= 0x2e80 ? 10 : 5.6;
  return Math.ceil(width + 4);
};

/**
 * Replaces the layout's routes with obstacle-aware ones between facing sides.
 * A link whose cards overlap (no pair of sides faces the other) keeps the
 * layout's own route, as does a routed link that would cut a card the layout's
 * route does not.
 */
export const withFacingRoutes = (
  placement: LayoutResult,
  links: readonly LinkRouteEdge[],
  options: LinkRouteOptions = {},
): LayoutResult => {
  const config: Config = { ...DEFAULTS, ...options };
  const byId = new Map(placement.nodes.map((node) => [node.id, node]));
  const usable = links.filter((link) => byId.has(link.from) && byId.has(link.to));
  if (usable.length === 0) return placement;
  const boxById = new Map(placement.nodes.map((node) => [node.id, boxOf(node)] as const));
  const ports = staggeredEdgePorts(placement.nodes, usable, {
    inset: PORT_INSET,
    gap: config.portGap,
    // Facing sides decide the pair; the fan needs to know which end it is
    // asking about, hence the look-up by the edge's own direction.
    sideOf: ({ node, other, edge, end }) => {
      const from = byId.get(edge.from);
      const to = byId.get(edge.to);
      const sides = from !== undefined && to !== undefined ? facingLinkSides(from, to) : null;
      if (sides === null) return facingPortSide(node, other);
      return end === 'from' ? sides.from : sides.to;
    },
  });
  const original = new Map(placement.routes.map((route) => [route.id, route.points] as const));

  const span = (link: LinkRouteEdge): number => {
    const from = byId.get(link.from);
    const to = byId.get(link.to);
    if (from === undefined || to === undefined) return 0;
    return Math.abs(to.x - from.x) + Math.abs(to.y - from.y);
  };
  const order = [...usable].sort((a, b) => span(a) - span(b) || a.id.localeCompare(b.id));

  const avoid: RouteSegment[] = [];
  const routed = new Map<string, readonly LayoutPoint[]>();
  for (const link of order) {
    const from = byId.get(link.from);
    const to = byId.get(link.to);
    const ends = ports.get(link.id);
    const previous = original.get(link.id) ?? [];
    const sides = from !== undefined && to !== undefined ? facingLinkSides(from, to) : null;
    if (from === undefined || to === undefined || ends === undefined || sides === null || from.id === to.id) {
      routed.set(link.id, previous);
      avoid.push(...segmentsOf(previous));
      continue;
    }
    const own = [boxById.get(from.id)!, boxById.get(to.id)!];
    const others = placement.nodes.filter((node) => node.id !== from.id && node.id !== to.id).map(boxOf);
    const startNormal = outward(ends.from.side);
    const endNormal = outward(ends.to.side);
    const middle = routeAroundObstacles(
      { x: ends.from.point.x + startNormal.x * PORT_ESCAPE, y: ends.from.point.y + startNormal.y * PORT_ESCAPE },
      { x: ends.to.point.x + endNormal.x * PORT_ESCAPE, y: ends.to.point.y + endNormal.y * PORT_ESCAPE },
      others,
      config.margin,
      avoid,
      [...own, ...others],
      own,
    );
    const candidate = simplify([ends.from.point, ...middle, ends.to.point]);
    const chosen = runsThrough(candidate, others) && !runsThrough(previous, others) ? previous : candidate;
    routed.set(link.id, chosen);
    avoid.push(...segmentsOf(chosen));
  }

  const inputs: NudgeInput[] = usable.map((link) => {
    const from = byId.get(link.from);
    const to = byId.get(link.to);
    const own = from !== undefined && to !== undefined ? [boxById.get(from.id)!, boxById.get(to.id)!] : [];
    return {
      id: link.id,
      points: routed.get(link.id) ?? [],
      obstacles: placement.nodes.filter((node) => node.id !== link.from && node.id !== link.to).map(boxOf),
      ownFrames: own,
    };
  });
  const nudged = nudgeParallelRoutes(inputs, { minPortRun: 0 });

  const routes = usable.map((link) => ({ id: link.id, points: nudged.get(link.id) ?? routed.get(link.id) ?? [] }));
  const drawn = [
    ...routes.flatMap((route) => route.points),
    ...placement.nodes.map((node) => ({ x: node.x + node.width, y: node.y + node.height })),
  ];
  return {
    ...placement,
    width: Math.max(placement.width, ...drawn.map((point) => point.x)),
    height: Math.max(placement.height, ...drawn.map((point) => point.y)),
    routes: [...placement.routes.filter((route) => !usable.some((link) => link.id === route.id)), ...routes],
  };
};
