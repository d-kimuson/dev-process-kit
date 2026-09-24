import * as v from 'valibot';

import { entityIdSchema } from '../../core/schema';

/**
 * Meaning model of the slides template: a titled deck of slides in reading order.
 *
 * A slide says what it is about in the base data — a title, and for a text-only
 * slide its points — so a deck can be written as JSON alone. Anything
 * richer (a diagram, code, a table) is the author's markup, routed into the
 * slide by its id.
 */

/**
 * `title` opens the deck, `section` divides it into chapters, `content` is
 * everything else.
 */
export const SLIDE_LAYOUTS = ['title', 'section', 'content'] as const;

export type SlideLayout = (typeof SLIDE_LAYOUTS)[number];

export type Slide = {
  readonly id: string;
  readonly layout: SlideLayout;
  readonly title: string;
  readonly subtitle: string;
  readonly points: readonly string[];
};

export type SlidesState = {
  readonly title: string;
  readonly slides: readonly Slide[];
};

const slideSchema = v.strictObject({
  id: entityIdSchema,
  layout: v.optional(v.picklist(SLIDE_LAYOUTS), 'content'),
  title: v.pipe(v.string(), v.minLength(1)),
  subtitle: v.optional(v.string(), ''),
  points: v.optional(v.array(v.string()), []),
});

export const slidesBaseSchema = v.strictObject({
  title: v.optional(v.string(), ''),
  slides: v.optional(v.array(slideSchema), []),
});

export const parseSlidesBase = (input: unknown): SlidesState => {
  const parsed = v.parse(slidesBaseSchema, input);
  const ids = new Set<string>();
  for (const slide of parsed.slides) {
    if (ids.has(slide.id)) throw new Error(`duplicate slide id: ${slide.id}`);
    ids.add(slide.id);
  }
  return { title: parsed.title, slides: parsed.slides };
};

export const emptySlidesBase = (): SlidesState => ({ title: '', slides: [] });

export const findSlideIndex = (state: SlidesState, id: string | undefined): number =>
  id === undefined ? -1 : state.slides.findIndex((slide) => slide.id === id);

export const findSlide = (state: SlidesState, id: string | undefined): Slide | undefined =>
  state.slides[findSlideIndex(state, id)];
