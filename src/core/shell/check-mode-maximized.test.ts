// @vitest-environment jsdom
/**
 * Check Mode on a diagram: badges live in portals inside each table's own
 * world, so a maximized panel carries them into the top layer with it.
 * These tests drive the real view: a plain template with an ER diagram in its
 * main column, Check Mode switched on from the header, then the panel
 * maximized and restored.
 */
import { afterEach, describe, expect, it } from 'vitest';

import type { DpkViewPlain } from '../../views/plain/element';

import '../../index';

const erData = {
  before: {
    tables: [
      { id: 'customers', name: 'Customers', fields: [{ id: 'id', type: 'uuid', key: 'PK' }] },
      {
        id: 'orders',
        name: 'Orders',
        fields: [
          { id: 'id', type: 'uuid', key: 'PK' },
          { id: 'customer_id', type: 'uuid', key: 'FK', ref: 'customers.id' },
        ],
      },
    ],
  },
  after: {
    tables: [
      { id: 'customers', name: 'Customers', fields: [{ id: 'id', type: 'uuid', key: 'PK' }] },
      {
        id: 'orders',
        name: 'Orders',
        fields: [
          { id: 'id', type: 'uuid', key: 'PK' },
          { id: 'customer_id', type: 'uuid', key: 'FK', ref: 'customers.id' },
          { id: 'status', type: 'varchar' },
        ],
      },
    ],
  },
};

const mount = (): DpkViewPlain => {
  document.body.innerHTML = `
    <dpk-view-plain storage="memory">
      <script type="application/json">${JSON.stringify({ title: 'Schema' })}</script>
      <section slot="main">
        <dpk-board-er-diagram id="schema">
          <script type="application/json">${JSON.stringify(erData)}</script>
        </dpk-board-er-diagram>
      </section>
    </dpk-view-plain>`;
  const element = document.querySelector('dpk-view-plain');
  if (!(element instanceof HTMLElement)) throw new Error('element did not upgrade');
  return element as DpkViewPlain;
};

const settle = async (element: DpkViewPlain): Promise<void> => {
  await element.api.ready;
  for (let index = 0; index < 4; index += 1) {
    await element.updateComplete;
    await Promise.resolve();
  }
  const board = element.querySelector('dpk-board-er-diagram');
  if (board instanceof HTMLElement) {
    for (let index = 0; index < 3; index += 1) {
      await (board as HTMLElement & { updateComplete: Promise<boolean> }).updateComplete;
    }
  }
  await element.updateComplete;
};

const root = (element: DpkViewPlain): ShadowRoot => {
  if (!element.shadowRoot) throw new Error('no shadow root');
  return element.shadowRoot;
};

const frames = async (): Promise<void> => {
  await new Promise((resolve) => requestAnimationFrame(resolve));
  await new Promise((resolve) => requestAnimationFrame(resolve));
};

/** Every badge under the view, including the portals inside the board's shadow root. */
const badges = (element: DpkViewPlain): HTMLButtonElement[] => {
  const found: HTMLButtonElement[] = [];
  const visit = (root: ParentNode): void => {
    for (const node of root.querySelectorAll('*')) {
      if (node instanceof HTMLButtonElement && node.classList.contains('dpk-check-badge')) found.push(node);
      if (node.shadowRoot) visit(node.shadowRoot);
    }
  };
  visit(element);
  return found;
};

const panelOf = (element: DpkViewPlain): Element | null =>
  element.querySelector('dpk-board-er-diagram')?.shadowRoot?.querySelector('dpk-dialog-panel') ?? null;

const enableCheckMode = async (element: DpkViewPlain): Promise<void> => {
  root(element).querySelector<HTMLButtonElement>('.dpk-check-toggle')?.click();
  await settle(element);
  await frames();
};

const maximize = async (element: DpkViewPlain): Promise<void> => {
  panelOf(element)?.shadowRoot?.querySelector<HTMLButtonElement>('.maximize')?.click();
  await settle(element);
  await frames();
};

const restore = async (element: DpkViewPlain): Promise<void> => {
  panelOf(element)?.shadowRoot?.querySelector<HTMLButtonElement>('.exit-fullscreen')?.click();
  await settle(element);
  await frames();
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Check Mode badges on a diagram', () => {
  it('places one badge per table inside the board’s own coordinate space', async () => {
    const element = mount();
    await settle(element);
    await enableCheckMode(element);

    const found = badges(element);
    expect(found).toHaveLength(2);
    expect(found.every((badge) => badge.closest('.dpk-check-portal') !== null)).toBe(true);
  });

  it('keeps the same badges when the panel is maximized, so they inherit the top layer with it', async () => {
    const element = mount();
    await settle(element);
    await enableCheckMode(element);
    await maximize(element);

    const found = badges(element);
    expect(found).toHaveLength(2);
    const portal = found[0]?.closest('.dpk-check-portal') ?? null;
    expect(panelOf(element)?.contains(portal)).toBe(true);
  });

  it('draws only the tables, never the relation line', async () => {
    const element = mount();
    await settle(element);
    await enableCheckMode(element);
    await maximize(element);

    expect(badges(element).map((badge) => badge.dataset['checkRef'])).toEqual([
      'element:schema/node/customers',
      'element:schema/node/orders',
    ]);
    const board = element.querySelector('dpk-board-er-diagram');
    expect(board?.shadowRoot?.querySelector('.er-edge')?.getAttribute('data-dpk-check')).toBe('off');
  });

  it('leaves the badges in place when the panel is restored', async () => {
    const element = mount();
    await settle(element);
    await enableCheckMode(element);
    await maximize(element);
    await restore(element);
    expect(badges(element)).toHaveLength(2);
  });

  it('removes every portal when Check Mode is turned off while maximized', async () => {
    const element = mount();
    await settle(element);
    await enableCheckMode(element);
    await maximize(element);
    root(element).querySelector<HTMLButtonElement>('.dpk-check-toggle')?.click();
    await settle(element);
    await frames();
    expect(badges(element)).toEqual([]);
    expect(element.querySelectorAll('.dpk-check-portal')).toHaveLength(0);
  });
});
