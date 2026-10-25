import { describe, expect, it, vi } from 'vitest';

import { EMPTY_CHECK_STATE, type CheckState } from '../check-mode';
import {
  CHECK_ATTRIBUTE,
  CHECK_OFF,
  CheckModeBadgeController,
  collectCheckBindings,
  scrollRootsAround,
} from './check-mode-badges';
import { TARGET_ATTRIBUTE } from './reveal';

const enabled: CheckState = { v: 1, enabled: true, checked: {} };

const hostWith = (...refs: string[]): HTMLElement => {
  const host = document.createElement('div');
  for (const ref of refs) {
    const card = document.createElement('div');
    card.setAttribute(TARGET_ATTRIBUTE, ref);
    host.append(card);
  }
  return host;
};

describe('collectCheckBindings', () => {
  it('collects nothing while Check Mode is off, regardless of how many targets exist', () => {
    const host = hostWith('card:a', 'card:b');
    expect(collectCheckBindings(host, EMPTY_CHECK_STATE, null)).toEqual([]);
  });

  it('binds every data-dpk-target element, sequentially indexed, once enabled', () => {
    const host = hostWith('card:a', 'card:b');
    const bindings = collectCheckBindings(host, enabled, null);
    expect(bindings.map((binding) => binding.ref)).toEqual(['card:a', 'card:b']);
    expect(bindings.map((binding) => binding.index)).toEqual([0, 1]);
    expect(bindings.every((binding) => binding.status === 'unchecked')).toBe(true);
  });

  it('reports each target’s check status', () => {
    const host = hostWith('card:a', 'card:b');
    const state: CheckState = {
      v: 1,
      enabled: true,
      checked: { 'card:a': { revision: null }, 'card:b': { revision: null } },
    };
    const bindings = collectCheckBindings(host, state, null);
    expect(bindings.map((binding) => binding.status)).toEqual(['checked', 'checked']);
  });

  it('finds targets inside nested shadow roots, not only the light DOM', () => {
    const host = document.createElement('div');
    const inner = document.createElement('div');
    host.append(inner);
    const shadow = inner.attachShadow({ mode: 'open' });
    const card = document.createElement('div');
    card.setAttribute(TARGET_ATTRIBUTE, 'card:deep');
    shadow.append(card);
    expect(collectCheckBindings(host, enabled, null).map((binding) => binding.ref)).toEqual(['card:deep']);
  });

  it('leaves out an edge or link that says data-dpk-check="off", while still binding its nodes', () => {
    const host = hostWith('node:orders');
    const edge = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    edge.setAttribute(TARGET_ATTRIBUTE, 'edge:orders-customers');
    edge.setAttribute(CHECK_ATTRIBUTE, CHECK_OFF);
    host.append(edge);
    expect(collectCheckBindings(host, enabled, null).map((binding) => binding.ref)).toEqual(['node:orders']);
  });

  it('leaves out every target inside an opted-out subtree', () => {
    const host = hostWith('card:a');
    const message = document.createElement('button');
    message.setAttribute(CHECK_ATTRIBUTE, CHECK_OFF);
    const label = document.createElement('span');
    label.setAttribute(TARGET_ATTRIBUTE, 'message:m1');
    message.append(label);
    host.append(message);
    expect(collectCheckBindings(host, enabled, null).map((binding) => binding.ref)).toEqual(['card:a']);
  });

  it('reads only the one value that opts out: any other value is still a target', () => {
    const host = hostWith('card:a');
    host.firstElementChild?.setAttribute(CHECK_ATTRIBUTE, 'on');
    expect(collectCheckBindings(host, enabled, null).map((binding) => binding.ref)).toEqual(['card:a']);
  });
});

