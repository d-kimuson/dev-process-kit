import type { ApplyResult, DraftAction } from '../../core/types';

import { assertNever, parseTemplateAction } from '../../core/schema';
import { usmActions } from './actions';
import { findMilestone, findStep, findStory, type BackboneActivity, type UsmState, type UserStory } from './model';

// Pure reducer: (state, action) => state | null. No DOM, no I/O.
export const applyUsmAction = (state: UsmState, action: DraftAction): ApplyResult<UsmState> => {
  const typed = parseTemplateAction(usmActions, action);
  if (typed === null) return null;
  const id = typed.target.id;
  switch (typed.type) {
    case 'SET_ACTIVITY_NAME': {
      const { name } = typed.payload;
      if (!state.activities.some((activity) => activity.id === id)) return null;
      return {
        ...state,
        activities: state.activities.map((activity) => (activity.id === id ? { ...activity, name } : activity)),
      };
    }
    case 'SET_STEP_NAME': {
      const { name } = typed.payload;
      const located = findStep(state, id);
      if (!located) return null;
      return {
        ...state,
        activities: state.activities.map((activity) =>
          activity.id === located.activity.id
            ? {
                ...activity,
                steps: activity.steps.map((step) => (step.id === located.step.id ? { ...step, name } : step)),
              }
            : activity,
        ),
      };
    }
    case 'REORDER_STEP': {
      const { after } = typed.payload;
      const located = findStep(state, id);
      if (!located) return null;
      const anchor = after === null ? null : findStep(state, after);
      if (after !== null && (!anchor || anchor.activity.id !== located.activity.id)) return null;
      const next = reorderById(located.activity.steps, located.step.id, anchor?.step.id ?? null);
      if (next === null) return null;
      return {
        ...state,
        activities: state.activities.map((activity) =>
          activity.id === located.activity.id ? { ...activity, steps: next } : activity,
        ),
      };
    }
    case 'ADD_ACTIVITY': {
      const payload = typed.payload;
      if (state.activities.some((activity) => activity.id === payload.id)) return state;
      return { ...state, activities: [...state.activities, { id: payload.id, name: payload.name, steps: [] }] };
    }
    case 'ADD_STEP': {
      const payload = typed.payload;
      const activity = state.activities.find((candidate) => candidate.id === id);
      if (!activity) return null;
      if (activity.steps.some((step) => step.id === payload.id)) return state;
      return {
        ...state,
        activities: state.activities.map((candidate) =>
          candidate.id === id
            ? { ...candidate, steps: [...candidate.steps, { id: payload.id, name: payload.name }] }
            : candidate,
        ),
      };
    }
    case 'DELETE_ACTIVITY': {
      const activity = state.activities.find((candidate) => candidate.id === id);
      if (!activity) return null;
      const stepIds = new Set(activity.steps.map((step) => step.id));
      return {
        ...state,
        activities: state.activities.filter((candidate) => candidate.id !== id),
        stories: state.stories.filter((story) => story.activityId !== id && !stepIds.has(story.stepId)),
      };
    }
    case 'DELETE_STEP': {
      const located = findStep(state, id);
      if (!located) return null;
      return {
        ...state,
        activities: state.activities.map((activity) =>
          activity.id === located.activity.id
            ? { ...activity, steps: activity.steps.filter((step) => step.id !== located.step.id) }
            : activity,
        ),
        stories: state.stories.filter(
          (story) => story.activityId !== located.activity.id || story.stepId !== located.step.id,
        ),
      };
    }

    case 'SET_STORY_NAME': {
      const { name } = typed.payload;
      return updateStory(state, id, (story) => ({ ...story, name }));
    }
    case 'SET_STORY_DESCRIPTION': {
      const { description } = typed.payload;
      return updateStory(state, id, (story) => ({ ...story, description }));
    }
    case 'SET_STORY_MILESTONE': {
      const { milestoneId } = typed.payload;
      if (milestoneId !== null && !findMilestone(state, milestoneId)) return null;
      return updateStory(state, id, (story) =>
        milestoneId === null ? stripMilestone(story) : { ...story, milestoneId },
      );
    }
    case 'MOVE_STORY': {
      const payload = typed.payload;
      const story = findStory(state, id);
      if (!story) return null;
      const located = findStep(state, payload.stepId);
      if (!located || located.activity.id !== payload.activityId) return null;
      if (payload.milestoneId !== null && !findMilestone(state, payload.milestoneId)) return null;
      const targetMilestone = payload.milestoneId ?? undefined;
      const moved: UserStory =
        targetMilestone === undefined
          ? { ...stripMilestone(story), activityId: located.activity.id, stepId: located.step.id }
          : { ...story, activityId: located.activity.id, stepId: located.step.id, milestoneId: targetMilestone };
      return placeStory(state, moved, payload.after);
    }
    case 'REORDER_STORY': {
      const { after } = typed.payload;
      const story = findStory(state, id);
      if (!story) return null;
      return placeStory(state, story, after, true);
    }
    case 'ADD_STORY': {
      const payload = typed.payload;
      const located = findStep(state, action.target.id);
      if (!located || located.activity.id !== payload.activityId) return null;
      if (payload.milestoneId !== undefined && !findMilestone(state, payload.milestoneId)) return null;
      if (state.stories.some((story) => story.id === payload.id)) return state;
      const story: UserStory = {
        id: payload.id,
        name: payload.name,
        activityId: payload.activityId,
        stepId: located.step.id,
        ...(payload.milestoneId === undefined ? {} : { milestoneId: payload.milestoneId }),
      };
      return { ...state, stories: [...state.stories, story] };
    }
    case 'DELETE_STORY': {
      if (!state.stories.some((story) => story.id === id)) return null;
      return { ...state, stories: state.stories.filter((story) => story.id !== id) };
    }

    case 'SET_MILESTONE_NAME': {
      const { name } = typed.payload;
      if (!state.milestones.some((milestone) => milestone.id === id)) return null;
      return {
        ...state,
        milestones: state.milestones.map((milestone) => (milestone.id === id ? { ...milestone, name } : milestone)),
      };
    }
    case 'ADD_MILESTONE': {
      const payload = typed.payload;
      if (state.milestones.some((milestone) => milestone.id === payload.id)) return state;
      return { ...state, milestones: [...state.milestones, { id: payload.id, name: payload.name }] };
    }
    case 'DELETE_MILESTONE': {
      if (!state.milestones.some((milestone) => milestone.id === id)) return null;
      return {
        ...state,
        milestones: state.milestones.filter((milestone) => milestone.id !== id),
        stories: state.stories.map((story) => (story.milestoneId === id ? stripMilestone(story) : story)),
      };
    }
    case 'REORDER_MILESTONE': {
      const { after } = typed.payload;
      const next = reorderById(state.milestones, id, after);
      return next === null ? null : { ...state, milestones: next };
    }
    default:
      return assertNever(typed);
  }
};

