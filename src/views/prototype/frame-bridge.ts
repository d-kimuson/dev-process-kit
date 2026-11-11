import { frameDocument, isFrame } from '../../lib/dom/frames';

/** The CSS custom property a preview iframe takes its height from: the height of the page it shows. */
export const FRAME_HEIGHT_PROPERTY = '--dpk-frame-height';

export type FrameBridgeHost = {
  /** The page in a frame moved, scrolled, resized or changed its markup: the marks over it follow. */
  readonly changed: () => void;
  /** A click in the page of a frame, after the page's own handlers (as a preview's own markup hears it). */
  readonly click: (event: MouseEvent, frame: HTMLIFrameElement) => void;
  /** A key pressed while the focus is in the page of a frame. */
  readonly keydown: (event: KeyboardEvent) => void;
  /** A frame finished loading a page. */
  readonly loaded: (frame: HTMLIFrameElement, doc: Document) => void;
};

type Watched = {
  readonly onLoad: () => void;
  /** Undoes what was attached to the page the frame shows now. */
  detach: () => void;
};

/**
 * Watches the same-origin iframes among a prototype's preview elements: what
 * happens in the page a frame shows does not reach this document, so each
 * page loaded in a frame is listened to on its own, and the frame is given
 * that page's height. A cross-origin frame's page cannot be reached, and is
 * left alone.
 */
export class FrameBridge {
  readonly #host: FrameBridgeHost;
  readonly #watched = new Map<HTMLIFrameElement, Watched>();

  constructor(host: FrameBridgeHost) {
    this.#host = host;
  }

  /** Starts watching the frames among `elements` and stops watching the ones no longer there. */
  sync(elements: Iterable<Element>): void {
    const frames = new Set<HTMLIFrameElement>();
    for (const element of elements) if (isFrame(element)) frames.add(element);
    for (const [frame, watched] of this.#watched) {
      if (frames.has(frame)) continue;
      frame.removeEventListener('load', watched.onLoad);
      watched.detach();
      this.#watched.delete(frame);
    }
    for (const frame of frames) {
      if (this.#watched.has(frame)) continue;
      const watched: Watched = {
        onLoad: () => {
          watched.detach();
          watched.detach = this.#attach(frame);
        },
        detach: () => {},
      };
      this.#watched.set(frame, watched);
      frame.addEventListener('load', watched.onLoad);
      // Already loaded before it was watched: `load` has fired and will not again.
      const doc = frameDocument(frame);
      if (doc !== null && doc.readyState === 'complete' && doc.URL !== 'about:blank') watched.onLoad();
    }
  }

  disconnect(): void {
    this.sync([]);
  }

  #attach(frame: HTMLIFrameElement): () => void {
    const doc = frameDocument(frame);
    const view = doc?.defaultView;
    if (doc === null || view === null || view === undefined) return () => {};
    const changed = (): void => this.#host.changed();
    const fit = (): void => {
      // The page's own height, not the frame's: a page as tall as its frame would never shrink it.
      const height = Math.ceil(doc.documentElement.getBoundingClientRect().height);
      if (height > 0) frame.style.setProperty(FRAME_HEIGHT_PROPERTY, `${height}px`);
      changed();
    };
    const click = (event: MouseEvent): void => this.#host.click(event, frame);
    const keydown = (event: KeyboardEvent): void => this.#host.keydown(event);
    view.addEventListener('click', click);
    view.addEventListener('auxclick', click);
    doc.addEventListener('keydown', keydown);
    // `scroll` does not bubble: caught on the way down, from any scrolling area of the page.
    doc.addEventListener('scroll', changed, true);
    view.addEventListener('resize', changed);
    view.addEventListener('hashchange', changed);
    view.addEventListener('popstate', changed);
    // The page's own realm observes its own nodes.
    const mutations = new view.MutationObserver(changed);
    mutations.observe(doc.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
    const sizes = typeof view.ResizeObserver === 'function' ? new view.ResizeObserver(fit) : null;
    sizes?.observe(doc.documentElement);
    fit();
    this.#host.loaded(frame, doc);
    return () => {
      view.removeEventListener('click', click);
      view.removeEventListener('auxclick', click);
      doc.removeEventListener('keydown', keydown);
      doc.removeEventListener('scroll', changed, true);
      view.removeEventListener('resize', changed);
      view.removeEventListener('hashchange', changed);
      view.removeEventListener('popstate', changed);
      mutations.disconnect();
      sizes?.disconnect();
    };
  }
}
