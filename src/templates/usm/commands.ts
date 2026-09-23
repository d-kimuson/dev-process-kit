import type { TemplateRenderContext } from '../../core/shell/contracts';

import { createEntityId } from '../../core/target';
import { allUsmIds, type UsmState } from './model';

/**
 * The "add" affordances of the board as pure functions of the render context.
 * They need no element state, so the board template calls them directly.
 */
export const addActivity = (context: TemplateRenderContext<UsmState>): void => {
  const id = createEntityId('new-activity', allUsmIds(context.state));
  const outcome = context.dispatch({
    type: 'ADD_ACTIVITY',
    target: { type: 'page', id: 'usm' },
    payload: { id, name: '新しいアクティビティ' },
  });
  if (!outcome.ok) return;
  const stepId = createEntityId('new-step', [...allUsmIds(context.state), id]);
  context.dispatch({
    type: 'ADD_STEP',
    target: { type: 'activity', id },
    payload: { id: stepId, name: '新しいステップ' },
  });
  context.navigate({ activity: id, step: null, story: null });
};

export const addStep = (context: TemplateRenderContext<UsmState>, activityId: string): void => {
  const id = createEntityId('new-step', allUsmIds(context.state));
  context.dispatch({
    type: 'ADD_STEP',
    target: { type: 'activity', id: activityId },
    payload: { id, name: '新しいステップ' },
  });
};

export const addMilestone = (context: TemplateRenderContext<UsmState>): void => {
  const id = createEntityId('new-milestone', allUsmIds(context.state));
  context.dispatch({
    type: 'ADD_MILESTONE',
    target: { type: 'page', id: 'usm' },
    payload: { id, name: '新しいマイルストーン' },
  });
};

export const addStory = (
  context: TemplateRenderContext<UsmState>,
  activityId: string,
  stepId: string,
  milestoneId: string | undefined,
): void => {
  const id = createEntityId('new-story', allUsmIds(context.state));
  const outcome = context.dispatch({
    type: 'ADD_STORY',
    target: { type: 'step', id: stepId },
    payload: { id, name: '新しいストーリー', activityId, ...(milestoneId === undefined ? {} : { milestoneId }) },
  });
  if (outcome.ok) context.navigate({ activity: activityId, step: stepId, story: id });
};
