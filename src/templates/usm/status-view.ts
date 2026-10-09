import type { Navigation } from '../../core/types';
import type { StatusIcon, StatusTone, UserStory, UsmState } from './model';

/** A status as the map shows it: its color, its icon and how far along the workflow it sits. */
export type StatusView = {
  readonly id: string;
  readonly name: string;
  readonly tone: StatusTone;
  readonly icon: StatusIcon;
  /** 0 for the first status, 1 for the last; the progress ring fills up accordingly. */
  readonly progress: number;
};

/** One part of a stacked bar: a status and how many stories stand there. */
export type StatusSegment = StatusView & { readonly count: number };

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
 * How `stories` spread over the statuses, in workflow order. Empty parts are
 * left out; no statuses at all, no parts.
 */
export const statusDistribution = (state: UsmState, stories: readonly UserStory[]): readonly StatusSegment[] => {
  return statusViews(state)
    .map((view) => ({ ...view, count: stories.filter((story) => story.statusId === view.id).length }))
    .filter((segment) => segment.count > 0);
};

/** The statuses the map is filtered to (`#status=ready,done`). Empty means no filter: every story shows. */
export const statusFilterOf = (state: UsmState, nav: Navigation): ReadonlySet<string> => {
  const raw = nav['status'];
  if (raw === undefined || raw === '') return new Set();
  const wanted = new Set(raw.split(','));
  return new Set(state.statuses.map((status) => status.id).filter((id) => wanted.has(id)));
};

/** The filter as navigation: canonical order, unknown ids dropped, `null` when off. */
export const statusFilterParam = (state: UsmState, filter: ReadonlySet<string>): string | null => {
  const ids = state.statuses.map((status) => status.id).filter((id) => filter.has(id));
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
  return story.statusId !== undefined && filter.has(story.statusId);
};
