import { describe, expect, it } from 'vitest';

import type { Navigation } from '../../core/types';

import { patchNavigation } from '../../core/navigation';
import { allScreens, findPreview, findScreen, findStep, parsePrototypeBase, stepScreens } from './model';
import {
  locatePrototype,
  prototypeAppSections,
  prototypeCurrentAppSection,
  prototypeLinkProblem,
  prototypeNavigationHierarchy,
  prototypePageHeading,
  prototypeRenditionSelection,
  prototypeStageFrames,
  resolvePrototypeNavigation,
} from './present';

/**
 * The product's screens live under the app they belong to; a scenario step
 * lays out what the user sees as panes, each a screen of the product or a
 * material only the story knows (a memo, a FAX). See the ADR
 * `20261009_prototype-screens-apart-from-scenarios.md`.
 */
const base = (overrides: Record<string, unknown> = {}): unknown => ({
  apps: [
    {
      id: 'admin',
      name: 'Admin console',
      actor: 'Operator',
      screens: [
        {
          id: 'refunds',
          title: 'Refunds',
          previews: [{ id: 'refunds-desktop', viewport: 'desktop', url: 'https://admin.test/refunds' }],
        },
        { id: 'refund-detail', title: 'Refund', previews: [{ id: 'refund-detail-desktop' }] },
      ],
    },
  ],
  activities: [
    {
      id: 'ops',
      name: 'Ops',
      stories: [
        {
          id: 'refund',
          name: 'Refund',
          steps: [
            {
              id: 'fax',
              name: 'Read the FAX',
              panes: [{ material: { id: 'fax-paper', kind: 'plain' } }],
            },
            {
              id: 'stuck',
              name: 'Look into the refund',
              situation: 'The FAX at hand',
              panes: [{ material: { id: 'stuck-memo', kind: 'plain', label: 'Memo' } }, { screen: 'refund-detail' }],
            },
          ],
        },
      ],
    },
  ],
  ...overrides,
});

