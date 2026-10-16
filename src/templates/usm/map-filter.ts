import type { Navigation } from '../../core/types';

import { hasFeature, type UserStory, type UsmState } from './model';

/** What the map can be filtered by; each is its own navigation key (`#status=ready,done&label=dev`). */
export const MAP_FILTER_KEYS = ['status', 'label', 'estimate', 'assignee'] as const;

export type MapFilterKey = (typeof MAP_FILTER_KEYS)[number];

/** The choice for stories without a label, an estimate or an assignee; no id can take it (ids have no `~`). */
export const NO_VALUE = '~none';

/** The choices on per filter; an empty set means that filter is off. */
export type MapFilter = { readonly [key in MapFilterKey]: ReadonlySet<string> };

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
  const read = (key: MapFilterKey): ReadonlySet<string> => {
    const raw = nav[key];
    if (raw === undefined || raw === '') return new Set();
    const wanted = new Set(raw.split(','));
    return new Set(filterOptionIds(state, key).filter((id) => wanted.has(id)));
  };
  return { status: read('status'), label: read('label'), estimate: read('estimate'), assignee: read('assignee') };
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

/** A story shows when it matches one choice of every filter that is on. */
export const passesMapFilter = (filter: MapFilter, story: UserStory): boolean => {
  const labelIds = story.labelIds ?? [];
  return (
    matches(filter.status, story.statusId === undefined ? [] : [story.statusId]) &&
    matches(filter.label, labelIds.length === 0 ? [NO_VALUE] : labelIds) &&
    matches(filter.estimate, [story.estimateId ?? NO_VALUE]) &&
    matches(filter.assignee, [story.assigneeId ?? NO_VALUE])
  );
};

const matches = (selected: ReadonlySet<string>, values: readonly string[]): boolean =>
  selected.size === 0 || values.some((value) => selected.has(value));
