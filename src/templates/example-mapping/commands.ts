import type { TemplateRenderContext } from '../../core/shell/contracts';
import type { ActionInput } from '../../core/types';
import type { ExampleMappingMessages } from './messages';

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

export const addStory = (context: Context, m: ExampleMappingMessages): string | null =>
  create(context, 'new-story', (id) => exampleMappingAction.addStory(id, m.newStory));

export const addRule = (context: Context, m: ExampleMappingMessages, storyId: string): string | null =>
  create(context, 'new-rule', (id) => exampleMappingAction.addRule(storyId, id, m.newRule));

export const addExample = (context: Context, m: ExampleMappingMessages, ruleId: string): string | null =>
  create(context, 'new-example', (id) => exampleMappingAction.addExample(ruleId, id, m.newExample));

export const addQuestion = (context: Context, m: ExampleMappingMessages, ruleId: string): string | null =>
  create(context, 'new-question', (id) => exampleMappingAction.addQuestion(ruleId, id, m.newQuestion));
