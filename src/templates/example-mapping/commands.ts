import type { TemplateRenderContext } from '../../core/shell/contracts';
import type { ActionInput } from '../../core/types';

import { createEntityId } from '../../core/target';
import { exampleMappingAction } from './actions';
import { allMappingIds, type ExampleMappingState } from './model';

type Context = TemplateRenderContext<ExampleMappingState>;

/**
 * The "add" affordances of the board as functions of the render context. Each
 * returns the id of the card it created (or `null`), so the host can put the
 * caret straight into the fresh card's name.
 */
const create = (context: Context, prefix: string, build: (id: string) => ActionInput): string | null => {
  const id = createEntityId(prefix, allMappingIds(context.state));
  if (!context.dispatch(build(id)).ok) return null;
  context.navigate({ card: id });
  return id;
};

export const addStory = (context: Context): string | null =>
  create(context, 'new-story', (id) => exampleMappingAction.addStory(id, '新しいストーリー'));

export const addRule = (context: Context, storyId: string): string | null =>
  create(context, 'new-rule', (id) => exampleMappingAction.addRule(storyId, id, '新しいルール'));

export const addExample = (context: Context, ruleId: string): string | null =>
  create(context, 'new-example', (id) => exampleMappingAction.addExample(ruleId, id, '新しい具体例'));

export const addQuestion = (context: Context, ruleId: string): string | null =>
  create(context, 'new-question', (id) => exampleMappingAction.addQuestion(ruleId, id, '新しい質問'));
