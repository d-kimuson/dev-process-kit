import { describe, expect, it, vi } from 'vitest';

import { openPopover } from '../lib/dom/popover';
import { PopoverController } from './popover-controller';

vi.mock('../lib/dom/popover', () => ({ openPopover: vi.fn(() => vi.fn()) }));

describe('popover resource lifetime', () => {
  it('cleans up replaced, removed and disconnected surfaces', () => {
    const host = {
      addController: vi.fn(),
      removeController: vi.fn(),
      requestUpdate: vi.fn(),
      updateComplete: Promise.resolve(true),
    };
    const controller = new PopoverController(host);
    expect(host.addController).toHaveBeenCalledWith(controller);
    const surface = document.createElement('div');
    document.body.append(surface);
    const anchor = { top: 1, bottom: 2, right: 3 };
    const size = { width: 300, height: 200 };
    controller.open(surface, anchor, size);
    const first = vi.mocked(openPopover).mock.results[0]?.value;
    controller.open(surface, anchor, size);
    expect(first).toHaveBeenCalledOnce();
    const second = vi.mocked(openPopover).mock.results[1]?.value;
    surface.remove();
    controller.hostUpdated();
    expect(second).toHaveBeenCalledOnce();
    document.body.append(surface);
    controller.open(surface, anchor, size);
    const third = vi.mocked(openPopover).mock.results[2]?.value;
    controller.hostDisconnected();
    expect(third).toHaveBeenCalledOnce();
    controller.hostConnected();
    expect(host.requestUpdate).toHaveBeenCalledOnce();
    surface.remove();
  });
});
