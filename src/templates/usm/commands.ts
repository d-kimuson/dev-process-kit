import type { TemplateRenderContext } from '../../core/shell/contracts';
import type { UsmMessages } from './messages';

import { createEntityId } from '../../core/target';
import { allUsmIds, type UsmState } from './model';

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
    payload: { id, name: m.newStoryName, activityId, ...(milestoneId === undefined ? {} : { milestoneId }) },
  });
  if (outcome.ok) context.navigate({ activity: activityId, step: stepId, story: id });
};
