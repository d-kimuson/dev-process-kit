import * as v from 'valibot';

import { entityIdSchema } from '../../core/schema';

/**
 * Meaning model of the plain template: a titled page with no domain of its own.
 *
 * Whatever the page shows is the author's markup in `slot="main"`. The only
 * meaning the template adds is a list of named sections, so that prose — not
 * just a diagram element — can be the target of a comment.
 */

export type PlainSection = {
  readonly id: string;
  readonly title: string;
};

export type PlainState = {
  readonly title: string;
  readonly sections: readonly PlainSection[];
};

const sectionSchema = v.strictObject({
  id: entityIdSchema,
  title: v.pipe(v.string(), v.minLength(1)),
});

export const plainBaseSchema = v.strictObject({
  title: v.optional(v.string(), ''),
  sections: v.optional(v.array(sectionSchema), []),
});

export const parsePlainBase = (input: unknown): PlainState => {
  const parsed = v.parse(plainBaseSchema, input);
  const ids = new Set<string>();
  for (const section of parsed.sections) {
    if (ids.has(section.id)) throw new Error(`duplicate section id: ${section.id}`);
    ids.add(section.id);
  }
  return { title: parsed.title, sections: parsed.sections };
};

export const emptyPlainBase = (): PlainState => ({ title: '', sections: [] });

export const findSection = (state: PlainState, id: string): PlainSection | undefined =>
  state.sections.find((section) => section.id === id);
