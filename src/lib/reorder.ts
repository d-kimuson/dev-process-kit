import type { DropPlace } from './dom/drag';

/**
 * The `after` anchor (`null` = first) of dropping `draggedId` on `hoveredId`,
 * where `ids` is the destination's order as it is now.
 *
 * Within its own list the dragged item takes the hovered item's slot — after
 * it when moving down, before it when moving up — whichever half is hovered.
 * Splitting at the midpoint there would make the near half of a neighbour a
 * no-op, so a drop on the upper half of the next row would not swap.
 * An item coming from another list goes above or below the hovered one by the
 * midpoint (`place`), and empty space appends.
 */
export const reorderAnchor = (
  ids: readonly string[],
  draggedId: string,
  hoveredId: string | null,
  place: DropPlace,
): string | null => {
  const rest = ids.filter((id) => id !== draggedId);
  const last = rest.at(-1) ?? null;
  if (hoveredId === null || place === 'end') return last;
  const from = ids.indexOf(draggedId);
  const to = ids.indexOf(hoveredId);
  if (to < 0) return last;
  // `at(-1)` would wrap to the last item, so the first slot is spelled out
  const before = (index: number): string | null => (index <= 0 ? null : (ids.at(index - 1) ?? null));
  if (from >= 0) return from < to ? hoveredId : before(to);
  return place === 'after' ? hoveredId : before(to);
};
