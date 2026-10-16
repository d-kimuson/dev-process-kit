import { afterEach, describe, expect, it, vi } from 'vitest';

import { closePopover, openPopover } from '../../lib/dom/popover';
import { ReviewPopoverController } from './review-popover-controller';

vi.mock('../../lib/dom/popover', () => ({ openPopover: vi.fn(() => vi.fn()), closePopover: vi.fn() }));

const setup = (initiallyOpen: boolean) => {
  const host = {
    addController: vi.fn(),
    removeController: vi.fn(),
    requestUpdate: vi.fn(),
    updateComplete: Promise.resolve(true),
  };
  const surface = document.createElement('div');
  const anchor = document.createElement('div');
  document.body.append(surface, anchor);
  const state = { open: initiallyOpen };
  const close = vi.fn(() => {
    state.open = false;
  });
  const controller = new ReviewPopoverController(host, {
    surface: () => surface,
    anchor: () => anchor,
    open: () => state.open,
    close,
  });
  return { host, surface, anchor, state, close, controller };
};

const escape = (init: { cancelable?: boolean } = {}) =>
  new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: init.cancelable ?? true });

afterEach(() => {
  document.body.replaceChildren();
  vi.mocked(openPopover).mockClear();
  vi.mocked(closePopover).mockClear();
});

describe('review popover', () => {
  it('floats the review below its toggles once it opens, and only once while it stays open', () => {
    const { controller, surface, anchor, state } = setup(false);
    controller.hostConnected();
    controller.hostUpdated();
    expect(openPopover).not.toHaveBeenCalled();

    state.open = true;
    controller.hostUpdated();
    controller.hostUpdated();
    expect(openPopover).toHaveBeenCalledOnce();
    expect(vi.mocked(openPopover).mock.calls[0]?.slice(0, 2)).toEqual([surface, anchor]);
    expect(vi.mocked(openPopover).mock.calls[0]?.[3]).toMatchObject({ placement: 'bottom-end' });
  });

  it('takes the height from below its anchor to the bottom of the screen, so it never has to flip aside', () => {
    const { controller, anchor } = setup(true);
    anchor.getBoundingClientRect = () => new DOMRect(0, 12, 120, 36);
    controller.hostConnected();
    controller.hostUpdated();
    expect(vi.mocked(openPopover).mock.calls[0]?.[2]).toEqual({ width: 440, height: window.innerHeight - 48 - 16 });
  });

  it('hides the surface and stops following the anchor when it closes', () => {
    const { controller, surface, state } = setup(true);
    controller.hostConnected();
    controller.hostUpdated();
    const stop = vi.mocked(openPopover).mock.results[0]?.value;

    state.open = false;
    controller.hostUpdated();
    expect(stop).toHaveBeenCalledOnce();
    expect(closePopover).toHaveBeenCalledWith(surface);

    state.open = true;
    controller.hostUpdated();
    expect(openPopover).toHaveBeenCalledTimes(2);
  });

  it('closes on Escape unless something inside already used the key', () => {
    const { controller, close } = setup(true);
    controller.hostConnected();
    controller.hostUpdated();

    const used = escape();
    used.preventDefault();
    window.dispatchEvent(used);
    expect(close).not.toHaveBeenCalled();

    window.dispatchEvent(escape());
    expect(close).toHaveBeenCalledOnce();

    window.dispatchEvent(escape());
    expect(close).toHaveBeenCalledOnce();
  });

  it('lets go of the surface and the key when the host leaves the page', () => {
    const { controller, close } = setup(true);
    controller.hostConnected();
    controller.hostUpdated();
    const stop = vi.mocked(openPopover).mock.results[0]?.value;

    controller.hostDisconnected();
    expect(stop).toHaveBeenCalledOnce();
    window.dispatchEvent(escape());
    expect(close).not.toHaveBeenCalled();
  });
});
