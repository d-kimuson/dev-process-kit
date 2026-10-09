import { describe, expect, it } from 'vitest';

import {
  activeEntry,
  activeTab,
  canGoBack,
  canGoForward,
  reduceBrowser,
  startBrowser,
  type BrowserEntry,
  type BrowserPage,
  type BrowserSim,
} from './browser-sim';

const cart: BrowserPage = { screen: 'cart' };
const pay: BrowserPage = { screen: 'pay' };
const done: BrowserPage = { screen: 'done' };
const page = (target: BrowserPage): BrowserEntry => ({ kind: 'page', page: target });

const visit = (sim: BrowserSim, ...pages: BrowserPage[]): BrowserSim =>
  pages.reduce((next, target) => reduceBrowser(next, { kind: 'observe', page: target }), sim);

describe('browser simulation', () => {
  it('starts with one tab on the page the reader is on', () => {
    const sim = startBrowser(cart);
    expect(sim.tabs).toHaveLength(1);
    expect(activeEntry(sim)).toEqual(page(cart));
    expect(canGoBack(sim)).toBe(false);
    expect(canGoForward(sim)).toBe(false);
  });

  it('keeps the history of the active tab as the reader moves through the mock', () => {
    const sim = visit(startBrowser(cart), pay, done);
    expect(activeTab(sim).history).toEqual([page(cart), page(pay), page(done)]);
    expect(activeEntry(sim)).toEqual(page(done));
    expect(canGoBack(sim)).toBe(true);
  });

  it('observing the same page again (a re-render) changes nothing', () => {
    const sim = visit(startBrowser(cart), pay);
    expect(reduceBrowser(sim, { kind: 'observe', page: pay })).toBe(sim);
  });

  it('goes back and forward without rewriting the history', () => {
    const start = visit(startBrowser(cart), pay, done);
    const back = reduceBrowser(start, { kind: 'back' });
    expect(activeEntry(back)).toEqual(page(pay));
    expect(canGoForward(back)).toBe(true);
    // The hash follows the screen back: observing it is not a new visit.
    const observed = reduceBrowser(back, { kind: 'observe', page: pay });
    expect(activeTab(observed).history).toHaveLength(3);
    const forward = reduceBrowser(observed, { kind: 'forward' });
    expect(activeEntry(forward)).toEqual(page(done));
  });

  it('visiting a page after going back drops the pages ahead, like a browser', () => {
    const back = reduceBrowser(visit(startBrowser(cart), pay, done), { kind: 'back' });
    const sim = visit(reduceBrowser(back, { kind: 'back' }), done);
    expect(activeTab(sim).history).toEqual([page(cart), page(done)]);
    expect(canGoForward(sim)).toBe(false);
  });

  it('cannot go back past the first page nor forward past the last', () => {
    const sim = startBrowser(cart);
    expect(reduceBrowser(sim, { kind: 'back' })).toBe(sim);
    expect(reduceBrowser(sim, { kind: 'forward' })).toBe(sim);
  });

  it('opens a link in a new tab next to the active one and switches to it', () => {
    const sim = reduceBrowser(startBrowser(cart), { kind: 'open-tab', entry: page(pay), background: false });
    expect(sim.tabs).toHaveLength(2);
    expect(activeEntry(sim)).toEqual(page(pay));
    expect(canGoBack(sim)).toBe(false);
  });

  it('opens a link in a background tab without leaving the page', () => {
    const sim = reduceBrowser(startBrowser(cart), { kind: 'open-tab', entry: page(pay), background: true });
    expect(sim.tabs.map((tab) => tab.history)).toEqual([[page(cart)], [page(pay)]]);
    expect(activeEntry(sim)).toEqual(page(cart));
  });

  it('places a new tab right after the active one', () => {
    let sim = reduceBrowser(startBrowser(cart), { kind: 'open-tab', entry: page(done), background: true });
    sim = reduceBrowser(sim, { kind: 'open-tab', entry: page(pay), background: true });
    expect(sim.tabs.map((tab) => activeEntryOf(tab))).toEqual([page(cart), page(pay), page(done)]);
  });

  it('a new tab starts on the new tab page; the next page visited goes into it', () => {
    let sim = reduceBrowser(startBrowser(cart), { kind: 'new-tab' });
    expect(activeEntry(sim)).toEqual({ kind: 'new-tab' });
    // The hash still names the page of the other tab: nothing new was visited.
    sim = reduceBrowser(sim, { kind: 'observe', page: cart });
    expect(activeEntry(sim)).toEqual({ kind: 'new-tab' });
    sim = visit(sim, pay);
    expect(activeTab(sim).history).toEqual([{ kind: 'new-tab' }, page(pay)]);
  });

  it('opening a page from the new tab page visits it even when the hash already names it', () => {
    let sim = reduceBrowser(startBrowser(cart), { kind: 'new-tab' });
    sim = reduceBrowser(sim, { kind: 'visit', page: cart });
    expect(activeTab(sim).history).toEqual([{ kind: 'new-tab' }, page(cart)]);
    // The navigation that follows shows the page just visited.
    expect(reduceBrowser(sim, { kind: 'observe', page: cart })).toBe(sim);
    // Visiting the page already on screen is a no-op, like re-entering its address.
    expect(reduceBrowser(sim, { kind: 'visit', page: cart })).toBe(sim);
  });

  it('an address nothing answers is a page of its own in the history', () => {
    const sim = reduceBrowser(startBrowser(cart), { kind: 'unreachable', url: 'https://nowhere.test/x' });
    expect(activeTab(sim).history).toEqual([page(cart), { kind: 'unreachable', url: 'https://nowhere.test/x' }]);
  });

  it('switches between tabs', () => {
    const opened = reduceBrowser(startBrowser(cart), { kind: 'open-tab', entry: page(pay), background: true });
    const second = opened.tabs[1]?.id ?? '';
    const sim = reduceBrowser(opened, { kind: 'activate', id: second });
    expect(activeEntry(sim)).toEqual(page(pay));
    expect(reduceBrowser(sim, { kind: 'activate', id: 'missing' })).toBe(sim);
  });

  it('closing the active tab moves to its right neighbour, else its left one', () => {
    let sim = reduceBrowser(startBrowser(cart), { kind: 'open-tab', entry: page(done), background: true });
    sim = reduceBrowser(sim, { kind: 'open-tab', entry: page(pay), background: false });
    // cart | pay* | done
    sim = reduceBrowser(sim, { kind: 'close-tab', id: activeTab(sim).id });
    expect(activeEntry(sim)).toEqual(page(done));
    sim = reduceBrowser(sim, { kind: 'close-tab', id: activeTab(sim).id });
    expect(activeEntry(sim)).toEqual(page(cart));
  });

  it('closing a tab in the background keeps the active one', () => {
    const opened = reduceBrowser(startBrowser(cart), { kind: 'open-tab', entry: page(pay), background: true });
    const sim = reduceBrowser(opened, { kind: 'close-tab', id: opened.tabs[1]?.id ?? '' });
    expect(sim.tabs).toHaveLength(1);
    expect(activeEntry(sim)).toEqual(page(cart));
  });

  it('closing the last tab leaves a fresh new tab page, since the window stays', () => {
    const start = visit(startBrowser(cart), pay);
    const sim = reduceBrowser(start, { kind: 'close-tab', id: activeTab(start).id });
    expect(sim.tabs).toHaveLength(1);
    expect(activeTab(sim).history).toEqual([{ kind: 'new-tab' }]);
    expect(activeTab(sim).id).not.toBe(activeTab(start).id);
    expect(reduceBrowser(sim, { kind: 'close-tab', id: 'missing' })).toBe(sim);
  });

  it('a screen outside the browser (a mail) leaves the history alone', () => {
    const sim = visit(startBrowser(cart), pay);
    const away = reduceBrowser(sim, { kind: 'observe', page: null });
    expect(activeTab(away).history).toEqual([page(cart), page(pay)]);
    // Coming back to the page the tab is on is not a new visit either.
    expect(activeTab(reduceBrowser(away, { kind: 'observe', page: pay })).history).toHaveLength(2);
  });
});

const activeEntryOf = (tab: BrowserSim['tabs'][number]): BrowserEntry | undefined => tab.history[tab.index];
