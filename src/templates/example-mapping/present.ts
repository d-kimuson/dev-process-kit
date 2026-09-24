import type {
  ActionDescription,
  ActionTarget,
  ActionTone,
  CommentTargetOption,
  DraftAction,
  Navigation,
} from '../../core/types';
import type { ExampleMappingMessages } from './messages';

import { payloadFor, type ActionName } from '../../core/schema';
import { targetRef } from '../../core/target';
import { exampleMappingActions } from './actions';
import { findCard, findExample, findQuestion, findRule, findStory, type ExampleMappingState } from './model';

type Summary = {
  readonly title: string;
  readonly tone: ActionTone;
  readonly body?: string;
};

const arrow = (m: ExampleMappingMessages, before: unknown, after: unknown): string => {
  const afterText = typeof after === 'string' ? after : '';
  const beforeText = typeof before === 'string' ? before : undefined;
  return beforeText === undefined ? m.arrowTo(afterText) : m.arrowFrom(beforeText, afterText);
};

// Never throws: every lookup falls back to the raw id.
const DESCRIBERS: Record<
  string,
  (m: ExampleMappingMessages, action: DraftAction, state: ExampleMappingState) => Summary
> = {
  SET_STORY_NAME: (m, action, state) => ({
    title: m.storyRenamedTitle,
    tone: 'update',
    body: arrow(
      m,
      findStory(state, action.target.id)?.name,
      payloadFor(exampleMappingActions.SET_STORY_NAME, action)['name'] ?? '',
    ),
  }),
  SET_STORY_DESCRIPTION: (m, action) => ({
    title: m.storyDescriptionUpdatedTitle,
    tone: 'update',
    body: m.arrowTo(
      String(payloadFor(exampleMappingActions.SET_STORY_DESCRIPTION, action)['description'] ?? '').slice(0, 90),
    ),
  }),
  REORDER_STORY: (m, action) => ({
    title: m.storyReorderedTitle,
    tone: 'move',
    body: afterSummary(m, payloadFor(exampleMappingActions.REORDER_STORY, action)['after']),
  }),
  ADD_STORY: (m, action) => ({
    title: m.storyAddedTitle,
    tone: 'create',
    body: m.added(String(payloadFor(exampleMappingActions.ADD_STORY, action)['name'] ?? '')),
  }),
  DELETE_STORY: (m, action, state) => ({
    title: m.storyDeletedTitle,
    tone: 'delete',
    body: m.deleted(findStory(state, action.target.id)?.name ?? action.target.id),
  }),
  SET_RULE_NAME: (m, action, state) => ({
    title: m.ruleRenamedTitle,
    tone: 'update',
    body: arrow(
      m,
      findRule(state, action.target.id)?.name,
      payloadFor(exampleMappingActions.SET_RULE_NAME, action)['name'] ?? '',
    ),
  }),
  SET_RULE_DESCRIPTION: (m, action) => ({
    title: m.ruleDescriptionUpdatedTitle,
    tone: 'update',
    body: m.arrowTo(
      String(payloadFor(exampleMappingActions.SET_RULE_DESCRIPTION, action)['description'] ?? '').slice(0, 90),
    ),
  }),
  MOVE_RULE: (m, action, state) => ({
    title: m.ruleMovedTitle,
    tone: 'move',
    body: m.arrowTo(
      findStory(state, String(payloadFor(exampleMappingActions.MOVE_RULE, action)['storyId']))?.name ??
        String(payloadFor(exampleMappingActions.MOVE_RULE, action)['storyId'] ?? ''),
    ),
  }),
  REORDER_RULE: (m, action) => ({
    title: m.ruleReorderedTitle,
    tone: 'move',
    body: afterSummary(m, payloadFor(exampleMappingActions.REORDER_RULE, action)['after']),
  }),
  ADD_RULE: (m, action) => ({
    title: m.ruleAddedTitle,
    tone: 'create',
    body: m.added(String(payloadFor(exampleMappingActions.ADD_RULE, action)['name'] ?? '')),
  }),
  DELETE_RULE: (m, action, state) => ({
    title: m.ruleDeletedTitle,
    tone: 'delete',
    body: m.deleted(findRule(state, action.target.id)?.name ?? action.target.id),
  }),
  SET_EXAMPLE_NAME: (m, action, state) => ({
    title: m.exampleRenamedTitle,
    tone: 'update',
    body: arrow(
      m,
      findExample(state, action.target.id)?.name,
      payloadFor(exampleMappingActions.SET_EXAMPLE_NAME, action)['name'] ?? '',
    ),
  }),
  SET_EXAMPLE_DESCRIPTION: (m, action) => ({
    title: m.exampleDescriptionUpdatedTitle,
    tone: 'update',
    body: m.arrowTo(
      String(payloadFor(exampleMappingActions.SET_EXAMPLE_DESCRIPTION, action)['description'] ?? '').slice(0, 90),
    ),
  }),
  MOVE_EXAMPLE: (m, action, state) => ({
    title: m.exampleMovedTitle,
    tone: 'move',
    body: m.arrowTo(
      findRule(state, String(payloadFor(exampleMappingActions.MOVE_EXAMPLE, action)['ruleId']))?.name ??
        String(payloadFor(exampleMappingActions.MOVE_EXAMPLE, action)['ruleId'] ?? ''),
    ),
  }),
  REORDER_EXAMPLE: (m, action) => ({
    title: m.exampleReorderedTitle,
    tone: 'move',
    body: afterSummary(m, payloadFor(exampleMappingActions.REORDER_EXAMPLE, action)['after']),
  }),
  ADD_EXAMPLE: (m, action) => ({
    title: m.exampleAddedTitle,
    tone: 'create',
    body: m.added(String(payloadFor(exampleMappingActions.ADD_EXAMPLE, action)['name'] ?? '')),
  }),
  DELETE_EXAMPLE: (m, action, state) => ({
    title: m.exampleDeletedTitle,
    tone: 'delete',
    body: m.deleted(findExample(state, action.target.id)?.name ?? action.target.id),
  }),
  SET_QUESTION_NAME: (m, action, state) => ({
    title: m.questionRenamedTitle,
    tone: 'update',
    body: arrow(
      m,
      findQuestion(state, action.target.id)?.name,
      payloadFor(exampleMappingActions.SET_QUESTION_NAME, action)['name'] ?? '',
    ),
  }),
  SET_QUESTION_DESCRIPTION: (m, action) => ({
    title: m.questionDescriptionUpdatedTitle,
    tone: 'update',
    body: m.arrowTo(
      String(payloadFor(exampleMappingActions.SET_QUESTION_DESCRIPTION, action)['description'] ?? '').slice(0, 90),
    ),
  }),
  MOVE_QUESTION: (m, action, state) => ({
    title: m.questionMovedTitle,
    tone: 'move',
    body: m.arrowTo(
      findRule(state, String(payloadFor(exampleMappingActions.MOVE_QUESTION, action)['ruleId']))?.name ??
        String(payloadFor(exampleMappingActions.MOVE_QUESTION, action)['ruleId'] ?? ''),
    ),
  }),
  REORDER_QUESTION: (m, action) => ({
    title: m.questionReorderedTitle,
    tone: 'move',
    body: afterSummary(m, payloadFor(exampleMappingActions.REORDER_QUESTION, action)['after']),
  }),
  ADD_QUESTION: (m, action) => ({
    title: m.questionAddedTitle,
    tone: 'create',
    body: m.added(String(payloadFor(exampleMappingActions.ADD_QUESTION, action)['name'] ?? '')),
  }),
  DELETE_QUESTION: (m, action, state) => ({
    title: m.questionDeletedTitle,
    tone: 'delete',
    body: m.deleted(findQuestion(state, action.target.id)?.name ?? action.target.id),
  }),
} satisfies Record<
  ActionName<typeof exampleMappingActions>,
  (m: ExampleMappingMessages, action: DraftAction, state: ExampleMappingState) => Summary
