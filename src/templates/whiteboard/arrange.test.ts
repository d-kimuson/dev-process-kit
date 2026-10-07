import { describe, expect, it } from 'vitest';

import { parseTargetRef } from '../../core/target';
import { applyWhiteboardAction } from './apply';
import { arrangeActions, arrangeOptions } from './arrange';
import { parseWhiteboardBase, type WhiteboardState } from './model';

// a, b, c, d overlap one another in a stack; far stands apart; frame f sits between them in `items`.
const state = parseWhiteboardBase({
  items: [
    { id: 'a', kind: 'sticky', x: 0, y: 0 },
    { id: 'b', kind: 'sticky', x: 40, y: 40 },
    { id: 'f', kind: 'frame', x: -100, y: -100, w: 800, h: 800, title: 'F' },
    { id: 'far', kind: 'sticky', x: 2000, y: 0 },
    { id: 'c', kind: 'sticky', x: 80, y: 80 },
    { id: 'd', kind: 'shape', x: 120, y: 120 },
  ],
});

/** The order things are painted in, bottom to top, frames left out. */
const stack = (s: WhiteboardState): string[] => s.items.filter((item) => item.kind !== 'frame').map((item) => item.id);

const arranged = (ids: readonly string[], direction: Parameters<typeof arrangeActions>[2]): string[] => {
  let next = state;
  for (const input of arrangeActions(state, ids, direction)) {
    const target = typeof input.target === 'string' ? parseTargetRef(input.target) : input.target;
    const applied = applyWhiteboardAction(next, {
      ...input,
      target,
      payload: input.payload ?? {},
      id: 'x',
      createdAt: '2026-01-01T00:00:00Z',
    });
    if (applied === null) throw new Error(`stale ${JSON.stringify(input)}`);
    next = applied;
  }
  return stack(next);
};

describe('stacking order', () => {
  it('brings items to the front and sends them to the back, keeping their own order', () => {
    expect(arranged(['a'], 'front')).toEqual(['b', 'far', 'c', 'd', 'a']);
    expect(arranged(['c', 'a'], 'front')).toEqual(['b', 'far', 'd', 'a', 'c']);
    expect(arranged(['d'], 'back')).toEqual(['d', 'a', 'b', 'far', 'c']);
    expect(arranged(['d', 'b'], 'back')).toEqual(['b', 'd', 'a', 'far', 'c']);
  });

  it('steps past the nearest item it overlaps, skipping ones it does not touch', () => {
    // b's next item up is far, which does not overlap it: b goes over c instead.
    expect(arranged(['b'], 'forward')).toEqual(['a', 'far', 'c', 'b', 'd']);
    expect(arranged(['c'], 'backward')).toEqual(['a', 'c', 'b', 'far', 'd']);
  });

  it('asks for nothing when the items are already there', () => {
    expect(arrangeActions(state, ['d'], 'front')).toEqual([]);
    expect(arrangeActions(state, ['a'], 'back')).toEqual([]);
    expect(arrangeActions(state, ['d'], 'forward')).toEqual([]);
    expect(arrangeActions(state, ['a', 'b'], 'back')).toEqual([]);
  });

  it('leaves frames alone: they are always painted behind everything else', () => {
    expect(arrangeActions(state, ['f'], 'front')).toEqual([]);
    expect(arrangeOptions(state, ['f'])).toEqual(new Set());
    expect(arranged(['f', 'a'], 'front')).toEqual(['b', 'far', 'c', 'd', 'a']);
  });

  it('offers only the moves that change what covers what', () => {
    // b sits between a (below) and c, d (above), which all overlap it.
    expect(arrangeOptions(state, ['b'])).toEqual(new Set(['front', 'forward', 'backward', 'back']));
    expect(arrangeOptions(state, ['a'])).toEqual(new Set(['front', 'forward']));
    expect(arrangeOptions(state, ['d'])).toEqual(new Set(['backward', 'back']));
    expect(arrangeOptions(state, ['f', 'd'])).toEqual(new Set(['backward', 'back']));
    // Nothing overlaps far, and a selection that holds the whole pile has nothing to pass.
    expect(arrangeOptions(state, ['far'])).toEqual(new Set());
    expect(arrangeOptions(state, ['a', 'b', 'c', 'd'])).toEqual(new Set());
  });
});
