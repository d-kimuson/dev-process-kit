import type { LayoutPoint } from '../../lib/layout/layered';
import type { ErMultiplicity } from './model';

/**
 * Crow's foot (IE) notation for one end of a relation: the symbol beside a
 * table says how many of its rows one row across the line relates to. The
 * maximum sits against the table (a bar for one, a three-pronged foot for
 * many) and the minimum just outside it (a bar for one, a circle for zero).
 */
export type ErEndSymbol = { readonly min: 'zero' | 'one'; readonly max: 'one' | 'many' };

export const endSymbol = (multiplicity: ErMultiplicity): ErEndSymbol => {
  switch (multiplicity) {
    case '1':
      return { min: 'one', max: 'one' };
    case '0..1':
      return { min: 'zero', max: 'one' };
    case '1..N':
      return { min: 'one', max: 'many' };
    case '0..N':
      return { min: 'zero', max: 'many' };
  }
};

export type ErSegment = readonly [LayoutPoint, LayoutPoint];

/** Geometry of one end, in canvas coordinates. */
export type ErEndGlyph = {
  /** Bars across the line and the prongs of a foot. */
  readonly segments: readonly ErSegment[];
  /** Centre of the "zero" circle. */
  readonly circle: LayoutPoint | null;
  /** Where the multiplicity text starts (on the line; the view lifts it above). */
  readonly label: { readonly x: number; readonly y: number; readonly anchor: 'start' | 'end' };
};

/** `start` is the referenced table's end of the route, `end` the FK table's. */
export type ErEnd = 'start' | 'end';

export const CIRCLE_RADIUS = 4;
const BAR_HALF = 6;
const FOOT_LENGTH = 12;
const FOOT_HALF = 7;
const NEAR = 7;
const FAR = 13;
const MANY_FAR = 14;
const LABEL_GAP = 6;

/** Where a "zero" circle's centre sits for a minimum symbol at `minAt`: its own position, nudged out by its radius. */
const circleAt = (minAt: number): number => minAt + CIRCLE_RADIUS - 2;

/**
 * How far the furthest drawn part of any end glyph reaches from its port.
 *
 * The router escapes every port by at least this much
 * (`view.ts`'s `PORT_STRAIGHT`) and the path never bends inside it, so a
 * crow's foot and its "zero" circle are always drawn *on* the stroke. They
 * used to be extrapolated along the port's nominal direction instead, and
 * `PORT_ESCAPE` was 12 while `0..N`'s circle reaches 25: every relation that
 * bent within 25px of a card — most of them, since the router turns as soon
 * as it may — had its circle and multiplicity floating beside the line
 * rather than on it (the reader's "the circle and the line start do not
 * coincide" report).
 *
 * `MANY_FAR` and `FAR` are sized so this stays within the lane margin half of
 * the smallest gap between two cards (`LAYOUT.nodeSpacing / 2`, see
 * `element.ts`): a longer escape would put a route's first point inside the
 * margin-inflated box of the card across that gap, where every candidate leg
 * out of it counts as blocked.
 */
export const END_GLYPH_REACH: number = Math.max(
  FAR,
  MANY_FAR,
  circleAt(MANY_FAR) + CIRCLE_RADIUS,
  circleAt(FAR) + CIRCLE_RADIUS,
);

/**
 * Unit vector from the end into the line. A route with no length falls back
 * to its port side: tables send relations from their right edge and receive
 * them on their left.
 */
const inward = (points: readonly LayoutPoint[], end: ErEnd): LayoutPoint => {
  const ordered = end === 'start' ? points : [...points].reverse();
  const [tip] = ordered;
  const next = ordered.find((point) => tip !== undefined && (point.x !== tip.x || point.y !== tip.y));
  if (tip === undefined || next === undefined) return { x: end === 'start' ? 1 : -1, y: 0 };
  const length = Math.hypot(next.x - tip.x, next.y - tip.y);
  return { x: (next.x - tip.x) / length, y: (next.y - tip.y) / length };
};

/** The route's direction at one end, for placing a label beside the stroke rather than on it. */
export const endDirection = (points: readonly LayoutPoint[], end: ErEnd): LayoutPoint => inward(points, end);

const round = (value: number): number => Math.round(value * 100) / 100 || 0;

export const endGlyph = (points: readonly LayoutPoint[], end: ErEnd, multiplicity: ErMultiplicity): ErEndGlyph => {
  const tip = (end === 'start' ? points[0] : points.at(-1)) ?? { x: 0, y: 0 };
  const u = inward(points, end);
  const normal = { x: -u.y, y: u.x };
  /** `along` into the line from the table edge, `across` to its side. */
  const at = (along: number, across = 0): LayoutPoint => ({
    x: round(tip.x + u.x * along + normal.x * across),
    y: round(tip.y + u.y * along + normal.y * across),
  });
  const bar = (along: number): ErSegment => [at(along, -BAR_HALF), at(along, BAR_HALF)];
  const symbol = endSymbol(multiplicity);

  const maxSegments: readonly ErSegment[] =
    symbol.max === 'many'
      ? [-FOOT_HALF, 0, FOOT_HALF].map((across): ErSegment => [at(FOOT_LENGTH), at(0, across)])
      : [bar(NEAR)];
  const minAt = symbol.max === 'many' ? MANY_FAR : FAR;
  const segments = symbol.min === 'one' ? [...maxSegments, bar(minAt)] : maxSegments;
  const circle = symbol.min === 'zero' ? at(circleAt(minAt)) : null;

  const reach = (symbol.min === 'zero' ? circleAt(minAt) + CIRCLE_RADIUS : minAt) + LABEL_GAP;
  const label = at(reach);
  return { segments, circle, label: { ...label, anchor: u.x >= 0 ? 'start' : 'end' } };
};
