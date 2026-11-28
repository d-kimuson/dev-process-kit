import { describe, expect, it } from 'vitest';

import type { ContextMenuRequest } from './types';

import { collectContextMenuGroups, contextMenuOrigin, findMethodProvider } from './provider';

describe('findMethodProvider', () => {
  const resetView = (): void => {};

  it('takes the nearest element that carries the method', () => {
    const inner = Object.assign(document.createElement('div'), { resetView });
    const outer = Object.assign(document.createElement('div'), { resetView });
    expect(findMethodProvider([inner, outer, document], 'resetView')).toBe(inner);
  });

  it('passes over a provider whose method has no effect in its current mode', () => {
    const disabled = Object.assign(document.createElement('div'), { resetView, resetViewEnabled: false });
    const enabled = Object.assign(document.createElement('div'), { resetView, resetViewEnabled: true });
    expect(findMethodProvider([disabled, enabled, document], 'resetView')).toBe(enabled);
    expect(findMethodProvider([disabled, document], 'resetView')).toBeNull();
  });
});

describe('contextMenuOrigin', () => {
  it('is the first element on the composed path', () => {
    const inner = document.createElement('span');
    const outer = document.createElement('div');
    expect(contextMenuOrigin([inner, outer, document])).toBe(inner);
  });

  it('skips a non-element event target and takes the first element after it', () => {
    const text = document.createTextNode('bare text');
    const element = document.createElement('p');
    expect(contextMenuOrigin([text, element, document])).toBe(element);
  });

  it('is null when the path carries no element at all', () => {
    expect(contextMenuOrigin([])).toBeNull();
    expect(contextMenuOrigin([document])).toBeNull();
  });
});

describe('collectContextMenuGroups', () => {
  it('hands the origin to every provider it asks', () => {
    const origin = document.createElement('button');
    const seen: (Element | null | undefined)[] = [];
    const provider = Object.assign(document.createElement('div'), {
      getContextMenuItems: (request: ContextMenuRequest): null => {
        seen.push(request.origin);
        return null;
      },
    });
    const path: readonly EventTarget[] = [origin, provider, document];
    collectContextMenuGroups(path, { clientX: 1, clientY: 2, target: null, origin: contextMenuOrigin(path) });
    expect(seen).toEqual([origin]);
  });
});
