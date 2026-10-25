import { describe, expect, it } from 'vitest';

import { EMPTY_POSITION_STATE, setPosition } from './layout-position';
import { memoryPositionStore, parsePositionState, positionStorageKey } from './layout-position-storage';

describe('layout-position-storage', () => {
  it('parses a well-formed record', () => {
    const value = { v: 1, overrides: [{ board: 'b', diagram: 'd', node: 'n', position: { x: 1, y: 2 } }] };
    expect(parsePositionState(value)).toEqual(value);
  });

  it('rejects malformed input instead of throwing', () => {
    expect(parsePositionState(null)).toBeNull();
    expect(parsePositionState('garbage')).toBeNull();
    expect(parsePositionState({ v: 2, overrides: [] })).toBeNull();
    expect(parsePositionState({ v: 1, overrides: [{ board: 'b', node: 'n', position: { x: 1, y: 2 } }] })).toBeNull();
    expect(
      parsePositionState({ v: 1, overrides: [{ board: 'b', diagram: 'd', node: 'n', position: { x: 'nope' } }] }),
    ).toBeNull();
  });

  it('round-trips through a store', () => {
    const store = memoryPositionStore();
    const key = positionStorageKey('/lp/diagrams.html');
    expect(store.read(key)).toBeNull();
    const state = setPosition(EMPTY_POSITION_STATE, { board: 'b', diagram: 'd', node: 'n' }, { x: 5, y: 6 });
    expect(store.write(key, state)).toBe(true);
    expect(store.read(key)).toEqual(state);
  });

  it('keys storage by path, so different pages do not collide', () => {
    const a = positionStorageKey('/lp/diagrams.html');
    const b = positionStorageKey('/lp/other.html');
    expect(a).not.toBe(b);
  });
});
