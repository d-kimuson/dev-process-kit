import { describe, expect, it } from 'vitest';

import {
  EMPTY_POSITION_STATE,
  hasOverridesFor,
  positionOf,
  positionsFor,
  pruneMissingNodes,
  resetDiagram,
  setPosition,
  setPositions,
} from './layout-position';

const ref = (board: string, diagram: string, node: string) => ({ board, diagram, node });

describe('layout-position', () => {
  it('starts empty', () => {
    expect(positionOf(EMPTY_POSITION_STATE, ref('b', 'd', 'n'))).toBeNull();
  });

  it('records an absolute position for a moved node', () => {
    const state = setPosition(EMPTY_POSITION_STATE, ref('b', 'd', 'a'), { x: 10, y: 20 });
    expect(positionOf(state, ref('b', 'd', 'a'))).toEqual({ x: 10, y: 20 });
    expect(hasOverridesFor(state, 'b', 'd')).toBe(true);
    expect(hasOverridesFor(state, 'b', 'other')).toBe(false);
  });

  it('sets several positions at once, as if they were committed one by one', () => {
    const state = setPositions(EMPTY_POSITION_STATE, [
      { ...ref('b', 'd', 'a'), position: { x: 1, y: 1 } },
      { ...ref('b', 'd', 'c'), position: { x: 2, y: 2 } },
    ]);
    expect(positionOf(state, ref('b', 'd', 'a'))).toEqual({ x: 1, y: 1 });
    expect(positionOf(state, ref('b', 'd', 'c'))).toEqual({ x: 2, y: 2 });
  });

  it('replaces the previous override for the same node, keyed by board/diagram/node', () => {
    let state = setPosition(EMPTY_POSITION_STATE, ref('b', 'd', 'a'), { x: 10, y: 20 });
    state = setPosition(state, ref('b', 'd', 'a'), { x: 30, y: 40 });
    expect(positionOf(state, ref('b', 'd', 'a'))).toEqual({ x: 30, y: 40 });
    expect(state.overrides).toHaveLength(1);
  });

  it('keeps a node moved on one board/diagram distinct from the same node id elsewhere', () => {
    let state = setPosition(EMPTY_POSITION_STATE, ref('b1', 'd', 'a'), { x: 1, y: 1 });
    state = setPosition(state, ref('b2', 'd', 'a'), { x: 2, y: 2 });
    state = setPosition(state, ref('b1', 'd2', 'a'), { x: 3, y: 3 });
    expect(positionOf(state, ref('b1', 'd', 'a'))).toEqual({ x: 1, y: 1 });
    expect(positionOf(state, ref('b2', 'd', 'a'))).toEqual({ x: 2, y: 2 });
    expect(positionOf(state, ref('b1', 'd2', 'a'))).toEqual({ x: 3, y: 3 });
  });

  it('collects the overrides for one board/diagram as a map keyed by node id', () => {
    let state = setPosition(EMPTY_POSITION_STATE, ref('b', 'd', 'a'), { x: 1, y: 1 });
    state = setPosition(state, ref('b', 'd', 'c'), { x: 2, y: 2 });
    state = setPosition(state, ref('b', 'other', 'a'), { x: 9, y: 9 });
    const map = positionsFor(state, 'b', 'd');
    expect(map.size).toBe(2);
    expect(map.get('a')).toEqual({ x: 1, y: 1 });
    expect(map.get('c')).toEqual({ x: 2, y: 2 });
  });

  it('resets just one diagram, leaving other boards/diagrams untouched', () => {
    let state = setPosition(EMPTY_POSITION_STATE, ref('b', 'd', 'a'), { x: 1, y: 1 });
    state = setPosition(state, ref('b', 'other', 'a'), { x: 2, y: 2 });
    const next = resetDiagram(state, 'b', 'd');
    expect(hasOverridesFor(next, 'b', 'd')).toBe(false);
    expect(hasOverridesFor(next, 'b', 'other')).toBe(true);
  });

  it('prunes overrides for nodes that no longer exist in that diagram, ignoring the rest', () => {
    let state = setPosition(EMPTY_POSITION_STATE, ref('b', 'd', 'gone'), { x: 1, y: 1 });
    state = setPosition(state, ref('b', 'd', 'kept'), { x: 2, y: 2 });
    state = setPosition(state, ref('b', 'other', 'gone'), { x: 3, y: 3 });
    const next = pruneMissingNodes(state, 'b', 'd', new Set(['kept']));
    expect(positionOf(next, ref('b', 'd', 'gone'))).toBeNull();
    expect(positionOf(next, ref('b', 'd', 'kept'))).toEqual({ x: 2, y: 2 });
    // Untouched: a different diagram keeps its own override even though 'gone' isn't in this diagram's node set.
    expect(positionOf(next, ref('b', 'other', 'gone'))).toEqual({ x: 3, y: 3 });
  });

  it('returns the same reference when pruning changes nothing', () => {
    const state = setPosition(EMPTY_POSITION_STATE, ref('b', 'd', 'kept'), { x: 2, y: 2 });
    expect(pruneMissingNodes(state, 'b', 'd', new Set(['kept']))).toBe(state);
  });
});
