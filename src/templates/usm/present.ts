import type {
  ActionDescription,
  ActionTarget,
  ActionTone,
  CommentTargetOption,
  DraftAction,
  Navigation,
} from '../../core/types';

import { payloadFor, type ActionName } from '../../core/schema';
import { targetRef } from '../../core/target';
import { usmActions } from './actions';
import { findActivity, findMilestone, findStep, findStory, stepRefOf, type UsmState } from './model';

type Summary = {
  readonly title: string;
  readonly tone: ActionTone;
  readonly body?: string;
};

const arrow = (before: unknown, after: unknown): string => {
  const afterText = typeof after === 'string' ? after : '';
  const beforeText = typeof before === 'string' ? before : undefined;
  return beforeText === undefined ? `→ 「${afterText}」` : `「${beforeText}」→「${afterText}」`;
};

// Never throws: every lookup falls back to the raw id.
const DESCRIBERS: Record<string, (action: DraftAction, state: UsmState) => Summary> = {
  SET_ACTIVITY_NAME: (action, state) => ({
    title: 'アクティビティ名を変更',
    tone: 'update',
    body: arrow(
      findActivity(state, action.target.id)?.name,
      payloadFor(usmActions.SET_ACTIVITY_NAME, action)['name'] ?? '',
    ),
  }),
  SET_STEP_NAME: (action, state) => ({
    title: 'ステップ名を変更',
    tone: 'update',
    body: arrow(
      findStep(state, action.target.id)?.step.name,
      payloadFor(usmActions.SET_STEP_NAME, action)['name'] ?? '',
    ),
  }),
  REORDER_STEP: (action) => ({
    title: 'ステップの順序を変更',
    tone: 'move',
    body:
      payloadFor(usmActions.REORDER_STEP, action)['after'] === null ||
      payloadFor(usmActions.REORDER_STEP, action)['after'] === undefined
        ? '→ 先頭へ'
        : `→ 「${String(payloadFor(usmActions.REORDER_STEP, action)['after'])}」の直後へ`,
  }),
  ADD_ACTIVITY: (action) => ({
    title: 'アクティビティを追加',
    tone: 'create',
    body: `+ 「${payloadFor(usmActions.ADD_ACTIVITY, action)['name'] ?? ''}」`,
  }),
  ADD_STEP: (action) => ({
    title: 'ステップを追加',
    tone: 'create',
    body: `+ 「${payloadFor(usmActions.ADD_STEP, action)['name'] ?? ''}」`,
  }),
  DELETE_ACTIVITY: (action, state) => ({
    title: 'アクティビティを削除',
    tone: 'delete',
    body: `− 「${findActivity(state, action.target.id)?.name ?? action.target.id}」`,
  }),
  DELETE_STEP: (action, state) => ({
    title: 'ステップを削除',
    tone: 'delete',
    body: `− 「${findStep(state, action.target.id)?.step.name ?? action.target.id}」`,
  }),
  SET_STORY_NAME: (action, state) => ({
    title: 'ストーリー名を変更',
    tone: 'update',
    body: arrow(findStory(state, action.target.id)?.name, payloadFor(usmActions.SET_STORY_NAME, action)['name'] ?? ''),
  }),
  SET_STORY_DESCRIPTION: (action) => ({
    title: 'ストーリーの説明を更新',
    tone: 'update',
    body: `→ 「${String(payloadFor(usmActions.SET_STORY_DESCRIPTION, action)['description'] ?? '').slice(0, 90)}」`,
  }),
  SET_STORY_MILESTONE: (action, state) => ({
    title: 'マイルストーンを変更',
    tone: 'move',
    body:
      payloadFor(usmActions.SET_STORY_MILESTONE, action)['milestoneId'] === null ||
      payloadFor(usmActions.SET_STORY_MILESTONE, action)['milestoneId'] === undefined
        ? '→ 未割当へ'
        : `→ ${findMilestone(state, String(payloadFor(usmActions.SET_STORY_MILESTONE, action)['milestoneId']))?.name ?? String(payloadFor(usmActions.SET_STORY_MILESTONE, action)['milestoneId'])}`,
  }),
  MOVE_STORY: (action, state) => ({
    title: 'ストーリーを移動',
    tone: 'move',
    body: `→ ${findStep(state, String(payloadFor(usmActions.MOVE_STORY, action)['stepId']))?.step.name ?? String(payloadFor(usmActions.MOVE_STORY, action)['stepId'] ?? '')}`,
  }),
  REORDER_STORY: (action) => ({
    title: 'ストーリーの順序を変更',
    tone: 'move',
    body:
      payloadFor(usmActions.REORDER_STORY, action)['after'] === null ||
      payloadFor(usmActions.REORDER_STORY, action)['after'] === undefined
        ? '→ 先頭へ'
        : `→ 「${String(payloadFor(usmActions.REORDER_STORY, action)['after'])}」の直後へ`,
  }),
  ADD_STORY: (action) => ({
    title: 'ストーリーを追加',
    tone: 'create',
    body: `+ 「${payloadFor(usmActions.ADD_STORY, action)['name'] ?? ''}」`,
  }),
  DELETE_STORY: (action, state) => ({
    title: 'ストーリーを削除',
    tone: 'delete',
    body: `− 「${findStory(state, action.target.id)?.name ?? action.target.id}」`,
  }),
  SET_MILESTONE_NAME: (action, state) => ({
    title: 'マイルストーン名を変更',
    tone: 'update',
    body: arrow(
      findMilestone(state, action.target.id)?.name,
      payloadFor(usmActions.SET_MILESTONE_NAME, action)['name'] ?? '',
    ),
  }),
  ADD_MILESTONE: (action) => ({
    title: 'マイルストーンを追加',
    tone: 'create',
    body: `+ 「${payloadFor(usmActions.ADD_MILESTONE, action)['name'] ?? ''}」`,
  }),
  DELETE_MILESTONE: (action, state) => ({
    title: 'マイルストーンを削除',
    tone: 'delete',
    body: `− 「${findMilestone(state, action.target.id)?.name ?? action.target.id}」`,
  }),
  REORDER_MILESTONE: (action) => ({
    title: 'マイルストーンの順序を変更',
    tone: 'move',
    body:
      payloadFor(usmActions.REORDER_MILESTONE, action)['after'] === null ||
      payloadFor(usmActions.REORDER_MILESTONE, action)['after'] === undefined
        ? '→ 先頭へ'
        : `→ 「${String(payloadFor(usmActions.REORDER_MILESTONE, action)['after'])}」の直後へ`,
  }),
} satisfies Record<ActionName<typeof usmActions>, (action: DraftAction, state: UsmState) => Summary>;

