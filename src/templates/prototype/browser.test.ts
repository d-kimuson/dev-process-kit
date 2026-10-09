// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';

import type { DpkTemplatePrototype } from './element';

import { prototypeMessages } from './messages';
import '../../index';

const base = {
  title: 'Shop',
  apps: [
    {
      id: 'shop',
      name: 'Shop',
      actor: 'Hanako',
      screens: [
        { id: 'top', title: 'Top', previews: [{ id: 'top', url: 'https://shop.test/' }] },
        { id: 'list', title: 'Orders', previews: [{ id: 'list', url: 'https://shop.test/orders' }] },
        { id: 'detail', title: 'Order detail', previews: [{ id: 'detail', url: 'https://shop.test/orders/42' }] },
        { id: 'mail', title: 'Order mail', previews: [{ id: 'mail', kind: 'mail' }] },
        {
          id: 'phone',
          title: 'Phone top',
          previews: [{ id: 'phone', url: 'https://m.shop.test/', viewport: 'mobile' }],
        },
        {
          id: 'phone-orders',
          title: 'Phone orders',
          previews: [{ id: 'phone-orders', url: 'https://m.shop.test/orders', viewport: 'mobile' }],
        },
        {
          id: 'help',
          title: 'Help',
          previews: [
            { id: 'help-desktop', url: 'https://shop.test/help', label: 'Desktop' },
            { id: 'help-phone', url: 'https://m.shop.test/help', viewport: 'mobile', label: 'Phone' },
          ],
        },
        { id: 'app-home', title: 'App home', previews: [{ id: 'app-home', kind: 'native', viewport: 'mobile' }] },
      ],
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
            { id: 'top', name: 'Open', panes: [{ screen: 'top' }] },
            { id: 'list', name: 'List', panes: [{ screen: 'list' }] },
            { id: 'detail', name: 'Detail', panes: [{ screen: 'detail' }] },
            { id: 'mail', name: 'Mail', panes: [{ screen: 'mail' }] },
          ],
        },
      ],
    },
  ],
};

const m = prototypeMessages('en');

const mount = (hash: string): DpkTemplatePrototype => {
  window.location.hash = hash;
  document.body.innerHTML = `
    <dpk-template-prototype storage="memory">
      <script type="application/json">${JSON.stringify(base)}</script>
      <div slot="preview" data-preview-id="top">
        <a class="to-list" data-dpk-navigate="screen=list">Orders</a>
        <a class="to-detail" data-dpk-navigate="screen=detail" target="_blank">Order 42</a>
        <form><input name="q" value="" /></form>
      </div>
      <div slot="preview" data-preview-id="list"><a class="to-detail" data-dpk-navigate="screen=detail">Order 42</a></div>
      <div slot="preview" data-preview-id="detail">Order 42</div>
      <div slot="preview" data-preview-id="mail">Mail</div>
      <div slot="preview" data-preview-id="phone"><a class="to-orders" data-dpk-navigate="screen=phone-orders" target="_blank">Orders</a></div>
      <div slot="preview" data-preview-id="phone-orders">Orders</div>
      <div slot="preview" data-preview-id="app-home">Home</div>
      <div slot="preview" data-preview-id="help-desktop">Help</div>
      <div slot="preview" data-preview-id="help-phone">Help</div>
    </dpk-template-prototype>`;
  return document.querySelector('dpk-template-prototype') as DpkTemplatePrototype;
};

const settle = async (el: DpkTemplatePrototype): Promise<void> => {
  await el.api.ready;
  await el.updateComplete;
  await Promise.resolve();
  await el.updateComplete;
};

const tabs = (el: DpkTemplatePrototype): string[][] =>
  [...el.shadowRoot!.querySelectorAll('.browser-tab')].map((tab) => [
    tab.querySelector('.browser-tab-title')?.textContent?.trim() ?? '',
    tab.getAttribute('aria-selected') ?? '',
  ]);

const button = (el: DpkTemplatePrototype, selector: string): HTMLButtonElement =>
  el.shadowRoot!.querySelector<HTMLButtonElement>(selector)!;

