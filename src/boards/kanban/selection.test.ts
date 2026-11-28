import { afterEach, describe, expect, it } from 'vitest';

import type { DpkSelectionBar } from '../../components/selection-bar/index';

import { AppElement } from '../../core/app/element';
import { PANEL_HOST, type PanelHost } from '../../core/panel/host';
import { DpkBoardKanban } from './element';
import '../../index';

const raw = {
  columns: [
    {
      id: 'todo',
      label: 'ToDo',
      cards: [
        { id: 'login', title: 'ログイン画面', tags: ['UI'] },
        { id: 'api', title: '注文 API', tags: ['API'] },
        { id: 'mail', title: '確認メール' },
      ],
    },
    { id: 'doing', label: '作業中', cards: [{ id: 'stock', title: '在庫の仮確保', tags: ['UI'] }] },
  ],
};

afterEach(() => {
  document.body.replaceChildren();
});

const settle = async (element: DpkBoardKanban): Promise<void> => {
  for (let index = 0; index < 3; index++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await element.updateComplete;
    await barOf(element)?.updateComplete;
  }
};

const card = (element: DpkBoardKanban, id: string): HTMLElement => {
  const found = element.renderRoot.querySelector<HTMLElement>(`[data-card="${id}"]`);
  if (!found) throw new Error(`no card ${id}`);
  return found;
};

const barOf = (element: DpkBoardKanban): DpkSelectionBar | null =>
  element.renderRoot.querySelector<DpkSelectionBar>('dpk-selection-bar');

const barRoot = (element: DpkBoardKanban): ShadowRoot => {
  const root = barOf(element)?.shadowRoot;
  if (!root) throw new Error('no selection bar');
  return root;
};

const pressed = (element: DpkBoardKanban): (string | undefined)[] =>
  [...element.renderRoot.querySelectorAll<HTMLElement>('[data-card][aria-pressed="true"]')].map(
    (found) => found.dataset['card'],
  );

const click = (target: HTMLElement, init: MouseEventInit = {}): void => {
  target.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, ...init }));
};

const key = (target: HTMLElement, init: KeyboardEventInit): void => {
  target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, composed: true, cancelable: true, ...init }));
};

/** Opens an action's menu on the bar and returns its choices. */
const openMenu = async (element: DpkBoardKanban, action: string): Promise<HTMLElement[]> => {
  barRoot(element).querySelector<HTMLButtonElement>(`[data-action="${action}"]`)?.click();
  await settle(element);
  return [...barRoot(element).querySelectorAll<HTMLElement>('.menu [data-value]')];
};

type FakePanel = { readonly opened: (string | undefined)[]; isOpen: boolean };

/** Stand-in for the side panel's owner: records what the board asks of it. */
const withPanel = async (element: DpkBoardKanban): Promise<FakePanel> => {
  const panel: FakePanel = { opened: [], isOpen: false };
  const host: PanelHost = {
    provideDetail: () => () => undefined,
    showDetail: (_source, _detail, report) => {
      if (report === 'open') panel.opened.push('detail');
    },
    addSection: () => () => undefined,
    invalidate: () => undefined,
    provideSettings: () => () => undefined,
    close: () => undefined,
    open: (section) => panel.opened.push(section),
    section: 'detail',
    tabs: [],
    subscribe: () => () => undefined,
    get isOpen() {
      return panel.isOpen;
    },
  };
  const owner = document.createElement('div');
  Object.defineProperty(owner, PANEL_HOST, { value: host });
  element.before(owner);
  owner.append(element);
  await settle(element);
  return panel;
};

const mount = async (): Promise<{ element: DpkBoardKanban; panel: FakePanel }> => {
  const element = document.createElement('dpk-board-kanban');
  if (!(element instanceof DpkBoardKanban)) throw new Error('did not upgrade');
  element.id = 'board';
  element.setAttribute('lang', 'ja');
  element.innerHTML = `<script type="application/json">${JSON.stringify(raw)}</script>`;
  document.body.append(element);
  return { element, panel: await withPanel(element) };
};

describe('picking several kanban cards', () => {
  it('adds and takes out cards with Cmd/Ctrl, and shows the selection bar while two or more are picked', async () => {
    const { element, panel } = await mount();
    click(card(element, 'login'));
    await settle(element);
    expect(barOf(element)).toBeNull();
    expect(panel.opened).toEqual(['detail']);

    click(card(element, 'stock'), { metaKey: true });
    await settle(element);
    expect(pressed(element)).toEqual(['login', 'stock']);
    expect(barRoot(element).querySelector('.count')?.textContent).toBe('2 件選択');
    expect(panel.opened).toEqual(['detail']);

    click(card(element, 'login'), { ctrlKey: true });
    await settle(element);
    expect(pressed(element)).toEqual(['stock']);
    expect(element.selection).toEqual({ kind: 'card', id: 'stock' });
    expect(barOf(element)).toBeNull();
  });

  it('picks the cards between the last picked and the Shift-clicked one, across columns', async () => {
    const { element } = await mount();
    click(card(element, 'api'));
    click(card(element, 'stock'), { shiftKey: true });
    await settle(element);
    expect(pressed(element)).toEqual(['api', 'mail', 'stock']);
    expect(barOf(element)?.count).toBe(3);
  });

  it('picks from the keyboard, and Escape on a card drops the picked cards', async () => {
    const { element } = await mount();
    key(card(element, 'login'), { key: 'Enter' });
    key(card(element, 'api'), { key: ' ', ctrlKey: true });
    await settle(element);
    expect(pressed(element)).toEqual(['login', 'api']);
    key(card(element, 'api'), { key: 'Escape' });
    await settle(element);
    expect(barOf(element)).toBeNull();
  });

  it('drops the picked cards from the bar’s clear button', async () => {
    const { element } = await mount();
    click(card(element, 'login'));
    click(card(element, 'api'), { metaKey: true });
    await settle(element);
    barRoot(element).querySelector<HTMLButtonElement>('[data-role="clear"]')?.click();
    await settle(element);
    expect(barOf(element)).toBeNull();
    expect(pressed(element)).toEqual(['api']);
  });

  it('drops the picked cards on a plain click, which opens that card’s detail as before', async () => {
    const { element } = await mount();
    click(card(element, 'login'));
    click(card(element, 'api'), { metaKey: true });
    click(card(element, 'mail'));
    await settle(element);
    expect(pressed(element)).toEqual(['mail']);
    expect(barOf(element)).toBeNull();
  });

  it('offers the columns the picked cards can move to, and how many of them carry each tag', async () => {
    const { element } = await mount();
    click(card(element, 'login'));
    click(card(element, 'api'), { metaKey: true });
    await settle(element);
    const moves = await openMenu(element, 'move');
    expect(moves.map((move) => [move.dataset['value'], (move as HTMLButtonElement).disabled])).toEqual([
      ['todo', true],
      ['doing', false],
    ]);
    const tags = await openMenu(element, 'tag');
    expect(
      tags.map((tag) => [tag.dataset['value'], tag.getAttribute('aria-checked'), tag.textContent?.trim()]),
    ).toEqual([
      ['UI', 'mixed', expect.stringContaining('1/2')],
      ['API', 'mixed', expect.stringContaining('1/2')],
    ]);
  });
});

