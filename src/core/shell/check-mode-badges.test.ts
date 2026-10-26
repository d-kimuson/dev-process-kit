import { afterEach, describe, expect, it, vi } from 'vitest';

import { EMPTY_CHECK_STATE, type CheckState } from '../check-mode';
import { CHECK_ATTRIBUTE, CHECK_OFF, CheckModeBadgeController, collectCheckBindings } from './check-mode-badges';
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

const frames = async (count = 2): Promise<void> => {
  for (let index = 0; index < count; index += 1) {
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  }
};

/**
 * A host with one mark in a positioned parent: the shape a board node has in
 * its diagram world, where a portal can share its coordinate space.
 */
let active: CheckModeBadgeController | null = null;

const mountBadges = () => {
  const host = document.createElement('div');
  const parent = document.createElement('div');
  parent.style.position = 'relative';
  const target = document.createElement('div');
  target.setAttribute(TARGET_ATTRIBUTE, 'card:a');
  Object.defineProperty(target, 'offsetWidth', { value: 80 });
  Object.defineProperty(target, 'offsetHeight', { value: 40 });
  parent.append(target);
  host.append(parent);
  document.body.append(host);

  const withControllers = Object.assign(host, {
    addController: () => {},
    removeController: () => {},
    requestUpdate: vi.fn(),
    updateComplete: Promise.resolve(true),
  });

  let on = true;
  const bindings = [{ index: 0, target, ref: 'card:a', status: 'unchecked' as const }];
  const onToggle = vi.fn();
  const controller = new CheckModeBadgeController(withControllers, {
    active: () => on,
    bindings: () => bindings,
    onToggle,
    labelOf: (status) => `label:${status}`,
  });
  active = controller;
  controller.hostUpdated();
  return { controller, host, parent, target, onToggle, bindings, setActive: (value: boolean) => (on = value) };
};

afterEach(() => {
  active?.hostDisconnected();
  active = null;
  document.body.innerHTML = '';
});

describe('CheckModeBadgeController', () => {
  it('puts the badge inside the target’s own positioned parent, not a viewport layer', async () => {
    const { parent } = mountBadges();
    await frames();
    const portal = parent.querySelector('.dpk-check-portal');
    const badge = portal?.querySelector<HTMLButtonElement>('.dpk-check-badge');
    expect(portal).not.toBeNull();
    expect(badge).not.toBeNull();
    expect(badge?.dataset['status']).toBe('unchecked');
    expect(badge?.getAttribute('aria-label')).toBe('label:unchecked');
  });

  it('toggles the mark when its badge is clicked', async () => {
    const { parent, onToggle } = mountBadges();
    await frames();
    parent.querySelector<HTMLButtonElement>('.dpk-check-badge')?.click();
    expect(onToggle).toHaveBeenCalledWith('card:a');
  });

  it('updates the badge in place when the status changes', async () => {
    const { controller, parent, bindings } = mountBadges();
    await frames();
    (bindings[0] as { status: string }).status = 'checked';
    controller.hostUpdated();
    expect(parent.querySelector('.dpk-check-badge')?.getAttribute('data-status')).toBe('checked');
  });

  it('removes the portal when Check Mode turns off', async () => {
    const { controller, parent, setActive } = mountBadges();
    await frames();
    setActive(false);
    controller.hostUpdated();
    expect(parent.querySelector('.dpk-check-portal')).toBeNull();
  });
});
