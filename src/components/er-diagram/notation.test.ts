import { describe, expect, it } from 'vitest';

import { endGlyph, endSymbol, type ErEndGlyph } from './notation';

const horizontal = [
  { x: 100, y: 50 },
  { x: 160, y: 50 },
  { x: 160, y: 120 },
  { x: 220, y: 120 },
];

/** A segment crossing the line at right angles (a bar), at its distance from the end. */
const bars = (glyph: ErEndGlyph, end: { x: number }) =>
  glyph.segments.filter(([a, b]) => a.x === b.x).map(([a]) => Math.abs(a.x - end.x));

describe('er diagram crow’s foot notation', () => {
  it.each([
    ['1', { min: 'one', max: 'one' }],
    ['0..1', { min: 'zero', max: 'one' }],
    ['1..N', { min: 'one', max: 'many' }],
    ['0..N', { min: 'zero', max: 'many' }],
  ] as const)('reads %s as its minimum and maximum', (multiplicity, symbol) => {
    expect(endSymbol(multiplicity)).toEqual(symbol);
  });

  it('draws "exactly one" as two bars across the line and no circle', () => {
    const glyph = endGlyph(horizontal, 'start', '1');
    expect(glyph.circle).toBeNull();
    expect(bars(glyph, { x: 100 })).toHaveLength(2);
    expect(glyph.segments).toHaveLength(2);
  });

  it('draws "zero or one" as a bar near the table and a circle beyond it', () => {
    const glyph = endGlyph(horizontal, 'start', '0..1');
    const [bar] = bars(glyph, { x: 100 });
    expect(glyph.segments).toHaveLength(1);
    expect(glyph.circle).not.toBeNull();
    expect(glyph.circle?.y).toBe(50);
    expect((glyph.circle?.x ?? 0) - 100).toBeGreaterThan(bar ?? Infinity);
  });

  it('draws "many" as three prongs that spread onto the table edge', () => {
    const glyph = endGlyph(horizontal, 'end', '0..N');
    const prongs = glyph.segments.filter(([a, b]) => a.x !== b.x);
    expect(prongs).toHaveLength(3);
    // Every prong starts from one point on the line and ends on the table edge (x = 220).
    expect(new Set(prongs.map(([a]) => `${a.x},${a.y}`)).size).toBe(1);
    expect(prongs.map(([, b]) => b.x)).toEqual([220, 220, 220]);
    expect(prongs.map(([, b]) => b.y).sort((a, b) => a - b)).toEqual([113, 120, 127]);
    // The circle (minimum zero) sits outside the foot, on the line side.
    expect(glyph.circle?.x).toBeLessThan(prongs[0]?.[0].x ?? -Infinity);
  });

  it('adds a bar beyond the foot for "one or many"', () => {
    const glyph = endGlyph(horizontal, 'end', '1..N');
    expect(glyph.circle).toBeNull();
    expect(bars(glyph, { x: 220 })).toHaveLength(1);
    expect(glyph.segments).toHaveLength(4);
  });

  it('places the multiplicity text beside its own end, along the line', () => {
    expect(endGlyph(horizontal, 'start', '1').label).toMatchObject({ anchor: 'start', y: 50 });
    expect(endGlyph(horizontal, 'start', '1').label.x).toBeGreaterThan(100);
    expect(endGlyph(horizontal, 'end', '0..N').label).toMatchObject({ anchor: 'end', y: 120 });
    expect(endGlyph(horizontal, 'end', '0..N').label.x).toBeLessThan(220);
  });

  it('falls back to the port side when the route has no length', () => {
    const point = [{ x: 10, y: 10 }];
    expect(endGlyph(point, 'start', '1').label.anchor).toBe('start');
    expect(endGlyph(point, 'end', '1').label.anchor).toBe('end');
  });
});
