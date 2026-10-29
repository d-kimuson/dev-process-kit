import { afterEach, describe, expect, it } from 'vitest';

import type { ContextMenuRequest } from '../../core/context-menu/types';
import type { LayoutPoint } from '../../lib/layout/layered';

import { EMPTY_CHECK_STATE, withEnabled } from '../../core/check-mode';
import { collectCheckBindings } from '../../core/shell/check-mode-badges';
import { parseTargetRef } from '../../core/target';
import { scoreLayout, type LayoutGeometry } from '../../lib/layout/metrics';
import { DpkBoardStateDiagram } from './element';
import { defineStateDiagram } from './index';
import { stateDiagramMessages } from './messages';
import { hasAuthoredPositions, parseStateData } from './model';

defineStateDiagram();

const m = stateDiagramMessages('en');

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

const settle = async (element: DpkBoardStateDiagram): Promise<void> => {
  for (let index = 0; index < 3; index++) await element.updateComplete;
};

const mount = async (lang?: string): Promise<DpkBoardStateDiagram> => {
  const element = document.createElement('dpk-board-state-diagram');
  if (!(element instanceof DpkBoardStateDiagram)) throw new Error('did not upgrade');
  if (lang !== undefined) element.setAttribute('lang', lang);
  element.innerHTML = `<script type="application/json">${JSON.stringify(raw)}</script>`;
  document.body.append(element);
  await settle(element);
  return element;
};

const reviewComment = (element: DpkBoardStateDiagram, ref: string): void => {
  const request: ContextMenuRequest = { clientX: 0, clientY: 0, target: parseTargetRef(ref) };
  const groups = element.getContextMenuItems(request) ?? [];
  const entry = groups.flatMap((group) => group.entries).find((candidate) => candidate.id === 'review-comment');
  if (entry?.kind === 'item') entry.run();
};

const ids = (element: DpkBoardStateDiagram, selector: string): (string | undefined)[] =>
  [...element.renderRoot.querySelectorAll<HTMLElement>(selector)].map(
    (node) => node.dataset['state'] ?? node.dataset['transition'] ?? node.dataset['transitionLabel'],
  );

/** Mounts data without asserting anything: the routing tests read the drawn geometry back. */
const mountData = async (data: ReturnType<typeof parseStateData>): Promise<DpkBoardStateDiagram> => {
  const element = new DpkBoardStateDiagram();
  element.data = data;
  document.body.append(element);
  await settle(element);
  return element;
};

const routePoints = (element: DpkBoardStateDiagram, transition: string): LayoutPoint[] => {
  const d = element.renderRoot.querySelector(`[data-transition="${transition}"] .d-edge-path`)?.getAttribute('d') ?? '';
  return [...d.matchAll(/(-?[\d.]+)[ ,](-?[\d.]+)/g)].map((match) => ({
    x: Number(match[1]),
    y: Number(match[2]),
  }));
};

/** The geometry the reader actually sees: placed state cards plus each transition's drawn polyline. */
const drawnGeometry = (element: DpkBoardStateDiagram, data: ReturnType<typeof parseStateData>): LayoutGeometry => ({
  nodes: [...element.renderRoot.querySelectorAll<HTMLElement>('[data-state]')].map((card) => ({
    id: card.dataset['state'] ?? '',
    box: {
      x: Number.parseFloat(card.style.left),
      y: Number.parseFloat(card.style.top),
      width: Number.parseFloat(card.style.width),
      height: Number.parseFloat(card.style.height),
    },
  })),
  edges: data.edges.map((edge) => ({
    id: edge.id,
    from: edge.from,
    to: edge.to,
    points: routePoints(element, edge.id),
  })),
});

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

