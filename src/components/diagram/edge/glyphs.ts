import type { LabelBox } from '../../../lib/layout/edge-labels';
import type { LayoutPoint } from '../../../lib/layout/layered';
import type { EndFrame } from '../../../lib/layout/path-steps';

/**
 * The glyph at the end of a line: an arrowhead, a hollow arrow, a circle, a
 * diamond, a slash, or a board's own form (a crow's foot). Drawn inline as
 * shapes rather than as an SVG `<marker>`, so it takes the line's own colour
 * from one custom property and a board can build one from its own geometry.
 *
 * A glyph is laid out from an `EndFrame` — the tip and the unit vector into the
 * line — so it works on a line running in any direction, never assuming the
 * line runs left to right.
 */

/** How a closed shape's interior is painted. `line` fills it with the line's colour, `paper` with the paper behind it, `none` leaves it hollow. */
export type GlyphPaint = 'none' | 'line' | 'paper';

export type GlyphShape =
  | { readonly kind: 'segment'; readonly a: LayoutPoint; readonly b: LayoutPoint }
  | { readonly kind: 'circle'; readonly center: LayoutPoint; readonly r: number; readonly paint: GlyphPaint }
  | { readonly kind: 'polygon'; readonly points: readonly LayoutPoint[]; readonly paint: GlyphPaint }
  | { readonly kind: 'polyline'; readonly points: readonly LayoutPoint[]; readonly paint: GlyphPaint };

/**
 * A named end marker: the geometry it draws, how far it reaches from the tip,
 * how much of the line's own run it needs kept straight underneath it (`trim`),
 * and its half-width, so a router or a label placer can keep clear of it.
 */
export type EndMarker = {
  readonly name: string;
  /** Furthest drawn part's distance from the tip, along the line. */
  readonly reach: number;
  /** Straight run the stroke must keep under the glyph, measured back from the tip. */
  readonly trim: number;
  /** Half the glyph's extent across the line. */
  readonly halfWidth: number;
  readonly shapes: (frame: EndFrame) => readonly GlyphShape[];
};

const round = (value: number): number => Math.round(value * 100) / 100 || 0;

/** A point at `along` into the line and `across` to its side, from `frame`. */
const at = (frame: EndFrame, along: number, across = 0): LayoutPoint => {
  const normal = { x: -frame.inward.y, y: frame.inward.x };
  return {
    x: round(frame.tip.x + frame.inward.x * along + normal.x * across),
    y: round(frame.tip.y + frame.inward.y * along + normal.y * across),
  };
};

/** Build a marker from its geometry, deriving `reach` from the furthest shape point along the line. */
const marker = (spec: Omit<EndMarker, 'reach'> & { readonly length: number }): EndMarker => {
  const { length, ...rest } = spec;
  return { ...rest, reach: length };
};

/** arrow: a filled triangle pointing at the tip, the line stopping at its base. */
const ARROW_LENGTH = 10;
const ARROW_HALF = 4.5;
export const arrow = marker({
  name: 'arrow',
  length: ARROW_LENGTH,
  trim: 1,
  halfWidth: ARROW_HALF,
  shapes: (frame) => [
    {
      kind: 'polygon',
      paint: 'line',
      points: [at(frame, 0), at(frame, ARROW_LENGTH, ARROW_HALF), at(frame, ARROW_LENGTH, -ARROW_HALF)],
    },
  ],
});

/** openArrow: two strokes forming a `>`, the line running right to the tip. */
const OPEN_LENGTH = 10;
const OPEN_HALF = 4.5;
export const openArrow = marker({
  name: 'openArrow',
  length: OPEN_LENGTH,
  trim: 0,
  halfWidth: OPEN_HALF,
  shapes: (frame) => [
    {
      kind: 'polyline',
      paint: 'none',
      points: [at(frame, OPEN_LENGTH, OPEN_HALF), at(frame, 0), at(frame, OPEN_LENGTH, -OPEN_HALF)],
    },
  ],
});

