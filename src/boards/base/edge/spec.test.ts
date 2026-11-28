import { describe, expect, it } from 'vitest';

import { stepsData } from '../../../lib/layout/path-steps';
import { END_MARKERS } from './glyphs';
import { edgeReach, edgeSteps } from './spec';

const route = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 100 },
  { x: 200, y: 100 },
];

describe('edgeReach', () => {
  it('is the longer of the two ends\u2019 trims', () => {
    const spec = { line: 'solid', start: null, end: END_MARKERS.hollowArrow, flow: 'none' } as const;
    expect(edgeReach(spec)).toBe(END_MARKERS.hollowArrow.trim);
    expect(edgeReach({ line: 'solid', start: END_MARKERS.arrow, end: END_MARKERS.hollowArrow, flow: 'none' })).toBe(
      Math.max(END_MARKERS.arrow.trim, END_MARKERS.hollowArrow.trim),
    );
  });

  it('is zero when neither end carries a marker', () => {
    expect(edgeReach({ line: 'solid', start: null, end: null, flow: 'none' })).toBe(0);
  });
});

describe('edgeSteps', () => {
  it('rounds the corners of a bare line', () => {
    const steps = edgeSteps(route, { line: 'solid', start: null, end: null, flow: 'none' }, { radius: 10 });
    expect(stepsData(steps)).toBe('M0 0 L90 0 Q100 0 100 10 L100 90 Q100 100 110 100 L200 100');
  });

  it('leaves the run under an end marker straight, then trims it by the marker trim', () => {
    const spec = { line: 'solid', start: END_MARKERS.arrow, end: END_MARKERS.arrow, flow: 'none' } as const;
    const steps = edgeSteps(route, spec, { radius: 10 });
    // The arrow's trim is 1: the line is shortened by 1 at each end and its
    // corners keep a `trim`-long run straight (the radius, 10, is unchanged).
    const d = stepsData(steps);
    expect(d.startsWith('M1 0')).toBe(true);
    expect(d.endsWith('199 100')).toBe(true);
  });

  it('trims a hollow arrow\u2019s whole length, so the line stops at the base of the head', () => {
    const spec = { line: 'solid', start: null, end: END_MARKERS.hollowArrow, flow: 'none' } as const;
    const steps = edgeSteps(
      [
        { x: 0, y: 0 },
        { x: 200, y: 0 },
      ],
      spec,
      { radius: 10 },
    );
    expect(stepsData(steps)).toBe(`M0 0 L${200 - END_MARKERS.hollowArrow.trim} 0`);
  });

  it('squares a corner that would bend inside the glyph\u2019s run', () => {
    const spec = { line: 'solid', start: END_MARKERS.circle, end: null, flow: 'none' } as const;
    // A corner `circle.trim` from the start cannot be rounded: the glyph needs it straight.
    const steps = edgeSteps(
      [
        { x: 0, y: 0 },
        { x: END_MARKERS.circle.trim, y: 0 },
        { x: END_MARKERS.circle.trim, y: 100 },
      ],
      spec,
      { radius: 10 },
    );
    expect(stepsData(steps)).toContain('L8 0 L8');
  });
});
