import { afterEach, describe, expect, it } from 'vitest';

import { defineBrowser, type DpkBrowser } from './index';

defineBrowser();

const mount = async (attributes = ''): Promise<DpkBrowser> => {
  document.body.innerHTML = `<dpk-browser ${attributes}>
    <section id="home" data-url="https://shop.example.com/" data-title="Home">
      <a id="to-cart" href="/cart">Cart</a>
      <a id="to-cart-tab" href="/cart" target="_blank">Cart in a tab</a>
      <a id="to-nowhere" href="/missing">Missing</a>
      <form><input id="query" value="" /></form>
    </section>
    <section id="cart" data-url="https://shop.example.com/cart"><h1>Your cart</h1></section>
  </dpk-browser>`;
  const browser = document.querySelector('dpk-browser') as DpkBrowser;
  await browser.updateComplete;
  return browser;
};

const shadow = (browser: DpkBrowser): ShadowRoot => browser.shadowRoot as ShadowRoot;

/** The page on screen, by the address bar (happy-dom's `slot.assign` adds instead of replacing). */
const shown = (browser: DpkBrowser): string | null =>
  shadow(browser).querySelector('.browser-page slot') === null
    ? null
    : (shadow(browser).querySelector('.browser-address') as HTMLInputElement).value;

const HOME = 'https://shop.example.com/';
const CART = 'https://shop.example.com/cart';

const tabTitles = (browser: DpkBrowser): string[] =>
  [...shadow(browser).querySelectorAll('.browser-tab-title')].map((tab) => tab.textContent ?? '');

const click = async (browser: DpkBrowser, selector: string): Promise<void> => {
  (shadow(browser).querySelector(selector) as HTMLElement).click();
  await browser.updateComplete;
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('dpk-browser', () => {
  it('opens the first page, titled by data-title or its heading', async () => {
    const browser = await mount();
    const slot = shadow(browser).querySelector('.browser-page slot') as HTMLSlotElement;
    expect(slot.assignedElements().map((element) => element.id)).toEqual(['home']);
    expect(shown(browser)).toBe(HOME);
    expect(tabTitles(browser)).toEqual(['Home']);
  });

  it('follows a page link, then goes back and forward through the history', async () => {
    const browser = await mount();
    const urls: string[] = [];
    browser.addEventListener('dpk-browser-navigate', (event) => {
      urls.push((event as CustomEvent<{ url: string }>).detail.url);
    });
    (document.querySelector('#to-cart') as HTMLAnchorElement).click();
    await browser.updateComplete;
    expect(shown(browser)).toBe(CART);
    expect(tabTitles(browser)).toEqual(['Your cart']);
    await click(browser, '.browser-back');
    expect(shown(browser)).toBe(HOME);
    await click(browser, '.browser-forward');
    expect(shown(browser)).toBe(CART);
    expect(urls).toEqual([
      'https://shop.example.com/cart',
      'https://shop.example.com/',
      'https://shop.example.com/cart',
    ]);
  });

  it('opens a target="_blank" link in a new tab', async () => {
    const browser = await mount();
    (document.querySelector('#to-cart-tab') as HTMLAnchorElement).click();
    await browser.updateComplete;
    expect(tabTitles(browser)).toEqual(['Home', 'Your cart']);
    expect(shown(browser)).toBe(CART);
  });

  it('shows its own page for an address no page has', async () => {
    const browser = await mount();
    (document.querySelector('#to-nowhere') as HTMLAnchorElement).click();
    await browser.updateComplete;
    expect(shown(browser)).toBeNull();
    expect(shadow(browser).querySelector('.browser-unreachable code')?.textContent).toBe(
      'https://shop.example.com/missing',
    );
  });

  it('goes to a typed address, a path staying on the site', async () => {
    const browser = await mount();
    const input = shadow(browser).querySelector('.browser-address') as HTMLInputElement;
    input.value = '/cart';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    await browser.updateComplete;
    expect(shown(browser)).toBe(CART);
  });

  it('offers every page on a new tab page', async () => {
    const browser = await mount();
    await click(browser, '.browser-new-tab');
    expect(shown(browser)).toBeNull();
    const tiles = [...shadow(browser).querySelectorAll('.browser-shortcut-title')].map((tile) => tile.textContent);
    expect(tiles).toEqual(['Home', 'Your cart']);
    await click(browser, '.browser-shortcut:nth-child(2)');
    expect(shown(browser)).toBe(CART);
    expect(tabTitles(browser)).toEqual(['Home', 'Your cart']);
  });

  it('starts on the page url names', async () => {
    const browser = await mount('url="https://shop.example.com/cart"');
    expect(shown(browser)).toBe(CART);
  });

  it('is a phone browser on viewport="mobile": no tab strip, the tab count at the bottom', async () => {
    const browser = await mount('viewport="mobile"');
    expect(shadow(browser).querySelector('.browser-tabs')).toBeNull();
    expect(shadow(browser).querySelector('.browser-tab-count-box')?.textContent).toBe('1');
    await click(browser, '.browser-tab-count');
    expect(shadow(browser).querySelectorAll('.browser-card')).toHaveLength(1);
  });

  it('resets the page on reload', async () => {
    const browser = await mount();
    const query = document.querySelector('#query') as HTMLInputElement;
    query.value = 'typed';
    let reloaded = false;
    document.querySelector('#home')?.addEventListener('dpk-reload', () => {
      reloaded = true;
    });
    await click(browser, '.browser-reload');
    expect(shadow(browser).querySelector('.browser')?.hasAttribute('data-loading')).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 420));
    expect(query.value).toBe('');
    expect(reloaded).toBe(true);
  });
});
