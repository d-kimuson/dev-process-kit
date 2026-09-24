import { afterEach, describe, expect, it } from 'vitest';

import { DpkComponentMindMap } from './element';
import { defineMindMap } from './index';
import { layoutMindMap } from './layout';
import { mindMapMessages } from './messages';
import {
  ancestorsOf,
  descendantCount,
  parseMindMapData,
  reduceMindMapActions,
  visibleMindMap,
  type MindMapData,
} from './model';

defineMindMap();

const m = mindMapMessages('en');

const raw = {
  root: {
    id: 'checkout',
    label: '注文フロー',
    children: [
      {
        id: 'payment',
        label: '決済',
        tags: ['外部'],
        children: [
          { id: 'retry', label: '再試行', description: '同じ冪等キーで再送する。' },
          { id: 'refund', label: '返金' },
          { id: 'webhook', label: 'Webhook' },
        ],
      },
      { id: 'stock', label: '在庫', children: [{ id: 'reserve', label: '仮確保', tags: ['今回'] }] },
      { id: 'ui', label: '画面', collapsed: true, children: [{ id: 'confirm', label: '確認画面' }] },
      { id: 'mail', label: '通知', side: 'left' },
    ],
  },
};

const data = (): MindMapData => parseMindMapData(raw);

afterEach(() => {
  document.body.replaceChildren();
});

describe('mind map data', () => {
  it('flattens the tree into topics and parent → child edges', () => {
    const parsed = data();
    expect(parsed.nodes.map((node) => node.id)).toEqual([
      'checkout',
      'payment',
      'retry',
      'refund',
      'webhook',
      'stock',
      'reserve',
      'ui',
      'confirm',
      'mail',
    ]);
    expect(parsed.edges.find((edge) => edge.id === 'reserve')).toMatchObject({ from: 'stock', to: 'reserve' });
    const retry = parsed.nodes.find((node) => node.id === 'retry');
    expect(retry).toMatchObject({ depth: 2, branch: 0, parent: 'payment', description: '同じ冪等キーで再送する。' });
    expect(parsed.nodes[0]).toMatchObject({ depth: 0, branch: -1, side: null });
  });

  it('balances main topics by leaf count and honours an authored side', () => {
    const sides = Object.fromEntries(
      data()
        .nodes.filter((node) => node.depth === 1)
        .map((node) => [node.id, node.side]),
    );
    // mail is authored left (1 leaf); payment (3 leaves) goes right; stock and ui fill the lighter side.
    expect(sides).toEqual({ payment: 'right', stock: 'left', ui: 'left', mail: 'left' });
    // Descendants inherit the side of their main topic.
    expect(data().nodes.find((node) => node.id === 'reserve')?.side).toBe('left');
  });

  it('rejects duplicate ids, a side below the main topics, and unknown keys', () => {
    expect(() =>
      parseMindMapData({
        root: {
          id: 'a',
          label: 'A',
          children: [
            { id: 'b', label: 'B' },
            { id: 'b', label: 'C' },
          ],
        },
      }),
    ).toThrow(/duplicate topic id/);
    expect(() =>
      parseMindMapData({
        root: {
          id: 'a',
          label: 'A',
          children: [{ id: 'b', label: 'B', children: [{ id: 'c', label: 'C', side: 'left' }] }],
        },
      }),
    ).toThrow(/side is only allowed/);
    expect(() => parseMindMapData({ root: { id: 'a', label: 'A', typo: true } })).toThrow();
    expect(() => parseMindMapData({})).toThrow();
  });

  it('knows ancestors and descendant counts', () => {
    expect(ancestorsOf(data(), 'retry')).toEqual(['payment', 'checkout']);
    expect(ancestorsOf(data(), 'checkout')).toEqual([]);
    expect(descendantCount(data(), 'payment')).toBe(3);
    expect(descendantCount(data(), 'checkout')).toBe(9);
  });
});

const addTopic = (id: string, parent: string, payload: unknown, type = 'ADD_TOPIC') => ({
  id,
  type,
  target: { type: 'element', id: `checkout-map/node/${encodeURIComponent(parent)}` },
  payload,
  createdAt: '2026-09-24T00:00:00.000Z',
});