describe('prototype screens', () => {
  it('declares the screens under their app, each with its renditions', () => {
    const state = parsePrototypeBase(base());
    expect(state.apps).toHaveLength(1);
    expect(state.apps[0]).toMatchObject({ id: 'admin', name: 'Admin console', actor: 'Operator' });
    expect(state.apps[0]?.screens.map((screen) => screen.id)).toEqual(['refunds', 'refund-detail']);
    expect(state.apps[0]?.screens[1]?.previews[0]).toMatchObject({ kind: 'browser', viewport: 'fluid' });
  });

  it('defaults the collections, so a page with no apps yet still parses', () => {
    expect(parsePrototypeBase({})).toEqual({ apps: [], activities: [] });
    const state = parsePrototypeBase({ apps: [{ id: 'shop', name: 'Shop' }] });
    expect(state.apps[0]?.screens).toEqual([]);
  });

  it('lays a step out as panes, in order: screens of the product and materials at hand', () => {
    const state = parsePrototypeBase(base());
    const stuck = findStep(state, 'stuck');
    expect(stuck?.step.situation).toBe('The FAX at hand');
    expect(stuck?.step.panes).toEqual([
      { material: { id: 'stuck-memo', kind: 'plain', viewport: 'fluid', label: 'Memo' } },
      { screen: 'refund-detail' },
    ]);
    expect(findStep(state, 'fax')?.step.panes).toHaveLength(1);
    const blank = parsePrototypeBase({
      activities: [{ id: 'a', name: 'A', stories: [{ id: 's', name: 'S', steps: [{ id: 'x', name: 'X' }] }] }],
    });
    expect(findStep(blank, 'x')?.step.panes).toEqual([]);
  });

  it('rejects a pane that is neither a screen nor a material, or both', () => {
    const withPanes = (panes: unknown[]): unknown =>
      base({
        activities: [{ id: 'a', name: 'A', stories: [{ id: 's', name: 'S', steps: [{ id: 'x', name: 'X', panes }] }] }],
      });
    expect(() => parsePrototypeBase(withPanes([{}]))).toThrow();
    expect(() => parsePrototypeBase(withPanes([{ screen: 'refunds', material: { id: 'm' } }]))).toThrow();
    expect(() => parsePrototypeBase(withPanes([{ material: { id: 'm' }, preview: 'refunds-desktop' }]))).toThrow();
  });

  it('pins a rendition of the screen, and only one the screen has', () => {
    const withPanes = (panes: unknown[]): unknown =>
      base({
        activities: [{ id: 'a', name: 'A', stories: [{ id: 's', name: 'S', steps: [{ id: 'x', name: 'X', panes }] }] }],
      });
    const state = parsePrototypeBase(withPanes([{ screen: 'refunds', preview: 'refunds-desktop' }]));
    expect(findStep(state, 'x')?.step.panes).toEqual([{ screen: 'refunds', preview: 'refunds-desktop' }]);
    expect(() => parsePrototypeBase(withPanes([{ screen: 'refunds', preview: 'refund-detail-desktop' }]))).toThrow(
      /preview "refund-detail-desktop" on step "x" is not a rendition of screen "refunds"/,
    );
  });

  it('shows a screen twice only as distinct pinned renditions, since a preview fills one slot', () => {
    const twoRenditions = {
      apps: [
        {
          id: 'shop',
          name: 'Shop',
          screens: [{ id: 'cart', title: 'Cart', previews: [{ id: 'cart-mobile' }, { id: 'cart-desktop' }] }],
        },
      ],
    };
    const withPanes = (panes: unknown[]): unknown => ({
      ...twoRenditions,
      activities: [{ id: 'a', name: 'A', stories: [{ id: 's', name: 'S', steps: [{ id: 'x', name: 'X', panes }] }] }],
    });
    expect(() =>
      parsePrototypeBase(
        withPanes([
          { screen: 'cart', preview: 'cart-mobile' },
          { screen: 'cart', preview: 'cart-desktop' },
        ]),
      ),
    ).not.toThrow();
    expect(() =>
      parsePrototypeBase(withPanes([{ screen: 'cart' }, { screen: 'cart', preview: 'cart-desktop' }])),
    ).toThrow(/screen "cart" is shown twice on step "x"/);
    expect(() =>
      parsePrototypeBase(
        withPanes([
          { screen: 'cart', preview: 'cart-mobile' },
          { screen: 'cart', preview: 'cart-mobile' },
        ]),
      ),
    ).toThrow(/screen "cart" is shown twice on step "x"/);
  });

  it('rejects what the step no longer owns: a title, a layout, previews, a lone screen, materials, an app', () => {
    const withStep = (extra: Record<string, unknown>): unknown => ({
      activities: [
        { id: 'a', name: 'A', stories: [{ id: 's', name: 'S', steps: [{ id: 'x', name: 'X', ...extra }] }] },
      ],
    });
    expect(() => parsePrototypeBase(withStep({ title: 'X' }))).toThrow();
    expect(() => parsePrototypeBase(withStep({ layout: 'tabs' }))).toThrow();
    expect(() => parsePrototypeBase(withStep({ previews: [] }))).toThrow();
    expect(() => parsePrototypeBase(withStep({ app: 'shop' }))).toThrow();
    expect(() => parsePrototypeBase(withStep({ screen: 'refunds' }))).toThrow();
    expect(() => parsePrototypeBase(withStep({ materials: [] }))).toThrow();
    expect(() => parsePrototypeBase({ activities: [{ id: 'a', name: 'A', app: 'shop' }] })).toThrow();
  });

  it('rejects a screen no app declares', () => {
    const state = base();
    const broken = JSON.parse(
      JSON.stringify(state).replace('{"screen":"refund-detail"}', '{"screen":"refund-detial"}'),
    );
    expect(() => parsePrototypeBase(broken)).toThrow(/unknown screen "refund-detial" on step "stuck"/);
  });

  it('keeps app, screen and preview ids unique across the page', () => {
    const app = (id: string, screens: unknown[] = []): unknown => ({ id, name: id, screens });
    expect(() => parsePrototypeBase({ apps: [app('shop'), app('shop')] })).toThrow(/duplicate app id "shop"/);
    expect(() =>
      parsePrototypeBase({
        apps: [app('shop', [{ id: 'top', title: 'Top' }]), app('admin', [{ id: 'top', title: 'Top' }])],
      }),
    ).toThrow(/duplicate screen id "top"/);
    expect(() =>
      parsePrototypeBase(
        base({
          apps: [app('admin', [{ id: 'refund-detail', title: 'Refund', previews: [{ id: 'stuck-memo' }] }])],
        }),
      ),
    ).toThrow(/duplicate preview id "stuck-memo"/);
  });

  it('finds a screen, the screens of a step, and every screen in page order', () => {
    const state = parsePrototypeBase(base());
    expect(findScreen(state, 'refunds')?.app.id).toBe('admin');
    expect(findScreen(state, 'nope')).toBeUndefined();
    expect(findScreen(state, undefined)).toBeUndefined();
    const stuck = findStep(state, 'stuck');
    expect(stuck && stepScreens(state, stuck.step).map((entry) => entry.screen.id)).toEqual(['refund-detail']);
    const fax = findStep(state, 'fax');
    expect(fax && stepScreens(state, fax.step)).toEqual([]);
    expect(allScreens(state).map((entry) => entry.screen.id)).toEqual(['refunds', 'refund-detail']);
  });

  it('finds a preview wherever it lives: a rendition of a screen, or a material of a step', () => {
    const state = parsePrototypeBase(base());
    const rendition = findPreview(state, 'refunds-desktop');
    expect(rendition?.owner).toMatchObject({ kind: 'screen' });
    expect(rendition?.owner.kind === 'screen' && rendition.owner.screen.id).toBe('refunds');
    const material = findPreview(state, 'stuck-memo');
    expect(material?.owner.kind === 'step' && material.owner.step.id).toBe('stuck');
    expect(material?.preview.label).toBe('Memo');
    expect(findPreview(state, 'nope')).toBeUndefined();
  });
});

