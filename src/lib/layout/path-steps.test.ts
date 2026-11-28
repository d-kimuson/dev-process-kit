import { describe, expect, it } from 'vitest';

import {
  endFrame,
  pathDataPoints,
  polylineSteps,
  roundedSteps,
  stepsData,
  trimSteps,
  type PathStep,
} from './path-steps';

describe('stepsData', () => {
  it('writes each step as its SVG path command', () => {
    expect(
      stepsData([
        { kind: 'move', to: { x: 0, y: 0 } },
        { kind: 'line', to: { x: 10, y: 0 } },
        { kind: 'quad', control: { x: 20, y: 0 }, to: { x: 20, y: 10 } },
        { kind: 'cubic', control1: { x: 20, y: 20 }, control2: { x: 30, y: 20 }, to: { x: 40, y: 20 } },
      ]),
    ).toBe('M0 0 L10 0 Q20 0 20 10 C20 20 30 20 40 20');
  });
});

describe('polylineSteps', () => {
  it('draws one move then a line per point', () => {
    expect(
      polylineSteps([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 20 },
      ]),
    ).toEqual([
      { kind: 'move', to: { x: 0, y: 0 } },
      { kind: 'line', to: { x: 10, y: 0 } },
      { kind: 'line', to: { x: 10, y: 20 } },
    ]);
  });

  it('is empty for no points', () => {
    expect(polylineSteps([])).toEqual([]);
  });
});

describe('roundedSteps', () => {
  const data = (steps: readonly PathStep[]): string => stepsData(steps);

  it('draws a straight route as a plain line', () => {
    expect(
      data(
        roundedSteps(
          [
            { x: 0, y: 0 },
            { x: 40, y: 0 },
          ],
          { radius: 8 },
        ),
      ),
    ).toBe('M0 0 L40 0');
  });

  it('rounds each corner', () => {
    expect(
      data(
        roundedSteps(
          [
            { x: 0, y: 0 },
            { x: 20, y: 0 },
            { x: 20, y: 40 },
            { x: 50, y: 40 },
          ],
          { radius: 8 },
        ),
      ),
    ).toBe('M0 0 L12 0 Q20 0 20 8 L20 32 Q20 40 28 40 L50 40');
  });

  it('shrinks the radius to fit a short segment', () => {
    expect(
      data(
        roundedSteps(
          [
            { x: 0, y: 0 },
            { x: 20, y: 0 },
            { x: 20, y: 6 },
            { x: 50, y: 6 },
          ],
          { radius: 8 },
        ),
      ),
    ).toBe('M0 0 L17 0 Q20 0 20 3 L20 3 Q20 6 23 6 L50 6');
  });

  it('keeps the run at each port straight, squaring a corner that would eat into it', () => {
    const route = [
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 40 },
      { x: 50, y: 40 },
    ];
    expect(data(roundedSteps(route, { radius: 8, keepStart: 20, keepEnd: 20 }))).toBe(
      'M0 0 L20 0 L20 32 Q20 40 28 40 L50 40',
    );
    expect(
      data(
        roundedSteps(
          [
            { x: 0, y: 0 },
            { x: 60, y: 0 },
            { x: 60, y: 40 },
            { x: 100, y: 40 },
          ],
          { radius: 8, keepStart: 20, keepEnd: 20 },
        ),
      ),
    ).toBe('M0 0 L52 0 Q60 0 60 8 L60 32 Q60 40 68 40 L100 40');
  });

  it('writes coordinates to the requested precision', () => {
    expect(
      data(
        roundedSteps(
          [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 10, y: 10 },
          ],
          { radius: 3.333, precision: 1 },
        ),
      ),
    ).toBe('M0 0 L6.7 0 Q10 0 10 3.3 L10 10');
  });

  it('is empty for no points', () => {
    expect(roundedSteps([], { radius: 8 })).toEqual([]);
  });
});

describe('trimSteps', () => {
  const straight: readonly PathStep[] = [
    { kind: 'move', to: { x: 0, y: 0 } },
    { kind: 'line', to: { x: 100, y: 0 } },
  ];

  it('moves the first point in along its own run', () => {
    expect(stepsData(trimSteps(straight, 20, 0))).toBe('M20 0 L100 0');
  });

  it('pulls the last point back along its own run', () => {
    expect(stepsData(trimSteps(straight, 0, 30))).toBe('M0 0 L70 0');
  });

  it('trims both ends at once', () => {
    expect(stepsData(trimSteps(straight, 10, 25))).toBe('M10 0 L75 0');
  });

  it('leaves a run shorter than its trim whole rather than crossing into it', () => {
    expect(stepsData(trimSteps(straight, 200, 0))).toBe('M0 0 L100 0');
  });

  it('changes nothing when both trims are zero', () => {
    expect(trimSteps(straight, 0, 0)).toBe(straight);
  });
});

describe('endFrame', () => {
  const route = [
    { x: 100, y: 50 },
    { x: 160, y: 50 },
    { x: 160, y: 120 },
  ];

  it('reads the start tip and the unit vector into the line', () => {
    expect(endFrame(route, 'start')).toEqual({ tip: { x: 100, y: 50 }, inward: { x: 1, y: 0 } });
  });

  it('reads the end tip from the last point, pointing back into the line', () => {
    expect(endFrame(route, 'end')).toEqual({ tip: { x: 160, y: 120 }, inward: { x: 0, y: -1 } });
  });

  it('falls back to the port side when the route has no length', () => {
    expect(endFrame([{ x: 10, y: 10 }], 'start').inward).toEqual({ x: 1, y: 0 });
    expect(endFrame([{ x: 10, y: 10 }], 'end').inward).toEqual({ x: -1, y: 0 });
    expect(endFrame([], 'start').tip).toEqual({ x: 0, y: 0 });
  });
});

describe('pathDataPoints', () => {
  it('reads the end point of each move, line, quad and cubic', () => {
    expect(pathDataPoints('M0 0 L10 0 Q20 0 20 10 C20 20 30 20 40 20')).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 10 },
      { x: 40, y: 20 },
    ]);
  });

  it('ignores the arc a line jump draws', () => {
    expect(pathDataPoints('M0 50 L94 50 A6 6 0 0 1 106 50 L200 50')).toEqual([
      { x: 0, y: 50 },
      { x: 94, y: 50 },
      { x: 200, y: 50 },
    ]);
  });
});
