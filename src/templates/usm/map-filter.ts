import type { Navigation } from '../../core/types';

import { isFinishedStatus } from './done-status';
import { hasFeature, type UserStory, type UsmState } from './model';

/** What the map can be filtered by; each is its own navigation key (`#status=ready,done&label=dev`). */
export const MAP_FILTER_KEYS = ['status', 'label', 'estimate', 'assignee'] as const;

export type MapFilterKey = (typeof MAP_FILTER_KEYS)[number];

/** The choice for stories without a label, an estimate or an assignee; no id can take it (ids have no `~`). */
export const NO_VALUE = '~none';

/** The navigation that brings the finished stories onto the map (`#done=show`); they are left out without it. */
export const SHOW_FINISHED = { key: 'done', value: 'show' } as const;

/**
 * The choices on per filter (an empty set means that filter is off), and the
 * statuses whose stories are left out: the done one and those past it, the
 * finished stories, until the reader shows them. A map with fewer than two
 * statuses leaves nothing out.
 */
export type MapFilter = { readonly [key in MapFilterKey]: ReadonlySet<string> } & {
  readonly hiddenStatusIds: ReadonlySet<string>;
};

/** The statuses the map leaves out: the finished ones, unless the reader shows them or the map has a single status. */
export const hiddenStatusesOf = (state: UsmState, nav: Navigation): ReadonlySet<string> => {
  if (nav[SHOW_FINISHED.key] === SHOW_FINISHED.value || state.statuses.length < 2) return new Set();
  return new Set(state.statuses.filter((status) => isFinishedStatus(state, status.id)).map((status) => status.id));
};

/**
 * What a filter offers, in map order: the statuses, or the labels / estimates
 * / members and then "none". A feature that is off offers nothing.
 */
export const filterOptionIds = (state: UsmState, key: MapFilterKey): readonly string[] => {
  switch (key) {
    case 'status':
      return state.statuses.map((status) => status.id);
    case 'label':
      return state.labels.length === 0 ? [] : [...state.labels.map((label) => label.id), NO_VALUE];
    case 'estimate':
      return !hasFeature(state, 'estimates') || state.estimates.length === 0
        ? []
        : [...state.estimates.map((estimate) => estimate.id), NO_VALUE];
    case 'assignee':
      return !hasFeature(state, 'assignees') || state.members.length === 0
        ? []
        : [...state.members.map((member) => member.id), NO_VALUE];
  }
};

/** The filters the navigation names; ids the map does not offer are dropped. */
export const mapFilterOf = (state: UsmState, nav: Navigation): MapFilter => {
  const hiddenStatusIds = hiddenStatusesOf(state, nav);
  const read = (key: MapFilterKey): ReadonlySet<string> => {
    const raw = nav[key];
    if (raw === undefined || raw === '') return new Set();
    const wanted = new Set(raw.split(','));
    return new Set(filterOptionIds(state, key).filter((id) => wanted.has(id) && !hiddenStatusIds.has(id)));
  };
  return {
    status: read('status'),
    label: read('label'),
    estimate: read('estimate'),
    assignee: read('assignee'),
    hiddenStatusIds,
  };
};

/** One filter as navigation: in map order, `null` when it is off. */
export const mapFilterParam = (state: UsmState, key: MapFilterKey, selected: ReadonlySet<string>): string | null => {
  const ids = filterOptionIds(state, key).filter((id) => selected.has(id));
  return ids.length === 0 ? null : ids.join(',');
};

export const toggleFilterValue = (selected: ReadonlySet<string>, id: string): ReadonlySet<string> => {
  const next = new Set(selected);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
};

export const isFiltered = (filter: MapFilter): boolean => MAP_FILTER_KEYS.some((key) => filter[key].size > 0);

/** A story shows when it does not stand in a status left out and matches one choice of every filter that is on. */
export const passesMapFilter = (filter: MapFilter, story: UserStory): boolean => {
  const labelIds = story.labelIds ?? [];
  return (
    (story.statusId === undefined || !filter.hiddenStatusIds.has(story.statusId)) &&
    matches(filter.status, story.statusId === undefined ? [] : [story.statusId]) &&
    matches(filter.label, labelIds.length === 0 ? [NO_VALUE] : labelIds) &&
    matches(filter.estimate, [story.estimateId ?? NO_VALUE]) &&
    matches(filter.assignee, [story.assigneeId ?? NO_VALUE])
  );
};

const matches = (selected: ReadonlySet<string>, values: readonly string[]): boolean =>
  selected.size === 0 || values.some((value) => selected.has(value));
