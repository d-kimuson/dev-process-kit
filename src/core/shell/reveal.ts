/**
 * Finds the element a change is about and draws the reader's eye to it: the
 * scrollers around it bring it into view and it glows for a few seconds.
 */
import { composedAncestors, queryAllDeep } from '../../lib/dom/deep';
import { revealInlineWithin, revealWithin } from '../../lib/dom/scroll';

/**
 * Marks the element that stands for a `type:id` target, wherever a template or
 * the author rendered it. Space-separated when it shows several targets.
 */
export const TARGET_ATTRIBUTE = 'data-dpk-target';

export const HIGHLIGHT_MS = 2800;

/** Room around a revealed element for its glow, and past a sticky header or two. */
const REVEAL_MARGIN = 48;

const isShown = (element: Element): boolean => element.getClientRects().length > 0;

/**
 * The element marked as `ref` below `host`, across shadow roots. A marked
 * element wins over a `data-dpk-comment` button for the same target, and a
 * shown one over a hidden one.
 */
export const findTarget = (host: Element, ref: string): Element | null => {
  // Compared as tokens rather than with `~=` in a selector: no escaping of the ref to get right.
  const marked = queryAllDeep(host, `[${TARGET_ATTRIBUTE}]`).filter((element) =>
    (element.getAttribute(TARGET_ATTRIBUTE) ?? '').split(/\s+/).includes(ref),
  );
  const commented = queryAllDeep(host, '[data-dpk-comment]').filter(
    (element) => element.getAttribute('data-dpk-comment') === ref,
  );
  const candidates = [...marked, ...commented];
  return candidates.find(isShown) ?? candidates[0] ?? null;
};

const scrolls = (element: Element, axis: 'x' | 'y'): boolean => {
  const style = getComputedStyle(element);
  const overflow = axis === 'y' ? style.overflowY : style.overflowX;
  if (overflow !== 'auto' && overflow !== 'scroll') return false;
  return axis === 'y' ? element.scrollHeight > element.clientHeight : element.scrollWidth > element.clientWidth;
};

/**
 * Scrolls each scroller between `host` and `element`, innermost first. Not
 * `scrollIntoView`: that also scrolls a page that embeds this one in an iframe.
 */
export const revealTarget = (host: Element, element: Element): void => {
  for (const ancestor of composedAncestors(element, host)) {
    if (scrolls(ancestor, 'y')) revealWithin(ancestor, element, REVEAL_MARGIN);
    if (scrolls(ancestor, 'x')) revealInlineWithin(ancestor, element, REVEAL_MARGIN);
  }
};

const RING = 'color-mix(in srgb, var(--dpk-accent) 45%, transparent)';
const ON = { outline: '2px solid var(--dpk-accent)', outlineOffset: '3px' };
const OFF = { outline: '2px solid transparent', outlineOffset: '3px' };

/** A ring around the box that pulses twice, then fades. */
const boxGlow = (still: boolean): Keyframe[] =>
  still
    ? [{ ...ON }, { ...ON, offset: 0.85 }, { ...OFF }]
    : [
        { ...ON, boxShadow: `0 0 0 0 ${RING}` },
        { ...ON, boxShadow: '0 0 0 14px transparent', offset: 0.3 },
        { ...ON, boxShadow: `0 0 0 0 ${RING}`, offset: 0.31 },
        { ...ON, boxShadow: '0 0 0 14px transparent', offset: 0.6 },
        { ...ON, offset: 0.85 },
        { ...OFF },
      ];

const GLOW_ON = { filter: 'drop-shadow(0 0 3px var(--dpk-accent)) drop-shadow(0 0 3px var(--dpk-accent))' };
const GLOW_OFF = { filter: 'drop-shadow(0 0 3px transparent) drop-shadow(0 0 3px transparent)' };

/** A shape inside an SVG draws no outline or box shadow, so it glows along its stroke instead. */
const svgGlow = (still: boolean): Keyframe[] =>
  still
    ? [{ ...GLOW_ON }, { ...GLOW_ON, offset: 0.85 }, { ...GLOW_OFF }]
    : [
        { ...GLOW_ON },
        { ...GLOW_OFF, offset: 0.3 },
        { ...GLOW_ON, offset: 0.31 },
        { ...GLOW_OFF, offset: 0.6 },
        { ...GLOW_ON, offset: 0.61 },
        { ...GLOW_OFF },
      ];

/**
 * A few seconds of glow. An animation rather than a class, so it reaches into
 * any shadow root without a stylesheet there, and leaves nothing behind.
 */
export const highlightTarget = (element: Element): void => {
  if (typeof element.animate !== 'function') return;
  const still = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const inSvg = element instanceof SVGElement && !(element instanceof SVGSVGElement);
  element.animate(inSvg ? svgGlow(still) : boxGlow(still), { duration: HIGHLIGHT_MS, easing: 'ease-out' });
};