describe('dpk-board-state-diagram', () => {
  it('renders states at their authored positions with an initial marker', async () => {
    const element = await mount();
    expect(ids(element, '.state-node')).toEqual(['pending', 'paid', 'cancelled', 'refunding']);
    expect(element.renderRoot.querySelector<HTMLElement>('[data-state="pending"]')?.style.left).toBe('44px');
    expect(element.renderRoot.querySelector<HTMLElement>('[data-state="paid"]')?.style.left).toBe('344px');
    expect(element.renderRoot.querySelectorAll('.state-initial-mark')).toHaveLength(1);
    expect(element.renderRoot.querySelectorAll('[data-transition-label]')).toHaveLength(4);
    expect(element.renderRoot.querySelector('.diagram-stats')?.textContent).toBe(`4 ${m.node} · 4 ${m.edge}`);
  });

  it('renders its stats and empty message in the element’s language', async () => {
    const ja = stateDiagramMessages('ja');
    const element = await mount('ja');
    expect(element.renderRoot.querySelector('.diagram-stats')?.textContent).toBe(`4 ${ja.node} · 4 ${ja.edge}`);
    element.tagFilter = { match: 'all', active: ['nothing'] };
    await element.updateComplete;
    expect(element.renderRoot.querySelector('.diagram-empty')?.textContent).toContain(ja.empty);
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

  it('offers only its states as Check Mode targets, never a transition label', async () => {
    const element = await mount();
    element.id = 'lifecycle';
    await settle(element);
    const bindings = collectCheckBindings(element, withEnabled(EMPTY_CHECK_STATE, true), null);
    expect(bindings.map((binding) => binding.ref)).toContain('element:lifecycle/node/pending');
    expect(bindings.filter((binding) => binding.ref.includes('/edge/'))).toEqual([]);
    expect(bindings.filter((binding) => binding.target.matches('.state-label'))).toEqual([]);
  });

  it('opens the contextual composer beside a state or a transition label', async () => {
    const element = await mount();
    element.id = 'lifecycle';
    await settle(element);
    expect(element.renderRoot.querySelector('.diagram-details')).toBeNull();
    reviewComment(element, 'element:lifecycle/node/paid');
    await settle(element);
    expect(element.renderRoot.querySelector('.comment-target')?.textContent).toBe('支払済み');
    reviewComment(element, 'element:lifecycle/edge/charge');
    await settle(element);
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
    element.renderRoot
      .querySelector('dpk-tag-filter')
      ?.shadowRoot?.querySelector<HTMLButtonElement>('[data-tag="正常系"]')
      ?.click();
    await element.updateComplete;
    expect(ids(element, '.state-node')).toEqual(['pending', 'paid']);
    expect(ids(element, '[data-transition-label]')).toEqual(['charge']);
    expect(element.renderRoot.querySelectorAll('.state-initial-mark')).toHaveLength(1);

    element.renderRoot
      .querySelector('dpk-tag-filter')
      ?.shadowRoot?.querySelector<HTMLButtonElement>('.dpk-tag-clear')
      ?.click();
    await element.updateComplete;
    expect(ids(element, '.state-node')).toHaveLength(4);

    element.tagFilter = { match: 'all', active: ['nothing'] };
    await element.updateComplete;
    expect(element.renderRoot.querySelector('.diagram-empty')?.textContent).toContain(m.empty);
  });

  it('lays out states without positions automatically', async () => {
    const element = new DpkBoardStateDiagram();
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

describe('state diagram transition routing', () => {
  // A transition that skips a rank is the shared router's blind spot: the plain
  // channel route between the two ports runs straight through the state that
  // sits in the skipped rank.
  it('routes a skip-rank transition around the state it skips', async () => {
    const data = parseStateData({
      states: [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
        { id: 'c', name: 'C' },
      ],
      transitions: [
        { id: 'a-b', from: 'a', to: 'b', title: 'ab' },
        { id: 'b-c', from: 'b', to: 'c', title: 'bc' },
        { id: 'a-c', from: 'a', to: 'c', title: 'ac' },
      ],
    });
    const element = await mountData(data);
    const score = scoreLayout(drawnGeometry(element, data));
    expect(score.edgeThroughNode.incidents).toBe(0);
    // The two transitions leave `a` through different points on the same side,
    // so neither rides on top of the other.
    expect(score.collinearOverlap.incidents).toBe(0);
  });

  // Four transitions out of one state used to share one exit port and one
  // channel per rank gap: four lines drawn on top of each other.
  it('fans four sibling transitions out of one state into separate lanes', async () => {
    const data = parseStateData({
      states: [
        { id: 'hub', name: 'Hub' },
        { id: 'x1', name: 'X1' },
        { id: 'x2', name: 'X2' },
        { id: 'x3', name: 'X3' },
        { id: 'x4', name: 'X4' },
      ],
      transitions: [
        { id: 'hub-x1', from: 'hub', to: 'x1', title: '1' },
        { id: 'hub-x2', from: 'hub', to: 'x2', title: '2' },
        { id: 'hub-x3', from: 'hub', to: 'x3', title: '3' },
        { id: 'hub-x4', from: 'hub', to: 'x4', title: '4' },
      ],
    });
    const element = await mountData(data);
    const score = scoreLayout(drawnGeometry(element, data));
    expect(score.edgeThroughNode.incidents).toBe(0);
    expect(score.collinearOverlap.incidents).toBe(0);
    expect(score.crossings).toBe(0);
    // Each transition still starts and ends on its own card's border.
    for (const edge of data.edges) {
      expect(routePoints(element, edge.id).length).toBeGreaterThanOrEqual(2);
    }
  });
});
