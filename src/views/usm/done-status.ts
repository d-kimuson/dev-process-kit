import type { StoryStatus, UsmState } from './model';

/** Where the status a story is done at stands in the workflow: the one the map names, else the last; -1 without statuses. */
export const doneStatusIndexOf = (state: UsmState): number => {
  const named = state.statuses.findIndex((status) => status.id === state.doneStatusId);
  return named >= 0 ? named : state.statuses.length - 1;
};

/** The status a story is done at, or `undefined` for a map without statuses. */
export const doneStatusOf = (state: UsmState): StoryStatus | undefined => state.statuses[doneStatusIndexOf(state)];

/** Whether a story standing in the status is done: at the done status or past it. */
export const isFinishedStatus = (state: UsmState, statusId: string | undefined): boolean => {
  if (statusId === undefined) return false;
  const index = state.statuses.findIndex((status) => status.id === statusId);
  return index >= 0 && index >= doneStatusIndexOf(state);
};

/** The workflow a story goes through to be done: every status up to the done one, which ends it. */
export const statusesToDone = (state: UsmState): readonly StoryStatus[] =>
  state.statuses.slice(0, doneStatusIndexOf(state) + 1);
