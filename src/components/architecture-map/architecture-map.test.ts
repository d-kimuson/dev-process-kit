import { afterEach, describe, expect, it } from 'vitest';

import { ArtifactArchitectureMap } from './element';
import { defineArchitectureMap, ARCHITECTURE_MAP_TAG } from './index';
import { boundaryBoxes, parseArchitectureData, SERVICE_SIZE } from './model';

defineArchitectureMap();

const raw = {
  boundaries: [
    { id: 'edge', label: 'CLIENT & EDGE' },
    { id: 'checkout', label: 'CHECKOUT' },
    { id: 'external', label: 'EXTERNAL', kind: 'external' },
  ],
  services: [
    {
      id: 'browser',
      name: 'ブラウザ',
      description: '購入者の操作。',
      boundary: 'edge',
      tags: ['フロントエンド'],
      position: { x: 0, y: 0 },
    },
    { id: 'gateway', name: 'Gateway', boundary: 'edge', tags: ['今回の設計'], position: { x: 0, y: 220 } },
    { id: 'orders', name: 'Order service', boundary: 'checkout', tags: ['今回の設計'], position: { x: 300, y: 0 } },
    {
      id: 'database',
      name: 'Database',
      boundary: 'checkout',
      tags: ['注文'],
      position: { x: 300, y: 220 },
      symbol: 'DB',
    },
    {
      id: 'payment',
      name: 'Payment',
      boundary: 'external',
      tags: ['外部サービス'],
      position: { x: 620, y: 0 },
      artwork: { src: 'data:image/png;base64,AAAA', alt: 'AWS Lambda', license: 'AWS アイコン (CC BY-ND 2.0)' },
    },
    {
      id: 'mail',
      name: 'Mail',
      boundary: 'external',
      tags: ['外部サービス'],
      position: { x: 620, y: 220 },
      symbol: 'SES',
    },
  ],
  links: [
    { id: 'browser-orders', from: 'browser', to: 'orders', label: '注文確定' },
    { id: 'orders-database', from: 'orders', to: 'database' },
    { id: 'orders-payment', from: 'orders', to: 'payment', label: '決済要求' },
    { id: 'orders-mail', from: 'orders', to: 'mail' },
  ],
};

const settle = async (element: ArtifactArchitectureMap): Promise<void> => {
  for (let index = 0; index < 3; index++) await element.updateComplete;
};

const mount = async (): Promise<ArtifactArchitectureMap> => {
  const element = new ArtifactArchitectureMap();
  element.data = parseArchitectureData(raw);
  document.body.append(element);
  await settle(element);
  return element;
};

const classes = (element: ArtifactArchitectureMap, service: string): string[] => [
  ...(element.renderRoot.querySelector<HTMLElement>(`[data-service="${service}"]`)?.classList ?? []),
];

afterEach(() => {
  document.body.replaceChildren();
});

