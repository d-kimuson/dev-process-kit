/**
 * The app's hash holds every page's position at once: `page=<id>` names the
 * visible page, and each page's own keys are prefixed with its name
 * (`#page=domain&scope.activity=signup&domain.event=paid`).
 */
import type { Navigation, NavigationPatch } from '../types';

import { patchNavigation } from '../navigation';

export const PAGE_KEY = 'page';

const prefixOf = (page: string): string => `${page}.`;

/** One page's own navigation, as its content knows it. */
export const pageNavigation = (navigation: Navigation, page: string): Navigation => {
  const prefix = prefixOf(page);
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(navigation)) {
    if (key.startsWith(prefix)) result[key.slice(prefix.length)] = value;
  }
  return result;
};

/** A page's navigation lifted into the app's keys. */
export const pageKeysOf = <V>(page: string, navigation: Readonly<Record<string, V>>): Record<string, V> =>
  Object.fromEntries(Object.entries(navigation).map(([key, value]) => [`${prefixOf(page)}${key}`, value]));

/**
 * Translates a patch a page content asked for into the app's keys. The
 * content's own keys are patched against its current position with its own
 * hierarchy; `page` and keys that already name a page of the app pass
 * through, so `data-dpk-navigate="page=scope&scope.activity=signup"` can
 * cross pages.
 */
export const pagePatchFor = (
  navigation: Navigation,
  page: string,
  patch: NavigationPatch,
  pages: ReadonlySet<string>,
  hierarchy: readonly string[] = [],
): NavigationPatch => {
  const passthrough: Record<string, string | null | undefined> = {};
  const own: Record<string, string | null | undefined> = {};
  for (const [key, value] of Object.entries(patch)) {
    const dot = key.indexOf('.');
    if (key === PAGE_KEY || (dot > 0 && pages.has(key.slice(0, dot)))) passthrough[key] = value;
    else own[key] = value;
  }
  if (Object.keys(own).length === 0) return passthrough;
  const current = pageNavigation(navigation, page);
  const next = patchNavigation(current, own, hierarchy);
  const result: Record<string, string | null | undefined> = { ...passthrough };
  for (const key of Object.keys(current)) if (!Object.hasOwn(next, key)) result[`${prefixOf(page)}${key}`] = null;
  for (const [key, value] of Object.entries(next)) result[`${prefixOf(page)}${key}`] = value;
  return result;
};
