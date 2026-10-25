import { findSlideIndex, type SlidesState } from './model';

/**
 * Moving through the deck. The keys are the ones a presenter (or a clicker,
 * which sends PageUp / PageDown) uses; the vertical arrows are left to scroll
 * the page, and modified keys to the browser.
 */

export type SlideStep = 'next' | 'previous' | 'first' | 'last';

export type SlideKey = {
  readonly key: string;
  readonly altKey?: boolean;
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
  readonly shiftKey?: boolean;
};

const KEY_STEPS: Readonly<Record<string, SlideStep>> = {
  ArrowRight: 'next',
  PageDown: 'next',
  ArrowLeft: 'previous',
  PageUp: 'previous',
  Home: 'first',
  End: 'last',
};

export const slideKeyStep = (event: SlideKey): SlideStep | null => {
  if (event.altKey === true || event.ctrlKey === true || event.metaKey === true || event.shiftKey === true) return null;
  return KEY_STEPS[event.key] ?? null;
};

/** The slide a step lands on; it stays put at either end of the deck. */
export const stepSlide = (state: SlidesState, currentId: string | undefined, step: SlideStep): string | undefined => {
  const last = state.slides.length - 1;
  if (last < 0) return undefined;
  const current = Math.max(findSlideIndex(state, currentId), 0);
  const index = {
    next: Math.min(current + 1, last),
    previous: Math.max(current - 1, 0),
    first: 0,
    last,
  }[step];
  return state.slides[index]?.id;
};