describe('mind map element actions', () => {
  it('adds a subtopic at the end of its parent, marked as added', () => {
    const { data: next, results } = reduceMindMapActions(m, data(), [
      addTopic('a1', 'payment', { id: 'chargeback', label: 'チャージバック' }),
    ]);
    expect(next.nodes.find((node) => node.id === 'payment')?.children).toEqual([
      'retry',
      'refund',
      'webhook',
      'chargeback',
    ]);
    expect(next.nodes.find((node) => node.id === 'chargeback')).toMatchObject({
      parent: 'payment',
      depth: 2,
      branch: 0,
      side: 'right',
      added: true,
    });
    expect(next.nodes.find((node) => node.id === 'retry')?.added).toBe(false);
    expect(next.edges.find((edge) => edge.id === 'chargeback')).toMatchObject({ from: 'payment', to: 'chargeback' });
    expect(results).toEqual([
      { id: 'a1', title: m.addTopicTitle, summary: m.addSummary('決済', 'チャージバック'), tone: 'create' },
    ]);
  });

  it('builds on topics added earlier and keeps every main topic on its side', () => {
    const before = Object.fromEntries(data().nodes.map((node) => [node.id, node.side]));
    const { data: next } = reduceMindMapActions(m, data(), [
      addTopic('a1', 'stock', { id: 'lots', label: 'ロット' }),
      addTopic('a2', 'lots', { id: 'lot-a', label: 'A' }),
      addTopic('a3', 'lots', { id: 'lot-b', label: 'B' }),
      addTopic('a4', 'checkout', { id: 'ops', label: '運用' }),
    ]);
    const after = Object.fromEntries(next.nodes.map((node) => [node.id, node.side]));
    expect(Object.fromEntries(Object.keys(before).map((id) => [id, after[id]]))).toEqual(before);
    expect(next.nodes.find((node) => node.id === 'lot-b')).toMatchObject({ parent: 'lots', depth: 3 });
    expect(next.nodes.find((node) => node.id === 'ops')).toMatchObject({ depth: 1, branch: 4 });
  });

  it('reports what it cannot apply and leaves the data alone', () => {
    const base = data();
    const { data: next, results } = reduceMindMapActions(m, base, [
      addTopic('gone', 'nowhere', { id: 'x', label: 'X' }),
      addTopic('dup', 'payment', { id: 'retry', label: '再試行' }),
      addTopic('bad', 'payment', { id: 'y' }),
      addTopic('odd', 'payment', {}, 'RENAME_TOPIC'),
    ]);
    expect(next).toBe(base);
    expect(results.map((result) => [result.id, result.stale])).toEqual([
      ['gone', 'target-missing'],
      ['dup', 'constraint-violated'],
      ['bad', 'constraint-violated'],
      ['odd', 'unsupported-action-type'],
    ]);
  });
});

describe('mind map visibility', () => {
  it('folds a topic’s descendants and keeps the topic', () => {
    const visible = visibleMindMap(data(), null, new Set(['payment']));
    const ids = visible.nodes.map((node) => node.id);
    expect(ids).toContain('payment');
    expect(ids).not.toContain('retry');
    expect(visible.edges.some((edge) => edge.to === 'retry')).toBe(false);
  });

  it('keeps a tag match’s path to the centre and its subtree', () => {
    const visible = visibleMindMap(data(), (node) => node.tags.includes('外部'), new Set());
    expect(visible.nodes.map((node) => node.id)).toEqual(['checkout', 'payment', 'retry', 'refund', 'webhook']);
    const reserved = visibleMindMap(data(), (node) => node.tags.includes('今回'), new Set());
    expect(reserved.nodes.map((node) => node.id)).toEqual(['checkout', 'stock', 'reserve']);
    expect(visibleMindMap(data(), () => false, new Set()).nodes).toEqual([]);
  });
});

