import { describe, expect, it, vi } from 'vitest';

import type { TemplateDefinition } from '../types';
import type { ContextMenuMessages } from './messages';

import { buildCommonContextMenuGroup, type CommonActionsHost } from './common-actions';

const messages: ContextMenuMessages = {
  menu: 'Menu',
  copyText: 'Copy text',
  feedback: 'Give feedback',
  reviewComment: 'Review comment',
  resetView: 'Reset view',
  resetPositions: 'Reset positions',
  addDiagramHere: 'Add diagram',
  searchDiagram: 'Search diagrams…',
  duplicate: 'Duplicate',
  delete: 'Delete',
};

const definition = (overrides: Partial<TemplateDefinition<unknown>> = {}): TemplateDefinition<unknown> =>
  ({
    hasTarget: () => false,
    navigationFor: undefined,
    ...overrides,
  }) as TemplateDefinition<unknown>;

const host = (def: TemplateDefinition<unknown>): CommonActionsHost => ({
  definition: def,
  requestComment: vi.fn(),
});

describe('buildCommonContextMenuGroup', () => {
  it('returns null when there is no target and nothing resets', () => {
    const group = buildCommonContextMenuGroup({
      host: host(definition()),
      state: {},
      target: null,
      targetElement: null,
      resetViewElement: null,
      messages,
    });
    expect(group).toBeNull();
  });

  it('offers copy-text only when the matched element has text', () => {
    const el = document.createElement('div');
    el.textContent = '  hello  ';
    const group = buildCommonContextMenuGroup({
      host: host(definition()),
      state: {},
      target: { type: 'item', id: 'a' },
      targetElement: el,
      resetViewElement: null,
      messages,
    });
    expect(group?.entries.map((e) => e.id)).toEqual(['copy-text']);
  });

  it('offers feedback only when hasTarget is true, and dispatches requestComment with the target ref', () => {
    const def = definition({ hasTarget: () => true });
    const h = host(def);
    const group = buildCommonContextMenuGroup({
      host: h,
      state: {},
      target: { type: 'item', id: 'a' },
      targetElement: null,
      resetViewElement: null,
      messages,
    });
    expect(group?.entries.map((e) => e.id)).toEqual(['feedback']);
    const entry = group?.entries[0];
    if (entry?.kind === 'item') entry.run();
    expect(h.requestComment).toHaveBeenCalledWith('item:a');
  });

  it('offers reset-view whenever a resettable element is under the pointer, even with no target', () => {
    const resetView = vi.fn();
    const group = buildCommonContextMenuGroup({
      host: host(definition()),
      state: {},
      target: null,
      targetElement: null,
      resetViewElement: { resetView } as unknown as Element & { resetView(): void },
      messages,
    });
    expect(group?.entries.map((e) => e.id)).toEqual(['reset-view']);
    const entry = group?.entries[0];
    if (entry?.kind === 'item') entry.run();
    expect(resetView).toHaveBeenCalledOnce();
  });

  it('combines every applicable entry, in a stable order', () => {
    const el = document.createElement('span');
    el.textContent = 'hi';
    const def = definition({ hasTarget: () => true });
    const resetView = vi.fn();
    const group = buildCommonContextMenuGroup({
      host: host(def),
      state: {},
      target: { type: 'item', id: 'a' },
      targetElement: el,
      resetViewElement: { resetView } as unknown as Element & { resetView(): void },
      messages,
    });
    expect(group?.entries.map((e) => e.id)).toEqual(['copy-text', 'feedback', 'reset-view']);
  });
});
