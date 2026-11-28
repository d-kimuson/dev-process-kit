import { afterEach, describe, expect, it } from 'vitest';

import { clickIn, mountInPanelOwner, selectedDetail, shownDetail } from '../base/detail-fields.testing';
import { DpkBoardStateDiagram } from './element';
import { defineStateDiagram } from './index';

defineStateDiagram();

const data = {
  states: [
    { id: 'pending', name: '注文受付', code: 'pending', kind: 'initial' },
    { id: 'paid', name: '支払済み', description: '出荷指示前ならキャンセルできる。' },
  ],
  transitions: [
    {
      id: 'charge',
      from: 'pending',
      to: 'paid',
      title: '決済成功',
      guard: '決済成功通知を検証済み',
      effect: 'paid へ一度だけ更新する。',
    },
  ],
};

const mount = (lang?: string) => mountInPanelOwner('dpk-board-state-diagram', DpkBoardStateDiagram, data, lang);

afterEach(() => {
  document.body.replaceChildren();
});

describe('state diagram detail in the side panel', () => {
  it('lists a state’s code and description in the page’s language', async () => {
    const { board, reports } = await mount('ja');
    await clickIn(board, '[data-state="paid"]');
    expect(await shownDetail(selectedDetail(reports))).toEqual({
      kind: '状態',
      title: 'paid',
      name: '支払済み',
      rows: [['説明', '出荷指示前ならキャンセルできる。']],
    });
  });

  it('lists a transition’s ends, guard and effect', async () => {
    const { board, reports } = await mount();
    await clickIn(board, '[data-transition-label="charge"]');
    expect((await shownDetail(selectedDetail(reports))).rows).toEqual([
      ['From', '注文受付'],
      ['To', '支払済み'],
      ['Guard', '決済成功通知を検証済み'],
      ['Effect', 'paid へ一度だけ更新する。'],
    ]);
  });

  it('reports a click as a selection, which leaves a closed panel closed', async () => {
    const { board, reports } = await mount();
    await clickIn(board, '[data-state="pending"]');
    expect(reports.map((report) => report.report)).not.toContain('open');
    expect(selectedDetail(reports)?.key).toContain('pending');
  });

  it('empties the detail when the selection clears', async () => {
    const { board, reports } = await mount();
    await clickIn(board, '[data-state="paid"]');
    board.select(null);
    expect(selectedDetail(reports)).toBeNull();
  });
});