describe('mind map layout', () => {
  const layout = layoutMindMap(visibleMindMap(data(), null, new Set()));
  const box = (id: string) => {
    const node = layout.nodes.find((item) => item.id === id);
    if (!node) throw new Error(`${id} not placed`);
    return node;
  };

  it('puts each side’s topics on its half of the central topic', () => {
    const root = box('checkout');
    for (const id of ['payment', 'retry', 'refund', 'webhook']) expect(box(id).x).toBeGreaterThan(root.x + root.width);
    for (const id of ['stock', 'reserve', 'ui', 'confirm', 'mail'])
      expect(box(id).x + box(id).width).toBeLessThan(root.x);
  });

  it('never overlaps two topics and stays inside the content box', () => {
    for (const a of layout.nodes) {
      expect(a.x).toBeGreaterThanOrEqual(0);
      expect(a.y).toBeGreaterThanOrEqual(0);
      expect(a.x + a.width).toBeLessThanOrEqual(layout.width);
      expect(a.y + a.height).toBeLessThanOrEqual(layout.height);
      for (const b of layout.nodes) {
        if (a === b) continue;
        const apart = a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y;
        expect(apart, `${a.id} overlaps ${b.id}`).toBe(true);
      }
    }
  });

  it('routes each branch from the parent’s facing edge to the child', () => {
    const route = layout.routes.find((item) => item.id === 'payment')?.points ?? [];
    const root = box('checkout');
    expect(route[0]).toEqual({ x: root.x + root.width, y: root.y + root.height / 2 });
    expect(route.at(-1)).toEqual({ x: box('payment').x, y: box('payment').y + box('payment').height / 2 });
    const left = layout.routes.find((item) => item.id === 'mail')?.points ?? [];
    expect(left[0]?.x).toBe(root.x);
  });

  it('is empty without a central topic', () => {
    expect(layoutMindMap({ nodes: [], edges: [] })).toEqual({ width: 0, height: 0, nodes: [], routes: [] });
  });
});

