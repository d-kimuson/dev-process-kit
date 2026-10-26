// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import { queryAllDeep } from '../lib/dom/deep';
import '../index';

/**
 * A template that renders cards from its data lets each card name the page's
 * questions it is about (`questions`), as a diagram's nodes do: the card
 * carries `data-grill-questions`, and the shell lays a Q badge on it.
 */
type Case = {
  readonly tag: string;
  readonly base: unknown;
  /** Each card that names `Q1`, by a selector inside the template's shadow root. */
  readonly marked: readonly string[];
  /** The view's own scrolling board, by a selector inside its shadow root: every badge must be laid out inside it. */
  readonly box?: string;
};

const grill = { questions: [{ id: 'open', title: 'Still open?' }] };

const cases: readonly Case[] = [
  {
    tag: 'dpk-view-usm',
    base: {
      activities: [{ id: 'buy', name: 'Buy', questions: 'Q1', steps: [{ id: 'pay', name: 'Pay', questions: 'Q1' }] }],
      milestones: [{ id: 'mvp', name: 'MVP', questions: 'Q1' }],
      stories: [
        { id: 'card', name: 'Pay by card', activityId: 'buy', stepId: 'pay', milestoneId: 'mvp', questions: 'Q1' },
      ],
    },
    marked: [
      '.act-head[data-activity="buy"]',
      '.col-head[data-column-step="pay"]',
      '.row-head[data-milestone="mvp"]',
      '[data-story="card"]',
    ],
    // A USM mark is slotted into `<dpk-matrix>`: its head, its row lead or its
    // cell. The matrix owns the frame the map scrolls in, so every badge stays
    // inside it — a badge left in the main column around the map would not move
    // with the map's horizontal scroll.
    box: 'dpk-matrix',
  },
  {
    tag: 'dpk-view-task-board',
    base: {
      title: 'Ship checkout',
      todos: [{ id: 'pay', title: 'Wire payments', questions: 'Q1' }],
      outputs: [{ id: 'pr', href: 'https://example.com/pr/1', questions: 'Q1' }],
      log: [{ id: 'l1', title: 'Started', questions: 'Q1' }],
    },
    marked: ['[data-todo="pay"]', '[data-output="pr"]', '[data-log="l1"]'],
  },
  {
    tag: 'dpk-view-delegation-poker',
    base: {
      players: [{ id: 'lead', name: 'Lead' }],
      decisions: [
        { id: 'hiring', name: 'Hiring', questions: 'Q1' },
        { id: 'tools', name: 'Tools' },
      ],
    },
    marked: ['[data-decision="hiring"] .cell-name'],
  },
];

afterEach(() => {
  document.body.replaceChildren();
  window.location.hash = '';
});

/**
 * A badge is no longer in the view's own shadow root: it lives in the portal
 * inside the box its mark moves in, which can be another component's (a matrix
 * head, its scroll frame). Anything looking for badges has to cross every open
 * shadow root down to them, the way the shell's own code does.
 */
const acrossShadow = (element: Element, ancestor: Element): boolean => {
  let node: Element | null = element;
  while (node !== null) {
    if (node === ancestor || ancestor.contains(node)) return true;
    const root = node.getRootNode();
    node = root instanceof ShadowRoot ? root.host : null;
  }
  return false;
};

const settle = async (element: HTMLElement & { api: { ready: Promise<void> }; updateComplete: Promise<boolean> }) => {
  await element.api.ready;
  for (let i = 0; i < 4; i += 1) {
    await element.updateComplete;
    // Two frames: the component a view slots its marks into renders its own
    // scroll frame a microtask after the view hands them over, and the badges
    // settle into it on the frame after that (`badge-portal`'s settle pass).
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(null))));
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
};

