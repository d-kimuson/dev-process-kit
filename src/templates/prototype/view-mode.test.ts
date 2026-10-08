// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';

import type { DpkTemplatePrototype } from './element';

import { parsePrototypeBase } from './model';
import { prototypeAppScreens, resolvePrototypeNavigation } from './present';
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

describe('the app view', () => {
  it('lists each screen once per actor, opened at its first step, and skips steps with nothing to show', () => {
    const groups = prototypeAppScreens(parsePrototypeBase(base));
    expect(
      groups.map((group) => ({ actor: group.actor, screens: group.screens.map((screen) => screen.title) })),
    ).toEqual([
      { actor: 'Shopper', screens: ['Orders', 'Order detail'] },
      { actor: 'Operator', screens: ['Orders'] },
    ]);
    const orders = groups[0]?.screens[0];
    expect(orders?.opensAt.step.id).toBe('list');
    expect(orders?.stepRefs).toEqual(['buy.order.list', 'buy.cancel.list-again']);
    expect(orders?.previewIds).toEqual(['list-mobile', 'list-again-mobile']);
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
    expect(root.querySelectorAll('.nav select')).toHaveLength(0);
    expect([...root.querySelectorAll('.app-actor')].map((heading) => heading.textContent)).toEqual([
      'Shopper',
      'Operator',
    ]);
    expect(root.querySelector('.app-screens .step-row[data-current="true"]')?.textContent).toContain('Orders');
    // The app is the UI alone: the scenario's situation band is not shown.
    expect(root.querySelector('.situation')).toBeNull();

    // A link of the mock moves around the app and stays in the app view.
    el.querySelector<HTMLAnchorElement>('[data-dpk-navigate]')!.click();
    await settle(el);
    expect(location.hash).toContain('step=detail');
    expect(location.hash).toContain('view=app');
    expect(root.querySelector('.app-screens .step-row[data-current="true"]')?.textContent).toContain('Order detail');
  });
});
