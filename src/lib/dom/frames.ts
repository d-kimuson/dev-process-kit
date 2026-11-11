import { findLocated, locateElement, pickableElement, type ElementLocation } from './locator';

/**
 * Reaching into same-origin iframes as if their content were part of the page:
 * hit testing, locating an element, and measuring it in the page's viewport.
 * A cross-origin or not-yet-loaded frame is opaque — the frame element itself
 * is what is under the pointer, and what a selector stops at.
 *
 * Elements of another document belong to that document's realm, so nothing
 * here relies on `instanceof` against this window's constructors.
 */

/** Joins the selectors of each document a located element sits in, outermost first. */
export const FRAME_SEPARATOR = ' >>> ';

export type Box = {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
};

/** Whether `element` is an iframe, of this realm or another. */
export const isFrame = (element: Element): element is HTMLIFrameElement => element.localName === 'iframe';

/** Whether `node` is an element, of this realm or another. */
export const isElementNode = (node: unknown): node is Element =>
  typeof node === 'object' && node !== null && 'nodeType' in node && node.nodeType === Node.ELEMENT_NODE;

/** Whether `node` is a shadow root, of this realm or another. */
export const isShadowRootNode = (node: Node): node is ShadowRoot =>
  node.nodeType === Node.DOCUMENT_FRAGMENT_NODE && 'host' in node;

/** The document a frame shows, when this page may reach into it; otherwise `null`. */
export const frameDocument = (element: Element): Document | null => {
  if (!isFrame(element)) return null;
  try {
    return element.contentDocument ?? null;
  } catch {
    return null;
  }
};

/** The frame element that shows `doc` in its parent document, or `null` for the top document. */
export const hostFrame = (doc: Document): Element | null => {
  try {
    return doc.defaultView?.frameElement ?? null;
  } catch {
    return null;
  }
};

/** What an element of a frame's document is measured against: its body, or the root while there is none. */
const frameRoot = (doc: Document): Element => doc.body ?? doc.documentElement;

/** Whether `node` is `container` or below it, through the frames between them. */
export const containsDeep = (container: Element, node: Element): boolean => {
  let current: Element | null = node;
  while (current !== null) {
    if (current === container || container.contains(current)) return true;
    current = hostFrame(current.ownerDocument);
  }
  return false;
};

/**
 * The parent of `element`, stepping out of a frame's document into the frame
 * element that shows it.
 */
export const parentAcrossFrames = (element: Element): Element | null =>
  element.parentElement ?? hostFrame(element.ownerDocument);

/**
 * Where a frame's content box sits in its own document's viewport, and how
 * much larger the frame is drawn than the CSS pixels inside it (a zoomed
 * device draws it smaller).
 */
const contentBox = (frame: HTMLIFrameElement): Box & { readonly scale: number } => {
  const rect = frame.getBoundingClientRect();
  const view = frame.ownerDocument.defaultView;
  const style = view?.getComputedStyle(frame);
  const px = (value: string | undefined): number => parseFloat(value ?? '') || 0;
  const insetX = px(style?.borderLeftWidth) + px(style?.paddingLeft);
  const insetY = px(style?.borderTopWidth) + px(style?.paddingTop);
  const outerX = insetX + px(style?.borderRightWidth) + px(style?.paddingRight);
  const outerY = insetY + px(style?.borderBottomWidth) + px(style?.paddingBottom);
  const innerWidth = frame.contentWindow?.innerWidth ?? 0;
  const scale = innerWidth > 0 && rect.width > 0 ? rect.width / (innerWidth + outerX) : 1;
  return {
    left: rect.left + insetX * scale,
    top: rect.top + insetY * scale,
    width: Math.max(0, rect.width - outerX * scale),
    height: Math.max(0, rect.height - outerY * scale),
    scale,
  };
};

