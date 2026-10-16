// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { setCompositeDragImage } from './drag-image';

const rects = new Map<Element, DOMRect>();

const place = (element: Element, left: number, top: number, width: number, height: number): void => {
  rects.set(element, new DOMRect(left, top, width, height));
};

const start = (clientX: number, clientY: number) => {
  const setDragImage = vi.fn<(image: Element, x: number, y: number) => void>();
  return { event: { dataTransfer: { setDragImage }, clientX, clientY }, setDragImage };
};

describe('setCompositeDragImage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    rects.clear();
    document.body.innerHTML = '';
  });

  const mount = () => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      return rects.get(this) ?? new DOMRect(0, 0, 0, 0);
    });
    const host = document.createElement('div');
    document.body.append(host);
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `
      <div class="frame">
        <div class="head" data-part>Head</div>
        <div class="cell" data-part><p>Cell</p></div>
        <div class="cell" data-part>Far below</div>
      </div>`;
    const frame = root.querySelector('.frame')!;
    const [head, cell, far] = [...root.querySelectorAll('[data-part]')];
    place(frame, 0, 0, 800, 600);
    place(head!, 300, 100, 200, 40);
    place(cell!, 300, 140, 200, 120);
    place(far!, 300, 900, 200, 120);
    return { root, frame, parts: [head!, cell!, far!] };
  };

  it('hands the browser one still picture of the parts, cut to the frame, under the pointer where it grabbed', () => {
    vi.useFakeTimers();
    const { root, frame, parts } = mount();
    const { event, setDragImage } = start(320, 110);
    setCompositeDragImage(event, parts, frame);

    expect(setDragImage).toHaveBeenCalledTimes(1);
    const [image, x, y] = setDragImage.mock.calls[0]!;
    // the pointer keeps its place on the head: 20 in, 10 down
    expect([x, y]).toEqual([20, 10]);
    expect(image.getRootNode()).toBe(root);
    expect(image.getAttribute('style')).toContain('position: fixed');
    expect(image.getAttribute('style')).toContain('pointer-events: none');
    const copies = [...image.children];
    expect(copies.map((copy) => copy.textContent?.trim())).toEqual(['Head', 'Cell']);
    expect(copies[1]?.querySelector('p')).not.toBeNull();
    expect(copies[1]?.getAttribute('style')).toContain('top: 40px');

    // the picture is gone once the browser took it
    vi.runAllTimers();
    expect(image.isConnected).toBe(false);
  });

  it('copies what a custom element drew in its shadow root, which a clone would lose', () => {
    const { frame, parts } = mount();
    const editor = document.createElement('x-editor');
    editor.setAttribute('truncate', '');
    editor.attachShadow({ mode: 'open' }).innerHTML = '<span class="view">Sign up</span><slot></slot>';
    editor.append('!');
    parts[0]!.append(editor);
    const { event, setDragImage } = start(320, 110);
    setCompositeDragImage(event, parts, frame);

    const image = setDragImage.mock.calls[0]![0];
    const stand = image.querySelector('[truncate]');
    expect(stand?.tagName).not.toBe('X-EDITOR');
    expect(stand?.shadowRoot?.querySelector('.view')?.textContent).toBe('Sign up');
    expect(stand?.textContent).toBe('!');
  });

  it('leaves the ids to the originals, so the picture never doubles one', () => {
    const { root, frame, parts } = mount();
    parts[1]!.querySelector('p')!.id = 'note';
    const editor = document.createElement('x-editor');
    editor.id = 'editor';
    editor.attachShadow({ mode: 'open' });
    parts[0]!.append(editor);
    const { event } = start(320, 110);
    setCompositeDragImage(event, parts, frame);

    expect(root.querySelectorAll('#note')).toHaveLength(1);
    expect(root.querySelectorAll('#editor')).toHaveLength(1);
  });

  it('does nothing without a data transfer or a part in the frame', () => {
    const { root, frame, parts } = mount();
    setCompositeDragImage({ dataTransfer: null, clientX: 0, clientY: 0 }, parts, frame);
    const { event, setDragImage } = start(0, 0);
    setCompositeDragImage(event, [parts[2]!], frame);
    expect(setDragImage).not.toHaveBeenCalled();
    expect(root.querySelectorAll('[style*="fixed"]')).toHaveLength(0);
  });
});
