// @vitest-environment jsdom
import type { ReactiveController } from 'lit';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HeaderHeightController } from './header-height-controller';

/** A ResizeObserver the test drives by hand: jsdom/happy-dom has none that reacts to real layout. */
class FakeResizeObserver {
  static last: FakeResizeObserver | undefined;
  readonly observed = new Set<Element>();
  readonly #callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.#callback = callback;
    FakeResizeObserver.last = this;
  }
  observe(target: Element): void {
    this.observed.add(target);
  }
  unobserve(target: Element): void {
    this.observed.delete(target);
  }
  disconnect(): void {
    this.observed.clear();
  }
  trigger(target: Element): void {
    this.#callback([{ target } as unknown as ResizeObserverEntry], this as unknown as ResizeObserver);
  }
}

/** A header element reporting a fixed rendered height, since jsdom lays nothing out for real. */
const headerOf = (height: number): HTMLElement => {
  const el = document.createElement('div');
  el.getBoundingClientRect = () =>
    ({ height, width: 0, top: 0, left: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
  return el;
};

describe('HeaderHeightController', () => {
  let host: HTMLElement & { addController: (controller: ReactiveController) => void };

  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    const element = document.createElement('div');
    document.body.append(element);
    host = Object.assign(element, { addController: (_controller: ReactiveController) => {} });
  });

  afterEach(() => {
    host.remove();
    vi.unstubAllGlobals();
  });

  it('removes the custom property while no header is given (a board, nested under its page)', () => {
    const controller = new HeaderHeightController(host as never, () => null);
    controller.hostConnected();
    controller.hostUpdated();
    expect(host.style.getPropertyValue('--dpk-header-height')).toBe('');
  });

  it('publishes the header element rendered height on the host', () => {
    const header = headerOf(48);
    const controller = new HeaderHeightController(host as never, () => header);
    controller.hostConnected();
    controller.hostUpdated();
    expect(host.style.getPropertyValue('--dpk-header-height')).toBe('48px');
  });

  it('observes the given header and re-syncs when it resizes, e.g. a narrow-width wrap', () => {
    const header = headerOf(48);
    const controller = new HeaderHeightController(host as never, () => header);
    controller.hostConnected();
    controller.hostUpdated();
    expect(FakeResizeObserver.last?.observed.has(header)).toBe(true);

    header.getBoundingClientRect = () =>
      ({ height: 84, width: 0, top: 0, left: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
    FakeResizeObserver.last?.trigger(header);
    expect(host.style.getPropertyValue('--dpk-header-height')).toBe('84px');
  });

  it('moves the observation when the header element the board renders changes', () => {
    const first = headerOf(48);
    const second = headerOf(60);
    let current: HTMLElement | null = first;
    const controller = new HeaderHeightController(host as never, () => current);
    controller.hostConnected();
    controller.hostUpdated();
    const observer = FakeResizeObserver.last;

    current = second;
    controller.hostUpdated();
    expect(observer?.observed.has(first)).toBe(false);
    expect(observer?.observed.has(second)).toBe(true);
    expect(host.style.getPropertyValue('--dpk-header-height')).toBe('60px');
  });

  it('clears the custom property once the header goes away, e.g. this instance becomes a board', () => {
    const header = headerOf(48);
    let current: HTMLElement | null = header;
    const controller = new HeaderHeightController(host as never, () => current);
    controller.hostConnected();
    controller.hostUpdated();

    current = null;
    controller.hostUpdated();
    expect(host.style.getPropertyValue('--dpk-header-height')).toBe('');
  });

  it('disconnects the observer on hostDisconnected', () => {
    const header = headerOf(48);
    const controller = new HeaderHeightController(host as never, () => header);
    controller.hostConnected();
    controller.hostUpdated();
    const observer = FakeResizeObserver.last;
    controller.hostDisconnected();
    expect(observer?.observed.size).toBe(0);
  });
});
