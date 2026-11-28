import type { LayoutPoint } from './layered';

/**
 * Placing an edge's label along its own route.
 *
 * Each label takes the spot that covers no node, no other label, no end zone
 * (an arrowhead, a glyph) and no other line — preferring a spot *on* its own
 * line, where the chip reads as `----(label)---->`, and only falling back to
 * sitting beside it when the line has no room.
 *
 * Pure: routes, boxes and label sizes in, label centres out, so a router and a
 * test can place labels from exactly the geometry that will be drawn.
 */

/** An axis-aligned box in route coordinates; a state, a frame, or an end zone. */
export type LabelBox = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

/** One label to place: its route and the size of its chip. */
export type EdgeLabelRequest = {
  readonly id: string;
  readonly points: readonly LayoutPoint[];
  readonly size: { readonly width: number; readonly height: number };
  /** Higher places first, so what has the fewest spots to choose from picks before the rest. Defaults to 0. */
  readonly priority?: number;
};

/** What a label must avoid, and the lines it may sit on. */
export type EdgeLabelWorld = {
  /** Nodes and frames a label may not cover. */
  readonly boxes: readonly LabelBox[];
  /** End zones (arrowheads, glyphs) a label may not cover. */
  readonly zones: readonly LabelBox[];
  /** Every route the labels' own lines may cross, keyed the same way as `EdgeLabelRequest.id`. */
  readonly lines: ReadonlyMap<string, readonly LayoutPoint[]>;
};

export type EdgeLabelOptions = {
  /** Gap between a label and the line it sits beside. Defaults to 7. */
  readonly offset?: number;
  /** Line left visible on each side of a label that sits on its own line. Defaults to 14. */
  readonly lineKeep?: number;
  /** Room kept at the route's far end for its end zone, before an on-line label. Defaults to 12. */
  readonly endKeep?: number;
  /** A run shorter than this offers no spot: a label on it would read as sitting on the corner. Defaults to 12. */
  readonly minRun?: number;
  /** Where along a run to try, as a fraction from its kept start to its kept end. Defaults to a middle-out spread. */
  readonly ratios?: readonly number[];
};

/** A placed label: its centre, and whether it sits on its own line (`----(label)---->`) or beside it. */
export type EdgeLabelPlacement = { readonly center: LayoutPoint; readonly onLine: boolean };

const DEFAULT_OFFSET = 7;
const DEFAULT_LINE_KEEP = 14;
const DEFAULT_END_KEEP = 12;
const DEFAULT_MIN_RUN = 12;
const DEFAULT_RATIOS = [0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8, 0.1, 0.9, 0, 1] as const;

/** Nothing is placed closer to the canvas origin than this. */
const CANVAS_MIN = 4;
/** Clearance a label keeps from a node or frame. */
const BOX_MARGIN = 3;
/** Clearance a label keeps from another label. */
const LABEL_MARGIN = 4;
/** Clearance a label keeps from a line it is not sitting on. */
const LINE_MARGIN = 2;
/** A cost high enough that any penalty outweighs every positional preference. */
const PENALTY = 2000;

type Rect = { readonly left: number; readonly top: number; readonly right: number; readonly bottom: number };

type Segment = {
  readonly edge: string;
  readonly horizontal: boolean;
  readonly at: number;
  readonly lo: number;
  readonly hi: number;
};

/** A candidate spot: the centre, the run it sits on (or -1 when beside the line), and its positional cost. */
type Candidate = { readonly center: LayoutPoint; readonly host: number; readonly cost: number };

const rectAround = (center: LayoutPoint, width: number, height: number): Rect => ({
  left: center.x - width / 2,
  top: center.y - height / 2,
  right: center.x + width / 2,
  bottom: center.y + height / 2,
});

const rectsOverlap = (a: Rect, b: Rect, margin: number): boolean =>
  a.left < b.right + margin && a.right > b.left - margin && a.top < b.bottom + margin && a.bottom > b.top - margin;

const boxRect = (box: LabelBox): Rect => ({
  left: box.x,
  top: box.y,
  right: box.x + box.width,
  bottom: box.y + box.height,
});

const segmentInRect = (segment: Segment, rect: Rect, margin: number): boolean =>
  segment.horizontal
    ? segment.at > rect.top - margin &&
      segment.at < rect.bottom + margin &&
      segment.hi > rect.left - margin &&
      segment.lo < rect.right + margin
    : segment.at > rect.left - margin &&
      segment.at < rect.right + margin &&
      segment.hi > rect.top - margin &&
      segment.lo < rect.bottom + margin;

const segmentsOf = (edge: string, points: readonly LayoutPoint[]): Segment[] => {
  const out: Segment[] = [];
  for (let index = 0; index + 1 < points.length; index++) {
    const a = points[index]!;
    const b = points[index + 1]!;
    if (a.y === b.y) out.push({ edge, horizontal: true, at: a.y, lo: Math.min(a.x, b.x), hi: Math.max(a.x, b.x) });
    else out.push({ edge, horizontal: false, at: a.x, lo: Math.min(a.y, b.y), hi: Math.max(a.y, b.y) });
  }
  return out;
};

const routeLength = (points: readonly LayoutPoint[]): number => {
  let total = 0;
  for (let index = 0; index + 1 < points.length; index++)
    total += Math.abs(points[index + 1]!.x - points[index]!.x) + Math.abs(points[index + 1]!.y - points[index]!.y);
  return total;
};

