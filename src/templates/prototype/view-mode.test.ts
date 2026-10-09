// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';

import type { DpkTemplatePrototype } from './element';

import { parsePrototypeBase } from './model';
import { prototypeAppSections, resolvePrototypeNavigation, type ScreenTreeNode } from './present';
import { prototypeViewOf, viewPatch } from './view-mode';
import '../../index';

const base = {
  title: 'Shop',
  activities: [
    {
      id: 'buy',
      name: 'Buy',
      actor: 'Shopper',
      stories: [
        {
          id: 'order',
          name: 'Order',
          steps: [
            {
              id: 'list',
              name: 'Open the list',
              title: 'Orders',
              situation: 'On the train',
              previews: [{ id: 'list-mobile' }],
            },
            { id: 'detail', name: 'Open an order', title: 'Order detail', previews: [{ id: 'detail-mobile' }] },
          ],
        },
        {
          id: 'cancel',
          name: 'Cancel',
          steps: [
            { id: 'list-again', name: 'Find the order', title: 'Orders', previews: [{ id: 'list-again-mobile' }] },
            { id: 'memo', name: 'Read the memo', title: 'Memo' },
          ],
        },
      ],
    },
    {
      id: 'admin',
      name: 'Admin',
      actor: 'Operator',
      stories: [
        {
          id: 'refunds',
          name: 'Refunds',
          steps: [{ id: 'refunds', name: 'Check refunds', title: 'Orders', previews: [{ id: 'refunds-desktop' }] }],
        },
      ],
    },
  ],
};

const appsBase = {
  title: 'Shop',
  apps: [
    { id: 'shop', name: 'Shop', description: 'For buyers' },
    { id: 'admin', name: 'Admin console' },
  ],
  activities: [
    {
      id: 'buy',
      name: 'Buy',
      app: 'shop',
      stories: [
        {
          id: 'order',
          name: 'Order',
          steps: [
            { id: 'top', name: 'Open the shop', title: 'Top', previews: [{ id: 'top', url: 'https://shop.test/' }] },
            {
              id: 'list',
              name: 'Open the orders',
              title: 'Orders',
              previews: [{ id: 'list', url: 'https://shop.test/mypage/orders?page=1' }],
            },
            {
              id: 'detail',
              name: 'Open an order',
              title: 'Order detail',
              previews: [{ id: 'detail', url: 'https://shop.test/mypage/orders/42' }],
            },
            {
              id: 'thanks',
              name: 'Finish',
              title: 'Thanks',
              previews: [{ id: 'thanks', url: 'https://shop.test/checkout/done/thanks' }],
            },
            { id: 'mail', name: 'Get a mail', title: 'Order mail', previews: [{ id: 'mail', kind: 'mail' }] },
            { id: 'shop-ops', name: 'The shop is told', title: 'New order', app: 'admin', previews: [{ id: 'ops' }] },
          ],
        },
      ],
    },
    {
      id: 'misc',
      name: 'Misc',
      stories: [{ id: 'm', name: 'M', steps: [{ id: 'fax', name: 'Fax', previews: [{ id: 'fax', kind: 'plain' }] }] }],
    },
  ],
};

type TreeOutline = { label: string; screens: string[]; children: TreeOutline[] };
const outline = (node: ScreenTreeNode): TreeOutline => ({
  label: node.segment,
  screens: node.screens.map((screen) => screen.title),
  children: node.children.map(outline),
});

describe('the app view', () => {
  it('lists each screen once per actor, opened at its first step, and skips steps with nothing to show', () => {
    const sections = prototypeAppSections(parsePrototypeBase(base));
    expect(sections).toHaveLength(1);
    expect(sections[0]?.app).toBeUndefined();
    const screens = sections[0]?.screens ?? [];
    expect(screens.map((screen) => [screen.actor, screen.title])).toEqual([
      ['Shopper', 'Orders'],
      ['Shopper', 'Order detail'],
      ['Operator', 'Orders'],
    ]);
    const orders = screens[0];
    expect(orders?.opensAt.step.id).toBe('list');
    expect(orders?.stepRefs).toEqual(['buy.order.list', 'buy.cancel.list-again']);
    expect(orders?.previewIds).toEqual(['list-mobile', 'list-again-mobile']);
  });

  it('splits the screens per sub-application, in the order the page declares them', () => {
    const sections = prototypeAppSections(parsePrototypeBase(appsBase));
    expect(sections.map((section) => [section.app?.id, section.screens.map((screen) => screen.title)])).toEqual([
      ['shop', ['Top', 'Orders', 'Order detail', 'Thanks', 'Order mail']],
      ['admin', ['New order']],
      // Screens no level names an app for come last, on their own.
      [undefined, ['Fax']],
    ]);
  });

  it('lays the web pages out as a URL tree per origin, folding paths that lead to one page', () => {
    const [shop] = prototypeAppSections(parsePrototypeBase(appsBase));
    expect(shop?.trees.map((tree) => tree.origin)).toEqual(['https://shop.test']);
    expect(outline(shop!.trees[0]!.root)).toEqual({
      label: '/',
      screens: ['Top'],
      children: [
        {
          label: '/mypage/orders',
          screens: ['Orders'],
          children: [{ label: '/42', screens: ['Order detail'], children: [] }],
        },
        { label: '/checkout/done/thanks', screens: ['Thanks'], children: [] },
      ],
    });
    expect(shop?.trees[0]?.root.children[0]?.children[0]?.path).toBe('/mypage/orders/42');
    // What is not a web page keeps the list grouped by who uses it.
    expect(shop?.others.map((group) => group.screens.map((screen) => screen.title))).toEqual([['Order mail']]);
  });

  it('keeps view=app in the hash and drops any other view', () => {
    const state = parsePrototypeBase(base);
    expect(resolvePrototypeNavigation(state, { view: 'app' })['view']).toBe('app');
    expect(resolvePrototypeNavigation(state, { view: 'scenario' })['view']).toBeUndefined();
    expect(prototypeViewOf({ view: 'app' })).toBe('app');
    expect(prototypeViewOf({})).toBe('scenario');
    expect(viewPatch('scenario')).toEqual({ view: null });
  });
});

