import type { Locale } from '../../core/i18n';
import type { ActionTarget, TemplateDefinition } from '../../core/types';

import { exampleMappingActions } from './actions';
import { applyExampleMappingAction } from './apply';
import { exampleMappingMessages } from './messages';
import {
  canonicalExampleMappingState,
  emptyExampleMappingBase,
  findCard,
  parseExampleMappingBase,
  type ExampleMappingState,
} from './model';
import {
  describeExampleMappingAction,
  exampleMappingCommentTargets,
  exampleMappingCurrentTarget,
  exampleMappingTitle,
  resolveExampleMappingNavigation,
  serializeExampleMappingAction,
} from './present';

export const exampleMappingHasTarget = (state: ExampleMappingState, target: ActionTarget): boolean => {
  switch (target.type) {
    case 'story':
    case 'rule':
    case 'example':
    case 'question':
      return findCard(state, target.id)?.kind === target.type;
    case 'page':
      return true;
    default:
      return false;
  }
};

/** The example mapping template, describing its actions in `locale`. */
export const exampleMappingDefinitionFor = (locale: Locale): TemplateDefinition<ExampleMappingState> => {
  const m = exampleMappingMessages(locale);
  return {
    name: 'example-mapping',
    label: 'Example Mapping',
    parseBase: parseExampleMappingBase,
    emptyBase: emptyExampleMappingBase,
    actions: exampleMappingActions,
    apply: applyExampleMappingAction,
    canonicalState: canonicalExampleMappingState,
    hasTarget: exampleMappingHasTarget,
    describe: (action, state, base) => describeExampleMappingAction(m, action, state, base),
    serialize: serializeExampleMappingAction,
    resolveNavigation: resolveExampleMappingNavigation,
    commentTargets: (state, navigation) => exampleMappingCommentTargets(m, state, navigation),
    currentTarget: (state, navigation) => exampleMappingCurrentTarget(m, state, navigation),
    title: exampleMappingTitle,
  };
};