describe('architecture map data', () => {
  it('validates boundaries, services and links', () => {
    const data = parseArchitectureData(raw);
    expect(data.nodes).toHaveLength(6);
    expect(data.nodes[0]).toMatchObject({ boundary: 'edge', description: '購入者の操作。', artwork: null });
    expect(data.nodes[4]?.artwork).toMatchObject({ alt: 'AWS Lambda', license: 'AWS アイコン (CC BY-ND 2.0)' });
    expect(data.edges[0]).toMatchObject({ label: '注文確定', tags: [] });
    expect(data.boundaries[2]).toMatchObject({ kind: 'external' });
    expect(() =>
      parseArchitectureData({ services: [{ id: 'a', name: 'A', boundary: 'nope', position: { x: 0, y: 0 } }] }),
    ).toThrow(/unknown boundary/);
    expect(() =>
      parseArchitectureData({
        services: [
          { id: 'a', name: 'A', position: { x: 0, y: 0 } },
          { id: 'a', name: 'B', position: { x: 0, y: 0 } },
        ],
      }),
    ).toThrow(/duplicate service id/);
    expect(() => parseArchitectureData({ services: [{ id: 'a', name: 'A' }] })).toThrow();
    expect(ARCHITECTURE_MAP_TAG).toBe('artifact-architecture-map');
  });

  it('derives a boundary rectangle around its members', () => {
    const data = parseArchitectureData(raw);
    const boxes = boundaryBoxes(data.nodes, data.boundaries);
    expect(boxes.map((box) => box.boundary.id)).toEqual(['edge', 'checkout', 'external']);
    const edge = boxes[0];
    expect(edge?.x).toBe(-26);
    expect(edge?.y).toBeLessThan(0);
    expect((edge?.x ?? 0) + (edge?.width ?? 0)).toBeGreaterThanOrEqual(220);
    expect(boundaryBoxes([], data.boundaries)).toEqual([]);
  });

  // Positions are hand-placed, so two boundaries' members can sit closer than
  // the padding either rectangle would like: the rectangles must share the gap.
  const packed = parseArchitectureData({
    boundaries: [
      { id: 'edge', label: 'EDGE' },
      { id: 'checkout', label: 'CHECKOUT' },
      { id: 'external', label: 'EXTERNAL', kind: 'external' },
      { id: 'data', label: 'DATA' },
    ],
    services: [
      { id: 'browser', name: 'Browser', boundary: 'edge', position: { x: 0, y: 0 } },
      { id: 'orders', name: 'Orders', boundary: 'checkout', position: { x: 300, y: 0 } },
      { id: 'worker', name: 'Worker', boundary: 'checkout', position: { x: 560, y: 220 } },
      { id: 'payment', name: 'Payment', boundary: 'external', position: { x: 820, y: 0 } },
      { id: 'email', name: 'Email', boundary: 'external', position: { x: 820, y: 220 } },
      { id: 'database', name: 'Database', boundary: 'data', position: { x: 300, y: SERVICE_SIZE.height * 2 + 400 } },
      { id: 'loose', name: 'Loose', position: { x: 0, y: SERVICE_SIZE.height + 12 } },
    ],
  });
  type Rect = { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
  const intersects = (a: Rect, b: Rect): boolean =>
    a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
  const serviceRect = (id: string): Rect => {
    const service = packed.nodes.find((node) => node.id === id);
    return {
      x: service?.position?.x ?? 0,
      y: service?.position?.y ?? 0,
      width: service?.width ?? 0,
      height: service?.height ?? 0,
    };
  };

  it('keeps sibling boundary rectangles apart even when their members are packed tight', () => {
    const boxes = boundaryBoxes(packed.nodes, packed.boundaries);
    expect(boxes).toHaveLength(4);
    const overlaps = boxes.flatMap((a) =>
      boxes.filter((b) => a !== b && intersects(a, b)).map((b) => `${a.boundary.id} × ${b.boundary.id}`),
    );
    expect(overlaps).toEqual([]);
  });

  it('keeps every member inside its rectangle and every other service outside', () => {
    const boxes = boundaryBoxes(packed.nodes, packed.boundaries);
    const inside = (box: Rect, rect: Rect): boolean =>
      rect.x >= box.x &&
      rect.y >= box.y &&
      rect.x + rect.width <= box.x + box.width &&
      rect.y + rect.height <= box.y + box.height;
    const misplaced = boxes.flatMap((box) =>
      packed.nodes
        .filter((service) =>
          service.boundary === box.boundary.id
            ? !inside(box, serviceRect(service.id))
            : intersects(box, serviceRect(service.id)),
        )
        .map((service) => `${box.boundary.id} / ${service.id}`),
    );
    expect(misplaced).toEqual([]);
  });

  it('keeps the full padding, label room included, where nothing is in the way', () => {
    const boxes = boundaryBoxes(packed.nodes, packed.boundaries);
    const data = boxes.find((box) => box.boundary.id === 'data');
    expect(data).toMatchObject({ x: 300 - 26, y: SERVICE_SIZE.height * 2 + 400 - 26 * 1.6 });
    expect((data?.x ?? 0) + (data?.width ?? 0)).toBe(300 + 220 + 26);
  });
});

describe('artifact-architecture-map', () => {
  it('renders boundaries, services and artwork', async () => {
    const element = await mount();
    expect(element.renderRoot.querySelectorAll('[data-service]')).toHaveLength(6);
    expect(element.renderRoot.querySelectorAll('[data-boundary]')).toHaveLength(3);
    expect(element.renderRoot.querySelector('[data-boundary="external"]')?.classList.contains('is-external')).toBe(
      true,
    );
    expect(element.renderRoot.querySelector('[data-boundary="edge"] span')?.textContent).toBe('CLIENT & EDGE');
    expect(element.renderRoot.querySelector('.arch-artwork')?.getAttribute('alt')).toBe('AWS Lambda');
    expect(element.renderRoot.querySelector('[data-service="database"] .arch-symbol')?.textContent).toBe('DB');
    expect(element.renderRoot.querySelector('.diagram-stats')?.textContent).toBe('6 サービス · 4 接続');
    const world = element.renderRoot.querySelector<HTMLElement>('.diagram-world');
    expect(Number.parseFloat(world?.style.width ?? '0')).toBeGreaterThan(880);
  });

  // Hand-placed cards stack vertically too: a link has to leave and enter by the
  // sides that face each other instead of looping through the cards.
  it('routes every link between facing sides without crossing a card', async () => {
    const element = await mount();
    const cards = [...element.renderRoot.querySelectorAll<HTMLElement>('[data-service]')].map((card) => ({
      id: card.dataset['service'] ?? '',
      left: Number.parseFloat(card.style.left),
      top: Number.parseFloat(card.style.top),
      right: Number.parseFloat(card.style.left) + Number.parseFloat(card.style.width),
      bottom: Number.parseFloat(card.style.top) + Number.parseFloat(card.style.height),
    }));
    const links = [...element.renderRoot.querySelectorAll<SVGGElement>('[data-link]')];
    expect(links).toHaveLength(4);
    const segments = links.flatMap((link) => {
      const d = link.querySelector('.d-edge-path')?.getAttribute('d') ?? '';
      const points = [...d.matchAll(/(-?[\d.]+)[ ,](-?[\d.]+)/g)].map((match) => ({
        x: Number(match[1]),
        y: Number(match[2]),
      }));
      return points.slice(1).map((next, index) => ({ link: link.dataset['link'], from: points[index], to: next }));
    });
    expect(new Set(segments.map((segment) => segment.link)).size).toBe(4);
    const crossings = segments.flatMap(({ link, from, to }) =>
      cards
        .filter(
          (card) =>
            from !== undefined &&
            Math.min(from.x, to.x) < card.right &&
            Math.max(from.x, to.x) > card.left &&
            Math.min(from.y, to.y) < card.bottom &&
            Math.max(from.y, to.y) > card.top,
        )
        .map((card) => `${link} × ${card.id}`),
    );
    expect(crossings).toEqual([]);
  });

  it('hides boundaries on request', async () => {
    const element = await mount();
    element.renderRoot.querySelector<HTMLButtonElement>('[data-toggle="boundaries"]')?.click();
    await element.updateComplete;
    expect(element.renderRoot.querySelectorAll('[data-boundary]')).toHaveLength(0);
    expect(element.renderRoot.querySelector('[data-toggle="boundaries"]')?.getAttribute('aria-pressed')).toBe('false');
  });

  it('highlights connected services and credits their icons', async () => {
    const element = await mount();
    element.renderRoot.querySelector<HTMLButtonElement>('[data-service="orders"]')?.click();
    await element.updateComplete;
    expect(classes(element, 'orders')).toContain('is-selected');
    expect(classes(element, 'browser')).toContain('is-related');
    expect(classes(element, 'payment')).toContain('is-related');
    expect(classes(element, 'gateway')).toContain('is-dimmed');
    expect(element.renderRoot.querySelector('.diagram-details')).toBeNull();
    // The icon credit travels with the icon itself.
    expect(element.renderRoot.querySelector('[data-service="payment"] .arch-artwork')?.getAttribute('title')).toBe(
      'アイコン出典: AWS アイコン (CC BY-ND 2.0)',
    );
  });

  it('opens the contextual composer beside a service or a link', async () => {
    const element = await mount();
    element.id = 'system';
    await settle(element);
    const trigger = (kind: string, id: string) =>
      element.renderRoot.querySelector<HTMLButtonElement>(`[data-comment-kind="${kind}"][data-comment-id="${id}"]`);
    expect(trigger('node', 'orders')?.previousElementSibling).toBe(
      element.renderRoot.querySelector('[data-service="orders"]'),
    );
    trigger('node', 'orders')?.click();
    await settle(element);
    expect(element.selection).toEqual({ kind: 'node', id: 'orders' });
    expect(element.renderRoot.querySelector('.comment-target')?.textContent).toBe('Order service');
    const link = trigger('edge', 'orders-payment');
    expect(link?.closest('[data-link]')).toBe(element.renderRoot.querySelector('[data-link="orders-payment"]'));
    link?.click();
    await settle(element);
    expect(element.selection).toEqual({ kind: 'edge', id: 'orders-payment' });
    expect(element.renderRoot.querySelector('.comment-target')?.textContent).toBe('Order service → Payment · 決済要求');
  });

  it('filters services by tag and selects a link', async () => {
    const element = await mount();
    element.renderRoot.querySelector<HTMLButtonElement>('[data-tag="外部サービス"]')?.click();
    await element.updateComplete;
    expect(
      [...element.renderRoot.querySelectorAll<HTMLElement>('[data-service]')]
        .map((node) => node.dataset['service'])
        .sort((a, b) => String(a).localeCompare(String(b))),
    ).toEqual(['mail', 'payment']);
    expect(element.renderRoot.querySelectorAll('[data-link]')).toHaveLength(0);

    element.tagFilter = { match: 'single', active: [] };
    await element.updateComplete;
    element.select({ kind: 'edge', id: 'orders-payment' });
    await element.updateComplete;
    expect(
      [...element.renderRoot.querySelectorAll('.arch-link-label')]
        .map((node) => node.textContent)
        .sort((a, b) => String(a).localeCompare(String(b))),
    ).toEqual(['決済要求', '注文確定']);
    expect(element.renderRoot.querySelector('[data-link="orders-payment"]')?.classList.contains('is-selected')).toBe(
      true,
    );
  });
});
