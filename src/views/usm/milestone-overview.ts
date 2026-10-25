import { flatSteps, type UsmState } from './model';
import { statusDistribution, type StatusSegment } from './status-view';

export type MilestoneCard = {
  readonly id: string;
  /** Position among the milestones, 1-based. */
  readonly ordinal: number;
  readonly name: string;
  /** `''` when the milestone leaves it out. */
  readonly timeframe: string;
  /** `''` when the milestone leaves it out. */
  readonly description: string;
  readonly storyCount: number;
  /** Fraction of every story on the map (0 on an empty map). */
  readonly share: number;
  /** Backbone steps with at least one story of this milestone, of all steps. */
  readonly coverage: { readonly covered: number; readonly total: number };
  /** How far its stories have come: their spread over the statuses; empty without statuses. */
  readonly progress: readonly StatusSegment[];
};

/**
 * The milestones tab: what each slice is for, when it is due and how big it
 * is. The stories themselves stay on the map.
 */
export const presentMilestoneOverview = (state: UsmState): readonly MilestoneCard[] => {
  const totalStories = state.stories.length;
  const steps = flatSteps(state);
  return state.milestones.map((milestone, index) => {
    const stories = state.stories.filter((story) => story.milestoneId === milestone.id);
    const coveredSteps = new Set(stories.map((story) => story.stepId));
    return {
      id: milestone.id,
      ordinal: index + 1,
      name: milestone.name,
      timeframe: milestone.timeframe?.trim() ?? '',
      description: milestone.description?.trim() ?? '',
      storyCount: stories.length,
      share: totalStories === 0 ? 0 : stories.length / totalStories,
      coverage: { covered: steps.filter(({ step }) => coveredSteps.has(step.id)).length, total: steps.length },
      progress: statusDistribution(state, stories),
    };
  });
};
