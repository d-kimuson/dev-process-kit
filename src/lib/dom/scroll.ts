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