const updateStory = (state: UsmState, id: string, fn: (story: UserStory) => UserStory): UsmState | null => {
  if (!state.stories.some((story) => story.id === id)) return null;
  return { ...state, stories: state.stories.map((story) => (story.id === id ? fn(story) : story)) };
};

const stripMilestone = (story: UserStory): UserStory => {
  const { milestoneId: _milestoneId, ...rest } = story;
  return rest;
};

// Places a story into its (activityId, stepId, milestoneId) cell after `after`.
// sameCell=true (REORDER_STORY) requires the anchor in the same cell.
const placeStory = (state: UsmState, story: UserStory, after: string | null, sameCell = false): UsmState | null => {
  const milestone = story.milestoneId ?? undefined;
  const rest = state.stories.filter((candidate) => candidate.id !== story.id);
  const cell = rest.filter(
    (candidate) => candidate.stepId === story.stepId && (candidate.milestoneId ?? undefined) === milestone,
  );
  if (after !== null) {
    const anchor = rest.find((candidate) => candidate.id === after);
    if (!anchor) return null;
    if (anchor.stepId !== story.stepId || (anchor.milestoneId ?? undefined) !== milestone) return null;
    if (sameCell) {
      const current = findStory(state, story.id);
      if (!current) return null;
      if (anchor.stepId !== current.stepId || (anchor.milestoneId ?? undefined) !== (current.milestoneId ?? undefined))
        return null;
    }
  }
  const ordered = after === null ? [story, ...cell] : insertAfter(cell, story, after);
  // Reinsert the ordered cell where the cell used to live (or at the end).
  const firstIndex = rest.findIndex(
    (candidate) => candidate.stepId === story.stepId && (candidate.milestoneId ?? undefined) === milestone,
  );
  const cellIds = new Set(cell.map((candidate) => candidate.id));
  const withoutCell = rest.filter((candidate) => !cellIds.has(candidate.id));
  const at = firstIndex < 0 ? withoutCell.length : Math.min(firstIndex, withoutCell.length);
  const next = [...withoutCell.slice(0, at), ...ordered, ...withoutCell.slice(at)];
  return { ...state, stories: next };
};

export const reorderById = <T extends { id: string }>(
  items: readonly T[],
  id: string,
  after: string | null,
): T[] | null => {
  if (!items.some((item) => item.id === id)) return null;
  if (after !== null && !items.some((item) => item.id === after)) return null;
  if (after === id) return [...items];
  const moving = items.find((item) => item.id === id);
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

export type { BackboneActivity };
