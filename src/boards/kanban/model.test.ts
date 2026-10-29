import { describe, expect, it } from 'vitest';

import { kanbanMessages } from './messages';
import {
  allCards,
  cardKey,
  isSamePosition,
  nextCardNumber,
  parseKanbanData,
  reduceKanbanActions,
  visibleKanban,
  type KanbanData,
} from './model';

const m = kanbanMessages('en');

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

describe('kanban card numbers', () => {
  const numbered = (): KanbanData =>
    parseKanbanData({
      columns: [
        {
          id: 'todo',
          label: 'ToDo',
          cards: [
            { id: 'a', title: 'A', number: 4 },
            { id: 'b', title: 'B' },
          ],
        },
        {
          id: 'doing',
          label: '作業中',
          cards: [
            { id: 'c', title: 'C' },
            { id: 'd', title: 'D', number: 1 },
          ],
        },
      ],
    });

  it('keeps authored numbers and gives the others the next ones after the highest, in board order', () => {
    const board = numbered();
    expect(allCards(board).map((card) => [card.id, card.number])).toEqual([
      ['a', 4],
      ['b', 5],
      ['c', 6],
      ['d', 1],
    ]);
    expect(allCards(board).map(cardKey)).toEqual(['TASK-4', 'TASK-5', 'TASK-6', 'TASK-1']);
  });

  it('numbers a board without authored numbers from 1, and knows the next one', () => {
    const board = data();
    expect(new Set(allCards(board).map((card) => card.number))).toEqual(new Set([1, 2, 3, 4]));
    expect(nextCardNumber(board)).toBe(5);
    expect(nextCardNumber(parseKanbanData({ columns: [] }))).toBe(1);
    expect(cardKey({ number: 12 })).toBe('TASK-12');
  });

  it('rejects duplicate and invalid numbers', () => {
    expect(() =>
      parseKanbanData({
        columns: [
          {
            id: 'a',
            label: 'A',
            cards: [
              { id: 'x', title: 'X', number: 2 },
              { id: 'y', title: 'Y', number: 2 },
            ],
          },
        ],
      }),
    ).toThrow(/duplicate card number: 2/);
    expect(() =>
      parseKanbanData({ columns: [{ id: 'a', label: 'A', cards: [{ id: 'x', title: 'X', number: 0 }] }] }),
    ).toThrow();
    expect(() =>
      parseKanbanData({ columns: [{ id: 'a', label: 'A', cards: [{ id: 'x', title: 'X', number: 1.5 }] }] }),
    ).toThrow();
  });
});

describe('kanban element actions', () => {
  it('adds a card at the end of a column, marked as added', () => {
    const { data: next, results } = reduceKanbanActions(m, data(), [
      action('a1', 'ADD_CARD', 'column/doing', { id: 'refund', title: '返金' }),
    ]);
    expect(cardIds(next)['doing']).toEqual(['stock', 'refund']);
    expect(next.columns[1]?.cards[1]).toMatchObject({ column: 'doing', title: '返金', tags: [], change: 'added' });
    expect(results).toEqual([
      { id: 'a1', title: m.addCardTitle, summary: m.addSummary('作業中', '返金'), tone: 'create' },
    ]);
  });

  it('moves a card before another card, or to the end of a column', () => {
    const { data: next, results } = reduceKanbanActions(m, data(), [
      action('m1', 'MOVE_CARD', 'card/api', { column: 'doing', before: 'stock' }),
      action('m2', 'MOVE_CARD', 'card/mail', { column: 'todo', before: 'login' }),
      action('m3', 'MOVE_CARD', 'card/login', { column: 'done', before: null }),
    ]);
    expect(cardIds(next)).toEqual({ todo: ['mail'], doing: ['api', 'stock'], done: ['login'] });
    expect(next.columns[1]?.cards[0]).toMatchObject({ id: 'api', column: 'doing', change: 'moved' });
    expect(next.columns[1]?.cards[1]?.change).toBeNull();
    expect(results).toEqual([
      { id: 'm1', title: m.moveCardTitle, summary: m.moveSummaryAcross('注文 API', 'ToDo', '作業中'), tone: 'move' },
      { id: 'm2', title: m.moveCardTitle, summary: m.moveSummarySame('通知メール', 'ToDo'), tone: 'move' },
      { id: 'm3', title: m.moveCardTitle, summary: m.moveSummaryAcross('ログイン画面', 'ToDo', '完了'), tone: 'move' },
    ]);
  });

  it('numbers a new card after the highest, and keeps the number a stored draft names', () => {
    const { data: next, results } = reduceKanbanActions(m, data(), [
      action('a1', 'ADD_CARD', 'column/done', { id: 'audit', title: '監査ログ' }),
      action('a2', 'ADD_CARD', 'column/done', { id: 'billing', title: '請求', number: 9 }),
      action('a3', 'ADD_CARD', 'column/todo', { id: 'resend', title: '再送' }),
    ]);
    expect(next.columns[2]?.cards.map((card) => [card.id, card.number])).toEqual([
      ['audit', 5],
      ['billing', 9],
    ]);
    expect(next.columns[0]?.cards.at(-1)).toMatchObject({ id: 'resend', number: 10 });
    expect(results.map((result) => result.stale)).toEqual([undefined, undefined, undefined]);
  });

  it('rejects a new card whose number is already taken', () => {
    const base = data();
    const { data: next, results } = reduceKanbanActions(m, base, [
      action('taken', 'ADD_CARD', 'column/todo', { id: 'x', title: 'X', number: 2 }),
      action('invalid', 'ADD_CARD', 'column/todo', { id: 'y', title: 'Y', number: 0 }),
    ]);
    expect(next).toBe(base);
    expect(results.map((result) => result.stale)).toEqual(['constraint-violated', 'constraint-violated']);
  });

  it('builds on cards added earlier, which stay marked as added when moved', () => {
    const { data: next, results } = reduceKanbanActions(m, data(), [
      action('a1', 'ADD_CARD', 'column/todo', { id: 'audit', title: '監査ログ' }),
      action('m1', 'MOVE_CARD', 'card/audit', { column: 'done', before: null }),
    ]);
    expect(cardIds(next)['done']).toEqual(['audit']);
    expect(next.columns[2]?.cards[0]?.change).toBe('added');
    expect(results.map((result) => result.stale)).toEqual([undefined, undefined]);
  });

  it('reports what it cannot apply and leaves the data alone', () => {
    const base = data();
    const { data: next, results } = reduceKanbanActions(m, base, [
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
