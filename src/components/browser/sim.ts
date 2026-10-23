/**
 * A simulated browser: tabs, each with its own history, like a real one. It is
 * the reader's ephemeral UI state. The host reports every page it shows
 * (`observe`) so a visit lands in the history of the active tab; going back,
 * forward or to another tab only moves through the history here, and the host
 * then shows the entry it lands on, which counts as seen, so observing that
 * page is not a new visit.
 *
 * A page is whatever the host names its pages by (an address, a screen and a
 * preview): two pages are the same when their fields are.
 */

export type BrowserEntry<P extends object> =
  | { readonly kind: 'page'; readonly page: P }
  /** The empty tab a reader opens with "+". */
  | { readonly kind: 'new-tab' }
  /** An address the reader typed that no page has. */
  | { readonly kind: 'unreachable'; readonly url: string };

export type BrowserTab<P extends object> = {
  readonly id: string;
  readonly history: readonly BrowserEntry<P>[];
  /** The entry on screen in this tab. */
  readonly index: number;
};

export type BrowserSim<P extends object> = {
  readonly tabs: readonly BrowserTab<P>[];
  readonly activeId: string;
  /** The page the host showed when last observed; `null` while it shows something outside the browser. */
  readonly seen: string | null;
  readonly nextId: number;
};

export type BrowserIntent<P extends object> =
  /** The page on screen now, or `null` for something outside the browser (a mail, a phone app). */
  | { readonly kind: 'observe'; readonly page: P | null }
  /** The reader opens a page from the browser itself (the new tab page, the address bar). */
  | { readonly kind: 'visit'; readonly page: P }
  | { readonly kind: 'back' }
  | { readonly kind: 'forward' }
  | { readonly kind: 'open-tab'; readonly entry: BrowserEntry<P>; readonly background: boolean }
  | { readonly kind: 'new-tab' }
  | { readonly kind: 'unreachable'; readonly url: string }
  | { readonly kind: 'activate'; readonly id: string }
  | { readonly kind: 'close-tab'; readonly id: string };

