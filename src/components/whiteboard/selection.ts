/** Shift-click: adds `id` to the selection, or takes it out when it is already in. */
export const toggleSelection = (ids: readonly string[], id: string): readonly string[] =>
  ids.includes(id) ? ids.filter((selected) => selected !== id) : [...ids, id];
