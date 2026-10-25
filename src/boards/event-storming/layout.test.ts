import { describe, expect, it } from 'vitest';

import {
  attachAnchor,
  buildSlices,
  connectionEndpoints,
  planSliceBands,
  sliceArrows,
  type SliceArrow,
  type SliceBandOptions,
} from './layout';
import { parseEventStormingBase } from './model';

const state = (
  elements: readonly { id: string; type: string; name?: string; contextId?: string }[],
  links: readonly { from: string; to: string; label?: string; kind?: 'member' | 'flow' }[] = [],
  contexts: readonly { id: string; name: string }[] = [],
) => {
  return parseEventStormingBase({
    contexts: contexts.map((c) => ({ ...c })),
    elements: elements.map((e) => ({ ...e, name: e.name ?? e.id })),
    links: links.map((l, i) => ({ id: `l${i}`, ...l })),
  });
};

describe('event-storming slices', () => {
  it('empty board has no slices', () => {
    expect(buildSlices(state([]))).toEqual([]);
  });

  it('unlinked notes each become their own slice, in timeline order', () => {
    const slices = buildSlices(
      state([
        { id: 'e1', type: 'event' },
        { id: 'h1', type: 'hotspot' },
      ]),
    );
    expect(slices.map((s) => s.notes.map((n) => n.id))).toEqual([['e1'], ['h1']]);
  });

  it('actor → command → aggregate → event chain folds into one slice, read left to right', () => {
    const slices = buildSlices(
      state(
        [
          { id: 'e', type: 'event' },
          { id: 'a', type: 'actor' },
          { id: 'c', type: 'command' },
          { id: 'g', type: 'aggregate' },
        ],
        [
          { from: 'a', to: 'c' },
          { from: 'c', to: 'g' },
          { from: 'g', to: 'e' },
        ],
      ),
    );
    // One slice; members ordered by causal reading order, not array order.
    expect(slices).toHaveLength(1);
    expect(slices[0]?.notes.map((n) => n.id)).toEqual(['a', 'c', 'g', 'e']);
  });

  it('a temporal link (event → command) keeps the notes in separate slices', () => {
    const slices = buildSlices(
      state(
        [
          { id: 'e', type: 'event' },
          { id: 'c', type: 'command' },
        ],
        [{ from: 'e', to: 'c' }],
      ),
    );
    expect(slices.map((s) => s.notes.map((n) => n.id))).toEqual([['e'], ['c']]);
  });

  it('a policy joins the command it triggers, but not the event that triggered it', () => {
    const slices = buildSlices(
      state(
        [
          { id: 'e', type: 'event' },
          { id: 'p', type: 'policy' },
          { id: 'c', type: 'command' },
        ],
        [
          { from: 'e', to: 'p' },
          { from: 'p', to: 'c' },
        ],
      ),
    );
    expect(slices.map((s) => s.notes.map((n) => n.id))).toEqual([['e'], ['p', 'c']]);
  });

  it('slice order follows the first appearance of any member', () => {
    const slices = buildSlices(
      state(
        [
          { id: 'c', type: 'command' },
          { id: 'h', type: 'hotspot' },
          { id: 'e', type: 'event' },
        ],
        [{ from: 'c', to: 'e' }],
      ),
    );
    expect(slices.map((s) => s.notes.map((n) => n.id))).toEqual([['c', 'e'], ['h']]);
  });

  it('an explicit member link folds notes the type pair would keep apart', () => {
    const slices = buildSlices(
      state(
        [
          { id: 'r', type: 'readmodel' },
          { id: 'a', type: 'actor' },
        ],
        [{ from: 'r', to: 'a', kind: 'member' }],
      ),
    );
    expect(slices.map((s) => s.notes.map((n) => n.id))).toEqual([['r', 'a']]);
  });

  it('an explicit flow link keeps notes apart even when the type pair would fold', () => {
    const board = state(
      [
        { id: 'a', type: 'actor' },
        { id: 'c', type: 'command' },
      ],
      [{ from: 'a', to: 'c', kind: 'flow' }],
    );
    const slices = buildSlices(board);
    expect(slices.map((s) => s.notes.map((n) => n.id))).toEqual([['a'], ['c']]);
    expect(sliceArrows(board, slices).map((a) => a.id)).toEqual(['l0']);
  });

  it('a hotspot member link pins the hotspot onto that note, not the slice', () => {
    const slices = buildSlices(
      state(
        [
          { id: 'c', type: 'command' },
          { id: 'e', type: 'event' },
          { id: 'h', type: 'hotspot' },
        ],
        [
          { from: 'c', to: 'e' },
          { from: 'h', to: 'c', kind: 'member' },
        ],
      ),
    );
    expect(slices).toHaveLength(1);
    expect(slices[0]?.notes.map((n) => n.id)).toEqual(['c', 'e']);
    expect(slices[0]?.pins.map((p) => [p.note.id, p.targetId])).toEqual([['h', 'c']]);
  });

  it('a pin is placed by its target, not by its own position in the timeline', () => {
    const slices = buildSlices(
      state(
        [
          { id: 'h', type: 'hotspot' },
          { id: 'e', type: 'event' },
        ],
        [{ from: 'e', to: 'h', kind: 'member' }],
      ),
    );
    expect(slices.map((s) => s.notes.map((n) => n.id))).toEqual([['e']]);
    expect(slices[0]?.pins.map((p) => [p.note.id, p.targetId])).toEqual([['h', 'e']]);
  });

  it('a hotspot with no link stays on the timeline as a note', () => {
    const slices = buildSlices(state([{ id: 'h', type: 'hotspot' }]));
    expect(slices.map((s) => s.notes.map((n) => n.id))).toEqual([['h']]);
    expect(slices[0]?.pins).toEqual([]);
  });

  it('a hotspot pinned to another hotspot is not a pin: it stays on the timeline', () => {
    const board = state(
      [
        { id: 'e', type: 'event' },
        { id: 'h1', type: 'hotspot' },
        { id: 'h2', type: 'hotspot' },
      ],
      [
        { from: 'h2', to: 'e', kind: 'member' },
        { from: 'h1', to: 'h2', kind: 'member' },
      ],
    );
    const slices = buildSlices(board);
    expect(slices.map((s) => s.notes.map((n) => n.id))).toEqual([['e'], ['h1']]);
    expect(slices[0]?.pins.map((p) => p.note.id)).toEqual(['h2']);
  });

  it('an explicit flow link from a hotspot stays an arrow, not a pin', () => {
    const board = state(
      [
        { id: 'e', type: 'event' },
        { id: 'h', type: 'hotspot' },
      ],
      [
        { from: 'e', to: 'h', kind: 'member' },
        { from: 'h', to: 'e', kind: 'flow' },
      ],
    );
    const slices = buildSlices(board);
    expect(slices.map((s) => s.notes.map((n) => n.id))).toEqual([['e']]);
    expect(slices[0]?.pins.map((p) => p.note.id)).toEqual(['h']);
    // The pin is an annotation: it never carries an arrow between slices.
    expect(sliceArrows(board, slices)).toEqual([]);
  });

  it('slice carries the bounded context of its members', () => {
    const slices = buildSlices(
      state(
        [
          { id: 'c', type: 'command', contextId: 'ctx' },
          { id: 'e', type: 'event', contextId: 'ctx' },
        ],
        [{ from: 'c', to: 'e' }],
        [{ id: 'ctx', name: 'Ctx' }],
      ),
    );
    expect(slices[0]?.contextId).toBe('ctx');
  });
});

