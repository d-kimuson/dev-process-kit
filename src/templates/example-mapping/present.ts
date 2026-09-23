import type {
  ActionDescription,
  ActionTarget,
  ActionTone,
  CommentTargetOption,
  DraftAction,
  Navigation,
} from '../../core/types';

import { payloadFor, type ActionName } from '../../core/schema';
import { targetRef } from '../../core/target';
import { exampleMappingActions } from './actions';
import { findCard, findExample, findQuestion, findRule, findStory, type ExampleMappingState } from './model';

type Summary = {
  readonly title: string;
  readonly tone: ActionTone;
  readonly body?: string;
};

const arrow = (before: unknown, after: unknown): string => {
  const afterText = typeof after === 'string' ? after : '';
  const beforeText = typeof before === 'string' ? before : undefined;
  return beforeText === undefined ? `→ 「${afterText}」` : `「${beforeText}」→「${afterText}」`;
};

// Never throws: every lookup falls back to the raw id.
const DESCRIBERS: Record<string, (action: DraftAction, state: ExampleMappingState) => Summary> = {
  SET_STORY_NAME: (action, state) => ({
    title: 'ストーリー名を変更',
    tone: 'update',
    body: arrow(
      findStory(state, action.target.id)?.name,
      payloadFor(exampleMappingActions.SET_STORY_NAME, action)['name'] ?? '',
    ),
  }),
  SET_STORY_DESCRIPTION: (action) => ({
    title: 'ストーリーの説明を更新',
    tone: 'update',
    body: `→ 「${String(payloadFor(exampleMappingActions.SET_STORY_DESCRIPTION, action)['description'] ?? '').slice(0, 90)}」`,
  }),
  REORDER_STORY: (action) => ({
    title: 'ストーリーの順序を変更',
    tone: 'move',
    body: afterSummary(payloadFor(exampleMappingActions.REORDER_STORY, action)['after']),
  }),
  ADD_STORY: (action) => ({
    title: 'ストーリーを追加',
    tone: 'create',
    body: `+ 「${payloadFor(exampleMappingActions.ADD_STORY, action)['name'] ?? ''}」`,
  }),
  DELETE_STORY: (action, state) => ({
    title: 'ストーリーを削除',
    tone: 'delete',
    body: `− 「${findStory(state, action.target.id)?.name ?? action.target.id}」`,
  }),
  SET_RULE_NAME: (action, state) => ({
    title: 'ルール名を変更',
    tone: 'update',
    body: arrow(
      findRule(state, action.target.id)?.name,
      payloadFor(exampleMappingActions.SET_RULE_NAME, action)['name'] ?? '',
    ),
  }),
  SET_RULE_DESCRIPTION: (action) => ({
    title: 'ルールの説明を更新',
    tone: 'update',
    body: `→ 「${String(payloadFor(exampleMappingActions.SET_RULE_DESCRIPTION, action)['description'] ?? '').slice(0, 90)}」`,
  }),
  MOVE_RULE: (action, state) => ({
    title: 'ルールを移動',
    tone: 'move',
    body: `→ ${findStory(state, String(payloadFor(exampleMappingActions.MOVE_RULE, action)['storyId']))?.name ?? String(payloadFor(exampleMappingActions.MOVE_RULE, action)['storyId'] ?? '')}`,
  }),
  REORDER_RULE: (action) => ({
    title: 'ルールの順序を変更',
    tone: 'move',
    body: afterSummary(payloadFor(exampleMappingActions.REORDER_RULE, action)['after']),
  }),
  ADD_RULE: (action) => ({
    title: 'ルールを追加',
    tone: 'create',
    body: `+ 「${payloadFor(exampleMappingActions.ADD_RULE, action)['name'] ?? ''}」`,
  }),
  DELETE_RULE: (action, state) => ({
    title: 'ルールを削除',
    tone: 'delete',
    body: `− 「${findRule(state, action.target.id)?.name ?? action.target.id}」`,
  }),
  SET_EXAMPLE_NAME: (action, state) => ({
    title: '具体例名を変更',
    tone: 'update',
    body: arrow(
      findExample(state, action.target.id)?.name,
      payloadFor(exampleMappingActions.SET_EXAMPLE_NAME, action)['name'] ?? '',
    ),
  }),
  SET_EXAMPLE_DESCRIPTION: (action) => ({
    title: '具体例の説明を更新',
    tone: 'update',
    body: `→ 「${String(payloadFor(exampleMappingActions.SET_EXAMPLE_DESCRIPTION, action)['description'] ?? '').slice(0, 90)}」`,
  }),
  MOVE_EXAMPLE: (action, state) => ({
    title: '具体例を移動',
    tone: 'move',
    body: `→ ${findRule(state, String(payloadFor(exampleMappingActions.MOVE_EXAMPLE, action)['ruleId']))?.name ?? String(payloadFor(exampleMappingActions.MOVE_EXAMPLE, action)['ruleId'] ?? '')}`,
  }),
  REORDER_EXAMPLE: (action) => ({
    title: '具体例の順序を変更',
    tone: 'move',
    body: afterSummary(payloadFor(exampleMappingActions.REORDER_EXAMPLE, action)['after']),
  }),
  ADD_EXAMPLE: (action) => ({
    title: '具体例を追加',
    tone: 'create',
    body: `+ 「${payloadFor(exampleMappingActions.ADD_EXAMPLE, action)['name'] ?? ''}」`,
  }),
  DELETE_EXAMPLE: (action, state) => ({
    title: '具体例を削除',
    tone: 'delete',
    body: `− 「${findExample(state, action.target.id)?.name ?? action.target.id}」`,
  }),
  SET_QUESTION_NAME: (action, state) => ({
    title: '質問名を変更',
    tone: 'update',
    body: arrow(
      findQuestion(state, action.target.id)?.name,
      payloadFor(exampleMappingActions.SET_QUESTION_NAME, action)['name'] ?? '',
    ),
  }),
  SET_QUESTION_DESCRIPTION: (action) => ({
    title: '質問の説明を更新',
    tone: 'update',
    body: `→ 「${String(payloadFor(exampleMappingActions.SET_QUESTION_DESCRIPTION, action)['description'] ?? '').slice(0, 90)}」`,
  }),
  MOVE_QUESTION: (action, state) => ({
    title: '質問を移動',
    tone: 'move',
    body: `→ ${findRule(state, String(payloadFor(exampleMappingActions.MOVE_QUESTION, action)['ruleId']))?.name ?? String(payloadFor(exampleMappingActions.MOVE_QUESTION, action)['ruleId'] ?? '')}`,
  }),
  REORDER_QUESTION: (action) => ({
    title: '質問の順序を変更',
    tone: 'move',
    body: afterSummary(payloadFor(exampleMappingActions.REORDER_QUESTION, action)['after']),
  }),
  ADD_QUESTION: (action) => ({
    title: '質問を追加',
    tone: 'create',
    body: `+ 「${payloadFor(exampleMappingActions.ADD_QUESTION, action)['name'] ?? ''}」`,
  }),
  DELETE_QUESTION: (action, state) => ({
    title: '質問を削除',
    tone: 'delete',
    body: `− 「${findQuestion(state, action.target.id)?.name ?? action.target.id}」`,
  }),
} satisfies Record<
  ActionName<typeof exampleMappingActions>,
  (action: DraftAction, state: ExampleMappingState) => Summary
