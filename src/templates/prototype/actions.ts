import * as v from 'valibot';

import type { ActionInput } from '../../core/types';

import {
  defineAction,
  entityDedupeKey,
  entityIdSchema,
  type ActionSpecs,
  type TemplateAction,
} from '../../core/schema';
import { PREVIEW_KINDS, PREVIEW_VIEWPORTS, type PrototypePreview } from './model';

/**
 * Prototype action vocabulary.
 *
 * Vocabulary stays in the template's domain language: no generic
 * `SET_FIELD` / `MOVE`. Patch actions describe the *end state*, so
 * replaying a draft is idempotent.
 */
export const prototypeActions = {
  SET_ACTIVITY_NAME: defineAction(
    'SET_ACTIVITY_NAME',
    'activity',
    v.object({ name: v.pipe(v.string(), v.minLength(1)) }),
  ),
  SET_ACTIVITY_DESCRIPTION: defineAction('SET_ACTIVITY_DESCRIPTION', 'activity', v.object({ description: v.string() })),
  SET_STORY_NAME: defineAction('SET_STORY_NAME', 'story', v.object({ name: v.pipe(v.string(), v.minLength(1)) })),
  SET_STORY_DESCRIPTION: defineAction('SET_STORY_DESCRIPTION', 'story', v.object({ description: v.string() })),
  SET_STEP_NAME: defineAction('SET_STEP_NAME', 'step', v.object({ name: v.pipe(v.string(), v.minLength(1)) })),
  SET_STEP_DESCRIPTION: defineAction('SET_STEP_DESCRIPTION', 'step', v.object({ description: v.string() })),

  SET_PREVIEW_KIND: defineAction('SET_PREVIEW_KIND', 'preview', v.object({ kind: v.picklist(PREVIEW_KINDS) })),
  SET_PREVIEW_VIEWPORT: defineAction(
    'SET_PREVIEW_VIEWPORT',
    'preview',
    v.object({ viewport: v.picklist(PREVIEW_VIEWPORTS) }),
  ),
  SET_PREVIEW_LABEL: defineAction('SET_PREVIEW_LABEL', 'preview', v.object({ label: v.string() })),

  REORDER_ACTIVITY: defineAction('REORDER_ACTIVITY', 'activity', v.object({ after: v.nullable(v.string()) }), {
    mode: 'sequence',
  }),
  REORDER_STORY: defineAction('REORDER_STORY', 'story', v.object({ after: v.nullable(v.string()) }), {
    mode: 'sequence',
  }),
  REORDER_STEP: defineAction('REORDER_STEP', 'step', v.object({ after: v.nullable(v.string()) }), { mode: 'sequence' }),
  MOVE_STORY: defineAction(
    'MOVE_STORY',
    'story',
    v.object({ toActivity: v.pipe(v.string(), v.minLength(1)), after: v.nullable(v.string()) }),
    { mode: 'sequence' },
  ),
  MOVE_STEP: defineAction(
    'MOVE_STEP',
    'step',
    v.object({ toStory: v.pipe(v.string(), v.minLength(1)), after: v.nullable(v.string()) }),
    { mode: 'sequence' },
  ),

  ADD_ACTIVITY: defineAction(
    'ADD_ACTIVITY',
    'page',
    v.object({
      id: entityIdSchema,
      name: v.pipe(v.string(), v.minLength(1)),
      description: v.exactOptional(v.string()),
    }),
    { dedupeKey: entityDedupeKey },
  ),
  ADD_STORY: defineAction(
    'ADD_STORY',
    'activity',
    v.object({
      id: entityIdSchema,
      name: v.pipe(v.string(), v.minLength(1)),
      description: v.exactOptional(v.string()),
    }),
    { dedupeKey: entityDedupeKey },
  ),
  ADD_STEP: defineAction(
    'ADD_STEP',
    'story',
    v.object({
      id: entityIdSchema,
      name: v.pipe(v.string(), v.minLength(1)),
      description: v.exactOptional(v.string()),
      previews: v.exactOptional(
        v.array(
          v.object({
            id: entityIdSchema,
            kind: v.optional(v.picklist(PREVIEW_KINDS), 'browser'),
            viewport: v.optional(v.picklist(PREVIEW_VIEWPORTS), 'fluid'),
            label: v.exactOptional(v.string()),
            url: v.exactOptional(v.string()),
          }),
        ),
      ),
    }),
    { dedupeKey: entityDedupeKey },
  ),
  ADD_PREVIEW: defineAction(
    'ADD_PREVIEW',
    'step',
    v.object({
      id: entityIdSchema,
      kind: v.optional(v.picklist(PREVIEW_KINDS), 'browser'),
      viewport: v.optional(v.picklist(PREVIEW_VIEWPORTS), 'fluid'),
      label: v.exactOptional(v.string()),
      url: v.exactOptional(v.string()),
    }),
    { dedupeKey: entityDedupeKey },
  ),

  DELETE_ACTIVITY: defineAction('DELETE_ACTIVITY', 'activity', v.object({})),
  DELETE_STORY: defineAction('DELETE_STORY', 'story', v.object({})),
  DELETE_STEP: defineAction('DELETE_STEP', 'step', v.object({})),
  DELETE_PREVIEW: defineAction('DELETE_PREVIEW', 'preview', v.object({})),
} satisfies ActionSpecs;

