import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
  size as fitSize,
  type VirtualElement,
  type Placement,
} from '@floating-ui/dom';

export type PopoverAnchor = { readonly top: number; readonly bottom: number; readonly right: number };
export type PopoverSize = { readonly width: number; readonly height: number };
export type PopoverOptions = {
  readonly placement?: Placement;
  readonly trackTransform?: boolean;
};
export const pointAnchor = (x: number, y: number): PopoverAnchor => ({ top: y, bottom: y, right: x });

/** Fixed top-layer coordinates never include document scroll offsets. The owner
 * must dispose the observer on replacement, close, and disconnection. */
export const openPopover = (
  element: HTMLElement,
  anchor: Element | PopoverAnchor,
  size: PopoverSize,
  options: PopoverOptions = {},
): (() => void) => {
  if (typeof element.showPopover !== 'function') return () => {};
  try {
    element.showPopover();
  } catch {
    return () => {};
  }
  let active = true;
  let revision = 0;
  const reference: Element | VirtualElement =
    anchor instanceof Element
      ? anchor
      : {
          getBoundingClientRect: () => ({
            x: anchor.right,
            y: anchor.top,
            left: anchor.right,
            right: anchor.right,
            top: anchor.top,
            bottom: anchor.bottom,
            width: 0,
            height: anchor.bottom - anchor.top,
          }),
        };
  element.style.width = `${size.width}px`;
  element.style.maxHeight = `${size.height}px`;
  const update = (): void => {
    const request = ++revision;
    void computePosition(reference, element, {
      strategy: 'fixed',
      placement: options.placement ?? 'bottom-end',
      middleware: [
        offset(8),
        flip({ padding: 8, fallbackAxisSideDirection: 'end' }),
        shift({ padding: 8 }),
        fitSize({
          padding: 8,
          apply: ({ availableWidth, availableHeight }) => {
            if (!active || request !== revision) return;
            element.style.width = `${Math.max(0, Math.min(size.width, availableWidth))}px`;
            element.style.maxHeight = `${Math.max(0, Math.min(size.height, availableHeight))}px`;
          },
        }),
      ],
    })
      .then(({ x, y }) => {
        if (!active || request !== revision || !element.isConnected) return;
        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
      })
      .catch(() => {
        /* The reference may have left the document during measurement. */
      });
  };
  const dispose = autoUpdate(reference, element, update, {
    animationFrame: options.trackTransform ?? false,
    elementResize: typeof ResizeObserver !== 'undefined',
    layoutShift: typeof IntersectionObserver !== 'undefined',
  });
  return () => {
    active = false;
    dispose();
  };
};

export const closePopover = (element: HTMLElement | null | undefined): void => {
  if (!element || typeof element.hidePopover !== 'function') return;
  try {
    element.hidePopover();
  } catch {
    /* already hidden or removed */
  }
};
