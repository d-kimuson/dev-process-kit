import { afterEach, describe, expect, it } from 'vitest';

import type { DpkDialogPanel } from '../../components/dialog-panel/index';
import type { ContextMenuRequest } from '../../core/context-menu/types';
import type { LayoutPoint } from '../../lib/layout/layered';

import { currentPositionStorageKey } from '../../core/layout-position-storage';
import { parseTargetRef } from '../../core/target';
import { scoreLayout, type LayoutGeometry } from '../../lib/layout/metrics';
import { DpkBoardArchitectureMap } from './element';
import { defineArchitectureMap } from './index';
import { architectureMapMessages } from './messages';
import { boundaryBoxes, parseArchitectureData, SERVICE_SIZE } from './model';
import { withFacingRoutes } from './route';

defineArchitectureMap();

const m = architectureMapMessages('en');

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

const settle = async (element: DpkBoardArchitectureMap): Promise<void> => {
  for (let index = 0; index < 3; index++) await element.updateComplete;
};

const mount = async (lang?: string): Promise<DpkBoardArchitectureMap> => {
  const element = new DpkBoardArchitectureMap();
  if (lang !== undefined) element.setAttribute('lang', lang);
  element.data = parseArchitectureData(raw);
  document.body.append(element);
  await settle(element);
  return element;
};

const classes = (element: DpkBoardArchitectureMap, service: string): string[] => [
  ...(element.renderRoot.querySelector<HTMLElement>(`[data-service="${service}"]`)?.classList ?? []),
];

const reviewComment = (element: DpkBoardArchitectureMap, ref: string): void => {
  const request: ContextMenuRequest = { clientX: 0, clientY: 0, target: parseTargetRef(ref) };
  const groups = element.getContextMenuItems(request) ?? [];
  const entry = groups.flatMap((group) => group.entries).find((candidate) => candidate.id === 'review-comment');
  if (entry?.kind === 'item') entry.run();
};

/** Mounts data without asserting anything: the routing tests read the drawn geometry back. */
const mountData = async (data: ReturnType<typeof parseArchitectureData>): Promise<DpkBoardArchitectureMap> => {
  const element = new DpkBoardArchitectureMap();
  element.data = data;
  document.body.append(element);
  await settle(element);
  return element;
};

/** A link's route as laid out; the drawn path rounds its bends, so the corners are read from the layout. */
const routePoints = (element: DpkBoardArchitectureMap, link: string): LayoutPoint[] => [
  ...(element.layout?.routes.find((route) => route.id === link)?.points ?? []),
];

