// @vitest-environment jsdom
import type { ReactiveController } from 'lit';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PinHeightsController } from './pin-heights';

/** A ResizeObserver the test drives by hand: jsdom has none. */
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
  resize(target: Element, blockSize: number): void {
    const entry = { target, borderBoxSize: [{ blockSize, inlineSize: 92 }] } as unknown as ResizeObserverEntry;
    this.#callback([entry], this as unknown as ResizeObserver);
  }
}

const pin = (id: string): HTMLElement => {
  const element = document.createElement('div');
  element.setAttribute('data-pin', id);
  return element;
};

describe('PinHeightsController', () => {
  let root: HTMLElement;
  let controller: PinHeightsController;
  const requestUpdate = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    requestUpdate.mockClear();
    root = document.createElement('div');
    document.body.append(root);
    const host = {
      renderRoot: root,
      requestUpdate,
      addController: (_: ReactiveController) => {},
    };
    controller = new PinHeightsController(host as never);
    controller.hostConnected();
  });

  afterEach(() => {
    root.remove();
    vi.unstubAllGlobals();
  });

  it('reports the rendered height of a pin and asks the host to lay out again', () => {
    const card = pin('h1');
    root.append(card);
    controller.hostUpdated();

    FakeResizeObserver.last?.resize(card, 88);

    expect(controller.heights.get('h1')).toBe(88);
    expect(requestUpdate).toHaveBeenCalledTimes(1);
  });

  it('does not re-render when a pin reports the height it already had', () => {
    const card = pin('h1');
    root.append(card);
    controller.hostUpdated();
    FakeResizeObserver.last?.resize(card, 88);

    FakeResizeObserver.last?.resize(card, 88);

    expect(requestUpdate).toHaveBeenCalledTimes(1);
  });

  it('forgets a pin once the board no longer renders it', () => {
    const card = pin('h1');
    root.append(card);
    controller.hostUpdated();
    FakeResizeObserver.last?.resize(card, 88);

    card.remove();
    controller.hostUpdated();

    expect(controller.heights.has('h1')).toBe(false);
    expect(FakeResizeObserver.last?.observed.has(card)).toBe(false);
  });
});
