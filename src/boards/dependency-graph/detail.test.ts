import { afterEach, describe, expect, it } from 'vitest';

import { clickIn, mountInPanelOwner, selectedDetail, shownDetail } from '../base/detail-fields.testing';
import { DpkBoardDependencyGraph } from './element';
import { defineDependencyGraph } from './index';

defineDependencyGraph();

const data = {
  modules: [
    { id: 'orders', name: 'Order service', path: 'app/orders', layer: 'App', description: 'The use cases.' },
    { id: 'pricing', name: 'Pricing', path: 'domain/pricing', layer: 'Domain' },
  ],
  dependencies: [
    {
      id: 'orders-pricing',
      from: 'orders',
      to: 'pricing',
      contract: 'calculateQuote',
      description: 'Totals the order.',
    },
  ],
};

afterEach(() => {
  document.body.replaceChildren();
});

describe('dependency graph detail in the side panel', () => {
  it('lists a module’s path, layer and description', async () => {
    const { board, reports } = await mountInPanelOwner('dpk-board-dependency-graph', DpkBoardDependencyGraph, data);
    await clickIn(board, '[data-module="orders"]');
    expect((await shownDetail(selectedDetail(reports))).rows).toEqual([
      ['Path', 'app/orders'],
      ['Layer', 'App'],
      ['Description', 'The use cases.'],
    ]);
  });

  it('lists a dependency’s ends, contract and description', async () => {
    const { board, reports } = await mountInPanelOwner('dpk-board-dependency-graph', DpkBoardDependencyGraph, data);
    await clickIn(board, '[data-dependency="orders-pricing"] .d-edge-hit');
    expect((await shownDetail(selectedDetail(reports))).rows).toEqual([
      ['Dependent', 'Order service'],
      ['Dependency', 'Pricing'],
      ['Contract', 'calculateQuote'],
      ['Description', 'Totals the order.'],
    ]);
  });
});
