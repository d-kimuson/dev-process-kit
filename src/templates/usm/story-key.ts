import { findStory, type UserStory, type UsmState } from './model';

const KEY_PREFIX = 'STORY-';

/** The key people call a story by: `STORY-12`. */
export const storyKey = (story: Pick<UserStory, 'number'>): string => `${KEY_PREFIX}${story.number}`;

/** The number a new story takes: one after the highest on the map. */
export const nextStoryNumber = (state: UsmState): number =>
  Math.max(0, ...state.stories.map((story) => story.number)) + 1;

/**
 * The story `ref` names, by its id or by its key (`STORY-12`, any case). An
 * id wins over a key, so a story whose id looks like a key keeps it.
 */
export const findStoryByRef = (state: UsmState, ref: string | undefined): UserStory | undefined => {
  if (ref === undefined) return undefined;
  const byId = findStory(state, ref);
  if (byId) return byId;
  const match = new RegExp(`^${KEY_PREFIX}([1-9]\\d*)$`, 'i').exec(ref.trim());
  if (!match) return undefined;
  const number = Number(match[1]);
  return state.stories.find((story) => story.number === number);
};
