import type {
  ActionDescription,
  ActionTarget,
  ActionTone,
  CommentTargetOption,
  DraftAction,
  Navigation,
} from '../../core/types';
import type { UsmMessages } from './messages';

import { payloadFor, type ActionName } from '../../core/schema';
import { targetRef } from '../../core/target';
import { usmActions } from './actions';
import { findActivity, findMilestone, findStep, findStory, stepRefOf, type UsmState } from './model';

type Summary = {
  readonly title: string;
  readonly tone: ActionTone;
  readonly body?: string;
};

const arrow = (m: UsmMessages, before: unknown, after: unknown): string => {
  const afterText = typeof after === 'string' ? after : '';
  const beforeText = typeof before === 'string' ? before : undefined;
  return beforeText === undefined ? m.toValue(afterText) : m.fromTo(beforeText, afterText);
};

const reorderBody = (m: UsmMessages, after: unknown): string => {
  return typeof after === 'string' ? m.afterName(after) : m.toFront;
};

// Never throws: every lookup falls back to the raw id.
const DESCRIBERS: Record<string, (m: UsmMessages, action: DraftAction, state: UsmState) => Summary> = {
  SET_ACTIVITY_NAME: (m, action, state) => ({
    title: m.renameActivity,
    tone: 'update',
    body: arrow(
      m,
      findActivity(state, action.target.id)?.name,
      payloadFor(usmActions.SET_ACTIVITY_NAME, action)['name'] ?? '',
    ),
  }),
  SET_STEP_NAME: (m, action, state) => ({
    title: m.renameStep,
    tone: 'update',
    body: arrow(
      m,
      findStep(state, action.target.id)?.step.name,
      payloadFor(usmActions.SET_STEP_NAME, action)['name'] ?? '',
    ),
  }),
  REORDER_STEP: (m, action) => ({
    title: m.reorderStep,
    tone: 'move',
    body: reorderBody(m, payloadFor(usmActions.REORDER_STEP, action)['after']),
  }),
  ADD_ACTIVITY: (m, action) => ({
    title: m.addActivity,
    tone: 'create',
    body: m.added(String(payloadFor(usmActions.ADD_ACTIVITY, action)['name'] ?? '')),
  }),
  ADD_STEP: (m, action) => ({
    title: m.addStep,
    tone: 'create',
    body: m.added(String(payloadFor(usmActions.ADD_STEP, action)['name'] ?? '')),
  }),
  DELETE_ACTIVITY: (m, action, state) => ({
    title: m.deleteActivity,
    tone: 'delete',
    body: m.removed(findActivity(state, action.target.id)?.name ?? action.target.id),
  }),
  DELETE_STEP: (m, action, state) => ({
    title: m.deleteStep,
    tone: 'delete',
    body: m.removed(findStep(state, action.target.id)?.step.name ?? action.target.id),
  }),
  SET_STORY_NAME: (m, action, state) => ({
    title: m.renameStory,
    tone: 'update',
    body: arrow(
      m,
      findStory(state, action.target.id)?.name,
      payloadFor(usmActions.SET_STORY_NAME, action)['name'] ?? '',
    ),
  }),
  SET_STORY_DESCRIPTION: (m, action) => ({
    title: m.updateStoryDescription,
    tone: 'update',
    body: m.toValue(String(payloadFor(usmActions.SET_STORY_DESCRIPTION, action)['description'] ?? '').slice(0, 90)),
  }),
  SET_STORY_MILESTONE: (m, action, state) => {
    const milestoneId = payloadFor(usmActions.SET_STORY_MILESTONE, action)['milestoneId'];
    return {
      title: m.changeMilestone,
      tone: 'move',
      body:
        milestoneId === null || milestoneId === undefined
          ? m.toUnassigned
          : m.toName(findMilestone(state, String(milestoneId))?.name ?? String(milestoneId)),
    };
  },
  MOVE_STORY: (m, action, state) => ({
    title: m.moveStory,
    tone: 'move',
    body: m.toName(
      findStep(state, String(payloadFor(usmActions.MOVE_STORY, action)['stepId']))?.step.name ??
        String(payloadFor(usmActions.MOVE_STORY, action)['stepId'] ?? ''),
    ),
  }),
  REORDER_STORY: (m, action) => ({
    title: m.reorderStory,
    tone: 'move',
    body: reorderBody(m, payloadFor(usmActions.REORDER_STORY, action)['after']),
  }),
  ADD_STORY: (m, action) => ({
    title: m.addStory,
    tone: 'create',
    body: m.added(String(payloadFor(usmActions.ADD_STORY, action)['name'] ?? '')),
  }),
  DELETE_STORY: (m, action, state) => ({
    title: m.deleteStory,
    tone: 'delete',
    body: m.removed(findStory(state, action.target.id)?.name ?? action.target.id),
  }),
  SET_MILESTONE_NAME: (m, action, state) => ({
    title: m.renameMilestone,
    tone: 'update',
    body: arrow(
      m,
      findMilestone(state, action.target.id)?.name,
      payloadFor(usmActions.SET_MILESTONE_NAME, action)['name'] ?? '',
    ),
  }),
  ADD_MILESTONE: (m, action) => ({
    title: m.addMilestone,
    tone: 'create',
    body: m.added(String(payloadFor(usmActions.ADD_MILESTONE, action)['name'] ?? '')),
  }),
  DELETE_MILESTONE: (m, action, state) => ({
    title: m.deleteMilestone,
    tone: 'delete',
    body: m.removed(findMilestone(state, action.target.id)?.name ?? action.target.id),
  }),
  REORDER_MILESTONE: (m, action) => ({
    title: m.reorderMilestone,
    tone: 'move',
    body: reorderBody(m, payloadFor(usmActions.REORDER_MILESTONE, action)['after']),
  }),
} satisfies Record<ActionName<typeof usmActions>, (m: UsmMessages, action: DraftAction, state: UsmState) => Summary>;