export const describeUsmAction = (action: DraftAction, state: UsmState, base?: UsmState): ActionDescription => {
  let summary: Summary;
  try {
    const describer = DESCRIBERS[action.type];
    const origin = base ?? state;
    summary = describer ? describer(action, origin) : { title: action.type, tone: 'meta' };
  } catch {
    summary = { title: action.type, tone: 'meta' };
  }
  return {
    title: summary.title,
    targetLabel: usmTargetLabel(state, action.target),
    tone: summary.tone,
    ...(summary.body === undefined ? {} : { summary: summary.body }),
  };
};

export const serializeUsmAction = (action: DraftAction): string => {
  return `${action.type} ${targetRef(action.target)} ${JSON.stringify(action.payload)}`;
};

export const usmTargetLabel = (state: UsmState, target: ActionTarget): string => {
  try {
    switch (target.type) {
      case 'activity': {
        const activity = findActivity(state, target.id);
        return activity ? `アクティビティ · ${activity.name}` : `アクティビティ · ${target.id} (missing)`;
      }
      case 'step': {
        const step = findStep(state, target.id)?.step;
        return step ? `ステップ · ${step.name}` : `ステップ · ${target.id} (missing)`;
      }
      case 'story': {
        const story = findStory(state, target.id);
        return story ? `ストーリー · ${story.name}` : `ストーリー · ${target.id} (missing)`;
      }
      case 'milestone': {
        const milestone = findMilestone(state, target.id);
        return milestone ? `マイルストーン · ${milestone.name}` : `マイルストーン · ${target.id} (missing)`;
      }
      case 'page':
        return `マップ · ${usmTitle(state)}`;
      default:
        return `${target.type} · ${target.id}`;
    }
  } catch {
    return `${target.type} · ${target.id}`;
  }
};

export const usmCommentTargets = (state: UsmState, _nav: Navigation): readonly CommentTargetOption[] => {
  const options: CommentTargetOption[] = [{ value: 'page:usm', label: 'マップ全体', group: 'マップ' }];
  for (const activity of state.activities) {
    options.push({
      value: targetRef({ type: 'activity', id: activity.id }),
      label: activity.name,
      group: 'アクティビティ',
    });
    for (const step of activity.steps) {
      options.push({
        value: targetRef({ type: 'step', id: stepRefOf(activity.id, step.id) }),
        label: `${activity.name} › ${step.name}`,
        group: 'ステップ',
      });
    }
  }
  for (const milestone of state.milestones) {
    options.push({
      value: targetRef({ type: 'milestone', id: milestone.id }),
      label: milestone.name,
      group: 'マイルストーン',
    });
  }
  for (const story of state.stories) {
    options.push({ value: targetRef({ type: 'story', id: story.id }), label: story.name, group: 'ストーリー' });
  }
  return options;
};

/**
 * The story the reader is looking at: the composer attaches a note to it when
 * the checkbox is on, otherwise the note is map-wide.
 */
export const usmCurrentTarget = (state: UsmState, nav: Navigation): CommentTargetOption | null => {
  const story = state.stories.find((candidate) => candidate.id === nav['story']);
  if (story) return { value: targetRef({ type: 'story', id: story.id }), label: story.name, group: 'ストーリー' };
  // With no story focused yet, the selected column is what the reader is looking at.
  for (const activity of state.activities) {
    const step = activity.steps.find((candidate) => candidate.id === nav['step']);
    if (step) {
      return {
        value: targetRef({ type: 'step', id: stepRefOf(activity.id, step.id) }),
        label: step.name,
        group: 'ステップ',
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
