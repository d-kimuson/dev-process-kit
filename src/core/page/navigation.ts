/**
 * The page's hash holds every board's position at once: `board=<id>` names
 * the visible board, and each board's own keys are prefixed with its id
 * (`#board=domain&scope.activity=signup&domain.event=paid`).
 */
import type { Navigation, NavigationPatch } from '../types';

import { patchNavigation } from '../navigation';

export const BOARD_KEY = 'board';

const prefixOf = (board: string): string => `${board}.`;

/** One board's own navigation, as the board knows it. */
export const boardNavigation = (navigation: Navigation, board: string): Navigation => {
  const prefix = prefixOf(board);
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(navigation)) {
    if (key.startsWith(prefix)) result[key.slice(prefix.length)] = value;
  }
  return result;
};

/** A board's navigation lifted into the page's keys. */
export const pageKeysOf = <V>(board: string, navigation: Readonly<Record<string, V>>): Record<string, V> =>
  Object.fromEntries(Object.entries(navigation).map(([key, value]) => [`${prefixOf(board)}${key}`, value]));

/**
 * Translates a patch a board asked for into the page's keys. The board's own
 * keys are patched against its current position with its own hierarchy;
 * `board` and keys that already name a board of the page pass through, so
 * `data-dpk-navigate="board=scope&scope.activity=signup"` can cross boards.
 */
export const pagePatchFor = (
  navigation: Navigation,
  board: string,
  patch: NavigationPatch,
  boards: ReadonlySet<string>,
  hierarchy: readonly string[] = [],
): NavigationPatch => {
  const passthrough: Record<string, string | null | undefined> = {};
  const own: Record<string, string | null | undefined> = {};
  for (const [key, value] of Object.entries(patch)) {
    const dot = key.indexOf('.');
    if (key === BOARD_KEY || (dot > 0 && boards.has(key.slice(0, dot)))) passthrough[key] = value;
    else own[key] = value;
  }
  if (Object.keys(own).length === 0) return passthrough;
  const current = boardNavigation(navigation, board);
  const next = patchNavigation(current, own, hierarchy);
  const result: Record<string, string | null | undefined> = { ...passthrough };
  for (const key of Object.keys(current)) if (!Object.hasOwn(next, key)) result[`${prefixOf(board)}${key}`] = null;
  for (const [key, value] of Object.entries(next)) result[`${prefixOf(board)}${key}`] = value;
  return result;
};
