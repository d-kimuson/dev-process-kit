// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FRAME_HEIGHT_PROPERTY, FrameBridge, type FrameBridgeHost } from './frame-bridge';

const host = (): { [K in keyof FrameBridgeHost]: ReturnType<typeof vi.fn> } & FrameBridgeHost => {
  const calls = { changed: vi.fn(), click: vi.fn(), keydown: vi.fn(), loaded: vi.fn() };
  return calls as never;
};

/** A frame whose page has loaded `markup`. */
const loadedFrame = (markup: string): { frame: HTMLIFrameElement; doc: Document } => {
  const frame = document.createElement('iframe');
  document.body.append(frame);
  const doc = frame.contentDocument!;
  doc.body.innerHTML = markup;
  return { frame, doc };
};

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('FrameBridge', () => {
  it('listens to each page a frame loads, and to no other element', () => {
    const calls = host();
    const bridge = new FrameBridge(calls);
    const { frame, doc } = loadedFrame('<button data-dpk-navigate="screen=cart">Cart</button>');
    bridge.sync([frame, document.createElement('div')]);
    // A frame not loaded yet (still `about:blank`) is listened to once its page is in.
    expect(calls.loaded).not.toHaveBeenCalled();
    frame.dispatchEvent(new Event('load'));
    expect(calls.loaded).toHaveBeenCalledWith(frame, doc);

    // The page's own handlers hear the click first, as a preview's own markup does.
    const own = vi.fn(() => expect(calls.click).not.toHaveBeenCalled());
    doc.querySelector('button')!.addEventListener('click', own);
    doc.querySelector('button')!.click();
    expect(own).toHaveBeenCalledOnce();
    expect(calls.click).toHaveBeenCalledWith(expect.objectContaining({ type: 'click' }), frame);
    doc.dispatchEvent(new doc.defaultView!.KeyboardEvent('keydown', { key: 'Escape' }));
    expect(calls.keydown).toHaveBeenCalledOnce();
    calls.changed.mockClear();
    doc.body.dispatchEvent(new Event('scroll'));
    expect(calls.changed).toHaveBeenCalled();
  });

  it('gives the frame the height of its page', () => {
    const calls = host();
    const { frame, doc } = loadedFrame('<main>Tall</main>');
    vi.spyOn(doc.documentElement, 'getBoundingClientRect').mockReturnValue({ height: 812.4 } as DOMRect);
    new FrameBridge(calls).sync([frame]);
    frame.dispatchEvent(new Event('load'));
    expect(frame.style.getPropertyValue(FRAME_HEIGHT_PROPERTY)).toBe('813px');
  });

  it('stops listening to a frame that is gone', () => {
    const calls = host();
    const bridge = new FrameBridge(calls);
    const { frame, doc } = loadedFrame('<button>Pay</button>');
    bridge.sync([frame]);
    frame.dispatchEvent(new Event('load'));
    bridge.sync([]);
    doc.querySelector('button')!.click();
    frame.dispatchEvent(new Event('load'));
    expect(calls.click).not.toHaveBeenCalled();
    expect(calls.loaded).toHaveBeenCalledOnce();
  });
});