describe('bulk actions on a page', () => {
  const mountApp = async (): Promise<{ app: AppElement; element: DpkBoardKanban }> => {
    const app = document.createElement('dpk-app');
    if (!(app instanceof AppElement)) throw new Error('not upgraded');
    app.storage = 'memory';
    app.setAttribute('lang', 'ja');
    app.innerHTML = `<script type="application/json">{"title":"Bulk"}</script>
      <dpk-page name="kanban"><dpk-board-kanban id="board">
        <script type="application/json">${JSON.stringify(raw)}</script>
      </dpk-board-kanban></dpk-page>`;
    document.body.append(app);
    await app.api.ready;
    const element = app.querySelector('dpk-board-kanban');
    if (!(element instanceof DpkBoardKanban)) throw new Error('no board');
    await settle(element);
    click(card(element, 'login'));
    click(card(element, 'mail'), { shiftKey: true });
    await settle(element);
    return { app, element };
  };

  const columnsOf = (element: DpkBoardKanban): Record<string, (string | undefined)[]> =>
    Object.fromEntries(
      [...element.renderRoot.querySelectorAll<HTMLElement>('section[data-column]')].map((column) => [
        column.dataset['column'] ?? '',
        [...column.querySelectorAll<HTMLElement>('[data-card]')].map((found) => found.dataset['card']),
      ]),
    );

  it('moves the picked cards in one batch from the bar, which one undo takes back', async () => {
    const { app, element } = await mountApp();
    const moves = await openMenu(element, 'move');
    moves.find((move) => move.dataset['value'] === 'doing')?.click();
    await settle(element);
    expect(columnsOf(element)).toEqual({ todo: [], doing: ['stock', 'login', 'api', 'mail'] });
    expect(element.api.actions.map((action) => action.type)).toEqual(['MOVE_CARD', 'MOVE_CARD', 'MOVE_CARD']);
    expect(barRoot(element).querySelector('.menu')).toBeNull();

    expect(app.controller.undo()).toBe(true);
    await settle(element);
    expect(columnsOf(element)).toEqual({ todo: ['login', 'api', 'mail'], doing: ['stock'] });
    expect(element.api.actions).toEqual([]);
  });

  it('puts a tag on every picked card and a typed one too, each in one batch', async () => {
    const { app, element } = await mountApp();
    const tags = await openMenu(element, 'tag');
    tags.find((tag) => tag.dataset['value'] === 'UI')?.click();
    await settle(element);
    expect(element.api.actions.map((action) => [action.type, action.target.id])).toEqual([
      ['ADD_CARD_TAG', expect.stringContaining('api')],
      ['ADD_CARD_TAG', expect.stringContaining('mail')],
    ]);
    expect(barRoot(element).querySelector('[data-value="UI"]')?.getAttribute('aria-checked')).toBe('true');

    const input = barRoot(element).querySelector<HTMLInputElement>('.menu .entry');
    if (input === null) throw new Error('no tag entry');
    input.value = '決済';
    key(input, { key: 'Enter' });
    await settle(element);
    expect(
      element.api.actions.filter((action) => JSON.stringify(action.payload) === JSON.stringify({ tag: '決済' })),
    ).toHaveLength(3);

    expect(app.controller.undo()).toBe(true);
    await settle(element);
    expect(element.api.actions).toHaveLength(2);
    expect(app.controller.undo()).toBe(true);
    await settle(element);
    expect(element.api.actions).toEqual([]);
  });

  it('takes a tag every picked card carries off all of them', async () => {
    const { element } = await mountApp();
    const tags = await openMenu(element, 'tag');
    tags.find((tag) => tag.dataset['value'] === 'UI')?.click();
    await settle(element);
    barRoot(element).querySelector<HTMLButtonElement>('[data-value="UI"]')?.click();
    await settle(element);
    expect(element.api.actions.map((action) => action.type)).toEqual([
      'ADD_CARD_TAG',
      'ADD_CARD_TAG',
      'REMOVE_CARD_TAG',
      'REMOVE_CARD_TAG',
      'REMOVE_CARD_TAG',
    ]);
    expect(barRoot(element).querySelector('[data-value="UI"]')?.getAttribute('aria-checked')).toBe('false');
  });
});
