// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BaseDataController, type BaseRead } from './base-data';

type Data = { readonly title: string };

const parse = (input: unknown): Data => {
  if (typeof input !== 'object' || input === null || !('title' in input) || typeof input.title !== 'string') {
    throw new Error('title is required');
  }
  return { title: input.title };
};

const empty = (): Data => ({ title: '' });

const mount = (
  markup: string,
  options: { readonly optional?: boolean } = {},
): {
  host: HTMLElement;
  script: () => Element | null;
  changes: BaseRead<Data>[];
  controller: BaseDataController<Data>;
} => {
  const host = document.createElement('div');
  const parsed = new DOMParser().parseFromString(markup, 'text/html');
  host.append(...Array.from(parsed.body.childNodes, (node) => node.cloneNode(true)));
  // The element's own rule: its first JSON child, never a board's or a questions block.
  const script = (): Element | null => host.querySelector('script[type="application/json"]');
  const changes: BaseRead<Data>[] = [];
  const controller = new BaseDataController<Data>({
    host,
    name: () => '<dpk-test>',
    script,
    parse,
    empty,
    optional: () => options.optional === true,
    onChange: (read) => changes.push(read),
  });
  document.body.append(host);
  return { host, script, changes, controller };
};

const tick = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('BaseDataController', () => {
  it('reads the block on start and reports no error', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { controller } = mount('<script type="application/json">{"title":"Checkout"}</script>');
    expect(controller.read()).toEqual({ title: 'Checkout' });
    expect(controller.error).toBeNull();
    expect(warn).not.toHaveBeenCalled();
  });

  it('reports a missing block, and accepts one that arrives later', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { host, changes, controller } = mount('');
    expect(controller.read()).toEqual({ title: '' });
    expect(controller.error).toBe('no <script type="application/json"> child found');
    controller.observe();
    host.insertAdjacentHTML('beforeend', '<script type="application/json">{"title":"Late"}</script>');
    await tick();
    expect(changes).toEqual([{ state: { title: 'Late' }, error: null }]);
    expect(controller.error).toBeNull();
  });

  it('does not report a block a page the draft added has yet to be given', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { controller } = mount('', { optional: true });
    expect(controller.read()).toEqual({ title: '' });
    expect(controller.error).toBeNull();
    expect(warn).not.toHaveBeenCalled();
  });

  it('reads an empty block filled in later, without reporting the empty one', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { host, changes, controller } = mount('<script type="application/json"></script>', { optional: true });
    expect(controller.read()).toEqual({ title: '' });
    expect(controller.error).toBeNull();
    controller.observe();
    const script = host.querySelector('script');
    if (script === null) throw new Error('no script');
    script.textContent = '{"title":"Filled"}';
    await tick();
    expect(changes).toEqual([{ state: { title: 'Filled' }, error: null }]);
    expect(warn).not.toHaveBeenCalled();
  });

  it('keeps an empty block of an ordinary element an error until it is filled', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { host, changes, controller } = mount('<script type="application/json"></script>');
    expect(controller.read()).toEqual({ title: '' });
    expect(controller.error).toBe('the <script type="application/json"> child is empty');
    controller.observe();
    const script = host.querySelector('script');
    if (script === null) throw new Error('no script');
    script.textContent = '{"title":"Fixed"}';
    await tick();
    expect(changes).toEqual([{ state: { title: 'Fixed' }, error: null }]);
    expect(controller.error).toBeNull();
  });

  it('recovers from invalid JSON once valid data replaces it', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { host, changes, controller } = mount('<script type="application/json">{"title":1}</script>');
    expect(controller.read()).toEqual({ title: '' });
    expect(controller.error).toBe('title is required');
    controller.observe();
    const script = host.querySelector('script');
    if (script === null) throw new Error('no script');
    script.textContent = '{"title":"Recovered"}';
    await tick();
    expect(changes).toEqual([{ state: { title: 'Recovered' }, error: null }]);
    expect(controller.error).toBeNull();
  });

  it('ignores mutations that leave the block as it was', async () => {
    const { host, changes, controller } = mount('<script type="application/json">{"title":"Same"}</script>');
    controller.read();
    controller.observe();
    host.append(document.createElement('span'));
    await tick();
    expect(changes).toEqual([]);
  });
});