describe('<dpk-component-mind-map>', () => {
  const settle = async (element: DpkComponentMindMap): Promise<void> => {
    for (let index = 0; index < 3; index++) await element.updateComplete;
  };

  const mount = async (lang?: string): Promise<DpkComponentMindMap> => {
    const element = document.createElement('dpk-component-mind-map');
    if (!(element instanceof DpkComponentMindMap)) throw new Error('did not upgrade');
    element.id = 'checkout-map';
    if (lang !== undefined) element.setAttribute('lang', lang);
    element.innerHTML = `<script type="application/json">${JSON.stringify(raw)}</script>`;
    document.body.append(element);
    await settle(element);
    return element;
  };

  const topics = (element: DpkComponentMindMap): (string | undefined)[] =>
    [...element.renderRoot.querySelectorAll<HTMLElement>('[data-topic]')].map((node) => node.dataset['topic']);

  it('renders topics and starts with the authored folding', async () => {
    const element = await mount();
    expect(topics(element)).toContain('ui');
    expect(topics(element)).not.toContain('confirm');
    expect(element.collapsed).toEqual(['ui']);
    const toggle = element.renderRoot.querySelector<HTMLButtonElement>('[data-toggle="ui"]');
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    expect(toggle?.textContent?.trim()).toBe('1');
    expect(element.renderRoot.querySelector('[data-toggle="checkout"]')).toBeNull();
    expect(element.renderRoot.querySelector('[data-toggle="mail"]')).toBeNull();
  });

  it('folds and unfolds from the toggle without selecting', async () => {
    const element = await mount();
    element.renderRoot.querySelector<HTMLButtonElement>('[data-toggle="payment"]')?.click();
    await settle(element);
    expect(topics(element)).not.toContain('retry');
    expect(element.selection).toBeNull();
    element.toggle('payment');
    await settle(element);
    expect(topics(element)).toContain('retry');
  });

  it('lights the path to the centre and the subtree of a selected topic', async () => {
    const element = await mount();
    element.select({ kind: 'node', id: 'payment' });
    await settle(element);
    const cls = (id: string) => element.renderRoot.querySelector<HTMLElement>(`[data-topic="${id}"]`)?.className ?? '';
    expect(cls('payment')).toContain('is-selected');
    expect(cls('retry')).toContain('is-related');
    expect(cls('checkout')).toContain('is-related');
    expect(cls('stock')).toContain('is-dimmed');
    // The map itself is the detail: no panel opens under the canvas.
    expect(element.renderRoot.querySelector('.diagram-details')).toBeNull();
  });

  it('offers adding a subtopic and a comment right below the selected topic', async () => {
    const element = await mount();
    expect(element.renderRoot.querySelector('.mind-actions')).toBeNull();
    element.select({ kind: 'node', id: 'payment' });
    await settle(element);
    const bar = element.renderRoot.querySelector<HTMLElement>('.mind-actions');
    expect(bar?.dataset['for']).toBe('payment');
    const requests: unknown[] = [];
    element.addEventListener('dpk-comment-request', (event) => {
      if (event instanceof CustomEvent) requests.push(event.detail);
    });
    bar?.querySelector<HTMLButtonElement>('[data-action="comment"]')?.click();
    expect(requests).toEqual([{ target: 'element:checkout-map/node/payment' }]);
  });

  const type = async (element: DpkComponentMindMap, label: string): Promise<HTMLInputElement> => {
    element.renderRoot.querySelector<HTMLButtonElement>('.mind-actions [data-action="add"]')?.click();
    await settle(element);
    const input = element.renderRoot.querySelector<HTMLInputElement>('.mind-actions input');
    if (!input) throw new Error('no input');
    input.value = label;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await settle(element);
    return input;
  };

  it('records a new subtopic through the hosting template and selects it', async () => {
    const element = await mount();
    // Stand-in for the page: accept, then hand the recorded action back.
    element.addEventListener('dpk-element-action', (event) => {
      if (!(event instanceof CustomEvent)) return;
      event.preventDefault();
      const detail: { type: string; target: string; payload: unknown } = event.detail;
      element.elementActions = [
        ...element.elementActions,
        {
          id: `a${element.elementActions.length}`,
          type: detail.type,
          target: { type: 'element', id: detail.target.slice('element:'.length) },
          payload: detail.payload,
          createdAt: '2026-09-24T00:00:00.000Z',
        },
      ];
    });
    element.select({ kind: 'node', id: 'payment' });
    await settle(element);
    await type(element, 'チャージバック');
    const [action] = element.elementActions;
    expect(action).toMatchObject({ type: 'ADD_TOPIC', target: { id: 'checkout-map/node/payment' } });
    const id = element.selection?.id ?? '';
    expect(action?.payload).toEqual({ id, label: 'チャージバック' });
    expect(topics(element)).toContain(id);
    expect(element.renderRoot.querySelector(`[data-topic="${id}"]`)?.className).toContain('is-added');
    expect(element.elementActionResults).toEqual([
      { id: 'a0', title: m.addTopicTitle, summary: m.addSummary('決済', 'チャージバック'), tone: 'create' },
    ]);
    expect(element.commentTargets.map((target) => target.value)).toContain(`element:checkout-map/node/${id}`);
  });

  it('keeps the typed label when no template records the topic', async () => {
    const element = await mount();
    element.select({ kind: 'node', id: 'payment' });
    await settle(element);
    const input = await type(element, '保留');
    expect(input.isConnected).toBe(true);
    expect(input.value).toBe('保留');
    expect(element.renderRoot.querySelector('.mind-actions [role="alert"]')).not.toBeNull();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await settle(element);
    expect(element.renderRoot.querySelector('.mind-actions input')).toBeNull();
  });

  it('clears a selection that folding hides', async () => {
    const element = await mount();
    element.select({ kind: 'node', id: 'retry' });
    element.toggle('payment', true);
    expect(element.selection).toBeNull();
  });

  it('offers every topic as a comment target, folded or not', async () => {
    const element = await mount();
    const values = element.commentTargets.map((target) => target.value);
    expect(values).toHaveLength(10);
    expect(values).toContain('element:checkout-map/node/confirm');
    expect(values.some((value) => value.includes('/edge/'))).toBe(false);
    expect(element.commentTargets.find((target) => target.value.endsWith('/retry'))?.label).toBe('再試行');
  });

  it('renders its kit text in the element’s language', async () => {
    const ja = mindMapMessages('ja');
    const element = await mount('ja');
    const toggle = element.renderRoot.querySelector<HTMLButtonElement>('[data-toggle="ui"]');
    expect(toggle?.getAttribute('aria-label')).toBe(ja.toggleOpen('画面', 1));
    element.select({ kind: 'node', id: 'payment' });
    await settle(element);
    const bar = element.renderRoot.querySelector<HTMLElement>('.mind-actions');
    expect(bar?.querySelector('[data-action="add"]')?.textContent?.trim()).toBe(ja.addSubtopicButton);
    expect(bar?.querySelector('[data-action="comment"]')?.textContent?.trim()).toBe(ja.commentButton);
  });

  it('renders its kit text in English by default', async () => {
    const element = await mount();
    const toggle = element.renderRoot.querySelector<HTMLButtonElement>('[data-toggle="ui"]');
    expect(toggle?.getAttribute('aria-label')).toBe(m.toggleOpen('画面', 1));
    element.select({ kind: 'node', id: 'payment' });
    await settle(element);
    const bar = element.renderRoot.querySelector<HTMLElement>('.mind-actions');
    expect(bar?.querySelector('[data-action="add"]')?.textContent?.trim()).toBe(m.addSubtopicButton);
    expect(bar?.querySelector('[data-action="comment"]')?.textContent?.trim()).toBe(m.commentButton);
  });
});
