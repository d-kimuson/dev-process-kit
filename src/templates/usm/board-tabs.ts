import type { Navigation } from '../../core/types';

/**
 * The pages of the template: the story map itself, the milestones it is
 * sliced into and the statuses its stories move through. Which one is on
 * screen is navigation, never a draft action.
 */
export type UsmTab = 'map' | 'milestones' | 'statuses';

export const usmTabOf = (nav: Navigation): UsmTab => {
  const tab = nav['tab'];
  return tab === 'milestones' || tab === 'statuses' ? tab : 'map';
};
