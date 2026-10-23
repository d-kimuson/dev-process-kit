export type TabsState = { readonly names: readonly string[]; readonly selected: number };

/** The tab to show: the one asked for by name when it exists, else the first. */
export const selectedIndex = (names: readonly string[], wanted: string | null): number => {
  const index = wanted === null ? -1 : names.indexOf(wanted);
  return index === -1 ? 0 : index;
};

/** Arrow keys move along the tab list and wrap; Home / End jump to its ends. */
export const keyTarget = (key: string, current: number, count: number): number | null => {
  if (count === 0) return null;
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return (current + 1) % count;
    case 'ArrowLeft':
    case 'ArrowUp':
      return (current - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
};
