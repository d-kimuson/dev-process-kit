import type { LayoutPoint } from '../../lib/layout/layered';
import type { RouteRect } from './route';

import { endFrame } from '../../lib/layout/path-steps';
import { END_MARKERS, markerZone } from '../base/edge/glyphs';

/**
 * Where each link's label chip goes.
 *
 * A chip sits on its own link — that is what ties the two together without a
 * leader line — and on nothing else: not on a card, another chip, an arrowhead
 * or a boundary title, and if it can be helped not on another link or a
 * boundary's border either. A link too short to stay readable under its chip
 * gets the chip beside it instead. Where one line has no room the label wraps
 * onto two, and only when that fails too is it shortened (its text ends in an
 * ellipsis) rather than laid over something. What a chip still lies on is
 * reported with it, so the router can give the link a lane with more room
 * (see `withFacingRoutes`). Pure: routes and what is already drawn in, one box per label out.
 */

export type LabelledRoute = {
  readonly id: string;
  readonly label: string;
  readonly points: readonly LayoutPoint[];
};

export type LabelObstacles = {
  readonly cards: readonly RouteRect[];
  /** Boundary titles. */
  readonly titles: readonly RouteRect[];
  /** Boundary frames: a chip keeps off their borders when it can. */
  readonly frames: readonly RouteRect[];
  /** Every drawn link, the labelled ones included. */
  readonly routes: readonly { readonly id: string; readonly points: readonly LayoutPoint[] }[];
};

/** Chip metrics, matching `.arch-link-chip` in `styles.ts`. */
export const LINK_CHIP = { height: 20, tallHeight: 34, maxWidth: 176, minWidth: 48, padding: 9, fontSize: 11 } as const;
/** Widths of a shortened chip, as a share of the label's full width, tried in turn until one fits. */
const SHORTENED = [0.75, 0.55, 0.4] as const;

/**
 * The arrowhead a chip keeps off, taken from the glyph the board draws. The
 * old constant here was 12 long and 6 half-wide; the inline `END_MARKERS.arrow`
 * is 10 long and 4.5 half-wide, so the reserved box now matches what is drawn.
 */
const ARROW = { length: END_MARKERS.arrow.reach, half: END_MARKERS.arrow.halfWidth } as const;
/** Gap between a link and a chip set beside it: clear of the arrowhead's width. */
const BESIDE_GAP = 7;
const STEP = 12;
/** Share of a link a chip may cover before it is moved beside the link. */
const COVER_LIMIT = 0.4;

const isWide = (char: string): boolean => (char.codePointAt(0) ?? 0) >= 0x2e80;

/** The width a run of text takes at `wide` px per full-width glyph and `narrow` px per Latin one. */
export const estimatedTextWidth = (text: string, wide: number, narrow: number): number => {
  let width = 0;
  for (const char of text) width += isWide(char) ? wide : narrow;
  return width;
};

