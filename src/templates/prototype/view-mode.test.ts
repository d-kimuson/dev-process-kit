// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';

import type { DpkTemplatePrototype } from './element';

import { parsePrototypeBase } from './model';
import { prototypeAppSections, resolvePrototypeNavigation, type ScreenTreeNode } from './present';
import { prototypeViewOf, viewPatch } from './view-mode';
import '../../index';

const base = {
  title: 'Shop',
  apps: [
    {
      id: 'shop',
      name: 'Shop',
      description: 'For buyers',
      actor: 'Shopper',
      screens: [
        { id: 'top', title: 'Top', previews: [{ id: 'top', url: 'https://shop.test/' }] },
        { id: 'list', title: 'Orders', previews: [{ id: 'list', url: 'https://shop.test/mypage/orders?page=1' }] },
        {
          id: 'detail',
          title: 'Order detail',
          description: 'One **order**, with its items.',
          previews: [{ id: 'detail', url: 'https://shop.test/mypage/orders/42' }],
        },
        { id: 'thanks', title: 'Thanks', previews: [{ id: 'thanks', url: 'https://shop.test/checkout/done/thanks' }] },
        { id: 'mail', title: 'Order mail', previews: [{ id: 'mail', kind: 'mail' }] },
      ],
    },
    {
      id: 'admin',
      name: 'Admin console',
      actor: 'Operator',
      screens: [{ id: 'new-order', title: 'New order', previews: [{ id: 'ops', url: 'https://admin.test/orders' }] }],
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
            { id: 'open-list', name: 'Open the list', panes: [{ screen: 'list' }], situation: 'On the train' },
            { id: 'open-detail', name: 'Open an order', panes: [{ screen: 'detail' }] },
            {
              id: 'check',
              name: 'Check against the memo',
              panes: [{ material: { id: 'memo', kind: 'plain', label: 'Memo' } }, { screen: 'detail' }],
            },
          ],
        },
      ],
    },
  ],
};

type TreeOutline = { label: string; screens: string[]; children: TreeOutline[] };
const outline = (node: ScreenTreeNode): TreeOutline => ({
  label: node.segment,
  screens: node.screens.map((entry) => entry.screen.title),
  children: node.children.map(outline),
});

describe('the app view', () => {
  it('lists the screens of each app, in the order the page declares them', () => {
    const sections = prototypeAppSections(parsePrototypeBase(base));
    expect(sections.map((section) => [section.app.id, section.screens.map((entry) => entry.screen.title)])).toEqual([
      ['shop', ['Top', 'Orders', 'Order detail', 'Thanks', 'Order mail']],
      ['admin', ['New order']],
    ]);
  });

  it('lays the web pages out as a URL tree per origin, folding paths that lead to one page', () => {
    const [shop] = prototypeAppSections(parsePrototypeBase(base));
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
    // What is not a web page stays in a list of its own.
    expect(shop?.others.map((entry) => entry.screen.title)).toEqual(['Order mail']);
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
        <div slot="preview" data-preview-id="list"><a data-dpk-navigate="screen=detail">Order 1</a></div>
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
    // The app view names a screen, nothing of the scenario.
    expect(location.hash).toContain('screen=list');
    expect(location.hash).not.toContain('step=');
    expect(root.querySelector('.view-option[aria-current="page"]')?.getAttribute('data-view')).toBe('app');
    expect(root.querySelector('.tree-row[data-current="true"] .tree-title')?.textContent).toBe('Orders');
    // A screen has no situation: that belongs to the scenario.
    expect(root.querySelector('.situation')).toBeNull();

    // A link of the mock moves around the app and stays in the app view.
    el.querySelector<HTMLAnchorElement>('[data-dpk-navigate]')!.click();
    await settle(el);
    expect(location.hash).toContain('screen=detail');
    expect(location.hash).toContain('view=app');
    expect(root.querySelector('.tree-row[data-current="true"] .tree-title')?.textContent).toBe('Order detail');
    // The screen's description follows the list.
    expect(root.querySelector('.screen-description strong')?.textContent).toBe('order');
  });

  it('shows a screen alone, never the materials a step holds beside it', async () => {
    window.location.hash = '#step=check';
    const el = mount();
    await settle(el);
    const root = el.shadowRoot!;
    expect(root.querySelector('.canvas')?.getAttribute('data-layout')).toBe('side-by-side');
    expect([...root.querySelectorAll('.canvas slot')].map((slot) => slot.getAttribute('name'))).toEqual([
      'preview:memo',
      'preview:detail',
    ]);

    el.api.navigate({ view: 'app' });
    await settle(el);
    expect(location.hash).toContain('screen=detail');
    expect([...root.querySelectorAll('.canvas slot')].map((slot) => slot.getAttribute('name'))).toEqual([
      'preview:detail',
    ]);
  });

  it('moves the scenario to the step that shows the screen a link names', async () => {
    const el = mount();
    await settle(el);
    el.querySelector<HTMLAnchorElement>('[data-dpk-navigate]')!.click();
    await settle(el);
    expect(location.hash).toContain('step=open-detail');
    expect(location.hash).not.toContain('screen=');
    expect(location.hash).not.toContain('view=app');
  });

  it('shows one app at a time, picked with a select, its web pages as a URL tree', async () => {
    window.location.hash = '#view=app';
    const el = mount();
    await settle(el);
    const root = el.shadowRoot!;
    const select = root.querySelector<HTMLSelectElement>('.nav select[aria-label="App"]')!;
    expect([...select.options].map((option) => [option.text, option.selected])).toEqual([
      ['Shop', true],
      ['Admin console', false],
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
    // A mail is no web page: it stays in a list below the tree.
    expect(root.querySelector('.app-screens .step-name')?.textContent).toBe('Order mail');
    expect(root.querySelector('.app-group .app-group-heading')?.textContent).toBe('Outside the browser');

    select.value = '1';
    select.dispatchEvent(new Event('change'));
    await settle(el);
    expect(location.hash).toContain('screen=new-order');
    expect(location.hash).toContain('view=app');
    expect(root.querySelector<HTMLSelectElement>('.nav select[aria-label="App"]')?.selectedOptions[0]?.text).toBe(
      'Admin console',
    );
    expect(root.querySelector('.tree-row[data-current="true"] .tree-title')?.textContent).toBe('New order');
  });
});
