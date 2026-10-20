import type { ApplyResult, DraftAction } from '../../core/types';

import { assertNever, parseTemplateAction } from '../../core/schema';
import { usmActions } from './actions';
import { measureOf } from './burndown';
import { waitsOn } from './dependency-graph';
import {
  allUsmIds,
  findEstimate,
  findLabel,
  findMember,
  findMilestone,
  findSnapshot,
  findStatus,
  findStep,
  findStory,
  tallyKey,
  tallyProblem,
  USM_FEATURES,
  type BackboneActivity,
  type TallyRow,
  type UsmState,
  type UserStory,
} from './model';
import { nextStoryNumber } from './story-key';

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
    case 'SET_ACTIVITY_ACTOR': {
      // An empty actor removes the label rather than storing an empty one.
      const actor = typed.payload.actor.trim();
      if (!state.activities.some((activity) => activity.id === id)) return null;
      return {
        ...state,
        activities: state.activities.map((activity) => {
          if (activity.id !== id) return activity;
          const { actor: _actor, ...rest } = activity;
          return actor === '' ? rest : { ...rest, actor };
        }),
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
    case 'REORDER_ACTIVITY': {
      const { after } = typed.payload;
      const next = reorderById(state.activities, id, after);
      return next === null ? null : { ...state, activities: next };
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
      return withoutStories(
        { ...state, activities: state.activities.filter((candidate) => candidate.id !== id) },
        (story) => story.activityId === id || stepIds.has(story.stepId),
      );
    }
    case 'DELETE_STEP': {
      const located = findStep(state, id);
      if (!located) return null;
      return withoutStories(
        {
          ...state,
          activities: state.activities.map((activity) =>
            activity.id === located.activity.id
              ? { ...activity, steps: activity.steps.filter((step) => step.id !== located.step.id) }
              : activity,
          ),
        },
        (story) => story.activityId === located.activity.id && story.stepId === located.step.id,
      );
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
      // The number the action carries, unless another story took it meanwhile.
      const taken = payload.number !== undefined && state.stories.some((story) => story.number === payload.number);
      const story: UserStory = {
        id: payload.id,
        number: payload.number === undefined || taken ? nextStoryNumber(state) : payload.number,
        name: payload.name,
        activityId: payload.activityId,
        stepId: located.step.id,
        ...(payload.milestoneId === undefined ? {} : { milestoneId: payload.milestoneId }),
        // A new story starts at the first status, if the map has statuses.
        ...(state.statuses[0] === undefined ? {} : { statusId: state.statuses[0].id }),
      };
      return { ...state, stories: [...state.stories, story] };
    }
    case 'DELETE_STORY': {
      if (!state.stories.some((story) => story.id === id)) return null;
      return withoutStories(state, (story) => story.id === id);
    }

    case 'ADD_STORY_LINK': {
      const { url, label } = typed.payload;
      const story = findStory(state, id);
      if (!story) return null;
      // Linking the same URL again is already done: the draft stays as it is.
      if (story.links?.some((link) => link.url === url)) return state;
      const link = label === undefined ? { url } : { url, label };
      return updateStory(state, id, (current) => ({ ...current, links: [...(current.links ?? []), link] }));
    }
    case 'REMOVE_STORY_LINK': {
      const { url } = typed.payload;
      const story = findStory(state, id);
      if (!story?.links?.some((link) => link.url === url)) return null;
      return updateStory(state, id, (current) => {
        const links = (current.links ?? []).filter((link) => link.url !== url);
        const { links: _links, ...rest } = current;
        return links.length === 0 ? rest : { ...rest, links };
      });
    }
    case 'ADD_STORY_COMMENT': {
      const { id: commentId, body, createdAt } = typed.payload;
      const story = findStory(state, id);
      if (!story) return null;
      // Adding the same comment again is already done: the draft stays as it is.
      if (story.comments?.some((comment) => comment.id === commentId)) return state;
      if (allUsmIds(state).includes(commentId)) return null;
      const comment = createdAt === undefined ? { id: commentId, body } : { id: commentId, body, createdAt };
      return updateStory(state, id, (current) => ({ ...current, comments: [...(current.comments ?? []), comment] }));
    }
    case 'DELETE_STORY_COMMENT': {
      const { commentId } = typed.payload;
      const story = findStory(state, id);
      if (!story?.comments?.some((comment) => comment.id === commentId)) return null;
      return updateStory(state, id, (current) => {
        const comments = (current.comments ?? []).filter((comment) => comment.id !== commentId);
        const { comments: _comments, ...rest } = current;
        return comments.length === 0 ? rest : { ...rest, comments };
      });
    }
    case 'SET_STORY_STATUS': {
      const { statusId } = typed.payload;
      if (!findStatus(state, statusId)) return null;
      return updateStory(state, id, (story) => ({ ...story, statusId }));
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
        // What the snapshots counted in it stays counted, as unassigned.
        snapshots: retally(state, (row) => (row.milestoneId === id ? withoutKey(row, 'milestoneId') : row)),
      };
    }
    case 'REORDER_MILESTONE': {
      const { after } = typed.payload;
      const next = reorderById(state.milestones, id, after);
      return next === null ? null : { ...state, milestones: next };
    }
    case 'SET_MILESTONE_DUE_DATE': {
      const { dueDate } = typed.payload;
      if (!findMilestone(state, id)) return null;
      return {
        ...state,
        milestones: state.milestones.map((milestone) => {
          if (milestone.id !== id) return milestone;
          return dueDate === null ? withoutKey(milestone, 'dueDate') : { ...milestone, dueDate };
        }),
      };
    }

    case 'ADD_STATUS': {
      const { id: statusId, name, tone, icon } = typed.payload;
      if (state.statuses.some((status) => status.id === statusId)) return state;
      const statuses = [...state.statuses, { id: statusId, name, tone, icon: icon ?? 'progress' }];
      // The map's first status: from now on every story stands somewhere.
      if (state.statuses.length === 0) {
        return {
          ...state,
          statuses,
          stories: state.stories.map((story) => ({ ...story, statusId })),
          snapshots: retally(state, (row) => ({ ...row, statusId })),
        };
      }
      return { ...state, statuses };
    }
    case 'SET_STATUS_NAME': {
      const { name } = typed.payload;
      if (!findStatus(state, id)) return null;
      return { ...state, statuses: state.statuses.map((status) => (status.id === id ? { ...status, name } : status)) };
    }
    case 'SET_STATUS_TONE': {
      const { tone } = typed.payload;
      if (!findStatus(state, id)) return null;
      return { ...state, statuses: state.statuses.map((status) => (status.id === id ? { ...status, tone } : status)) };
    }
    case 'SET_STATUS_ICON': {
      const { icon } = typed.payload;
      if (!findStatus(state, id)) return null;
      return { ...state, statuses: state.statuses.map((status) => (status.id === id ? { ...status, icon } : status)) };
    }
    case 'SET_STATUS_WEIGHT': {
      const { weight } = typed.payload;
      if (!findStatus(state, id)) return null;
      return {
        ...state,
        statuses: state.statuses.map((status) => (status.id === id ? { ...status, weight } : status)),
      };
    }
    case 'SET_MEASURE': {
      const { measure } = typed.payload;
      // Set the way it already measures, the draft stays as it is; the scale and the weights stay whichever it is.
      return measureOf(state) === measure ? state : { ...state, measure };
    }
    case 'SET_DONE_STATUS': {
      if (!findStatus(state, id)) return null;
      return state.doneStatusId === id ? state : { ...state, doneStatusId: id };
    }
    case 'DELETE_STATUS': {
      if (!findStatus(state, id)) return null;
      const statuses = state.statuses.filter((status) => status.id !== id);
      // Its stories fall back to the first status left; with none left the map has no statuses at all.
      const fallback = statuses[0]?.id;
      return {
        // Deleted, the done status leaves the last status left to be the done one.
        ...(state.doneStatusId === id ? withoutKey(state, 'doneStatusId') : state),
        statuses,
        stories: state.stories.map((story) => {
          if (story.statusId !== id) return story;
          return fallback === undefined ? stripStatus(story) : { ...story, statusId: fallback };
        }),
        // The snapshots count those stories where the stories themselves went.
        snapshots: retally(state, (row) => {
          if (row.statusId !== id) return row;
          return fallback === undefined ? withoutKey(row, 'statusId') : { ...row, statusId: fallback };
        }),
      };
    }
    case 'REORDER_STATUS': {
      const { after } = typed.payload;
      const next = reorderById(state.statuses, id, after);
      return next === null ? null : { ...state, statuses: next };
    }

    case 'ADD_LABEL': {
      const { id: labelId, name, tone } = typed.payload;
      if (findLabel(state, labelId)) return state;
      return { ...state, labels: [...state.labels, { id: labelId, name, tone }] };
    }
    case 'SET_LABEL_NAME': {
      const { name } = typed.payload;
      if (!findLabel(state, id)) return null;
      return { ...state, labels: state.labels.map((label) => (label.id === id ? { ...label, name } : label)) };
    }
    case 'SET_LABEL_TONE': {
      const { tone } = typed.payload;
      if (!findLabel(state, id)) return null;
      return { ...state, labels: state.labels.map((label) => (label.id === id ? { ...label, tone } : label)) };
    }
    case 'DELETE_LABEL': {
      if (!findLabel(state, id)) return null;
      return {
        ...state,
        labels: state.labels.filter((label) => label.id !== id),
        stories: state.stories.map((story) => (story.labelIds?.includes(id) ? withoutLabel(story, id) : story)),
      };
    }
    case 'REORDER_LABEL': {
      const { after } = typed.payload;
      const next = reorderById(state.labels, id, after);
      return next === null ? null : { ...state, labels: next };
    }
    case 'ADD_STORY_LABEL': {
      const { labelId } = typed.payload;
      const story = findStory(state, id);
      if (!story || !findLabel(state, labelId)) return null;
      // Labelling a story again is already done: the draft stays as it is.
      if (story.labelIds?.includes(labelId)) return state;
      return updateStory(state, id, (current) => ({ ...current, labelIds: [...(current.labelIds ?? []), labelId] }));
    }
    case 'REMOVE_STORY_LABEL': {
      const { labelId } = typed.payload;
      if (!findStory(state, id)?.labelIds?.includes(labelId)) return null;
      return updateStory(state, id, (current) => withoutLabel(current, labelId));
    }
    case 'ADD_STORY_BLOCKER': {
      const { blockerId } = typed.payload;
      const story = findStory(state, id);
      if (!story || !findStory(state, blockerId)) return null;
      if (story.blockedBy?.includes(blockerId)) return state;
      // Waiting on itself, or on a story that already waits on it, would never let either start.
      if (blockerId === id || waitsOn(state.stories, blockerId, id)) return null;
      return updateStory(state, id, (current) => ({
        ...current,
        blockedBy: [...(current.blockedBy ?? []), blockerId],
      }));
    }
    case 'REMOVE_STORY_BLOCKER': {
      const { blockerId } = typed.payload;
      if (!findStory(state, id)?.blockedBy?.includes(blockerId)) return null;
      return updateStory(state, id, (current) => withoutBlockers(current, new Set([blockerId])));
    }

    case 'ADD_MEMBER': {
      const { id: memberId, name, tone } = typed.payload;
      if (findMember(state, memberId)) return state;
      return { ...state, members: [...state.members, { id: memberId, name, tone }] };
    }
    case 'SET_MEMBER_NAME': {
      const { name } = typed.payload;
      if (!findMember(state, id)) return null;
      return { ...state, members: state.members.map((member) => (member.id === id ? { ...member, name } : member)) };
    }
    case 'SET_MEMBER_TONE': {
      const { tone } = typed.payload;
      if (!findMember(state, id)) return null;
      return { ...state, members: state.members.map((member) => (member.id === id ? { ...member, tone } : member)) };
    }
    case 'DELETE_MEMBER': {
      if (!findMember(state, id)) return null;
      return {
        ...state,
        members: state.members.filter((member) => member.id !== id),
        stories: state.stories.map((story) => (story.assigneeId === id ? withoutKey(story, 'assigneeId') : story)),
      };
    }
    case 'REORDER_MEMBER': {
      const { after } = typed.payload;
      const next = reorderById(state.members, id, after);
      return next === null ? null : { ...state, members: next };
    }
    case 'SET_STORY_ASSIGNEE': {
      const { memberId } = typed.payload;
      if (memberId !== null && !findMember(state, memberId)) return null;
      return updateStory(state, id, (story) =>
        memberId === null ? withoutKey(story, 'assigneeId') : { ...story, assigneeId: memberId },
      );
    }

    case 'ADD_ESTIMATE': {
      const { id: estimateId, name, points } = typed.payload;
      if (findEstimate(state, estimateId)) return state;
      return { ...state, estimates: [...state.estimates, { id: estimateId, name, points }] };
    }
    case 'SET_ESTIMATE_NAME': {
      const { name } = typed.payload;
      if (!findEstimate(state, id)) return null;
      return {
        ...state,
        estimates: state.estimates.map((estimate) => (estimate.id === id ? { ...estimate, name } : estimate)),
      };
    }
    case 'SET_ESTIMATE_POINTS': {
      const { points } = typed.payload;
      if (!findEstimate(state, id)) return null;
      return {
        ...state,
        estimates: state.estimates.map((estimate) => (estimate.id === id ? { ...estimate, points } : estimate)),
      };
    }
    case 'DELETE_ESTIMATE': {
      if (!findEstimate(state, id)) return null;
      return {
        ...state,
        estimates: state.estimates.filter((estimate) => estimate.id !== id),
        stories: state.stories.map((story) => (story.estimateId === id ? withoutKey(story, 'estimateId') : story)),
      };
    }
    case 'REORDER_ESTIMATE': {
      const { after } = typed.payload;
      const next = reorderById(state.estimates, id, after);
      return next === null ? null : { ...state, estimates: next };
    }
    case 'SET_STORY_ESTIMATE': {
      const { estimateId } = typed.payload;
      if (estimateId !== null && !findEstimate(state, estimateId)) return null;
      return updateStory(state, id, (story) =>
        estimateId === null ? withoutKey(story, 'estimateId') : { ...story, estimateId },
      );
    }
    case 'RECORD_SNAPSHOT': {
      const { id: snapshotId, at, tally } = typed.payload;
      if (findSnapshot(state, snapshotId)) return state;
      if (tallyProblem(state, tally) !== null) return null;
      return { ...state, snapshots: [...state.snapshots, { id: snapshotId, at, tally }] };
    }
    case 'DELETE_SNAPSHOT': {
      if (!findSnapshot(state, id)) return null;
      return { ...state, snapshots: state.snapshots.filter((snapshot) => snapshot.id !== id) };
    }
    case 'SET_FEATURE': {
      const { feature, enabled } = typed.payload;
      // Turning a feature the way it already stands is already done: the draft stays as it is.
      if (state.features.includes(feature) === enabled) return state;
      // Turning one off only hides it: what it holds stays for when it comes back.
      const features = USM_FEATURES.filter((each) => (each === feature ? enabled : state.features.includes(each)));
      return { ...state, features };
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

/** The story without `labelId`; a story left with no labels carries no `labelIds` at all. */
const withoutLabel = (story: UserStory, labelId: string): UserStory => {
  const { labelIds = [], ...rest } = story;
  const kept = labelIds.filter((candidate) => candidate !== labelId);
  return kept.length === 0 ? rest : { ...rest, labelIds: kept };
};

/** The story without the given blockers; a story left waiting on none carries no `blockedBy` at all. */
const withoutBlockers = (story: UserStory, removed: ReadonlySet<string>): UserStory => {
  const { blockedBy = [], ...rest } = story;
  const kept = blockedBy.filter((candidate) => !removed.has(candidate));
  return kept.length === 0 ? rest : { ...rest, blockedBy: kept };
};

/** Drops the stories that match, and every other story stops waiting on them. */
const withoutStories = (state: UsmState, removes: (story: UserStory) => boolean): UsmState => {
  const removed = new Set(state.stories.filter(removes).map((story) => story.id));
  return {
    ...state,
    stories: state.stories
      .filter((story) => !removed.has(story.id))
      .map((story) =>
        story.blockedBy?.some((blocker) => removed.has(blocker)) ? withoutBlockers(story, removed) : story,
      ),
  };
};

/** The object without one optional key, rather than with it set to `undefined`. */
const withoutKey = <T extends object, K extends keyof T>(value: T, key: K): Omit<T, K> => {
  const { [key]: _dropped, ...rest } = value;
  return rest;
};

/**
 * Rewrites every snapshot's rows with `move`, adding up the rows that end up
 * counting the same milestone and status, so each pair stays one row.
 */
const retally = (state: UsmState, move: (row: TallyRow) => TallyRow): UsmState['snapshots'] =>
  state.snapshots.map((snapshot) => {
    const rows = new Map<string, TallyRow>();
    for (const row of snapshot.tally.map(move)) {
      const key = tallyKey(row);
      const same = rows.get(key);
      rows.set(key, same ? { ...same, stories: same.stories + row.stories, points: same.points + row.points } : row);
    }
    return { ...snapshot, tally: [...rows.values()] };
  });

const stripStatus = (story: UserStory): UserStory => {
  const { statusId: _statusId, ...rest } = story;
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
