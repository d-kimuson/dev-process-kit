import { render } from 'lit';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PublishedVersions } from '../version-switch';

import { FRAMEWORK_VERSION } from '../version';
import { VersionChoiceController } from './version-choice-controller';

const setup = (fetchVersions: () => Promise<PublishedVersions>) => {
  const switchTo = vi.fn();
  const container = document.createElement('div');
  const draw = (): HTMLElement => {
    render(controller.render('en'), container);
    return container;
  };
  const host = {
    addController: vi.fn(),
    removeController: vi.fn(),
    requestUpdate: vi.fn(draw),
    updateComplete: Promise.resolve(true),
    renderRoot: container,
  };
  const controller: VersionChoiceController = new VersionChoiceController(host as never, { fetchVersions, switchTo });
  return { controller, draw, switchTo };
};

const triggerOf = (container: HTMLElement): HTMLButtonElement => {
  const trigger = container.querySelector<HTMLButtonElement>('.dpk-version-select');
  if (trigger === null) throw new Error('no trigger');
  return trigger;
};

const labelOf = (container: HTMLElement): string =>
  triggerOf(container).querySelector('.dpk-rich-select-label')?.textContent ?? '';

const optionValues = (container: HTMLElement): string[] =>
  [...container.querySelectorAll('[role="option"]')].map((option) => option.getAttribute('data-value') ?? '');

const optionLabel = (container: HTMLElement, value: string): string | null =>
  container.querySelector(`[role="option"][data-value="${value}"] .dpk-rich-select-option-label`)?.textContent ?? null;

const open = (container: HTMLElement): void => {
  triggerOf(container).click();
};

const pick = (container: HTMLElement, value: string): void => {
  const option = container.querySelector<HTMLElement>(`[role="option"][data-value="${value}"]`);
  if (option === null) throw new Error(`no option ${value}`);
  option.click();
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('VersionChoiceController', () => {
  afterEach(() => history.replaceState(null, '', '/'));

  it('shows the running version without fetching anything', () => {
    const fetchVersions = vi.fn(async () => ({ latest: null, versions: [] }));
    const container = setup(fetchVersions).draw();
    expect(labelOf(container)).toBe(FRAMEWORK_VERSION);
    expect(fetchVersions).not.toHaveBeenCalled();
  });

  it('lists the published versions once the reader reaches for the select', async () => {
    const fetchVersions = vi.fn(async () => ({ latest: '9.0.0', versions: ['9.0.0', FRAMEWORK_VERSION] }));
    const { draw } = setup(fetchVersions);
    const container = draw();
    triggerOf(container).dispatchEvent(new Event('focus'));
    triggerOf(container).dispatchEvent(new Event('pointerenter'));
    await settle();
    expect(fetchVersions).toHaveBeenCalledOnce();
    open(container);
    expect(optionValues(container)).toEqual(['9.0.0', FRAMEWORK_VERSION]);
    expect(optionLabel(container, '9.0.0')).toBe('9.0.0 (latest)');
    expect(labelOf(container)).toBe(FRAMEWORK_VERSION);
  });

  it('keeps the running version when the listing cannot be fetched, and tries again later', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fetchVersions = vi.fn(async (): Promise<PublishedVersions> => {
      throw new Error('offline');
    });
    const { draw, controller } = setup(fetchVersions);
    const container = draw();
    controller.load();
    await settle();
    open(container);
    expect(optionValues(container)).toEqual([FRAMEWORK_VERSION]);
    controller.load();
    expect(fetchVersions).toHaveBeenCalledTimes(2);
  });

  it('switches to the version picked, or back to the pinned one', async () => {
    history.replaceState(null, '', '/?dpk-version=0.0.1');
    const fetchVersions = vi.fn(async () => ({ latest: null, versions: ['0.0.1', FRAMEWORK_VERSION] }));
    const { draw, switchTo } = setup(fetchVersions);
    const container = draw();
    open(container);
    expect(optionValues(container)).toEqual(['', FRAMEWORK_VERSION]);
    pick(container, '');
    expect(switchTo).toHaveBeenLastCalledWith(null);

    triggerOf(container).dispatchEvent(new Event('focus'));
    await settle();
    open(container);
    expect(optionValues(container)).toEqual(['', '0.0.1', FRAMEWORK_VERSION]);
    pick(container, '0.0.1');
    expect(switchTo).toHaveBeenLastCalledWith('0.0.1');
  });
});