/**
 * A shop and its admin console, and two stories: the buyer orders, and the
 * operator handles a refund with a FAX and a memo at hand.
 */
const product = () =>
  parsePrototypeBase({
    apps: [
      {
        id: 'shop',
        name: 'Shop',
        actor: 'Buyer',
        screens: [
          {
            id: 'cart',
            title: 'Cart',
            previews: [
              { id: 'cart-mobile', viewport: 'mobile', url: 'https://shop.test/cart' },
              { id: 'cart-desktop', viewport: 'desktop', url: 'https://shop.test/cart' },
            ],
          },
          { id: 'order', title: 'Order', previews: [{ id: 'order-mobile', url: 'https://shop.test/orders/1' }] },
          { id: 'mail', title: 'Order mail', previews: [{ id: 'mail-message', kind: 'mail' }] },
        ],
      },
      {
        id: 'admin',
        name: 'Admin',
        actor: 'Operator',
        screens: [
          { id: 'refunds', title: 'Refunds', previews: [{ id: 'refunds-desktop', url: 'https://admin.test/refunds' }] },
          {
            id: 'refund',
            title: 'Refund',
            previews: [
              { id: 'refund-desktop', viewport: 'desktop', url: 'https://admin.test/refunds/1' },
              { id: 'refund-mobile', viewport: 'mobile', url: 'https://admin.test/refunds/1' },
            ],
          },
        ],
      },
    ],
    activities: [
      {
        id: 'buyer',
        name: 'Buyer',
        stories: [
          {
            id: 'checkout',
            name: 'Checkout',
            steps: [
              { id: 'look', name: 'Look at the cart', panes: [{ screen: 'cart' }], situation: 'On the train' },
              { id: 'buy', name: 'Buy', panes: [{ screen: 'order' }] },
              { id: 'again', name: 'Look at the cart again', panes: [{ screen: 'cart' }] },
              { id: 'side', name: 'Buyer and operator', panes: [{ screen: 'cart' }, { screen: 'refund' }] },
              { id: 'pinned', name: 'The cart on a PC', panes: [{ screen: 'cart', preview: 'cart-desktop' }] },
            ],
          },
        ],
      },
      {
        id: 'ops',
        name: 'Ops',
        actor: 'Shop owner',
        stories: [
          {
            id: 'refund',
            name: 'Refund',
            steps: [
              { id: 'fax', name: 'Read the FAX', panes: [{ material: { id: 'fax-paper', kind: 'plain' } }] },
              { id: 'list', name: 'Find the order', panes: [{ screen: 'refunds' }] },
              {
                id: 'stuck',
                name: 'Look into it',
                panes: [{ material: { id: 'stuck-memo', kind: 'plain', label: 'Memo' } }, { screen: 'refund' }],
              },
            ],
          },
        ],
      },
    ],
  });