/** The geometry the reader actually sees: placed service cards plus each link's drawn polyline. */
const drawnGeometry = (
  element: DpkBoardArchitectureMap,
  data: ReturnType<typeof parseArchitectureData>,
): LayoutGeometry => ({
  nodes: [...element.renderRoot.querySelectorAll<HTMLElement>('[data-service]')].map((card) => ({
    id: card.dataset['service'] ?? '',
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
  });

  it('derives a boundary rectangle around its members', () => {
    const data = parseArchitectureData(raw);
    const boxes = boundaryBoxes(data.nodes, data.boundaries);
    expect(boxes.map((box) => box.boundary.id)).toEqual(['edge', 'checkout', 'external']);
    const edge = boxes[0];
    expect(edge?.x).toBe(-28);
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
    expect(data).toMatchObject({ x: 300 - 28, y: SERVICE_SIZE.height * 2 + 400 - 28 * 1.6 });
    expect((data?.x ?? 0) + (data?.width ?? 0)).toBe(300 + 220 + 28);
  });
});

describe('architecture map drawn edges', () => {
  /*
   * Characterisation before `linkPath` becomes `archLinkSteps`: the exact `d`
   * each link is drawn with, so a rewrite that returns path steps instead of a
   * string can be proven to draw the same thing.
   */
  it('draws each link the same way', async () => {
    const element = await mount();
    const drawn = [...element.renderRoot.querySelectorAll<SVGGElement>('[data-link]')]
      .map((group) => ({
        id: group.dataset['link'] ?? '',
        d: group.querySelector('.d-edge-path')?.getAttribute('d') ?? '',
      }))
      .sort((a, b) => a.id.localeCompare(b.id));
    expect(drawn).toMatchInlineSnapshot(`
      [
        {
          "d": "M292 132 L372 132",
          "id": "browser-orders",
        },
        {
          "d": "M480 184 L480 292",
          "id": "orders-database",
        },
        {
          "d": "M592 144 L642 144 Q648 144 648 150 L648 342 Q648 348 654 348 L692 348",
          "id": "orders-mail",
        },
        {
          "d": "M592 120 L692 120",
          "id": "orders-payment",
        },
      ]
    `);
  });
});

describe('dpk-board-architecture-map', () => {
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
    expect(element.renderRoot.querySelector('.diagram-stats')?.textContent).toBe(`6 ${m.node} · 4 ${m.edge}`);
    const viewport = element.renderRoot.querySelector<DpkDialogPanel>('dpk-dialog-panel');
    expect(viewport?.contentWidth ?? 0).toBeGreaterThan(880);
  });

  it('renders its stats in the element’s language', async () => {
    const ja = architectureMapMessages('ja');
    const element = await mount('ja');
    expect(element.renderRoot.querySelector('.diagram-stats')?.textContent).toBe(`6 ${ja.node} · 4 ${ja.edge}`);
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

  // The elbow-only router was obstacle-blind: a link between two cards with a
  // third card between them was drawn straight through that card.
  it('routes a link around a card that sits between its two ends', async () => {
    const data = parseArchitectureData({
      services: [
        { id: 'a', name: 'A', position: { x: 0, y: 0 } },
        { id: 'b', name: 'B', position: { x: 300, y: 0 } },
        { id: 'c', name: 'C', position: { x: 620, y: 0 } },
        { id: 'd', name: 'D', position: { x: 300, y: 220 } },
      ],
      links: [
        { id: 'a-c', from: 'a', to: 'c', label: 'skip' },
        { id: 'a-b', from: 'a', to: 'b' },
        { id: 'b-d', from: 'b', to: 'd' },
      ],
    });
    const element = await mountData(data);
    const score = scoreLayout(drawnGeometry(element, data));
    expect(score.edgeThroughNode.incidents).toBe(0);
    expect(score.collinearOverlap.incidents).toBe(0);
    // The facing sides would take four bends around B: the link leaves and
    // enters on one side of the row instead, and passes B in two.
    const points = routePoints(element, 'a-c');
    expect(points).toHaveLength(4);
    expect(points[0]?.y).toBe(points.at(-1)?.y);
  });

  // Dropping a card onto another used to leave its links on the layout's own
  // elbows, straight through both cards.
  it('ends a link on the edge of a pile of overlapping cards and draws none inside it', () => {
    const card = (id: string, x: number, y: number) => ({ id, x, y, ...SERVICE_SIZE, layer: 0, order: 0 });
    const nodes = [card('a', 72, 72), card('b', 492, 72), card('c', 512, 96)];
    const routed = withFacingRoutes({ nodes, routes: [], width: 900, height: 400 }, [
      { id: 'a-b', from: 'a', to: 'b' },
      { id: 'b-c', from: 'b', to: 'c' },
    ]);
    const points = (id: string) => routed.routes.find((route) => route.id === id)?.points ?? [];
    expect(points('b-c')).toEqual([]);
    expect(points('a-b').at(-1)).toEqual({ x: 492, y: points('a-b')[0]?.y });
    expect(points('a-b')).toHaveLength(2);
  });

  it('moves a link to another lane when its label is reported to lie on something', () => {
    const card = (id: string, x: number, y: number) => ({ id, x, y, ...SERVICE_SIZE, layer: 0, order: 0 });
    const nodes = [card('a', 72, 292), card('b', 372, 72)];
    const links = [{ id: 'a-b', from: 'a', to: 'b' }];
    const placement = { nodes, routes: [], width: 700, height: 500 };
    const lane = (points: readonly LayoutPoint[]) => points[1]?.x;
    const plain = lane(withFacingRoutes(placement, links).routes[0]!.points);
    const moved = withFacingRoutes(placement, links, {
      rate: (routes) => [{ link: 'a-b', penalty: lane(routes.get('a-b') ?? []) === plain ? 1 : 0, crossing: [] }],
    });
    expect(plain).toBeDefined();
    expect(lane(moved.routes[0]!.points)).not.toBe(plain);
    expect(moved.routes[0]!.points).toHaveLength(4);
  });

  // A reader's drag goes through `applyPositionOverrides`, not through
  // `computePlacement`. Routing only the computed layout left the dragged one
  // on the blind elbow router: dropping a card between two linked cards put the
  // line straight through it.
  it('re-routes links around a card the reader dragged between them', async () => {
    const data = parseArchitectureData({
      services: [
        { id: 'a', name: 'A', position: { x: 0, y: 0 } },
        { id: 'b', name: 'B', position: { x: 300, y: 300 } },
        { id: 'c', name: 'C', position: { x: 620, y: 0 } },
      ],
      links: [{ id: 'a-c', from: 'a', to: 'c' }],
    });
    localStorage.setItem(
      currentPositionStorageKey(),
      JSON.stringify({
        // An override is the card's absolute world position, the layout's own
        // padding included: `b` lands exactly between `a` and `c`, in their row.
        v: 1,
        overrides: [{ board: '', diagram: 'drag-test', node: 'b', position: { x: 340, y: 40 } }],
      }),
    );
    const element = new DpkBoardArchitectureMap();
    element.id = 'drag-test';
    element.data = data;
    document.body.append(element);
    await settle(element);
    expect(element.renderRoot.querySelector<HTMLElement>('[data-service="b"]')?.style.left).toBe('340px');
    const score = scoreLayout(drawnGeometry(element, data));
    expect(score.edgeThroughNode.incidents).toBe(0);
  });

  it('places a link label on its own link, clear of every card and of the other labels', async () => {
    const element = await mount();
    const chips = [...element.renderRoot.querySelectorAll<HTMLElement>('.arch-link-chip')].map((chip) => ({
      link: chip.dataset['linkLabel'] ?? '',
      left: Number.parseFloat(chip.style.left),
      top: Number.parseFloat(chip.style.top),
      right: Number.parseFloat(chip.style.left) + Number.parseFloat(chip.style.width),
      bottom: Number.parseFloat(chip.style.top) + Number.parseFloat(chip.style.height),
    }));
    expect(chips.map((chip) => chip.link).sort((x, y) => x.localeCompare(y))).toEqual([
      'browser-orders',
      'orders-payment',
    ]);
    const cards = [...element.renderRoot.querySelectorAll<HTMLElement>('[data-service]')].map((card) => ({
      left: Number.parseFloat(card.style.left),
      top: Number.parseFloat(card.style.top),
      right: Number.parseFloat(card.style.left) + Number.parseFloat(card.style.width),
      bottom: Number.parseFloat(card.style.top) + Number.parseFloat(card.style.height),
    }));
    type Box = (typeof cards)[number];
    const overlap = (x: Box, y: Box) => x.left < y.right && y.left < x.right && x.top < y.bottom && y.top < x.bottom;
    for (const chip of chips) {
      expect(cards.filter((card) => overlap(chip, card))).toEqual([]);
      expect(chips.filter((other) => other !== chip && overlap(chip, other))).toEqual([]);
      const points = routePoints(element, chip.link);
      const onLink = points.slice(1).some((next, index) => {
        const previous = points[index]!;
        return (
          Math.min(previous.x, next.x) <= chip.right &&
          Math.max(previous.x, next.x) >= chip.left &&
          Math.min(previous.y, next.y) <= chip.bottom + 8 &&
          Math.max(previous.y, next.y) >= chip.top - 8
        );
      });
      expect(onLink).toBe(true);
    }
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
      m.artworkCredit('AWS アイコン (CC BY-ND 2.0)'),
    );
  });

  it('opens the contextual composer beside a service or a link', async () => {
    const element = await mount();
    element.id = 'system';
    await settle(element);
    reviewComment(element, 'element:system/node/orders');
    await settle(element);
    expect(element.renderRoot.querySelector('.comment-target')?.textContent).toBe('Order service');
    reviewComment(element, 'element:system/edge/orders-payment');
    await settle(element);
    expect(element.renderRoot.querySelector('.comment-target')?.textContent).toBe('Order service → Payment · 決済要求');
  });

  it('filters services by tag and selects a link', async () => {
    const element = await mount();
    element.renderRoot
      .querySelector('dpk-tag-filter')
      ?.shadowRoot?.querySelector<HTMLButtonElement>('[data-tag="外部サービス"]')
      ?.click();
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
      [...element.renderRoot.querySelectorAll('.arch-link-chip')]
        .map((node) => node.textContent?.trim())
        .sort((a, b) => String(a).localeCompare(String(b))),
    ).toEqual(['決済要求', '注文確定']);
    expect(element.renderRoot.querySelector('[data-link="orders-payment"]')?.classList.contains('is-selected')).toBe(
      true,
    );
  });
});
