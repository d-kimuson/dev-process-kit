import { sortBy } from 'es-toolkit/array';
import * as v from 'valibot';

import { entityIdSchema, splitPath } from '../../core/schema';

export type BackboneStep = {
  readonly id: string;
  readonly name: string;
};

export type BackboneActivity = {
  readonly id: string;
  readonly name: string;
  readonly steps: readonly BackboneStep[];
};

export type Milestone = {
  readonly id: string;
  readonly name: string;
};

export type UserStory = {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly activityId: string;
  readonly stepId: string;
  readonly milestoneId?: string;
};

export type UsmState = {
  readonly title?: string;
  readonly activities: readonly BackboneActivity[];
  readonly milestones: readonly Milestone[];
  readonly stories: readonly UserStory[];
};

const stepSchema = v.strictObject({ id: v.pipe(v.string(), v.minLength(1)), name: v.pipe(v.string(), v.minLength(1)) });
const activitySchema = v.strictObject({
  id: entityIdSchema,
  name: v.pipe(v.string(), v.minLength(1)),
  steps: v.optional(v.array(stepSchema), []),
});
const milestoneSchema = v.strictObject({
  id: v.pipe(v.string(), v.minLength(1)),
  name: v.pipe(v.string(), v.minLength(1)),
});
const storySchema = v.strictObject({
  id: entityIdSchema,
  name: v.pipe(v.string(), v.minLength(1)),
  description: v.exactOptional(v.string()),
  activityId: v.pipe(v.string(), v.minLength(1)),
  stepId: v.pipe(v.string(), v.minLength(1)),
  milestoneId: v.exactOptional(v.string()),
});

export const usmBaseSchema = v.strictObject({
  title: v.exactOptional(v.string()),
  activities: v.optional(v.array(activitySchema), []),
  milestones: v.optional(v.array(milestoneSchema), []),
  stories: v.optional(v.array(storySchema), []),
});

export const parseUsmBase = (input: unknown): UsmState => {
  const parsed = v.parse(usmBaseSchema, input);
  const stepIds = new Map<string, string>();
  for (const activity of parsed.activities) {
    for (const step of activity.steps) stepIds.set(step.id, activity.id);
  }
  const milestoneIds = new Set(parsed.milestones.map((milestone) => milestone.id));
  const seen = new Set<string>();
  const checkDuplicate = (kind: string, id: string): void => {
    if (seen.has(id)) throw new Error(`duplicate id "${id}" in ${kind}`);
    seen.add(id);
  };
  for (const activity of parsed.activities) {
    checkDuplicate('activities', activity.id);
    for (const step of activity.steps) checkDuplicate('steps', step.id);
  }
  for (const milestone of parsed.milestones) checkDuplicate('milestones', milestone.id);
  for (const story of parsed.stories) {
    checkDuplicate('stories', story.id);
    const ownerActivity = stepIds.get(story.stepId);
    if (ownerActivity === undefined || ownerActivity !== story.activityId) {
      throw new Error(`story "${story.id}" references unknown activityId/stepId`);
    }
    if (story.milestoneId !== undefined && !milestoneIds.has(story.milestoneId)) {
      throw new Error(`story "${story.id}" references unknown milestoneId "${story.milestoneId}"`);
    }
  }
  return parsed;
};

export const emptyUsmBase = (): UsmState => {
  return { activities: [], milestones: [], stories: [] };
};

export const findActivity = (state: UsmState, id: string | undefined): BackboneActivity | undefined => {
  if (id === undefined) return undefined;
  return state.activities.find((activity) => activity.id === id);
};

/** Canonical reference of a backbone column: `onboarding.signup`. */
export const stepRefOf = (activityId: string, stepId: string): string => {
  return `${activityId}.${stepId}`;
};

/**
 * Accepts `activityId.stepId` or a bare step id.
 *
 * The path is the canonical form: two activities may both own a `signup`
 * column, so only the qualified ref is unambiguous for a draft action.
 */
export const findStep = (
  state: UsmState,
  ref: string | undefined,
): { activity: BackboneActivity; step: BackboneStep } | undefined => {
  if (ref === undefined) return undefined;
  const path = splitPath(ref, 2);
  if (path) {
    const [activityId, stepId] = path;
    if (activityId === undefined || stepId === undefined) return undefined;
    const activity = state.activities.find((candidate) => candidate.id === activityId);
    const step = activity?.steps.find((candidate) => candidate.id === stepId);
    return activity && step ? { activity, step } : undefined;
  }
  if (ref.includes('.')) return undefined;
  for (const activity of state.activities) {
    const step = activity.steps.find((candidate) => candidate.id === ref);
    if (step) return { activity, step };
  }
  return undefined;
};

export const findMilestone = (state: UsmState, id: string | undefined): Milestone | undefined => {
  if (id === undefined) return undefined;
  return state.milestones.find((milestone) => milestone.id === id);
};

export const findStory = (state: UsmState, id: string | undefined): UserStory | undefined => {
  if (id === undefined) return undefined;
  return state.stories.find((story) => story.id === id);
};

/** Flat backbone columns in display order. */
export const flatSteps = (state: UsmState): readonly { activity: BackboneActivity; step: BackboneStep }[] => {
  return state.activities.flatMap((activity) => activity.steps.map((step) => ({ activity, step })));
};

/**
 * Stories are only ever shown per cell, so their order across cells is
 * incidental: moving a story away and back regroups the array but not the map.
 */
export const canonicalUsmState = (state: UsmState): UsmState => ({
  ...state,
  stories: sortBy(state.stories, [(story) => `${story.activityId}/${story.stepId}/${story.milestoneId ?? ''}`]),
});

/** Stories in one map cell, preserving global story order. */
export const storiesInCell = (
  state: UsmState,
  stepId: string,
  milestoneId: string | undefined,
): readonly UserStory[] => {
  return state.stories.filter((story) => story.stepId === stepId && (story.milestoneId ?? undefined) === milestoneId);
};

/** Stories in one activity-view cell (a whole activity in one column). */
export const storiesInActivity = (
  state: UsmState,
  activityId: string,
  milestoneId: string | undefined,
): readonly UserStory[] => {
  return state.stories.filter(
    (story) => story.activityId === activityId && (story.milestoneId ?? undefined) === milestoneId,
  );
};

export const allUsmIds = (state: UsmState): string[] => {
  return [
    ...state.activities.map((activity) => activity.id),
    ...state.activities.flatMap((activity) => activity.steps.map((step) => step.id)),
    ...state.milestones.map((milestone) => milestone.id),
    ...state.stories.map((story) => story.id),
  ];
};

export const storyCountForStep = (state: UsmState, stepId: string): number => {
  return state.stories.filter((story) => story.stepId === stepId).length;
};
