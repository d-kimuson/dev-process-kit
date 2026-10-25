import type { ActionDescription, ActionTarget, ActionTone, DraftAction } from '../../core/types';
import type { EventStormingMessages } from './messages';

import { payloadFor, type ActionName } from '../../core/schema';
import { eventStormingActions } from './actions';
import { findContext, findLink, findNote, type EventStormingState } from './model';

type Summary = {
  readonly title: string;
  readonly tone: ActionTone;
  readonly body?: string;
};

const DESCRIBERS: Record<string, (m: EventStormingMessages, a: DraftAction, s: EventStormingState) => Summary> = {
  SET_ELEMENT_NAME: (m, a, s) => ({
    title: m.renameElementTitle,
    tone: 'update',
    body: m.renamed(findNote(s, a.target.id)?.name ?? '?', payloadFor(eventStormingActions.SET_ELEMENT_NAME, a).name),
  }),
  SET_ELEMENT_DESCRIPTION: (m, a) => ({
    title: m.updateDescriptionTitle,
    tone: 'update',
    body: `→ "${payloadFor(eventStormingActions.SET_ELEMENT_DESCRIPTION, a).description.slice(0, 60)}"`,
  }),
  SET_ELEMENT_TYPE: (m, a) => ({
    title: m.changeTypeTitle,
    tone: 'update',
    body: `→ ${payloadFor(eventStormingActions.SET_ELEMENT_TYPE, a).type}`,
  }),
  SET_ELEMENT_CONTEXT: (m, a) => ({
    title: m.changeContextTitle,
    tone: 'move',
    body: `→ ${payloadFor(eventStormingActions.SET_ELEMENT_CONTEXT, a).contextId ?? m.noContext}`,
  }),
  MOVE_ELEMENT: (m, a) => ({
    title: m.moveTitle,
    tone: 'move',
    body:
      payloadFor(eventStormingActions.MOVE_ELEMENT, a).after === null
        ? m.moveToFront
        : m.moveAfter(payloadFor(eventStormingActions.MOVE_ELEMENT, a).after ?? ''),
  }),
  ADD_ELEMENT: (m, a) => ({
    title: m.addElementTitle,
    tone: 'create',
    body: `+ "${payloadFor(eventStormingActions.ADD_ELEMENT, a).name}"`,
  }),
  DELETE_ELEMENT: (m, a, s) => ({
    title: m.deleteElementTitle,
    tone: 'delete',
    body: `− "${findNote(s, a.target.id)?.name ?? a.target.id}"`,
  }),
  LINK_ELEMENTS: (m, a) => ({
    title: m.linkTitle,
    tone: 'create',
    body: `${payloadFor(eventStormingActions.LINK_ELEMENTS, a).from} → ${payloadFor(eventStormingActions.LINK_ELEMENTS, a).to}`,
  }),
  SET_LINK_LABEL: (m, a) => ({
    title: m.renameLinkTitle,
    tone: 'update',
    body: `→ "${payloadFor(eventStormingActions.SET_LINK_LABEL, a).label}"`,
  }),
  UNLINK_ELEMENTS: (m, a) => ({
    title: m.unlinkTitle,
    tone: 'delete',
    body: `${payloadFor(eventStormingActions.UNLINK_ELEMENTS, a).from} → ${payloadFor(eventStormingActions.UNLINK_ELEMENTS, a).to}`,
  }),
  ADD_CONTEXT: (m, a) => ({
    title: m.addContextTitle,
    tone: 'create',
    body: `+ "${payloadFor(eventStormingActions.ADD_CONTEXT, a).name}"`,
  }),
  SET_CONTEXT_NAME: (m, a) => ({
    title: m.renameContextTitle,
    tone: 'update',
    body: `→ "${payloadFor(eventStormingActions.SET_CONTEXT_NAME, a).name}"`,
  }),
  DELETE_CONTEXT: (m, a, s) => ({
    title: m.deleteContextTitle,
    tone: 'delete',
    body: `− "${findContext(s, a.target.id)?.name ?? a.target.id}"`,
  }),
} satisfies Record<
  ActionName<typeof eventStormingActions>,
  (m: EventStormingMessages, a: DraftAction, s: EventStormingState) => Summary
>;

export const describeEventStormingAction = (
  m: EventStormingMessages,
  action: DraftAction,
  state: EventStormingState,
  base?: EventStormingState,
): ActionDescription => {
  const d = DESCRIBERS[action.type];
  const origin = base ?? state;
  const s: Summary = d ? d(m, action, origin) : { title: action.type, tone: 'meta' };
  return {
    title: s.title,
    targetLabel: eventStormingTargetLabel(m, state, action.target),
    tone: s.tone,
    ...(s.body === undefined ? {} : { summary: s.body }),
  };
};

export const eventStormingTargetLabel = (
  m: EventStormingMessages,
  state: EventStormingState,
  target: ActionTarget,
): string => {
  switch (target.type) {
    case 'element': {
      const n = findNote(state, target.id);
      return n ? m.elementLabel(n.name) : `${m.elementLabel(target.id)} (missing)`;
    }
    case 'context': {
      const c = findContext(state, target.id);
      return c ? m.contextLabel(c.name) : `${m.contextLabel(target.id)} (missing)`;
    }
    case 'link': {
      const l = findLink(state, target.id);
      return l ? m.linkLabel(l.from, l.to) : `${m.linkGroup} · ${target.id} (missing)`;
    }
    case 'page':
      return m.pageLabel(state.title ?? 'Event Storming');
    default:
      return `${target.type} · ${target.id}`;
  }
};
