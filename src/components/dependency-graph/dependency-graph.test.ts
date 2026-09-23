import { afterEach, describe, expect, it } from 'vitest';

import { DpkComponentDependencyGraph } from './element';
import { defineDependencyGraph } from './index';
import { parseDependencyData } from './model';

defineDependencyGraph();

const raw = {
  modules: [
    { id: 'checkout', name: 'Checkout UI', path: 'apps/checkout', layer: 'UI', tags: ['UI'] },
    { id: 'api', name: 'Order API', path: 'api/orders', layer: 'API', tags: ['API'] },
    {
      id: 'orders',
      name: 'Order service',
      path: 'app/order-service',
      layer: 'アプリ',
      tags: ['今回の変更'],
      description: '注文のユースケース。',
    },
    { id: 'pricing', name: 'Pricing', path: 'domain/pricing', layer: 'ドメイン', tags: ['ドメイン', '今回の変更'] },
    { id: 'promotions', name: 'Promotion', path: 'domain/promotions', layer: 'ドメイン', tags: ['ドメイン'] },
    {
      id: 'repository',
      name: 'Order repository',
      path: 'infra/order-repository',
      layer: 'インフラ',
      tags: ['インフラ'],
    },
    { id: 'http', name: 'HTTP client', path: 'shared/http', layer: '共通', tags: ['共通'] },
  ],
  dependencies: [
    { id: 'checkout-api', from: 'checkout', to: 'api', contract: 'OrderClient' },
    { id: 'api-orders', from: 'api', to: 'orders', contract: 'createOrder' },
    {
      id: 'orders-pricing',
      from: 'orders',
      to: 'pricing',
      contract: 'calculateQuote',
      description: '合計金額を計算する。',
    },
    { id: 'orders-repository', from: 'orders', to: 'repository', contract: 'save' },
    { id: 'pricing-promotions', from: 'pricing', to: 'promotions', contract: 'applyPromotion' },
    { id: 'promotions-pricing', from: 'promotions', to: 'pricing', contract: 'calculateSubtotal' },
    { id: 'checkout-http', from: 'checkout', to: 'http', contract: 'request' },
  ],
};

const settle = async (element: DpkComponentDependencyGraph): Promise<void> => {
  for (let index = 0; index < 3; index++) await element.updateComplete;
};

const mount = async (): Promise<DpkComponentDependencyGraph> => {
  const element = new DpkComponentDependencyGraph();
  element.data = parseDependencyData(raw);
  document.body.append(element);
  await settle(element);
  return element;
};

const classes = (element: DpkComponentDependencyGraph, id: string): string[] => [
  ...(element.renderRoot.querySelector<HTMLElement>(`[data-module="${id}"]`)?.classList ?? []),
];

afterEach(() => {
  document.body.replaceChildren();
});

describe('dependency graph data', () => {
  it('validates ids and endpoints, and fills defaults', () => {
    const data = parseDependencyData(raw);
    expect(data.nodes).toHaveLength(7);
    expect(data.nodes[2]).toMatchObject({ layer: 'アプリ', tags: ['今回の変更'], path: 'app/order-service' });
    expect(data.edges[0]).toMatchObject({ contract: 'OrderClient', description: null, tags: [] });
    expect(() =>
      parseDependencyData({
        modules: [
          { id: 'a', name: 'A' },
          { id: 'a', name: 'B' },
        ],
      }),
    ).toThrow(/duplicate module id/);
    expect(() =>
      parseDependencyData({ modules: [{ id: 'a', name: 'A' }], dependencies: [{ id: 'd', from: 'a', to: 'x' }] }),
    ).toThrow(/unknown dependency target/);
  });
});

