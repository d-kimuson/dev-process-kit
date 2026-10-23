import * as v from 'valibot';

import type { SelectOption } from '../../core/select/model';

export type { SelectOption };

/**
 * Domain model of `<dpk-select>`'s JSON child: options in reading order and
 * the initial pick. Keyboard movement and selection themselves are the
 * shared, pure `src/core/select/model` the trigger and listbox replay.
 */

const optionSchema = v.strictObject({
  value: v.pipe(v.string(), v.minLength(1)),
  label: v.pipe(v.string(), v.minLength(1)),
});

const dataSchema = v.strictObject({
  options: v.array(optionSchema),
  value: v.optional(v.string()),
});

/** The JSON child: `{ options, value? }`. Duplicate option values and unknown keys are errors. */
export const parseSelectData = (
  input: unknown,
): { readonly options: readonly SelectOption[]; readonly value: string | null } => {
  const parsed = v.parse(dataSchema, input);
  const seen = new Set<string>();
  for (const option of parsed.options) {
    if (seen.has(option.value)) throw new Error(`duplicate option value: ${option.value}`);
    seen.add(option.value);
  }
  return { options: parsed.options, value: parsed.value ?? null };
};