describe('scrollRootsAround', () => {
  it('includes the shadow roots the host renders, however deeply nested', () => {
    const host = document.createElement('div');
    const inner = document.createElement('div');
    host.append(inner);
    const own = host.attachShadow({ mode: 'open' });
    const deepShadow = inner.attachShadow({ mode: 'open' });
    const roots = scrollRootsAround(host);
    expect(roots).toContain(own);
    expect(roots).toContain(deepShadow);
  });

  it('includes the shadow root a view is slotted into, where the shell’s own scrolling column lives', () => {
    // app shadow root → layout → the page and the view slotted into it: the
    // view host's own root is the app's shadow root, above anything the view
    // itself renders, and a scroll event never crosses down to the view.
    const app = document.createElement('div');
    const shell = app.attachShadow({ mode: 'open' });
    const page = document.createElement('div');
    const view = document.createElement('div');
    page.append(view);
    shell.append(page);
    expect(scrollRootsAround(view)).toContain(shell);
  });

  it('walks every shadow boundary up to the document, not only the first', () => {
    const outer = document.createElement('div');
    const outerRoot = outer.attachShadow({ mode: 'open' });
    const middle = document.createElement('div');
    outerRoot.append(middle);
    const middleRoot = middle.attachShadow({ mode: 'open' });
    const view = document.createElement('div');
    middleRoot.append(view);
    const roots = scrollRootsAround(view);
    expect(roots).toContain(middleRoot);
    expect(roots).toContain(outerRoot);
  });

  it('adds no listener target for a host that is not in a shadow root: the document covers it', () => {
    const host = document.createElement('div');
    document.body.append(host);
    expect(scrollRootsAround(host)).toEqual([]);
  });
});

const box = (left: number, top: number, width: number, height: number): DOMRect =>
  ({
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({}),
  }) as DOMRect;

const measured = (element: HTMLElement, rect: DOMRect): void => {
  element.getBoundingClientRect = () => rect;
  Object.defineProperty(element, 'clientWidth', { value: rect.width });
  Object.defineProperty(element, 'clientHeight', { value: rect.height });
};

const frames = async (count = 2): Promise<void> => {
  for (let index = 0; index < count; index += 1) {
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  }
};

/**
 * A view host slotted into an app's shadow root, with one mark and the badge
 * layer the render would draw over it: the shape the shell actually has when
 * a page's app owns the scrolling column.
 */
const mountBadges = () => {
  const app = document.createElement('div');
  const appRoot = app.attachShadow({ mode: 'open' });
  const scroll = document.createElement('div');
  const host = document.createElement('div');
  scroll.append(host);
  appRoot.append(scroll);
  document.body.append(app);

  const root = host.attachShadow({ mode: 'open' });
  const target = document.createElement('div');
  target.setAttribute(TARGET_ATTRIBUTE, 'card:a');
  const layer = document.createElement('div');
  layer.className = 'dpk-check-badges';
  const badge = document.createElement('button');
  badge.dataset['badge'] = '0';
  layer.append(badge);
  root.append(target, layer);

  measured(app, box(0, 0, 800, 600));
  measured(host, box(0, 0, 800, 600));
  measured(target, box(100, 120, 80, 40));
  measured(layer, box(0, 0, 800, 600));
  Object.defineProperty(badge, 'offsetWidth', { value: 22 });
  Object.defineProperty(badge, 'offsetHeight', { value: 22 });

  const withControllers = Object.assign(host, {
    addController: () => {},
    removeController: () => {},
    requestUpdate: vi.fn(),
    updateComplete: Promise.resolve(true),
  });

  const bindings = [{ index: 0, target, ref: 'card:a', status: 'unchecked' as const }];
  const controller = new CheckModeBadgeController(withControllers, {
    active: () => true,
    layers: () => [layer],
    bindings: () => bindings,
  });
  controller.hostConnected();
  controller.hostUpdated();
  return { controller, appRoot, scroll, host, target, layer, badge };
};

describe('CheckModeBadgeController', () => {
  it('places a badge on its mark', async () => {
    const { badge } = mountBadges();
    await frames();
    expect(badge.dataset['visible']).toBe('true');
    expect(badge.style.transform).toMatch(/^translate\(/);
  });

  it('moves the badges when the shell above the view host scrolls, though that scroll never reaches the view', async () => {
    const { badge, scroll } = mountBadges();
    await frames();
    expect(badge.style.transform).toMatch(/^translate\(/);

    // A `scroll` is not composed: this one is raised inside the app's shadow root,
    // above the view host, so a listener anywhere under the host would never see it.
    badge.style.transform = '';
    badge.dataset['visible'] = 'false';
    scroll.dispatchEvent(new Event('scroll'));
    await frames();

    expect(badge.dataset['visible']).toBe('true');
    expect(badge.style.transform).toMatch(/^translate\(/);
  });
});