describe('<dpk-template-prototype> views', () => {
  const mount = (): DpkTemplatePrototype => {
    document.body.innerHTML = `
      <dpk-template-prototype storage="memory">
        <script type="application/json">${JSON.stringify(base)}</script>
        <div slot="preview" data-preview-id="list-mobile"><a data-dpk-navigate="step=detail">Order 1</a></div>
      </dpk-template-prototype>`;
    return document.querySelector('dpk-template-prototype') as DpkTemplatePrototype;
  };
  const settle = async (el: DpkTemplatePrototype): Promise<void> => {
    await el.api.ready;
    await el.updateComplete;
    await Promise.resolve();
    await el.updateComplete;
  };

  beforeEach(() => {
    window.location.hash = '';
    document.body.innerHTML = '';
  });

  it('switches from the story steps to the app screens at the top of the sidebar', async () => {
    const el = mount();
    await settle(el);
    const root = el.shadowRoot!;
    const options = [...root.querySelectorAll<HTMLAnchorElement>('.view-switch .view-option')];
    expect(options.map((option) => option.dataset['view'])).toEqual(['scenario', 'app']);
    expect(root.querySelector('.view-option[aria-current="page"]')?.getAttribute('data-view')).toBe('scenario');
    expect(root.querySelector('.situation')).not.toBeNull();
    expect(root.querySelectorAll('.nav select')).toHaveLength(2);

    el.api.navigate({ view: 'app' });
    await settle(el);
    expect(location.hash).toContain('view=app');
    expect(root.querySelector('.view-option[aria-current="page"]')?.getAttribute('data-view')).toBe('app');
    // With no sub-applications declared there is nothing to pick between.
    expect(root.querySelectorAll('.nav select')).toHaveLength(0);
    expect(root.querySelector('.app-origin')?.textContent).toBe('shop.example.com');
    // Two people use a page called Orders: each row says whose it is.
    expect(
      [...root.querySelectorAll('.tree-row')].map((row) => [
        row.querySelector('.tree-path')?.textContent,
        row.querySelector('.tree-title')?.textContent,
        row.querySelector('.tree-actor')?.textContent,
      ]),
    ).toEqual([
      ['/list-mobile', 'Orders', 'Shopper'],
      ['/detail-mobile', 'Order detail', 'Shopper'],
      ['/refunds-desktop', 'Orders', 'Operator'],
    ]);
    expect(root.querySelector('.tree-row[data-current="true"] .tree-title')?.textContent).toBe('Orders');
    // The app is the UI alone: the scenario's situation band is not shown.
    expect(root.querySelector('.situation')).toBeNull();

    // A link of the mock moves around the app and stays in the app view.
    el.querySelector<HTMLAnchorElement>('[data-dpk-navigate]')!.click();
    await settle(el);
    expect(location.hash).toContain('step=detail');
    expect(location.hash).toContain('view=app');
    expect(root.querySelector('.tree-row[data-current="true"] .tree-title')?.textContent).toBe('Order detail');
  });

  it('shows one sub-application at a time, picked with a select, its web pages as a URL tree', async () => {
    window.location.hash = '#view=app';
    document.body.innerHTML = `
      <dpk-template-prototype storage="memory">
        <script type="application/json">${JSON.stringify(appsBase)}</script>
      </dpk-template-prototype>`;
    const el = document.querySelector('dpk-template-prototype') as DpkTemplatePrototype;
    await settle(el);
    const root = el.shadowRoot!;
    const select = root.querySelector<HTMLSelectElement>('.nav select[aria-label="App"]')!;
    expect([...select.options].map((option) => [option.text, option.selected])).toEqual([
      ['Shop', true],
      ['Admin console', false],
      ['Other', false],
    ]);
    expect(root.querySelector('.app-description')?.textContent).toBe('For buyers');
    expect(root.querySelector('.app-origin')?.textContent).toBe('shop.test');
    const rows = [...root.querySelectorAll<HTMLElement>('.tree-row')];
    expect(
      rows.map((row) => [
        row.dataset['depth'],
        row.querySelector('.tree-path')?.textContent,
        row.querySelector('.tree-title')?.textContent,
      ]),
    ).toEqual([
      ['0', '/', 'Top'],
      ['1', '/mypage/orders', 'Orders'],
      ['2', '/42', 'Order detail'],
      ['1', '/checkout/done/thanks', 'Thanks'],
    ]);
    // A row names its whole path, since the tree only shows the end of it.
    expect(rows[2]?.querySelector('a')?.title).toBe('/mypage/orders/42');
    // Only the shop's people use it: no row needs to say who.
    expect(root.querySelector('.tree-actor')).toBeNull();
    // A mail is no web page: it stays in a list below the tree.
    expect(root.querySelector('.app-screens .step-name')?.textContent).toBe('Order mail');
    expect(root.querySelector('.app-group .app-actor')?.textContent).toBe('Outside the browser');

    select.value = '1';
    select.dispatchEvent(new Event('change'));
    await settle(el);
    expect(location.hash).toContain('step=shop-ops');
    expect(location.hash).toContain('view=app');
    expect(root.querySelector<HTMLSelectElement>('.nav select[aria-label="App"]')?.selectedOptions[0]?.text).toBe(
      'Admin console',
    );
    expect(root.querySelector('.tree-row[data-current="true"] .tree-title')?.textContent).toBe('New order');
  });
});
