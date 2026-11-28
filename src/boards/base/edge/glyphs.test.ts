import { describe, expect, it } from 'vitest';

import { endFrame } from '../../../lib/layout/path-steps';
import { END_MARKERS, markerZone, type EndMarker } from './glyphs';

/** A horizontal frame pointing right, the tip at the origin. */
const right = endFrame(
  [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
  ],
  'start',
);
/** A vertical frame running downward. */
const down = endFrame(
  [
    { x: 0, y: 0 },
    { x: 0, y: 100 },
  ],
  'start',
);

const pointsOf = (marker: EndMarker, frame = right): { x: number; y: number }[] =>
  marker.shapes(frame).flatMap((glyph) => {
    if (glyph.kind === 'circle') return [glyph.center];
    if (glyph.kind === 'segment') return [glyph.a, glyph.b];
    return [...glyph.points];
  });

describe('END_MARKERS', () => {
  it('names each built-in marker by its own key', () => {
    for (const [name, marker] of Object.entries(END_MARKERS)) expect(marker.name).toBe(name);
  });

  it('draws an arrow as a filled triangle whose base is its own reach', () => {
    const shapes = END_MARKERS.arrow.shapes(right);
    expect(shapes).toHaveLength(1);
    const [glyph] = shapes;
    expect(glyph?.kind).toBe('polygon');
    const polygon = glyph as Extract<typeof glyph, { kind: 'polygon' }>;
    expect(polygon.paint).toBe('line');
    expect(polygon.points[0]).toEqual({ x: 0, y: 0 });
    // The two base points sit at the arrow's reach, across from the tip.
    expect(polygon.points.slice(1).every((point) => point.x === END_MARKERS.arrow.reach)).toBe(true);
  });

  it('draws an open arrow as an unpainted polyline', () => {
    const [glyph] = END_MARKERS.openArrow.shapes(right);
    expect(glyph?.kind).toBe('polyline');
    expect((glyph as { paint: string }).paint).toBe('none');
    expect(END_MARKERS.openArrow.trim).toBe(0);
  });

  it('draws a hollow arrow as a paper-filled triangle that the line stops at', () => {
    const [glyph] = END_MARKERS.hollowArrow.shapes(right);
    expect((glyph as { paint: string }).paint).toBe('paper');
    expect(END_MARKERS.hollowArrow.trim).toBe(END_MARKERS.hollowArrow.reach);
  });

  it('draws a circle centred one radius in from the tip, the line stopping at its far side', () => {
    const [glyph] = END_MARKERS.circle.shapes(right);
    expect(glyph?.kind).toBe('circle');
    const circle = glyph as Extract<typeof glyph, { kind: 'circle' }>;
    expect(circle.center.x).toBe(circle.r);
    expect(END_MARKERS.circle.reach).toBe(circle.r * 2);
  });

  it('draws a diamond as a four-point polygon spanning its reach', () => {
    const [glyph] = END_MARKERS.diamond.shapes(right);
    const polygon = glyph as Extract<typeof glyph, { kind: 'polygon' }>;
    expect(polygon.points).toHaveLength(4);
    expect(Math.max(...polygon.points.map((point) => point.x))).toBe(END_MARKERS.diamond.reach);
  });

  it('draws a slash as one stroke across the tip, the line running on', () => {
    const [glyph] = END_MARKERS.slash.shapes(right);
    expect(glyph?.kind).toBe('segment');
    expect(END_MARKERS.slash.trim).toBe(0);
  });

  it('turns a glyph with the line: a downward frame draws the arrow pointing down', () => {
    const [glyph] = END_MARKERS.arrow.shapes(down);
    const polygon = glyph as Extract<typeof glyph, { kind: 'polygon' }>;
    expect(polygon.points[0]).toEqual({ x: 0, y: 0 });
    expect(polygon.points.slice(1).every((point) => point.y === END_MARKERS.arrow.reach)).toBe(true);
  });

  it('keeps a non-zero reach and half-width for every marker, so a router can reserve room', () => {
    for (const marker of Object.values(END_MARKERS)) {
      expect(marker.reach).toBeGreaterThan(0);
      expect(marker.halfWidth).toBeGreaterThan(0);
      expect(pointsOf(marker).length).toBeGreaterThan(0);
    }
  });
});

describe('markerZone', () => {
  it('bounds a horizontal arrow from the tip to its reach', () => {
    const zone = markerZone(END_MARKERS.arrow, right);
    expect(zone.x).toBe(0);
    expect(zone.width).toBe(END_MARKERS.arrow.reach);
    expect(zone.y).toBe(-END_MARKERS.arrow.halfWidth);
    expect(zone.height).toBe(END_MARKERS.arrow.halfWidth * 2);
  });

  it('bounds a downward arrow as a tall, narrow box', () => {
    const zone = markerZone(END_MARKERS.arrow, down);
    expect(zone.width).toBe(END_MARKERS.arrow.halfWidth * 2);
    expect(zone.height).toBe(END_MARKERS.arrow.reach);
  });

  it('contains every drawn point of the marker', () => {
    for (const marker of Object.values(END_MARKERS)) {
      const zone = markerZone(marker, right);
      for (const point of pointsOf(marker)) {
        expect(point.x).toBeGreaterThanOrEqual(zone.x - 0.01);
        expect(point.x).toBeLessThanOrEqual(zone.x + zone.width + 0.01);
        expect(point.y).toBeGreaterThanOrEqual(zone.y - 0.01);
        expect(point.y).toBeLessThanOrEqual(zone.y + zone.height + 0.01);
      }
    }
  });
});
