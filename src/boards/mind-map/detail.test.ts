import { afterEach, describe, expect, it } from 'vitest';

import { clickIn, mountInPanelOwner, selectedDetail, shownDetail } from '../base/detail-fields.testing';
import { DpkBoardMindMap } from './element';
import { defineMindMap } from './index';

defineMindMap();

const data = {
  root: {
    id: 'checkout',
    label: 'Checkout',
    children: [
      {
        id: 'payment',
        label: 'Payment',
        tags: ['External', 'Risky'],
        children: [{ id: 'retry', label: 'Retry', description: 'Resends with the same key.' }],
      },
    ],
  },
};

afterEach(() => {
  document.body.replaceChildren();
});

describe('mind map detail in the side panel', () => {
  it('lists a topic’s parent and description', async () => {
    const { board, reports } = await mountInPanelOwner('dpk-board-mind-map', DpkBoardMindMap, data);
    await clickIn(board, '[data-topic="retry"]');
    expect(await shownDetail(selectedDetail(reports))).toMatchObject({
      title: 'retry',
      name: 'Retry',
      rows: [
        ['Parent topic', 'Payment'],
        ['Description', 'Resends with the same key.'],
      ],
    });
  });

  it('lists a topic’s tags', async () => {
    const { board, reports } = await mountInPanelOwner('dpk-board-mind-map', DpkBoardMindMap, data);
    await clickIn(board, '[data-topic="payment"]');
    expect((await shownDetail(selectedDetail(reports))).rows).toContainEqual(['Tags', 'External, Risky']);
  });
});
