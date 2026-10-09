import { describe, expect, it } from 'vitest';

import type { Navigation } from '../../core/types';

import { allScreens, findPreview, findScreen, findStep, parsePrototypeBase, stepScreen } from './model';
import {
  locatePrototype,
  prototypeAppSections,
  prototypeCurrentAppSection,
  prototypeLinkProblem,
  prototypePageHeading,
  prototypeStageFrames,
  resolvePrototypeNavigation,
} from './present';

/**
 * The product's screens live under the app they belong to; a scenario step
 * names the screen the user is on and keeps only what belongs to the story
 * (the situation, the materials at hand). See the ADR
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
              materials: [{ id: 'fax-paper', kind: 'plain' }],
            },
            {
              id: 'stuck',
              name: 'Look into the refund',
              situation: 'The FAX at hand',
              screen: 'refund-detail',
              materials: [{ id: 'stuck-memo', kind: 'plain', label: 'Memo' }],
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

  it('lets a step name its screen and keep the materials at hand, with no previews of its own', () => {
    const state = parsePrototypeBase(base());
    const stuck = findStep(state, 'stuck');
    expect(stuck?.step).toMatchObject({ screen: 'refund-detail', situation: 'The FAX at hand' });
    expect(stuck?.step.materials.map((material) => material.id)).toEqual(['stuck-memo']);
    expect(findStep(state, 'fax')?.step.screen).toBeUndefined();
  });

  it('rejects what the step no longer owns: a title, a layout, previews, an app', () => {
    const withStep = (extra: Record<string, unknown>): unknown => ({
      activities: [
        { id: 'a', name: 'A', stories: [{ id: 's', name: 'S', steps: [{ id: 'x', name: 'X', ...extra }] }] },
      ],
    });
    expect(() => parsePrototypeBase(withStep({ title: 'X' }))).toThrow();
    expect(() => parsePrototypeBase(withStep({ layout: 'tabs' }))).toThrow();
    expect(() => parsePrototypeBase(withStep({ previews: [] }))).toThrow();
    expect(() => parsePrototypeBase(withStep({ app: 'shop' }))).toThrow();
    expect(() => parsePrototypeBase({ activities: [{ id: 'a', name: 'A', app: 'shop' }] })).toThrow();
  });

  it('rejects a screen no app declares', () => {
    const state = base();
    const broken = JSON.parse(JSON.stringify(state).replace('"screen":"refund-detail"', '"screen":"refund-detial"'));
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

  it('finds a screen, the screen of a step, and every screen in page order', () => {
    const state = parsePrototypeBase(base());
    expect(findScreen(state, 'refunds')?.app.id).toBe('admin');
    expect(findScreen(state, 'nope')).toBeUndefined();
    expect(findScreen(state, undefined)).toBeUndefined();
    const stuck = findStep(state, 'stuck');
    expect(stuck && stepScreen(state, stuck.step)?.screen.id).toBe('refund-detail');
    const fax = findStep(state, 'fax');
    expect(fax && stepScreen(state, fax.step)).toBeUndefined();
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
            previews: [{ id: 'refund-desktop', url: 'https://admin.test/refunds/1' }],
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
              { id: 'look', name: 'Look at the cart', screen: 'cart', situation: 'On the train' },
              { id: 'buy', name: 'Buy', screen: 'order' },
              { id: 'again', name: 'Look at the cart again', screen: 'cart' },
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
              { id: 'fax', name: 'Read the FAX', materials: [{ id: 'fax-paper', kind: 'plain' }] },
              { id: 'list', name: 'Find the order', screen: 'refunds' },
              {
                id: 'stuck',
                name: 'Look into it',
                screen: 'refund',
                materials: [{ id: 'stuck-memo', kind: 'plain', label: 'Memo' }],
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

describe('prototype stage of a step', () => {
  it('shows the renditions of its screen as tabs, one at a time', () => {
    const frames = framesAt({ step: 'look', preview: 'cart-desktop' });
    expect(frames.layout).toBe('tabs');
    expect(ids(frames.shown)).toEqual(['cart-desktop']);
    expect(ids(frames.tabs)).toEqual(['cart-mobile', 'cart-desktop']);
    expect(frames.activeId).toBe('cart-desktop');
  });

  it('puts the materials at hand beside the screen', () => {
    const frames = framesAt({ step: 'stuck' });
    expect(frames.layout).toBe('side-by-side');
    expect(ids(frames.shown)).toEqual(['stuck-memo', 'refund-desktop']);
    expect(frames.tabs).toEqual([]);
  });

  it('shows a moment away from the product with its materials alone', () => {
    const frames = framesAt({ step: 'fax' });
    expect(frames.layout).toBe('tabs');
    expect(ids(frames.shown)).toEqual(['fax-paper']);
  });
});

describe('prototype stage of a screen in the app view', () => {
  it('shows the screen alone, nothing the scenario holds', () => {
    const frames = framesAt({ view: 'app', screen: 'refund' });
    expect(ids(frames.shown)).toEqual(['refund-desktop']);
    expect(frames.layout).toBe('tabs');
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
    expect(resolve({ activity: 'buyer', story: 'checkout', step: 'look', screen: 'refund' })).toMatchObject({
      activity: 'ops',
      story: 'refund',
      step: 'stuck',
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

  it('keeps the rendition of the screen in the scenario, and drops it for a step without one', () => {
    expect(resolve({ step: 'look', preview: 'cart-desktop' })['preview']).toBe('cart-desktop');
    expect(resolve({ step: 'stuck', preview: 'stuck-memo' })['preview']).toBe('refund-desktop');
    expect(resolve({ step: 'fax', preview: 'fax-paper' })).not.toHaveProperty('preview');
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
