/**
 * A `clip-path` for `box` with `holes` cut out of it, so the pointer passes
 * through the holes to what lies beneath. Every rect is in viewport
 * coordinates; a hole is trimmed to the box, and one outside it is dropped.
 */
export const clipOutRects = (box: DOMRectReadOnly, holes: readonly DOMRectReadOnly[]): string => {
  const cuts = holes.flatMap((hole) => {
    const left = Math.max(hole.left, box.left) - box.left;
    const top = Math.max(hole.top, box.top) - box.top;
    const width = Math.min(hole.right, box.right) - box.left - left;
    const height = Math.min(hole.bottom, box.bottom) - box.top - top;
    return width > 0 && height > 0 ? [`M${left} ${top}h${width}v${height}h-${width}Z`] : [];
  });
  if (cuts.length === 0) return 'none';
  return `path(evenodd, 'M0 0H${box.width}V${box.height}H0Z ${cuts.join(' ')}')`;
};
