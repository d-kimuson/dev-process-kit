import { afterEach, describe, expect, it } from 'vitest';

import { clickIn, mountInPanelOwner, selectedDetail, shownDetail } from '../base/detail-fields.testing';
import { DpkBoardBpmn } from './element';
import { defineBpmn } from './index';

defineBpmn();

const data = {
  pools: [{ id: 'shop', name: 'Shop', lanes: [{ id: 'cs', name: 'Orders' }] }],
  nodes: [
    { id: 'check', kind: 'task', task: 'service', lane: 'cs', name: 'Check stock', description: 'Asks the warehouse.' },
    { id: 'gw', kind: 'gateway', lane: 'cs', name: 'In stock?' },
    { id: 'ship', kind: 'task', lane: 'cs', name: 'Ship' },
    { id: 'sorry', kind: 'task', lane: 'cs', name: 'Apologize' },
  ],
  flows: [
    { id: 'f1', from: 'check', to: 'gw' },
    { id: 'f2', from: 'gw', to: 'ship', condition: 'In stock' },
    { id: 'f3', from: 'gw', to: 'sorry', default: true, name: 'Otherwise' },
  ],
};

afterEach(() => {
  document.body.replaceChildren();
});

describe('BPMN detail in the side panel', () => {
  it('lists a task’s type, lane and description', async () => {
    const { board, reports } = await mountInPanelOwner('dpk-board-bpmn', DpkBoardBpmn, data);
    await clickIn(board, '[data-node="check"]');
    const shown = await shownDetail(selectedDetail(reports));
    expect(shown.name).toBe('Check stock');
    expect(shown.rows.map(([label]) => label)).toEqual(['Type', 'Lane', 'Description']);
    expect(shown.rows.slice(1)).toEqual([
      ['Lane', 'Shop / Orders'],
      ['Description', 'Asks the warehouse.'],
    ]);
  });

  it('names a conditional flow by its condition and lists its ends', async () => {
    const { board, reports } = await mountInPanelOwner('dpk-board-bpmn', DpkBoardBpmn, data);
    await clickIn(board, '[data-flow-label="f2"]');
    const shown = await shownDetail(selectedDetail(reports));
    expect(shown.name).toBe('In stock');
    expect(shown.rows).toContainEqual(['From', 'In stock?']);
    expect(shown.rows).toContainEqual(['To', 'Ship']);
    expect(shown.rows.map(([label]) => label)).not.toContain('Condition');
  });

  it('marks a default flow as the default', async () => {
    const { board, reports } = await mountInPanelOwner('dpk-board-bpmn', DpkBoardBpmn, data, 'ja');
    await clickIn(board, '[data-flow-label="f3"]');
    const [, kind] = (await shownDetail(selectedDetail(reports))).rows[0] ?? [];
    expect(kind).toContain('（既定）');
  });
});
