import { describe, expect, it } from 'vitest';

import { reorderAnchor } from './reorder';

describe('reorderAnchor', () => {
  const ids = ['a', 'b', 'c', 'd'];

  it('lets an item dropped within its own list take the hovered slot, whichever half is hovered', () => {
    // moving down lands after the hovered item, moving up lands before it
    expect(reorderAnchor(ids, 'a', 'b', 'before')).toBe('b');
    expect(reorderAnchor(ids, 'a', 'b', 'after')).toBe('b');
    expect(reorderAnchor(ids, 'a', 'd', 'before')).toBe('d');
    expect(reorderAnchor(ids, 'c', 'b', 'after')).toBe('a');
    expect(reorderAnchor(ids, 'c', 'b', 'before')).toBe('a');
    expect(reorderAnchor(ids, 'c', 'a', 'after')).toBeNull();
  });

  it('keeps an item dropped on itself in place', () => {
    expect(reorderAnchor(ids, 'c', 'c', 'before')).toBe('b');
    expect(reorderAnchor(ids, 'a', 'a', 'after')).toBeNull();
  });

  it('uses the midpoint for an item coming from another list', () => {
    expect(reorderAnchor(ids, 'x', 'b', 'before')).toBe('a');
    expect(reorderAnchor(ids, 'x', 'b', 'after')).toBe('b');
    expect(reorderAnchor(ids, 'x', 'a', 'before')).toBeNull();
  });

  it('appends on empty space or an unknown hovered id', () => {
    expect(reorderAnchor(ids, 'b', null, 'end')).toBe('d');
    expect(reorderAnchor(ids, 'd', null, 'end')).toBe('c');
    expect(reorderAnchor(ids, 'x', 'gone', 'before')).toBe('d');
    expect(reorderAnchor([], 'x', null, 'end')).toBeNull();
  });
});
