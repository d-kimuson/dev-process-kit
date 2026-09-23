import type { ActionTarget, TemplateDefinition } from '../../core/types';

import { exampleMappingActions } from './actions';
import { applyExampleMappingAction } from './apply';
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
    case 'artifact':
      return true;
    default:
      return false;
  }
};

export const exampleMappingDefinition: TemplateDefinition<ExampleMappingState> = {
  name: 'example-mapping',
  label: 'Example Mapping',
  parseBase: parseExampleMappingBase,
  emptyBase: emptyExampleMappingBase,
  actions: exampleMappingActions,
  apply: applyExampleMappingAction,
  canonicalState: canonicalExampleMappingState,
  hasTarget: exampleMappingHasTarget,
  describe: describeExampleMappingAction,
  serialize: serializeExampleMappingAction,
  resolveNavigation: resolveExampleMappingNavigation,
  commentTargets: (state: ExampleMappingState, navigation) => exampleMappingCommentTargets(state, navigation),
  currentTarget: (state, navigation) => exampleMappingCurrentTarget(state, navigation),
  title: exampleMappingTitle,
};
