import * as v from 'valibot';

import type { ActionInput } from '../../core/types';

import {
  defineAction,
  entityDedupeKey,
  entityIdSchema,
  type ActionSpecs,
  type TemplateAction,
} from '../../core/schema';

// Domain vocabulary for Example Mapping. No generic SET_FIELD / MOVE.
export const exampleMappingActions = {
  SET_STORY_NAME: defineAction('SET_STORY_NAME', 'story', v.object({ name: v.pipe(v.string(), v.minLength(1)) })),
  SET_STORY_DESCRIPTION: defineAction('SET_STORY_DESCRIPTION', 'story', v.object({ description: v.string() })),
  REORDER_STORY: defineAction('REORDER_STORY', 'story', v.object({ after: v.nullable(v.string()) }), {
    mode: 'sequence',
  }),
  ADD_STORY: defineAction(
    'ADD_STORY',
    'page',
    v.object({
      id: entityIdSchema,
      name: v.pipe(v.string(), v.minLength(1)),
      description: v.exactOptional(v.string()),
    }),
    { dedupeKey: entityDedupeKey },
  ),
  DELETE_STORY: defineAction('DELETE_STORY', 'story', v.object({})),

  SET_RULE_NAME: defineAction('SET_RULE_NAME', 'rule', v.object({ name: v.pipe(v.string(), v.minLength(1)) })),
  SET_RULE_DESCRIPTION: defineAction('SET_RULE_DESCRIPTION', 'rule', v.object({ description: v.string() })),
  MOVE_RULE: defineAction(
    'MOVE_RULE',
    'rule',
    v.object({
      storyId: v.pipe(v.string(), v.minLength(1)),
      after: v.nullable(v.string()),
    }),
    { mode: 'sequence' },
  ),
  REORDER_RULE: defineAction('REORDER_RULE', 'rule', v.object({ after: v.nullable(v.string()) }), {
    mode: 'sequence',
  }),
  ADD_RULE: defineAction(
    'ADD_RULE',
    'story',
    v.object({
      id: entityIdSchema,
      name: v.pipe(v.string(), v.minLength(1)),
      description: v.exactOptional(v.string()),
    }),
    { dedupeKey: entityDedupeKey },
  ),
  DELETE_RULE: defineAction('DELETE_RULE', 'rule', v.object({})),

  SET_EXAMPLE_NAME: defineAction('SET_EXAMPLE_NAME', 'example', v.object({ name: v.pipe(v.string(), v.minLength(1)) })),
  SET_EXAMPLE_DESCRIPTION: defineAction('SET_EXAMPLE_DESCRIPTION', 'example', v.object({ description: v.string() })),
  MOVE_EXAMPLE: defineAction(
    'MOVE_EXAMPLE',
    'example',
    v.object({
      ruleId: v.pipe(v.string(), v.minLength(1)),
      after: v.nullable(v.string()),
    }),
    { mode: 'sequence' },
  ),
  REORDER_EXAMPLE: defineAction('REORDER_EXAMPLE', 'example', v.object({ after: v.nullable(v.string()) }), {
    mode: 'sequence',
  }),
  ADD_EXAMPLE: defineAction(
    'ADD_EXAMPLE',
    'rule',
    v.object({
      id: entityIdSchema,
      name: v.pipe(v.string(), v.minLength(1)),
      description: v.exactOptional(v.string()),
    }),
    { dedupeKey: entityDedupeKey },
  ),
  DELETE_EXAMPLE: defineAction('DELETE_EXAMPLE', 'example', v.object({})),

  SET_QUESTION_NAME: defineAction(
    'SET_QUESTION_NAME',
    'question',
    v.object({ name: v.pipe(v.string(), v.minLength(1)) }),
  ),
  SET_QUESTION_DESCRIPTION: defineAction('SET_QUESTION_DESCRIPTION', 'question', v.object({ description: v.string() })),
  MOVE_QUESTION: defineAction(
    'MOVE_QUESTION',
    'question',
    v.object({
      ruleId: v.pipe(v.string(), v.minLength(1)),
      after: v.nullable(v.string()),
    }),
    { mode: 'sequence' },
  ),
  REORDER_QUESTION: defineAction('REORDER_QUESTION', 'question', v.object({ after: v.nullable(v.string()) }), {
    mode: 'sequence',
  }),
  ADD_QUESTION: defineAction(
    'ADD_QUESTION',
    'rule',
    v.object({
      id: entityIdSchema,
      name: v.pipe(v.string(), v.minLength(1)),
      description: v.exactOptional(v.string()),
    }),
    { dedupeKey: entityDedupeKey },
  ),
  DELETE_QUESTION: defineAction('DELETE_QUESTION', 'question', v.object({})),
} satisfies ActionSpecs;

