import type { Navigation } from '../../core/types';
import type { StatusIcon, StatusTone, UserStory, UsmState } from './model';

/** The filter value that stands for "no status yet": never a valid entity id. */
export const NO_STATUS = '~';

/** A status as the map shows it: its color and how far along the workflow it sits. */
export type StatusView = {
  readonly id: string;
  readonly name: string;
  readonly tone: StatusTone;
  readonly icon: StatusIcon;
  /** 0 for the first status, 1 for the last; the icon fills up accordingly. */
  readonly progress: number;
};

/** One part of a stacked bar: a status (or `null`, no status) and how many stories stand there. */
export type StatusSegment = {
  readonly id: string | null;
  readonly name: string;
  readonly tone: StatusTone | null;
  readonly icon: StatusIcon | null;
  /** Where the status sits in the workflow (see `StatusView`); `undefined` for no status. */
  readonly progress: number | undefined;
  readonly count: number;
};

export const statusViews = (state: UsmState): readonly StatusView[] => {
  const last = state.statuses.length - 1;
  return state.statuses.map((status, index) => ({
    id: status.id,
    name: status.name,
    tone: status.tone,
    icon: status.icon,
    progress: last <= 0 ? 1 : index / last,
  }));
};

export const statusViewOf = (views: readonly StatusView[], story: UserStory): StatusView | undefined => {
  return views.find((view) => view.id === story.statusId);
};

/**
 * How `stories` spread over the statuses, in workflow order and then the ones
 * without a status. Empty parts are left out; no statuses at all, no parts.
 */
export const statusDistribution = (
  state: UsmState,
  stories: readonly UserStory[],
  unsetName: string,
): readonly StatusSegment[] => {
  if (state.statuses.length === 0) return [];
  const known = new Set(state.statuses.map((status) => status.id));
  const parts: StatusSegment[] = statusViews(state).map((status) => ({
    id: status.id,
    name: status.name,
    tone: status.tone,
    icon: status.icon,
    progress: status.progress,
    count: stories.filter((story) => story.statusId === status.id).length,
  }));
  parts.push({
    id: null,
    name: unsetName,
    tone: null,
    icon: null,
    progress: undefined,
    count: stories.filter((story) => story.statusId === undefined || !known.has(story.statusId)).length,
  });
  return parts.filter((part) => part.count > 0);
};

/**
 * The statuses the map is filtered to (`#status=ready,done`; `~` = no status).
 * Empty means no filter: every story shows.
 */
export const statusFilterOf = (state: UsmState, nav: Navigation): ReadonlySet<string> => {
  const raw = nav['status'];
  if (raw === undefined || raw === '') return new Set();
  const wanted = new Set(raw.split(','));
  const order = [...state.statuses.map((status) => status.id), NO_STATUS];
  return new Set(order.filter((id) => wanted.has(id)));
};

/** The filter as navigation: canonical order, unknown ids dropped, `null` when off. */
export const statusFilterParam = (state: UsmState, filter: ReadonlySet<string>): string | null => {
  const order = [...state.statuses.map((status) => status.id), NO_STATUS];
  const ids = order.filter((id) => filter.has(id));
  return ids.length === 0 ? null : ids.join(',');
};

export const toggleStatusFilter = (filter: ReadonlySet<string>, id: string): ReadonlySet<string> => {
  const next = new Set(filter);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
};

export const passesStatusFilter = (filter: ReadonlySet<string>, story: UserStory): boolean => {
  if (filter.size === 0) return true;
  return filter.has(story.statusId ?? NO_STATUS);
};

/** The icon source of a bar part or legend entry; `undefined` for no status. */
export const segmentIcon = (segment: StatusSegment): { icon: StatusIcon; progress: number | undefined } | undefined =>
  segment.icon === null ? undefined : { icon: segment.icon, progress: segment.progress };
