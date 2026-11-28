import { render } from 'lit';
import { afterEach, describe, expect, it } from 'vitest';

import type { PageElement } from '../../core/page/element';

import { AppElement } from '../../core/app/element';
import { PANEL_HOST, type PanelHost, type PanelSectionSpec } from '../../core/panel/host';
import { DpkInternalKanbanBulk } from './bulk-section';
import { DpkBoardKanban } from './element';
import { kanbanMessages } from './messages';
import '../../index';

const m = kanbanMessages('ja');

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
  }
};

const card = (element: DpkBoardKanban, id: string): HTMLElement => {
  const found = element.renderRoot.querySelector<HTMLElement>(`[data-card="${id}"]`);
  if (!found) throw new Error(`no card ${id}`);
  return found;
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

type FakePanel = {
  readonly sections: () => readonly PanelSectionSpec[];
  readonly opened: (string | undefined)[];
  isOpen: boolean;
};

/** Stand-in for the side panel's owner: keeps the sections the board adds. */
const withPanel = async (element: DpkBoardKanban): Promise<FakePanel> => {
  let sections: PanelSectionSpec[] = [];
  const panel: FakePanel = { sections: () => sections, opened: [], isOpen: false };
  const host: PanelHost = {
    provideDetail: () => () => undefined,
    showDetail: () => undefined,
    addSection: (_source, spec) => {
      sections = [...sections, spec];
      return () => {
        sections = sections.filter((candidate) => candidate !== spec);
      };
    },
    invalidate: () => undefined,
    provideSettings: () => () => undefined,
    close: () => undefined,
    open: (section) => panel.opened.push(section),
    section: 'bulk',
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

const sectionRoot = document.createElement('div');

const renderSection = async (spec: PanelSectionSpec | undefined): Promise<ShadowRoot> => {
  if (spec === undefined) throw new Error('no section');
  if (!sectionRoot.isConnected) document.body.append(sectionRoot);
  render(spec.render(), sectionRoot);
  const view = sectionRoot.querySelector('dpk-internal-kanban-bulk');
  if (!(view instanceof DpkInternalKanbanBulk) || view.shadowRoot === null) throw new Error('no bulk section');
  await view.updateComplete;
  return view.shadowRoot;
};

describe('picking several kanban cards', () => {
  it('adds and takes out cards with Cmd/Ctrl, and lists the bulk section while two or more are picked', async () => {
    const { element, panel } = await mount();
    click(card(element, 'login'));
    await settle(element);
    expect(panel.sections()).toEqual([]);

    click(card(element, 'stock'), { metaKey: true });
    await settle(element);
    expect(pressed(element)).toEqual(['login', 'stock']);
    expect(panel.sections().map(({ name, label, badge }) => ({ name, label, badge }))).toEqual([
      { name: 'kanban-bulk-board', label: '一括操作', badge: '2' },
    ]);

    click(card(element, 'login'), { ctrlKey: true });
    await settle(element);
    expect(pressed(element)).toEqual(['stock']);
    expect(element.selection).toEqual({ kind: 'card', id: 'stock' });
    expect(panel.sections()).toEqual([]);
  });

  it('picks the cards between the last picked and the Shift-clicked one, across columns', async () => {
    const { element, panel } = await mount();
    click(card(element, 'api'));
    click(card(element, 'stock'), { shiftKey: true });
    await settle(element);
    expect(pressed(element)).toEqual(['api', 'mail', 'stock']);
    expect(panel.sections()[0]?.badge).toBe('3');
  });

  it('picks from the keyboard, and Escape drops the picked cards', async () => {
    const { element, panel } = await mount();
    key(card(element, 'login'), { key: 'Enter' });
    key(card(element, 'api'), { key: ' ', ctrlKey: true });
    await settle(element);
    expect(pressed(element)).toEqual(['login', 'api']);
    key(card(element, 'api'), { key: 'Escape' });
    await settle(element);
    expect(panel.sections()).toEqual([]);
  });

  it('drops the picked cards on a plain click, which opens that card’s detail as before', async () => {
    const { element, panel } = await mount();
    click(card(element, 'login'));
    click(card(element, 'api'), { metaKey: true });
    click(card(element, 'mail'));
    await settle(element);
    expect(pressed(element)).toEqual(['mail']);
    expect(panel.sections()).toEqual([]);
  });

  it('turns an open panel to the bulk section, and leaves a closed one closed', async () => {
    const { element, panel } = await mount();
    click(card(element, 'login'));
    click(card(element, 'api'), { metaKey: true });
    await settle(element);
    expect(panel.opened).toEqual([]);

    click(card(element, 'mail'));
    panel.isOpen = true;
    click(card(element, 'api'), { metaKey: true });
    await settle(element);
    expect(panel.opened).toEqual(['kanban-bulk-board']);
  });

  it('shows how many picked cards carry each tag, and which columns they can move to', async () => {
    const { element, panel } = await mount();
    click(card(element, 'login'));
    click(card(element, 'api'), { metaKey: true });
    await settle(element);
    const root = await renderSection(panel.sections()[0]);
    expect(root.querySelector('.kanban-bulk-summary')?.textContent).toBe(m.bulkSummary(2));
    const tags = [...root.querySelectorAll<HTMLButtonElement>('[data-tag]')];
    expect(tags.map((tag) => [tag.dataset['tag'], tag.getAttribute('aria-pressed')])).toEqual([
      ['UI', 'mixed'],
      ['API', 'mixed'],
    ]);
    const moves = [...root.querySelectorAll<HTMLButtonElement>('[data-column]')];
    expect(moves.map((move) => [move.dataset['column'], move.disabled])).toEqual([
      ['todo', true],
      ['doing', false],
    ]);
  });
});

describe('bulk actions on a page', () => {
  const mountApp = async (): Promise<{
    page: PageElement;
    element: DpkBoardKanban;
    root: () => Promise<ShadowRoot>;
  }> => {
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
    const page = app.querySelector('dpk-page');
    const element = app.querySelector('dpk-board-kanban');
    if (page === null || !(element instanceof DpkBoardKanban)) throw new Error('no board');
    await settle(element);
    click(card(element, 'login'));
    click(card(element, 'mail'), { shiftKey: true });
    await settle(element);
    const section = (): Promise<ShadowRoot> => {
      const view = document.createElement('div');
      document.body.append(view);
      const spec = (element as unknown as { panelSections(): readonly PanelSectionSpec[] }).panelSections()[0];
      if (spec === undefined) throw new Error('no section');
      render(spec.render(), view);
      const bulk = view.querySelector('dpk-internal-kanban-bulk');
      if (!(bulk instanceof DpkInternalKanbanBulk) || bulk.shadowRoot === null) throw new Error('no bulk section');
      return bulk.updateComplete.then(() => bulk.shadowRoot as ShadowRoot);
    };
    return { page: page as PageElement, element, root: section };
  };

  const columnsOf = (element: DpkBoardKanban): Record<string, (string | undefined)[]> =>
    Object.fromEntries(
      [...element.renderRoot.querySelectorAll<HTMLElement>('section[data-column]')].map((column) => [
        column.dataset['column'] ?? '',
        [...column.querySelectorAll<HTMLElement>('[data-card]')].map((found) => found.dataset['card']),
      ]),
    );

  it('moves the picked cards in one batch, which one undo takes back', async () => {
    const { element, root } = await mountApp();
    const app = document.querySelector('dpk-app');
    if (!(app instanceof AppElement)) throw new Error('no app');
    (await root()).querySelector<HTMLButtonElement>('[data-column="doing"]')?.click();
    await settle(element);
    expect(columnsOf(element)).toEqual({ todo: [], doing: ['stock', 'login', 'api', 'mail'] });
    expect(element.api.actions.map((action) => action.type)).toEqual(['MOVE_CARD', 'MOVE_CARD', 'MOVE_CARD']);

    expect(app.controller.undo()).toBe(true);
    await settle(element);
    expect(columnsOf(element)).toEqual({ todo: ['login', 'api', 'mail'], doing: ['stock'] });
    expect(element.api.actions).toEqual([]);
  });

  it('puts a tag on every picked card and takes it off again, each in one batch', async () => {
    const { element, root } = await mountApp();
    const app = document.querySelector('dpk-app');
    if (!(app instanceof AppElement)) throw new Error('no app');
    (await root()).querySelector<HTMLButtonElement>('[data-tag="UI"]')?.click();
    await settle(element);
    expect(element.api.actions.map((action) => [action.type, action.target.id])).toEqual([
      ['ADD_CARD_TAG', expect.stringContaining('api')],
      ['ADD_CARD_TAG', expect.stringContaining('mail')],
    ]);
    const tags = await root();
    expect(tags.querySelector('[data-tag="UI"]')?.getAttribute('aria-pressed')).toBe('true');

    const input = tags.querySelector<HTMLInputElement>('.kanban-bulk-tag-add');
    if (input === null) throw new Error('no tag input');
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
});
