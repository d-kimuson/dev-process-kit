import { afterEach, describe, expect, it } from 'vitest';

import { DpkComponentStateDiagram } from './element';
import { defineStateDiagram } from './index';
import { hasAuthoredPositions, parseStateData } from './model';

defineStateDiagram();

const raw = {
  states: [
    { id: 'pending', name: '注文受付', code: 'pending', kind: 'initial', position: { x: 0, y: 0 } },
    {
      id: 'paid',
      name: '支払済み',
      code: 'paid',
      description: '出荷指示前ならキャンセルできる。',
      position: { x: 300, y: 0 },
    },
    { id: 'cancelled', name: '取消済み', kind: 'terminal', position: { x: 0, y: 200 } },
    { id: 'refunding', name: '返金待ち', kind: 'compensation', position: { x: 300, y: 200 } },
  ],
  transitions: [
    {
      id: 'charge',
      from: 'pending',
      to: 'paid',
      title: '決済成功',
      tags: ['正常系'],
      guard: '決済成功通知を検証済み',
      effect: 'paid へ一度だけ更新する。',
    },
    { id: 'cancel', from: 'pending', to: 'cancelled', title: '決済取消', tags: ['キャンセル'], kind: 'exception' },
    { id: 'refund', from: 'paid', to: 'refunding', title: 'キャンセル受付', tags: ['キャンセル'] },
    { id: 'refunded', from: 'refunding', to: 'refunding', title: '返金成功', tags: ['キャンセル', '非同期'] },
  ],
};

const settle = async (element: DpkComponentStateDiagram): Promise<void> => {
  for (let index = 0; index < 3; index++) await element.updateComplete;
};

const mount = async (): Promise<DpkComponentStateDiagram> => {
  const element = document.createElement('dpk-component-state-diagram');
  if (!(element instanceof DpkComponentStateDiagram)) throw new Error('did not upgrade');
  element.innerHTML = `<script type="application/json">${JSON.stringify(raw)}</script>`;
  document.body.append(element);
  await settle(element);
  return element;
};

const ids = (element: DpkComponentStateDiagram, selector: string): (string | undefined)[] =>
  [...element.renderRoot.querySelectorAll<HTMLElement>(selector)].map(
    (node) => node.dataset['state'] ?? node.dataset['transition'] ?? node.dataset['transitionLabel'],
  );

afterEach(() => {
  document.body.replaceChildren();
});

describe('state diagram data', () => {
  it('validates ids, endpoints and defaults', () => {
    const data = parseStateData(raw);
    expect(data.nodes).toHaveLength(4);
    expect(data.edges[0]).toMatchObject({ id: 'charge', kind: 'normal', tags: ['正常系'] });
    expect(data.edges[1]).toMatchObject({ kind: 'exception', guard: null, effect: null });
    expect(data.nodes[0]).toMatchObject({ code: 'pending', kind: 'initial', tags: [] });
    expect(hasAuthoredPositions(data.nodes)).toBe(true);
    expect(hasAuthoredPositions(parseStateData({ states: [{ id: 'a', name: 'A' }] }).nodes)).toBe(false);
    expect(() =>
      parseStateData({
        states: [
          { id: 'a', name: 'A' },
          { id: 'a', name: 'B' },
        ],
      }),
    ).toThrow(/duplicate state id/);
    expect(() =>
      parseStateData({ states: [{ id: 'a', name: 'A' }], transitions: [{ id: 't', from: 'a', to: 'x', title: 'T' }] }),
    ).toThrow(/unknown transition target/);
    expect(() => parseStateData({ states: [], typo: true })).toThrow();
  });
});

