import type { ApplyResult, DraftAction } from '../../core/types';

import { assertNever, parseTemplateAction } from '../../core/schema';
import { exampleMappingActions } from './actions';
import {
  findExample,
  findQuestion,
  findRule,
  findStory,
  type ExampleMappingState,
  type MappingExample,
  type MappingQuestion,
  type MappingRule,
  type MappingStory,
} from './model';

// Pure reducer: (state, action) => state | null. No DOM, no I/O.
export const applyExampleMappingAction = (
  state: ExampleMappingState,
  action: DraftAction,
): ApplyResult<ExampleMappingState> => {
  const typed = parseTemplateAction(exampleMappingActions, action);
  if (typed === null) return null;
  const id = typed.target.id;
  switch (typed.type) {
    case 'SET_STORY_NAME':
      return updateStory(state, id, (story) => ({ ...story, name: typed.payload.name }));
    case 'SET_STORY_DESCRIPTION':
      return updateStory(state, id, (story) => ({ ...story, description: typed.payload.description }));
    case 'REORDER_STORY': {
      const next = reorderById(state.stories, id, typed.payload.after);
      return next === null ? null : { ...state, stories: next };
    }
    case 'ADD_STORY': {
      const payload = typed.payload;
      if (state.stories.some((story) => story.id === payload.id)) return state;
      if (idTaken(state, payload.id)) return null;
      return {
        ...state,
        stories: [
          ...state.stories,
          {
            id: payload.id,
            name: payload.name,
            ...(payload.description === undefined ? {} : { description: payload.description }),
          },
        ],
      };
    }
    case 'DELETE_STORY': {
      if (!state.stories.some((story) => story.id === id)) return null;
      const ruleIds = new Set(state.rules.filter((rule) => rule.storyId === id).map((rule) => rule.id));
      return {
        ...state,
        stories: state.stories.filter((story) => story.id !== id),
        rules: state.rules.filter((rule) => rule.storyId !== id),
        examples: state.examples.filter((example) => !ruleIds.has(example.ruleId)),
        questions: state.questions.filter((question) => !ruleIds.has(question.ruleId)),
      };
    }

    case 'SET_RULE_NAME':
      return updateRule(state, id, (rule) => ({ ...rule, name: typed.payload.name }));
    case 'SET_RULE_DESCRIPTION':
      return updateRule(state, id, (rule) => ({ ...rule, description: typed.payload.description }));
    case 'MOVE_RULE': {
      const payload = typed.payload;
      const rule = findRule(state, id);
      if (!rule) return null;
      if (!state.stories.some((story) => story.id === payload.storyId)) return null;
      const lane = state.rules.filter((candidate) => candidate.storyId === payload.storyId && candidate.id !== id);
      if (payload.after !== null && !lane.some((candidate) => candidate.id === payload.after)) return null;
      return { ...state, rules: placeRule(state.rules, { ...rule, storyId: payload.storyId }, payload.after) };
    }
    case 'REORDER_RULE': {
      const rule = findRule(state, id);
      if (!rule) return null;
      const lane = state.rules.filter((candidate) => candidate.storyId === rule.storyId);
      if (typed.payload.after !== null && !lane.some((candidate) => candidate.id === typed.payload.after)) {
        return null;
      }
      return { ...state, rules: placeRule(state.rules, rule, typed.payload.after) };
    }
    case 'ADD_RULE': {
      const payload = typed.payload;
      const story = findStory(state, id);
      if (!story) return null;
      if (state.rules.some((rule) => rule.id === payload.id)) return state;
      if (idTaken(state, payload.id)) return null;
      return {
        ...state,
        rules: [
          ...state.rules,
          {
            id: payload.id,
            storyId: story.id,
            name: payload.name,
            ...(payload.description === undefined ? {} : { description: payload.description }),
          },
        ],
      };
    }
    case 'DELETE_RULE': {
      if (!findRule(state, id)) return null;
      return {
        ...state,
        rules: state.rules.filter((rule) => rule.id !== id),
        examples: state.examples.filter((example) => example.ruleId !== id),
        questions: state.questions.filter((question) => question.ruleId !== id),
      };
    }

    case 'SET_EXAMPLE_NAME':
      return updateExample(state, id, (example) => ({ ...example, name: typed.payload.name }));
    case 'SET_EXAMPLE_DESCRIPTION':
      return updateExample(state, id, (example) => ({ ...example, description: typed.payload.description }));
    case 'MOVE_EXAMPLE': {
      const payload = typed.payload;
      const example = findExample(state, id);
      if (!example) return null;
      if (!findRule(state, payload.ruleId)) return null;
      const lane = state.examples.filter((candidate) => candidate.ruleId === payload.ruleId && candidate.id !== id);
      if (payload.after !== null && !lane.some((candidate) => candidate.id === payload.after)) return null;
      return {
        ...state,
        examples: placeInRule(state.examples, { ...example, ruleId: payload.ruleId }, payload.after),
      };
    }
    case 'REORDER_EXAMPLE': {
      const example = findExample(state, id);
      if (!example) return null;
      const lane = state.examples.filter((candidate) => candidate.ruleId === example.ruleId);
      if (typed.payload.after !== null && !lane.some((candidate) => candidate.id === typed.payload.after)) {
        return null;
      }
      return { ...state, examples: placeInRule(state.examples, example, typed.payload.after) };
    }
    case 'ADD_EXAMPLE': {
      const payload = typed.payload;
      const rule = findRule(state, id);
      if (!rule) return null;
      if (state.examples.some((example) => example.id === payload.id)) return state;
      if (idTaken(state, payload.id)) return null;
      return {
        ...state,
        examples: [
          ...state.examples,
          {
            id: payload.id,
            ruleId: rule.id,
            name: payload.name,
            ...(payload.description === undefined ? {} : { description: payload.description }),
          },
        ],
      };
    }
    case 'DELETE_EXAMPLE': {
      if (!findExample(state, id)) return null;
      return { ...state, examples: state.examples.filter((example) => example.id !== id) };
    }

    case 'SET_QUESTION_NAME':
      return updateQuestion(state, id, (question) => ({ ...question, name: typed.payload.name }));
    case 'SET_QUESTION_DESCRIPTION':
      return updateQuestion(state, id, (question) => ({ ...question, description: typed.payload.description }));
    case 'MOVE_QUESTION': {
      const payload = typed.payload;
      const question = findQuestion(state, id);
      if (!question) return null;
      if (!findRule(state, payload.ruleId)) return null;
      const lane = state.questions.filter((candidate) => candidate.ruleId === payload.ruleId && candidate.id !== id);
      if (payload.after !== null && !lane.some((candidate) => candidate.id === payload.after)) return null;
      return {
        ...state,
        questions: placeInRule(state.questions, { ...question, ruleId: payload.ruleId }, payload.after),
      };
    }
    case 'REORDER_QUESTION': {
      const question = findQuestion(state, id);
      if (!question) return null;
      const lane = state.questions.filter((candidate) => candidate.ruleId === question.ruleId);
      if (typed.payload.after !== null && !lane.some((candidate) => candidate.id === typed.payload.after)) {
        return null;
      }
      return { ...state, questions: placeInRule(state.questions, question, typed.payload.after) };
    }
    case 'ADD_QUESTION': {
      const payload = typed.payload;
      const rule = findRule(state, id);
      if (!rule) return null;
      if (state.questions.some((question) => question.id === payload.id)) return state;
      if (idTaken(state, payload.id)) return null;
      return {
        ...state,
        questions: [
          ...state.questions,
          {
            id: payload.id,
            ruleId: rule.id,
            name: payload.name,
            ...(payload.description === undefined ? {} : { description: payload.description }),
          },
        ],
      };
    }
    case 'DELETE_QUESTION': {
      if (!findQuestion(state, id)) return null;
      return { ...state, questions: state.questions.filter((question) => question.id !== id) };
    }
    default:
      return assertNever(typed);
  }
};

