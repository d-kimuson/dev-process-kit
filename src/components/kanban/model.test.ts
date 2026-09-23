import { describe, expect, it } from 'vitest';

import { isSamePosition, parseKanbanData, reduceKanbanActions, visibleKanban, type KanbanData } from './model';

const rawBoard = {
  columns: [
    {
      id: 'todo',
      label: 'ToDo',
      cards: [
        { id: 'login', title: 'ログイン画面', tags: ['UI'], assignee: 'kimura' },
        { id: 'api', title: '注文 API', description: '冪等キーを受け付ける。', tags: ['API'] },
        { id: 'mail', title: '通知メール' },
      ],
    },
    {
      id: 'doing',
      label: '作業中',
      color: 'blue',
      limit: 2,
      cards: [{ id: 'stock', title: '在庫の仮確保', tags: ['API'], questions: 'Q1' }],
    },
    { id: 'done', label: '完了', description: 'レビュー済み', cards: [] },
  ],
};

const data = (): KanbanData => parseKanbanData(rawBoard);

const cardIds = (board: KanbanData): Record<string, readonly string[]> =>
  Object.fromEntries(board.columns.map((column) => [column.id, column.cards.map((card) => card.id)]));

const action = (id: string, type: string, target: string, payload: unknown) => ({
  id,
  type,
  target: { type: 'element', id: `board/${target}` },
  payload,
  createdAt: '2026-09-24T00:00:00.000Z',
});

describe('kanban data', () => {
  it('keeps the authored columns and card order, and knows where each card lives', () => {
    const board = data();
    expect(cardIds(board)).toEqual({ todo: ['login', 'api', 'mail'], doing: ['stock'], done: [] });
    const api = board.columns[0]?.cards[1];
    expect(api).toMatchObject({
      column: 'todo',
      description: '冪等キーを受け付ける。',
      tags: ['API'],
      assignee: null,
      change: null,
    });
    expect(board.columns[1]).toMatchObject({ limit: 2, description: null, color: 'blue' });
    expect(board.columns[2]).toMatchObject({ limit: null, description: 'レビュー済み', color: null });
    expect(board.columns[1]?.cards[0]?.questions).toBe('Q1');
  });

  it('rejects duplicate ids, a non-positive limit and unknown keys', () => {
    expect(() =>
      parseKanbanData({
        columns: [
          { id: 'a', label: 'A', cards: [] },
          { id: 'a', label: 'B', cards: [] },
        ],
      }),
    ).toThrow(/duplicate column id/);
    expect(() =>
      parseKanbanData({
        columns: [
          { id: 'a', label: 'A', cards: [{ id: 'x', title: 'X' }] },
          { id: 'b', label: 'B', cards: [{ id: 'x', title: 'Y' }] },
        ],
      }),
    ).toThrow(/duplicate card id/);
    expect(() => parseKanbanData({ columns: [{ id: 'a', label: 'A', limit: 0, cards: [] }] })).toThrow();
    expect(() => parseKanbanData({ columns: [{ id: 'a', label: 'A', cards: [], typo: 1 }] })).toThrow();
    // Colors come from the theme palette, so they follow light and dark themes.
    expect(() => parseKanbanData({ columns: [{ id: 'a', label: 'A', color: '#ff0000' }] })).toThrow();
    expect(() => parseKanbanData({})).toThrow();
  });

  it('allows a column without cards', () => {
    expect(parseKanbanData({ columns: [{ id: 'a', label: 'A' }] }).columns[0]?.cards).toEqual([]);
  });
});