describe('event-storming slice arrows', () => {
  it('links across slices become arrows between slices, keeping the label', () => {
    const board = state(
      [
        { id: 'e', type: 'event' },
        { id: 'p', type: 'policy' },
        { id: 'c', type: 'command' },
      ],
      [
        { from: 'e', to: 'p', label: 'トリガー' },
        { from: 'p', to: 'c' },
      ],
    );
    const slices = buildSlices(board);
    const arrows = sliceArrows(board, slices);
    expect(arrows).toHaveLength(1);
    expect(arrows[0]?.from).toBe(slices[0]?.id);
    expect(arrows[0]?.to).toBe(slices[1]?.id);
    expect(arrows[0]?.label).toBe('トリガー');
  });

  it('links inside one slice produce no arrow', () => {
    const board = state(
      [
        { id: 'a', type: 'actor' },
        { id: 'c', type: 'command' },
      ],
      [{ from: 'a', to: 'c' }],
    );
    expect(sliceArrows(board, buildSlices(board))).toEqual([]);
  });
});

/** Minimal slices/arrows for the band tests. */
const slice = (id: string) => ({ id });
const arrow = (id: string, from: string, to: string, label?: string): SliceArrow =>
  label === undefined ? { id, from, to } : { id, from, to, label };

describe('event-storming slice bands', () => {
  const options = (widths: Record<string, number>, maxWidth: number): SliceBandOptions => ({
    widthOf: (id) => widths[id] ?? 0,
    gapX: 40,
    padX: 10,
    maxWidth,
  });

  it('lays the timeline out on one line, left to right, while it fits', () => {
    const bands = planSliceBands([slice('a'), slice('b')], [arrow('l0', 'a', 'b')], options({ a: 300, b: 300 }, 700));
    expect(bands).toEqual([{ sliceIds: ['a', 'b'] }]);
  });

  it('wraps at a break no arrow crosses', () => {
    const bands = planSliceBands(
      [slice('a'), slice('b'), slice('c')],
      [arrow('l0', 'a', 'b')],
      options({ a: 300, b: 300, c: 300 }, 700),
    );
    expect(bands.map((band) => band.sliceIds)).toEqual([['a', 'b'], ['c']]);
    expect(bands[1]?.cutFrom).toBeUndefined();
  });

  it('moves a glued run to the next band instead of cutting its arrow', () => {
    const bands = planSliceBands(
      [slice('a'), slice('b'), slice('c')],
      [arrow('l0', 'b', 'c')],
      options({ a: 400, b: 400, c: 400 }, 900),
    );
    expect(bands.map((band) => band.sliceIds)).toEqual([['a'], ['b', 'c']]);
    expect(bands[1]?.cutFrom).toBeUndefined();
  });

  it('cuts a run longer than the budget and marks the continuation', () => {
    const bands = planSliceBands(
      [slice('a'), slice('b'), slice('c')],
      [arrow('l0', 'a', 'b'), arrow('l1', 'b', 'c')],
      options({ a: 400, b: 400, c: 400 }, 900),
    );
    expect(bands.map((band) => band.sliceIds)).toEqual([['a', 'b'], ['c']]);
    expect(bands[0]?.cutFrom).toBeUndefined();
    expect(bands[1]?.cutFrom?.id).toBe('l1');
  });

  it('a slice wider than the budget keeps a band of its own', () => {
    expect(planSliceBands([slice('a')], [], options({ a: 900 }, 700))).toEqual([{ sliceIds: ['a'] }]);
  });

  it('no slices, no bands', () => {
    expect(planSliceBands([], [], options({}, 700))).toEqual([]);
  });
});