/** An id owned by another collection: the base keeps ids globally unique. */
const idTaken = (state: ExampleMappingState, id: string): boolean => {
  return (
    state.stories.some((story) => story.id === id) ||
    state.rules.some((rule) => rule.id === id) ||
    state.examples.some((example) => example.id === id) ||
    state.questions.some((question) => question.id === id)
  );
};

const updateStory = (
  state: ExampleMappingState,
  id: string,
  fn: (story: MappingStory) => MappingStory,
): ExampleMappingState | null => {
  if (!state.stories.some((story) => story.id === id)) return null;
  return { ...state, stories: state.stories.map((story) => (story.id === id ? fn(story) : story)) };
};

const updateRule = (
  state: ExampleMappingState,
  id: string,
  fn: (rule: MappingRule) => MappingRule,
): ExampleMappingState | null => {
  if (!state.rules.some((rule) => rule.id === id)) return null;
  return { ...state, rules: state.rules.map((rule) => (rule.id === id ? fn(rule) : rule)) };
};

const updateExample = (
  state: ExampleMappingState,
  id: string,
  fn: (example: MappingExample) => MappingExample,
): ExampleMappingState | null => {
  if (!state.examples.some((example) => example.id === id)) return null;
  return { ...state, examples: state.examples.map((example) => (example.id === id ? fn(example) : example)) };
};