const ids = (previews: readonly { readonly id: string }[]): string[] => previews.map((preview) => preview.id);

const framesAt = (nav: Navigation) => {
  const state = product();
  const resolved = resolvePrototypeNavigation(state, nav);
  const located = locatePrototype(state, resolved);
  if (located === undefined || located.kind === 'story') throw new Error('nothing on stage');
  return prototypeStageFrames(state, located, resolved);
};

const tabsOf = (frames: ReturnType<typeof framesAt>): string[][] =>
  frames.panes.map((pane) => (pane.kind === 'screen' ? ids(pane.tabs) : []));

describe('prototype stage of a step', () => {
  it('shows a screen alone, its renditions as tabs, one at a time', () => {
    const frames = framesAt({ step: 'look', preview: 'cart-desktop' });
    expect(frames.layout).toBe('single');
    expect(ids(frames.shown)).toEqual(['cart-desktop']);
    expect(tabsOf(frames)).toEqual([['cart-mobile', 'cart-desktop']]);
  });

  it('lays the panes side by side in the order the step gives', () => {
    const frames = framesAt({ step: 'stuck' });
    expect(frames.layout).toBe('side-by-side');
    expect(frames.panes.map((pane) => pane.kind)).toEqual(['material', 'screen']);
    expect(ids(frames.shown)).toEqual(['stuck-memo', 'refund-desktop']);
    expect(tabsOf(frames)).toEqual([[], ['refund-desktop', 'refund-mobile']]);
  });

  it('shows two screens of the product side by side, each on its own rendition', () => {
    expect(ids(framesAt({ step: 'side' }).shown)).toEqual(['cart-mobile', 'refund-desktop']);
    const frames = framesAt({ step: 'side', preview: 'cart-desktop,refund-mobile' });
    expect(ids(frames.shown)).toEqual(['cart-desktop', 'refund-mobile']);
    const [cart] = frames.panes;
    expect(cart?.kind === 'screen' && cart.screen.screen.id).toBe('cart');
  });

  it('shows a pinned rendition with no tabs', () => {
    const frames = framesAt({ step: 'pinned', preview: 'cart-mobile' });
    expect(ids(frames.shown)).toEqual(['cart-desktop']);
    expect(tabsOf(frames)).toEqual([[]]);
  });

  it('shows a moment away from the product with its materials alone', () => {
    const frames = framesAt({ step: 'fax' });
    expect(frames.layout).toBe('single');
    expect(ids(frames.shown)).toEqual(['fax-paper']);
  });

  it('switches the rendition of one pane and keeps the others', () => {
    const frames = framesAt({ step: 'side', preview: 'cart-desktop,refund-mobile' });
    expect(prototypeRenditionSelection(frames, 'cart-mobile')).toBe('cart-mobile,refund-mobile');
    expect(prototypeRenditionSelection(frames, 'refund-desktop')).toBe('cart-desktop,refund-desktop');
  });
});

describe('prototype stage of a screen in the app view', () => {
  it('shows the screen alone, nothing the scenario holds', () => {
    const frames = framesAt({ view: 'app', screen: 'refund' });
    expect(ids(frames.shown)).toEqual(['refund-desktop']);
    expect(frames.layout).toBe('single');
  });

  it('heads the screen with its title and the user its app is for', () => {
    const state = product();
    const located = locatePrototype(state, resolvePrototypeNavigation(state, { view: 'app', screen: 'refund' }));
    expect(located?.kind).toBe('screen');
    expect(located && located.kind !== 'story' && prototypePageHeading(state, located)).toEqual({
      actor: 'Operator',
      title: 'Refund',
    });
  });
});

describe('prototype heading of a step', () => {
  const heading = (step: string) => {
    const state = product();
    const located = locatePrototype(state, resolvePrototypeNavigation(state, { step }));
    return located && located.kind !== 'story' && prototypePageHeading(state, located);
  };

  it('takes the title from its screen and the actor from the scenario, then from the app', () => {
    expect(heading('stuck')).toEqual({ actor: 'Shop owner', title: 'Refund' });
    expect(heading('look')).toEqual({ actor: 'Buyer', title: 'Cart' });
  });

  it('falls back to the step name away from the product', () => {
    expect(heading('fax')).toEqual({ actor: 'Shop owner', title: 'Read the FAX' });
  });

  it('takes the step name when it shows several screens, with no app to name the user', () => {
    expect(heading('side')).toEqual({ title: 'Buyer and operator' });
  });
});

