// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DpkViewPrototype } from './element';

import '../../index';
import { prototypeMessages } from './messages';
import { parsePrototypeBase } from './model';
import { prototypeScreenActions } from './present';

const m = prototypeMessages('en');

const base = {
  title: 'Shop',
  apps: [
    {
      id: 'shop',
      name: 'Shop',
      screens: [
        {
          id: 'contact',
          title: 'Contact',
          previews: [
            { id: 'contact-phone', viewport: 'mobile', label: 'Phone' },
            { id: 'contact-desk', viewport: 'desktop', label: 'Desktop' },
          ],
          actions: [
            {
              id: 'sample',
              label: 'Fill in a sample',
              description: 'A customer asking about a late parcel',
              fill: { '[name="order"]': 'SM-0127', '[name="topic"]': 'late', '[name="agree"]': true },
            },
            { id: 'send', label: 'Send', click: ['.send'] },
          ],
        },
        {
          id: 'search',
          title: 'Search',
          previews: [{ id: 'search', viewport: 'mobile' }],
          actions: [{ id: 'query', label: 'Search for tea', fill: { '[name="q"]': 'tea' } }],
        },
        { id: 'top', title: 'Top', previews: [{ id: 'top' }] },
      ],
    },
  ],
  activities: [
    {
      id: 'buy',
      name: 'Buy',
      stories: [
        {
          id: 'ask',
          name: 'Ask',
          steps: [
            { id: 'contact', name: 'Write', panes: [{ screen: 'contact' }] },
            {
              id: 'compare',
              name: 'Compare',
              panes: [{ screen: 'search' }, { screen: 'contact', preview: 'contact-phone' }],
            },
            { id: 'top', name: 'Open', panes: [{ screen: 'top' }] },
          ],
        },
      ],
    },
  ],
};

const contactMarkup = (id: string): string => `
  <div slot="preview" data-preview-id="${id}">
    <form>
      <input name="order" />
      <select name="topic"><option value="other">Other</option><option value="late">Late parcel</option></select>
      <input type="checkbox" name="agree" />
      <button type="button" class="send">Send</button>
    </form>
  </div>`;

describe('prototype screen actions: base data', () => {
  it('reads a screen’s actions, and gives a screen none by default', () => {
    const state = parsePrototypeBase(base);
    const [contact, , top] = state.apps[0]!.screens;
    expect(contact!.actions.map((action) => action.id)).toEqual(['sample', 'send']);
    expect(contact!.actions[0]!.fill).toEqual({
      '[name="order"]': 'SM-0127',
      '[name="topic"]': 'late',
      '[name="agree"]': true,
    });
    expect(top!.actions).toEqual([]);
  });

  it('rejects an action id used twice on a screen, a value that is neither text nor a flag, and an empty label', () => {
    const withActions = (actions: unknown[]) => ({
      ...base,
      apps: [{ id: 'shop', name: 'Shop', screens: [{ id: 'top', title: 'Top', actions }] }],
      activities: [],
    });
    expect(() =>
      parsePrototypeBase(
        withActions([
          { id: 'a', label: 'A' },
          { id: 'a', label: 'B' },
        ]),
      ),
    ).toThrow(/duplicate action id "a" on screen "top"/);
    expect(() => parsePrototypeBase(withActions([{ id: 'a', label: 'A', fill: { input: 3 } }]))).toThrow();
    expect(() => parsePrototypeBase(withActions([{ id: 'a', label: '' }]))).toThrow();
    expect(() => parsePrototypeBase(withActions([{ id: 'a', label: 'A', run: 'x' }]))).toThrow();
  });
});

describe('prototype screen actions: what the stage offers', () => {
  const state = parsePrototypeBase(base);

  it('offers the actions of each screen on stage, in pane order, with the renditions they act on', () => {
    expect(
      prototypeScreenActions(state, ['search', 'contact-phone']).map((group) => [
        group.screen.id,
        group.previewIds,
        group.actions.map((action) => action.id),
      ]),
    ).toEqual([
      ['search', ['search'], ['query']],
      ['contact', ['contact-phone'], ['sample', 'send']],
    ]);
  });

  it('offers nothing for a screen without actions or a material', () => {
    expect(prototypeScreenActions(state, ['top'])).toEqual([]);
    expect(prototypeScreenActions(state, [])).toEqual([]);
  });
});