>;

const afterSummary = (after: string | null | undefined): string => {
  return after === null || after === undefined ? '→ 先頭へ' : `→ 「${after}」の直後へ`;
};

export const describeExampleMappingAction = (
  action: DraftAction,
  state: ExampleMappingState,
  base?: ExampleMappingState,
): ActionDescription => {
  let summary: Summary;
  try {
    const describer = DESCRIBERS[action.type];
    const origin = base ?? state;
    summary = describer ? describer(action, origin) : { title: action.type, tone: 'meta' };
  } catch {
    summary = { title: action.type, tone: 'meta' };
  }
  return {
    title: summary.title,
    targetLabel: exampleMappingTargetLabel(state, action.target),
    tone: summary.tone,
    ...(summary.body === undefined ? {} : { summary: summary.body }),
  };
};

export const serializeExampleMappingAction = (action: DraftAction): string => {
  return `${action.type} ${targetRef(action.target)} ${JSON.stringify(action.payload)}`;
};

const KIND_LABELS = {
  story: 'ストーリー',
  rule: 'ルール',
  example: '具体例',
  question: '質問',
} as const;

export const exampleMappingTargetLabel = (state: ExampleMappingState, target: ActionTarget): string => {
  try {
    switch (target.type) {
      case 'story': {
        const story = findStory(state, target.id);
        return story ? `ストーリー · ${story.name}` : `ストーリー · ${target.id} (missing)`;
      }
      case 'rule': {
        const rule = findRule(state, target.id);
        return rule ? `ルール · ${rule.name}` : `ルール · ${target.id} (missing)`;
      }
      case 'example': {
        const example = findExample(state, target.id);
        return example ? `具体例 · ${example.name}` : `具体例 · ${target.id} (missing)`;
      }
      case 'question': {
        const question = findQuestion(state, target.id);
        return question ? `質問 · ${question.name}` : `質問 · ${target.id} (missing)`;
      }
      case 'artifact':
        return `マップ · ${exampleMappingTitle(state)}`;
      default:
        return `${target.type} · ${target.id}`;
    }
  } catch {
    return `${target.type} · ${target.id}`;
  }
};

