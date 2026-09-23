import type { ApplyResult, DraftAction } from '../../core/types';

import { assertNever, parseTemplateAction } from '../../core/schema';
import { prototypeActions } from './actions';
import {
  findPreview,
  findStep,
  findStory,
  localId,
  stepRef,
  storyRef,
  type PrototypeActivity,
  type PrototypePreview,
  type PrototypeState,
  type PrototypeStep,
  type PrototypeStory,
} from './model';

/**
 * `applyAction` for the Prototype template.
 *
 * Pure function: `(state, action) => state | null`, where `null` means the
 * action cannot be applied to the current base. Returning the same value shape
 * is fine — the core detects no-op patches with a deep comparison and drops
 * them, which is what makes "already reflected in the base" drafts disappear.
 */
export const applyPrototypeAction = (state: PrototypeState, action: DraftAction): ApplyResult<PrototypeState> => {
  const typed = parseTemplateAction(prototypeActions, action);
  if (typed === null) return null;
  const id = typed.target.id;
  switch (typed.type) {
    case 'SET_ACTIVITY_NAME':
      return updateActivity(state, id, (activity) => ({
        ...activity,
        name: typed.payload.name,
      }));
    case 'SET_ACTIVITY_DESCRIPTION':
      return updateActivity(state, id, (activity) => ({
        ...activity,
        description: typed.payload.description,
      }));
    case 'SET_STORY_NAME':
      return updateStory(state, id, (story) => ({
        ...story,
        name: typed.payload.name,
      }));
    case 'SET_STORY_DESCRIPTION':
      return updateStory(state, id, (story) => ({
        ...story,
        description: typed.payload.description,
      }));
    case 'SET_STEP_NAME':
      return updateStep(state, id, (step) => ({
        ...step,
        name: typed.payload.name,
      }));
    case 'SET_STEP_DESCRIPTION':
      return updateStep(state, id, (step) => ({
        ...step,
        description: typed.payload.description,
      }));
    case 'SET_PREVIEW_KIND':
      return updatePreview(state, id, (preview) => ({
        ...preview,
        kind: typed.payload.kind,
      }));
    case 'SET_PREVIEW_VIEWPORT':
      return updatePreview(state, id, (preview) => ({
        ...preview,
        viewport: typed.payload.viewport,
      }));
    case 'SET_PREVIEW_LABEL':
      return updatePreview(state, id, (preview) => ({
        ...preview,
        label: typed.payload.label,
      }));

    case 'REORDER_ACTIVITY': {
      const { after } = typed.payload;
      const next = reorderById(state.activities, id, after);
      return next === null ? null : { ...state, activities: next };
    }
    case 'REORDER_STORY': {
      const { after } = typed.payload;
      const found = findStory(state, id);
      if (!found) return null;
      const anchor = after === null ? null : findStory(state, after);
      if (after !== null && (!anchor || anchor.activity !== found.activity)) return null;
      const stories = reorderById(found.activity.stories, found.story.id, anchor?.story.id ?? null);
      return stories === null
        ? null
        : updateActivity(state, found.activity.id, (activity) => ({
            ...activity,
            stories,
          }));
    }
    case 'REORDER_STEP': {
      const { after } = typed.payload;
      const location = findStep(state, id);
      if (!location) return null;
      const anchor = after === null ? null : findStep(state, after);
      if (after !== null && (!anchor || anchor.story !== location.story)) return null;
      const steps = reorderById(location.story.steps, location.step.id, anchor?.step.id ?? null);
      return steps === null
        ? null
        : updateStory(state, storyRef(location.activity.id, location.story.id), (story) => ({
            ...story,
            steps,
          }));
    }
    case 'MOVE_STORY': {
      const { toActivity, after } = typed.payload;
      const found = findStory(state, id);
      if (!found) return null;
      const destination = state.activities.find((activity) => activity.id === toActivity);
      if (!destination) return null;
      const anchor = after === null ? null : findStory(state, after);
      if (after !== null && (!anchor || anchor.activity !== destination)) return null;
      const anchorId = anchor?.story.id ?? null;
      if (found.activity.id === toActivity) {
        const stories = reorderById(found.activity.stories, found.story.id, anchorId);
        return stories === null
          ? null
          : updateActivity(state, toActivity, (activity) => ({
              ...activity,
              stories,
            }));
      }
      if (destination.stories.some((story) => story.id === found.story.id)) return null;
      const moved = insertAfter(destination.stories, found.story, anchorId);
      return mapActivities(state, (activity) => {
        if (activity.id === found.activity.id) {
          return {
            ...activity,
            stories: activity.stories.filter((story) => story.id !== localId(id)),
          };
        }
        if (activity.id === toActivity) return { ...activity, stories: moved };
        return activity;
      });
    }
    case 'MOVE_STEP': {
      const { toStory, after } = typed.payload;
      const location = findStep(state, id);
      if (!location) return null;
      const destination = findStory(state, toStory);
      if (!destination) return null;
      const anchor = after === null ? null : findStep(state, after);
      if (after !== null && (!anchor || anchor.story !== destination.story)) return null;
      const anchorId = anchor?.step.id ?? null;
      if (location.story === destination.story) {
        const steps = reorderById(location.story.steps, location.step.id, anchorId);
        return steps === null ? null : updateStory(state, toStory, (story) => ({ ...story, steps }));
      }
      if (destination.story.steps.some((step) => step.id === location.step.id)) return null;
      const moved = insertAfter(destination.story.steps, location.step, anchorId);
      return mapActivities(state, (activity) => ({
        ...activity,
        stories: activity.stories.map((story) => {
          if (story === location.story)
            return {
              ...story,
              steps: story.steps.filter((step) => step.id !== localId(id)),
            };
          if (story === destination.story) return { ...story, steps: moved };
          return story;
        }),
      }));
    }

    case 'ADD_ACTIVITY': {
      const payload = typed.payload;
      if (state.activities.some((activity) => activity.id === payload.id)) return state;
      const activity: PrototypeActivity = {
        id: payload.id,
        name: payload.name,
        ...(payload.description === undefined ? {} : { description: payload.description }),
        stories: [],
      };
      return { ...state, activities: [...state.activities, activity] };
    }
    case 'ADD_STORY': {
      const payload = typed.payload;
      const activity = state.activities.find((candidate) => candidate.id === id);
      if (!activity) return null;
      if (activity.stories.some((story) => story.id === payload.id)) return state;
      const story: PrototypeStory = {
        id: payload.id,
        name: payload.name,
        ...(payload.description === undefined ? {} : { description: payload.description }),
        steps: [],
      };
      return updateActivity(state, id, (candidate) => ({
        ...candidate,
        stories: [...candidate.stories, story],
      }));
    }
    case 'ADD_STEP': {
      const payload = typed.payload;
      const story = findStory(state, id)?.story;
      if (!story) return null;
      if (story.steps.some((step) => step.id === payload.id)) return state;
      const ids = (payload.previews ?? []).map((preview) => preview.id);
      if (new Set(ids).size !== ids.length || ids.some((previewId) => findPreview(state, previewId))) return null;
      const step: PrototypeStep = {
        id: payload.id,
        name: payload.name,
        ...(payload.description === undefined ? {} : { description: payload.description }),
        previews: payload.previews ?? [],
      };
      return updateStory(state, id, (candidate) => ({
        ...candidate,
        steps: [...candidate.steps, step],
      }));
    }
    case 'ADD_PREVIEW': {
      const payload = typed.payload;
      const step = findStep(state, id)?.step;
      if (!step) return null;
      if (step.previews.some((preview) => preview.id === payload.id)) return state;
      if (findPreview(state, payload.id)) return null;
      return updateStep(state, id, (candidate) => ({
        ...candidate,
        previews: [...candidate.previews, payload],
      }));
    }

    case 'DELETE_ACTIVITY': {
      const activityId = id;
      if (!state.activities.some((activity) => activity.id === activityId)) return null;
      return {
        ...state,
        activities: state.activities.filter((activity) => activity.id !== activityId),
      };
    }
    case 'DELETE_STORY': {
      const found = findStory(state, id);
      if (!found) return null;
      return updateActivity(state, found.activity.id, (activity) => ({
        ...activity,
        stories: activity.stories.filter((story) => story.id !== found.story.id),
      }));
    }
    case 'DELETE_STEP': {
      const location = findStep(state, id);
      if (!location) return null;
      return updateStory(state, storyRef(location.activity.id, location.story.id), (story) => ({
        ...story,
        steps: story.steps.filter((step) => step.id !== location.step.id),
      }));
    }
    case 'DELETE_PREVIEW': {
      const found = findPreview(state, id);
      if (!found) return null;
      return updateStep(state, stepRef(found.location), (step) => ({
        ...step,
        previews: step.previews.filter((preview) => preview.id !== found.preview.id),
      }));
    }
    default:
      return assertNever(typed);
  }
};

