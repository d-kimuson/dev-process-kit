/**
 * The selection lives in the hash as `#item=a,b,c`: ids are `[A-Za-z0-9_-]+`,
 * so a comma never appears inside one. A single id reads exactly as before.
 */

export const parseSelection = (value: string | undefined): readonly string[] => {
  if (value === undefined) return [];
  return [...new Set(value.split(',').filter((id) => id !== ''))];
};

export const serializeSelection = (ids: readonly string[]): string | undefined =>
  ids.length === 0 ? undefined : ids.join(',');

/** Shift-click: adds `id` to the selection, or takes it out when it is already in. */
export const toggleSelection = (ids: readonly string[], id: string): readonly string[] =>
  ids.includes(id) ? ids.filter((selected) => selected !== id) : [...ids, id];
