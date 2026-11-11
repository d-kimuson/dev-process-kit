// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  boxInDocument,
  containsDeep,
  descendAt,
  findAcrossFrames,
  frameAddress,
  frameDocument,
  hostFrame,
  locateAcrossFrames,
  parentAcrossFrames,
  pickableAcrossFrames,
  relativeAddress,
} from './frames';

/** A container in this document holding a same-origin frame whose body is `markup`. */
const framed = (markup: string): { container: HTMLElement; frame: HTMLIFrameElement; doc: Document } => {
  const container = document.createElement('div');
  container.innerHTML = '<p>outside</p>';
  const frame = document.createElement('iframe');
  frame.style.border = '0';
  container.append(frame);
  document.body.append(container);
  const doc = frame.contentDocument!;
  doc.body.innerHTML = markup;
  return { container, frame, doc };
};

const rect = (left: number, top: number, width: number, height: number): DOMRect =>
  ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top }) as DOMRect;

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('frameDocument / hostFrame', () => {
  it('reaches into a same-origin frame and back out to it', () => {
    const { frame, doc } = framed('<button>Pay</button>');
    expect(frameDocument(frame)).toBe(doc);
    expect(hostFrame(doc)).toBe(frame);
    expect(hostFrame(document)).toBeNull();
    expect(frameDocument(document.createElement('div'))).toBeNull();
  });

  it('steps from a frame document root out to the frame', () => {
    const { frame, doc } = framed('<button>Pay</button>');
    expect(parentAcrossFrames(doc.documentElement)).toBe(frame);
    expect(parentAcrossFrames(doc.querySelector('button')!)).toBe(doc.body);
  });
});

describe('containsDeep', () => {
  it('sees an element of a frame below the frame’s container', () => {
    const { container, frame, doc } = framed('<button>Pay</button>');
    const button = doc.querySelector('button')!;
    expect(containsDeep(container, button)).toBe(true);
    expect(containsDeep(frame, button)).toBe(true);
    expect(containsDeep(document.createElement('div'), button)).toBe(false);
  });
});

describe('locateAcrossFrames / findAcrossFrames', () => {
  it('chains the frame’s selector with one relative to the frame’s body', () => {
    const { container, doc } = framed('<main><button>Back</button><button class="pay">Pay</button></main>');
    const pay = doc.querySelector('.pay')!;
    const location = locateAcrossFrames(pay, container);
    expect(location).toEqual({ selector: 'iframe >>> button.pay:nth-of-type(2)', tag: 'button', text: 'Pay' });
    expect(findAcrossFrames(container, location.selector)).toBe(pay);
  });

  it('names the frame itself as `:scope` when the container is the frame', () => {
    const { frame, doc } = framed('<button>Pay</button>');
    const button = doc.querySelector('button')!;
    const location = locateAcrossFrames(button, frame);
    expect(location.selector).toBe(':scope >>> button');
    expect(findAcrossFrames(frame, location.selector)).toBe(button);
    expect(locateAcrossFrames(doc.body, frame).selector).toBe(':scope >>> :scope');
    expect(findAcrossFrames(frame, ':scope >>> :scope')).toBe(doc.body);
  });

  it('locates an element of this document as before', () => {
    const { container } = framed('');
    const outside = container.querySelector('p')!;
    expect(locateAcrossFrames(outside, container)).toEqual({ selector: 'p', tag: 'p', text: 'outside' });
    expect(findAcrossFrames(container, 'p')).toBe(outside);
  });

  it('finds nothing once the element or the frame is gone', () => {
    const { container, frame } = framed('<button>Pay</button>');
    expect(findAcrossFrames(container, 'iframe >>> .missing')).toBeNull();
    expect(findAcrossFrames(container, 'p >>> button')).toBeNull();
    frame.remove();
    expect(findAcrossFrames(container, 'iframe >>> button')).toBeNull();
  });
});

describe('pickableAcrossFrames', () => {
  it('picks the control a click inside a frame belongs to', () => {
    const { container, doc } = framed('<button><span>Pay</span></button>');
    expect(pickableAcrossFrames(doc.querySelector('span')!, container)).toBe(doc.querySelector('button'));
    expect(pickableAcrossFrames(doc.documentElement, container)).toBe(doc.body);
  });
});

describe('descendAt', () => {
  it('goes down into the frame under a point, in the frame’s own coordinates', () => {
    const { frame, doc } = framed('<button>Pay</button>');
    const button = doc.querySelector('button')!;
    vi.spyOn(frame, 'getBoundingClientRect').mockReturnValue(rect(100, 50, 400, 300));
    Object.defineProperty(frame.contentWindow!, 'innerWidth', { value: 400, configurable: true });
    const at = vi.fn(() => button);
    doc.elementFromPoint = at;
    expect(descendAt(frame, 110, 70)).toBe(button);
    expect(at).toHaveBeenCalledWith(10, 20);
    const outside = document.createElement('div');
    expect(descendAt(outside, 0, 0)).toBe(outside);
  });

  it('scales the point into a frame drawn smaller than its CSS pixels', () => {
    const { frame, doc } = framed('<button>Pay</button>');
    vi.spyOn(frame, 'getBoundingClientRect').mockReturnValue(rect(0, 0, 200, 150));
    Object.defineProperty(frame.contentWindow!, 'innerWidth', { value: 400, configurable: true });
    const at = vi.fn(() => doc.body);
    doc.elementFromPoint = at;
    descendAt(frame, 50, 25);
    expect(at).toHaveBeenCalledWith(100, 50);
  });
});

describe('boxInDocument', () => {
  it('maps a frame element’s box into this document and clips it to the frame', () => {
    const { frame, doc } = framed('<button>Pay</button>');
    const button = doc.querySelector('button')!;
    vi.spyOn(frame, 'getBoundingClientRect').mockReturnValue(rect(100, 50, 400, 300));
    Object.defineProperty(frame.contentWindow!, 'innerWidth', { value: 400, configurable: true });
    vi.spyOn(button, 'getBoundingClientRect').mockReturnValue(rect(10, 280, 80, 40));
    expect(boxInDocument(button, document)).toEqual({ left: 110, top: 330, width: 80, height: 20 });
  });

  it('gives an element scrolled out of its frame no size', () => {
    const { frame, doc } = framed('<button>Pay</button>');
    const button = doc.querySelector('button')!;
    vi.spyOn(frame, 'getBoundingClientRect').mockReturnValue(rect(0, 0, 400, 300));
    Object.defineProperty(frame.contentWindow!, 'innerWidth', { value: 400, configurable: true });
    vi.spyOn(button, 'getBoundingClientRect').mockReturnValue(rect(0, -100, 80, 40));
    expect(boxInDocument(button, document).height).toBe(0);
  });
});

describe('relativeAddress / frameAddress', () => {
  it('writes a page of the same directory as a frame’s `src` would', () => {
    const base = 'https://a.example/_f/v3/index.html';
    expect(relativeAddress('https://a.example/_f/v3/demo/index.html#/cart', base)).toBe('demo/index.html#/cart');
    expect(relativeAddress('https://a.example/other/x.html?q=1', base)).toBe('/other/x.html?q=1');
    expect(relativeAddress('https://b.example/x.html', base)).toBe('https://b.example/x.html');
  });

  it('has no address for an element of this document', () => {
    const { container, doc } = framed('<button>Pay</button>');
    expect(frameAddress(container, document)).toBeUndefined();
    expect(frameAddress(doc.querySelector('button')!, document)).toBeTypeOf('string');
  });
});
