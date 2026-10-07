import { render } from 'lit';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PublishedVersions } from '../version-switch';

import { FRAMEWORK_VERSION } from '../version';
import { VersionChoiceController } from './version-choice-controller';

const setup = (fetchVersions: () => Promise<PublishedVersions>) => {
  const switchTo = vi.fn();
  const container = document.createElement('div');
  const draw = (): HTMLSelectElement => {
    render(controller.render('en'), container);
    const select = container.querySelector('select');
    if (select === null) throw new Error('no select');
    return select;
  };
  const host = { addController: vi.fn(), removeController: vi.fn(), requestUpdate: vi.fn(draw) } as const;
  const controller: VersionChoiceController = new VersionChoiceController(
    { ...host, updateComplete: Promise.resolve(true) },
    { fetchVersions, switchTo },
  );
  return { controller, draw, switchTo };
};

const values = (select: HTMLSelectElement) => [...select.options].map((option) => option.value);
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('VersionChoiceController', () => {
  afterEach(() => history.replaceState(null, '', '/'));

  it('shows the running version without fetching anything', () => {
    const fetchVersions = vi.fn(async () => ({ latest: null, versions: [] }));
    const select = setup(fetchVersions).draw();
    expect(values(select)).toEqual([FRAMEWORK_VERSION]);
    expect(select.value).toBe(FRAMEWORK_VERSION);
    expect(fetchVersions).not.toHaveBeenCalled();
  });

  it('lists the published versions once the reader reaches for the select', async () => {
    const fetchVersions = vi.fn(async () => ({ latest: '9.0.0', versions: ['9.0.0', FRAMEWORK_VERSION] }));
    const { draw } = setup(fetchVersions);
    draw().dispatchEvent(new Event('focus'));
    draw().dispatchEvent(new Event('pointerenter'));
    await settle();
    const select = draw();
    expect(fetchVersions).toHaveBeenCalledOnce();
    expect(values(select)).toEqual(['9.0.0', FRAMEWORK_VERSION]);
    expect(select.options[0]?.textContent).toBe('9.0.0 (latest)');
    expect(select.value).toBe(FRAMEWORK_VERSION);
  });

  it('keeps the running version when the listing cannot be fetched, and tries again later', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fetchVersions = vi.fn(async (): Promise<PublishedVersions> => {
      throw new Error('offline');
    });
    const { draw, controller } = setup(fetchVersions);
    controller.load();
    await settle();
    expect(values(draw())).toEqual([FRAMEWORK_VERSION]);
    controller.load();
    expect(fetchVersions).toHaveBeenCalledTimes(2);
  });

  it('switches to the version picked, or back to the pinned one', () => {
    history.replaceState(null, '', '/?dpk-version=0.0.1');
    const { draw, switchTo } = setup(async () => ({ latest: null, versions: [] }));
    const select = draw();
    expect(values(select)).toEqual(['', FRAMEWORK_VERSION]);
    select.value = '';
    select.dispatchEvent(new Event('change'));
    expect(switchTo).toHaveBeenLastCalledWith(null);
    select.append(Object.assign(document.createElement('option'), { value: '0.0.1', textContent: '0.0.1' }));
    select.value = '0.0.1';
    select.dispatchEvent(new Event('change'));
    expect(switchTo).toHaveBeenLastCalledWith('0.0.1');
  });
});