const intersect = (a: Box, b: Box): Box => {
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  const right = Math.min(a.left + a.width, b.left + b.width);
  const bottom = Math.min(a.top + a.height, b.top + b.height);
  return { left, top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
};

/**
 * `element`'s box in the viewport of `top`, its document's ancestor: each
 * frame on the way maps it into its parent and clips it to what the frame
 * shows, so an element scrolled out of its frame has no size.
 */
export const boxInDocument = (element: Element, top: Document): Box => {
  const rect = element.getBoundingClientRect();
  let box: Box = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
  let doc = element.ownerDocument;
  while (doc !== top) {
    const frame = hostFrame(doc);
    if (frame === null || !isFrame(frame)) break;
    const outer = contentBox(frame);
    box = intersect(
      {
        left: outer.left + box.left * outer.scale,
        top: outer.top + box.top * outer.scale,
        width: box.width * outer.scale,
        height: box.height * outer.scale,
      },
      outer,
    );
    doc = frame.ownerDocument;
  }
  return box;
};

/**
 * The element under a point of `element`'s document viewport, going down
 * into the frames it lands on: `element` itself when it is no frame (or one
 * that cannot be reached into).
 */
export const descendAt = (element: Element, x: number, y: number): Element => {
  let hit = element;
  let point = { x, y };
  for (;;) {
    const doc = frameDocument(hit);
    if (doc === null || !isFrame(hit)) return hit;
    const box = contentBox(hit);
    point = { x: (point.x - box.left) / box.scale, y: (point.y - box.top) / box.scale };
    const inner = doc.elementFromPoint(point.x, point.y);
    if (inner === null) return hit;
    hit = inner;
  }
};

/**
 * What a click on `element` is about, as `pickableElement` decides it in the
 * element's own document: the control it belongs to, else the element.
 */
export const pickableAcrossFrames = (element: Element, container: Element): Element => {
  if (element.ownerDocument === container.ownerDocument) return pickableElement(element, container);
  const root = frameRoot(element.ownerDocument);
  return root.contains(element) && element !== root ? pickableElement(element, root) : root;
};

/**
 * Locates `element` below `container` through the frames between them: the
 * selector of each document, outermost first, joined by `FRAME_SEPARATOR`.
 * Inside a frame, a selector is relative to the frame document's body.
 */
export const locateAcrossFrames = (element: Element, container: Element): ElementLocation => {
  const inner = element.ownerDocument === container.ownerDocument ? null : element;
  const segments: string[] = [];
  let node = element;
  while (node.ownerDocument !== container.ownerDocument) {
    const root = frameRoot(node.ownerDocument);
    segments.unshift(node === root || !root.contains(node) ? ':scope' : locateElement(node, root).selector);
    const frame = hostFrame(node.ownerDocument);
    if (frame === null) break;
    node = frame;
  }
  const outer = locateElement(node, container);
  if (inner === null) return outer;
  const own = locateElement(inner, frameRoot(inner.ownerDocument));
  return {
    selector: [outer.selector, ...segments].join(FRAME_SEPARATOR),
    tag: own.tag,
    ...(own.text === undefined ? {} : { text: own.text }),
  };
};

/** The element a selector from `locateAcrossFrames` names, or `null` once it is gone or out of reach. */
export const findAcrossFrames = (container: Element, selector: string): Element | null => {
  const parts = selector.split(FRAME_SEPARATOR);
  let root: Element = container;
  for (const [index, part] of parts.entries()) {
    const found = findLocated(root, part.trim());
    if (found === null || index === parts.length - 1) return found;
    const doc = frameDocument(found);
    if (doc === null) return null;
    root = frameRoot(doc);
  }
  return null;
};

/**
 * Where a document is, relative to the directory of `base`: what an author
 * would write in a frame's `src` (`demo/index.html#/cart`). A page of another
 * origin keeps its full address.
 */
export const relativeAddress = (href: string, base: string): string => {
  try {
    const url = new URL(href);
    const from = new URL(base);
    if (url.origin !== from.origin) return href;
    const directory = from.pathname.slice(0, from.pathname.lastIndexOf('/') + 1);
    const path = url.pathname.startsWith(directory) ? url.pathname.slice(directory.length) : url.pathname;
    return `${path}${url.search}${url.hash}`;
  } catch {
    return href;
  }
};

/** The page of the innermost frame `element` is in, relative to `top`; `undefined` when it is in `top` itself. */
export const frameAddress = (element: Element, top: Document): string | undefined => {
  const doc = element.ownerDocument;
  if (doc === top) return undefined;
  return relativeAddress(doc.URL, top.baseURI);
};