describe('prototype screen actions: element', () => {
  const settle = async (el: DpkViewPrototype): Promise<void> => {
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));
    await el.updateComplete;
  };

  const mount = async (hash: string): Promise<DpkViewPrototype> => {
    window.location.hash = hash;
    document.body.innerHTML = `
      <dpk-view-prototype storage="memory">
        <script type="application/json">${JSON.stringify(base)}</script>
        ${contactMarkup('contact-phone')}
        ${contactMarkup('contact-desk')}
        <div slot="preview" data-preview-id="search"><input name="q" /></div>
        <div slot="preview" data-preview-id="top">Top</div>
      </dpk-view-prototype>`;
    const el = document.querySelector('dpk-view-prototype') as DpkViewPrototype;
    await el.api.ready;
    await settle(el);
    return el;
  };

  const trigger = (el: DpkViewPrototype): HTMLButtonElement | null =>
    el.shadowRoot!.querySelector('[data-role="actions"]');
  const menu = (el: DpkViewPrototype): HTMLElement | null => el.shadowRoot!.querySelector('.actions-menu');
  const items = (el: DpkViewPrototype): HTMLButtonElement[] => [
    ...(menu(el)?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []),
  ];
  const field = <T extends Element>(el: DpkViewPrototype, preview: string, selector: string): T =>
    el.querySelector<T>(`[data-preview-id="${preview}"] ${selector}`)!;

  let warn: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    window.location.hash = '';
    document.body.innerHTML = '';
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    warn.mockRestore();
  });

  it('runs an action from the stage’s menu on the rendition on screen', async () => {
    const el = await mount('#step=contact');
    expect(trigger(el)?.textContent?.trim()).toBe(m.actions);
    expect(trigger(el)?.getAttribute('aria-expanded')).toBe('false');
    expect(menu(el)).toBeNull();
    trigger(el)!.click();
    await settle(el);
    expect(trigger(el)?.getAttribute('aria-expanded')).toBe('true');
    expect(items(el).map((item) => item.dataset['action'])).toEqual(['sample', 'send']);
    expect(items(el)[0]!.textContent).toContain('A customer asking about a late parcel');
    const heard = vi.fn();
    el.querySelector('[data-preview-id="contact-desk"]')!.addEventListener('dpk-action', heard);
    items(el)[0]!.click();
    await settle(el);
    expect(field<HTMLInputElement>(el, 'contact-phone', '[name="order"]').value).toBe('SM-0127');
    expect(field<HTMLSelectElement>(el, 'contact-phone', '[name="topic"]').value).toBe('late');
    expect(field<HTMLInputElement>(el, 'contact-phone', '[name="agree"]').checked).toBe(true);
    // Only what is on screen: the other rendition is left as it was.
    expect(field<HTMLInputElement>(el, 'contact-desk', '[name="order"]').value).toBe('');
    expect(heard).not.toHaveBeenCalled();
    expect(menu(el)).toBeNull();
    // The menu goes, but the reader stays where they were.
    expect(el.shadowRoot!.activeElement).toBe(trigger(el));
    expect(warn).not.toHaveBeenCalled();
  });

  it('tells the mock which action ran, so its own script can do the rest', async () => {
    const el = await mount('#step=contact');
    const wrapper = el.querySelector('[data-preview-id="contact-phone"]')!;
    const events: CustomEvent<unknown>[] = [];
    wrapper.addEventListener('dpk-action', (event) => events.push(event as CustomEvent<unknown>));
    const clicks = vi.fn();
    field(el, 'contact-phone', '.send').addEventListener('click', clicks);
    trigger(el)!.click();
    await settle(el);
    items(el)[1]!.click();
    expect(clicks).toHaveBeenCalledTimes(1);
    expect(events.map((event): [unknown, boolean] => [event.detail, event.bubbles])).toEqual([
      [{ id: 'send', screen: 'contact' }, true],
    ]);
  });

  it('groups the actions by screen when several are side by side', async () => {
    const el = await mount('#step=compare');
    trigger(el)!.click();
    await settle(el);
    expect([...menu(el)!.querySelectorAll('.actions-group-title')].map((title) => title.textContent?.trim())).toEqual([
      'Search',
      'Contact',
    ]);
    items(el)[0]!.click();
    await settle(el);
    expect(field<HTMLInputElement>(el, 'search', '[name="q"]').value).toBe('tea');
  });

  it('closes the menu when the stage moves on to other screens', async () => {
    const el = await mount('#step=contact');
    trigger(el)!.click();
    await settle(el);
    expect(menu(el)).not.toBeNull();
    window.location.hash = '#step=compare';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    await settle(el);
    expect(menu(el)).toBeNull();
    expect(trigger(el)?.getAttribute('aria-expanded')).toBe('false');
  });

  it('offers no menu where the screen has no actions', async () => {
    const el = await mount('#step=top');
    expect(trigger(el)).toBeNull();
  });

  it('closes the menu on Escape before anything else hears it, and on a press outside it', async () => {
    const el = await mount('#step=contact');
    (el.shadowRoot!.querySelector('.stage-maximize') as HTMLButtonElement).click();
    await settle(el);
    trigger(el)!.click();
    await settle(el);
    expect(menu(el)).not.toBeNull();
    expect(el.shadowRoot!.activeElement).toBe(items(el)[0]);
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await settle(el);
    expect(menu(el)).toBeNull();
    expect(el.shadowRoot!.querySelector('.stage.is-maximized')).not.toBeNull();
    expect(el.shadowRoot!.activeElement).toBe(trigger(el));
    trigger(el)!.click();
    await settle(el);
    el.shadowRoot!.querySelector('.canvas')!.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, composed: true, button: 0 }),
    );
    await settle(el);
    expect(menu(el)).toBeNull();
  });

  it('warns the author about a selector that matches nothing on screen', async () => {
    const el = await mount('#step=compare');
    document.querySelector('[data-preview-id="search"] [name="q"]')!.remove();
    trigger(el)!.click();
    await settle(el);
    items(el)[0]!.click();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]![0])).toContain('[name="q"]');
  });

  it('offers the menu among a demo’s controls', async () => {
    const el = await mount('#view=app&screen=contact');
    (el.shadowRoot!.querySelector('.stage-demo') as HTMLButtonElement).click();
    await settle(el);
    expect(el.shadowRoot!.querySelector('.demo-controls [data-role="actions"]')).not.toBeNull();
  });
});
