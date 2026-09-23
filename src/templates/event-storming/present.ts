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
import { eventStormingActions } from './actions';
import { findContext, findLink, findNote, type EventStormingState } from './model';

type Summary = {
  readonly title: string;
  readonly tone: ActionTone;
  readonly body?: string;
};

const DESCRIBERS: Record<string, (a: DraftAction, s: EventStormingState) => Summary> = {
  SET_ELEMENT_NAME: (a, s) => ({
    title: '要素名を変更',
    tone: 'update',
    body: `"${findNote(s, a.target.id)?.name ?? '?'}“ → "${payloadFor(eventStormingActions.SET_ELEMENT_NAME, a).name}"`,
  }),
  SET_ELEMENT_DESCRIPTION: (a) => ({
    title: '要素の説明を更新',
    tone: 'update',
    body: `→ "${payloadFor(eventStormingActions.SET_ELEMENT_DESCRIPTION, a).description.slice(0, 60)}"`,
  }),
  SET_ELEMENT_TYPE: (a) => ({
    title: '要素の種別を変更',
    tone: 'update',
    body: `→ ${payloadFor(eventStormingActions.SET_ELEMENT_TYPE, a).type}`,
  }),
  SET_ELEMENT_CONTEXT: (a) => ({
    title: '所属コンテキストを変更',
    tone: 'move',
    body: `→ ${payloadFor(eventStormingActions.SET_ELEMENT_CONTEXT, a).contextId ?? '未所属'}`,
  }),
  MOVE_ELEMENT: (a) => ({
    title: 'タイムライン位置を変更',
    tone: 'move',
    body:
      payloadFor(eventStormingActions.MOVE_ELEMENT, a).after === null
        ? '→ 先頭へ'
        : `→ "${payloadFor(eventStormingActions.MOVE_ELEMENT, a).after}" の直後へ`,
  }),
  ADD_ELEMENT: (a) => ({
    title: '要素を追加',
    tone: 'create',
    body: `+ "${payloadFor(eventStormingActions.ADD_ELEMENT, a).name}"`,
  }),
  DELETE_ELEMENT: (a, s) => ({
    title: '要素を削除',
    tone: 'delete',
    body: `− "${findNote(s, a.target.id)?.name ?? a.target.id}"`,
  }),
  LINK_ELEMENTS: (a) => ({
    title: '要素を連結',
    tone: 'create',
    body: `${payloadFor(eventStormingActions.LINK_ELEMENTS, a).from} → ${payloadFor(eventStormingActions.LINK_ELEMENTS, a).to}`,
  }),
  SET_LINK_LABEL: (a) => ({
    title: 'リンク名を変更',
    tone: 'update',
    body: `→ "${payloadFor(eventStormingActions.SET_LINK_LABEL, a).label}"`,
  }),
  UNLINK_ELEMENTS: (a) => ({
    title: 'リンクを削除',
    tone: 'delete',
    body: `${payloadFor(eventStormingActions.UNLINK_ELEMENTS, a).from} → ${payloadFor(eventStormingActions.UNLINK_ELEMENTS, a).to}`,
  }),
  ADD_CONTEXT: (a) => ({
    title: 'コンテキストを追加',
    tone: 'create',
    body: `+ "${payloadFor(eventStormingActions.ADD_CONTEXT, a).name}"`,
  }),
  SET_CONTEXT_NAME: (a) => ({
    title: 'コンテキスト名を変更',
    tone: 'update',
    body: `→ "${payloadFor(eventStormingActions.SET_CONTEXT_NAME, a).name}"`,
  }),
  DELETE_CONTEXT: (a, s) => ({
    title: 'コンテキストを削除',
    tone: 'delete',
    body: `− "${findContext(s, a.target.id)?.name ?? a.target.id}"`,
  }),
} satisfies Record<ActionName<typeof eventStormingActions>, (a: DraftAction, s: EventStormingState) => Summary>;

export const describeEventStormingAction = (
  action: DraftAction,
  state: EventStormingState,
  base?: EventStormingState,
): ActionDescription => {
  const d = DESCRIBERS[action.type];
  const origin = base ?? state;
  const s: Summary = d ? d(action, origin) : { title: action.type, tone: 'meta' };
  return {
    title: s.title,
    targetLabel: eventStormingTargetLabel(state, action.target),
    tone: s.tone,
    ...(s.body === undefined ? {} : { summary: s.body }),
  };
};

export const serializeEventStormingAction = (action: DraftAction): string => {
  return `${action.type} ${targetRef(action.target)} ${JSON.stringify(action.payload)}`;
};

export const eventStormingTargetLabel = (state: EventStormingState, target: ActionTarget): string => {
  switch (target.type) {
    case 'element': {
      const n = findNote(state, target.id);
      return n ? `要素 · ${n.name}` : `要素 · ${target.id} (missing)`;
    }
    case 'context': {
      const c = findContext(state, target.id);
      return c ? `コンテキスト · ${c.name}` : `コンテキスト · ${target.id} (missing)`;
    }
    case 'link': {
      const l = findLink(state, target.id);
      return l ? `リンク · ${l.from}→${l.to}` : `リンク · ${target.id} (missing)`;
    }
    case 'page':
      return `ページ · ${eventStormingTitle(state)}`;
    default:
      return `${target.type} · ${target.id}`;
  }
};

export const eventStormingCommentTargets = (state: EventStormingState): readonly CommentTargetOption[] => {
  return [
    ...state.elements.map((n) => ({ value: targetRef({ type: 'element', id: n.id }), label: n.name, group: '要素' })),
    ...state.contexts.map((c) => ({
      value: targetRef({ type: 'context', id: c.id }),
      label: c.name,
      group: 'コンテキスト',
    })),
  ];
};

/**
 * The note the reader selected on the board: the composer attaches a note to it
 * when the checkbox is on, otherwise the note is board-wide.
 */
export const eventStormingCurrentTarget = (state: EventStormingState, nav: Navigation): CommentTargetOption | null => {
  const element = state.elements.find((candidate) => candidate.id === nav['note']);
  if (!element) return null;
  return { value: targetRef({ type: 'element', id: element.id }), label: element.name, group: '要素' };
};

export const eventStormingTitle = (state: EventStormingState): string => {
  return state.title ?? 'Event Storming';
};

export const resolveEventStormingNavigation = (state: EventStormingState, nav: Navigation): Navigation => {
  const next: Record<string, string> = { ...nav };
  const note = findNote(state, nav['note']);
  if (nav['note'] !== undefined && !note) delete next['note'];
  const ctx = findContext(state, nav['context']);
  if (nav['context'] !== undefined && !ctx) delete next['context'];
  return next;
};