/** hollowArrow: a triangle drawn as an outline, its interior the paper behind the line. */
const HOLLOW_LENGTH = 12;
const HOLLOW_HALF = 5;
export const hollowArrow = marker({
  name: 'hollowArrow',
  length: HOLLOW_LENGTH,
  // The line stops at the triangle's base, so it never shows through the hollow head.
  trim: HOLLOW_LENGTH,
  halfWidth: HOLLOW_HALF,
  shapes: (frame) => [
    {
      kind: 'polygon',
      paint: 'paper',
      points: [at(frame, 0), at(frame, HOLLOW_LENGTH, HOLLOW_HALF), at(frame, HOLLOW_LENGTH, -HOLLOW_HALF)],
    },
  ],
});

/** circle: a small ring at the tip, the line stopping at its far side. */
const CIRCLE_RADIUS = 4;
export const circle = marker({
  name: 'circle',
  length: CIRCLE_RADIUS * 2,
  trim: CIRCLE_RADIUS * 2,
  halfWidth: CIRCLE_RADIUS,
  shapes: (frame) => [{ kind: 'circle', paint: 'paper', center: at(frame, CIRCLE_RADIUS), r: CIRCLE_RADIUS }],
});

/** diamond: a hollow rhombus at the tip. */
const DIAMOND_LENGTH = 12;
const DIAMOND_HALF = 8 / 2;
export const diamond = marker({
  name: 'diamond',
  length: DIAMOND_LENGTH,
  trim: DIAMOND_LENGTH,
  halfWidth: DIAMOND_HALF,
  shapes: (frame) => [
    {
      kind: 'polygon',
      paint: 'paper',
      points: [
        at(frame, 0),
        at(frame, DIAMOND_LENGTH / 2, DIAMOND_HALF),
        at(frame, DIAMOND_LENGTH, 0),
        at(frame, DIAMOND_LENGTH / 2, -DIAMOND_HALF),
      ],
    },
  ],
});

/** slash: a single stroke across the tip, marking a default flow. The line runs on to the tip. */
const SLASH_LENGTH = 8;
const SLASH_HALF = 6;
export const slash = marker({
  name: 'slash',
  length: SLASH_LENGTH,
  trim: 0,
  halfWidth: SLASH_HALF,
  shapes: (frame) => [
    {
      kind: 'segment',
      a: at(frame, SLASH_LENGTH / 2, SLASH_HALF),
      b: at(frame, SLASH_LENGTH / 2, -SLASH_HALF),
    },
  ],
});

/** The markers every diagram may draw from; a board extends this with a function returning its own `EndMarker`. */
export const END_MARKERS = { arrow, openArrow, hollowArrow, circle, diamond, slash } as const;

/**
 * The box a marker occupies, for keeping a label or a jump clear of it: its
 * drawn extent from the tip, up to `reach` along the line and `halfWidth`
 * across it.
 */
export const markerZone = (marker: EndMarker, frame: EndFrame): LabelBox => {
  const normal = { x: -frame.inward.y, y: frame.inward.x };
  const tips: LayoutPoint[] = [
    { x: frame.tip.x, y: frame.tip.y },
    {
      x: frame.tip.x + frame.inward.x * marker.reach,
      y: frame.tip.y + frame.inward.y * marker.reach,
    },
  ];
  const corners: LayoutPoint[] = [...tips];
  for (const base of tips) {
    corners.push(
      { x: base.x + normal.x * marker.halfWidth, y: base.y + normal.y * marker.halfWidth },
      { x: base.x - normal.x * marker.halfWidth, y: base.y - normal.y * marker.halfWidth },
    );
  }
  const xs = corners.map((point) => point.x);
  const ys = corners.map((point) => point.y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  return { x: left, y: top, width: Math.max(...xs) - left, height: Math.max(...ys) - top };
};
