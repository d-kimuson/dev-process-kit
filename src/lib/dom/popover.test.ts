import { autoUpdate, computePosition, flip } from '@floating-ui/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { openPopover, pointAnchor } from './popover';

vi.mock('@floating-ui/dom', () => ({
  computePosition: vi.fn().mockResolvedValue({ x: 200, y: 128 }),
  autoUpdate: vi.fn((_reference, _floating, update: () => void) => {
    update();
    return vi.fn();
  }),
  offset: vi.fn(),
  flip: vi.fn(),
  shift: vi.fn(),
  size: vi.fn(),
}));
beforeEach(() => {
  vi.mocked(computePosition).mockResolvedValue({
    x: 200,
    y: 128,
    strategy: 'fixed',
    placement: 'bottom-end',
    middlewareData: {},
  });
});
afterEach(() => {
  document.body.replaceChildren();
  vi.clearAllMocks();
});

describe('popover adapter', () => {
  it('can sit beside a diagram element and track its pan/zoom transform', async () => {
    const anchor = document.createElement('button');
    const popover = document.createElement('div');
    popover.showPopover = vi.fn();
    document.body.append(anchor, popover);
    const stop = openPopover(
      popover,
      anchor,
      { width: 300, height: 280 },
      { placement: 'right-start', trackTransform: true },
    );
    await Promise.resolve();
    expect(computePosition).toHaveBeenCalledWith(
      anchor,
      popover,
      expect.objectContaining({ placement: 'right-start', strategy: 'fixed' }),
    );
    expect(autoUpdate).toHaveBeenCalledWith(
      anchor,
      popover,
      expect.any(Function),
      expect.objectContaining({ animationFrame: true }),
    );
    expect(flip).toHaveBeenCalledWith({ padding: 8, fallbackAxisSideDirection: 'end' });
    stop();
  });
  it('uses viewport coordinates even when the document is scrolled', async () => {
    const popover = document.createElement('div');
    popover.showPopover = vi.fn();
    document.body.append(popover);
    const stop = openPopover(popover, pointAnchor(500, 120), { width: 300, height: 200 });
    await Promise.resolve();
    expect(computePosition).toHaveBeenCalledWith(
      expect.anything(),
      popover,
      expect.objectContaining({ strategy: 'fixed' }),
    );
    expect(popover.style.top).toBe('128px');
    expect(popover.style.left).toBe('200px');
    expect(autoUpdate).toHaveBeenCalledTimes(1);
    stop();
  });
  it('does not apply late positioning after cleanup', async () => {
    const popover = document.createElement('div');
    popover.showPopover = vi.fn();
    document.body.append(popover);
    const stop = openPopover(popover, pointAnchor(100, 100), { width: 300, height: 200 });
    stop();
    await Promise.resolve();
    expect(popover.style.top).toBe('');
  });
});