export const exampleMappingCommentTargets = (
  state: ExampleMappingState,
  _nav: Navigation,
): readonly CommentTargetOption[] => {
  const options: CommentTargetOption[] = [{ value: 'artifact:example-mapping', label: 'マップ全体', group: 'マップ' }];
  for (const story of state.stories) {
    options.push({ value: targetRef({ type: 'story', id: story.id }), label: story.name, group: 'ストーリー' });
  }
  for (const rule of state.rules) {
    const story = findStory(state, rule.storyId);
    options.push({
      value: targetRef({ type: 'rule', id: rule.id }),
      label: story ? `${story.name} › ${rule.name}` : rule.name,
      group: 'ルール',
    });
  }
  for (const example of state.examples) {
    const rule = findRule(state, example.ruleId);
    options.push({
      value: targetRef({ type: 'example', id: example.id }),
      label: rule ? `${rule.name} › ${example.name}` : example.name,
      group: '具体例',
    });
  }
  for (const question of state.questions) {
    const rule = findRule(state, question.ruleId);
    options.push({
      value: targetRef({ type: 'question', id: question.id }),
      label: rule ? `${rule.name} › ${question.name}` : question.name,
      group: '質問',
    });
  }
  return options;
};

/**
 * The card the reader is looking at: the composer attaches a note to it when
 * the checkbox is on, otherwise the note is map-wide.
 */
export const exampleMappingCurrentTarget = (
  state: ExampleMappingState,
  nav: Navigation,
): CommentTargetOption | null => {
  const card = findCard(state, nav['card']);
  if (!card) return null;
  return {
    value: targetRef({ type: card.kind, id: card.id }),
    label: card.name,
    group: KIND_LABELS[card.kind],
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

const READINESS_LABELS = {
  empty: 'ルール未整理',
  'open-questions': '未解決の質問あり',
  'too-big': '分割を検討',
  thin: '具体例の無いルールあり',
  ready: '合意できそう',
} as const satisfies Record<StoryReadiness, string>;

export const presentStorySummary = (state: ExampleMappingState, storyId: string): StorySummary => {
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
  return { rules: rules.length, examples: examples.length, questions, readiness, label: READINESS_LABELS[readiness] };
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
