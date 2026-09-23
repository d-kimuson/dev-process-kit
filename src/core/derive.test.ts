import { describe, expect, it } from 'vitest';

import type { DraftAction } from './types';

import { derive } from './derive';
import { tinyBase, tinyDefinition } from './testing/tiny-template';

const action = (partial: Partial<DraftAction> & Pick<DraftAction, 'type'>): DraftAction => {
  return {
    id: partial.id ?? `${partial.type}-${Math.random().toString(36).slice(2, 7)}`,
    type: partial.type,
    target: partial.target ?? { type: 'item', id: 'a' },
    payload: partial.payload ?? {},
    createdAt: partial.createdAt ?? '2026-01-01T00:00:00.000Z',
  };
};

describe('derive', () => {
  const base = tinyBase([
    { id: 'a', name: 'Alpha' },
    { id: 'b', name: 'Beta' },
  ]);

  it('reduces in dispatch order', () => {
    const result = derive(tinyDefinition, base, [
      action({
        type: 'SET_NAME',
        target: { type: 'item', id: 'b' },
        payload: { name: 'B2' },
      }),
      action({
        type: 'REORDER',
        target: { type: 'item', id: 'b' },
        payload: { after: null },
      }),
    ]);
    expect(result.state.items.map((item) => item.id)).toEqual(['b', 'a']);
    expect(result.state.items[0]?.name).toBe('B2');
    expect(result.applied).toHaveLength(2);
  });

  it('does not mutate the base state', () => {
    const before = JSON.stringify(base);
    derive(tinyDefinition, base, [action({ type: 'SET_NAME', payload: { name: 'Changed' } })]);
    expect(JSON.stringify(base)).toBe(before);
  });

  it('separates obsolete, stale and applied actions', () => {
    const result = derive(tinyDefinition, base, [
      action({ id: 'noop', type: 'SET_NAME', payload: { name: 'Alpha' } }),
      action({
        id: 'ghost',
        type: 'SET_NAME',
        target: { type: 'item', id: 'zz' },
        payload: { name: 'Z' },
      }),
      action({ id: 'real', type: 'SET_NAME', payload: { name: 'Alpha2' } }),
    ]);
    expect(result.obsolete.map((entry) => entry.id)).toEqual(['noop']);
    expect(result.stale.map((entry) => entry.action.id)).toEqual(['ghost']);
    expect(result.applied.map((entry) => entry.id)).toEqual(['real']);
    expect(result.actions).toHaveLength(3);
  });

  it('reports unsupported action types as stale', () => {
    const result = derive(tinyDefinition, base, [action({ id: 'x', type: 'FROM_THE_FUTURE' })]);
    expect(result.stale[0]?.reason).toBe('unsupported-action-type');
    expect(result.state).toEqual(base);
  });

  it('treats artifact-wide comments as always applicable', () => {
    const result = derive(tinyDefinition, base, [
      action({ id: 'wide', type: 'comment', target: { type: 'artifact', id: 'tiny' }, payload: { body: 'whole doc' } }),
    ]);
    expect(result.stale).toHaveLength(0);
    expect(result.comments.map((entry) => entry.id)).toEqual(['wide']);
  });

  it('collects comments per target in dispatch order', () => {
    const result = derive(tinyDefinition, base, [
      action({
        id: 'c1',
        type: 'comment',
        target: { type: 'item', id: 'a' },
        payload: { body: 'first' },
      }),
      action({
        id: 'c2',
        type: 'comment',
        target: { type: 'item', id: 'b' },
        payload: { body: 'second' },
      }),
      action({
        id: 'c3',
        type: 'comment',
        target: { type: 'item', id: 'a' },
        payload: { body: 'third' },
      }),
    ]);
    expect(result.comments.map((entry) => entry.id)).toEqual(['c1', 'c2', 'c3']);
    expect(result.commentsByTarget.get('item:a')?.map((entry) => entry.id)).toEqual(['c1', 'c3']);
  });
});
