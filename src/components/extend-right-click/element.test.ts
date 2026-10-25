import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ContextMenuGroup, ContextMenuEntry, ContextMenuRequest } from '../../core/context-menu/types';
import type { ExtendRightClickConfig } from './model';

import { DpkExtendRightClick, type ExtendRightClickRunDetail } from './element';
import { defineExtendRightClick } from './index';

defineExtendRightClick();

const CARD_MARKUP = `<div class="dpk-card" data-id="card-1"><span class="dpk-title">First card</span></div>`;

const CARD_CONFIG: ExtendRightClickConfig = {
  targets: [
    {
      selector: '.dpk-title',
      label: 'title',
      groups: [
        {
          id: 'title',
          entries: [{ kind: 'item', id: 'copy-title', label: 'Copy title', copy: 'text' }],
        },
      ],
    },
    {
      selector: '.dpk-card',
      label: 'card',
      groups: [
        {
          id: 'card',
          heading: 'Card',
          entries: [
            { kind: 'item', id: 'copy-id', label: 'Copy id', copy: 'data-id' },
            { kind: 'item', id: 'open', label: 'Open', event: 'card:open' },
            {
              kind: 'item',
              id: 'delete',
              label: 'Delete',
              danger: true,
              event: 'card:delete',
              detail: { reason: 'menu' },
            },
            {
              kind: 'submenu',
              id: 'links',
              label: 'Links',
              entries: [{ kind: 'item', id: 'links-doc', label: 'Docs', event: 'card:open-doc' }],
            },
          ],
        },
      ],
    },
  ],
};

const mount = async (config: unknown = CARD_CONFIG, markup = CARD_MARKUP): Promise<DpkExtendRightClick> => {
  const wrapper = document.createElement('dpk-extend-right-click');
  if (!(wrapper instanceof DpkExtendRightClick)) throw new Error('dpk-extend-right-click did not upgrade');
  wrapper.innerHTML = `${markup}<script type="application/json">${JSON.stringify(config)}</script>`;
  document.body.append(wrapper);
  await wrapper.updateComplete;
  return wrapper;
};

const request = (origin: Element | null): ContextMenuRequest => ({ clientX: 0, clientY: 0, target: null, origin });

const entriesOf = (groups: readonly ContextMenuGroup[] | null): readonly ContextMenuEntry[] =>
  (groups ?? []).flatMap((group) => group.entries);

const itemOf = (groups: readonly ContextMenuGroup[] | null, id: string): ContextMenuEntry | undefined =>
  entriesOf(groups).find((entry) => entry.id === id);

const cardOf = (wrapper: DpkExtendRightClick): Element => {
  const card = wrapper.querySelector('.dpk-card');
  if (card === null) throw new Error('fixture card missing');
  return card;
};

afterEach(() => {
  document.body.replaceChildren();
});

