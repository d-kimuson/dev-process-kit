import { afterEach, describe, expect, it } from 'vitest';

import { diagramMessages } from '../base/messages';
import { DpkBoardBpmn } from './element';
import { defineBpmn } from './index';

defineBpmn();

const raw = {
  pools: [
    { id: 'customer', name: '顧客' },
    {
      id: 'shop',
      name: 'EC サイト',
      lanes: [
        { id: 'cs', name: '受注' },
        { id: 'wh', name: '倉庫' },
      ],
    },
  ],
  nodes: [
    { id: 'start', kind: 'event', event: 'start', trigger: 'message', lane: 'cs', name: '注文受信' },
    { id: 'check', kind: 'task', task: 'service', lane: 'cs', name: '在庫を確認' },
    { id: 'gw', kind: 'gateway', lane: 'cs', name: '在庫あり?' },
    { id: 'ship', kind: 'task', task: 'user', lane: 'wh', name: '出荷' },
    { id: 'sorry', kind: 'task', task: 'send', lane: 'cs', name: '欠品を連絡' },
    { id: 'done', kind: 'event', event: 'end', lane: 'wh' },
    { id: 'note', kind: 'annotation', text: '在庫は 5 分ごとに同期' },
  ],
  flows: [
    { id: 'f1', from: 'start', to: 'check' },
    { id: 'f2', from: 'check', to: 'gw' },
    { id: 'f3', from: 'gw', to: 'ship', condition: '在庫あり' },
    { id: 'f4', from: 'gw', to: 'sorry', default: true, name: 'それ以外' },
    { id: 'f5', from: 'ship', to: 'done' },
    { id: 'm1', kind: 'message', from: 'customer', to: 'start', name: '注文' },
    { id: 'm2', kind: 'message', from: 'sorry', to: 'customer', name: '欠品通知' },
    { id: 'a1', kind: 'association', from: 'note', to: 'check' },
  ],
};

const conditional = {
  pools: [{ id: 'p', name: 'P', lanes: [{ id: 'l', name: 'L' }] }],
  nodes: [
    { id: 'start', kind: 'event', event: 'start', lane: 'l' },
    { id: 'a', kind: 'task', lane: 'l', name: 'A' },
    { id: 'b', kind: 'task', lane: 'l', name: 'B' },
    { id: 'c', kind: 'task', lane: 'l', name: 'C' },
  ],
  flows: [
    { id: 's', from: 'start', to: 'a' },
    { id: 'cond', from: 'a', to: 'b', condition: 'yes' },
    { id: 'def', from: 'b', to: 'c', default: true },
  ],
};

const crossing = {
  pools: [
    {
      id: 'p',
      name: 'P',
      lanes: [
        { id: 'l0', name: 'L0' },
        { id: 'l1', name: 'L1' },
        { id: 'l2', name: 'L2' },
      ],
    },
  ],
  nodes: [
    { id: 'n0', kind: 'event', event: 'start', lane: 'l1' },
    { id: 'n1', kind: 'task', lane: 'l2', name: 'T1' },
    { id: 'n2', kind: 'task', lane: 'l2', name: 'T2' },
    { id: 'n3', kind: 'task', lane: 'l1', name: 'T3' },
    { id: 'n4', kind: 'task', lane: 'l2', name: 'T4' },
    { id: 'n5', kind: 'task', lane: 'l2', name: 'T5' },
    { id: 'n6', kind: 'task', lane: 'l0', name: 'T6' },
  ],
  flows: [
    { id: 'f0', from: 'n0', to: 'n1' },
    { id: 'f1', from: 'n1', to: 'n2' },
    { id: 'f2', from: 'n2', to: 'n3' },
    { id: 'f3', from: 'n3', to: 'n5' },
    { id: 'f4', from: 'n4', to: 'n5' },
    { id: 'f5', from: 'n4', to: 'n6' },
    { id: 'f6', from: 'n5', to: 'n6' },
  ],
};

afterEach(() => {
  document.body.replaceChildren();
});

