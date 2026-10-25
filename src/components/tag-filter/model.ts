import * as v from 'valibot';

import { BC_TAG_PREFIX, type TagMatch } from '../../core/board-model';

/** A tag offered by the filter: its name, with how many items carry it when known. */
export type TagFilterOption = string | { readonly tag: string; readonly count?: number };

const MATCHES = ['single', 'all', 'any'] as const satisfies readonly TagMatch[];

export const isTagMatch = (value: unknown): value is TagMatch => MATCHES.some((match) => match === value);

const isBoundedContextTag = (tag: string): boolean => tag.startsWith(BC_TAG_PREFIX);

/**
 * The options as `{ tag, count }`, first spelling of a tag winning, a count `null` when not given,
 * and Bounded Context tags moved ahead of the rest (a reader scans "what world" before "what else"),
 * each group keeping its own authored order.
 */
export const normalizeOptions = (
  options: readonly TagFilterOption[],
): readonly { readonly tag: string; readonly count: number | null }[] => {
  const seen = new Set<string>();
  const entries = options.flatMap((option) => {
    const entry =
      typeof option === 'string' ? { tag: option, count: null } : { tag: option.tag, count: option.count ?? null };
    if (entry.tag === '' || seen.has(entry.tag)) return [];
    seen.add(entry.tag);
    return [entry];
  });
  return [
    ...entries.filter((entry) => isBoundedContextTag(entry.tag)),
    ...entries.filter((entry) => !isBoundedContextTag(entry.tag)),
  ];
};

const optionSchema = v.union([v.string(), v.object({ tag: v.string(), count: v.exactOptional(v.number()) })]);

/** Strict about the tag list only: an unknown match or a non-string pick is dropped, not an error. */
const dataSchema = v.object({
  tags: v.array(v.unknown()),
  active: v.optional(v.fallback(v.nullable(v.array(v.unknown())), null)),
  match: v.optional(v.fallback(v.nullable(v.picklist(MATCHES)), null)),
});

/** The JSON child: a list of options, or `{ tags, active?, match? }`. */
export const parseTagFilterData = (
  input: unknown,
): {
  readonly tags: readonly TagFilterOption[];
  readonly active: readonly string[] | null;
  readonly match: TagMatch | null;
} => {
  const record = v.parse(dataSchema, Array.isArray(input) ? { tags: input } : input);
  const tags = record.tags.flatMap((tag) => {
    const option = v.safeParse(optionSchema, tag);
    return option.success ? [option.output] : [];
  });
  const active = record.active?.filter((tag): tag is string => typeof tag === 'string') ?? null;
  return { tags, active, match: record.match ?? null };
};
