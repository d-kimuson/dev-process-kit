import * as v from 'valibot';

import type { ActionInput } from '../../core/types';

import {
  defineAction,
  entityDedupeKey,
  entityIdSchema,
  type ActionSpecs,
  type TemplateAction,
} from '../../core/schema';
import {
  dueDateSchema,
  estimatePointsSchema,
  linkUrlSchema,
  snapshotAtSchema,
  statusIconSchema,
  statusToneSchema,
  statusWeightSchema,
  tallyRowSchema,
} from './model';

// Domain vocabulary for User Story Mapping. No generic SET_FIELD / MOVE.
export const usmActions = {
  SET_ACTIVITY_NAME: defineAction(
    'SET_ACTIVITY_NAME',
    'activity',
    v.object({ name: v.pipe(v.string(), v.minLength(1)) }),
  ),
  SET_ACTIVITY_ACTOR: defineAction('SET_ACTIVITY_ACTOR', 'activity', v.object({ actor: v.string() })),
  SET_STEP_NAME: defineAction('SET_STEP_NAME', 'step', v.object({ name: v.pipe(v.string(), v.minLength(1)) })),
  REORDER_STEP: defineAction('REORDER_STEP', 'step', v.object({ after: v.nullable(v.string()) }), { mode: 'sequence' }),
  ADD_ACTIVITY: defineAction(
    'ADD_ACTIVITY',
    'page',
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
  ADD_STORY_LINK: defineAction(
    'ADD_STORY_LINK',
    'story',
    v.object({ url: linkUrlSchema, label: v.exactOptional(v.pipe(v.string(), v.minLength(1))) }),
  ),
  REMOVE_STORY_LINK: defineAction('REMOVE_STORY_LINK', 'story', v.object({ url: v.string() })),
  SET_STORY_STATUS: defineAction(
    'SET_STORY_STATUS',
    'story',
    v.object({ statusId: v.pipe(v.string(), v.minLength(1)) }),
  ),

  SET_MILESTONE_NAME: defineAction(
    'SET_MILESTONE_NAME',
    'milestone',
    v.object({ name: v.pipe(v.string(), v.minLength(1)) }),
  ),
  ADD_MILESTONE: defineAction(
    'ADD_MILESTONE',
    'page',
    v.object({ id: entityIdSchema, name: v.pipe(v.string(), v.minLength(1)) }),
    {
      dedupeKey: entityDedupeKey,
    },
  ),
  DELETE_MILESTONE: defineAction('DELETE_MILESTONE', 'milestone', v.object({})),
  REORDER_MILESTONE: defineAction('REORDER_MILESTONE', 'milestone', v.object({ after: v.nullable(v.string()) }), {
    mode: 'sequence',
  }),
  SET_MILESTONE_DUE_DATE: defineAction(
    'SET_MILESTONE_DUE_DATE',
    'milestone',
    v.object({ dueDate: v.nullable(dueDateSchema) }),
  ),

  ADD_STATUS: defineAction(
    'ADD_STATUS',
    'page',
    v.object({
      id: entityIdSchema,
      name: v.pipe(v.string(), v.minLength(1)),
      tone: statusToneSchema,
      icon: v.exactOptional(statusIconSchema),
    }),
    { dedupeKey: entityDedupeKey },
  ),
  SET_STATUS_NAME: defineAction('SET_STATUS_NAME', 'status', v.object({ name: v.pipe(v.string(), v.minLength(1)) })),
  SET_STATUS_TONE: defineAction('SET_STATUS_TONE', 'status', v.object({ tone: statusToneSchema })),
  SET_STATUS_ICON: defineAction('SET_STATUS_ICON', 'status', v.object({ icon: statusIconSchema })),
  SET_STATUS_WEIGHT: defineAction('SET_STATUS_WEIGHT', 'status', v.object({ weight: statusWeightSchema })),
  DELETE_STATUS: defineAction('DELETE_STATUS', 'status', v.object({})),
  REORDER_STATUS: defineAction('REORDER_STATUS', 'status', v.object({ after: v.nullable(v.string()) }), {
    mode: 'sequence',
  }),

  ADD_LABEL: defineAction(
    'ADD_LABEL',
    'page',
    v.object({ id: entityIdSchema, name: v.pipe(v.string(), v.minLength(1)), tone: statusToneSchema }),
    { dedupeKey: entityDedupeKey },
  ),
  SET_LABEL_NAME: defineAction('SET_LABEL_NAME', 'label', v.object({ name: v.pipe(v.string(), v.minLength(1)) })),
  SET_LABEL_TONE: defineAction('SET_LABEL_TONE', 'label', v.object({ tone: statusToneSchema })),
  DELETE_LABEL: defineAction('DELETE_LABEL', 'label', v.object({})),
  REORDER_LABEL: defineAction('REORDER_LABEL', 'label', v.object({ after: v.nullable(v.string()) }), {
    mode: 'sequence',
  }),
  ADD_STORY_LABEL: defineAction('ADD_STORY_LABEL', 'story', v.object({ labelId: v.pipe(v.string(), v.minLength(1)) })),
  REMOVE_STORY_LABEL: defineAction(
    'REMOVE_STORY_LABEL',
    'story',
    v.object({ labelId: v.pipe(v.string(), v.minLength(1)) }),
  ),
  ADD_STORY_BLOCKER: defineAction(
    'ADD_STORY_BLOCKER',
    'story',
    v.object({ blockerId: v.pipe(v.string(), v.minLength(1)) }),
  ),
  REMOVE_STORY_BLOCKER: defineAction(
    'REMOVE_STORY_BLOCKER',
    'story',
    v.object({ blockerId: v.pipe(v.string(), v.minLength(1)) }),
  ),

  ADD_ESTIMATE: defineAction(
    'ADD_ESTIMATE',
    'page',
    v.object({ id: entityIdSchema, name: v.pipe(v.string(), v.minLength(1)), points: estimatePointsSchema }),
    { dedupeKey: entityDedupeKey },
  ),
  SET_ESTIMATE_NAME: defineAction(
    'SET_ESTIMATE_NAME',
    'estimate',
    v.object({ name: v.pipe(v.string(), v.minLength(1)) }),
  ),
  SET_ESTIMATE_POINTS: defineAction('SET_ESTIMATE_POINTS', 'estimate', v.object({ points: estimatePointsSchema })),
  DELETE_ESTIMATE: defineAction('DELETE_ESTIMATE', 'estimate', v.object({})),
  REORDER_ESTIMATE: defineAction('REORDER_ESTIMATE', 'estimate', v.object({ after: v.nullable(v.string()) }), {
    mode: 'sequence',
  }),
  SET_STORY_ESTIMATE: defineAction(
    'SET_STORY_ESTIMATE',
    'story',
    v.object({ estimateId: v.nullable(v.pipe(v.string(), v.minLength(1))) }),
  ),
  RECORD_SNAPSHOT: defineAction(
    'RECORD_SNAPSHOT',
    'page',
    v.object({ id: entityIdSchema, at: snapshotAtSchema, tally: v.array(tallyRowSchema) }),
    { dedupeKey: entityDedupeKey },
  ),
  DELETE_SNAPSHOT: defineAction('DELETE_SNAPSHOT', 'snapshot', v.object({})),
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