describe('kanban element actions', () => {
  it('adds a card at the end of a column, marked as added', () => {
    const { data: next, results } = reduceKanbanActions(data(), [
      action('a1', 'ADD_CARD', 'column/doing', { id: 'refund', title: '返金' }),
    ]);
    expect(cardIds(next)['doing']).toEqual(['stock', 'refund']);
    expect(next.columns[1]?.cards[1]).toMatchObject({ column: 'doing', title: '返金', tags: [], change: 'added' });
    expect(results).toEqual([{ id: 'a1', title: 'カードを追加', summary: '作業中 › 返金', tone: 'create' }]);
  });

  it('moves a card before another card, or to the end of a column', () => {
    const { data: next, results } = reduceKanbanActions(data(), [
      action('m1', 'MOVE_CARD', 'card/api', { column: 'doing', before: 'stock' }),
      action('m2', 'MOVE_CARD', 'card/mail', { column: 'todo', before: 'login' }),
      action('m3', 'MOVE_CARD', 'card/login', { column: 'done', before: null }),
    ]);
    expect(cardIds(next)).toEqual({ todo: ['mail'], doing: ['api', 'stock'], done: ['login'] });
    expect(next.columns[1]?.cards[0]).toMatchObject({ id: 'api', column: 'doing', change: 'moved' });
    expect(next.columns[1]?.cards[1]?.change).toBeNull();
    expect(results).toEqual([
      { id: 'm1', title: 'カードを移動', summary: '注文 API: ToDo → 作業中', tone: 'move' },
      { id: 'm2', title: 'カードを移動', summary: '通知メール: ToDo 内で並べ替え', tone: 'move' },
      { id: 'm3', title: 'カードを移動', summary: 'ログイン画面: ToDo → 完了', tone: 'move' },
    ]);
  });

  it('builds on cards added earlier, which stay marked as added when moved', () => {
    const { data: next, results } = reduceKanbanActions(data(), [
      action('a1', 'ADD_CARD', 'column/todo', { id: 'audit', title: '監査ログ' }),
      action('m1', 'MOVE_CARD', 'card/audit', { column: 'done', before: null }),
    ]);
    expect(cardIds(next)['done']).toEqual(['audit']);
    expect(next.columns[2]?.cards[0]?.change).toBe('added');
    expect(results.map((result) => result.stale)).toEqual([undefined, undefined]);
  });

  it('reports what it cannot apply and leaves the data alone', () => {
    const base = data();
    const { data: next, results } = reduceKanbanActions(base, [
      action('gone-column', 'ADD_CARD', 'column/nowhere', { id: 'x', title: 'X' }),
      action('dup', 'ADD_CARD', 'column/todo', { id: 'api', title: '注文 API' }),
      action('blank', 'ADD_CARD', 'column/todo', { id: 'y', title: '  ' }),
      action('gone-card', 'MOVE_CARD', 'card/nowhere', { column: 'done', before: null }),
      action('no-column', 'MOVE_CARD', 'card/api', { column: 'nowhere', before: null }),
      action('elsewhere', 'MOVE_CARD', 'card/api', { column: 'done', before: 'stock' }),
      action('itself', 'MOVE_CARD', 'card/api', { column: 'todo', before: 'api' }),
      action('odd', 'RENAME_CARD', 'card/api', {}),
    ]);
    expect(next).toBe(base);
    expect(results.map((result) => [result.id, result.stale])).toEqual([
      ['gone-column', 'target-missing'],
      ['dup', 'constraint-violated'],
      ['blank', 'constraint-violated'],
      ['gone-card', 'target-missing'],
      ['no-column', 'constraint-violated'],
      ['elsewhere', 'constraint-violated'],
      ['itself', 'constraint-violated'],
      ['odd', 'unsupported-action-type'],
    ]);
  });
});

describe('kanban positions', () => {
  it('filters cards and keeps every column', () => {
    const visible = visibleKanban(data(), (card) => card.tags.includes('API'));
    expect(cardIds(visible)).toEqual({ todo: ['api'], doing: ['stock'], done: [] });
  });

  it('recognises a drop that leaves the card where it is', () => {
    const board = data();
    expect(isSamePosition(board, 'login', 'todo', 'api')).toBe(true);
    expect(isSamePosition(board, 'login', 'todo', 'login')).toBe(true);
    expect(isSamePosition(board, 'mail', 'todo', null)).toBe(true);
    expect(isSamePosition(board, 'login', 'todo', 'mail')).toBe(false);
    expect(isSamePosition(board, 'login', 'doing', null)).toBe(false);
  });
});
