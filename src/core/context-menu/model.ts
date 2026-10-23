/**
 * Pure state for the right-click menu: what is open, at which point, and
 * which entry keyboard navigation currently highlights. No DOM, no timers —
 * the controller (`./controller.ts`) is the only thing that touches those.
 */
import type { ContextMenuEntry, ContextMenuGroup } from './types';

export type ContextMenuState = {
  readonly open: boolean;
  readonly x: number;
  readonly y: number;
  readonly groups: readonly ContextMenuGroup[];
  /** Ids of the submenus open below the root, outermost first. Empty: only the root level shows. */
  readonly openPath: readonly string[];
  /** The highlighted entry's id at the deepest open level, or `null` before a key is pressed. */
  readonly activeId: string | null;
};

export const CLOSED_CONTEXT_MENU: ContextMenuState = {
  open: false,
  x: 0,
  y: 0,
  groups: [],
  openPath: [],
  activeId: null,
};

/** Opens at a point with the groups already collected; empty groups just never open. */
export const openContextMenu = (x: number, y: number, groups: readonly ContextMenuGroup[]): ContextMenuState => ({
  open: groups.some((group) => group.entries.length > 0),
  x,
  y,
  groups,
  openPath: [],
  activeId: null,
});

const rootEntries = (groups: readonly ContextMenuGroup[]): readonly ContextMenuEntry[] =>
  groups.flatMap((group) => group.entries);

const findEntry = (entries: readonly ContextMenuEntry[], id: string): ContextMenuEntry | undefined =>
  entries.find((entry) => entry.id === id);

/** The entries shown at the level `openPath` currently points at (the root, or a nested submenu). */
export const entriesAtPath = (
  groups: readonly ContextMenuGroup[],
  openPath: readonly string[],
): readonly ContextMenuEntry[] => {
  let entries = rootEntries(groups);
  for (const id of openPath) {
    const entry = findEntry(entries, id);
    if (entry === undefined || entry.kind !== 'submenu') return entries; // a stale path just stops descending
    entries = entry.items;
  }
  return entries;
};

const enabledIds = (entries: readonly ContextMenuEntry[]): readonly string[] =>
  entries.filter((entry) => !(entry.kind === 'item' && entry.disabled === true)).map((entry) => entry.id);

/** `ArrowDown` (`direction: 1`) / `ArrowUp` (`direction: -1`), wrapping at either end. */
export const moveActive = (state: ContextMenuState, direction: 1 | -1): ContextMenuState => {
  const ids = enabledIds(entriesAtPath(state.groups, state.openPath));
  if (ids.length === 0) return state;
  // Nothing highlighted yet: `ArrowDown` starts at the first entry, `ArrowUp` at the last.
  const index = state.activeId === null ? (direction === 1 ? -1 : ids.length) : ids.indexOf(state.activeId);
  const next = ids[(index + direction + ids.length) % ids.length];
  return next === undefined ? state : { ...state, activeId: next };
};

/** Opens a specific submenu (a click, or `ArrowRight` on it) and highlights its first entry. */
export const openSubmenuById = (state: ContextMenuState, id: string): ContextMenuState => {
  const entry = findEntry(entriesAtPath(state.groups, state.openPath), id);
  if (entry === undefined || entry.kind !== 'submenu') return state;
  const firstId = enabledIds(entry.items)[0] ?? null;
  return { ...state, openPath: [...state.openPath, id], activeId: firstId };
};

/** `ArrowRight` on the highlighted entry, if it is a submenu. */
export const openActiveSubmenu = (state: ContextMenuState): ContextMenuState =>
  state.activeId === null ? state : openSubmenuById(state, state.activeId);

/** `ArrowLeft`: closes the deepest submenu and re-highlights the row that opened it. */
export const closeActiveSubmenu = (state: ContextMenuState): ContextMenuState => {
  if (state.openPath.length === 0) return state;
  const parentId = state.openPath[state.openPath.length - 1] ?? null;
  return { ...state, openPath: state.openPath.slice(0, -1), activeId: parentId };
};

/** What `Enter` / `Space` does to the highlighted entry, as a pure transition plus an effect to run. */
export type ActivateOutcome = { readonly state: ContextMenuState; readonly run: (() => void) | null };

export const activate = (state: ContextMenuState): ActivateOutcome => {
  const entry = findEntry(entriesAtPath(state.groups, state.openPath), state.activeId ?? '');
  if (entry === undefined) return { state, run: null };
  if (entry.kind === 'submenu') return { state: openActiveSubmenu(state), run: null };
  if (entry.disabled === true) return { state, run: null };
  return { state: CLOSED_CONTEXT_MENU, run: entry.run };
};