describe('dpk-component-dependency-graph', () => {
  it('renders modules, dependencies and cycle badges', async () => {
    const element = await mount();
    expect(element.renderRoot.querySelectorAll('[data-module]')).toHaveLength(7);
    expect(element.renderRoot.querySelectorAll('[data-dependency]')).toHaveLength(7);
    expect(element.renderRoot.querySelector('.diagram-stats')?.textContent).toBe('7 モジュール · 7 依存');
    expect(classes(element, 'pricing')).toContain('is-cyclic');
    expect(classes(element, 'promotions')).toContain('is-cyclic');
    expect(classes(element, 'orders')).not.toContain('is-cyclic');
    expect(element.renderRoot.querySelector('[data-toggle="cycles"]')?.textContent?.trim()).toBe('循環 1');
  });

  it('shows dependencies and dependents of the selected module', async () => {
    const element = await mount();
    element.renderRoot.querySelector<HTMLButtonElement>('[data-module="orders"]')?.click();
    await element.updateComplete;
    expect(classes(element, 'pricing')).toContain('is-dependency');
    expect(classes(element, 'repository')).toContain('is-dependency');
    expect(classes(element, 'api')).toContain('is-dependent');
    expect(classes(element, 'checkout')).toContain('is-dimmed');
    expect(element.renderRoot.querySelectorAll('.dep-edge.is-related')).toHaveLength(3);

    element.renderRoot.querySelector<HTMLButtonElement>('[data-direction="outgoing"]')?.click();
    await element.updateComplete;
    expect(classes(element, 'api')).toContain('is-dimmed');
    expect(classes(element, 'pricing')).toContain('is-dependency');

    element.renderRoot.querySelector<HTMLButtonElement>('[data-direction="incoming"]')?.click();
    await element.updateComplete;
    expect(classes(element, 'api')).toContain('is-dependent');
    expect(classes(element, 'pricing')).toContain('is-dimmed');
  });

  it('follows indirect dependencies only when asked', async () => {
    const element = await mount();
    element.renderRoot.querySelector<HTMLButtonElement>('[data-module="checkout"]')?.click();
    await element.updateComplete;
    expect(classes(element, 'orders')).toContain('is-dimmed');
    element.renderRoot.querySelector<HTMLButtonElement>('[data-toggle="transitive"]')?.click();
    await element.updateComplete;
    expect(classes(element, 'orders')).toContain('is-dependency');
    expect(classes(element, 'pricing')).toContain('is-dependency');
  });

  it('restricts the view to cycles', async () => {
    const element = await mount();
    element.renderRoot.querySelector<HTMLButtonElement>('[data-toggle="cycles"]')?.click();
    await element.updateComplete;
    expect(
      [...element.renderRoot.querySelectorAll<HTMLElement>('[data-module]')]
        .map((node) => node.dataset['module'])
        .sort((a, b) => String(a).localeCompare(String(b))),
    ).toEqual(['pricing', 'promotions']);
    expect(
      [...element.renderRoot.querySelectorAll<HTMLElement>('[data-dependency]')]
        .map((node) => node.dataset['dependency'])
        .sort((a, b) => String(a).localeCompare(String(b))),
    ).toEqual(['pricing-promotions', 'promotions-pricing']);
    element.tagFilter = { match: 'all', active: ['nothing'] };
    await element.updateComplete;
    expect(element.renderRoot.querySelector('.diagram-empty')?.textContent).toContain('該当する循環依存はありません');
  });

  it('opens the contextual composer beside a module or a dependency', async () => {
    const element = await mount();
    element.id = 'deps';
    await settle(element);
    expect(element.renderRoot.querySelector('.diagram-details')).toBeNull();
    const trigger = (kind: string, id: string) =>
      element.renderRoot.querySelector<HTMLButtonElement>(`[data-comment-kind="${kind}"][data-comment-id="${id}"]`);
    expect(trigger('node', 'orders')?.previousElementSibling).toBe(
      element.renderRoot.querySelector('[data-module="orders"]'),
    );
    trigger('node', 'orders')?.click();
    await settle(element);
    expect(element.selection).toEqual({ kind: 'node', id: 'orders' });
    expect(element.renderRoot.querySelector('.comment-target')?.textContent).toBe('Order service');
    const edge = trigger('edge', 'orders-pricing');
    expect(edge?.closest('[data-dependency]')).toBe(
      element.renderRoot.querySelector('[data-dependency="orders-pricing"]'),
    );
    edge?.click();
    await settle(element);
    expect(element.selection).toEqual({ kind: 'edge', id: 'orders-pricing' });
    expect(element.renderRoot.querySelector('.comment-target')?.textContent).toBe('Order service → Pricing');
  });

  it('keeps module and dependency descriptions in their tooltips', async () => {
    const element = await mount();
    expect(element.renderRoot.querySelector('[data-module="orders"]')?.getAttribute('title')).toContain(
      'app/order-service',
    );
    expect(element.renderRoot.querySelector('[data-dependency="orders-pricing"] title')?.textContent).toBe(
      'calculateQuote\n合計金額を計算する。',
    );
  });

  it('filters by tag', async () => {
    const element = await mount();
    element.renderRoot.querySelector<HTMLButtonElement>('[data-tag="今回の変更"]')?.click();
    await element.updateComplete;
    expect(
      [...element.renderRoot.querySelectorAll<HTMLElement>('[data-module]')]
        .map((node) => node.dataset['module'])
        .sort((a, b) => String(a).localeCompare(String(b))),
    ).toEqual(['orders', 'pricing']);
    expect(
      [...element.renderRoot.querySelectorAll<HTMLElement>('[data-dependency]')].map(
        (node) => node.dataset['dependency'],
      ),
    ).toEqual(['orders-pricing']);
  });
});
