import type { StatusIcon, StatusTone, UserStory, UsmState } from './model';

import { doneStatusIndexOf } from './done-status';

/** A status as the map shows it: its color, its icon and how far along the workflow it sits. */
export type StatusView = {
  readonly id: string;
  readonly name: string;
  readonly tone: StatusTone;
  readonly icon: StatusIcon;
  /** 0 for the first status, 1 for the done one and past it; the progress ring fills up accordingly. */
  readonly progress: number;
};

/** One part of a stacked bar: a status and how many stories stand there. */
export type StatusSegment = StatusView & { readonly count: number };

export const statusViews = (state: UsmState): readonly StatusView[] => {
  const done = doneStatusIndexOf(state);
  return state.statuses.map((status, index) => ({
    id: status.id,
    name: status.name,
    tone: status.tone,
    icon: status.icon,
    progress: progressAt(index, done),
  }));
};

/** How far along the workflow the status at `index` sits, with the done one at `done`. */
export const progressAt = (index: number, done: number): number => (done <= 0 ? 1 : Math.min(1, index / done));

export const statusViewOf = (views: readonly StatusView[], story: UserStory): StatusView | undefined => {
  return views.find((view) => view.id === story.statusId);
};

/**
 * How `stories` spread over the statuses, in workflow order. Empty parts are
 * left out; no statuses at all, no parts.
 */
export const statusDistribution = (state: UsmState, stories: readonly UserStory[]): readonly StatusSegment[] => {
  return statusViews(state)
    .map((view) => ({ ...view, count: stories.filter((story) => story.statusId === view.id).length }))
    .filter((segment) => segment.count > 0);
};
