import { afterEach, describe, expect, it } from 'vitest';

import { DpkComponentSequenceDiagram } from './element';
import { defineSequenceDiagram } from './index';
import { sequenceDiagramMessages } from './messages';
import { flattenMessages, layoutSequence, messageNumbers, parseSequenceData, pruneItems } from './model';

defineSequenceDiagram();

const m = sequenceDiagramMessages('en');

const raw = {
  participants: [
    { id: 'browser', name: 'ブラウザ', role: '購入者', symbol: 'UI' },
    { id: 'api', name: 'Order API', role: '注文の整合性', symbol: 'API' },
    { id: 'db', name: 'Database', role: '注文の記録', symbol: 'DB' },
    { id: 'payment', name: 'Payment', role: '決済プロバイダ', kind: 'external', description: '外部の決済事業者。' },
  ],
  items: [
    {
      kind: 'message',
      id: 'm1',
      from: 'browser',
      to: 'api',
      title: 'POST /orders',
      tags: ['正常系'],
      guard: '購入者が確定済み',
      detail: '冪等キーを送る。',
    },
    {
      kind: 'fragment',
      id: 'payment-result',
      operator: 'alt',
      title: '決済結果',
      branches: [
        {
          label: '支払完了',
          items: [
            { kind: 'message', id: 'm2', from: 'api', to: 'payment', title: 'POST /payments', tags: ['正常系'] },
            {
              kind: 'message',
              id: 'm3',
              from: 'payment',
              to: 'api',
              title: 'succeeded',
              style: 'response',
              tags: ['正常系', '非同期'],
            },
          ],
        },
        {
          label: 'カード拒否',
          items: [
            {
              kind: 'message',
              id: 'm4',
              from: 'payment',
              to: 'api',
              title: 'payment_failed',
              style: 'response',
              tags: ['決済失敗'],
            },
          ],
        },
      ],
    },
    {
      kind: 'message',
      id: 'm5',
      from: 'api',
      to: 'browser',
      title: '201 Created',
      style: 'response',
      tags: ['正常系'],
    },
    {
      kind: 'fragment',
      id: 'duplicate',
      operator: 'loop',
      title: '通知の重複排除',
      collapsed: true,
      branches: [
        {
          label: '重複受信',
          items: [{ kind: 'message', id: 'm6', from: 'api', to: 'db', title: 'event_id 登録', tags: ['非同期'] }],
        },
      ],
    },
  ],
} as const;

const settle = async (element: DpkComponentSequenceDiagram): Promise<void> => {
  for (let index = 0; index < 3; index++) await element.updateComplete;
};

const mount = async (lang?: string): Promise<DpkComponentSequenceDiagram> => {
  const element = new DpkComponentSequenceDiagram();
  if (lang !== undefined) element.setAttribute('lang', lang);
  element.data = parseSequenceData(raw);
  document.body.append(element);
  await settle(element);
  return element;
};

const labels = (element: DpkComponentSequenceDiagram): (string | undefined)[] =>
  [...element.renderRoot.querySelectorAll<HTMLElement>('[data-message-label]')].map(
    (node) => node.dataset['messageLabel'],
  );

afterEach(() => {
  document.body.replaceChildren();
});

describe('sequence comment targets', () => {
  it('exposes encoded participant/message refs, including messages in collapsed fragments', async () => {
    const element = await mount();
    expect(element.commentTargets).toEqual([]);
    element.id = 'checkout/日本語';
    await settle(element);
    const prefix = `element:${encodeURIComponent(element.id)}`;
    expect(element.commentTargets.map((target) => target.value)).toContain(`${prefix}/message/m6`);
    const targets = element.commentTargets;
    element.tagFilter = { match: 'single', active: ['absent'] };
    await settle(element);
    expect(element.commentTargets).toEqual(targets);
  });

  it('opens the contextual composer beside a participant or a message', async () => {
    const element = await mount();
    element.id = 'checkout';
    await settle(element);
    const trigger = (kind: string, id: string) =>
      element.renderRoot.querySelector<HTMLButtonElement>(`[data-comment-kind="${kind}"][data-comment-id="${id}"]`);
    expect(trigger('participant', 'api')?.previousElementSibling).toBe(
      element.renderRoot.querySelector('[data-participant="api"]'),
    );
    trigger('participant', 'api')?.click();
    await settle(element);
    expect(element.selection).toEqual({ kind: 'participant', id: 'api' });
    expect(element.renderRoot.querySelector('.comment-target')?.textContent).toBe('Order API');
    expect(trigger('message', 'm2')?.previousElementSibling).toBe(
      element.renderRoot.querySelector('[data-message-label="m2"]'),
    );
    trigger('message', 'm2')?.click();
    await settle(element);
    expect(element.selection).toEqual({ kind: 'message', id: 'm2' });
    expect(element.renderRoot.querySelector('.comment-target')?.textContent).toBe('02 POST /payments');
  });

  it('keeps the guard and what a message guarantees in its tooltip', async () => {
    const element = await mount();
    expect(element.renderRoot.querySelector('[data-message-label="m1"]')?.getAttribute('title')).toBe(
      `購入者が確定済み\n${m.detailLabel('request')}: 冪等キーを送る。`,
    );
  });
});