describe('dpk-extend-right-click matching', () => {
  it('contributes nothing without an origin on the request', async () => {
    const wrapper = await mount();
    expect(wrapper.getContextMenuItems({ clientX: 0, clientY: 0, target: null })).toBeNull();
    expect(wrapper.getContextMenuItems(request(null))).toBeNull();
  });

  it('contributes nothing when the click is outside the wrapper', async () => {
    const wrapper = await mount();
    const outside = document.createElement('div');
    document.body.append(outside);
    expect(wrapper.getContextMenuItems(request(outside))).toBeNull();
  });

  it('uses the nearest element that matches any target selector', async () => {
    const wrapper = await mount();
    const card = cardOf(wrapper);
    const title = wrapper.querySelector('.dpk-title');
    if (title === null) throw new Error('fixture title missing');

    expect(wrapper.getContextMenuItems(request(title))?.map((group) => group.id)).toEqual(['title']);
    expect(wrapper.getContextMenuItems(request(card))?.map((group) => group.id)).toEqual(['card']);
  });

  it('contributes nothing when no target selector matches', async () => {
    const wrapper = await mount(CARD_CONFIG, '<section class="unrelated"><b>text</b></section>');
    expect(wrapper.getContextMenuItems(request(wrapper.querySelector('b') ?? wrapper))).toBeNull();
  });

  it('warns and skips an invalid selector instead of throwing', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const wrapper = await mount({
      targets: [
        { selector: '[unclosed', groups: [{ id: 'broken', entries: [{ kind: 'item', id: 'b', label: 'B' }] }] },
        { selector: '.dpk-card', groups: [{ id: 'card', entries: [{ kind: 'item', id: 'c', label: 'C' }] }] },
      ],
    });
    expect(wrapper.getContextMenuItems(request(cardOf(wrapper)))?.map((group) => group.id)).toEqual(['card']);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('invalid target selector'));
  });

  it('contributes nothing when every selector is invalid', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const wrapper = await mount({
      targets: [{ selector: '..', groups: [{ id: 'g', entries: [{ kind: 'item', id: 'i', label: 'I' }] }] }],
    });
    expect(wrapper.getContextMenuItems(request(cardOf(wrapper)))).toBeNull();
  });

  it('lets only the nearest wrapper handle the click', async () => {
    const outer = document.createElement('dpk-extend-right-click');
    if (!(outer instanceof DpkExtendRightClick)) throw new Error('dpk-extend-right-click did not upgrade');
    outer.innerHTML = `<script type="application/json">${JSON.stringify(CARD_CONFIG)}</script>
      <dpk-extend-right-click><div class="dpk-card" data-id="card-1"><span class="dpk-title">First card</span></div></dpk-extend-right-click>`;
    document.body.append(outer);
    await outer.updateComplete;
    const inner = outer.querySelector('dpk-extend-right-click');
    if (!(inner instanceof DpkExtendRightClick)) throw new Error('inner wrapper did not upgrade');

    // The inner wrapper has no config of its own, and the outer one stays silent regardless.
    expect(inner.getContextMenuItems(request(cardOf(outer)))).toBeNull();
    expect(outer.getContextMenuItems(request(cardOf(outer)))).toBeNull();
  });

  it('maps groups, headings, submenus, danger and the default run event', async () => {
    const wrapper = await mount();
    const groups = wrapper.getContextMenuItems(request(cardOf(wrapper)));
    expect(groups?.map((group) => group.id)).toEqual(['card']);
    expect(groups?.[0]?.heading).toBe('Card');
    expect(entriesOf(groups).map((entry) => entry.id)).toEqual(['copy-id', 'open', 'delete', 'links']);
    expect(itemOf(groups, 'delete')).toMatchObject({ kind: 'item', danger: true });
    const links = itemOf(groups, 'links');
    expect(links).toMatchObject({ kind: 'submenu', label: 'Links' });
    expect(links?.kind === 'submenu' ? links.items.map((item) => item.id) : null).toEqual(['links-doc']);
  });

  it('leaves a group out when it has nothing it can offer', async () => {
    const wrapper = await mount({
      targets: [
        {
          selector: '.dpk-card',
          groups: [{ id: 'empty', entries: [{ kind: 'item', id: 'missing', label: 'Missing', copy: 'data-nope' }] }],
        },
      ],
    });
    expect(wrapper.getContextMenuItems(request(cardOf(wrapper)))).toBeNull();
  });
});

describe('dpk-extend-right-click running an entry', () => {
  it('dispatches the named event on the wrapper with the exact detail', async () => {
    const wrapper = await mount();
    const card = cardOf(wrapper);
    const seen: CustomEvent<ExtendRightClickRunDetail>[] = [];
    wrapper.addEventListener('card:open', (event) => {
      seen.push(event as CustomEvent<ExtendRightClickRunDetail>);
    });

    const open = itemOf(wrapper.getContextMenuItems(request(card)), 'open');
    if (open?.kind !== 'item') throw new Error('open item missing');
    open.run();

    expect(seen).toHaveLength(1);
    const event = seen[0];
    expect(event?.bubbles).toBe(true);
    expect(event?.composed).toBe(true);
    expect(event?.detail).toEqual({
      id: 'open',
      group: 'card',
      item: 'open',
      target: { selector: '.dpk-card', label: 'card' },
      element: card,
      authored: {},
    });
    expect(event?.detail.element).toBe(card);
  });

  it("carries the item's own detail object as `authored`", async () => {
    const wrapper = await mount();
    const seen: CustomEvent<ExtendRightClickRunDetail>[] = [];
    wrapper.addEventListener('card:delete', (event) => {
      seen.push(event as CustomEvent<ExtendRightClickRunDetail>);
    });

    const remove = itemOf(wrapper.getContextMenuItems(request(cardOf(wrapper))), 'delete');
    if (remove?.kind !== 'item') throw new Error('delete item missing');
    remove.run();

    expect(seen[0]?.detail.authored).toEqual({ reason: 'menu' });
  });

  it('dispatches the default run event for an item naming none', async () => {
    const wrapper = await mount({
      targets: [
        {
          selector: '.dpk-card',
          groups: [{ id: 'g', entries: [{ kind: 'item', id: 'plain', label: 'Plain', detail: { a: 1 } }] }],
        },
      ],
    });
    const seen: CustomEvent<ExtendRightClickRunDetail>[] = [];
    wrapper.addEventListener('dpk-extend-right-click-run', (event) => {
      seen.push(event as CustomEvent<ExtendRightClickRunDetail>);
    });

    const plain = itemOf(wrapper.getContextMenuItems(request(cardOf(wrapper))), 'plain');
    if (plain?.kind !== 'item') throw new Error('plain item missing');
    plain.run();

    expect(seen[0]?.detail).toMatchObject({ id: 'plain', authored: { a: 1 } });
  });

  it('copies through the clipboard, and only offers an item whose source has a value', async () => {
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    const wrapper = await mount({
      targets: [
        {
          selector: '.dpk-card',
          groups: [
            {
              id: 'copy',
              entries: [
                { kind: 'item', id: 'missing', label: 'Missing', copy: 'data-missing' },
                { kind: 'item', id: 'copy-id', label: 'Copy id', copy: 'data-id' },
                { kind: 'item', id: 'copy-text', label: 'Copy text', copy: 'text' },
              ],
            },
          ],
        },
      ],
    });
    const groups = wrapper.getContextMenuItems(request(cardOf(wrapper)));
    expect(entriesOf(groups).map((entry) => entry.id)).toEqual(['copy-id', 'copy-text']);

    const copyId = itemOf(groups, 'copy-id');
    if (copyId?.kind !== 'item') throw new Error('copy item missing');
    copyId.run();
    expect(writeText).toHaveBeenCalledWith('card-1');

    const copyText = itemOf(groups, 'copy-text');
    if (copyText?.kind !== 'item') throw new Error('copy-text item missing');
    copyText.run();
    expect(writeText).toHaveBeenLastCalledWith('First card');
  });
});

