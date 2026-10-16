import type { Navigation } from '../../core/types';

/**
 * The pages of the template: the story map itself, the milestones it is
 * sliced into, the statuses its stories move through, the labels they carry and
 * how the milestones burn down (with the estimate scale). Which one is on
 * screen is navigation, never a draft action.
 */
export const USM_TABS = ['map', 'milestones', 'statuses', 'labels', 'burndown'] as const;

export type UsmTab = (typeof USM_TABS)[number];

export const usmTabOf = (nav: Navigation): UsmTab => {
  return USM_TABS.find((tab) => tab === nav['tab']) ?? 'map';
};
