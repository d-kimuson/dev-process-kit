import type { Navigation } from '../../core/types';

/**
 * The two pages of the template: the story map itself, and the milestones it
 * is sliced into. Which one is on screen is navigation, never a draft action.
 */
export type UsmTab = 'map' | 'milestones';

export const usmTabOf = (nav: Navigation): UsmTab => {
  return nav['tab'] === 'milestones' ? 'milestones' : 'map';
};
