import type { TemplateRenderContext } from '../../core/shell/contracts';
import type { UsmMessages } from './messages';

import { createEntityId } from '../../core/target';
import { tallyOf } from './burndown';
import { allUsmIds, defaultLabelTone, defaultStatusTone, type UsmState } from './model';
import { nextStoryNumber } from './story-key';

/**
 * The "add" affordances of the board as pure functions of the render context.
 * They need no element state, so the board template calls them directly.
 */
export const addActivity = (m: UsmMessages, context: TemplateRenderContext<UsmState>): void => {
  const id = createEntityId('new-activity', allUsmIds(context.state));
  const outcome = context.dispatch({
    type: 'ADD_ACTIVITY',
    target: { type: 'page', id: 'usm' },
    payload: { id, name: m.newActivityName },
  });
  if (!outcome.ok) return;
  const stepId = createEntityId('new-step', [...allUsmIds(context.state), id]);
  context.dispatch({
    type: 'ADD_STEP',
    target: { type: 'activity', id },
    payload: { id: stepId, name: m.newStepName },
  });
  context.navigate({ activity: id, step: null, story: null });
};

export const addStep = (m: UsmMessages, context: TemplateRenderContext<UsmState>, activityId: string): void => {
  const id = createEntityId('new-step', allUsmIds(context.state));
  context.dispatch({
    type: 'ADD_STEP',
    target: { type: 'activity', id: activityId },
    payload: { id, name: m.newStepName },
  });
};

export const addMilestone = (m: UsmMessages, context: TemplateRenderContext<UsmState>): void => {
  const id = createEntityId('new-milestone', allUsmIds(context.state));
  context.dispatch({
    type: 'ADD_MILESTONE',
    target: { type: 'page', id: 'usm' },
    payload: { id, name: m.newMilestoneName },
  });
};

export const addStory = (
  m: UsmMessages,
  context: TemplateRenderContext<UsmState>,
  activityId: string,
  stepId: string,
  milestoneId: string | undefined,
): void => {
  const id = createEntityId('new-story', allUsmIds(context.state));
  const outcome = context.dispatch({
    type: 'ADD_STORY',
    target: { type: 'step', id: stepId },
    payload: {
      id,
      name: m.newStoryName,
      activityId,
      ...(milestoneId === undefined ? {} : { milestoneId }),
      number: nextStoryNumber(context.base, context.state),
    },
  });
  if (outcome.ok) context.navigate({ activity: activityId, step: stepId, story: id });
};

export const addStatus = (m: UsmMessages, context: TemplateRenderContext<UsmState>): void => {
  const id = createEntityId('new-status', allUsmIds(context.state));
  context.dispatch({
    type: 'ADD_STATUS',
    target: { type: 'page', id: 'usm' },
    payload: { id, name: m.newStatusName, tone: defaultStatusTone(context.state.statuses.length) },
  });
};

export const addLabel = (m: UsmMessages, context: TemplateRenderContext<UsmState>): void => {
  const id = createEntityId('new-label', allUsmIds(context.state));
  context.dispatch({
    type: 'ADD_LABEL',
    target: { type: 'page', id: 'usm' },
    payload: { id, name: m.newLabelName, tone: defaultLabelTone(context.state.labels.length) },
  });
};

/** A new member at the end, in the next color of the cycle. */
export const addMember = (m: UsmMessages, context: TemplateRenderContext<UsmState>): void => {
  const id = createEntityId('new-member', allUsmIds(context.state));
  context.dispatch({
    type: 'ADD_MEMBER',
    target: { type: 'page', id: 'usm' },
    payload: { id, name: m.newMemberName, tone: defaultLabelTone(context.state.members.length) },
  });
};

/** A new size on the estimate scale, one point above the largest so far. */
export const addEstimate = (m: UsmMessages, context: TemplateRenderContext<UsmState>): void => {
  const id = createEntityId('new-estimate', allUsmIds(context.state));
  const points = Math.max(0, ...context.state.estimates.map((estimate) => estimate.points)) + 1;
  context.dispatch({
    type: 'ADD_ESTIMATE',
    target: { type: 'page', id: 'usm' },
    payload: { id, name: m.newEstimateName, points },
  });
};

/** Keeps the map's totals as they stand now, for the burndown to draw from. */
export const recordSnapshot = (context: TemplateRenderContext<UsmState>, now: Date): void => {
  const id = createEntityId(`snapshot-${now.toISOString().slice(0, 10)}`, allUsmIds(context.state));
  context.dispatch({
    type: 'RECORD_SNAPSHOT',
    target: { type: 'page', id: 'usm' },
    payload: { id, at: now.toISOString(), tally: tallyOf(context.state) },
  });
};