/** Every spot on `points` a label of `width`×`height` could take, cheapest-first by position. */
const candidatesFor = (
  points: readonly LayoutPoint[],
  width: number,
  height: number,
  options: Required<EdgeLabelOptions>,
): Candidate[] => {
  const out: Candidate[] = [];
  const lengths = points
    .slice(1)
    .map((point, index) => Math.abs(point.x - points[index]!.x) + Math.abs(point.y - points[index]!.y));
  const longest = Math.max(0, ...lengths);
  const total = lengths.reduce((sum, length) => sum + length, 0);
  let travelled = 0;
  for (let index = 0; index + 1 < points.length; index++) {
    const a = points[index]!;
    const b = points[index + 1]!;
    const length = lengths[index]!;
    const before = travelled;
    travelled += length;
    if (length < options.minRun) continue;
    const horizontal = a.y === b.y;
    const last = index + 2 === points.length;
    const base = (longest - length) * 0.04;
    /** Spots along the run, each a distance from `a`; the nearer the route's own middle, the cheaper. */
    const along = (keepStart: number, keepEnd: number): { readonly at: number; readonly cost: number }[] => {
      const to = length - keepEnd;
      if (keepStart > to) return [];
      return options.ratios.map((ratio) => {
        const at = keepStart + (to - keepStart) * ratio;
        return { at, cost: Math.abs(before + at - total / 2) * 0.03 };
      });
    };
    const pointAt = (at: number): LayoutPoint =>
      horizontal ? { x: a.x + Math.sign(b.x - a.x) * at, y: a.y } : { x: a.x, y: a.y + Math.sign(b.y - a.y) * at };
    const extent = (horizontal ? width : height) / 2 + options.lineKeep;
    for (const spot of along(extent, extent + (last ? options.endKeep : 0)))
      out.push({ center: pointAt(spot.at), host: index, cost: base + spot.cost });
    const inset = Math.min(length / 2, 8);
    const offset = (horizontal ? height : width) / 2 + options.offset;
    // Past either end of the run too, by up to half the label: a short run still gets a caption that touches it.
    const overhang = Math.max(0, (horizontal ? width : height) / 2 - inset);
    const beside = [
      ...along(inset, inset),
      { at: -overhang, cost: Math.abs(before - total / 2) * 0.03 + 4 },
      { at: length + overhang, cost: Math.abs(before + length - total / 2) * 0.03 + 4 },
    ];
    for (const spot of beside) {
      const on = pointAt(spot.at);
      // Above a horizontal run and right of a vertical one first: where a reader looks for a caption.
      out.push(
        {
          center: horizontal ? { x: on.x, y: on.y - offset } : { x: on.x + offset, y: on.y },
          host: -1,
          cost: base + spot.cost + 6,
        },
        {
          center: horizontal ? { x: on.x, y: on.y + offset } : { x: on.x - offset, y: on.y },
          host: -1,
          cost: base + spot.cost + 10,
        },
      );
    }
  }
  return out;
};

/**
 * Each label's centre along its own route: the cheapest spot that covers no
 * box, no end zone, no other label and no other line, preferring a spot on the
 * line itself. A label whose route is too short to offer any spot falls back to
 * its route's middle point.
 *
 * Labels are placed highest `priority` first, then shortest route first, so the
 * labels with the fewest spots to choose from choose before the rest.
 */
export const placeEdgeLabels = (
  requests: readonly EdgeLabelRequest[],
  world: EdgeLabelWorld,
  options: EdgeLabelOptions = {},
): ReadonlyMap<string, EdgeLabelPlacement> => {
  const settings: Required<EdgeLabelOptions> = {
    offset: options.offset ?? DEFAULT_OFFSET,
    lineKeep: options.lineKeep ?? DEFAULT_LINE_KEEP,
    endKeep: options.endKeep ?? DEFAULT_END_KEEP,
    minRun: options.minRun ?? DEFAULT_MIN_RUN,
    ratios: options.ratios ?? DEFAULT_RATIOS,
  };
  const segments = new Map<string, Segment[]>();
  for (const [id, points] of world.lines) segments.set(id, segmentsOf(id, points));
  const boxRects = world.boxes.map(boxRect);
  const zoneRects = world.zones.map(boxRect);

  const ordered = requests
    .filter((request) => request.points.length >= 2)
    .sort(
      (p, q) =>
        (q.priority ?? 0) - (p.priority ?? 0) ||
        routeLength(p.points) - routeLength(q.points) ||
        (p.id < q.id ? -1 : p.id > q.id ? 1 : 0),
    );

  const placedRects: Rect[] = [];
  const placements = new Map<string, EdgeLabelPlacement>();
  for (const request of ordered) {
    const { points, size } = request;
    let best: Candidate | null = null;
    let bestCost = Number.POSITIVE_INFINITY;
    for (const candidate of candidatesFor(points, size.width, size.height, settings)) {
      const rect = rectAround(candidate.center, size.width, size.height);
      let cost = candidate.cost;
      if (rect.left < CANVAS_MIN || rect.top < CANVAS_MIN) cost += PENALTY;
      for (const box of boxRects) if (rectsOverlap(rect, box, BOX_MARGIN)) cost += PENALTY;
      for (const other of placedRects) if (rectsOverlap(rect, other, LABEL_MARGIN)) cost += PENALTY;
      for (const zone of zoneRects) if (rectsOverlap(rect, zone, 0)) cost += 1500;
      for (const [id, list] of segments) {
        for (const [index, segment] of list.entries()) {
          if (id === request.id && index === candidate.host) continue;
          if (segmentInRect(segment, rect, LINE_MARGIN)) cost += id === request.id ? 200 : 600;
        }
      }
      if (cost < bestCost) {
        bestCost = cost;
        best = candidate;
      }
    }
    const center = best?.center ?? points[Math.floor(points.length / 2)]!;
    placements.set(request.id, {
      center: { x: Math.round(center.x), y: Math.round(center.y) },
      onLine: best !== null && best.host !== -1,
    });
    placedRects.push(rectAround(center, size.width, size.height));
  }
  return placements;
};