/** The discriminated union of this template's actions. */
export type ExampleMappingAction = TemplateAction<typeof exampleMappingActions>;

export const exampleMappingAction = {
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
  reorderStory: (id: string, after: string | null): ActionInput => ({
    type: 'REORDER_STORY',
    target: { type: 'story', id },
    payload: { after },
  }),
  addStory: (id: string, name: string): ActionInput => ({
    type: 'ADD_STORY',
    target: { type: 'page', id: 'example-mapping' },
    payload: { id, name },
  }),
  deleteStory: (id: string): ActionInput => ({
    type: 'DELETE_STORY',
    target: { type: 'story', id },
    payload: {},
  }),
  setRuleName: (id: string, name: string): ActionInput => ({
    type: 'SET_RULE_NAME',
    target: { type: 'rule', id },
    payload: { name },
  }),
  setRuleDescription: (id: string, description: string): ActionInput => ({
    type: 'SET_RULE_DESCRIPTION',
    target: { type: 'rule', id },
    payload: { description },
  }),
  moveRule: (id: string, storyId: string, after: string | null): ActionInput => ({
    type: 'MOVE_RULE',
    target: { type: 'rule', id },
    payload: { storyId, after },
  }),
  reorderRule: (id: string, after: string | null): ActionInput => ({
    type: 'REORDER_RULE',
    target: { type: 'rule', id },
    payload: { after },
  }),
  addRule: (storyId: string, id: string, name: string): ActionInput => ({
    type: 'ADD_RULE',
    target: { type: 'story', id: storyId },
    payload: { id, name },
  }),
  deleteRule: (id: string): ActionInput => ({
    type: 'DELETE_RULE',
    target: { type: 'rule', id },
    payload: {},
  }),
  setExampleName: (id: string, name: string): ActionInput => ({
    type: 'SET_EXAMPLE_NAME',
    target: { type: 'example', id },
    payload: { name },
  }),
  setExampleDescription: (id: string, description: string): ActionInput => ({
    type: 'SET_EXAMPLE_DESCRIPTION',
    target: { type: 'example', id },
    payload: { description },
  }),
  moveExample: (id: string, ruleId: string, after: string | null): ActionInput => ({
    type: 'MOVE_EXAMPLE',
    target: { type: 'example', id },
    payload: { ruleId, after },
  }),
  reorderExample: (id: string, after: string | null): ActionInput => ({
    type: 'REORDER_EXAMPLE',
    target: { type: 'example', id },
    payload: { after },
  }),
  addExample: (ruleId: string, id: string, name: string): ActionInput => ({
    type: 'ADD_EXAMPLE',
    target: { type: 'rule', id: ruleId },
    payload: { id, name },
  }),
  deleteExample: (id: string): ActionInput => ({
    type: 'DELETE_EXAMPLE',
    target: { type: 'example', id },
    payload: {},
  }),
  setQuestionName: (id: string, name: string): ActionInput => ({
    type: 'SET_QUESTION_NAME',
    target: { type: 'question', id },
    payload: { name },
  }),
  setQuestionDescription: (id: string, description: string): ActionInput => ({
    type: 'SET_QUESTION_DESCRIPTION',
    target: { type: 'question', id },
    payload: { description },
  }),
  moveQuestion: (id: string, ruleId: string, after: string | null): ActionInput => ({
    type: 'MOVE_QUESTION',
    target: { type: 'question', id },
    payload: { ruleId, after },
  }),
  reorderQuestion: (id: string, after: string | null): ActionInput => ({
    type: 'REORDER_QUESTION',
    target: { type: 'question', id },
    payload: { after },
  }),
  addQuestion: (ruleId: string, id: string, name: string): ActionInput => ({
    type: 'ADD_QUESTION',
    target: { type: 'rule', id: ruleId },
    payload: { id, name },
  }),
  deleteQuestion: (id: string): ActionInput => ({
    type: 'DELETE_QUESTION',
    target: { type: 'question', id },
    payload: {},
  }),
};
