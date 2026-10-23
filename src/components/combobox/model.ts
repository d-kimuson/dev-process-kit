import * as v from 'valibot';

/**
 * Domain model of a combobox: options the author gives (in reading order,
 * grouped by an optional `group`), and the picked values. Filtering, grouping,
 * keyboard movement and selection are pure so the element only replays them
 * over DOM state.
 */

export type ComboboxOption = {
  readonly value: string;
  readonly label: string;
  readonly description: string | null;
  readonly group: string | null;
  /** Overrides the derived initials when given. */
  readonly avatar: string | null;
};

export type ComboboxGroup = { readonly group: string | null; readonly options: readonly ComboboxOption[] };

const optionSchema = v.strictObject({
  value: v.pipe(v.string(), v.minLength(1)),
  label: v.pipe(v.string(), v.minLength(1)),
  description: v.optional(v.string()),
  group: v.optional(v.string()),
  avatar: v.optional(v.string()),
});

const dataSchema = v.strictObject({
  options: v.array(optionSchema),
  value: v.optional(v.union([v.string(), v.array(v.string())])),
});

/** A property or JSON `value` accepts a single string or a list; always normalized to a list, empty values dropped. */
export const normalizeValue = (input: unknown): readonly string[] => {
  if (typeof input === 'string') return input === '' ? [] : [input];
  if (Array.isArray(input)) return input.filter((item): item is string => typeof item === 'string' && item !== '');
  return [];
};

/** The JSON child: `{ options, value? }`. Duplicate option values and unknown keys are errors. */
export const parseComboboxData = (
  input: unknown,
): { readonly options: readonly ComboboxOption[]; readonly value: readonly string[] | null } => {
  const parsed = v.parse(dataSchema, input);
  const seen = new Set<string>();
  const options = parsed.options.map((option): ComboboxOption => {
    if (seen.has(option.value)) throw new Error(`duplicate option value: ${option.value}`);
    seen.add(option.value);
    return {
      value: option.value,
      label: option.label,
      description: option.description ?? null,
      group: option.group ?? null,
      avatar: option.avatar ?? null,
    };
  });
  return { options, value: parsed.value === undefined ? null : normalizeValue(parsed.value) };
};

/** Options whose label or description contains `query` (case-insensitive); all of them when `query` is blank. */
export const filterOptions = (options: readonly ComboboxOption[], query: string): readonly ComboboxOption[] => {
  const needle = query.trim().toLowerCase();
  if (needle === '') return options;
  return options.filter(
    (option) =>
      option.label.toLowerCase().includes(needle) || (option.description?.toLowerCase().includes(needle) ?? false),
  );
};

/** Groups options by `group`, in the order each group was first seen; ungrouped options keep their own bucket (`null`). */
export const groupOptions = (options: readonly ComboboxOption[]): readonly ComboboxGroup[] => {
  const order: (string | null)[] = [];
  const buckets = new Map<string | null, ComboboxOption[]>();
  for (const option of options) {
    let bucket = buckets.get(option.group);
    if (bucket === undefined) {
      bucket = [];
      buckets.set(option.group, bucket);
      order.push(option.group);
    }
    bucket.push(option);
  }
  return order.map((group) => ({ group, options: buckets.get(group) ?? [] }));
};

/** Clamps an index into `[0, count - 1]`, or `-1` when there is nothing to point at. */
export const clampActiveIndex = (index: number, count: number): number => {
  if (count === 0) return -1;
  return Math.min(Math.max(index, 0), count - 1);
};

/** Arrow keys move the active option and wrap; opening fresh starts at either end. */
export const moveActiveIndex = (index: number, delta: number, count: number): number => {
  if (count === 0) return -1;
  if (index < 0) return delta > 0 ? 0 : count - 1;
  return (index + delta + count) % count;
};

/** Multi-select toggles the value in place; single-select always replaces the selection with it. */
export const toggleSelection = (current: readonly string[], value: string, multiple: boolean): readonly string[] => {
  if (!multiple) return [value];
  return current.includes(value) ? current.filter((picked) => picked !== value) : [...current, value];
};

export const removeValue = (current: readonly string[], value: string): readonly string[] =>
  current.filter((picked) => picked !== value);

export const isSelected = (value: readonly string[], target: string): boolean => value.includes(target);

export const sameValues = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((value, index) => value === b[index]);

/** The picked options, in the order `value` lists them; a value with no matching option is skipped. */
export const selectedOptions = (
  options: readonly ComboboxOption[],
  value: readonly string[],
): readonly ComboboxOption[] =>
  value.flatMap((picked) => {
    const option = options.find((candidate) => candidate.value === picked);
    return option ? [option] : [];
  });

/** The single-select display label: the first picked option's label, or `null` when nothing is picked (or it is gone). */
export const selectedLabel = (options: readonly ComboboxOption[], value: readonly string[]): string | null => {
  const first = value[0];
  if (first === undefined) return null;
  return options.find((option) => option.value === first)?.label ?? null;
};

/** Up to two initials from a label's words, uppercased; the first character alone for a single word. */
export const initialsFor = (label: string): string => {
  const words = label.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? '';
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : '';
  return `${first}${last}`.toUpperCase();
};

const AVATAR_TONES = ['blue', 'green', 'amber', 'violet', 'accent', 'danger'] as const;

export type AvatarTone = (typeof AVATAR_TONES)[number];

/** A deterministic tone per option, so the same value always draws the same color. */
export const avatarTone = (seed: string): AvatarTone => {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) hash = (hash * 31 + seed.charCodeAt(index)) | 0;
  return AVATAR_TONES[Math.abs(hash) % AVATAR_TONES.length] ?? 'blue';
};