describe('dpk-component-state-diagram', () => {
  it('renders states at their authored positions with an initial marker', async () => {
    const element = await mount();
    expect(ids(element, '.state-node')).toEqual(['pending', 'paid', 'cancelled', 'refunding']);
    expect(element.renderRoot.querySelector<HTMLElement>('[data-state="pending"]')?.style.left).toBe('44px');
    expect(element.renderRoot.querySelector<HTMLElement>('[data-state="paid"]')?.style.left).toBe('344px');
    expect(element.renderRoot.querySelectorAll('.state-initial-mark')).toHaveLength(1);
    expect(element.renderRoot.querySelectorAll('[data-transition-label]')).toHaveLength(4);
    expect(element.renderRoot.querySelector('.diagram-stats')?.textContent).toBe('4 状態 · 4 遷移');
  });

  it('highlights the transitions in and out of the selected state', async () => {
    const element = await mount();
    element.renderRoot.querySelector<HTMLButtonElement>('[data-state="paid"]')?.click();
    await element.updateComplete;
    expect(ids(element, '.state-edge.is-related')).toEqual(['charge', 'refund']);
    expect(
      element.renderRoot.querySelector<HTMLElement>('[data-state="pending"]')?.classList.contains('is-related'),
    ).toBe(true);
    expect(
      element.renderRoot.querySelector<HTMLElement>('[data-state="refunding"]')?.classList.contains('is-related'),
    ).toBe(true);
    expect(
      element.renderRoot.querySelector<HTMLElement>('[data-state="cancelled"]')?.classList.contains('is-dimmed'),
    ).toBe(true);
    expect(element.renderRoot.querySelector<HTMLElement>('[data-state="paid"]')?.getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  it('opens the contextual composer beside a state or a transition label', async () => {
    const element = await mount();
    element.id = 'lifecycle';
    await settle(element);
    expect(element.renderRoot.querySelector('.diagram-details')).toBeNull();
    const trigger = (kind: string, id: string) =>
      element.renderRoot.querySelector<HTMLButtonElement>(`[data-comment-kind="${kind}"][data-comment-id="${id}"]`);
    expect(element.renderRoot.querySelectorAll('[data-comment-kind="node"]')).toHaveLength(4);
    expect(element.renderRoot.querySelectorAll('[data-comment-kind="edge"]')).toHaveLength(4);
    trigger('node', 'paid')?.click();
    await settle(element);
    expect(element.selection).toEqual({ kind: 'node', id: 'paid' });
    expect(element.renderRoot.querySelector('.comment-target')?.textContent).toBe('支払済み');
    const label = element.renderRoot.querySelector('[data-transition-label="charge"]');
    expect(label?.nextElementSibling).toBe(trigger('edge', 'charge'));
    trigger('edge', 'charge')?.click();
    await settle(element);
    expect(element.selection).toEqual({ kind: 'edge', id: 'charge' });
    expect(element.renderRoot.querySelector('.comment-target')?.textContent).toBe('注文受付 → 支払済み · 決済成功');
  });

  it('keeps the guard and the effect of a transition in its tooltip', async () => {
    const element = await mount();
    expect(element.renderRoot.querySelector('[data-transition-label="charge"]')?.getAttribute('title')).toBe(
      '決済成功通知を検証済み\npaid へ一度だけ更新する。',
    );
  });

  it('selects a transition from its label and marks exceptions', async () => {
    const element = await mount();
    expect(element.renderRoot.querySelector('[data-transition="cancel"]')?.classList.contains('is-exception')).toBe(
      true,
    );
    element.renderRoot.querySelector<HTMLButtonElement>('[data-transition-label="refund"]')?.click();
    await element.updateComplete;
    expect(element.selection).toEqual({ kind: 'edge', id: 'refund' });
    expect(ids(element, '.state-edge.is-selected')).toEqual(['refund']);
  });

  it('filters by transition tag and drops states left without transitions', async () => {
    const element = await mount();
    element.renderRoot.querySelector<HTMLButtonElement>('[data-tag="正常系"]')?.click();
    await element.updateComplete;
    expect(ids(element, '.state-node')).toEqual(['pending', 'paid']);
    expect(ids(element, '[data-transition-label]')).toEqual(['charge']);
    expect(element.renderRoot.querySelectorAll('.state-initial-mark')).toHaveLength(1);

    element.renderRoot.querySelector<HTMLButtonElement>('.dpk-tag-clear')?.click();
    await element.updateComplete;
    expect(ids(element, '.state-node')).toHaveLength(4);

    element.tagFilter = { match: 'all', active: ['nothing'] };
    await element.updateComplete;
    expect(element.renderRoot.querySelector('.diagram-empty')?.textContent).toContain('該当する遷移はありません');
  });

  it('lays out states without positions automatically', async () => {
    const element = new DpkComponentStateDiagram();
    element.data = parseStateData({
      states: [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
        { id: 'c', name: 'C', kind: 'terminal' },
      ],
      transitions: [
        { id: 't1', from: 'a', to: 'b', title: '次へ' },
        { id: 't2', from: 'a', to: 'c', title: '分岐' },
      ],
    });
    document.body.append(element);
    await settle(element);
    const style = (id: string, property: 'left' | 'top') =>
      element.renderRoot.querySelector<HTMLElement>(`[data-state="${id}"]`)?.style[property];
    expect(style('a', 'left')).toBe('44px');
    // `b` and `c` share the layer after `a`; the layer spreads them vertically.
    expect(style('b', 'left')).toBe('332px');
    expect(style('c', 'left')).toBe('332px');
    expect(style('b', 'top')).not.toBe(style('c', 'top'));
    expect(element.renderRoot.querySelector('.state-edge .d-edge-path')?.getAttribute('d')).toMatch(/^M/);
  });
});
