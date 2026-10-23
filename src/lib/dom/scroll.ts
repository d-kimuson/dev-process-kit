export type VerticalSpan = { readonly top: number; readonly bottom: number };

/** The `scrollTop` that brings `child` into `viewport` with the least movement (`block: 'nearest'`). */
export const nearestScrollTop = (scrollTop: number, viewport: VerticalSpan, child: VerticalSpan): number => {
  if (child.top < viewport.top) return scrollTop + child.top - viewport.top;
  if (child.bottom <= viewport.bottom) return scrollTop;
  return scrollTop + Math.min(child.bottom - viewport.bottom, child.top - viewport.top);
};

/** Room kept from both ends of a scrollport, at most a quarter of it. */
const inset = (start: number, size: number, margin: number): VerticalSpan => {
  const room = Math.min(margin, size / 4);
  return { top: start + room, bottom: start + size - room };
};

/**
 * Reveals `child` by scrolling `container` only, `margin` px clear of its edge.
 * `scrollIntoView` also scrolls every ancestor, up to a page that embeds this
 * one in an iframe.
 */
export const revealWithin = (container: Element, child: Element, margin = 0): void => {
  const box = container.getBoundingClientRect();
  container.scrollTop = nearestScrollTop(
    container.scrollTop,
    inset(box.top + container.clientTop, container.clientHeight, margin),
    child.getBoundingClientRect(),
  );
};

/** {@link revealWithin} along the inline axis: a tab strip that scrolls sideways shows its selected tab. */
export const revealInlineWithin = (container: Element, child: Element, margin = 0): void => {
  const box = container.getBoundingClientRect();
  const target = child.getBoundingClientRect();
  container.scrollLeft = nearestScrollTop(
    container.scrollLeft,
    inset(box.left + container.clientLeft, container.clientWidth, margin),
    { top: target.left, bottom: target.right },
  );
};

/** One wheel "line" or "page" step, in pixels, for a `deltaMode` that is not already pixels. */
const WHEEL_LINE_HEIGHT_PX = 16;

/** `event`'s scroll delta converted to pixels, whatever its `deltaMode`. */
export const wheelDeltaPixels = (
  event: Pick<WheelEvent, 'deltaX' | 'deltaY' | 'deltaMode'>,
  pageSize: number,
): { readonly dx: number; readonly dy: number } => {
  const unit = event.deltaMode === 1 ? WHEEL_LINE_HEIGHT_PX : event.deltaMode === 2 ? pageSize : 1;
  return { dx: event.deltaX * unit, dy: event.deltaY * unit };
};

/**
 * Scrolls `element` by `event`'s wheel delta, clamped to its range, and
 * reports whether it moved.
 *
 * Some engines fail to resolve wheel scroll-chaining when a scrollable
 * element's content reaches it through two nested shadow-root/slot
 * boundaries (content assigned into one host's slot, that host itself
 * slotted into another custom element) — the pointer sits over the
 * scrollable region, but the wheel event never scrolls it. Scrolling
 * `element` directly from its own `wheel` listener sidesteps that
 * resolution instead of depending on it, so callers should still attach
 * this to the element itself (not a distant ancestor).
 */
export const scrollByWheel = (
  element: Pick<
    HTMLElement,
    'scrollTop' | 'scrollLeft' | 'scrollHeight' | 'scrollWidth' | 'clientHeight' | 'clientWidth'
  >,
  event: Pick<WheelEvent, 'deltaX' | 'deltaY' | 'deltaMode' | 'ctrlKey'>,
): boolean => {
  if (event.ctrlKey) return false; // A pinch-to-zoom gesture, not a scroll.
  const canScrollY = element.scrollHeight > element.clientHeight;
  const canScrollX = element.scrollWidth > element.clientWidth;
  if (!canScrollY && !canScrollX) return false;
  const { dx, dy } = wheelDeltaPixels(event, element.clientHeight);
  const nextTop = Math.min(Math.max(element.scrollTop + dy, 0), element.scrollHeight - element.clientHeight);
  const nextLeft = Math.min(Math.max(element.scrollLeft + dx, 0), element.scrollWidth - element.clientWidth);
  if (nextTop === element.scrollTop && nextLeft === element.scrollLeft) return false;
  element.scrollTop = nextTop;
  element.scrollLeft = nextLeft;
  return true;
};