describe('the browser of the app view', () => {
  beforeEach(() => {
    window.location.hash = '';
    document.body.innerHTML = '';
  });

  it('runs a web page in a browser with tabs, a toolbar, the address and the profile of its user', async () => {
    const el = mount('#view=app&screen=top');
    await settle(el);
    const root = el.shadowRoot!;
    expect(root.querySelector('.browser')).not.toBeNull();
    expect(tabs(el)).toEqual([['Top', 'true']]);
    expect(button(el, '.browser-back').disabled).toBe(true);
    expect(button(el, '.browser-forward').disabled).toBe(true);
    expect(root.querySelector<HTMLInputElement>('.browser-address')?.value).toBe('https://shop.test/');
    expect(root.querySelector('.browser-profile')?.textContent?.trim()).toContain('Hanako');
    expect(root.querySelector('.browser-profile')?.getAttribute('title')).toBe(m.browserProfile('Hanako'));
  });

  it('keeps the frame as it was in the scenario view', async () => {
    const el = mount('#step=top');
    await settle(el);
    expect(el.shadowRoot!.querySelector('.browser')).toBeNull();
    expect(el.shadowRoot!.querySelector('.chrome .url')?.textContent).toBe('https://shop.test/');
  });

  it('runs a screen in a window of a fixed size, a device the reader picks', async () => {
    const el = mount('#view=app&screen=phone');
    await settle(el);
    const root = el.shadowRoot!;
    const frame = (): HTMLElement => root.querySelector<HTMLElement>('.frame')!;
    const select = (): HTMLSelectElement => root.querySelector<HTMLSelectElement>('.device-select')!;
    expect(frame().dataset['window']).toBe('device');
    expect(frame().style.getPropertyValue('--device-width')).toBe('393px');
    expect(frame().style.getPropertyValue('--device-height')).toBe('852px');
    expect(select().value).toBe('iphone-16');
    expect([...select().options].map((option) => option.textContent?.trim())).toContain('iPhone SE · 375×667');

    select().value = 'iphone-se';
    select().dispatchEvent(new Event('change'));
    await settle(el);
    expect(frame().style.getPropertyValue('--device-width')).toBe('375px');

    // The pick is per class: a desktop page runs in a desktop window, and a phone page keeps the phone.
    el.api.navigate({ screen: 'top' });
    await settle(el);
    expect(select().value).toBe('laptop-13');
    expect(frame().style.getPropertyValue('--device-height')).toBe('800px');
    el.api.navigate({ screen: 'phone-orders' });
    await settle(el);
    expect(select().value).toBe('iphone-se');
  });

  it('puts a phone app’s bezel around the device’s screen', async () => {
    const el = mount('#view=app&screen=app-home');
    await settle(el);
    const frame = el.shadowRoot!.querySelector<HTMLElement>('.frame[data-kind="native"]')!;
    expect(frame.dataset['window']).toBe('device');
    expect(frame.style.getPropertyValue('--device-width')).toBe(`${393 + 22}px`);
  });

  it('leaves the scenario view content sized, without a device', async () => {
    const el = mount('#step=top');
    await settle(el);
    expect(el.shadowRoot!.querySelector('.frame')?.hasAttribute('data-window')).toBe(false);
    expect(el.shadowRoot!.querySelector('.device-select')).toBeNull();
  });

  it('goes back and forward through the pages the reader visited', async () => {
    const el = mount('#view=app&screen=top');
    await settle(el);
    el.querySelector<HTMLAnchorElement>('[data-preview-id="top"] .to-list')!.click();
    await settle(el);
    expect(location.hash).toContain('screen=list');
    expect(button(el, '.browser-back').disabled).toBe(false);
    expect(tabs(el)).toEqual([['Orders', 'true']]);

    button(el, '.browser-back').click();
    await settle(el);
    expect(location.hash).toContain('screen=top');
    expect(location.hash).toContain('view=app');
    expect(button(el, '.browser-forward').disabled).toBe(false);

    button(el, '.browser-forward').click();
    await settle(el);
    expect(location.hash).toContain('screen=list');
  });

  it('opens a link with target="_blank" in a new tab, and goes back to the first tab', async () => {
    const el = mount('#view=app&screen=top');
    await settle(el);
    el.querySelector<HTMLAnchorElement>('[data-preview-id="top"] .to-detail')!.click();
    await settle(el);
    expect(tabs(el)).toEqual([
      ['Top', 'false'],
      ['Order detail', 'true'],
    ]);
    expect(location.hash).toContain('screen=detail');
    // A new tab starts its own history.
    expect(button(el, '.browser-back').disabled).toBe(true);

    el.shadowRoot!.querySelector<HTMLElement>('.browser-tab[aria-selected="false"]')!.click();
    await settle(el);
    expect(location.hash).toContain('screen=top');
    expect(tabs(el)).toEqual([
      ['Top', 'true'],
      ['Order detail', 'false'],
    ]);
  });

  it('opens a link in a background tab on a Ctrl / Cmd click, staying on the page', async () => {
    const el = mount('#view=app&screen=top');
    await settle(el);
    el.querySelector('[data-preview-id="top"] .to-list')!.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, composed: true, metaKey: true }),
    );
    await settle(el);
    expect(tabs(el)).toEqual([
      ['Top', 'true'],
      ['Orders', 'false'],
    ]);
    expect(location.hash).toContain('screen=top');
  });

  it('closes a tab', async () => {
    const el = mount('#view=app&screen=top');
    await settle(el);
    el.querySelector<HTMLAnchorElement>('[data-preview-id="top"] .to-detail')!.click();
    await settle(el);
    button(el, '.browser-tab[aria-selected="true"] .browser-tab-close').click();
    await settle(el);
    expect(tabs(el)).toEqual([['Top', 'true']]);
    expect(location.hash).toContain('screen=top');

    // The last tab closes too, and the window stays on a new tab page.
    button(el, '.browser-tab .browser-tab-close').click();
    await settle(el);
    expect(tabs(el)).toEqual([[m.newTab, 'true']]);
    expect(el.shadowRoot!.querySelector('.browser-newtab')).not.toBeNull();
  });

  it('opens a new tab on the new tab page, whose shortcuts lead to the pages of the app', async () => {
    const el = mount('#view=app&screen=top');
    await settle(el);
    button(el, '.browser-new-tab').click();
    await settle(el);
    const root = el.shadowRoot!;
    expect(tabs(el)).toEqual([
      ['Top', 'false'],
      [m.newTab, 'true'],
    ]);
    expect(root.querySelector<HTMLInputElement>('.browser-address')?.value).toBe('');
    // The window keeps the size of the page it covers.
    expect(root.querySelector('.browser')?.getAttribute('data-viewport')).toBe('fluid');
    // The page under the new tab page is not on screen: its markup is parked.
    expect(root.querySelector('.viewport slot[name="preview:top"]')).toBeNull();
    const shortcuts = [...root.querySelectorAll<HTMLElement>('.browser-shortcut')];
    expect(shortcuts.map((shortcut) => shortcut.querySelector('.browser-shortcut-title')?.textContent)).toEqual([
      'Top',
      'Orders',
      'Order detail',
      'Help',
      'Phone top',
      'Phone orders',
    ]);
    shortcuts[0]!.click();
    await settle(el);
    expect(tabs(el)).toEqual([
      ['Top', 'false'],
      ['Top', 'true'],
    ]);
    expect(button(el, '.browser-back').disabled).toBe(false);
  });

  it('goes to the page at the address the reader types, or says nothing is there', async () => {
    const el = mount('#view=app&screen=top');
    await settle(el);
    const root = el.shadowRoot!;
    const address = root.querySelector<HTMLInputElement>('.browser-address')!;
    address.value = 'shop.test/orders/42';
    address.form!.dispatchEvent(new Event('submit', { cancelable: true }));
    await settle(el);
    expect(location.hash).toContain('screen=detail');

    const again = root.querySelector<HTMLInputElement>('.browser-address')!;
    again.value = 'https://shop.test/missing';
    again.form!.dispatchEvent(new Event('submit', { cancelable: true }));
    await settle(el);
    expect(root.querySelector('.browser-unreachable')?.textContent).toContain(m.unreachableTitle);
    expect(tabs(el)).toEqual([['shop.test', 'true']]);
    button(el, '.browser-back').click();
    await settle(el);
    expect(root.querySelector('.browser-unreachable')).toBeNull();
    expect(tabs(el)).toEqual([['Order detail', 'true']]);
  });

  it('reloads the page: forms start over and the mock hears a dpk-reload event', async () => {
    const el = mount('#view=app&screen=top');
    await settle(el);
    const preview = el.querySelector<HTMLElement>('[data-preview-id="top"]')!;
    const input = preview.querySelector<HTMLInputElement>('input')!;
    input.value = 'typed';
    const heard = new Promise<Event>((resolve) => preview.addEventListener('dpk-reload', resolve, { once: true }));
    button(el, '.browser-reload').click();
    await settle(el);
    expect(el.shadowRoot!.querySelector('.browser')?.hasAttribute('data-loading')).toBe(true);
    const event = await heard;
    expect(event.bubbles).toBe(true);
    expect(input.value).toBe('');
    await settle(el);
    expect(el.shadowRoot!.querySelector('.browser')?.hasAttribute('data-loading')).toBe(false);
  });

  it('drops a reload when the reader leaves the page before it is done', async () => {
    const el = mount('#view=app&screen=top');
    await settle(el);
    const list = el.querySelector<HTMLElement>('[data-preview-id="list"]')!;
    let heard = 0;
    list.addEventListener('dpk-reload', () => (heard += 1));
    button(el, '.browser-reload').click();
    await settle(el);
    el.querySelector<HTMLAnchorElement>('[data-preview-id="top"] .to-list')!.click();
    await settle(el);
    await new Promise((resolve) => setTimeout(resolve, 450));
    await settle(el);
    expect(location.hash).toContain('screen=list');
    expect(heard).toBe(0);
    expect(el.shadowRoot!.querySelector('.browser')?.hasAttribute('data-loading')).toBe(false);
  });

  it('moves between tabs with the arrow keys, as a tab list does', async () => {
    const el = mount('#view=app&screen=top');
    await settle(el);
    button(el, '.browser-new-tab').click();
    await settle(el);
    const root = el.shadowRoot!;
    const active = root.querySelector<HTMLElement>('.browser-tab[aria-selected="true"]')!;
    active.focus();
    active.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
    await settle(el);
    expect(tabs(el)).toEqual([
      ['Top', 'true'],
      [m.newTab, 'false'],
    ]);
    expect(root.activeElement).toBe(root.querySelector('.browser-tab[aria-selected="true"]'));
    root
      .querySelector<HTMLElement>('.browser-tab[aria-selected="true"]')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }));
    await settle(el);
    expect(tabs(el)).toEqual([
      ['Top', 'false'],
      [m.newTab, 'true'],
    ]);
  });

  it('shows a screen outside the browser in its own frame', async () => {
    const el = mount('#view=app&screen=mail');
    await settle(el);
    expect(el.shadowRoot!.querySelector('.browser')).toBeNull();
    expect(el.shadowRoot!.querySelector('.frame[data-kind="mail"]')).not.toBeNull();
  });
});

