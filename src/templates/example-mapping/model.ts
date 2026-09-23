import { sortBy } from 'es-toolkit/array';
import * as v from 'valibot';

import { entityIdSchema } from '../../core/schema';

/**
 * Meaning model of the example mapping template (Matt Wynne's Example Mapping):
 * one yellow story card per column, blue rule cards under it, green example
 * cards under each rule, and red question cards under each rule, below its
 * examples.
 */
export type MappingStory = {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
};

export type MappingRule = {
  readonly id: string;
  readonly storyId: string;
  readonly name: string;
  readonly description?: string;
};

export type MappingExample = {
  readonly id: string;
  readonly ruleId: string;
  readonly name: string;
  readonly description?: string;
};

/** An open question about one rule: what the table could not answer yet. */
export type MappingQuestion = {
  readonly id: string;
  readonly ruleId: string;
  readonly name: string;
  readonly description?: string;
};

export type ExampleMappingState = {
  readonly title?: string;
  readonly stories: readonly MappingStory[];
  readonly rules: readonly MappingRule[];
  readonly examples: readonly MappingExample[];
  readonly questions: readonly MappingQuestion[];
};

export type MappingCardKind = 'story' | 'rule' | 'example' | 'question';

export type MappingCard = {
  readonly kind: MappingCardKind;
  readonly id: string;
  readonly name: string;
  readonly description?: string;
};

const namedSchema = v.strictObject({
  id: entityIdSchema,
  name: v.pipe(v.string(), v.minLength(1)),
  description: v.exactOptional(v.string()),
});

const ruleSchema = v.strictObject({
  id: entityIdSchema,
  storyId: v.pipe(v.string(), v.minLength(1)),
  name: v.pipe(v.string(), v.minLength(1)),
  description: v.exactOptional(v.string()),
});

/** Examples and questions share a shape: both hang off one rule. */
const ruleCardSchema = v.strictObject({
  id: entityIdSchema,
  ruleId: v.pipe(v.string(), v.minLength(1)),
  name: v.pipe(v.string(), v.minLength(1)),
  description: v.exactOptional(v.string()),
});

export const exampleMappingBaseSchema = v.strictObject({
  title: v.exactOptional(v.string()),
  stories: v.optional(v.array(namedSchema), []),
  rules: v.optional(v.array(ruleSchema), []),
  examples: v.optional(v.array(ruleCardSchema), []),
  questions: v.optional(v.array(ruleCardSchema), []),
});

export const parseExampleMappingBase = (input: unknown): ExampleMappingState => {
  const parsed = v.parse(exampleMappingBaseSchema, input);
  const seen = new Set<string>();
  const checkDuplicate = (kind: string, id: string): void => {
    if (seen.has(id)) throw new Error(`duplicate id "${id}" in ${kind}`);
    seen.add(id);
  };
  const storyIds = new Set(parsed.stories.map((story) => story.id));
  for (const story of parsed.stories) checkDuplicate('stories', story.id);
  for (const rule of parsed.rules) {
    checkDuplicate('rules', rule.id);
    if (!storyIds.has(rule.storyId)) {
      throw new Error(`rule "${rule.id}" references unknown storyId "${rule.storyId}"`);
    }
  }
  const ruleById = new Map(parsed.rules.map((rule) => [rule.id, rule]));
  for (const example of parsed.examples) {
    checkDuplicate('examples', example.id);
    if (!ruleById.has(example.ruleId)) {
      throw new Error(`example "${example.id}" references unknown ruleId "${example.ruleId}"`);
    }
  }
  for (const question of parsed.questions) {
    checkDuplicate('questions', question.id);
    if (!ruleById.has(question.ruleId)) {
      throw new Error(`question "${question.id}" references unknown ruleId "${question.ruleId}"`);
    }
  }
  return parsed;
};

export const emptyExampleMappingBase = (): ExampleMappingState => {
  return { stories: [], rules: [], examples: [], questions: [] };
};

/**
 * Rules are only ever shown under their story, and examples and questions
 * under their rule, so their order across lanes is incidental.
 */