>;

const afterSummary = (m: ExampleMappingMessages, after: string | null | undefined): string => {
  return after === null || after === undefined ? m.toTop : m.afterPlacement(after);
};

export const describeExampleMappingAction = (
  m: ExampleMappingMessages,
  action: DraftAction,
  state: ExampleMappingState,
  base?: ExampleMappingState,
): ActionDescription => {
  let summary: Summary;
  try {
    const describer = DESCRIBERS[action.type];
    const origin = base ?? state;
    summary = describer ? describer(m, action, origin) : { title: action.type, tone: 'meta' };
  } catch {
    summary = { title: action.type, tone: 'meta' };
  }
  return {
    title: summary.title,
    targetLabel: exampleMappingTargetLabel(m, state, action.target),
    tone: summary.tone,
    ...(summary.body === undefined ? {} : { summary: summary.body }),
  };
};

export const serializeExampleMappingAction = (action: DraftAction): string => {
  return `${action.type} ${targetRef(action.target)} ${JSON.stringify(action.payload)}`;
};

export const exampleMappingTargetLabel = (
  m: ExampleMappingMessages,
  state: ExampleMappingState,
  target: ActionTarget,
): string => {
  try {
    switch (target.type) {
      case 'story': {
        const story = findStory(state, target.id);
        return story ? `${m.kindLabel('story')} · ${story.name}` : `${m.kindLabel('story')} · ${target.id} (missing)`;
      }
      case 'rule': {
        const rule = findRule(state, target.id);
        return rule ? `${m.kindLabel('rule')} · ${rule.name}` : `${m.kindLabel('rule')} · ${target.id} (missing)`;
      }
      case 'example': {
        const example = findExample(state, target.id);
        return example
          ? `${m.kindLabel('example')} · ${example.name}`
          : `${m.kindLabel('example')} · ${target.id} (missing)`;
      }
      case 'question': {
        const question = findQuestion(state, target.id);
        return question
          ? `${m.kindLabel('question')} · ${question.name}`
          : `${m.kindLabel('question')} · ${target.id} (missing)`;
      }
      case 'page':
        return `${m.map} · ${exampleMappingTitle(state)}`;
      default:
        return `${target.type} · ${target.id}`;
    }
  } catch {
    return `${target.type} · ${target.id}`;
  }
};

