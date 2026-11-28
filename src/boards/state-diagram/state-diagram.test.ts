import { afterEach, describe, expect, it } from 'vitest';

import type { ContextMenuRequest } from '../../core/context-menu/types';
import type { LayoutPoint } from '../../lib/layout/layered';

import { EMPTY_CHECK_STATE, withEnabled } from '../../core/check-mode';
import { collectCheckBindings } from '../../core/shell/check-mode-badges';
import { parseTargetRef } from '../../core/target';
import { scoreLayout, type LayoutGeometry } from '../../lib/layout/metrics';
import { pathDataPoints } from '../../lib/layout/path-steps';
import { DpkBoardStateDiagram } from './element';
import { defineStateDiagram } from './index';
import { stateDiagramMessages } from './messages';
import { hasAuthoredPositions, parseStateData, STATE_NODE_SIZE } from './model';

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
  return [...pathDataPoints(d)];
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

describe('state diagram drawn geometry', () => {
  /*
   * Characterisation before the routing moves onto `lib/layout`'s shared
   * primitives: the exact `d` each transition is drawn with, and the centre of
   * each label chip, for a sample with a forward edge, a back edge, a
   * self-loop and an exception — recorded so a refactor cannot quietly move a
   * line or a label.
   */
  const sample = {
    states: [
      { id: 'idle', name: 'Idle', kind: 'initial', position: { x: 0, y: 0 } },
      { id: 'running', name: 'Running', position: { x: 320, y: 0 } },
      { id: 'paused', name: 'Paused', position: { x: 640, y: 180 } },
      { id: 'failed', name: 'Failed', kind: 'terminal', position: { x: 320, y: 240 } },
    ],
    transitions: [
      { id: 'start', from: 'idle', to: 'running', title: '開始する' },
      { id: 'pause', from: 'running', to: 'paused', title: '一時停止', kind: 'exception' },
      { id: 'resume', from: 'paused', to: 'running', title: '再開する' },
      { id: 'retry', from: 'running', to: 'running', title: 'リトライ' },
      { id: 'stop', from: 'running', to: 'failed', title: '停止する' },
      { id: 'back', from: 'paused', to: 'idle', title: '取り消す' },
    ],
  } as const;

  it('draws each transition and places each label the same way', async () => {
    const element = new DpkBoardStateDiagram();
    element.data = parseStateData(sample);
    document.body.append(element);
    await settle(element);
    const drawn = [...element.renderRoot.querySelectorAll<SVGGElement>('.state-edge')].map((edge) => {
      const id = edge.dataset['transition'] ?? '';
      const d = edge.querySelector('.d-edge-path')?.getAttribute('d') ?? '';
      const slot = element.renderRoot.querySelector<HTMLElement>(
        `.state-label-slot:has([data-transition-label="${id}"])`,
      );
      return { id, d, label: { left: slot?.style.left ?? '', top: slot?.style.top ?? '' } };
    });
    expect(drawn).toMatchInlineSnapshot(`
      [
        {
          "d": "M244 104 L391 104",
          "id": "start",
          "label": {
            "left": "317px",
            "top": "104px",
          },
        },
        {
          "d": "M564 95 L690 95 Q696 95 696 101 L696 260 Q696 266 702 266 L711 266",
          "id": "pause",
          "label": {
            "left": "696px",
            "top": "120px",
          },
        },
        {
          "d": "M712 284 L586 284 Q580 284 580 278 L580 119 Q580 113 574 113 L565 113",
          "id": "resume",
          "label": {
            "left": "580px",
            "top": "259px",
          },
        },
        {
          "d": "M464 72 L464 54 Q464 48 470 48 L486 48 Q492 48 492 54 L492 71",
          "id": "retry",
          "label": {
            "left": "478px",
            "top": "30px",
          },
        },
        {
          "d": "M478 136 L478 311",
          "id": "stop",
          "label": {
            "left": "478px",
            "top": "229px",
          },
        },
        {
          "d": "M712 302 L266 302 Q260 302 260 296 L260 128 Q260 122 254 122 L245 122",
          "id": "back",
          "label": {
            "left": "341px",
            "top": "302px",
          },
        },
      ]
    `);
  });
});

