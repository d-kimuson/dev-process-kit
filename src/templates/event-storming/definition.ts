import type { Locale } from '../../core/i18n';
import type { ActionTarget, Navigation, TemplateDefinition } from '../../core/types';

import { eventStormingActions } from './actions';
import { applyEventStormingAction } from './apply';
import { canonicalEventStormingState } from './layout';
import { eventStormingMessages } from './messages';
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
    case 'page':
      return true;
    default:
      return false;
  }
};

/** The event storming template, describing its actions in `locale`. */
export const eventStormingDefinitionFor = (locale: Locale): TemplateDefinition<EventStormingState> => {
  const m = eventStormingMessages(locale);
  return {
    name: 'event-storming',
    label: 'Event Storming',
    parseBase: parseEventStormingBase,
    emptyBase: emptyEventStormingBase,
    actions: eventStormingActions,
    apply: applyEventStormingAction,
    canonicalState: canonicalEventStormingState,
    hasTarget: eventStormingHasTarget,
    describe: (action, state, base) => describeEventStormingAction(m, action, state, base),
    serialize: serializeEventStormingAction,
    resolveNavigation: resolveEventStormingNavigation,
    commentTargets: (state: EventStormingState, _nav: Navigation) => eventStormingCommentTargets(m, state),
    currentTarget: (state, navigation) => eventStormingCurrentTarget(m, state, navigation),
    title: eventStormingTitle,
  };
};
