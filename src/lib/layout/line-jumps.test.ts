import { describe, expect, it } from 'vitest';

import type { PathStep } from './path-steps';

import { jumpedPaths, LINE_JUMP_RADIUS } from './line-jumps';

const line = (...points: readonly [number, number][]): readonly PathStep[] =>
  points.map(([x, y], index) => ({ kind: index === 0 ? 'move' : 'line', to: { x, y } }));

/** A jump keeps clear of both ends by this much, as the ER diagram's glyphs require. */
const CLEARANCE = 25;

describe('jumpedPaths', () => {
  const r = LINE_JUMP_RADIUS;

  it('lifts a level run over a line crossing it, and leaves the crossed line straight', () => {
    const paths = jumpedPaths(
      new Map([
        ['level', line([0, 50], [200, 50])],
        ['upright', line([100, 0], [100, 100])],
      ]),
      new Set(['level', 'upright']),
      { clearance: 0 },
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
      { clearance: 0 },
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
      { clearance: 0 },
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
      { clearance: 0 },
    );
    expect(paths.get('level')).toBe('M0 50 L200 50');
  });

  it('keeps the run under the end glyphs straight', () => {
    const near = CLEARANCE - 1;
    const paths = jumpedPaths(
      new Map([
        ['level', line([0, 50], [200, 50])],
        ['start', line([near, 0], [near, 100])],
        ['end', line([200 - near, 0], [200 - near, 100])],
      ]),
      new Set(['level', 'start', 'end']),
      { clearance: CLEARANCE },
    );
    expect(paths.get('level')).toBe('M0 50 L200 50');
  });

  it("keeps clear of the crossed line's own end glyphs too", () => {
    const near = CLEARANCE - 1;
    const paths = jumpedPaths(
      new Map([
        ['level', line([0, 50], [200, 50])],
        ['short', line([100, 50 - near], [100, 150])],
        ['long', line([150, 0], [150, 100])],
      ]),
      new Set(['level', 'short', 'long']),
      { clearance: CLEARANCE },
    );
    expect(paths.get('level')).toBe(`M0 50 L${150 - r} 50 A${r} ${r} 0 0 1 ${150 + r} 50 L200 50`);
  });

  it('takes a per-end clearance, so a board with different glyphs at each end keeps clear of both', () => {
    // The crossing at y = 50 sits 30px from `short`'s own start tip: a per-end
    // clearance lets a board reserve that reach only where its glyph is drawn.
    const lines = new Map([
      ['level', line([0, 50], [200, 50])],
      ['short', line([150, 20], [150, 200])],
    ]);
    const plainNone = jumpedPaths(lines, new Set(['level', 'short']), { clearance: 0 });
    expect(plainNone.get('level')).toContain('A6 6');
    const startAware = jumpedPaths(lines, new Set(['level', 'short']), {
      clearance: () => ({ start: 40, end: 0 }),
    });
    expect(startAware.get('level')).toBe('M0 50 L200 50');
  });

  it('accepts one fixed clearance per end as a plain object', () => {
    const lines = new Map([
      ['level', line([0, 50], [200, 50])],
      ['short', line([150, 20], [150, 200])],
    ]);
    // A uniform 0 jumps; a `{ start, end }` object keeps the jump off the start glyph.
    expect(jumpedPaths(lines, new Set(['level', 'short']), { clearance: 0 }).get('level')).toContain('A6 6');
    expect(jumpedPaths(lines, new Set(['level', 'short']), { clearance: { start: 40, end: 0 } }).get('level')).toBe(
      'M0 50 L200 50',
    );
  });

  it('spans crossings too close for two jumps with one wider one', () => {
    const paths = jumpedPaths(
      new Map([
        ['level', line([0, 50], [200, 50])],
        ['a', line([100, 0], [100, 100])],
        ['b', line([104, 0], [104, 100])],
      ]),
      new Set(['level', 'a', 'b']),
      { clearance: 0 },
    );
    expect(paths.get('level')).toBe(`M0 50 L${100 - r} 50 A${2 + r} ${r} 0 0 1 ${104 + r} 50 L200 50`);
  });

  it('never jumps between two lines of the same bundle', () => {
    const paths = jumpedPaths(
      new Map([
        ['main', line([0, 50], [200, 50])],
        ['branch', line([100, 0], [100, 100])],
      ]),
      new Set(['main', 'branch']),
      { clearance: 0, bundle: (id) => (id === 'main' || id === 'branch' ? 'trunk' : null) },
    );
    expect(paths.get('main')).toBe('M0 50 L200 50');
  });

  it('still jumps a line in a different bundle', () => {
    const paths = jumpedPaths(
      new Map([
        ['main', line([0, 50], [200, 50])],
        ['branch', line([100, 0], [100, 100])],
      ]),
      new Set(['main', 'branch']),
      { clearance: 0, bundle: (id) => (id === 'main' ? 'trunk' : 'other') },
    );
    expect(paths.get('main')).toContain(`A${r} ${r} 0 0 1`);
  });
});

/**
 * A route's S-curve, from `path-steps`' own corners: the crossing is where the
 * curve actually passes the level, not at the jog's own x. Kept here rather
 * than in the ER board's test because the rule is the jump pass's, not the
 * board's: whatever draws the curve, the jump reads it the same way.
 */
describe('jumpedPaths over a curve', () => {
  const r = LINE_JUMP_RADIUS;

  const curve: readonly PathStep[] = [
    { kind: 'move', to: { x: 0, y: 0 } },
    { kind: 'line', to: { x: 60, y: 0 } },
    { kind: 'cubic', control1: { x: 100, y: 0 }, control2: { x: 100, y: 100 }, to: { x: 140, y: 100 } },
    { kind: 'line', to: { x: 200, y: 100 } },
  ];

  it('jumps where the curve actually crosses the run, not at the jog', () => {
    const paths = jumpedPaths(
      new Map([
        ['level', line([0, 50], [200, 50])],
        ['curve', curve],
      ]),
      new Set(['level', 'curve']),
      { clearance: 0 },
    );
    // Point-symmetric about the jog's middle, so it crosses y=50 exactly at x=100.
    expect(paths.get('level')).toBe(`M0 50 L${100 - r} 50 A${r} ${r} 0 0 1 ${100 + r} 50 L200 50`);
  });

  it('finds a higher run crossing the curve where the curve is still near its start', () => {
    const paths = jumpedPaths(
      new Map([
        ['level', line([0, 10], [200, 10])],
        ['curve', curve],
      ]),
      new Set(['level', 'curve']),
      { clearance: 0 },
    );
    const at = Number(/L([\d.]+) 10 A/.exec(paths.get('level') ?? '')?.[1]) + r;
    expect(at).toBeGreaterThan(60);
    expect(at).toBeLessThan(100);
  });
});
