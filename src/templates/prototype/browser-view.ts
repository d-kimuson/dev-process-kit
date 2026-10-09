import type { Navigation } from '../../core/types';
import type { PrototypeMessages } from './messages';

import {
  activeTab,
  canGoBack,
  canGoForward,
  type BrowserEntry,
  type BrowserPage,
  type BrowserSim,
} from './browser-sim';
import { allScreens, type PrototypeState } from './model';
import {
  locatePrototype,
  prototypeAppSections,
  prototypeCurrentAppSection,
  prototypePreviewUrl,
  prototypeStageFrames,
  resolvePrototypeNavigation,
  type ScreenTreeNode,
} from './present';
import { VIEW_KEY } from './view-mode';

/**
 * What the app view's browser shows, read from the template state and the
 * browser simulation (see `browser-sim.ts`): the tabs, the address and the
 * user the window belongs to.
 */

/**
 * The web page a navigation shows in the app view, or `null` for a screen the
 * browser does not show (a mail, a phone app) and for the scenario view.
 */
export const prototypeBrowserPage = (state: PrototypeState, nav: Navigation): BrowserPage | null => {
  const resolved = resolvePrototypeNavigation(state, nav);
  const located = locatePrototype(state, resolved);
  if (located?.kind !== 'screen') return null;
  const [preview] = prototypeStageFrames(state, located, resolved).shown;
  if (preview?.kind !== 'browser') return null;
  return { screen: located.screen.id, preview: preview.id };
};

const locatePage = (state: PrototypeState, page: BrowserPage) => {
  const located = locatePrototype(state, resolvePrototypeNavigation(state, { [VIEW_KEY]: 'app', ...page }));
  return located?.kind === 'screen' ? located : undefined;
};

const parseAddress = (input: string, current: string): URL | null => {
  const text = input.trim();
  if (text === '') return null;
  try {
    if (text.startsWith('/')) return new URL(text, current);
    return new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
};

/** Where an address points, the query and the fragment aside. */
const addressKey = (url: URL): string => `${url.origin}${url.pathname.replace(/\/+$/, '')}`;

/**
 * The page an address typed into the address bar leads to: the first web
 * preview at that address. A path alone stays on the site on screen.
 */
export const prototypePageAt = (state: PrototypeState, input: string, current: string): BrowserPage | null => {
  const target = parseAddress(input, current);
  if (target === null) return null;
  const key = addressKey(target);
  for (const { screen } of allScreens(state)) {
    for (const preview of screen.previews) {
      if (preview.kind !== 'browser') continue;
      const url = parseAddress(prototypePreviewUrl(state, preview), current);
      if (url !== null && addressKey(url) === key) return { screen: screen.id, preview: preview.id };
    }
  }
  return null;
};

export type BrowserTabView = {
  readonly id: string;
  readonly title: string;
  /** The tab's address; empty on the new tab page. */
  readonly url: string;
  readonly active: boolean;
};

export type BrowserView = {
  readonly tabs: readonly BrowserTabView[];
  /** What the active tab shows. */
  readonly entry: BrowserEntry | undefined;
  /** The address of the active tab; empty on the new tab page. */
  readonly url: string;
  readonly canBack: boolean;
  readonly canForward: boolean;
  /** Who the window belongs to; absent when no level names an actor. */
  readonly profile?: string;
};

const hostOf = (url: string): string => {
  try {
    return new URL(url).host || url;
  } catch {
    return url;
  }
};

const entryTitle = (state: PrototypeState, entry: BrowserEntry | undefined, m: PrototypeMessages): string => {
  if (entry === undefined || entry.kind === 'new-tab') return m.newTab;
  if (entry.kind === 'unreachable') return hostOf(entry.url);
  return locatePage(state, entry.page)?.screen.title ?? m.newTab;
};

const entryUrl = (state: PrototypeState, entry: BrowserEntry | undefined): string => {
  if (entry === undefined || entry.kind === 'new-tab') return '';
  if (entry.kind === 'unreachable') return entry.url;
  const preview = locatePage(state, entry.page)?.screen.previews.find(
    (candidate) => candidate.id === entry.page.preview,
  );
  return preview === undefined ? '' : prototypePreviewUrl(state, preview);
};

/** The page the window last showed: in the active tab first, then in any other. */
const lastPage = (sim: BrowserSim): BrowserPage | undefined => {
  const tab = activeTab(sim);
  for (let index = tab.index; index >= 0; index -= 1) {
    const entry = tab.history[index];
    if (entry?.kind === 'page') return entry.page;
  }
  for (const other of sim.tabs) {
    const entry = other.history[other.index];
    if (entry?.kind === 'page') return entry.page;
  }
  return undefined;
};

/** The user the app is for: the window is theirs. */
const actorOf = (state: PrototypeState, page: BrowserPage | undefined): string | undefined => {
  return page === undefined ? undefined : locatePage(state, page)?.app.actor;
};

export const presentBrowser = (
  state: PrototypeState,
  sim: BrowserSim,
  m: PrototypeMessages,
  /** The page the window belongs to when no tab shows one any more. */
  fallback: BrowserPage | null = null,
): BrowserView => {
  const tab = activeTab(sim);
  const entry = tab.history[tab.index];
  const profile = actorOf(state, lastPage(sim) ?? fallback ?? undefined);
  return {
    tabs: sim.tabs.map((candidate) => ({
      id: candidate.id,
      title: entryTitle(state, candidate.history[candidate.index], m),
      url: entryUrl(state, candidate.history[candidate.index]),
      active: candidate.id === tab.id,
    })),
    entry,
    url: entryUrl(state, entry),
    canBack: canGoBack(sim),
    canForward: canGoForward(sim),
    ...(profile === undefined ? {} : { profile }),
  };
};

/** The page the new tab page offers for the window's last page, to start from. */
export const prototypeBrowserHome = (sim: BrowserSim): BrowserPage | null => lastPage(sim) ?? null;

export type NewTabShortcut = {
  readonly title: string;
  /** The address without its scheme, as a browser's shortcut tile shows it. */
  readonly url: string;
  readonly page: BrowserPage;
};

/** The web pages of the app the reader is in, as the shortcuts of the new tab page. */
export const prototypeNewTabShortcuts = (
  state: PrototypeState,
  page: BrowserPage | null,
): readonly NewTabShortcut[] => {
  const location = page === null ? undefined : locatePage(state, page);
  const section = prototypeCurrentAppSection(prototypeAppSections(state), location);
  const shortcuts: NewTabShortcut[] = [];
  const walk = (host: string, node: ScreenTreeNode): void => {
    for (const { screen } of node.screens) {
      const preview = screen.previews.find((candidate) => candidate.kind === 'browser');
      if (preview !== undefined)
        shortcuts.push({
          title: screen.title,
          url: `${host}${node.path === '/' ? '' : node.path}`,
          page: { screen: screen.id, preview: preview.id },
        });
    }
    for (const child of node.children) walk(host, child);
  };
  for (const tree of section?.trees ?? []) walk(hostOf(tree.origin), tree.root);
  return shortcuts;
};
