import { describe, expect, it } from 'vitest';

import { reduceBrowser, startBrowser, type BrowserPage } from './browser-sim';
import { presentBrowser, prototypeBrowserPage, prototypeNewTabShortcuts, prototypePageAt } from './browser-view';
import { prototypeMessages } from './messages';
import { parsePrototypeBase } from './model';
import { resolvePrototypeNavigation } from './present';

const state = parsePrototypeBase({
  title: 'Shop',
  apps: [
    {
      id: 'shop',
      name: 'Shop',
      actor: 'Hanako',
      screens: [
        { id: 'top', title: 'Top', previews: [{ id: 'top', url: 'https://shop.test/' }] },
        {
          id: 'list',
          title: 'Orders',
          previews: [
            { id: 'list', url: 'https://shop.test/mypage/orders?page=1' },
            { id: 'list-app', kind: 'native' },
          ],
        },
        { id: 'mail', title: 'Order mail', previews: [{ id: 'mail', kind: 'mail' }] },
      ],
    },
    {
      id: 'admin',
      name: 'Admin',
      actor: 'Operator',
      screens: [{ id: 'console', title: 'Console', previews: [{ id: 'console', url: 'https://admin.test/orders' }] }],
    },
  ],
  activities: [
    {
      id: 'buy',
      name: 'Buy',
      stories: [
        {
          id: 'order',
          name: 'Order',
          steps: [
            { id: 'open', name: 'Open', screen: 'top' },
            {
              id: 'memo',
              name: 'With a memo',
              screen: 'list',
              materials: [{ id: 'memo-paper', kind: 'plain' }],
            },
          ],
        },
      ],
    },
  ],
});

const pageAt = (nav: Record<string, string>): BrowserPage | null =>
  prototypeBrowserPage(state, resolvePrototypeNavigation(state, nav));

const top = { screen: 'top', preview: 'top' };
const list = { screen: 'list', preview: 'list' };
const m = prototypeMessages('en');

describe('the pages the browser shows', () => {
  it('is the screen of the app view and its rendition, when that rendition is a web page', () => {
    expect(pageAt({ view: 'app', screen: 'top' })).toEqual(top);
    expect(pageAt({ view: 'app', screen: 'list' })).toEqual(list);
  });

  it('is nothing for a screen outside the browser, nor in the scenario view', () => {
    expect(pageAt({ view: 'app', screen: 'list', preview: 'list-app' })).toBeNull();
    expect(pageAt({ view: 'app', screen: 'mail' })).toBeNull();
    expect(pageAt({ step: 'open' })).toBeNull();
    expect(pageAt({ step: 'memo' })).toBeNull();
  });

  it('opens the screen of a step a link of the scenario names', () => {
    expect(pageAt({ view: 'app', step: 'memo' })).toEqual(list);
  });

  it('finds the page an address leads to, ignoring the query and a trailing slash', () => {
    expect(prototypePageAt(state, 'https://shop.test/mypage/orders/', 'https://shop.test/')).toEqual(list);
    expect(prototypePageAt(state, 'shop.test', 'https://shop.test/x')).toEqual(top);
    // A path alone stays on the site on screen.
    expect(prototypePageAt(state, '/mypage/orders', 'https://shop.test/')).toEqual(list);
    expect(prototypePageAt(state, 'https://admin.test/orders', 'https://shop.test/')).toEqual({
      screen: 'console',
      preview: 'console',
    });
    expect(prototypePageAt(state, 'https://shop.test/nothing', 'https://shop.test/')).toBeNull();
  });
});

describe('the browser chrome', () => {
  it('names each tab after its page and shows the address and the user of the active one', () => {
    let sim = startBrowser(top);
    sim = reduceBrowser(sim, { kind: 'observe', page: list });
    sim = reduceBrowser(sim, { kind: 'new-tab' });
    const view = presentBrowser(state, sim, m);
    expect(view.tabs.map((tab) => [tab.title, tab.active])).toEqual([
      ['Orders', false],
      [m.newTab, true],
    ]);
    expect(view.entry).toEqual({ kind: 'new-tab' });
    expect(view.url).toBe('');
    expect(view.canBack).toBe(false);
    // The profile is who the window belongs to: the user the app of the last page seen is for.
    expect(view.profile).toBe('Hanako');
  });

  it('shows the web address of a page and lets the reader go back to the previous one', () => {
    const sim = reduceBrowser(startBrowser(top), { kind: 'observe', page: list });
    const view = presentBrowser(state, sim, m);
    expect(view.url).toBe('https://shop.test/mypage/orders?page=1');
    expect(view.canBack).toBe(true);
    expect(view.canForward).toBe(false);
  });

  it('names the user of the page the window belongs to when no tab shows a page any more', () => {
    const opened = reduceBrowser(startBrowser(top), { kind: 'new-tab' });
    const sim = reduceBrowser(opened, { kind: 'close-tab', id: opened.tabs[0]?.id ?? '' });
    expect(presentBrowser(state, sim, m).profile).toBeUndefined();
    expect(presentBrowser(state, sim, m, top).profile).toBe('Hanako');
  });

  it('names an unreachable address after its host', () => {
    const sim = reduceBrowser(startBrowser(top), { kind: 'unreachable', url: 'https://nowhere.test/x' });
    const view = presentBrowser(state, sim, m);
    expect(view.tabs[0]?.title).toBe('nowhere.test');
    expect(view.url).toBe('https://nowhere.test/x');
  });

  it('offers the web pages of the app the reader is in on the new tab page', () => {
    const shop = prototypeNewTabShortcuts(state, top);
    expect(shop.map((shortcut) => [shortcut.title, shortcut.url])).toEqual([
      ['Top', 'shop.test'],
      ['Orders', 'shop.test/mypage/orders'],
    ]);
    expect(shop[1]?.page).toEqual(list);
    expect(prototypeNewTabShortcuts(state, { screen: 'console' }).map((s) => s.title)).toEqual(['Console']);
  });
});