const pageKey = (page: object): string =>
  JSON.stringify(
    Object.entries(page)
      .filter(([, value]) => value !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  );

const isOn = <P extends object>(entry: BrowserEntry<P> | undefined, key: string): boolean =>
  entry?.kind === 'page' && pageKey(entry.page) === key;

const tabId = (n: number): string => `tab-${n}`;

export const startBrowser = <P extends object>(page: P): BrowserSim<P> => ({
  tabs: [{ id: tabId(1), history: [{ kind: 'page', page }], index: 0 }],
  activeId: tabId(1),
  seen: pageKey(page),
  nextId: 2,
});

/** Never shown: `activeId` always names a tab, since every intent that removes one moves it first. */
const NO_TAB: BrowserTab<never> = { id: '', history: [], index: 0 };

export const activeTab = <P extends object>(sim: BrowserSim<P>): BrowserTab<P> =>
  sim.tabs.find((tab) => tab.id === sim.activeId) ?? sim.tabs[0] ?? NO_TAB;

export const activeEntry = <P extends object>(sim: BrowserSim<P>): BrowserEntry<P> | undefined => {
  const tab = activeTab(sim);
  return tab.history[tab.index];
};

export const canGoBack = <P extends object>(sim: BrowserSim<P>): boolean => activeTab(sim).index > 0;

export const canGoForward = <P extends object>(sim: BrowserSim<P>): boolean => {
  const tab = activeTab(sim);
  return tab.index < tab.history.length - 1;
};

const updateActive = <P extends object>(
  sim: BrowserSim<P>,
  update: (tab: BrowserTab<P>) => BrowserTab<P>,
): BrowserSim<P> => ({
  ...sim,
  tabs: sim.tabs.map((tab) => (tab.id === sim.activeId ? update(tab) : tab)),
});

/** A visit drops the entries ahead of the one on screen, like a browser. */
const push = <P extends object>(sim: BrowserSim<P>, entry: BrowserEntry<P>): BrowserSim<P> =>
  updateActive(sim, (tab) => ({
    ...tab,
    history: [...tab.history.slice(0, tab.index + 1), entry],
    index: tab.index + 1,
  }));

/**
 * The element navigates to the page a move lands on, so that page is already
 * seen; landing on an entry that is no page (a new tab) leaves the hash alone.
 */
const landed = <P extends object>(sim: BrowserSim<P>): BrowserSim<P> => {
  const entry = activeEntry(sim);
  return entry?.kind === 'page' ? { ...sim, seen: pageKey(entry.page) } : sim;
};

const moveBy = <P extends object>(sim: BrowserSim<P>, delta: number): BrowserSim<P> => {
  const tab = activeTab(sim);
  const index = tab.index + delta;
  if (index < 0 || index >= tab.history.length) return sim;
  return landed(updateActive(sim, (current) => ({ ...current, index })));
};

const openTab = <P extends object>(sim: BrowserSim<P>, entry: BrowserEntry<P>, background: boolean): BrowserSim<P> => {
  const id = tabId(sim.nextId);
  const at = sim.tabs.findIndex((tab) => tab.id === sim.activeId) + 1;
  return landed({
    ...sim,
    tabs: [...sim.tabs.slice(0, at), { id, history: [entry], index: 0 }, ...sim.tabs.slice(at)],
    activeId: background ? sim.activeId : id,
    nextId: sim.nextId + 1,
  });
};

/** Closing the last tab leaves a new tab page: the window of the prototype stays open. */
const closeTab = <P extends object>(sim: BrowserSim<P>, id: string): BrowserSim<P> => {
  const at = sim.tabs.findIndex((tab) => tab.id === id);
  if (at < 0) return sim;
  if (sim.tabs.length === 1) {
    const fresh = tabId(sim.nextId);
    return {
      ...sim,
      tabs: [{ id: fresh, history: [{ kind: 'new-tab' }], index: 0 }],
      activeId: fresh,
      nextId: sim.nextId + 1,
    };
  }
  const tabs = sim.tabs.filter((tab) => tab.id !== id);
  if (id !== sim.activeId) return { ...sim, tabs };
  const next = tabs[at] ?? tabs[at - 1];
  return landed({ ...sim, tabs, activeId: next?.id ?? sim.activeId });
};

const observe = <P extends object>(sim: BrowserSim<P>, page: P | null): BrowserSim<P> => {
  const key = page === null ? null : pageKey(page);
  if (key === sim.seen) return sim;
  const seen = { ...sim, seen: key };
  if (page === null || key === null || isOn(activeEntry(sim), key)) return seen;
  return push(seen, { kind: 'page', page });
};

const visit = <P extends object>(sim: BrowserSim<P>, page: P): BrowserSim<P> => {
  const key = pageKey(page);
  if (isOn(activeEntry(sim), key)) return sim.seen === key ? sim : { ...sim, seen: key };
  return push({ ...sim, seen: key }, { kind: 'page', page });
};

export const reduceBrowser = <P extends object>(sim: BrowserSim<P>, intent: BrowserIntent<P>): BrowserSim<P> => {
  switch (intent.kind) {
    case 'observe':
      return observe(sim, intent.page);
    case 'visit':
      return visit(sim, intent.page);
    case 'back':
      return moveBy(sim, -1);
    case 'forward':
      return moveBy(sim, 1);
    case 'open-tab':
      return openTab(sim, intent.entry, intent.background);
    case 'new-tab':
      return openTab(sim, { kind: 'new-tab' }, false);
    case 'unreachable':
      return push(sim, { kind: 'unreachable', url: intent.url });
    case 'activate':
      return sim.tabs.some((tab) => tab.id === intent.id) && intent.id !== sim.activeId
        ? landed({ ...sim, activeId: intent.id })
        : sim;
    case 'close-tab':
      return closeTab(sim, intent.id);
    default:
      return sim;
  }
};
