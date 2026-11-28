import { afterEach, describe, expect, it } from 'vitest';

import { clickIn, mountInPanelOwner, selectedDetail, shownDetail } from '../base/detail-fields.testing';
import { DpkBoardSequenceDiagram } from './element';
import { defineSequenceDiagram } from './index';

defineSequenceDiagram();

const data = {
  participants: [
    { id: 'browser', name: 'Browser', role: 'Buyer', description: 'Where the buyer orders.' },
    { id: 'api', name: 'Order API' },
  ],
  items: [
    {
      kind: 'message',
      id: 'm1',
      from: 'browser',
      to: 'api',
      title: 'POST /orders',
      guard: 'Signed in',
      detail: 'Sends an idempotency key.',
    },
  ],
};

afterEach(() => {
  document.body.replaceChildren();
});

describe('sequence diagram detail in the side panel', () => {
  it('lists a participant’s role and description', async () => {
    const { board, reports } = await mountInPanelOwner('dpk-board-sequence-diagram', DpkBoardSequenceDiagram, data);
    await clickIn(board, '[data-participant="browser"]');
    expect(await shownDetail(selectedDetail(reports))).toEqual({
      kind: 'Participant',
      title: 'browser',
      name: 'Browser',
      rows: [
        ['Role', 'Buyer'],
        ['Description', 'Where the buyer orders.'],
      ],
    });
  });

  it('lists a message’s number, ends, condition and detail', async () => {
    const { board, reports } = await mountInPanelOwner('dpk-board-sequence-diagram', DpkBoardSequenceDiagram, data);
    await clickIn(board, '[data-message-label="m1"]');
    const shown = await shownDetail(selectedDetail(reports));
    expect(shown.name).toBe('01 POST /orders');
    expect(shown.rows).toEqual([
      ['From', 'Browser'],
      ['To', 'Order API'],
      ['Condition', 'Signed in'],
      [expect.any(String), 'Sends an idempotency key.'],
    ]);
  });
});
