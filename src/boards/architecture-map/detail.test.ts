import { afterEach, describe, expect, it } from 'vitest';

import { clickIn, mountInPanelOwner, selectedDetail, shownDetail } from '../base/detail-fields.testing';
import { DpkBoardArchitectureMap } from './element';
import { defineArchitectureMap } from './index';

defineArchitectureMap();

const data = {
  boundaries: [{ id: 'checkout', label: 'CHECKOUT' }],
  services: [
    {
      id: 'orders',
      name: 'Order service',
      description: 'Takes the order.',
      boundary: 'checkout',
      position: { x: 0, y: 0 },
    },
    { id: 'database', name: 'Database', boundary: 'checkout', position: { x: 0, y: 220 } },
  ],
  links: [{ id: 'orders-database', from: 'orders', to: 'database', label: 'Stores' }],
};

afterEach(() => {
  document.body.replaceChildren();
});

describe('architecture map detail in the side panel', () => {
  it('lists a service’s description and boundary', async () => {
    const { board, reports } = await mountInPanelOwner('dpk-board-architecture-map', DpkBoardArchitectureMap, data);
    await clickIn(board, '[data-service="orders"]');
    expect(await shownDetail(selectedDetail(reports))).toEqual({
      kind: 'Service',
      title: 'orders',
      name: 'Order service',
      rows: [
        ['Description', 'Takes the order.'],
        ['Boundary', 'CHECKOUT'],
      ],
    });
  });

  it('lists a link’s ends', async () => {
    const { board, reports } = await mountInPanelOwner('dpk-board-architecture-map', DpkBoardArchitectureMap, data);
    await clickIn(board, '[data-link-label="orders-database"]');
    const shown = await shownDetail(selectedDetail(reports));
    expect(shown.name).toBe('Stores');
    expect(shown.rows).toEqual([
      ['From', 'Order service'],
      ['To', 'Database'],
    ]);
  });
});