const mapActivities = (
  state: PrototypeState,
  fn: (activity: PrototypeActivity) => PrototypeActivity,
): PrototypeState => {
  return { ...state, activities: state.activities.map(fn) };
};

const updateActivity = (
  state: PrototypeState,
  ref: string,
  fn: (activity: PrototypeActivity) => PrototypeActivity,
): PrototypeState | null => {
  const id = ref;
  if (!state.activities.some((activity) => activity.id === id)) return null;
  return mapActivities(state, (activity) => (activity.id === id ? fn(activity) : activity));
};

const updateStory = (
  state: PrototypeState,
  ref: string,
  fn: (story: PrototypeStory) => PrototypeStory,
): PrototypeState | null => {
  const found = findStory(state, ref);
  if (!found) return null;
  const id = found.story.id;
  return updateActivity(state, found.activity.id, (activity) => ({
    ...activity,
    stories: activity.stories.map((story) => (story.id === id ? fn(story) : story)),
  }));
};

const updateStep = (
  state: PrototypeState,
  ref: string,
  fn: (step: PrototypeStep) => PrototypeStep,
): PrototypeState | null => {
  const location = findStep(state, ref);
  if (!location) return null;
  const id = location.step.id;
  return updateStory(state, storyRef(location.activity.id, location.story.id), (story) => ({
    ...story,
    steps: story.steps.map((step) => (step.id === id ? fn(step) : step)),
  }));
};

