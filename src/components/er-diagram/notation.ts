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
const FAR = 14;
const MANY_FAR = 19;
const LABEL_GAP = 6;

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
  const circleAt = minAt + CIRCLE_RADIUS - 2;
  const segments = symbol.min === 'one' ? [...maxSegments, bar(minAt)] : maxSegments;
  const circle = symbol.min === 'zero' ? at(circleAt) : null;

  const reach = (symbol.min === 'zero' ? circleAt + CIRCLE_RADIUS : minAt) + LABEL_GAP;
  const label = at(reach);
  return { segments, circle, label: { ...label, anchor: u.x >= 0 ? 'start' : 'end' } };
};
