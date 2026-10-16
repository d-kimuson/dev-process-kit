import { matchesQuery } from '../../lib/search';
import { blockerOptions, dependentOptions } from './dependencies';
import { findStep, type UserStory, type UsmState } from './model';

/** Which end of an edge the story panel adds: what the story waits on, or what waits on it. */
export type DependencySide = 'blocker' | 'dependent';

/** One story a dependency picker offers, with where it sits so like-named stories tell apart. */
export type DependencyChoice = {
  readonly story: UserStory;
  /** Its activity and step names. */
  readonly place: readonly string[];
};

/**
 * The stories the story's picker offers on one side (only those that keep
 * the graph free of cycles), narrowed to the ones whose name or place holds
 * every word of the query.
 */
export const dependencyChoices = (
  state: UsmState,
  storyId: string,
  side: DependencySide,
  query: string,
): readonly DependencyChoice[] => {
  const options = side === 'blocker' ? blockerOptions(state, storyId) : dependentOptions(state, storyId);
  return options.flatMap((story) => {
    const located = findStep(state, `${story.activityId}.${story.stepId}`);
    const place = located ? [located.activity.name, located.step.name] : [];
    return matchesQuery([story.name, ...place].join(' '), query) ? [{ story, place }] : [];
  });
};