describe('prototype navigation to a screen', () => {
  const resolve = (nav: Navigation) => resolvePrototypeNavigation(product(), nav);

  it('keeps the app view on the screen and its rendition, with no scenario keys', () => {
    expect(resolve({ view: 'app', screen: 'cart', preview: 'cart-desktop', step: 'look', story: 'checkout' })).toEqual({
      view: 'app',
      screen: 'cart',
      preview: 'cart-desktop',
    });
    // an unknown rendition falls back to the first
    expect(resolve({ view: 'app', screen: 'cart', preview: 'stuck-memo' })['preview']).toBe('cart-mobile');
  });

  it('opens the app view on the screen of the step it comes from, or on the first screen', () => {
    expect(resolve({ view: 'app', activity: 'ops', story: 'refund', step: 'stuck' })).toEqual({
      view: 'app',
      screen: 'refund',
      preview: 'refund-desktop',
    });
    expect(resolve({ view: 'app', step: 'fax' })).toMatchObject({ screen: 'cart' });
    // several screens: the first, on the rendition the scenario had
    expect(resolve({ view: 'app', step: 'side', preview: 'cart-desktop,refund-mobile' })).toEqual({
      view: 'app',
      screen: 'cart',
      preview: 'cart-desktop',
    });
    expect(resolve({ view: 'app', screen: 'refund', preview: 'cart-desktop,refund-mobile' })['preview']).toBe(
      'refund-mobile',
    );
    expect(resolve({ view: 'app', screen: 'ghost' })).toMatchObject({ screen: 'cart' });
  });

  it('moves the scenario to the next step of the story showing the screen', () => {
    expect(resolve({ activity: 'buyer', story: 'checkout', step: 'buy', screen: 'cart' })).toEqual({
      activity: 'buyer',
      story: 'checkout',
      step: 'again',
      preview: 'cart-mobile',
    });
  });

  it('stays on the step showing it, then goes back in the story, then anywhere on the page', () => {
    expect(resolve({ activity: 'buyer', story: 'checkout', step: 'again', screen: 'cart' })['step']).toBe('again');
    expect(resolve({ activity: 'buyer', story: 'checkout', step: 'again', screen: 'order' })['step']).toBe('buy');
    expect(resolve({ activity: 'buyer', story: 'checkout', step: 'look', screen: 'refund' })['step']).toBe('side');
    expect(resolve({ activity: 'buyer', story: 'checkout', step: 'look', screen: 'refunds' })).toMatchObject({
      activity: 'ops',
      story: 'refund',
      step: 'list',
    });
    expect(resolve({ screen: 'refunds' })).toMatchObject({ step: 'list' });
  });

  it('opens a screen no step shows in the app view', () => {
    expect(resolve({ activity: 'buyer', story: 'checkout', step: 'look', screen: 'mail' })).toEqual({
      view: 'app',
      screen: 'mail',
      preview: 'mail-message',
    });
  });

  it('keeps the rendition of each screen in the scenario, and drops it for a step with nothing to switch', () => {
    expect(resolve({ step: 'look', preview: 'cart-desktop' })['preview']).toBe('cart-desktop');
    expect(resolve({ step: 'stuck', preview: 'stuck-memo' })['preview']).toBe('refund-desktop');
    expect(resolve({ step: 'side' })['preview']).toBe('cart-mobile,refund-desktop');
    expect(resolve({ step: 'side', preview: 'refund-mobile' })['preview']).toBe('cart-mobile,refund-mobile');
    expect(resolve({ step: 'fax', preview: 'fax-paper' })).not.toHaveProperty('preview');
    expect(resolve({ step: 'pinned', preview: 'cart-mobile' })).not.toHaveProperty('preview');
  });
});

