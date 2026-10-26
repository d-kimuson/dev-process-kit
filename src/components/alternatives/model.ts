import * as v from 'valibot';

/**
 * Domain model of alternatives: the options a decision weighed, and which one it
 * took.
 *
 * An option is one card. It carries its status (`adopted` / `rejected` /
 * `considered`), what it is (`label`, `summary`), and why it ended up there
 * (`reason`, `tradeoffs`). The status is part of the data, not a separate list
 * of ids: a card can never be both adopted and rejected, and an option without a
 * status cannot be constructed.
 *
 * Read-only: the element derives its view from this model and the reader's
 * choice is the author's decision, recorded in the page, not a draft action.
 */

export const ALTERNATIVE_STATUSES = ['adopted', 'rejected', 'considered'] as const;

export type AlternativeStatus = (typeof ALTERNATIVE_STATUSES)[number];

const optionSchema = v.strictObject({
  id: v.pipe(v.string(), v.regex(/^[A-Za-z0-9_-]+$/)),
  status: v.picklist(ALTERNATIVE_STATUSES),
  label: v.optional(v.pipe(v.string(), v.minLength(1))),
  summary: v.optional(v.pipe(v.string(), v.minLength(1))),
  reason: v.optional(v.pipe(v.string(), v.minLength(1))),
  tradeoffs: v.optional(v.array(v.pipe(v.string(), v.minLength(1)))),
});

const alternativesSchema = v.strictObject({
  options: v.array(optionSchema),
});

export type AlternativeOption = {
  /** Stable id, unique in the list. */
  readonly id: string;
  readonly status: AlternativeStatus;
  /** What the reader calls it: the authored label, or the id when there is none. */
  readonly label: string;
  /** What the option is, in a sentence. */
  readonly summary: string | null;
  /** Why it was adopted or dropped, in the author's words. */
  readonly reason: string | null;
  /** What taking it would have cost. */
  readonly tradeoffs: readonly string[];
};

export type AlternativesData = { readonly options: readonly AlternativeOption[] };

export const emptyAlternativesData = (): AlternativesData => ({ options: [] });

/**
 * Validates authored data strictly: an unknown key, a missing status, a blank
 * text or a duplicate id is an authoring mistake, reported instead of rendered.
 */
export const parseAlternativesData = (input: unknown): AlternativesData => {
  const parsed = v.parse(alternativesSchema, input);
  const ids = new Set<string>();
  return {
    options: parsed.options.map((option): AlternativeOption => {
      if (ids.has(option.id)) throw new Error(`duplicate option id: ${option.id}`);
      ids.add(option.id);
      return {
        id: option.id,
        status: option.status,
        label: option.label ?? option.id,
        summary: option.summary ?? null,
        reason: option.reason ?? null,
        tradeoffs: option.tradeoffs ?? [],
      };
    }),
  };
};