describe('sequence diagram data', () => {
  it('validates participants, nested items and ids', () => {
    const data = parseSequenceData(raw);
    expect(data.participants).toHaveLength(4);
    expect(data.participants[3]).toMatchObject({ external: true, symbol: null, description: '外部の決済事業者。' });
    expect(flattenMessages(data.items).map((message) => message.id)).toEqual(['m1', 'm2', 'm3', 'm4', 'm5', 'm6']);
    expect(flattenMessages(data.items)[0]).toMatchObject({
      style: 'request',
      tags: ['正常系'],
      guard: '購入者が確定済み',
    });
    expect(messageNumbers(data).get('m4')).toBe('04');
    expect(() =>
      parseSequenceData({
        participants: [{ id: 'a', name: 'A' }],
        items: [{ kind: 'message', id: 'm', from: 'a', to: 'x', title: 'T' }],
      }),
    ).toThrow(/unknown receiver/);
    expect(() =>
      parseSequenceData({
        participants: [{ id: 'a', name: 'A' }],
        items: [
          { kind: 'message', id: 'm', from: 'a', to: 'a', title: 'T' },
          { kind: 'message', id: 'm', from: 'a', to: 'a', title: 'U' },
        ],
      }),
    ).toThrow(/duplicate message id/);
    expect(() =>
      parseSequenceData({
        participants: [{ id: 'a', name: 'A' }],
        items: [{ kind: 'fragment', id: 'f', operator: 'alt', title: 'T', branches: [] }],
      }),
    ).toThrow();
  });

  it('prunes filtered messages, and the fragments left empty', () => {
    const data = parseSequenceData(raw);
    const kept = pruneItems(data.items, (message) => message.id === 'm4');
    expect(kept.map((item) => item.id)).toEqual(['payment-result']);
    expect(flattenMessages(kept).map((message) => message.id)).toEqual(['m4']);
    const layout = layoutSequence(data, () => true);
    expect(layout.rows.map((row) => row.message.id)).toEqual(['m1', 'm2', 'm3', 'm4', 'm5']);
    expect(layout.folds.map((fold) => fold.fragment.id)).toEqual(['duplicate']);
    expect(layout.frames.map((frame) => frame.fragment.id)).toEqual(['payment-result', 'duplicate']);
    expect(layout.x.get('browser')).toBe(120);
    expect(layout.x.get('payment')).toBe(840);
    expect(layout.height).toBeGreaterThan(300);
    const ys = layout.rows.map((row) => row.y);
    expect([...ys].sort((a, b) => a - b)).toEqual(ys);
  });
});

