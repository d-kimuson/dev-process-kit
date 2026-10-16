import type {
  ActionDescription,
  ActionTarget,
  ActionTone,
  CommentTargetOption,
  DraftAction,
  Navigation,
  NavigationPatch,
} from '../../core/types';
import type { UsmMessages } from './messages';

import { payloadFor, type ActionName } from '../../core/schema';
import { targetRef } from '../../core/target';
import { describeLink } from '../../lib/link-label';
import { usmActions } from './actions';
import { usmTabOf } from './board-tabs';
import { BURNDOWN_UNITS, momentLabel } from './burndown';
import { highlightOf } from './critical-path';
import { MAP_FILTER_KEYS, mapFilterOf, mapFilterParam } from './map-filter';
import {
  findActivity,
  findEstimate,
  findLabel,
  findMember,
  findMilestone,
  findStatus,
  findStep,
  findSnapshot,
  findStory,
  hasFeature,
  stepRefOf,
  type UsmState,
} from './model';

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
  SET_ACTIVITY_ACTOR: (m, action, state) => {
    const actor = payloadFor(usmActions.SET_ACTIVITY_ACTOR, action)['actor'].trim();
    return {
      title: m.changeActivityActor,
      tone: 'update',
      body:
        actor === ''
          ? m.removed(findActivity(state, action.target.id)?.actor ?? '')
          : arrow(m, findActivity(state, action.target.id)?.actor, actor),
    };
  },
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
  REORDER_ACTIVITY: (m, action, state) => {
    const after = payloadFor(usmActions.REORDER_ACTIVITY, action)['after'];
    return {
      title: m.reorderActivity,
      tone: 'move',
      body: reorderBody(m, after === null ? null : (findActivity(state, after)?.name ?? after)),
    };
  },
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
  ADD_STORY_LINK: (m, action) => {
    const { url, label } = payloadFor(usmActions.ADD_STORY_LINK, action);
    return { title: m.addStoryLink, tone: 'create', body: m.added(label ?? describeLink(url).title) };
  },
  REMOVE_STORY_LINK: (m, action, state) => {
    const { url } = payloadFor(usmActions.REMOVE_STORY_LINK, action);
    const link = findStory(state, action.target.id)?.links?.find((candidate) => candidate.url === url);
    return { title: m.removeStoryLink, tone: 'delete', body: m.removed(link?.label ?? describeLink(url).title) };
  },
  SET_STORY_STATUS: (m, action, state) => {
    const statusId = payloadFor(usmActions.SET_STORY_STATUS, action)['statusId'];
    return {
      title: m.changeStoryStatus,
      tone: 'update',
      body: m.toName(findStatus(state, statusId)?.name ?? statusId),
    };
  },
  ADD_STATUS: (m, action) => ({
    title: m.addStatus,
    tone: 'create',
    body: m.added(payloadFor(usmActions.ADD_STATUS, action)['name']),
  }),
  SET_STATUS_NAME: (m, action, state) => ({
    title: m.renameStatus,
    tone: 'update',
    body: arrow(m, findStatus(state, action.target.id)?.name, payloadFor(usmActions.SET_STATUS_NAME, action)['name']),
  }),
  SET_STATUS_TONE: (m, action, state) => {
    const before = findStatus(state, action.target.id)?.tone;
    const after = payloadFor(usmActions.SET_STATUS_TONE, action)['tone'];
    return {
      title: m.changeStatusTone,
      tone: 'update',
      body: arrow(m, before === undefined ? undefined : m.toneName(before), m.toneName(after)),
    };
  },
  SET_STATUS_ICON: (m, action, state) => {
    const before = findStatus(state, action.target.id)?.icon;
    const after = payloadFor(usmActions.SET_STATUS_ICON, action)['icon'];
    return {
      title: m.changeStatusIcon,
      tone: 'update',
      body: arrow(m, before === undefined ? undefined : m.iconName(before), m.iconName(after)),
    };
  },
  DELETE_STATUS: (m, action, state) => ({
    title: m.deleteStatus,
    tone: 'delete',
    body: m.removed(findStatus(state, action.target.id)?.name ?? action.target.id),
  }),
  REORDER_STATUS: (m, action) => ({
    title: m.reorderStatus,
    tone: 'move',
    body: reorderBody(m, payloadFor(usmActions.REORDER_STATUS, action)['after']),
  }),
  ADD_LABEL: (m, action) => ({
    title: m.addLabel,
    tone: 'create',
    body: m.added(payloadFor(usmActions.ADD_LABEL, action)['name']),
  }),
  SET_LABEL_NAME: (m, action, state) => ({
    title: m.renameLabel,
    tone: 'update',
    body: arrow(m, findLabel(state, action.target.id)?.name, payloadFor(usmActions.SET_LABEL_NAME, action)['name']),
  }),
  SET_LABEL_TONE: (m, action, state) => {
    const before = findLabel(state, action.target.id)?.tone;
    const after = payloadFor(usmActions.SET_LABEL_TONE, action)['tone'];
    return {
      title: m.changeLabelTone,
      tone: 'update',
      body: arrow(m, before === undefined ? undefined : m.toneName(before), m.toneName(after)),
    };
  },
  DELETE_LABEL: (m, action, state) => ({
    title: m.deleteLabel,
    tone: 'delete',
    body: m.removed(findLabel(state, action.target.id)?.name ?? action.target.id),
  }),
  REORDER_LABEL: (m, action) => ({
    title: m.reorderLabel,
    tone: 'move',
    body: reorderBody(m, payloadFor(usmActions.REORDER_LABEL, action)['after']),
  }),
  ADD_STORY_LABEL: (m, action, state) => {
    const labelId = payloadFor(usmActions.ADD_STORY_LABEL, action)['labelId'];
    return { title: m.addStoryLabel, tone: 'create', body: m.added(findLabel(state, labelId)?.name ?? labelId) };
  },
  REMOVE_STORY_LABEL: (m, action, state) => {
    const labelId = payloadFor(usmActions.REMOVE_STORY_LABEL, action)['labelId'];
    return { title: m.removeStoryLabel, tone: 'delete', body: m.removed(findLabel(state, labelId)?.name ?? labelId) };
  },
  ADD_STORY_BLOCKER: (m, action, state) => {
    const blockerId = payloadFor(usmActions.ADD_STORY_BLOCKER, action)['blockerId'];
    return { title: m.addStoryBlocker, tone: 'create', body: m.added(findStory(state, blockerId)?.name ?? blockerId) };
  },
  REMOVE_STORY_BLOCKER: (m, action, state) => {
    const blockerId = payloadFor(usmActions.REMOVE_STORY_BLOCKER, action)['blockerId'];
    return {
      title: m.removeStoryBlocker,
      tone: 'delete',
      body: m.removed(findStory(state, blockerId)?.name ?? blockerId),
    };
  },
  SET_MILESTONE_DUE_DATE: (m, action, state) => {
    const dueDate = payloadFor(usmActions.SET_MILESTONE_DUE_DATE, action)['dueDate'];
    return {
      title: m.changeMilestoneDueDate,
      tone: dueDate === null ? 'delete' : 'update',
      body: dueDate === null ? m.noDueDate : arrow(m, findMilestone(state, action.target.id)?.dueDate, dueDate),
    };
  },
  SET_STATUS_WEIGHT: (m, action, state) => {
    const before = findStatus(state, action.target.id)?.weight;
    const after = payloadFor(usmActions.SET_STATUS_WEIGHT, action)['weight'];
    return {
      title: m.changeStatusWeight,
      tone: 'update',
      body: arrow(m, before === undefined ? undefined : String(before), String(after)),
    };
  },
  ADD_MEMBER: (m, action) => ({
    title: m.addMember,
    tone: 'create',
    body: m.added(payloadFor(usmActions.ADD_MEMBER, action)['name']),
  }),
  SET_MEMBER_NAME: (m, action, state) => ({
    title: m.renameMember,
    tone: 'update',
    body: arrow(m, findMember(state, action.target.id)?.name, payloadFor(usmActions.SET_MEMBER_NAME, action)['name']),
  }),
  SET_MEMBER_TONE: (m, action, state) => {
    const before = findMember(state, action.target.id)?.tone;
    const after = payloadFor(usmActions.SET_MEMBER_TONE, action)['tone'];
    return {
      title: m.changeMemberTone,
      tone: 'update',
      body: arrow(m, before === undefined ? undefined : m.toneName(before), m.toneName(after)),
    };
  },
  DELETE_MEMBER: (m, action, state) => ({
    title: m.deleteMember,
    tone: 'delete',
    body: m.removed(findMember(state, action.target.id)?.name ?? action.target.id),
  }),
  REORDER_MEMBER: (m, action) => ({
    title: m.reorderMember,
    tone: 'move',
    body: reorderBody(m, payloadFor(usmActions.REORDER_MEMBER, action)['after']),
  }),
  SET_STORY_ASSIGNEE: (m, action, state) => {
    const memberId = payloadFor(usmActions.SET_STORY_ASSIGNEE, action)['memberId'];
    if (memberId === null) {
      const before = findMember(state, findStory(state, action.target.id)?.assigneeId);
      return { title: m.setStoryAssignee, tone: 'delete', body: m.removed(before?.name ?? m.noAssignee) };
    }
    return {
      title: m.setStoryAssignee,
      tone: 'update',
      body: m.toValue(findMember(state, memberId)?.name ?? memberId),
    };
  },
  ADD_ESTIMATE: (m, action) => {
    const { name, points } = payloadFor(usmActions.ADD_ESTIMATE, action);
    return { title: m.addEstimate, tone: 'create', body: m.added(m.estimateText(name, points)) };
  },
  SET_ESTIMATE_NAME: (m, action, state) => ({
    title: m.renameEstimate,
    tone: 'update',
    body: arrow(
      m,
      findEstimate(state, action.target.id)?.name,
      payloadFor(usmActions.SET_ESTIMATE_NAME, action)['name'],
    ),
  }),
  SET_ESTIMATE_POINTS: (m, action, state) => {
    const before = findEstimate(state, action.target.id)?.points;
    const after = payloadFor(usmActions.SET_ESTIMATE_POINTS, action)['points'];
    return {
      title: m.changeEstimatePoints,
      tone: 'update',
      body: arrow(m, before === undefined ? undefined : String(before), String(after)),
    };
  },
  DELETE_ESTIMATE: (m, action, state) => ({
    title: m.deleteEstimate,
    tone: 'delete',
    body: m.removed(findEstimate(state, action.target.id)?.name ?? action.target.id),
  }),
  REORDER_ESTIMATE: (m, action) => ({
    title: m.reorderEstimate,
    tone: 'move',
    body: reorderBody(m, payloadFor(usmActions.REORDER_ESTIMATE, action)['after']),
  }),
  SET_STORY_ESTIMATE: (m, action, state) => {
    const estimateId = payloadFor(usmActions.SET_STORY_ESTIMATE, action)['estimateId'];
    if (estimateId === null) return { title: m.setStoryEstimate, tone: 'delete', body: m.toValue(m.unestimated) };
    return {
      title: m.setStoryEstimate,
      tone: 'update',
      body: m.toValue(findEstimate(state, estimateId)?.name ?? estimateId),
    };
  },
  RECORD_SNAPSHOT: (m, action) => {
    const { at, tally } = payloadFor(usmActions.RECORD_SNAPSHOT, action);
    const stories = tally.reduce((sum, row) => sum + row.stories, 0);
    return { title: m.recordSnapshot, tone: 'create', body: m.snapshotSummary(momentLabel(at), stories) };
  },
  DELETE_SNAPSHOT: (m, action, state) => {
    const snapshot = findSnapshot(state, action.target.id);
    return {
      title: m.deleteSnapshot,
      tone: 'delete',
      body: m.removed(snapshot ? momentLabel(snapshot.at) : action.target.id),
    };
  },
  SET_FEATURE: (m, action) => {
    const { feature, enabled } = payloadFor(usmActions.SET_FEATURE, action);
    return {
      title: enabled ? m.enableFeature : m.disableFeature,
      tone: enabled ? 'create' : 'delete',
      body: m.featureName(feature),
    };
  },
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
      case 'status': {
        const status = findStatus(state, target.id);
        return status ? m.targetLabel(m.statusGroup, status.name) : m.targetMissing(m.statusGroup, target.id);
      }
      case 'label': {
        const label = findLabel(state, target.id);
        return label ? m.targetLabel(m.labelGroup, label.name) : m.targetMissing(m.labelGroup, target.id);
      }
      case 'member': {
        const member = findMember(state, target.id);
        return member ? m.targetLabel(m.memberGroup, member.name) : m.targetMissing(m.memberGroup, target.id);
      }
      case 'estimate': {
        const estimate = findEstimate(state, target.id);
        return estimate ? m.targetLabel(m.estimateGroup, estimate.name) : m.targetMissing(m.estimateGroup, target.id);
      }
      case 'snapshot': {
        const snapshot = findSnapshot(state, target.id);
        return snapshot
          ? m.targetLabel(m.snapshotGroup, momentLabel(snapshot.at))
          : m.targetMissing(m.snapshotGroup, target.id);
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
  for (const status of state.statuses) {
    options.push({ value: targetRef({ type: 'status', id: status.id }), label: status.name, group: m.statusGroup });
  }
  for (const label of state.labels) {
    options.push({ value: targetRef({ type: 'label', id: label.id }), label: label.name, group: m.labelGroup });
  }
  for (const member of state.members) {
    options.push({ value: targetRef({ type: 'member', id: member.id }), label: member.name, group: m.memberGroup });
  }
  for (const estimate of state.estimates) {
    options.push({
      value: targetRef({ type: 'estimate', id: estimate.id }),
      label: m.estimateText(estimate.name, estimate.points),
      group: m.estimateGroup,
    });
  }
  for (const snapshot of state.snapshots) {
    options.push({
      value: targetRef({ type: 'snapshot', id: snapshot.id }),
      label: momentLabel(snapshot.at),
      group: m.snapshotGroup,
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

/**
 * The navigation that brings a target on screen, for a change's "Show": a
 * story, step or activity on the map grouped by activity, unfiltered and
 * without a highlight so the story shows plainly; a milestone, a status, a label or a member on its own page; an
 * estimate or a snapshot on the burndown. A target of a feature that is off is
 * not on screen anywhere.
 */
export const usmNavigationFor = (state: UsmState, target: ActionTarget): NavigationPatch | null => {
  switch (target.type) {
    case 'story':
      return { tab: null, highlight: null, ...Object.fromEntries(MAP_FILTER_KEYS.map((key) => [key, null])) };
    case 'step':
    case 'activity':
      return { tab: null, view: null };
    case 'milestone':
      return { tab: 'milestones' };
    case 'status':
      return { tab: 'statuses' };
    case 'label':
      return { tab: 'labels' };
    case 'member':
      return hasFeature(state, 'assignees') ? { tab: 'members' } : null;
    case 'estimate':
    case 'snapshot':
      return hasFeature(state, 'estimates') ? { tab: 'burndown' } : null;
    default:
      return null;
  }
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
  // The page tab is navigation too; the map is the default and needs no key.
  // The map's filters are navigation too: what the reader looks at, never a change.
  const filter = mapFilterOf(state, nav);
  for (const key of MAP_FILTER_KEYS) {
    const param = mapFilterParam(state, key, filter[key]);
    if (param === null) delete next[key];
    else next[key] = param;
  }
  const tab = usmTabOf(state, nav);
  if (tab === 'map') delete next['tab'];
  else next['tab'] = tab;
  // Which milestone the burndown shows and what it counts: kept only while they name something real.
  if (!findMilestone(state, nav['milestone'])) delete next['milestone'];
  if (!BURNDOWN_UNITS.some((unit) => unit === nav['unit'])) delete next['unit'];
  // What the map highlights is how the reader looks at it, never a change.
  const highlight = highlightOf(nav);
  if (highlight === null) delete next['highlight'];
  else next['highlight'] = highlight;
  return next;
};