export const exampleMappingCommentTargets = (
  m: ExampleMappingMessages,
  state: ExampleMappingState,
  _nav: Navigation,
): readonly CommentTargetOption[] => {
  const options: CommentTargetOption[] = [{ value: 'page:example-mapping', label: m.wholeMap, group: m.map }];
  for (const story of state.stories) {
    options.push({
      value: targetRef({ type: 'story', id: story.id }),
      label: story.name,
      group: m.kindLabel('story'),
    });
  }
  for (const rule of state.rules) {
    const story = findStory(state, rule.storyId);
    options.push({
      value: targetRef({ type: 'rule', id: rule.id }),
      label: story ? `${story.name} › ${rule.name}` : rule.name,
      group: m.kindLabel('rule'),
    });
  }
  for (const example of state.examples) {
    const rule = findRule(state, example.ruleId);
    options.push({
      value: targetRef({ type: 'example', id: example.id }),
      label: rule ? `${rule.name} › ${example.name}` : example.name,
      group: m.kindLabel('example'),
    });
  }
  for (const question of state.questions) {
    const rule = findRule(state, question.ruleId);
    options.push({
      value: targetRef({ type: 'question', id: question.id }),
      label: rule ? `${rule.name} › ${question.name}` : question.name,
      group: m.kindLabel('question'),
    });
  }
  return options;
};

/**
 * The card the reader is looking at: the composer attaches a note to it when
 * the checkbox is on, otherwise the note is map-wide.
 */
export const exampleMappingCurrentTarget = (
  m: ExampleMappingMessages,
  state: ExampleMappingState,
  nav: Navigation,
): CommentTargetOption | null => {
  const card = findCard(state, nav['card']);
  if (!card) return null;
  return {
    value: targetRef({ type: card.kind, id: card.id }),
    label: card.name,
    group: m.kindLabel(card.kind),
  };
};

/**
 * Where a story stands in the conversation, read the way Example Mapping reads
 * the table: open questions block it, too many rules mean it should be split,
 * a rule without an example is not understood yet.
 */
export type StoryReadiness = 'empty' | 'open-questions' | 'too-big' | 'thin' | 'ready';

export type StorySummary = {
  readonly rules: number;
  readonly examples: number;
  readonly questions: number;
  readonly readiness: StoryReadiness;
  readonly label: string;
};

/** More rules than this and the story is usually worth splitting. */
const RULES_PER_STORY = 4;

export const presentStorySummary = (
  m: ExampleMappingMessages,
  state: ExampleMappingState,
  storyId: string,
): StorySummary => {
  const rules = state.rules.filter((rule) => rule.storyId === storyId);
  const ruleIds = new Set(rules.map((rule) => rule.id));
  const examples = state.examples.filter((example) => ruleIds.has(example.ruleId));
  const questions = state.questions.filter((question) => ruleIds.has(question.ruleId)).length;
  const thin = rules.some((rule) => !examples.some((example) => example.ruleId === rule.id));
  const readiness: StoryReadiness =
    rules.length === 0
      ? 'empty'
      : questions > 0
        ? 'open-questions'
        : rules.length > RULES_PER_STORY
          ? 'too-big'
          : thin
            ? 'thin'
            : 'ready';
  return { rules: rules.length, examples: examples.length, questions, readiness, label: m.readinessLabel(readiness) };
};

export const exampleMappingTitle = (state: ExampleMappingState): string => {
  return state.title ?? 'Example Mapping';
};

export const resolveExampleMappingNavigation = (state: ExampleMappingState, nav: Navigation): Navigation => {
  const card = findCard(state, nav['card']);
  const next: Record<string, string> = { ...nav };
  if (card) next['card'] = card.id;
  else delete next['card'];
  return next;
};