describe('dpk-component-sequence-diagram', () => {
  it('renders the participant rail, numbered messages and a folded fragment', async () => {
    const element = await mount();
    expect(element.renderRoot.querySelectorAll('[data-participant]')).toHaveLength(4);
    expect(
      element.renderRoot.querySelector<HTMLElement>('[data-participant="payment"]')?.classList.contains('is-external'),
    ).toBe(true);
    expect(labels(element)).toEqual(['m1', 'm2', 'm3', 'm4', 'm5']);
    expect([...element.renderRoot.querySelectorAll('.sequence-number')].map((node) => node.textContent)).toEqual([
      '01',
      '02',
      '03',
      '04',
      '05',
    ]);
    expect(element.renderRoot.querySelector('.diagram-stats')?.textContent).toBe(m.stats(5, 6));
    expect(element.renderRoot.querySelector('[data-fragment="duplicate"]')?.getAttribute('aria-expanded')).toBe(
      'false',
    );
    expect(element.renderRoot.querySelector('.sequence-fold')?.textContent).toContain('[重複受信]');
    expect(element.renderRoot.querySelectorAll('.sequence-lifeline')).toHaveLength(4);
  });

  it('expands and folds fragments from their headers', async () => {
    const element = await mount();
    element.renderRoot.querySelector<HTMLButtonElement>('[data-fragment="duplicate"]')?.click();
    await element.updateComplete;
    expect(labels(element)).toEqual(['m1', 'm2', 'm3', 'm4', 'm5', 'm6']);
    expect(element.renderRoot.querySelector('[data-fragment="duplicate"]')?.getAttribute('aria-expanded')).toBe('true');

    element.renderRoot.querySelector<HTMLButtonElement>('[data-fragment="payment-result"]')?.click();
    await element.updateComplete;
    expect(labels(element)).toEqual(['m1', 'm5', 'm6']);
    expect(element.renderRoot.querySelector('[data-fragment="payment-result"]')?.getAttribute('aria-expanded')).toBe(
      'false',
    );
    expect([...element.renderRoot.querySelectorAll('.sequence-branch')].map((node) => node.textContent)).toEqual([
      '[重複受信]',
    ]);
  });

  it('highlights a message, a participant and their messages', async () => {
    const element = await mount();
    element.renderRoot.querySelector<HTMLButtonElement>('[data-message-label="m2"]')?.click();
    await element.updateComplete;
    expect(element.selection).toEqual({ kind: 'message', id: 'm2' });
    expect(element.renderRoot.querySelector('.diagram-details')).toBeNull();
    expect(element.renderRoot.querySelector('[data-message="m2"]')?.classList.contains('is-selected')).toBe(true);
    expect(element.renderRoot.querySelector('[data-participant="payment"]')?.classList.contains('is-related')).toBe(
      true,
    );
    expect(element.renderRoot.querySelector('[data-participant="db"]')?.classList.contains('is-dimmed')).toBe(true);

    element.select({ kind: 'participant', id: 'api' });
    await element.updateComplete;
    expect(element.renderRoot.querySelectorAll('.sequence-message-row.is-related')).toHaveLength(5);
  });

  it('filters messages by tag, and shows the empty state when nothing matches', async () => {
    const element = await mount();
    element.renderRoot.querySelector<HTMLButtonElement>('[data-tag="決済失敗"]')?.click();
    await element.updateComplete;
    expect(labels(element)).toEqual(['m4']);
    expect(
      [...element.renderRoot.querySelectorAll<HTMLElement>('[data-participant]')].map(
        (node) => node.dataset['participant'],
      ),
    ).toEqual(['api', 'payment']);
    expect(element.renderRoot.querySelector('.diagram-stats')?.textContent).toBe(m.stats(1, 6));

    element.tagFilter = { match: 'all', active: ['nothing'] };
    await element.updateComplete;
    expect(element.renderRoot.querySelector('.diagram-empty')?.textContent).toContain(m.empty);
  });

  it('fits the width on first render and keeps the rail aligned', async () => {
    const element = await mount();
    expect(element.renderRoot.querySelector('.diagram-zoom-value')?.textContent).toMatch(/^\d+%$/);
    const rail = element.renderRoot.querySelector<HTMLElement>('.sequence-rail-world');
    expect(rail?.style.transform).toContain('translateX');
    element.resetView();
    expect(element.renderRoot.querySelector('.diagram-zoom-value')?.textContent).toMatch(/^\d+%$/);
  });

  it('renders its kit text in the element’s language', async () => {
    const ja = sequenceDiagramMessages('ja');
    const element = await mount('ja');
    expect(element.renderRoot.querySelector('.diagram-stats')?.textContent).toBe(ja.stats(5, 6));
    expect(element.renderRoot.querySelector('.sequence-rail')?.getAttribute('aria-label')).toBe(ja.participants);
    expect(element.renderRoot.querySelector('[data-fragment="duplicate"]')?.getAttribute('aria-label')).toBe(
      ja.frameHeaderLabel('loop', '通知の重複排除', true),
    );
    element.tagFilter = { match: 'all', active: ['nothing'] };
    await element.updateComplete;
    expect(element.renderRoot.querySelector('.diagram-empty')?.textContent).toContain(ja.empty);
  });

  it('renders its kit text in English by default', async () => {
    const element = await mount();
    expect(element.renderRoot.querySelector('.sequence-rail')?.getAttribute('aria-label')).toBe(m.participants);
    expect(element.renderRoot.querySelector('[data-fragment="duplicate"]')?.getAttribute('aria-label')).toBe(
      m.frameHeaderLabel('loop', '通知の重複排除', true),
    );
  });
});