export const canonicalExampleMappingState = (state: ExampleMappingState): ExampleMappingState => ({
  ...state,
  rules: sortBy(state.rules, ['storyId']),
  examples: sortBy(state.examples, ['ruleId']),
  questions: sortBy(state.questions, ['ruleId']),
});

export const findStory = (state: ExampleMappingState, id: string | undefined): MappingStory | undefined => {
  if (id === undefined) return undefined;
  return state.stories.find((story) => story.id === id);
};

export const findRule = (state: ExampleMappingState, id: string | undefined): MappingRule | undefined => {
  if (id === undefined) return undefined;
  return state.rules.find((rule) => rule.id === id);
};

export const findExample = (state: ExampleMappingState, id: string | undefined): MappingExample | undefined => {
  if (id === undefined) return undefined;
  return state.examples.find((example) => example.id === id);
};

export const findQuestion = (state: ExampleMappingState, id: string | undefined): MappingQuestion | undefined => {
  if (id === undefined) return undefined;
  return state.questions.find((question) => question.id === id);
};

/** The card a navigation key or comment target points at, whatever its kind. */
export const findCard = (state: ExampleMappingState, id: string | undefined): MappingCard | undefined => {
  if (id === undefined) return undefined;
  const story = findStory(state, id);
  if (story)
    return {
      kind: 'story',
      id: story.id,
      name: story.name,
      ...(story.description === undefined ? {} : { description: story.description }),
    };
  const rule = findRule(state, id);
  if (rule)
    return {
      kind: 'rule',
      id: rule.id,
      name: rule.name,
      ...(rule.description === undefined ? {} : { description: rule.description }),
    };
  const example = findExample(state, id);
  if (example) {
    return {
      kind: 'example',
      id: example.id,
      name: example.name,
      ...(example.description === undefined ? {} : { description: example.description }),
    };
  }
  const question = findQuestion(state, id);
  if (question) {
    return {
      kind: 'question',
      id: question.id,
      name: question.name,
      ...(question.description === undefined ? {} : { description: question.description }),
    };
  }
  return undefined;
};

/** Rules of one story column, in board order. */
export const rulesOfStory = (state: ExampleMappingState, storyId: string): readonly MappingRule[] => {
  return state.rules.filter((rule) => rule.storyId === storyId);
};

/** Examples under one rule, in board order. */
export const examplesOfRule = (state: ExampleMappingState, ruleId: string): readonly MappingExample[] => {
  return state.examples.filter((example) => example.ruleId === ruleId);
};

/** Questions about one rule, in board order. */
export const questionsOfRule = (state: ExampleMappingState, ruleId: string): readonly MappingQuestion[] => {
  return state.questions.filter((question) => question.ruleId === ruleId);
};

/** The story a card belongs to: itself for a story, its owner otherwise. */
export const storyIdOfCard = (state: ExampleMappingState, id: string): string | undefined => {
  if (findStory(state, id)) return id;
  const rule = findRule(state, id);
  if (rule) return rule.storyId;
  const ruleId = findExample(state, id)?.ruleId ?? findQuestion(state, id)?.ruleId;
  return ruleId === undefined ? undefined : findRule(state, ruleId)?.storyId;
};

/** Every entity id, for UI-generated ids and duplicate detection. */
export const allMappingIds = (state: ExampleMappingState): string[] => {
  return [
    ...state.stories.map((story) => story.id),
    ...state.rules.map((rule) => rule.id),
    ...state.examples.map((example) => example.id),
    ...state.questions.map((question) => question.id),
  ];
};

/** The story a rule's examples and questions belong to. */
export const storyIdOfRule = (state: ExampleMappingState, ruleId: string): string | undefined => {
  return findRule(state, ruleId)?.storyId;
};

/** The story an example belongs to, through its rule. */
export const storyIdOfExample = (state: ExampleMappingState, exampleId: string): string | undefined => {
  const example = findExample(state, exampleId);
  return example ? storyIdOfRule(state, example.ruleId) : undefined;
};
