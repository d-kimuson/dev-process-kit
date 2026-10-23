import { describe, expect, it, vi } from 'vitest';

import type { ContextMenuGroup } from './types';

import {
  activate,
  closeActiveSubmenu,
  CLOSED_CONTEXT_MENU,
  entriesAtPath,
  moveActive,
  openActiveSubmenu,
  openContextMenu,
  openSubmenuById,
} from './model';

const item = (id: string, overrides: Partial<{ disabled: boolean; run: () => void }> = {}) => {
  const run = overrides.run ?? vi.fn();
  return overrides.disabled === true
    ? { kind: 'item' as const, id, label: id, run, disabled: true }
    : { kind: 'item' as const, id, label: id, run };
};

const submenu = (id: string, items: ReturnType<typeof item>[]) => ({ kind: 'submenu' as const, id, label: id, items });

describe('openContextMenu', () => {
  it('opens when at least one group has entries', () => {
    const groups: ContextMenuGroup[] = [{ id: 'g', entries: [item('a')] }];
    const state = openContextMenu(10, 20, groups);
    expect(state.open).toBe(true);
    expect(state.x).toBe(10);
    expect(state.y).toBe(20);
    expect(state.openPath).toEqual([]);
    expect(state.activeId).toBeNull();
  });

  it('does not open when every group is empty', () => {
    const state = openContextMenu(0, 0, [{ id: 'g', entries: [] }]);
    expect(state.open).toBe(false);
  });

  it('does not open with no groups at all', () => {
    expect(openContextMenu(0, 0, []).open).toBe(false);
  });
});

describe('moveActive', () => {
  const groups: ContextMenuGroup[] = [
    { id: 'g1', entries: [item('a'), item('b', { disabled: true })] },
    { id: 'g2', entries: [item('c')] },
  ];

  it('highlights the first enabled entry from nothing highlighted', () => {
    const state = moveActive(openContextMenu(0, 0, groups), 1);
    expect(state.activeId).toBe('a');
  });

  it('skips disabled entries', () => {
    const first = moveActive(openContextMenu(0, 0, groups), 1);
    const second = moveActive(first, 1);
    expect(second.activeId).toBe('c');
  });

  it('wraps around at the end', () => {
    let state = openContextMenu(0, 0, groups);
    state = moveActive(state, 1); // a
    state = moveActive(state, 1); // c
    state = moveActive(state, 1); // wraps to a
    expect(state.activeId).toBe('a');
  });

  it('wraps backwards from nothing highlighted to the last enabled entry', () => {
    const state = moveActive(openContextMenu(0, 0, groups), -1);
    expect(state.activeId).toBe('c');
  });

  it('is a no-op when there is nothing enabled', () => {
    const empty = openContextMenu(0, 0, [{ id: 'g', entries: [item('a', { disabled: true })] }]);
    expect(moveActive(empty, 1).activeId).toBeNull();
  });
});

describe('submenu navigation', () => {
  const groups: ContextMenuGroup[] = [{ id: 'g', entries: [item('a'), submenu('more', [item('x'), item('y')])] }];

  it('openSubmenuById opens the named submenu and highlights its first entry', () => {
    const state = openSubmenuById(openContextMenu(0, 0, groups), 'more');
    expect(state.openPath).toEqual(['more']);
    expect(state.activeId).toBe('x');
    expect(entriesAtPath(state.groups, state.openPath).map((entry) => entry.id)).toEqual(['x', 'y']);
  });

  it('openSubmenuById is a no-op on a plain item id', () => {
    const state = openSubmenuById(openContextMenu(0, 0, groups), 'a');
    expect(state.openPath).toEqual([]);
  });

  it('openActiveSubmenu opens whatever is currently highlighted, if it is a submenu', () => {
    let state = openContextMenu(0, 0, groups);
    state = moveActive(state, 1); // a
    state = moveActive(state, 1); // more
    state = openActiveSubmenu(state);
    expect(state.openPath).toEqual(['more']);
    expect(state.activeId).toBe('x');
  });

  it('closeActiveSubmenu pops one level and re-highlights the submenu row', () => {
    const opened = openSubmenuById(openContextMenu(0, 0, groups), 'more');
    const closed = closeActiveSubmenu(opened);
    expect(closed.openPath).toEqual([]);
    expect(closed.activeId).toBe('more');
  });

  it('closeActiveSubmenu at the root is a no-op', () => {
    const state = openContextMenu(0, 0, groups);
    expect(closeActiveSubmenu(state)).toBe(state);
  });
});

describe('activate', () => {
  it('runs the highlighted item and closes the menu', () => {
    const run = vi.fn();
    const groups: ContextMenuGroup[] = [{ id: 'g', entries: [item('a', { run })] }];
    let state = openContextMenu(0, 0, groups);
    state = moveActive(state, 1);
    const outcome = activate(state);
    expect(outcome.state).toEqual(CLOSED_CONTEXT_MENU);
    expect(outcome.run).toBe(run);
    outcome.run?.();
    expect(run).toHaveBeenCalledOnce();
  });

  it('does not run a disabled item, and keeps the menu open', () => {
    const run = vi.fn();
    const groups: ContextMenuGroup[] = [{ id: 'g', entries: [item('a', { run, disabled: true })] }];
    let state = openContextMenu(0, 0, groups);
    state = { ...state, activeId: 'a' };
    const outcome = activate(state);
    expect(outcome.run).toBeNull();
    expect(outcome.state).toBe(state);
  });

  it('descends into a submenu instead of running anything', () => {
    const groups: ContextMenuGroup[] = [{ id: 'g', entries: [submenu('more', [item('x')])] }];
    let state = openContextMenu(0, 0, groups);
    state = { ...state, activeId: 'more' };
    const outcome = activate(state);
    expect(outcome.run).toBeNull();
    expect(outcome.state.openPath).toEqual(['more']);
  });

  it('is a no-op with nothing highlighted', () => {
    const groups: ContextMenuGroup[] = [{ id: 'g', entries: [item('a')] }];
    const state = openContextMenu(0, 0, groups);
    const outcome = activate(state);
    expect(outcome.run).toBeNull();
    expect(outcome.state).toBe(state);
  });
});