describe('dpk-extend-right-click data sources', () => {
  it('lets the config property win over the JSON child', async () => {
    const wrapper = await mount();
    wrapper.config = {
      targets: [
        { selector: '.dpk-card', groups: [{ id: 'from-property', entries: [{ kind: 'item', id: 'p', label: 'P' }] }] },
      ],
    };
    expect(wrapper.getContextMenuItems(request(cardOf(wrapper)))?.map((group) => group.id)).toEqual(['from-property']);
  });

  it('checks the config property too: it warns once per value and contributes nothing when malformed', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const wrapper = await mount();
    wrapper.config = { targets: [{ selector: '.dpk-card' }] } as unknown as ExtendRightClickConfig;
    expect(wrapper.getContextMenuItems(request(cardOf(wrapper)))).toBeNull();
    expect(wrapper.getContextMenuItems(request(cardOf(wrapper)))).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('config ignored'));
  });

  it('contributes no menu, and warns, when the JSON child is invalid', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const wrapper = await mount({ targets: 'not a list' });
    expect(wrapper.error).not.toBeNull();
    expect(wrapper.getContextMenuItems(request(cardOf(wrapper)))).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('[dev-process-kit] dpk-extend-right-click:'));
  });

  it('does not crash with no JSON child and no config', async () => {
    const wrapper = document.createElement('dpk-extend-right-click');
    if (!(wrapper instanceof DpkExtendRightClick)) throw new Error('dpk-extend-right-click did not upgrade');
    wrapper.innerHTML = CARD_MARKUP;
    document.body.append(wrapper);
    await wrapper.updateComplete;
    expect(wrapper.error).toBeNull();
    expect(wrapper.getContextMenuItems(request(cardOf(wrapper)))).toBeNull();
  });

  it('accepts an empty target list', async () => {
    const wrapper = await mount({ targets: [] });
    expect(wrapper.error).toBeNull();
    expect(wrapper.getContextMenuItems(request(cardOf(wrapper)))).toBeNull();
  });

  it('reads a JSON child appended after connect', async () => {
    const wrapper = document.createElement('dpk-extend-right-click');
    if (!(wrapper instanceof DpkExtendRightClick)) throw new Error('dpk-extend-right-click did not upgrade');
    wrapper.innerHTML = CARD_MARKUP;
    document.body.append(wrapper);
    await wrapper.updateComplete;
    expect(wrapper.getContextMenuItems(request(cardOf(wrapper)))).toBeNull();

    const script = document.createElement('script');
    script.type = 'application/json';
    script.textContent = JSON.stringify(CARD_CONFIG);
    wrapper.append(script);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(wrapper.getContextMenuItems(request(cardOf(wrapper)))?.map((group) => group.id)).toEqual(['card']);
  });
});