describe('event-storming attach anchor', () => {
  const sliceOf = (board: ReturnType<typeof state>) => {
    const first = buildSlices(board)[0];
    if (first === undefined) throw new Error('no slice');
    return first;
  };

  it('a new actor links onto the command it would issue', () => {
    const board = state(
      [
        { id: 'c', type: 'command' },
        { id: 'e', type: 'event' },
      ],
      [{ from: 'c', to: 'e' }],
    );
    expect(attachAnchor(sliceOf(board), 'actor')).toEqual({ anchorId: 'c', incoming: true });
  });

  it('a new command hooks in front of the existing event', () => {
    const board = state([{ id: 'e', type: 'event' }]);
    expect(attachAnchor(sliceOf(board), 'command')).toEqual({ anchorId: 'e', incoming: true });
  });

  it('prefers the reversed pair when only that direction folds', () => {
    const board = state([{ id: 'c', type: 'command' }]);
    // command>aggregate folds, aggregate>command does not.
    expect(attachAnchor(sliceOf(board), 'aggregate')).toEqual({ anchorId: 'c', incoming: false });
  });

  it('falls back to the slice head when no type pair folds (explicit member link)', () => {
    const board = state([{ id: 'r', type: 'readmodel' }]);
    expect(attachAnchor(sliceOf(board), 'hotspot')).toEqual({ anchorId: 'r', incoming: true });
  });
});

describe('event-storming connection endpoints', () => {
  it('connects the source slice at its event to the head of the target slice', () => {
    const board = state(
      [
        { id: 'a', type: 'actor' },
        { id: 'c', type: 'command' },
        { id: 'e', type: 'event' },
        { id: 'p', type: 'policy' },
        { id: 'c2', type: 'command' },
      ],
      [
        { from: 'a', to: 'c' },
        { from: 'c', to: 'e' },
        { from: 'p', to: 'c2' },
      ],
    );
    const [source, target] = buildSlices(board);
    expect(source && target && connectionEndpoints(source, target)).toEqual({ from: 'e', to: 'p' });
  });

  it('falls back to the last note when the source slice has no event', () => {
    const board = state([
      { id: 'r', type: 'readmodel' },
      { id: 'e', type: 'event' },
    ]);
    const [source, target] = buildSlices(board);
    expect(source && target && connectionEndpoints(source, target)).toEqual({ from: 'r', to: 'e' });
  });
});
