import type { BrowserShortcut, BrowserView } from './chrome';

import { addressKey, hostOf, parseAddress } from './address';
import { activeTab, canGoBack, canGoForward, type BrowserEntry, type BrowserSim } from './sim';

/** A page of `<dpk-browser>`: one child with a `data-url`. */
export type BrowserSitePage = {
  readonly url: string;
  readonly title: string;
};

/** What the simulation names a page by: its address as written. */
export type BrowserAddress = { readonly url: string };

/** The page an address leads to, the query and the fragment aside. */
export const pageAt = (
  pages: readonly BrowserSitePage[],
  input: string,
  current: string,
): BrowserSitePage | undefined => {
  const target = parseAddress(input, current);
  if (target === null) return undefined;
  const key = addressKey(target);
  return pages.find((page) => {
    const url = parseAddress(page.url, current);
    return url !== null && addressKey(url) === key;
  });
};

const entryTitle = (
  pages: readonly BrowserSitePage[],
  entry: BrowserEntry<BrowserAddress> | undefined,
  newTab: string,
): string => {
  if (entry === undefined || entry.kind === 'new-tab') return newTab;
  if (entry.kind === 'unreachable') return hostOf(entry.url);
  return pageAt(pages, entry.page.url, entry.page.url)?.title ?? hostOf(entry.page.url);
};

const entryUrl = (entry: BrowserEntry<BrowserAddress> | undefined): string =>
  entry === undefined || entry.kind === 'new-tab' ? '' : entry.kind === 'unreachable' ? entry.url : entry.page.url;

export const presentSite = (
  pages: readonly BrowserSitePage[],
  sim: BrowserSim<BrowserAddress>,
  newTab: string,
  profile: string | null,
): BrowserView<BrowserAddress> => {
  const tab = activeTab(sim);
  const entry = tab.history[tab.index];
  return {
    tabs: sim.tabs.map((candidate) => {
      const shown = candidate.history[candidate.index];
      return {
        id: candidate.id,
        title: entryTitle(pages, shown, newTab),
        url: entryUrl(shown),
        active: candidate.id === tab.id,
      };
    }),
    entry,
    url: entryUrl(entry),
    canBack: canGoBack(sim),
    canForward: canGoForward(sim),
    ...(profile === null || profile === '' ? {} : { profile }),
  };
};

/** Every page of the site, as the tiles of the new tab page. */
export const siteShortcuts = (pages: readonly BrowserSitePage[]): readonly BrowserShortcut<BrowserAddress>[] =>
  pages.map((page) => ({
    title: page.title,
    url: page.url.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').replace(/\/$/, ''),
    href: page.url,
    page: { url: page.url },
  }));
