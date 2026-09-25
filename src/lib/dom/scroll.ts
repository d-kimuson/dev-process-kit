export type VerticalSpan = { readonly top: number; readonly bottom: number };

/** The `scrollTop` that brings `child` into `viewport` with the least movement (`block: 'nearest'`). */
export const nearestScrollTop = (scrollTop: number, viewport: VerticalSpan, child: VerticalSpan): number => {
  if (child.top < viewport.top) return scrollTop + child.top - viewport.top;
  if (child.bottom <= viewport.bottom) return scrollTop;
  return scrollTop + Math.min(child.bottom - viewport.bottom, child.top - viewport.top);
};

/**
 * Reveals `child` by scrolling `container` only. `scrollIntoView` also scrolls
 * every ancestor, up to a page that embeds this one in an iframe.
 */
export const revealWithin = (container: Element, child: Element): void => {
  const box = container.getBoundingClientRect();
  const top = box.top + container.clientTop;
  container.scrollTop = nearestScrollTop(
    container.scrollTop,
    { top, bottom: top + container.clientHeight },
    child.getBoundingClientRect(),
  );
};
