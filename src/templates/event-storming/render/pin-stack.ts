/** Hotspot pin: a smaller sticky hung over one note's top-right corner. */
export const PIN_W = 92;
/** A pin's height while its name is short; a longer name makes it taller. */
export const PIN_H = 54;
/** Kept clear of the card's own + Hotspot chip, which hugs that corner. */
const PIN_CLEARANCE = 18;
/** Vertical gap between several pins on the same note: never overlapping. */
const PIN_GAP = 4;

/** Where one note's pins hang, measured upward from that note's top edge. */
export type PinStack = {
  /** Each pin's bottom edge, in the order the pins stack. */
  readonly lifts: readonly number[];
  /** How far the topmost pin reaches (0 when there are none). */
  readonly extent: number;
};

/**
 * Stacks a note's pins upward by their rendered heights, so a pin whose name
 * wraps onto more lines grows away from its note and pushes the next one up.
 */
export const stackPins = (heights: readonly number[]): PinStack => {
  const lifts: number[] = [];
  let edge = PIN_CLEARANCE;
  for (const height of heights) {
    lifts.push(edge);
    edge += height + PIN_GAP;
  }
  return { lifts, extent: heights.length === 0 ? 0 : edge - PIN_GAP };
};
