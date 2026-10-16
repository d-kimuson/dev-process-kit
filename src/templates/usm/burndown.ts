import { sortBy } from 'es-toolkit/array';

import {
  findEstimate,
  hasFeature,
  tallyKey,
  type Milestone,
  type StoryStatus,
  type TallyRow,
  type UserStory,
  type UsmState,
} from './model';

/** What the burndown counts: stories, or the points of their estimates. */
export const BURNDOWN_UNITS = ['points', 'stories'] as const;

export type BurndownUnit = (typeof BURNDOWN_UNITS)[number];

/**
 * The milestone the burndown shows: the one the navigation names, else the
 * first with a due date (that is what a burndown aims at), else the first.
 */
export const burndownMilestoneOf = (state: UsmState, nav: Readonly<Record<string, string>>): Milestone | undefined =>
  state.milestones.find((milestone) => milestone.id === nav['milestone']) ??
  state.milestones.find((milestone) => milestone.dueDate !== undefined) ??
  state.milestones[0];

/** What the burndown counts: what the navigation names, else points once the map has an estimate scale. */
export const burndownUnitOf = (state: UsmState, nav: Readonly<Record<string, string>>): BurndownUnit =>
  BURNDOWN_UNITS.find((unit) => unit === nav['unit']) ?? (state.estimates.length > 0 ? 'points' : 'stories');

/** A status's weight: its part of a story's work. One unless the map says otherwise. */
export const statusWeight = (status: StoryStatus): number => status.weight ?? 1;

/** What the weights of every status but the last add up to when they are read as parts. */
export const WEIGHT_TOTAL = 10;

/** Whether the work left is weighted: switched on, and the estimates it is part of with it. */
export const isWeighted = (state: UsmState): boolean => state.weighted && hasFeature(state, 'estimates');

/**
 * For each status, the share of a story's work still ahead of a story there.
 * Weighted, every status but the last holds its weight's part of the work
 * (equal parts while no status weighs anything); unweighted, the whole of
 * it is ahead until the story reaches the last status.
 */
export const remainingSharesOf = (state: UsmState): readonly number[] => {
  const { statuses } = state;
  if (!isWeighted(state)) return statuses.map((_status, index) => (index < statuses.length - 1 ? 1 : 0));
  const weights = statuses.slice(0, -1).map(statusWeight);
  const total = sum(weights);
  const shares = weights.map((weight) => (total > 0 ? weight / total : 1 / weights.length));
  return statuses.map((_status, index) => sum(shares.slice(index)));
};

/** What a story not estimated yet counts as: the smallest whole size, so it is never left out of the work. */
const UNESTIMATED_POINTS = 1;

/** A story's points; one not estimated yet counts as `UNESTIMATED_POINTS`. */
export const pointsOf = (state: UsmState, story: UserStory): number =>
  findEstimate(state, story.estimateId)?.points ?? UNESTIMATED_POINTS;

/**
 * The map's totals right now, one row per milestone and status that has a
 * story: the milestones in map order and the unassigned stories last, each
 * in status order. This is what a snapshot records.
 */
export const tallyOf = (state: UsmState): readonly TallyRow[] => {
  const rows = new Map<string, { milestoneId?: string; statusId?: string; stories: number; points: number }>();
  for (const story of state.stories) {
    const where = {
      ...(story.milestoneId === undefined ? {} : { milestoneId: story.milestoneId }),
      ...(story.statusId === undefined ? {} : { statusId: story.statusId }),
    };
    const key = tallyKey(where);
    const row = rows.get(key) ?? { ...where, stories: 0, points: 0 };
    rows.set(key, { ...row, stories: row.stories + 1, points: row.points + pointsOf(state, story) });
  }
  const milestoneOrder = [...state.milestones.map((milestone) => milestone.id), undefined];
  const statusOrder = state.statuses.length === 0 ? [undefined] : state.statuses.map((status) => status.id);
  return milestoneOrder.flatMap((milestoneId) =>
    statusOrder.flatMap((statusId) => {
      const row = rows.get(tallyKey({ milestoneId, statusId }));
      return row ? [row] : [];
    }),
  );
};

/** One point of a burndown line: a snapshot, or (without `snapshotId`) the map as it is now. */
export type BurndownPoint = {
  readonly at: number;
  readonly value: number;
  readonly snapshotId?: string;
};

export type Burndown = {
  /** The end of the milestone's due day, or `null` when it has none. */
  readonly due: number | null;
  /** The work left: each story's amount times the share of it still ahead (see `remainingSharesOf`). */
  readonly combined: readonly BurndownPoint[];
  /** For each status a story can reach (all but the first): how much has not reached it yet. */
  readonly byStatus: readonly { readonly status: StoryStatus; readonly points: readonly BurndownPoint[] }[];
};

/**
 * The burndown of one milestone: each snapshot in time order, then the map
 * as it stands at `now`. A snapshot counts the milestone's stories as they
 * stood then, so stories added to the slice later show as a rise.
 */
export const burndownOf = (state: UsmState, milestoneId: string, unit: BurndownUnit, now: number): Burndown => {
  const moments: readonly { at: number; tally: readonly TallyRow[]; snapshotId?: string }[] = [
    ...sortBy(
      state.snapshots.map((snapshot) => ({
        at: Date.parse(snapshot.at),
        tally: snapshot.tally,
        snapshotId: snapshot.id,
      })),
      [(moment) => moment.at],
    ),
    { at: now, tally: tallyOf(state) },
  ];
  const amounts = moments.map((moment) => ({
    at: moment.at,
    ...(moment.snapshotId === undefined ? {} : { snapshotId: moment.snapshotId }),
    values: amountsByStatus(state.statuses, moment.tally, milestoneId, unit),
  }));
  const ahead = remainingSharesOf(state);
  const point = (moment: (typeof amounts)[number], value: number): BurndownPoint => ({
    at: moment.at,
    value,
    ...(moment.snapshotId === undefined ? {} : { snapshotId: moment.snapshotId }),
  });
  return {
    due: dueAt(state.milestones.find((milestone) => milestone.id === milestoneId)?.dueDate),
    combined: amounts.map((moment) =>
      point(
        moment,
        moment.values.reduce((sum, value, index) => sum + value * (ahead[index] ?? 0), 0),
      ),
    ),
    byStatus: state.statuses.slice(1).map((status, index) => ({
      status,
      points: amounts.map((moment) => point(moment, sum(moment.values.slice(0, index + 1)))),
    })),
  };
};

/** The amount (stories or points) in each status, in status order, for one milestone's rows. */
const amountsByStatus = (
  statuses: readonly StoryStatus[],
  tally: readonly TallyRow[],
  milestoneId: string,
  unit: BurndownUnit,
): readonly number[] =>
  statuses.map((status) =>
    sum(
      tally
        .filter((row) => row.milestoneId === milestoneId && row.statusId === status.id)
        .map((row) => (unit === 'points' ? row.points : row.stories)),
    ),
  );

/** The last moment of the due day, in the reader's time zone. */
export const dueAt = (dueDate: string | undefined): number | null => {
  if (dueDate === undefined) return null;
  const [year = 0, month = 1, day = 1] = dueDate.split('-').map(Number);
  return new Date(year, month - 1, day, 23, 59, 59).getTime();
};

/** A moment as the reader reads it: the local date and time to the minute. */
export const momentLabel = (at: string | number): string => {
  const date = new Date(at);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const sum = (values: readonly number[]): number => values.reduce((total, value) => total + value, 0);
