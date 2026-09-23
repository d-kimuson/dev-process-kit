import type { ApplyResult, DraftAction } from '../../core/types';
import type { BoundedContext, EventStormingState, StickyNote } from './model';

import { assertNever, parseTemplateAction } from '../../core/schema';
import { eventStormingActions } from './actions';

export const applyEventStormingAction = (
  state: EventStormingState,
  action: DraftAction,
): ApplyResult<EventStormingState> => {
  const typed = parseTemplateAction(eventStormingActions, action);
  if (typed === null) return null;
  const id = typed.target.id;
  switch (typed.type) {
    case 'SET_ELEMENT_NAME':
      return updateNote(state, id, (n) => ({ ...n, name: typed.payload.name }));
    case 'SET_ELEMENT_DESCRIPTION':
      return updateNote(state, id, (n) => ({
        ...n,
        description: typed.payload.description,
      }));
    case 'SET_ELEMENT_TYPE':
      return updateNote(state, id, (n) => ({ ...n, type: typed.payload.type }));
    case 'SET_ELEMENT_CONTEXT': {
      const { contextId } = typed.payload;
      if (contextId !== null && !state.contexts.some((c) => c.id === contextId)) return null;
      return updateNote(state, id, (n) => (contextId === null ? stripContext(n) : ({ ...n, contextId } as StickyNote)));
    }
    case 'MOVE_ELEMENT': {
      const { after } = typed.payload;
      const next = reorderById(state.elements, id, after);
      return next === null ? null : { ...state, elements: next };
    }
    case 'ADD_ELEMENT': {
      const p = typed.payload;
      if (state.elements.some((n) => n.id === p.id)) return state;
      if (p.contextId !== undefined && !state.contexts.some((c) => c.id === p.contextId)) return null;
      const note: StickyNote = {
        id: p.id,
        type: p.type,
        name: p.name,
        ...(p.description === undefined ? {} : { description: p.description }),
        ...(p.contextId === undefined ? {} : { contextId: p.contextId }),
      };
      return { ...state, elements: [...state.elements, note] };
    }
    case 'DELETE_ELEMENT': {
      if (!state.elements.some((n) => n.id === id)) return null;
      return {
        ...state,
        elements: state.elements.filter((n) => n.id !== id),
        links: state.links.filter((l) => l.from !== id && l.to !== id),
      };
    }
    case 'LINK_ELEMENTS': {
      const p = typed.payload;
      if (state.links.some((l) => l.id === p.id)) return state;
      if (!state.elements.some((n) => n.id === p.from) || !state.elements.some((n) => n.id === p.to)) return null;
      return {
        ...state,
        links: [
          ...state.links,
          {
            id: p.id,
            from: p.from,
            to: p.to,
            ...(p.label === undefined ? {} : { label: p.label }),
            ...(p.kind === undefined ? {} : { kind: p.kind }),
          },
        ],
      };
    }
    case 'SET_LINK_LABEL':
      if (!state.links.some((l) => l.id === id)) return null;
      return {
        ...state,
        links: state.links.map((l) => (l.id === id ? { ...l, label: typed.payload.label } : l)),
      };
    case 'UNLINK_ELEMENTS': {
      const p = typed.payload;
      if (!state.links.some((l) => l.from === p.from && l.to === p.to)) return null;
      return { ...state, links: state.links.filter((l) => !(l.from === p.from && l.to === p.to)) };
    }
    case 'ADD_CONTEXT': {
      const p = typed.payload;
      if (state.contexts.some((c) => c.id === p.id)) return state;
      const ctx: BoundedContext = {
        id: p.id,
        name: p.name,
        ...(p.description === undefined ? {} : { description: p.description }),
      };
      return { ...state, contexts: [...state.contexts, ctx] };
    }
    case 'SET_CONTEXT_NAME':
      if (!state.contexts.some((c) => c.id === id)) return null;
      return {
        ...state,
        contexts: state.contexts.map((c) => (c.id === id ? { ...c, name: typed.payload.name } : c)),
      };
    case 'DELETE_CONTEXT': {
      if (!state.contexts.some((c) => c.id === id)) return null;
      return {
        ...state,
        contexts: state.contexts.filter((c) => c.id !== id),
        elements: state.elements.map((n) => (n.contextId === id ? stripContext(n) : n)),
      };
    }
    default:
      return assertNever(typed);
  }
};

const stripContext = (note: StickyNote): StickyNote => {
  const next = { ...note };
  delete (next as { contextId?: string }).contextId;
  return next;
};

const updateNote = (
  state: EventStormingState,
  id: string,
  fn: (n: StickyNote) => StickyNote,
): EventStormingState | null => {
  if (!state.elements.some((n) => n.id === id)) return null;
  return { ...state, elements: state.elements.map((n) => (n.id === id ? fn(n) : n)) };
};

const reorderById = <T extends { id: string }>(items: readonly T[], id: string, after: string | null): T[] | null => {
  const idx = items.findIndex((i) => i.id === id);
  if (idx < 0) return null;
  if (after !== null && !items.some((i) => i.id === after)) return null;
  const moving = items[idx];
  if (moving === undefined) return null;
  const rest = items.filter((i) => i.id !== id);
  const next = [...rest];
  next.splice(after === null ? 0 : next.findIndex((i) => i.id === after) + 1, 0, moving);
  return next;
};
