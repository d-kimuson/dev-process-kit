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
  it('is the longer of the two ends\u2019 reaches', () => {
    const spec = { line: 'solid', start: null, end: END_MARKERS.hollowArrow, flow: 'none' } as const;
    expect(edgeReach(spec)).toBe(END_MARKERS.hollowArrow.reach);
    expect(edgeReach({ line: 'solid', start: END_MARKERS.arrow, end: END_MARKERS.hollowArrow, flow: 'none' })).toBe(
      Math.max(END_MARKERS.arrow.reach, END_MARKERS.hollowArrow.reach),
    );
  });

  it('is the glyph footprint, not the trimmed run, so an arrow reserves its whole head', () => {
    // The arrow's trim is 1 but its reach is 10: a router that only reserved
    // `trim` would let a bend sit under the head.
    const spec = { line: 'solid', start: END_MARKERS.arrow, end: null, flow: 'none' } as const;
    expect(END_MARKERS.arrow.trim).toBe(1);
    expect(edgeReach(spec)).toBe(END_MARKERS.arrow.reach);
    expect(edgeReach(spec)).toBeGreaterThan(END_MARKERS.arrow.trim);
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
    // The arrow's trim is 1: the line is shortened by 1 at each end, while its
    // whole reach (10) stays straight before the corner may round.
    const d = stepsData(steps);
    expect(d.startsWith('M1 0')).toBe(true);
    expect(d.endsWith('199 100')).toBe(true);
  });

  it('keeps the whole glyph reach straight before a corner, not just the trimmed run', () => {
    // A corner 9px in from the arrow tip sits inside the head's reach (10) but
    // past its trim (1): it must stay square, or the head would ride a bend.
    const steps = edgeSteps(
      [
        { x: 0, y: 0 },
        { x: 9, y: 0 },
        { x: 9, y: 100 },
      ],
      { line: 'solid', start: END_MARKERS.arrow, end: null, flow: 'none' },
      { radius: 10 },
    );
    // The corner is kept square: a straight `L9 0` then the vertical run, no `Q`.
    expect(stepsData(steps)).toBe('M1 0 L9 0 L9 100');
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
    // A corner `circle.reach` from the start cannot be rounded: the glyph needs it straight.
    const steps = edgeSteps(
      [
        { x: 0, y: 0 },
        { x: END_MARKERS.circle.reach, y: 0 },
        { x: END_MARKERS.circle.reach, y: 100 },
      ],
      spec,
      { radius: 10 },
    );
    expect(stepsData(steps)).toContain('L8 0 L8');
  });
});
