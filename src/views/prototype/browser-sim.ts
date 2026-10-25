import type * as Sim from '../../components/browser/sim';

/**
 * The browser the app view runs the web previews in (see
 * `components/browser/sim.ts`), over the pages of the prototype. It is never
 * part of the draft; the hash keeps naming the page on screen, and the element
 * reports every page it shows so a visit lands in the history of the active tab.
 */

/** A page of the prototype: where the hash points when it is on screen. */
export type BrowserPage = {
  readonly screen?: string;
  readonly preview?: string;
};

export type BrowserEntry = Sim.BrowserEntry<BrowserPage>;
export type BrowserTab = Sim.BrowserTab<BrowserPage>;
export type BrowserSim = Sim.BrowserSim<BrowserPage>;
export type BrowserIntent = Sim.BrowserIntent<BrowserPage>;

export {
  activeEntry,
  activeTab,
  canGoBack,
  canGoForward,
  reduceBrowser,
  startBrowser,
} from '../../components/browser/sim';