const settle = async (element: DpkBoardBpmn): Promise<void> => {
  for (let index = 0; index < 4; index++) {
    await element.updateComplete;
    for (const part of element.renderRoot.querySelectorAll('dpk-dialog-panel, dpk-tag-filter')) {
      if ('updateComplete' in part) await (part as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    }
  }
};

const mount = async (data: unknown, attributes = ''): Promise<DpkBoardBpmn> => {
  const element = document.createElement('dpk-board-bpmn');
  if (!(element instanceof DpkBoardBpmn)) throw new Error('did not upgrade');
  element.id = 'board';
  element.innerHTML = `<script type="application/json">${JSON.stringify(data)}</script>`;
  for (const pair of attributes.split(/\s+/).filter(Boolean)) {
    const [name = '', value = ''] = pair.split('=');
    element.setAttribute(name, value);
  }
  document.body.append(element);
  await settle(element);
  return element;
};

const classes = (element: DpkBoardBpmn, selector: string): readonly string[] => [
  ...(element.renderRoot.querySelector(selector)?.classList ?? []),
];

describe('<dpk-board-bpmn>', () => {
  it('renders every element and flow, with lanes and pool heads', async () => {
    const element = await mount(raw);
    expect(element.visible.nodes).toHaveLength(7);
    expect(element.renderRoot.querySelectorAll('[data-node]')).toHaveLength(7);
    expect(element.renderRoot.querySelectorAll('[data-flow]')).toHaveLength(8);
    expect(element.renderRoot.querySelectorAll('[data-bpmn-pool-frame]')).toHaveLength(2);
    expect(element.renderRoot.querySelectorAll('[data-bpmn-lane-frame]')).toHaveLength(2);
    expect(element.renderRoot.querySelector('.bpmn-pool-head')?.textContent?.trim()).toBe('顧客');
    expect(element.renderRoot.querySelector('[data-bpmn-lane-frame="cs"]')).not.toBeNull();
    expect(element.renderRoot.querySelectorAll('[data-flow-label]')).toHaveLength(4);
    expect(element.renderRoot.querySelector('[data-flow-label="f3"]')?.textContent?.trim()).toBe('在庫あり');
  });

  it('draws the glyph each flow kind calls for', async () => {
    const element = await mount(raw);
    const glyphs = (flow: string): string[] =>
      [...element.renderRoot.querySelectorAll(`[data-flow="${flow}"] .d-edge-end`)].map(
        (end) => `${end.getAttribute('data-end')}:${end.getAttribute('data-glyph')}`,
      );
    expect(glyphs('f1')).toEqual(['end:arrow']);
    expect(glyphs('m1')).toEqual(['start:circle', 'end:hollowArrow']);
    expect(glyphs('a1')).toEqual([]);

    const conditionalBoard = await mount(conditional);
    const conditionalGlyphs = (flow: string): string[] =>
      [...conditionalBoard.renderRoot.querySelectorAll(`[data-flow="${flow}"] .d-edge-end`)].map(
        (end) => `${end.getAttribute('data-end')}:${end.getAttribute('data-glyph')}`,
      );
    expect(conditionalGlyphs('cond')).toEqual(['start:diamond', 'end:arrow']);
    expect(conditionalGlyphs('def')).toEqual(['start:diagonalSlash', 'end:arrow']);
  });

  it('draws an event-based gateway with the double circle and pentagon', async () => {
    const element = await mount({
      pools: [{ id: 'p', name: 'P' }],
      nodes: [
        { id: 'eg', kind: 'gateway', gateway: 'eventBased', lane: 'p', name: '何か起きた?' },
        { id: 't', kind: 'task', lane: 'p', name: 'T' },
      ],
      flows: [{ id: 'f', from: 'eg', to: 't', condition: 'x' }],
    });
    const glyph = element.renderRoot.querySelector('[data-node="eg"]');
    expect(glyph?.querySelectorAll('circle')).toHaveLength(2);
    expect(glyph?.querySelector('path.line')).not.toBeNull();
  });

  it('gives an event or gateway one tab stop and an accessible name with its kind', async () => {
    const element = await mount(raw);
    const gateway = element.renderRoot.querySelector<HTMLElement>('[data-node="gw"]');
    expect(gateway?.tagName).toBe('BUTTON');
    expect(gateway?.getAttribute('aria-label')).toBe('在庫あり? (exclusive gateway)');
    const label = element.renderRoot.querySelector<HTMLElement>('[data-node-label="gw"]');
    expect(label?.tagName).toBe('SPAN');
    expect(label?.hasAttribute('tabindex')).toBe(false);
    expect(element.renderRoot.querySelector('.bpmn-pool-head')?.tagName).toBe('BUTTON');
    expect(element.renderRoot.querySelector('.bpmn-lane-head')?.tagName).toBe('BUTTON');
  });

  it('puts grill questions on pool and lane heads and on an unlabeled flow hit path', async () => {
    const element = await mount({
      pools: [{ id: 'p', name: 'P', questions: 'Q1', lanes: [{ id: 'l', name: 'L', questions: 'Q2' }] }],
      nodes: [
        { id: 'a', kind: 'task', lane: 'l', name: 'A' },
        { id: 'b', kind: 'task', lane: 'l', name: 'B' },
      ],
      flows: [{ id: 'f', from: 'a', to: 'b', questions: 'Q3' }],
    });
    expect(
      element.renderRoot
        .querySelector('[data-dpk-target="element:board/pool/p"]')
        ?.getAttribute('data-grill-questions'),
    ).toBe('Q1');
    expect(
      element.renderRoot
        .querySelector('[data-dpk-target="element:board/lane/l"]')
        ?.getAttribute('data-grill-questions'),
    ).toBe('Q2');
    expect(element.renderRoot.querySelector('[data-flow="f"] .d-edge-hit')?.getAttribute('data-grill-questions')).toBe(
      'Q3',
    );
  });

  it('jumps one flow over another when the routes cross', async () => {
    const element = await mount(crossing);
    const paths = [...element.renderRoot.querySelectorAll('[data-flow] .d-edge-path')].map((path) =>
      path.getAttribute('d'),
    );
    expect(paths.some((d) => d?.includes('A'))).toBe(true);
  });

  it('highlights what the selection touches and dims the rest', async () => {
    const element = await mount(raw);
    element.renderRoot.querySelector<HTMLElement>('[data-node="check"]')?.click();
    await settle(element);
    expect(element.selection).toEqual({ kind: 'node', id: 'check' });
    expect(classes(element, '[data-flow="f1"]')).toContain('is-flowing');
    expect(classes(element, '[data-flow="f2"]')).toContain('is-flowing');
    expect(classes(element, '[data-flow="f5"]')).toContain('is-dimmed');
    expect(classes(element, '[data-flow-label="f3"]')).toContain('is-dimmed');
  });

  it('offers node, flow, pool and lane comment targets', async () => {
    const element = await mount(raw);
    const values = element.commentTargets.map((target) => target.value);
    expect(values).toContain('element:board/node/check');
    expect(values).toContain('element:board/edge/f1');
    expect(values).toContain('element:board/pool/customer');
    expect(values).toContain('element:board/lane/cs');
    const labels = element.commentTargets.map((target) => target.label);
    expect(labels).toContain('在庫を確認');
    expect(labels).toContain('顧客');
    expect(labels).toContain('EC サイト / 倉庫');
  });

  it('shows a data error for invalid JSON', async () => {
    const element = document.createElement('dpk-board-bpmn');
    if (!(element instanceof DpkBoardBpmn)) throw new Error('did not upgrade');
    element.innerHTML = '<script type="application/json">{"pools":[]}</script>';
    document.body.append(element);
    await settle(element);
    expect(element.dataError).not.toBeNull();
    expect(element.renderRoot.querySelector('.diagram-notice')?.textContent).toContain(diagramMessages('en').dataError);
  });

  it('works without chrome: the frame and controls go, the figure stays', async () => {
    const element = await mount(raw, 'chrome=none');
    const panel = element.renderRoot.querySelector('dpk-dialog-panel');
    expect(panel?.getAttribute('chrome')).toBe('none');
    expect(panel?.shadowRoot?.querySelector('header')).toBeNull();
    expect(panel?.shadowRoot?.querySelector('[part="controls"]')).toBeNull();
    expect(element.renderRoot.querySelector('dpk-tag-filter')).toBeNull();
    expect(element.renderRoot.querySelectorAll('[data-node]')).toHaveLength(7);
    expect(element.renderRoot.querySelectorAll('[data-flow]')).toHaveLength(8);
    expect(element.resetViewEnabled).toBe(false);
  });

  it('labels its counts and empty state', async () => {
    const element = await mount(raw);
    expect(element.renderRoot.querySelector('.diagram-stats')?.textContent).toBe('7 Element · 8 Flow');
  });
});
