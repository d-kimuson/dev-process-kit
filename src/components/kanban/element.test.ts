import { afterEach, describe, expect, it } from 'vitest';

import { DpkComponentKanban } from './element';
import { defineKanban } from './index';

defineKanban();

const raw = {
  columns: [
    {
      id: 'todo',
      label: 'ToDo',
      cards: [
        { id: 'login', title: 'ログイン画面', tags: ['UI'], assignee: 'kimura' },
        { id: 'api', title: '注文 API', description: '冪等キーを受け付ける。', tags: ['API'] },
      ],
    },
    {
      id: 'doing',
      label: '作業中',
      color: 'blue',
      limit: 1,
      cards: [{ id: 'stock', title: '在庫の仮確保', questions: 'Q1' }],
    },
    { id: 'done', label: '完了', cards: [] },
  ],
};

afterEach(() => {
  document.body.replaceChildren();
});

const settle = async (element: DpkComponentKanban): Promise<void> => {
  for (let index = 0; index < 3; index++) await element.updateComplete;
};

const mount = async (): Promise<DpkComponentKanban> => {
  const element = document.createElement('dpk-component-kanban');
  if (!(element instanceof DpkComponentKanban)) throw new Error('did not upgrade');
  element.id = 'board';
  element.innerHTML = `<script type="application/json">${JSON.stringify(raw)}</script>`;
  document.body.append(element);
  await settle(element);
  return element;
};

/** Stand-in for the page: accept each action, then hand the recorded draft back. */
const acceptActions = (element: DpkComponentKanban): void => {
  element.addEventListener('dpk-element-action', (event) => {
    if (!(event instanceof CustomEvent)) return;
    event.preventDefault();
    const detail: { type: string; target: string; payload: unknown } = event.detail;
    element.elementActions = [
      ...element.elementActions,
      {
        id: `a${element.elementActions.length}`,
        type: detail.type,
        target: { type: 'element', id: detail.target.slice('element:'.length) },
        payload: detail.payload,
        createdAt: '2026-09-24T00:00:00.000Z',
      },
    ];
  });
};

const layout = (element: DpkComponentKanban): Record<string, (string | undefined)[]> =>
  Object.fromEntries(
    [...element.renderRoot.querySelectorAll<HTMLElement>('[data-column]')].map(
      (column): [string, (string | undefined)[]] => [
        column.dataset['column'] ?? '',
        [...column.querySelectorAll<HTMLElement>('[data-card]')].map((card) => card.dataset['card']),
      ],
    ),
  );

const drag = (target: Element, type: string, clientY = 0): void => {
  const event = new Event(type, { bubbles: true, cancelable: true, composed: true });
  Object.assign(event, { clientY, dataTransfer: null });
  target.dispatchEvent(event);
};

const cardList = (element: DpkComponentKanban, column: string): HTMLElement => {
  const list = element.renderRoot.querySelector<HTMLElement>(`[data-column="${column}"] .kanban-cards`);
  if (!list) throw new Error(`no column ${column}`);
  return list;
};

const card = (element: DpkComponentKanban, id: string): HTMLElement => {
  const found = element.renderRoot.querySelector<HTMLElement>(`[data-card="${id}"]`);
  if (!found) throw new Error(`no card ${id}`);
  return found;
};