describe('maximize and demo', () => {
  beforeEach(() => {
    window.location.hash = '';
    document.body.innerHTML = '';
  });

  it('maximizes the scenario view, and offers a demo in the app view instead', async () => {
    const el = mount('#step=top');
    await settle(el);
    const root = el.shadowRoot!;
    expect(root.querySelector('.stage-maximize')).not.toBeNull();
    expect(root.querySelector('.stage-demo')).toBeNull();

    el.api.navigate({ view: 'app' });
    await settle(el);
    expect(root.querySelector('.stage-maximize')).toBeNull();
    expect(root.querySelector('.stage-demo')?.textContent?.trim()).toBe(m.demo);
    expect(root.querySelector('.ui-comment-toggle')).not.toBeNull();
  });

  it('runs the demo with only the browser on screen, until Esc or the exit button', async () => {
    const el = mount('#view=app&screen=top');
    await settle(el);
    const root = el.shadowRoot!;
    button(el, '.stage-demo').click();
    await settle(el);
    expect(root.querySelector('.stage')?.classList.contains('is-demo')).toBe(true);
    expect(root.querySelector('.stage .page-head')).toBeNull();
    expect(root.querySelector('.stage .stage-bar')).toBeNull();
    expect(root.querySelector('.stage .browser')).not.toBeNull();
    // The way out sits in the free end of the tab strip, like a window control.
    expect(root.querySelector('.browser-tabs .demo-exit')).not.toBeNull();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await settle(el);
    expect(root.querySelector('.stage')?.classList.contains('is-demo')).toBe(false);

    button(el, '.stage-demo').click();
    await settle(el);
    button(el, '.demo-exit').click();
    await settle(el);
    expect(root.querySelector('.stage')?.classList.contains('is-demo')).toBe(false);
  });
});