/** Advance of a glyph in the UI's proportional face, as a share of the font size. */
const advanceOf = (char: string): number => {
  if (isWide(char)) return 1.03;
  if (/[mwMW@%]/.test(char)) return 0.92;
  if (/[A-Z0-9]/.test(char)) return 0.72;
  if (/[iljtfr\s.,:;!'|/()[\]-]/.test(char)) return 0.38;
  return 0.6;
};

const labelWidth = (label: string): number => {
  let width = 0;
  for (const char of label) width += advanceOf(char) * LINK_CHIP.fontSize;
  return width;
};

const chipWidth = (text: number): number => Math.ceil(text) + LINK_CHIP.padding * 2 + 2;

export const linkChipWidth = (label: string): number => Math.min(LINK_CHIP.maxWidth, chipWidth(labelWidth(label)));

/** The chip sizes to try for `label`, best first: one line, two lines, then one line cut short. */
const chipSizes = (label: string): readonly { readonly width: number; readonly height: number }[] => {
  const full = linkChipWidth(label);
  const least = Math.min(full, LINK_CHIP.minWidth);
  // Lines break between any two glyphs, so the first takes a little over half.
  const wrapped = chipWidth(labelWidth(label) * 0.55 + LINK_CHIP.fontSize);
  return [
    { width: full, height: LINK_CHIP.height },
    ...(wrapped < full ? [{ width: Math.max(least, wrapped), height: LINK_CHIP.tallHeight }] : []),
    ...SHORTENED.map((share) => ({ width: Math.max(least, Math.round(full * share)), height: LINK_CHIP.height })),
  ];
};

const overlaps = (a: RouteRect, b: RouteRect): boolean =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

const inflate = (box: RouteRect, by: number): RouteRect => ({
  x: box.x - by,
  y: box.y - by,
  width: box.width + by * 2,
  height: box.height + by * 2,
});

const contains = (outer: RouteRect, inner: RouteRect): boolean =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.width <= outer.x + outer.width &&
  inner.y + inner.height <= outer.y + outer.height;

const lengthOf = (points: readonly LayoutPoint[]): number =>
  points.slice(1).reduce((sum, point, index) => {
    const previous = points[index]!;
    return sum + Math.abs(point.x - previous.x) + Math.abs(point.y - previous.y);
  }, 0);

/** The box an arrowhead covers at the end of `points`, from the glyph's own zone. */
const arrowBox = (points: readonly LayoutPoint[]): RouteRect | null => {
  if (points.length < 2) return null;
  return markerZone(END_MARKERS.arrow, endFrame(points, 'end'));
};

/** How much of the segment `a`–`b` lies under `box`. */
const covered = (a: LayoutPoint, b: LayoutPoint, box: RouteRect): number => {
  if (a.y === b.y) {
    if (a.y <= box.y || a.y >= box.y + box.height) return 0;
    return Math.max(0, Math.min(Math.max(a.x, b.x), box.x + box.width) - Math.max(Math.min(a.x, b.x), box.x));
  }
  if (a.x <= box.x || a.x >= box.x + box.width) return 0;
  return Math.max(0, Math.min(Math.max(a.y, b.y), box.y + box.height) - Math.max(Math.min(a.y, b.y), box.y));
};

const coveredLength = (points: readonly LayoutPoint[], box: RouteRect): number =>
  points.slice(1).reduce((sum, point, index) => sum + covered(points[index]!, point, box), 0);

type Candidate = {
  readonly box: RouteRect;
  readonly beside: boolean;
  readonly along: number;
  /** How far the chip's centre is from its link, for a chip on the link. */
  readonly offset: number;
};

/** Every place worth trying for a chip of `width` × `height` on `points`: on each run, and beside it. */
const candidatesOf = (points: readonly LayoutPoint[], width: number, height: number): readonly Candidate[] => {
  const out: Candidate[] = [];
  let walked = 0;
  points.slice(1).forEach((to, index) => {
    const from = points[index]!;
    const length = Math.abs(to.x - from.x) + Math.abs(to.y - from.y);
    const horizontal = from.y === to.y;
    const direction = horizontal ? Math.sign(to.x - from.x) : Math.sign(to.y - from.y);
    const extent = (horizontal ? width : height) / 2;
    const first = index === 0 ? 4 : 0;
    const last = index === points.length - 2 ? ARROW.length + 2 : 0;
    const offsets: number[] = [];
    for (let at = extent + first; at <= length - extent - last; at += STEP) offsets.push(at);
    if (offsets.length === 0 && length >= first + last + STEP) offsets.push((length + first - last) / 2);
    // Beside the link a chip clears the arrowhead, so the middle of a short run is open to it too.
    const besideOnly = offsets.includes(length / 2) ? [] : [length / 2];
    for (const at of [...offsets, ...besideOnly]) {
      const onLine = !besideOnly.includes(at);
      const centre = horizontal ? { x: from.x + direction * at, y: from.y } : { x: from.x, y: from.y + direction * at };
      const along = walked + at;
      const boxAt = (dx: number, dy: number): RouteRect => ({
        x: centre.x + dx - width / 2,
        y: centre.y + dy - height / 2,
        width,
        height,
      });
      if (horizontal) {
        if (onLine) out.push({ box: boxAt(0, 0), beside: false, along, offset: 0 });
        for (const dy of [-(height / 2 + BESIDE_GAP), height / 2 + BESIDE_GAP]) {
          out.push({ box: boxAt(0, dy), beside: true, along, offset: 0 });
        }
      } else {
        for (let dx = 0; onLine && dx <= width / 2 - 8; dx += STEP) {
          out.push({ box: boxAt(dx, 0), beside: false, along, offset: dx });
          if (dx > 0) out.push({ box: boxAt(-dx, 0), beside: false, along, offset: dx });
        }
        for (const dx of [width / 2 + BESIDE_GAP, -(width / 2 + BESIDE_GAP)]) {
          out.push({ box: boxAt(dx, 0), beside: true, along, offset: 0 });
        }
      }
    }
    walked += length;
  });
  return out;
};

/** A placed chip and what it could not keep off. */
export type PlacedLabel = {
  readonly box: RouteRect;
  /** The other links running under the chip. */
  readonly crossing: readonly string[];
  /** How many boundary borders the chip lies across. */
  readonly borders: number;
  /** Whether the chip lies on a card, a title, an arrowhead or another chip. */
  readonly covering: boolean;
};

/** Costs of what a chip gives up, compared when choosing among its places. */
const PENALTY = {
  covering: 1000,
  hidden: 200,
  crossing: 120,
  border: 80,
  shortened: 150,
  wrapped: 20,
  beside: 30,
} as const;

/** Each labelled route's chip, with what the chip overlaps, keyed by link id. */
export const rateLinkLabels = (
  labelled: readonly LabelledRoute[],
  obstacles: LabelObstacles,
): ReadonlyMap<string, PlacedLabel> => {
  const placed = new Map<string, PlacedLabel>();
  const arrows = obstacles.routes.flatMap((route) => {
    const box = arrowBox(route.points);
    return box === null ? [] : [box];
  });
  const solid = [
    ...obstacles.cards.map((card) => inflate(card, 4)),
    ...obstacles.titles.map((title) => inflate(title, 3)),
    ...arrows.map((arrow) => inflate(arrow, 1)),
  ];
  const order = [...labelled]
    .filter((route) => route.points.length >= 2)
    .sort((a, b) => lengthOf(a.points) - lengthOf(b.points) || a.id.localeCompare(b.id));
  for (const route of order) {
    const total = lengthOf(route.points);
    const others = obstacles.routes.filter((other) => other.id !== route.id);
    const chips = [...placed.values()].map((chip) => inflate(chip.box, 4));
    let best: (PlacedLabel & { readonly score: number }) | null = null;
    chipSizes(route.label).forEach(({ width, height }, size) => {
      // A smaller chip is worth trying only while the best place so far still lies on something.
      if (best !== null && best.score < PENALTY.border) return;
      const sized = size === 0 ? 0 : height > LINK_CHIP.height ? PENALTY.wrapped : PENALTY.shortened + size;
      for (const candidate of candidatesOf(route.points, width, height)) {
        const { box } = candidate;
        const covering = [...solid, ...chips].some((obstacle) => overlaps(box, obstacle));
        const crossing = others
          .filter((other) => coveredLength(other.points, inflate(box, 3)) > 0)
          .map((other) => other.id);
        const clear = inflate(box, 2);
        const borders = obstacles.frames.filter((frame) => overlaps(clear, frame) && !contains(frame, clear)).length;
        // Two cards a boundary apart may leave no room clear of both borders: the chip then stays mid-link.
        const hidden = candidate.beside ? 0 : coveredLength(route.points, box) / total;
        const score =
          sized +
          (covering ? PENALTY.covering : 0) +
          crossing.length * PENALTY.crossing +
          (borders > 0 ? PENALTY.border : 0) +
          (hidden > COVER_LIMIT ? PENALTY.hidden : 0) +
          (candidate.beside ? PENALTY.beside : 0) +
          candidate.offset * 0.3 +
          (Math.abs(candidate.along - total / 2) / total) * 10;
        if (best === null || score < best.score) best = { box, crossing, borders, covering, score };
      }
    });
    if (best !== null) placed.set(route.id, best);
  }
  return placed;
};

/** One chip box per labelled route, keyed by link id. */
export const placeLinkLabels = (
  labelled: readonly LabelledRoute[],
  obstacles: LabelObstacles,
): ReadonlyMap<string, RouteRect> =>
  new Map([...rateLinkLabels(labelled, obstacles)].map(([id, label]) => [id, label.box] as const));

/** Boundary title metrics, matching `.arch-boundary-title` in `styles.ts`. */
export const BOUNDARY_TITLE = { height: 22, inset: 14, padding: 9, wide: 11.8, narrow: 7.4 } as const;

/** The box a boundary's title takes: a legend sitting on the frame's top border. */
export const boundaryTitleBox = (frame: RouteRect, label: string): RouteRect => ({
  x: frame.x + BOUNDARY_TITLE.inset,
  y: frame.y - BOUNDARY_TITLE.height / 2,
  width: Math.max(
    0,
    Math.min(
      frame.width - BOUNDARY_TITLE.inset * 2,
      Math.ceil(estimatedTextWidth(label, BOUNDARY_TITLE.wide, BOUNDARY_TITLE.narrow)) + BOUNDARY_TITLE.padding * 2 + 2,
    ),
  ),
  height: BOUNDARY_TITLE.height,
});
