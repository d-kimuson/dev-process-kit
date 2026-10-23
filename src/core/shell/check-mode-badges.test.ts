import { describe, expect, it } from 'vitest';

import { EMPTY_CHECK_STATE, type CheckState } from '../check-mode';
import { collectCheckBindings } from './check-mode-badges';
import { TARGET_ATTRIBUTE } from './reveal';

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
    const state: CheckState = { v: 1, enabled: true, checked: {} };
    const bindings = collectCheckBindings(host, state, null);
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
    const state: CheckState = { v: 1, enabled: true, checked: {} };
    expect(collectCheckBindings(host, state, null).map((binding) => binding.ref)).toEqual(['card:deep']);
  });
});
