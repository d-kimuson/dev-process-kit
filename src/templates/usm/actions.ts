import * as v from 'valibot';

import type { ActionInput } from '../../core/types';

import {
  defineAction,
  entityDedupeKey,
  entityIdSchema,
  type ActionSpecs,
  type TemplateAction,
} from '../../core/schema';

// Domain vocabulary for User Story Mapping. No generic SET_FIELD / MOVE.
export const usmActions = {
  SET_ACTIVITY_NAME: defineAction(
    'SET_ACTIVITY_NAME',
    'activity',
    v.object({ name: v.pipe(v.string(), v.minLength(1)) }),
  ),
  SET_STEP_NAME: defineAction('SET_STEP_NAME', 'step', v.object({ name: v.pipe(v.string(), v.minLength(1)) })),
  REORDER_STEP: defineAction('REORDER_STEP', 'step', v.object({ after: v.nullable(v.string()) }), { mode: 'sequence' }),
  ADD_ACTIVITY: defineAction(
    'ADD_ACTIVITY',
    'artifact',
    v.object({ id: entityIdSchema, name: v.pipe(v.string(), v.minLength(1)) }),
    {
      dedupeKey: entityDedupeKey,
    },
  ),
  ADD_STEP: defineAction(
    'ADD_STEP',
    'activity',
    v.object({ id: entityIdSchema, name: v.pipe(v.string(), v.minLength(1)) }),
    {
      dedupeKey: entityDedupeKey,
    },
  ),
  DELETE_ACTIVITY: defineAction('DELETE_ACTIVITY', 'activity', v.object({})),
  DELETE_STEP: defineAction('DELETE_STEP', 'step', v.object({})),

  SET_STORY_NAME: defineAction('SET_STORY_NAME', 'story', v.object({ name: v.pipe(v.string(), v.minLength(1)) })),
  SET_STORY_DESCRIPTION: defineAction('SET_STORY_DESCRIPTION', 'story', v.object({ description: v.string() })),
  SET_STORY_MILESTONE: defineAction('SET_STORY_MILESTONE', 'story', v.object({ milestoneId: v.nullable(v.string()) })),
  MOVE_STORY: defineAction(
    'MOVE_STORY',
    'story',
    v.object({
      activityId: v.pipe(v.string(), v.minLength(1)),
      stepId: v.pipe(v.string(), v.minLength(1)),
      milestoneId: v.nullable(v.string()),
      after: v.nullable(v.string()),
    }),
    { mode: 'sequence' },
  ),
  REORDER_STORY: defineAction('REORDER_STORY', 'story', v.object({ after: v.nullable(v.string()) }), {
    mode: 'sequence',
  }),
  ADD_STORY: defineAction(
    'ADD_STORY',
    'step',
    v.object({
      id: entityIdSchema,
      name: v.pipe(v.string(), v.minLength(1)),
      activityId: v.pipe(v.string(), v.minLength(1)),
      milestoneId: v.exactOptional(v.string()),
    }),
    { dedupeKey: entityDedupeKey },
  ),
  DELETE_STORY: defineAction('DELETE_STORY', 'story', v.object({})),

  SET_MILESTONE_NAME: defineAction(
    'SET_MILESTONE_NAME',
    'milestone',
    v.object({ name: v.pipe(v.string(), v.minLength(1)) }),
  ),
  ADD_MILESTONE: defineAction(
    'ADD_MILESTONE',
    'artifact',
    v.object({ id: entityIdSchema, name: v.pipe(v.string(), v.minLength(1)) }),
    {
      dedupeKey: entityDedupeKey,
    },
  ),
  DELETE_MILESTONE: defineAction('DELETE_MILESTONE', 'milestone', v.object({})),
  REORDER_MILESTONE: defineAction('REORDER_MILESTONE', 'milestone', v.object({ after: v.nullable(v.string()) }), {
    mode: 'sequence',
  }),
} satisfies ActionSpecs;

/** The discriminated union of this template's actions. */
export type UsmAction = TemplateAction<typeof usmActions>;

export const usmAction = {
  setActivityName: (id: string, name: string): ActionInput => ({
    type: 'SET_ACTIVITY_NAME',
    target: { type: 'activity', id },
    payload: { name },
  }),
  setStepName: (id: string, name: string): ActionInput => ({
    type: 'SET_STEP_NAME',
    target: { type: 'step', id },
    payload: { name },
  }),
};
