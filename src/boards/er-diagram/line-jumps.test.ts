import { describe, expect, it } from 'vitest';

import { jumpedPaths, LINE_JUMP_RADIUS, pathData, type PathStep } from './line-jumps';
import { PORT_STRAIGHT, relationSteps } from './view';

const line = (...points: readonly [number, number][]): readonly PathStep[] =>
  points.map(([x, y], index) => ({ kind: index === 0 ? 'move' : 'line', to: { x, y } }));

describe('pathData', () => {
  it('writes each step as its SVG path command', () => {
    expect(
      pathData([
        { kind: 'move', to: { x: 0, y: 0 } },
        { kind: 'line', to: { x: 10, y: 0 } },
        { kind: 'quad', control: { x: 20, y: 0 }, to: { x: 20, y: 10 } },
        { kind: 'cubic', control1: { x: 20, y: 20 }, control2: { x: 30, y: 20 }, to: { x: 40, y: 20 } },
      ]),
    ).toBe('M0 0 L10 0 Q20 0 20 10 C20 20 30 20 40 20');
  });
});

describe('jumpedPaths', () => {
  const r = LINE_JUMP_RADIUS;

  it('lifts a level run over a line crossing it, and leaves the crossed line straight', () => {
    const paths = jumpedPaths(
      new Map([
        ['level', line([0, 50], [200, 50])],
        ['upright', line([100, 0], [100, 100])],
      ]),
      new Set(['level', 'upright']),
    );
    expect(paths.get('level')).toBe(`M0 50 L${100 - r} 50 A${r} ${r} 0 0 1 ${100 + r} 50 L200 50`);
    expect(paths.get('upright')).toBe('M100 0 L100 100');
  });

  it('treats a run whose ends differ only by rounding as level', () => {
    // A rounded corner ends on a point rounded to two decimals, the run that follows on the exact one.
    const paths = jumpedPaths(
      new Map([
        [
          'level',
          [
            { kind: 'move', to: { x: 0, y: 40 } },
            { kind: 'quad', control: { x: 0, y: 50.0025 }, to: { x: 10, y: 50 } },
            { kind: 'line', to: { x: 200, y: 50.0025 } },
          ],
        ],
        ['upright', line([100, 0], [100, 100])],
      ]),
      new Set(['level', 'upright']),
    );
    expect(paths.get('level')).toContain(`L${100 - r} 50 A${r} ${r} 0 0 1 ${100 + r} 50`);
  });

  it('bulges the same way, upwards, on a run drawn right to left', () => {
    const paths = jumpedPaths(
      new Map([
        ['level', line([200, 50], [0, 50])],
        ['upright', line([100, 0], [100, 100])],
      ]),
      new Set(['level', 'upright']),
    );
    expect(paths.get('level')).toBe(`M200 50 L${100 + r} 50 A${r} ${r} 0 0 0 ${100 - r} 50 L0 50`);
  });

  it('jumps nothing a line only meets, nor a line not drawn at rest', () => {
    const paths = jumpedPaths(
      new Map([
        ['level', line([0, 50], [200, 50])],
        ['meets', line([80, 0], [80, 50])],
        ['concealed', line([120, 0], [120, 100])],
      ]),
      new Set(['level', 'meets']),
    );
    expect(paths.get('level')).toBe('M0 50 L200 50');
  });

  it('keeps the port runs under the end glyphs straight', () => {
    const near = PORT_STRAIGHT - 1;
    const paths = jumpedPaths(
      new Map([
        ['level', line([0, 50], [200, 50])],
        ['start', line([near, 0], [near, 100])],
        ['end', line([200 - near, 0], [200 - near, 100])],
      ]),
      new Set(['level', 'start', 'end']),
    );
    expect(paths.get('level')).toBe('M0 50 L200 50');
  });

  it("keeps clear of the crossed line's own end glyphs too", () => {
    const near = PORT_STRAIGHT - 1;
    const paths = jumpedPaths(
      new Map([
        ['level', line([0, 50], [200, 50])],
        ['short', line([100, 50 - near], [100, 150])],
        ['long', line([150, 0], [150, 100])],
      ]),
      new Set(['level', 'short', 'long']),
    );
    expect(paths.get('level')).toBe(`M0 50 L${150 - r} 50 A${r} ${r} 0 0 1 ${150 + r} 50 L200 50`);
  });

  it('spans crossings too close for two jumps with one wider one', () => {
    const paths = jumpedPaths(
      new Map([
        ['level', line([0, 50], [200, 50])],
        ['a', line([100, 0], [100, 100])],
        ['b', line([104, 0], [104, 100])],
      ]),
      new Set(['level', 'a', 'b']),
    );
    expect(paths.get('level')).toBe(`M0 50 L${100 - r} 50 A${2 + r} ${r} 0 0 1 ${104 + r} 50 L200 50`);
  });

  it("jumps where a forward route's S-curve actually crosses the run, not at the jog's own x", () => {
    const curve = relationSteps(
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 200, y: 100 },
      ],
      40,
      0,
    );
    // The S-curve is point-symmetric about the jog's middle, so it crosses y=50 exactly at the jog.
    const centred = jumpedPaths(
      new Map([
        ['level', line([0, 50], [200, 50])],
        ['curve', curve],
      ]),
      new Set(['level', 'curve']),
    );
    expect(centred.get('level')).toBe(`M0 50 L${100 - r} 50 A${r} ${r} 0 0 1 ${100 + r} 50 L200 50`);
    // Higher up, the curve is still close to its start, left of the jog.
    const higher = jumpedPaths(
      new Map([
        ['level', line([0, 10], [200, 10])],
        ['curve', curve],
      ]),
      new Set(['level', 'curve']),
    );
    const at = Number(/L([\d.]+) 10 A/.exec(higher.get('level') ?? '')?.[1]) + r;
    expect(at).toBeGreaterThan(60);
    expect(at).toBeLessThan(100);
  });
});
