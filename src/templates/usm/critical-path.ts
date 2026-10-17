import type { Navigation } from '../../core/types';

import { measureOf, pointsOf, remainingSharesOf } from './burndown';
import { isFinished } from './dependencies';
import { type UserStory, type UsmState } from './model';

/** What the map can highlight, as the navigation names it (`#highlight=critical-path`). */
export const HIGHLIGHTS = ['critical-path'] as const;

export type Highlight = (typeof HIGHLIGHTS)[number];

export const highlightOf = (nav: Navigation): Highlight | null =>
  HIGHLIGHTS.find((highlight) => highlight === nav['highlight']) ?? null;

/**
 * The work a story has left, by the measure the burndown uses: one while the
 * stories are counted, else its points, weighed by the share of its work
 * still ahead. A story without a status stands in the first one.
 */
export const remainingWorkOf = (state: UsmState, story: UserStory): number => {
  if (isFinished(state, story)) return 0;
  const points = measureOf(state) === 'stories' ? 1 : pointsOf(state, story);
  const index = Math.max(
    0,
    state.statuses.findIndex((status) => status.id === story.statusId),
  );
  return points * (remainingSharesOf(state)[index] ?? 1);
};

/** The stories the critical path runs through and the work left along it. */
export type CriticalPath = { readonly ids: ReadonlySet<string>; readonly work: number };

/** The stories the map highlights as critical, or `null` while it highlights nothing. */
export const highlightedStoriesOf = (state: UsmState, nav: Navigation): ReadonlySet<string> | null =>
  highlightOf(nav) === 'critical-path' ? criticalPathOf(state).ids : null;

/** Weights can be fractions; sums along two paths that tie must still compare equal. */
const EPSILON = 1e-9;

/**
 * The critical path: the chain of unfinished stories, each waiting on the one
 * before, with the most work left. However many hands there are, the map is
 * not done before this chain is, so its stories are the ones to put first.
 * Every chain that ties for the longest is part of it. Finished stories no
 * longer hold anyone up, so a chain breaks where one stands.
 */
export const criticalPathOf = (state: UsmState): CriticalPath => {
  const work = new Map(
    state.stories.map((story) => [story.id, remainingWorkOf(state, story)] as const).filter(([, left]) => left > 0),
  );
  const blockers = new Map<string, string[]>();
  const dependents = new Map<string, string[]>();
  for (const story of state.stories) {
    if (!work.has(story.id)) continue;
    for (const blockerId of story.blockedBy ?? []) {
      if (!work.has(blockerId)) continue;
      blockers.set(story.id, [...(blockers.get(story.id) ?? []), blockerId]);
      dependents.set(blockerId, [...(dependents.get(blockerId) ?? []), story.id]);
    }
  }
  const upTo = longestThrough(work, blockers);
  const onFrom = longestThrough(work, dependents);
  const through = [...work].map(([id, left]) => [id, upTo(id) + onFrom(id) - left] as const);
  const longest = Math.max(0, ...through.map(([, length]) => length));
  return {
    ids: new Set(through.filter(([, length]) => longest - length < EPSILON).map(([id]) => id)),
    work: longest,
  };
};

/** The most work along any chain that starts at a story and follows `next`, the story's own work included. */
const longestThrough = (
  work: ReadonlyMap<string, number>,
  next: ReadonlyMap<string, readonly string[]>,
): ((id: string) => number) => {
  const known = new Map<string, number>();
  const length = (id: string): number => {
    const cached = known.get(id);
    if (cached !== undefined) return cached;
    // The dependency graph has no cycles (the model rejects them), so this ends.
    const result = (work.get(id) ?? 0) + Math.max(0, ...(next.get(id) ?? []).map(length));
    known.set(id, result);
    return result;
  };
  return length;
};
