import type { Navigation } from '../../core/types';
import type { UsmMessages } from './messages';

import { findMilestone, type UsmState } from './model';

/**
 * The `milestone` navigation value of the Unassigned tab. `~` never appears in
 * an entity id, so it cannot shadow a milestone.
 */
export const UNASSIGNED_TAB = '~unassigned';

/** Which milestone rows the map shows: navigation, never a draft action. */
export type MilestoneFilter =
  | { readonly kind: 'all' }
  | { readonly kind: 'milestone'; readonly id: string }
  | { readonly kind: 'unassigned' };

export type MilestoneTab = {
  readonly label: string;
  /** The `milestone` navigation value the tab links to; `null` drops the key (All). */
  readonly value: string | null;
  readonly count: number;
  readonly selected: boolean;
};

/** The `milestone` key as the map can honour it, or `undefined` to drop it. */
export const canonicalMilestoneTab = (state: UsmState, value: string | undefined): string | undefined => {
  if (value === UNASSIGNED_TAB) return value;
  return findMilestone(state, value)?.id;
};

export const milestoneFilterOf = (state: UsmState, nav: Navigation): MilestoneFilter => {
  const value = canonicalMilestoneTab(state, nav['milestone']);
  if (value === undefined) return { kind: 'all' };
  return value === UNASSIGNED_TAB ? { kind: 'unassigned' } : { kind: 'milestone', id: value };
};

/** Whether the row of `milestoneId` (`undefined` = Unassigned) is on screen under `filter`. */
export const rowVisible = (filter: MilestoneFilter, milestoneId: string | undefined): boolean => {
  switch (filter.kind) {
    case 'all':
      return true;
    case 'unassigned':
      return milestoneId === undefined;
    case 'milestone':
      return milestoneId === filter.id;
  }
};

/** All, then one tab per milestone in map order, then Unassigned, each with its story count. */
export const presentMilestoneTabs = (m: UsmMessages, state: UsmState, nav: Navigation): readonly MilestoneTab[] => {
  const filter = milestoneFilterOf(state, nav);
  const countOf = (milestoneId: string | undefined): number =>
    state.stories.filter((story) => story.milestoneId === milestoneId).length;
  return [
    { label: m.allMilestonesTab, value: null, count: state.stories.length, selected: filter.kind === 'all' },
    ...state.milestones.map((milestone): MilestoneTab => ({
      label: milestone.name,
      value: milestone.id,
      count: countOf(milestone.id),
      selected: filter.kind === 'milestone' && filter.id === milestone.id,
    })),
    { label: m.unassigned, value: UNASSIGNED_TAB, count: countOf(undefined), selected: filter.kind === 'unassigned' },
  ];
};
