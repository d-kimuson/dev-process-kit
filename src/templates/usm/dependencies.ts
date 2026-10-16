import { waitsOn } from './dependency-graph';
import { isFinishedStatus } from './done-status';
import { findStory, type UserStory, type UsmState } from './model';

/** How a story sits in the dependency graph. */
export type StoryDependency = {
  /** The stories it waits on, in the order it lists them. */
  readonly blockers: readonly string[];
  /** Of those, how many are not finished yet: while any is, the story cannot start. */
  readonly openBlockers: number;
  /** The stories that wait on it, in map order. Many of them make it a spike worth doing first. */
  readonly dependents: readonly string[];
};

/**
 * A story is finished once it stands in the done status or past it. A map
 * without statuses cannot tell, so every blocker stays open there.
 */
export const isFinished = (state: UsmState, story: UserStory): boolean => isFinishedStatus(state, story.statusId);

export const dependencyOf = (state: UsmState, storyId: string): StoryDependency => {
  const blockers = findStory(state, storyId)?.blockedBy ?? [];
  return {
    blockers,
    openBlockers: blockers.filter((id) => {
      const blocker = findStory(state, id);
      return blocker !== undefined && !isFinished(state, blocker);
    }).length,
    dependents: state.stories.filter((story) => story.blockedBy?.includes(storyId)).map((story) => story.id),
  };
};

/** The stories `storyId` could wait on next: not itself, not one already, and none that would close a cycle. */
export const blockerOptions = (state: UsmState, storyId: string): readonly UserStory[] => {
  const current = new Set(findStory(state, storyId)?.blockedBy ?? []);
  return state.stories.filter(
    (story) => story.id !== storyId && !current.has(story.id) && !waitsOn(state.stories, story.id, storyId),
  );
};

/** The stories that could wait on `storyId` next, by the same rules seen from the other end. */
export const dependentOptions = (state: UsmState, storyId: string): readonly UserStory[] => {
  return state.stories.filter(
    (story) =>
      story.id !== storyId && !story.blockedBy?.includes(storyId) && !waitsOn(state.stories, storyId, story.id),
  );
};