const updateQuestion = (
  state: ExampleMappingState,
  id: string,
  fn: (question: MappingQuestion) => MappingQuestion,
): ExampleMappingState | null => {
  if (!state.questions.some((question) => question.id === id)) return null;
  return { ...state, questions: state.questions.map((question) => (question.id === id ? fn(question) : question)) };
};

// Places a rule into its story lane after `after`, keeping the lane where it
// used to live (or at the end) — the same cell-placement USM uses for stories.
const placeRule = (rules: readonly MappingRule[], rule: MappingRule, after: string | null): MappingRule[] => {
  const rest = rules.filter((candidate) => candidate.id !== rule.id);
  const lane = rest.filter((candidate) => candidate.storyId === rule.storyId);
  const ordered = after === null ? [rule, ...lane] : insertAfter(lane, rule, after);
  const firstIndex = rest.findIndex((candidate) => candidate.storyId === rule.storyId);
  const laneIds = new Set(lane.map((candidate) => candidate.id));
  const withoutLane = rest.filter((candidate) => !laneIds.has(candidate.id));
  const at = firstIndex < 0 ? withoutLane.length : Math.min(firstIndex, withoutLane.length);
  return [...withoutLane.slice(0, at), ...ordered, ...withoutLane.slice(at)];
};

// Examples and questions both stack under one rule: same lane placement.
const placeInRule = <T extends { readonly id: string; readonly ruleId: string }>(
  items: readonly T[],
  item: T,
  after: string | null,
): T[] => {
  const rest = items.filter((candidate) => candidate.id !== item.id);
  const lane = rest.filter((candidate) => candidate.ruleId === item.ruleId);
  const ordered = after === null ? [item, ...lane] : insertAfter(lane, item, after);
  const firstIndex = rest.findIndex((candidate) => candidate.ruleId === item.ruleId);
  const laneIds = new Set(lane.map((candidate) => candidate.id));
  const withoutLane = rest.filter((candidate) => !laneIds.has(candidate.id));
  const at = firstIndex < 0 ? withoutLane.length : Math.min(firstIndex, withoutLane.length);
  return [...withoutLane.slice(0, at), ...ordered, ...withoutLane.slice(at)];
};

export const reorderById = <T extends { id: string }>(
  items: readonly T[],
  id: string,
  after: string | null,
): T[] | null => {
  if (!items.some((item) => item.id === id)) return null;
  if (after !== null && !items.some((item) => item.id === after)) return null;
  if (after === id) return [...items];
  const moving = items.find((item) => item.id === id);
  if (moving === undefined) return null;
  const rest = items.filter((item) => item.id !== id);
  return insertAfter(rest, moving, after);
};

const insertAfter = <T extends { id: string }>(rest: readonly T[], item: T, after: string | null): T[] => {
  const next = [...rest];
  const anchor = after === null ? -1 : next.findIndex((candidate) => candidate.id === after);
  next.splice(anchor + 1, 0, item);
  return next;
};