const updatePreview = (
  state: PrototypeState,
  ref: string,
  fn: (preview: PrototypePreview) => PrototypePreview,
): PrototypeState | null => {
  const found = findPreview(state, ref);
  if (!found) return null;
  const id = found.preview.id;
  return updateStep(state, stepRef(found.location), (step) => ({
    ...step,
    previews: step.previews.map((preview) => (preview.id === id ? fn(preview) : preview)),
  }));
};

/** Moves `id` directly after `after` (`null` = first). `null` when an anchor is unknown. */
export const reorderById = <T extends { id: string }>(
  items: readonly T[],
  id: string,
  after: string | null,
): T[] | null => {
  const current = items.findIndex((item) => item.id === id);
  if (current < 0) return null;
  if (after !== null && !items.some((item) => item.id === after)) return null;
  if (id === after) return [...items];
  const moving = items[current];
  if (moving === undefined) return null;
  const rest = items.filter((item) => item.id !== id);
  return insertAfter(rest, moving, after);
};

const insertAfter = <T extends { id: string }>(rest: readonly T[], item: T, after: string | null): T[] => {
  const next = [...rest];
  const anchor = after === null ? -1 : next.findIndex((candidate) => candidate.id === after);
  next.splice(anchor + 1, 0, item);
  return next;
};