describe('<dpk-component-kanban>', () => {
  it('renders the columns with their cards in order', async () => {
    const element = await mount();
    expect(layout(element)).toEqual({ todo: ['login', 'api'], doing: ['stock'], done: [] });
    expect(card(element, 'login').textContent).toContain('kimura');
    expect(card(element, 'api').getAttribute('title')).toBe('冪等キーを受け付ける。');
    expect(card(element, 'stock').dataset['grillQuestions']).toBe('Q1');
  });

  it('shows the WIP limit and flags a column over it', async () => {
    const element = await mount();
    const doing = element.renderRoot.querySelector<HTMLElement>('[data-column="doing"]');
    expect(doing?.querySelector('.kanban-count')?.textContent?.trim()).toBe('1 / 1');
    expect(doing?.className).not.toContain('is-over');
    acceptActions(element);
    element.elementActions = [
      {
        id: 'x',
        type: 'MOVE_CARD',
        target: { type: 'element', id: 'board/card/api' },
        payload: { column: 'doing', before: null },
        createdAt: '2026-09-24T00:00:00.000Z',
      },
    ];
    await settle(element);
    const over = element.renderRoot.querySelector<HTMLElement>('[data-column="doing"]');
    expect(over?.className).toContain('is-over');
    expect(over?.querySelector('.kanban-count')?.textContent?.trim()).toBe('2 / 1');
  });

  it('hides cards the tag filter excludes and keeps every column', async () => {
    const element = await mount();
    element.tagFilter = { active: ['API'], match: 'single' };
    await settle(element);
    expect(layout(element)).toEqual({ todo: ['api'], doing: [], done: [] });
  });

  it('offers every column and card as a comment target, filtered or not', async () => {
    const element = await mount();
    element.tagFilter = { active: ['API'], match: 'single' };
    await settle(element);
    expect(element.commentTargets.map((target) => [target.value, target.label])).toEqual([
      ['element:board/column/todo', 'ToDo'],
      ['element:board/column/doing', '作業中'],
      ['element:board/column/done', '完了'],
      ['element:board/card/login', 'ログイン画面'],
      ['element:board/card/api', '注文 API'],
      ['element:board/card/stock', '在庫の仮確保'],
    ]);
  });

  it('colors a column heading only when the column asks for it', async () => {
    const element = await mount();
    const column = (id: string) => element.renderRoot.querySelector<HTMLElement>(`[data-column="${id}"]`);
    expect(column('doing')?.dataset['color']).toBe('blue');
    expect(column('todo')?.hasAttribute('data-color')).toBe(false);
  });

  it('selects a card with the keyboard, without any move controls', async () => {
    const element = await mount();
    card(element, 'login').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await settle(element);
    expect(element.selection).toEqual({ kind: 'card', id: 'login' });
    expect(card(element, 'login').className).toContain('is-selected');
    expect(element.renderRoot.querySelector('[data-move]')).toBeNull();
  });

  it('records a dropped card through the hosting template, before the card under the pointer', async () => {
    const element = await mount();
    acceptActions(element);
    // happy-dom lays nothing out: every card's box is at 0, so the pointer below it means "after".
    drag(card(element, 'login'), 'dragstart');
    drag(cardList(element, 'doing'), 'dragover', 100);
    await settle(element);
    expect(element.renderRoot.querySelector('[data-column="doing"] .kanban-drop-marker')).not.toBeNull();
    drag(cardList(element, 'doing'), 'drop', 100);
    await settle(element);
    expect(element.elementActions[0]).toMatchObject({
      type: 'MOVE_CARD',
      target: { id: 'board/card/login' },
      payload: { column: 'doing', before: null },
    });
    expect(layout(element)).toEqual({ todo: ['api'], doing: ['stock', 'login'], done: [] });
    expect(element.renderRoot.querySelector('.kanban-drop-marker')).toBeNull();
    expect(card(element, 'login').className).toContain('is-moved');
    expect(element.selection).toEqual({ kind: 'card', id: 'login' });
    expect(element.elementActionResults).toEqual([
      { id: 'a0', title: 'カードを移動', summary: 'ログイン画面: ToDo → 作業中', tone: 'move' },
    ]);
    // Dropping a card where it already is records nothing.
    drag(card(element, 'api'), 'dragstart');
    drag(cardList(element, 'todo'), 'drop', 100);
    await settle(element);
    expect(element.elementActions).toHaveLength(1);
  });

  it('keeps the board and shows an error when no template records a drop', async () => {
    const element = await mount();
    drag(card(element, 'login'), 'dragstart');
    drag(cardList(element, 'done'), 'drop', 100);
    await settle(element);
    expect(layout(element)).toEqual({ todo: ['login', 'api'], doing: ['stock'], done: [] });
    const slot = card(element, 'login').closest('.kanban-card-slot');
    expect(slot?.querySelector('[role="alert"]')).not.toBeNull();
  });

  const typeCard = async (element: DpkComponentKanban, column: string, title: string): Promise<HTMLInputElement> => {
    element.renderRoot.querySelector<HTMLButtonElement>(`[data-column="${column}"] [data-action="add"]`)?.click();
    await settle(element);
    const input = element.renderRoot.querySelector<HTMLInputElement>(`[data-column="${column}"] .kanban-add input`);
    if (!input) throw new Error('no input');
    input.value = title;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await settle(element);
    return input;
  };

  it('records a new card through the hosting template and selects it', async () => {
    const element = await mount();
    acceptActions(element);
    await typeCard(element, 'done', '監査ログ');
    const [action] = element.elementActions;
    const id = element.selection?.id ?? '';
    expect(action).toMatchObject({ type: 'ADD_CARD', target: { id: 'board/column/done' } });
    expect(action?.payload).toEqual({ id, title: '監査ログ' });
    expect(layout(element)['done']).toEqual([id]);
    expect(card(element, id).className).toContain('is-added');
    expect(element.commentTargets.map((target) => target.value)).toContain(`element:board/card/${id}`);
  });

  it('keeps the typed title when no template records the card', async () => {
    const element = await mount();
    const input = await typeCard(element, 'done', '保留');
    expect(input.isConnected).toBe(true);
    expect(input.value).toBe('保留');
    expect(element.renderRoot.querySelector('[data-column="done"] .kanban-add [role="alert"]')).not.toBeNull();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await settle(element);
    expect(element.renderRoot.querySelector('.kanban-add input')).toBeNull();
  });

  it('asks for a comment on a column or a card', async () => {
    const element = await mount();
    const triggers = [...element.renderRoot.querySelectorAll<HTMLElement>('[data-comment-kind]')].map(
      (trigger) => `${trigger.dataset['commentKind']}/${trigger.dataset['commentId']}`,
    );
    expect(triggers).toEqual(['column/todo', 'card/login', 'card/api', 'column/doing', 'card/stock', 'column/done']);
  });
});