describe('prototype navigation between screens with the same kinds of rendition', () => {
  /** A shop the buyer uses both in the phone's browser and as its app. */
  const shop = () =>
    parsePrototypeBase({
      apps: [
        {
          id: 'shop',
          name: 'Shop',
          screens: [
            {
              id: 'home',
              title: 'Home',
              previews: [
                { id: 'home-web', viewport: 'mobile', url: 'https://shop.test/' },
                { id: 'home-app', kind: 'native', viewport: 'mobile' },
              ],
            },
            {
              id: 'item',
              title: 'Item',
              previews: [
                { id: 'item-web', viewport: 'mobile', url: 'https://shop.test/items/1' },
                { id: 'item-desktop', viewport: 'desktop', url: 'https://shop.test/items/1' },
                { id: 'item-app', kind: 'native', viewport: 'mobile' },
              ],
            },
          ],
        },
      ],
      activities: [
        {
          id: 'buyer',
          name: 'Buyer',
          stories: [
            {
              id: 'browse',
              name: 'Browse',
              steps: [
                { id: 'open', name: 'Open the shop', panes: [{ screen: 'home' }] },
                { id: 'pick', name: 'Pick an item', panes: [{ screen: 'item' }] },
              ],
            },
          ],
        },
      ],
    });
  const resolve = (nav: Navigation) => resolvePrototypeNavigation(shop(), nav);
  /** Where a link of a mock leads: the shell patches the hash with it, then the template resolves it. */
  const follow = (from: Navigation, link: Navigation) =>
    resolve(patchNavigation(resolve(from), link, prototypeNavigationHierarchy));

  it('keeps the rendition the reader is on when the shell follows a link to another screen', () => {
    expect(follow({ view: 'app', screen: 'home', preview: 'home-app' }, { screen: 'item' })['preview']).toBe(
      'item-app',
    );
    expect(follow({ step: 'open', preview: 'home-app' }, { step: 'pick' })['preview']).toBe('item-app');
  });

  it('keeps the reader in the app when a link of the app leads to another screen', () => {
    expect(resolve({ view: 'app', screen: 'item', preview: 'home-app' })['preview']).toBe('item-app');
    expect(resolve({ view: 'app', screen: 'item', preview: 'home-web' })['preview']).toBe('item-web');
    expect(resolve({ step: 'open', screen: 'item', preview: 'home-app' })).toMatchObject({
      step: 'pick',
      preview: 'item-app',
    });
  });

  it('falls back to the first rendition when the screen has none of the same kind and viewport', () => {
    const state = shop();
    const desktopOnly = parsePrototypeBase({
      ...state,
      apps: [
        {
          ...state.apps[0],
          screens: [
            ...(state.apps[0]?.screens ?? []),
            { id: 'help', title: 'Help', previews: [{ id: 'help-desktop', viewport: 'desktop' }] },
          ],
        },
      ],
    });
    expect(
      resolvePrototypeNavigation(desktopOnly, { view: 'app', screen: 'help', preview: 'home-app' })['preview'],
    ).toBe('help-desktop');
  });
});

describe('prototype app sections', () => {
  it('lists the screens of each app, and nothing a step holds', () => {
    const sections = prototypeAppSections(product());
    expect(sections.map((section) => section.app.id)).toEqual(['shop', 'admin']);
    const admin = sections[1];
    expect(admin?.screens.map((entry) => entry.screen.id)).toEqual(['refunds', 'refund']);
    const shop = sections[0];
    expect(shop?.others.map((entry) => entry.screen.id)).toEqual(['mail']);
    expect(shop?.trees.map((tree) => tree.origin)).toEqual(['https://shop.test']);
  });

  it('is in the app of the screen on stage, else the first', () => {
    const state = product();
    const sections = prototypeAppSections(state);
    const at = (nav: Navigation) => locatePrototype(state, resolvePrototypeNavigation(state, nav));
    expect(prototypeCurrentAppSection(sections, at({ view: 'app', screen: 'refund' }))?.app.id).toBe('admin');
    expect(prototypeCurrentAppSection(sections, undefined)?.app.id).toBe('shop');
  });

  it('leaves out an app with no screens yet', () => {
    const state = parsePrototypeBase({ apps: [{ id: 'empty', name: 'Empty' }] });
    expect(prototypeAppSections(state)).toEqual([]);
  });
});

describe('prototype links to a screen', () => {
  const link = (navigate: string) => prototypeLinkProblem(product(), { href: null, navigate });

  it('accepts a screen the page has and flags one it does not', () => {
    expect(link('screen=refund')).toBeNull();
    expect(link('screen=refnud')).toBe('unknown-target');
  });
});
