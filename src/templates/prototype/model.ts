import * as v from 'valibot';

import { entityIdSchema, splitPath } from '../../core/schema';

export const PREVIEW_KINDS = ['browser', 'native'] as const;
export const PREVIEW_VIEWPORTS = ['mobile', 'tablet', 'desktop', 'fluid'] as const;

export type PreviewKind = (typeof PREVIEW_KINDS)[number];
export type PreviewViewport = (typeof PREVIEW_VIEWPORTS)[number];

export type PrototypePreview = {
  readonly id: string;
  readonly kind: PreviewKind;
  readonly viewport: PreviewViewport;
  readonly label?: string;
  readonly url?: string;
};

export type PrototypeStep = {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  /** Title of the page this step shows, e.g. `Users`. Defaults to the step name. */
  readonly title?: string;
  /** Who uses the page, e.g. `Administrator`. Overrides the story's and activity's. */
  readonly actor?: string;
  readonly previews: readonly PrototypePreview[];
};

export type PrototypeStory = {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  /** Who uses the story's pages unless a step says otherwise. */
  readonly actor?: string;
  readonly steps: readonly PrototypeStep[];
};

export type PrototypeActivity = {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  /** Who uses the activity's pages unless a story or step says otherwise. */
  readonly actor?: string;
  readonly stories: readonly PrototypeStory[];
};

export type PrototypeState = {
  readonly title?: string;
  /**
   * Origin used to render preview URLs, e.g. `https://app.example.com`.
   * Defaults to `https://<slugified title>.example.com`.
   */
  readonly baseUrl?: string;
  readonly activities: readonly PrototypeActivity[];
};

const previewSchema = v.strictObject({
  id: entityIdSchema,
  kind: v.optional(v.picklist(PREVIEW_KINDS), 'browser'),
  viewport: v.optional(v.picklist(PREVIEW_VIEWPORTS), 'fluid'),
  label: v.exactOptional(v.string()),
  url: v.exactOptional(v.string()),
});

const stepSchema = v.strictObject({
  id: entityIdSchema,
  name: v.pipe(v.string(), v.minLength(1)),
  description: v.exactOptional(v.string()),
  title: v.exactOptional(v.pipe(v.string(), v.minLength(1))),
  actor: v.exactOptional(v.pipe(v.string(), v.minLength(1))),
  previews: v.optional(v.array(previewSchema), []),
});

const storySchema = v.strictObject({
  id: entityIdSchema,
  name: v.pipe(v.string(), v.minLength(1)),
  description: v.exactOptional(v.string()),
  actor: v.exactOptional(v.pipe(v.string(), v.minLength(1))),
  steps: v.optional(v.array(stepSchema), []),
});

const activitySchema = v.strictObject({
  id: entityIdSchema,
  name: v.pipe(v.string(), v.minLength(1)),
  description: v.exactOptional(v.string()),
  actor: v.exactOptional(v.pipe(v.string(), v.minLength(1))),
  stories: v.optional(v.array(storySchema), []),
});

export const prototypeBaseSchema = v.strictObject({
  title: v.exactOptional(v.string()),
  baseUrl: v.exactOptional(v.string()),
  activities: v.optional(v.array(activitySchema), []),
});

/**
 * Ids must be unique where they identify a path element or a slot. Story and
 * step ids are unique within their parent; preview ids are global because they
 * name a light DOM slot.
 */
const findDuplicateId = (state: v.InferOutput<typeof prototypeBaseSchema>): string | null => {
  const previewIds = new Set<string>();
  const activityIds = new Set<string>();
  for (const activity of state.activities) {
    if (activityIds.has(activity.id)) return `duplicate activity id "${activity.id}"`;
    activityIds.add(activity.id);
    const storyIds = new Set<string>();
    for (const story of activity.stories) {
      if (storyIds.has(story.id)) return `duplicate story id "${story.id}" in activity "${activity.id}"`;
      storyIds.add(story.id);

      const stepIds = new Set<string>();
      for (const step of story.steps) {
        if (stepIds.has(step.id)) return `duplicate step id "${step.id}" in story "${story.id}"`;
        stepIds.add(step.id);

        for (const preview of step.previews) {
          if (previewIds.has(preview.id)) {
            return `duplicate preview id "${preview.id}": preview ids are global, they name a light DOM slot`;
          }
          previewIds.add(preview.id);
        }
      }
    }
  }
  return null;
};

export const parsePrototypeBase = (input: unknown): PrototypeState => {
  const parsed = v.parse(prototypeBaseSchema, input);
  const duplicate = findDuplicateId(parsed);
  if (duplicate !== null) throw new Error(duplicate);
  return parsed;
};

export const emptyPrototypeBase = (): PrototypeState => {
  return { activities: [] };
};