describe('dpk-board-state-diagram', () => {
  it('renders states at their authored positions with an initial marker', async () => {
    const element = await mount();
    expect(ids(element, '.state-node')).toEqual(['pending', 'paid', 'cancelled', 'refunding']);
    expect(element.renderRoot.querySelector<HTMLElement>('[data-state="pending"]')?.style.left).toBe('72px');
    expect(element.renderRoot.querySelector<HTMLElement>('[data-state="paid"]')?.style.left).toBe('372px');
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

  it('draws each arrowhead inline, with no <marker> left in the canvas', async () => {
    const element = await mount();
    expect(element.renderRoot.querySelectorAll('marker')).toHaveLength(0);
    const ends = [...element.renderRoot.querySelectorAll<SVGGElement>('.state-edge .d-edge-end')];
    expect(ends).toHaveLength(4);
    for (const end of ends) {
      expect(end.dataset['glyph']).toBe('arrow');
      expect(end.getAttribute('data-end')).toBe('end');
      expect(end.querySelector('polygon')).not.toBeNull();
    }
    // Every transition draws the shared flow overlay for its arrowless companion path.
    expect(element.renderRoot.querySelectorAll('.state-edge .d-edge-flow')).toHaveLength(4);
  });

  it('dashes an exception transition through the shared line-style class', async () => {
    const element = await mount();
    expect(element.renderRoot.querySelector('[data-transition="cancel"]')?.classList.contains('is-dashed')).toBe(true);
    expect(element.renderRoot.querySelector('[data-transition="charge"]')?.classList.contains('is-dashed')).toBe(false);
  });

  it('marks the transitions in and out of the selected state as flowing', async () => {
    const element = await mount();
    element.renderRoot.querySelector<HTMLButtonElement>('[data-state="paid"]')?.click();
    await element.updateComplete;
    expect(ids(element, '.state-edge.is-flowing')).toEqual(['charge', 'refund']);
    expect(element.renderRoot.querySelectorAll('.state-edge.is-flowing .d-edge-flow')).toHaveLength(2);
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
    expect(style('a', 'left')).toBe('72px');
    // `b` and `c` share the layer after `a`; the layer spreads them vertically.
    expect(Number.parseFloat(style('b', 'left') ?? '')).toBeGreaterThan(72 + STATE_NODE_SIZE.width);
    expect(style('c', 'left')).toBe(style('b', 'left'));
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

describe('state diagram line jumps', () => {
  const crossing = parseStateData({
    states: [
      { id: 'a', name: 'A', position: { x: 0, y: 300 } },
      { id: 'c', name: 'C', position: { x: 640, y: 300 } },
      { id: 'e', name: 'E', position: { x: 300, y: 0 } },
      { id: 'f', name: 'F', position: { x: 300, y: 600 } },
    ],
    transitions: [
      { id: 'ac', from: 'a', to: 'c', title: 'across' },
      { id: 'ef', from: 'e', to: 'f', title: 'over' },
    ],
  });

  const drawn = (element: DpkBoardStateDiagram, id: string): string =>
    element.renderRoot.querySelector(`[data-transition="${id}"] .d-edge-path`)?.getAttribute('d') ?? '';

  it('lifts a level run over the transition crossing it, leaving the crossed line straight', async () => {
    const element = await mountData(crossing);
    expect(drawn(element, 'ac')).toMatch(/L[\d.]+ \d+ A6 6 0 0 1 [\d.]+ \d+ L/);
    expect(drawn(element, 'ef')).not.toContain(' A');
  });

  it('draws the same jumps again from cache on a re-render, and none mid-drag', async () => {
    const element = await mountData(crossing);
    const withJump = drawn(element, 'ac');
    element.select({ kind: 'node', id: 'a' });
    await settle(element);
    expect(drawn(element, 'ac')).toBe(withJump);
  });
});
