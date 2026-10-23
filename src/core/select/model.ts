/**
 * Domain model of a non-native select: the options an author gives (value +
 * label, in reading order) and the pure keyboard/selection math over them.
 * Rendering and DOM wiring stay outside, in `./controller`, so both the
 * public `dpk-select` element and the shell's own pickers (language,
 * version) can replay the same behavior without duplicating it.
 */

export type SelectOption = {
  readonly value: string;
  readonly label: string;
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

/** The index of the option carrying `value`, or `-1` when none does. */
export const indexOfValue = (options: readonly SelectOption[], value: string): number =>
  options.findIndex((option) => option.value === value);

/**
 * Type-ahead, as a native `<select>` offers it: the next option (wrapping,
 * starting just after `afterIndex`) whose label starts with `query`,
 * case-insensitively; `null` for a blank query, an empty list, or no match.
 */
export const typeAheadMatch = (options: readonly SelectOption[], query: string, afterIndex: number): number | null => {
  const needle = query.trim().toLowerCase();
  if (needle === '' || options.length === 0) return null;
  for (let step = 1; step <= options.length; step += 1) {
    const index = (afterIndex + step) % options.length;
    if (options[index]?.label.toLowerCase().startsWith(needle)) return index;
  }
  return null;
};