/** The discriminated union of this template's actions. */
export type PrototypeAction = TemplateAction<typeof prototypeActions>;

/**
 * Ergonomic builders for template UI code. They only shape `ActionInput`;
 * validation still happens in the core pipeline.
 */
export const prototypeAction = {
  setActivityName: (id: string, name: string): ActionInput => ({
    type: 'SET_ACTIVITY_NAME',
    target: { type: 'activity', id },
    payload: { name },
  }),
  setActivityDescription: (id: string, description: string): ActionInput => ({
    type: 'SET_ACTIVITY_DESCRIPTION',
    target: { type: 'activity', id },
    payload: { description },
  }),
  setStoryName: (id: string, name: string): ActionInput => ({
    type: 'SET_STORY_NAME',
    target: { type: 'story', id },
    payload: { name },
  }),
  setStoryDescription: (id: string, description: string): ActionInput => ({
    type: 'SET_STORY_DESCRIPTION',
    target: { type: 'story', id },
    payload: { description },
  }),
  setStepName: (id: string, name: string): ActionInput => ({
    type: 'SET_STEP_NAME',
    target: { type: 'step', id },
    payload: { name },
  }),
  setStepDescription: (id: string, description: string): ActionInput => ({
    type: 'SET_STEP_DESCRIPTION',
    target: { type: 'step', id },
    payload: { description },
  }),
  setPreviewViewport: (id: string, viewport: PrototypePreview['viewport']): ActionInput => ({
    type: 'SET_PREVIEW_VIEWPORT',
    target: { type: 'preview', id },
    payload: { viewport },
  }),
  setPreviewKind: (id: string, kind: PrototypePreview['kind']): ActionInput => ({
    type: 'SET_PREVIEW_KIND',
    target: { type: 'preview', id },
    payload: { kind },
  }),
  setPreviewLabel: (id: string, label: string): ActionInput => ({
    type: 'SET_PREVIEW_LABEL',
    target: { type: 'preview', id },
    payload: { label },
  }),
  reorderActivity: (id: string, after: string | null): ActionInput => ({
    type: 'REORDER_ACTIVITY',
    target: { type: 'activity', id },
    payload: { after },
  }),
  reorderStory: (id: string, after: string | null): ActionInput => ({
    type: 'REORDER_STORY',
    target: { type: 'story', id },
    payload: { after },
  }),
  reorderStep: (id: string, after: string | null): ActionInput => ({
    type: 'REORDER_STEP',
    target: { type: 'step', id },
    payload: { after },
  }),
  moveStep: (id: string, toStory: string, after: string | null): ActionInput => ({
    type: 'MOVE_STEP',
    target: { type: 'step', id },
    payload: { toStory, after },
  }),
  moveStory: (id: string, toActivity: string, after: string | null): ActionInput => ({
    type: 'MOVE_STORY',
    target: { type: 'story', id },
    payload: { toActivity, after },
  }),
  addActivity: (id: string, name: string, description?: string): ActionInput => ({
    type: 'ADD_ACTIVITY',
    target: { type: 'page', id: 'prototype' },
    payload: {
      id,
      name,
      ...(description === undefined ? {} : { description }),
    },
  }),
  addStory: (activityId: string, id: string, name: string, description?: string): ActionInput => ({
    type: 'ADD_STORY',
    target: { type: 'activity', id: activityId },
    payload: {
      id,
      name,
      ...(description === undefined ? {} : { description }),
    },
  }),
  addStep: (storyId: string, id: string, name: string, previews?: readonly PrototypePreview[]): ActionInput => ({
    type: 'ADD_STEP',
    target: { type: 'story', id: storyId },
    payload: { id, name, ...(previews === undefined ? {} : { previews }) },
  }),
  addPreview: (stepId: string, preview: PrototypePreview): ActionInput => ({
    type: 'ADD_PREVIEW',
    target: { type: 'step', id: stepId },
    payload: { ...preview },
  }),
  deleteActivity: (id: string): ActionInput => ({
    type: 'DELETE_ACTIVITY',
    target: { type: 'activity', id },
    payload: {},
  }),
  deleteStory: (id: string): ActionInput => ({
    type: 'DELETE_STORY',
    target: { type: 'story', id },
    payload: {},
  }),
  deleteStep: (id: string): ActionInput => ({
    type: 'DELETE_STEP',
    target: { type: 'step', id },
    payload: {},
  }),
  deletePreview: (id: string): ActionInput => ({
    type: 'DELETE_PREVIEW',
    target: { type: 'preview', id },
    payload: {},
  }),
};
