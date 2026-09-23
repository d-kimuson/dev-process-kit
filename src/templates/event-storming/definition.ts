import type { ActionTarget, Navigation, TemplateDefinition } from '../../core/types';

import { eventStormingActions } from './actions';
import { applyEventStormingAction } from './apply';
import { canonicalEventStormingState } from './layout';
import {
  emptyEventStormingBase,
  findContext,
  findLink,
  findNote,
  parseEventStormingBase,
  type EventStormingState,
} from './model';
import {
  describeEventStormingAction,
  eventStormingCommentTargets,
  eventStormingCurrentTarget,
  eventStormingTitle,
  resolveEventStormingNavigation,
  serializeEventStormingAction,
} from './present';

export const eventStormingHasTarget = (state: EventStormingState, target: ActionTarget): boolean => {
  switch (target.type) {
    case 'element':
      return findNote(state, target.id) !== undefined;
    case 'context':
      return findContext(state, target.id) !== undefined;
    case 'link':
      return findLink(state, target.id) !== undefined;
    case 'artifact':
      return true;
    default:
      return false;
  }
};

export const eventStormingDefinition: TemplateDefinition<EventStormingState> = {
  name: 'event-storming',
  label: 'Event Storming',
  parseBase: parseEventStormingBase,
  emptyBase: emptyEventStormingBase,
  actions: eventStormingActions,
  apply: applyEventStormingAction,
  canonicalState: canonicalEventStormingState,
  hasTarget: eventStormingHasTarget,
  describe: describeEventStormingAction,
  serialize: serializeEventStormingAction,
  resolveNavigation: resolveEventStormingNavigation,
  commentTargets: (state: EventStormingState, _nav: Navigation) => eventStormingCommentTargets(state),
  currentTarget: (state, navigation) => eventStormingCurrentTarget(state, navigation),
  title: eventStormingTitle,
};
