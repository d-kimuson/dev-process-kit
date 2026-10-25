// @vitest-environment jsdom
/**
 * Check Mode over a maximized diagram panel: the panel lifts itself into the
 * top layer, so the badges have to be lifted too (`./check-mode-top-layer`).
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

const layers = (element: DpkViewPlain, region: string): HTMLElement[] => [
  ...root(element).querySelectorAll<HTMLElement>(`.dpk-check-badges[data-region="${region}"]`),
];

const enableCheckMode = async (element: DpkViewPlain): Promise<void> => {
  root(element).querySelector<HTMLButtonElement>('.dpk-check-toggle')?.click();
  await settle(element);
};

const maximize = async (element: DpkViewPlain): Promise<void> => {
  const panel = element.querySelector('dpk-board-er-diagram')?.shadowRoot?.querySelector('dpk-dialog-panel');
  panel?.shadowRoot?.querySelector<HTMLButtonElement>('.maximize')?.click();
  await settle(element);
};

const restore = async (element: DpkViewPlain): Promise<void> => {
  const panel = element.querySelector('dpk-board-er-diagram')?.shadowRoot?.querySelector('dpk-dialog-panel');
  panel?.shadowRoot?.querySelector<HTMLButtonElement>('.exit-fullscreen')?.click();
  await settle(element);
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Check Mode badges over a maximized panel', () => {
  it('draws the badges on the page while no panel is maximized', async () => {
    const element = mount();
    await settle(element);
    await enableCheckMode(element);

    expect(layers(element, 'main').length).toBe(1);
    expect(layers(element, 'top')).toEqual([]);
    expect(layers(element, 'main')[0]?.querySelectorAll('.dpk-check-badge').length).toBe(2);
  });

  it('moves the badges into a top-layer layer of their own once the panel is maximized', async () => {
    const element = mount();
    await settle(element);
    await enableCheckMode(element);
    await maximize(element);

    const top = layers(element, 'top');
    expect(top.length).toBe(1);
    // Shown as a popover after the panel's, which is what puts it above the panel.
    expect(top[0]?.getAttribute('popover')).toBe('manual');
    expect(top[0]?.querySelectorAll('.dpk-check-badge').length).toBe(2);
    // Only one layer draws badges at a time: the page's own layers step aside.
    expect(layers(element, 'main')).toEqual([]);
  });

  it('draws only the maximized panel’s own targets, not what is behind it', async () => {
    const element = mount();
    await settle(element);
    await enableCheckMode(element);
    await maximize(element);

    const top = layers(element, 'top')[0];
    const refs = [...(top?.querySelectorAll<HTMLButtonElement>('.dpk-check-badge') ?? [])].map((badge) =>
      badge.getAttribute('data-badge'),
    );
    // The ER diagram's two tables; its relation line is not a Check Mode target at all.
    expect(refs).toEqual(['0', '1']);
    const board = element.querySelector('dpk-board-er-diagram');
    expect(board?.shadowRoot?.querySelector('.er-edge')?.getAttribute('data-dpk-check')).toBe('off');
  });

  it('puts the badges back on the page when the panel is restored', async () => {
    const element = mount();
    await settle(element);
    await enableCheckMode(element);
    await maximize(element);
    expect(layers(element, 'top').length).toBe(1);

    await restore(element);
    expect(layers(element, 'top')).toEqual([]);
    expect(layers(element, 'main').length).toBe(1);
  });

  it('leaves no top-layer layer behind when Check Mode is turned off while maximized', async () => {
    const element = mount();
    await settle(element);
    await enableCheckMode(element);
    await maximize(element);
    expect(layers(element, 'top').length).toBe(1);

    root(element).querySelector<HTMLButtonElement>('.dpk-check-toggle')?.click();
    await settle(element);
    expect(layers(element, 'top')).toEqual([]);
  });
});