export const describeUsmAction = (
  m: UsmMessages,
  action: DraftAction,
  state: UsmState,
  base?: UsmState,
): ActionDescription => {
  let summary: Summary;
  try {
    const describer = DESCRIBERS[action.type];
    const origin = base ?? state;
    summary = describer ? describer(m, action, origin) : { title: action.type, tone: 'meta' };
  } catch {
    summary = { title: action.type, tone: 'meta' };
  }
  return {
    title: summary.title,
    targetLabel: usmTargetLabel(m, state, action.target),
    tone: summary.tone,
    ...(summary.body === undefined ? {} : { summary: summary.body }),
  };
};

export const serializeUsmAction = (action: DraftAction): string => {
  return `${action.type} ${targetRef(action.target)} ${JSON.stringify(action.payload)}`;
};

export const usmTargetLabel = (m: UsmMessages, state: UsmState, target: ActionTarget): string => {
  try {
    switch (target.type) {
      case 'activity': {
        const activity = findActivity(state, target.id);
        return activity ? m.targetLabel(m.activityGroup, activity.name) : m.targetMissing(m.activityGroup, target.id);
      }
      case 'step': {
        const step = findStep(state, target.id)?.step;
        return step ? m.targetLabel(m.stepGroup, step.name) : m.targetMissing(m.stepGroup, target.id);
      }
      case 'story': {
        const story = findStory(state, target.id);
        return story ? m.targetLabel(m.storyGroup, story.name) : m.targetMissing(m.storyGroup, target.id);
      }
      case 'milestone': {
        const milestone = findMilestone(state, target.id);
        return milestone
          ? m.targetLabel(m.milestoneGroup, milestone.name)
          : m.targetMissing(m.milestoneGroup, target.id);
      }
      case 'page':
        return m.targetLabel(m.mapGroup, usmTitle(state));
      default:
        return `${target.type} · ${target.id}`;
    }
  } catch {
    return `${target.type} · ${target.id}`;
  }
};

export const usmCommentTargets = (
  m: UsmMessages,
  state: UsmState,
  _nav: Navigation,
): readonly CommentTargetOption[] => {
  const options: CommentTargetOption[] = [{ value: 'page:usm', label: m.wholeMap, group: m.mapGroup }];
  for (const activity of state.activities) {
    options.push({
      value: targetRef({ type: 'activity', id: activity.id }),
      label: activity.name,
      group: m.activityGroup,
    });
    for (const step of activity.steps) {
      options.push({
        value: targetRef({ type: 'step', id: stepRefOf(activity.id, step.id) }),
        label: `${activity.name} › ${step.name}`,
        group: m.stepGroup,
      });
    }
  }
  for (const milestone of state.milestones) {
    options.push({
      value: targetRef({ type: 'milestone', id: milestone.id }),
      label: milestone.name,
      group: m.milestoneGroup,
    });
  }
  for (const story of state.stories) {
    options.push({ value: targetRef({ type: 'story', id: story.id }), label: story.name, group: m.storyGroup });
  }
  return options;
};

/**
 * The story the reader is looking at: the composer attaches a note to it when
 * the checkbox is on, otherwise the note is map-wide.
 */
export const usmCurrentTarget = (m: UsmMessages, state: UsmState, nav: Navigation): CommentTargetOption | null => {
  const story = state.stories.find((candidate) => candidate.id === nav['story']);
  if (story) return { value: targetRef({ type: 'story', id: story.id }), label: story.name, group: m.storyGroup };
  // With no story focused yet, the selected column is what the reader is looking at.
  for (const activity of state.activities) {
    const step = activity.steps.find((candidate) => candidate.id === nav['step']);
    if (step) {
      return {
        value: targetRef({ type: 'step', id: stepRefOf(activity.id, step.id) }),
        label: step.name,
        group: m.stepGroup,
      };
    }
  }
  return null;
};

export const usmTitle = (state: UsmState): string => {
  return state.title ?? 'User Story Mapping';
};

export const resolveUsmNavigation = (state: UsmState, nav: Navigation): Navigation => {
  const locatedStep = findStep(state, nav['step']);
  const activity = locatedStep?.activity ?? findActivity(state, nav['activity']) ?? state.activities[0];
  const step =
    locatedStep?.step ?? activity?.steps.find((candidate) => candidate.id === nav['step']) ?? activity?.steps[0];
  const story = findStory(state, nav['story']);
  const next: Record<string, string> = { ...nav };
  if (activity) next['activity'] = activity.id;
  else delete next['activity'];
  if (step) next['step'] = step.id;
  else delete next['step'];
  if (story) next['story'] = story.id;
  else delete next['story'];
  // The table grouping is navigation state: which unit the map groups by.
  next['view'] = nav['view'] === 'group' ? 'group' : 'activity';
  return next;
};
