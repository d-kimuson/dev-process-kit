import type { StoryStatus } from './model';

import { statusWeight, WEIGHT_TOTAL } from './burndown';

/**
 * Where the lines between the statuses that share a story's work (every
 * status but the last) sit on a scale of 0 to `WEIGHT_TOTAL`: one line
 * between each two of them. Weights of another total are scaled to it, and
 * no weight at all splits it evenly.
 */
export const weightDividersOf = (statuses: readonly StoryStatus[]): readonly number[] => {
  const weights = statuses.slice(0, -1).map(statusWeight);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const parts = weights.map((weight) => (total > 0 ? (weight / total) * WEIGHT_TOTAL : WEIGHT_TOTAL / weights.length));
  return parts.slice(0, -1).map((_part, index) => parts.slice(0, index + 1).reduce((sum, part) => sum + part, 0));
};

/** The lines with one moved to the whole part nearest `to`, kept between the lines (or the ends) beside it. */
export const moveWeightDivider = (dividers: readonly number[], index: number, to: number): readonly number[] => {
  if (index < 0 || index >= dividers.length) return dividers;
  const min = dividers[index - 1] ?? 0;
  const max = dividers[index + 1] ?? WEIGHT_TOTAL;
  return dividers.map((divider, at) => (at === index ? Math.min(max, Math.max(min, Math.round(to))) : divider));
};

/** The part of each status, read off the lines: from one line (or the start) to the next (or the end). */
export const weightsBetween = (dividers: readonly number[]): readonly number[] =>
  [...dividers, WEIGHT_TOTAL].map((divider, index) => divider - (dividers[index - 1] ?? 0));

/**
 * The weight each status takes for the lines, in whole parts of 10 (a line
 * not on a whole part snaps to the nearest), for the statuses whose weight
 * it changes.
 */
export const weightChangesOf = (
  statuses: readonly StoryStatus[],
  dividers: readonly number[],
): readonly { readonly statusId: string; readonly weight: number }[] => {
  const weights = weightsBetween(dividers.map((divider) => Math.round(divider)));
  return statuses.slice(0, -1).flatMap((status, index) => {
    const weight = weights[index] ?? 0;
    return status.weight === weight ? [] : [{ statusId: status.id, weight }];
  });
};
