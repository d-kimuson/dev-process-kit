import { describe, expect, it } from 'vitest';

import { parseUsmBase } from './model';
import { moveWeightDivider, weightChangesOf, weightDividersOf, weightsBetween } from './weight-split';

const statusesOf = (weights: readonly (number | undefined)[]) =>
  parseUsmBase({
    activities: [],
    statuses: [
      ...weights.map((weight, index) => ({
        id: `w${index}`,
        name: `W${index}`,
        ...(weight === undefined ? {} : { weight }),
      })),
      { id: 'done', name: 'Done' },
    ],
    stories: [],
  }).statuses;

describe('usm weight split', () => {
  it('puts the lines between the statuses where their weights, read as parts of 10, meet', () => {
    expect(weightDividersOf(statusesOf([7, 2, 1]))).toEqual([7, 9]);
    expect(weightDividersOf(statusesOf([2, 1, 1]))).toEqual([5, 7.5]);
    expect(weightDividersOf(statusesOf([0, 0]))).toEqual([5]);
    expect(weightDividersOf(statusesOf([undefined, undefined]))).toEqual([5]);
    // one status holds all of the work, and the last holds none: nothing to split
    expect(weightDividersOf(statusesOf([5]))).toEqual([]);
    expect(weightDividersOf(statusesOf([]))).toEqual([]);
  });

  it('moves a line to the whole part nearest, between its neighbors', () => {
    expect(moveWeightDivider([7, 9], 0, 3.4)).toEqual([3, 9]);
    expect(moveWeightDivider([7, 9], 0, 9.6)).toEqual([9, 9]);
    expect(moveWeightDivider([7, 9], 0, -1)).toEqual([0, 9]);
    expect(moveWeightDivider([7, 9], 1, 12)).toEqual([7, 10]);
    expect(moveWeightDivider([7, 9], 2, 5)).toEqual([7, 9]);
  });

  it('reads the part of each status off the lines', () => {
    expect(weightsBetween([3, 9])).toEqual([3, 6, 1]);
    expect(weightsBetween([])).toEqual([10]);
  });

  it('sets the weight of each status whose part changed, in whole parts of 10', () => {
    expect(weightChangesOf(statusesOf([7, 2, 1]), [3, 9])).toEqual([
      { statusId: 'w0', weight: 3 },
      { statusId: 'w1', weight: 6 },
    ]);
    // a ratio is rewritten as parts of 10, and the lines left between parts snap to the nearest
    expect(weightChangesOf(statusesOf([1, 1, 1]), [4, 6.666666666666667])).toEqual([
      { statusId: 'w0', weight: 4 },
      { statusId: 'w1', weight: 3 },
      { statusId: 'w2', weight: 3 },
    ]);
    expect(weightChangesOf(statusesOf([7, 2, 1]), [7, 9])).toEqual([]);
  });
});
