import type { DropPlace } from '../../lib/dom/drag';

import { reorderAnchor } from '../../lib/reorder';
import { findExample, findQuestion, findRule, findStory, type ExampleMappingState } from './model';

/**
 * Pure drop-position helpers: given the ordered ids of the destination, the
 * item under the pointer (`null` when dropped on empty space) and whether the
 * pointer is above (`before`), below (`after`) or on empty space (`end`),
 * return the `after` anchor of the reorder (`null` = first).
 */
export const dropAfter = (orderedIds: readonly string[], hoveredId: string | null, place: DropPlace): string | null => {
  const last = orderedIds.at(-1) ?? null;
  if (hoveredId === null || place === 'end') return last;
  const index = orderedIds.indexOf(hoveredId);
  if (index < 0) return last;
  if (place === 'after') return hoveredId;
  return index === 0 ? null : (orderedIds.at(index - 1) ?? null);
};

export type MoveRuleInput = {
  readonly type: 'MOVE_RULE';
  readonly target: { readonly type: 'rule'; readonly id: string };
  readonly payload: { readonly storyId: string; readonly after: string | null };
};

export type MoveExampleInput = {
  readonly type: 'MOVE_EXAMPLE';
  readonly target: { readonly type: 'example'; readonly id: string };
  readonly payload: { readonly ruleId: string; readonly after: string | null };
};

export type MoveQuestionInput = {
  readonly type: 'MOVE_QUESTION';
  readonly target: { readonly type: 'question'; readonly id: string };
  readonly payload: { readonly ruleId: string; readonly after: string | null };
};

export type MoveStoryInput = {
  readonly type: 'REORDER_STORY';
  readonly target: { readonly type: 'story'; readonly id: string };
  readonly payload: { readonly after: string | null };
};

/** What a story-header drop dispatches: stories reorder globally. */
export const resolveStoryDrop = (
  state: ExampleMappingState,
  storyId: string,
  hoveredId: string | null,
  place: DropPlace,
): MoveStoryInput | null => {
  if (!findStory(state, storyId)) return null;
  const orderedIds = state.stories.map((story) => story.id);
  return {
    type: 'REORDER_STORY',
    target: { type: 'story', id: storyId },
    payload: { after: reorderAnchor(orderedIds, storyId, hoveredId, place) },
  };
};

/** What a drop on a story's rule lane dispatches. */
export const resolveRuleDrop = (
  state: ExampleMappingState,
  storyId: string,
  ruleId: string,
  hoveredId: string | null,
  place: DropPlace,
): MoveRuleInput | null => {
  if (!findStory(state, storyId) || !findRule(state, ruleId)) return null;
  const orderedIds = state.rules.filter((rule) => rule.storyId === storyId).map((rule) => rule.id);
  return {
    type: 'MOVE_RULE',
    target: { type: 'rule', id: ruleId },
    payload: { storyId, after: reorderAnchor(orderedIds, ruleId, hoveredId, place) },
  };
};

/** What a drop on a rule's example lane dispatches. */
export const resolveExampleDrop = (
  state: ExampleMappingState,
  ruleId: string,
  exampleId: string,
  hoveredId: string | null,
  place: DropPlace,
): MoveExampleInput | null => {
  if (!findRule(state, ruleId) || !findExample(state, exampleId)) return null;
  const orderedIds = state.examples.filter((example) => example.ruleId === ruleId).map((example) => example.id);
  return {
    type: 'MOVE_EXAMPLE',
    target: { type: 'example', id: exampleId },
    payload: { ruleId, after: reorderAnchor(orderedIds, exampleId, hoveredId, place) },
  };
};

/** What a drop on a rule's question area dispatches. */
export const resolveQuestionDrop = (
  state: ExampleMappingState,
  ruleId: string,
  questionId: string,
  hoveredId: string | null,
  place: DropPlace,
): MoveQuestionInput | null => {
  if (!findRule(state, ruleId) || !findQuestion(state, questionId)) return null;
  const orderedIds = state.questions.filter((question) => question.ruleId === ruleId).map((question) => question.id);
  return {
    type: 'MOVE_QUESTION',
    target: { type: 'question', id: questionId },
    payload: { ruleId, after: reorderAnchor(orderedIds, questionId, hoveredId, place) },
  };
};
