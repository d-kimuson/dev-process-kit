export type Box = {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
};

export type ComposedBoxes = {
  /** The picture: the parts' union, cut to the frame. */
  readonly box: Box;
  /** Each part relative to the picture, whole (the picture cuts it); `null` when wholly outside the frame. */
  readonly parts: readonly (Box | null)[];
};

const intersect = (a: Box, b: Box): Box | null => {
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  const right = Math.min(a.left + a.width, b.left + b.width);
  const bottom = Math.min(a.top + a.height, b.top + b.height);
  return right > left && bottom > top ? { left, top, width: right - left, height: bottom - top } : null;
};

/**
 * One picture of several boxes seen through `frame` (a scrolling box): where
 * the picture is, and where each part lands in it. `null` when none shows.
 */
export const composeBoxes = (frame: Box, parts: readonly Box[]): ComposedBoxes | null => {
  const shown = parts.flatMap((part) => {
    const visible = intersect(frame, part);
    return visible ? [visible] : [];
  });
  const first = shown[0];
  if (!first) return null;
  const left = Math.min(...shown.map((part) => part.left));
  const top = Math.min(...shown.map((part) => part.top));
  const right = Math.max(...shown.map((part) => part.left + part.width));
  const bottom = Math.max(...shown.map((part) => part.top + part.height));
  return {
    box: { left, top, width: right - left, height: bottom - top },
    parts: parts.map((part) =>
      intersect(frame, part)
        ? { left: part.left - left, top: part.top - top, width: part.width, height: part.height }
        : null,
    ),
  };
};