describe.each(cases)('$tag cards name the questions they are about', ({ tag, base, marked, box }) => {
  it('marks each card that names a question and lays a badge on it', async () => {
    document.body.innerHTML = `<${tag} storage="memory">
      <script type="application/json">${JSON.stringify(base)}</script>
      <script type="application/json" data-dpk-grill>${JSON.stringify(grill)}</script>
    </${tag}>`;
    const element = document.querySelector(tag) as HTMLElement & {
      api: { ready: Promise<void> };
      updateComplete: Promise<boolean>;
    };
    await settle(element);
    const root = element.shadowRoot!;
    expect(
      marked.map((selector) => [selector, root.querySelector(selector)?.getAttribute('data-grill-questions')]),
    ).toEqual(marked.map((selector) => [selector, 'Q1']));
    expect(root.querySelectorAll('[data-grill-questions]')).toHaveLength(marked.length);
    const badges = queryAllDeep(element, '.dpk-grill-badge') as HTMLButtonElement[];
    expect(badges.map((badge) => badge.textContent)).toEqual(marked.map(() => 'Q1'));
    // Every badge is in a portal inside the box its own mark moves in, so a
    // scroll of that box carries it: never a layer of the page's own.
    for (const badge of badges) {
      const portal = badge.closest('.dpk-grill-portal');
      expect(portal).not.toBeNull();
      expect(portal?.parentElement).not.toBe(document.body);
      expect(acrossShadow(portal!, element)).toBe(true);
    }
    // A view that lays its cards out in a scrolling board: every badge is
    // inside that board (its heads, its cells, its scroll frame), not in the
    // main column around it, which the scroll passes under.
    const board = box === undefined ? null : root.querySelector(box);
    expect(box === undefined || board !== null).toBe(true);
    const inBoard = board === null ? [] : badges;
    expect(inBoard.every((badge) => acrossShadow(badge, board!))).toBe(true);
    // The main column is not a portal parent: a badge put there stays put
    // while the map scrolls sideways under it.
    const main = root.querySelector('.dpk-main-body');
    const portsParent = badges.map((badge) => badge.closest('.dpk-grill-portal')?.parentElement ?? null);
    expect(portsParent.every((parent) => parent !== main)).toBe(true);
    expect(main?.hasAttribute('data-dpk-badge-gutter') ?? false).toBe(false);
    expect(root.querySelector('[data-dpk-badge-gutter]')).toBeNull();
    // A badge is a child of its mark's own box, so the sidebar's marks keep
    // theirs in the sidebar and the main column's in the main column.
    const sidebar = root.querySelector('.dpk-sidebar');
    const inSidebar = (child: Element): boolean => (sidebar === null ? false : acrossShadow(child, sidebar));
    const marks = [...root.querySelectorAll('[data-grill-questions]')];
    expect(badges.filter(inSidebar)).toHaveLength(marks.filter(inSidebar).length);
    // Nothing disappears: one badge per mark, on the mark's own element.
    expect(queryAllDeep(element, '[data-dpk-badge-gutter]').length).toBe(0);
  });
});

/**
 * A board renders its own nodes — a table, a state, a module — so its marks sit
 * a shadow boundary below the view's, and the badge goes on the node's corner
 * (a table's top-right) instead of the page's gutter. An ER table's `questions`
 * is what puts a Q badge on the card at all; without it the diagram carries no
 * annotation, however many questions the page asks.
 */
describe('a board node names the questions it is about', () => {
  const boardGrill = {
    questions: [
      { id: 'open', title: 'Still open?' },
      { id: 'overflow', title: 'What happens when it overflows?' },
    ],
  };

  const erBase = {
    after: {
      tables: [
        {
          id: 'inventory_reservations',
          name: '在庫予約',
          questions: 'Q1',
          fields: [
            { id: 'id', type: 'uuid', key: 'PK' },
            { id: 'quantity', type: 'integer', questions: 'Q2' },
          ],
        },
        { id: 'orders', name: '注文', fields: [{ id: 'id', type: 'uuid', key: 'PK' }] },
      ],
    },
  };

  it('lays a Q badge on the corner of an ER table, and one on the column that names a question', async () => {
    document.body.innerHTML = `<dpk-view-plain storage="memory">
      <script type="application/json">${JSON.stringify({ title: '在庫スキーマ' })}</script>
      <section slot="main">
        <dpk-board-er-diagram id="schema">
          <script type="application/json">${JSON.stringify(erBase)}</script>
        </dpk-board-er-diagram>
      </section>
      <script type="application/json" data-dpk-grill>${JSON.stringify(boardGrill)}</script>
    </dpk-view-plain>`;
    const view = document.querySelector('dpk-view-plain') as HTMLElement & {
      api: { ready: Promise<void> };
      updateComplete: Promise<boolean>;
    };
    await view.api.ready;
    const board = view.querySelector('dpk-board-er-diagram') as HTMLElement & { updateComplete: Promise<boolean> };
    for (let i = 0; i < 4; i += 1) {
      await view.updateComplete;
      await board.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const root = board.shadowRoot!;
    expect(root.querySelector('[data-er-table="inventory_reservations"]')?.getAttribute('data-grill-questions')).toBe(
      'Q1',
    );
    expect(root.querySelector('[data-er-table="orders"]')?.hasAttribute('data-grill-questions')).toBe(false);

    const badges = queryAllDeep(view, '.dpk-grill-badge') as HTMLElement[];
    // One badge per ref named, wherever its own portal sits in the canvas.
    expect(badges.map((badge) => badge.textContent).sort()).toEqual(['Q1', 'Q2']);
    // Each badge lives in a portal inside the board's own canvas, which is where
    // the table it points at is: a board node's badge is on its corner, never in
    // the page's gutter column.
    for (const badge of badges) expect(root.contains(badge.closest('.dpk-grill-portal'))).toBe(true);
    expect(queryAllDeep(view, '[data-dpk-badge-gutter]')).toEqual([]);
  });
});
