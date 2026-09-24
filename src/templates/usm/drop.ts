import type { DropPlace } from '../../lib/dom/drag';

import { reorderAnchor } from '../../lib/reorder';
import { findStory, storiesInActivity, storiesInCell, type UsmState } from './model';

/**
 * Pure drop-position helpers: given the ordered ids of the destination, the
 * item under the pointer (`null` when dropped on empty space) and whether the
 * pointer is above (`before`), below (`after`) or on empty space (`end`),
 * return the `after` anchor of the reorder (`null` = first).
 */
export const dropAfter = (orderedIds: readonly string[], hoveredId: string | null, place: DropPlace): string | null => {
  const last = orderedIds.at(-1) ?? null;
  if (hoveredId === null || place === 'end') return last;
  const index = orderedIds.indexOf(hoveredId);
  if (index < 0) return last;
  if (place === 'after') return hoveredId;
  return index === 0 ? null : (orderedIds.at(index - 1) ?? null);
};

export type MoveStoryInput = {
  readonly type: 'MOVE_STORY';
  readonly target: { readonly type: 'story'; readonly id: string };
  readonly payload: {
    readonly activityId: string;
    readonly stepId: string;
    readonly milestoneId: string | null;
    readonly after: string | null;
  };
};

export type CellRef = {
  readonly activityId: string;
  readonly stepId: string;
  readonly milestoneId: string | undefined;
};

/** What a drop on an exact `step × milestone` cell of the activity view dispatches. */
export const resolveCellDrop = (
  state: UsmState,
  cell: CellRef,
  storyId: string,
  hoveredId: string | null,
  place: DropPlace,
): MoveStoryInput => {
  const orderedIds = storiesInCell(state, cell.stepId, cell.milestoneId).map((story) => story.id);
  return {
    type: 'MOVE_STORY',
    target: { type: 'story', id: storyId },
    payload: {
      activityId: cell.activityId,
      stepId: cell.stepId,
      milestoneId: cell.milestoneId ?? null,
      after: reorderAnchor(orderedIds, storyId, hoveredId, place),
    },
  };
};

/**
 * What an activity-view drop dispatches. A drop here cannot name a step — the
 * column is the whole activity — so the dragged story keeps its own step and
 * only changes milestone and position. Cross-activity drops are rejected
 * (`null`); those go through the step picker.
 */
export const resolveGroupDrop = (
  state: UsmState,
  activityId: string,
  milestoneId: string | undefined,
  storyId: string,
  hoveredId: string | null,
  place: DropPlace,
): MoveStoryInput | null => {
  const current = findStory(state, storyId);
  if (!current || current.activityId !== activityId) return null;
  const orderedIds = storiesInActivity(state, activityId, milestoneId).map((story) => story.id);
  return {
    type: 'MOVE_STORY',
    target: { type: 'story', id: storyId },
    payload: {
      activityId,
      stepId: current.stepId,
      milestoneId: milestoneId ?? null,
      after: reorderAnchor(orderedIds, storyId, hoveredId, place),
    },
  };
};

/** The step picker's answer: append the story to `stepId` of the target activity. */
export const resolvePickedStepMove = (
  state: UsmState,
  storyId: string,
  activityId: string,
  stepId: string,
  milestoneId: string | undefined,
): MoveStoryInput => {
  const destination = storiesInCell(state, stepId, milestoneId).filter((candidate) => candidate.id !== storyId);
  return {
    type: 'MOVE_STORY',
    target: { type: 'story', id: storyId },
    payload: {
      activityId,
      stepId,
      milestoneId: milestoneId ?? null,
      after: destination.at(-1)?.id ?? null,
    },
  };
};

export type MilestoneDropInput = {
  readonly type: 'REORDER_MILESTONE';
  readonly target: { readonly type: 'milestone'; readonly id: string };
  readonly payload: { readonly after: string | null };
};

/**
 * What a milestone-row drop dispatches. `milestoneIds` is the current global
 * order; the dragged row takes the hovered row's slot (see `reorderAnchor`).
 */
export const resolveMilestoneDrop = (
  milestoneIds: readonly string[],
  draggedId: string,
  hoveredId: string | null,
  place: DropPlace,
): MilestoneDropInput | null => {
  if (!milestoneIds.includes(draggedId)) return null;
  return {
    type: 'REORDER_MILESTONE',
    target: { type: 'milestone', id: draggedId },
    payload: { after: reorderAnchor(milestoneIds, draggedId, hoveredId, place) },
  };
};