describe('the browser of a phone', () => {
  beforeEach(() => {
    window.location.hash = '';
    document.body.innerHTML = '';
  });

  it('shows a phone browser: the address on top, the controls at the bottom, no tab strip', async () => {
    const el = mount('#view=app&screen=phone');
    await settle(el);
    const root = el.shadowRoot!;
    const browser = root.querySelector('.browser');
    expect(browser?.getAttribute('data-viewport')).toBe('mobile');
    expect(root.querySelector('.browser-tab-list')).toBeNull();
    expect(root.querySelector<HTMLInputElement>('.browser-address')?.value).toBe('https://m.shop.test/');
    expect(root.querySelector('.browser-toolbar .browser-avatar')?.textContent).toBe('H');
    const bottom = [...root.querySelectorAll('.browser-bottom button')].map((control) =>
      control.getAttribute('aria-label'),
    );
    expect(bottom).toEqual([m.browserBack, m.browserForward, m.newTab, m.browserTabs, m.browserReload]);
    expect(button(el, '.browser-tab-count').textContent?.trim()).toBe('1');

    // A new tab stays phone wide.
    button(el, '.browser-bottom .browser-new-tab').click();
    await settle(el);
    expect(root.querySelector('.browser')?.getAttribute('data-viewport')).toBe('mobile');
    expect(root.querySelector('.browser-newtab')).not.toBeNull();
    expect(button(el, '.browser-tab-count').textContent?.trim()).toBe('2');
  });

  it('switches tabs on a tab overview the tab count opens', async () => {
    const el = mount('#view=app&screen=phone');
    await settle(el);
    const root = el.shadowRoot!;
    el.querySelector<HTMLAnchorElement>('[data-preview-id="phone"] .to-orders')!.click();
    await settle(el);
    expect(location.hash).toContain('screen=phone-orders');
    expect(button(el, '.browser-tab-count').textContent?.trim()).toBe('2');

    button(el, '.browser-tab-count').click();
    await settle(el);
    const cards = () =>
      [...root.querySelectorAll('.browser-switcher .browser-card')].map((card) => [
        card.querySelector('.browser-card-title')?.textContent?.trim(),
        card.getAttribute('aria-current'),
      ]);
    expect(cards()).toEqual([
      ['Phone top', null],
      ['Phone orders', 'true'],
    ]);

    root.querySelector<HTMLButtonElement>('.browser-switcher .browser-card .browser-card-open')!.click();
    await settle(el);
    expect(root.querySelector('.browser-switcher')).toBeNull();
    expect(location.hash).toContain('screen=phone');

    button(el, '.browser-tab-count').click();
    await settle(el);
    root.querySelector<HTMLButtonElement>('.browser-switcher .browser-card .browser-tab-close')!.click();
    await settle(el);
    expect(cards()).toEqual([['Phone orders', 'true']]);
  });

  it('keeps the demo exit floating over a phone browser, which has no tab strip', async () => {
    const el = mount('#view=app&screen=phone');
    await settle(el);
    button(el, '.stage-demo').click();
    await settle(el);
    expect(el.shadowRoot!.querySelector('.stage > .demo-exit')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('.browser-tabs')).toBeNull();
  });

  it('switches a screen between its renditions, the browser following the device', async () => {
    const el = mount('#view=app&screen=help');
    await settle(el);
    const root = el.shadowRoot!;
    const renditions = [...root.querySelectorAll<HTMLAnchorElement>('.stage-tools .tab')];
    expect(renditions.map((tab) => tab.textContent?.trim())).toEqual(['Desktop', 'Phone']);
    expect(root.querySelector('.browser-tab-list')).not.toBeNull();

    el.api.navigate({ preview: 'help-phone' });
    await settle(el);
    expect(root.querySelector('.browser')?.getAttribute('data-viewport')).toBe('mobile');
    expect(root.querySelector('.browser-tab-list')).toBeNull();
  });

  it('never wraps a phone app in a browser: it is no web page', async () => {
    const el = mount('#view=app&screen=app-home');
    await settle(el);
    const root = el.shadowRoot!;
    expect(root.querySelector('.browser')).toBeNull();
    expect(root.querySelector('.frame[data-kind="native"] .status-bar')).not.toBeNull();
  });
});