export type StepLocation = {
  readonly activity: PrototypeActivity;
  readonly story: PrototypeStory;
  readonly step: PrototypeStep;
  readonly stepIndex: number;
};

export const findActivity = (state: PrototypeState, id: string | undefined): PrototypeActivity | undefined => {
  if (id === undefined) return undefined;
  return state.activities.find((activity) => activity.id === id);
};

/** Canonical reference of a story: `onboarding.account`. */
export const storyRef = (activityId: string, storyId: string): string => {
  return `${activityId}.${storyId}`;
};

/** Accepts the canonical `activityId.storyId` path or a bare story id. */
export const findStory = (
  state: PrototypeState,
  ref: string | undefined,
): { activity: PrototypeActivity; story: PrototypeStory } | undefined => {
  if (ref === undefined) return undefined;
  const path = splitPath(ref, 2);
  if (path) {
    const [activityId, storyId] = path;
    if (activityId === undefined || storyId === undefined) return undefined;
    const activity = state.activities.find((candidate) => candidate.id === activityId);
    const story = activity?.stories.find((candidate) => candidate.id === storyId);
    return activity && story ? { activity, story } : undefined;
  }
  if (ref.includes('.')) return undefined;
  const matches = state.activities.flatMap((activity) =>
    activity.stories.filter((story) => story.id === ref).map((story) => ({ activity, story })),
  );
  return matches.length === 1 ? matches[0] : undefined;
};

/** The id part of a canonical ref: `a.b.c` -> `c`. */
export const localId = (ref: string): string => {
  const index = ref.lastIndexOf('.');
  return index >= 0 ? ref.slice(index + 1) : ref;
};

/**
 * Canonical reference of a step: `onboarding.account.landing`.
 *
 * A bare step id is not enough on its own — two stories may both own a `landing`
 * step — so refs carry the path that makes them globally unambiguous, and give
 * the agent reading a draft the context of where the step lives.
 */
export const stepRef = (location: StepLocation): string => {
  return `${location.activity.id}.${location.story.id}.${location.step.id}`;
};

export const stepRefOf = (activity: PrototypeActivity, story: PrototypeStory, step: PrototypeStep): string => {
  return `${activity.id}.${story.id}.${step.id}`;
};

/** Accepts the canonical path or a bare step id (which must be unique). */
export const findStep = (state: PrototypeState, ref: string | undefined): StepLocation | undefined => {
  if (ref === undefined) return undefined;
  const path = splitPath(ref, 3);
  if (path) {
    const [activityId, storyId, stepId] = path;
    if (activityId === undefined || storyId === undefined || stepId === undefined) return undefined;
    const activity = state.activities.find((candidate) => candidate.id === activityId);
    const story = activity?.stories.find((candidate) => candidate.id === storyId);
    const stepIndex = story ? story.steps.findIndex((candidate) => candidate.id === stepId) : -1;
    const step = story && stepIndex >= 0 ? story.steps[stepIndex] : undefined;
    return activity && story && step ? { activity, story, step, stepIndex } : undefined;
  }
  if (ref.includes('.')) return undefined;
  const matches = flattenSteps(state).filter((location) => location.step.id === ref);
  return matches.length === 1 ? matches[0] : undefined;
};

/**
 * Preview refs are global: a preview id names a light DOM slot, so the base
 * schema rejects duplicates. `<step path>.<preview id>` is also accepted.
 */
export const findPreview = (
  state: PrototypeState,
  id: string | undefined,
): { location: StepLocation; preview: PrototypePreview } | undefined => {
  if (id === undefined) return undefined;
  const path = splitPath(id, 4);
  if (path) {
    const [activityId, storyId, stepId, previewId] = path;
    if (activityId === undefined || storyId === undefined || stepId === undefined || previewId === undefined) {
      return undefined;
    }
    const location = findStep(state, `${activityId}.${storyId}.${stepId}`);
    const preview = location?.step.previews.find((candidate) => candidate.id === previewId);
    return location && preview ? { location, preview } : undefined;
  }
  if (id.includes('.')) return undefined;
  for (const activity of state.activities) {
    for (const story of activity.stories) {
      for (const [stepIndex, step] of story.steps.entries()) {
        const preview = step.previews.find((candidate) => candidate.id === id);
        if (preview) return { location: { activity, story, step, stepIndex }, preview };
      }
    }
  }
  return undefined;
};

/** Depth-first list of steps, used for "next / previous" and navigation defaults. */
export const flattenSteps = (state: PrototypeState): readonly StepLocation[] => {
  return state.activities.flatMap((activity) =>
    activity.stories.flatMap((story) =>
      story.steps.map((step, stepIndex) => ({
        activity,
        story,
        step,
        stepIndex,
      })),
    ),
  );
};

export const allStepIds = (state: PrototypeState): string[] => {
  return flattenSteps(state).map((location) => location.step.id);
};
