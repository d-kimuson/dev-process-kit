import { describe, expect, it } from 'vitest';

import { allInColumn, bulkMoveActions, bulkTagActions, cardRange, tagCoverage, toggleCard } from './bulk';
import { ADD_CARD_TAG, MOVE_CARD, parseKanbanData, REMOVE_CARD_TAG } from './model';

const data = parseKanbanData({
  columns: [
    {
      id: 'todo',
      label: 'ToDo',
      cards: [
        { id: 'a', title: 'A', tags: ['UI'] },
        { id: 'b', title: 'B' },
      ],
    },
    { id: 'doing', label: 'Doing', cards: [{ id: 'c', title: 'C', tags: ['UI'] }] },
  ],
});

describe('kanban bulk actions', () => {
  it('toggles a card in and out of the picked cards', () => {
    expect(toggleCard(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleCard(['a', 'b'], 'a')).toEqual(['b']);
  });

  it('picks the cards between the anchor and the target, either way round', () => {
    const order = ['a', 'b', 'c', 'd'];
    expect(cardRange(order, 'b', 'd')).toEqual(['b', 'c', 'd']);
    expect(cardRange(order, 'c', 'a')).toEqual(['a', 'b', 'c']);
    expect(cardRange(order, 'gone', 'c')).toEqual(['c']);
  });

  it('moves only the cards that are elsewhere, in board order', () => {
    expect(bulkMoveActions(data, ['c', 'a', 'b'], 'doing')).toEqual([
      { type: MOVE_CARD, element: ['card', 'a'], payload: { column: 'doing', before: null } },
      { type: MOVE_CARD, element: ['card', 'b'], payload: { column: 'doing', before: null } },
    ]);
    expect(allInColumn(data, ['a', 'b'], 'todo')).toBe(true);
    expect(allInColumn(data, ['a', 'c'], 'todo')).toBe(false);
  });

  it('says how many picked cards carry a tag', () => {
    expect(tagCoverage(data, ['a', 'c'], 'UI')).toBe('all');
    expect(tagCoverage(data, ['a', 'b'], 'UI')).toBe('some');
    expect(tagCoverage(data, ['b'], 'UI')).toBe('none');
  });

  it('tags only the cards without the tag, and untags only those with it', () => {
    expect(bulkTagActions(data, ['a', 'b'], 'UI', true)).toEqual([
      { type: ADD_CARD_TAG, element: ['card', 'b'], payload: { tag: 'UI' } },
    ]);
    expect(bulkTagActions(data, ['a', 'b', 'c'], 'UI', false)).toEqual([
      { type: REMOVE_CARD_TAG, element: ['card', 'a'], payload: { tag: 'UI' } },
      { type: REMOVE_CARD_TAG, element: ['card', 'c'], payload: { tag: 'UI' } },
    ]);
  });
});
