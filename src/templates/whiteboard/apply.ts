import type { ApplyResult, DraftAction } from '../../core/types';
import type { WbConnector, WbItem, WhiteboardState } from './model';

import { assertNever, parseTemplateAction } from '../../core/schema';
import { whiteboardActions } from './actions';

export const applyWhiteboardAction = (state: WhiteboardState, action: DraftAction): ApplyResult<WhiteboardState> => {
  const typed = parseTemplateAction(whiteboardActions, action);
  if (typed === null) return null;
  const id = typed.target.id;
  switch (typed.type) {
    case 'ADD_ITEM': {
      const added = typed.payload;
      const existing = state.items.find((item) => item.id === added.id);
      if (existing !== undefined) return existing.kind === added.kind ? state : null;
      if (state.connectors.some((connector) => connector.id === added.id)) return null;
      return { ...state, items: [...state.items, added] };
    }
    case 'SET_ITEM_TEXT':
      return updateItem(state, id, (item) =>
        item.kind === 'frame'
          ? // A frame always has a title; clearing it is not a meaningful request.
            typed.payload.text.trim() === ''
            ? null
            : { ...item, title: typed.payload.text }
          : { ...item, text: typed.payload.text },
      );
    case 'MOVE_ITEM':
      return updateItem(state, id, (item) => ({ ...item, x: typed.payload.x, y: typed.payload.y }));
    case 'RESIZE_ITEM':
      return updateItem(state, id, (item) => ({ ...item, w: typed.payload.w, h: typed.payload.h }));
    case 'SET_ITEM_COLOR':
      return updateItem(state, id, (item) => (item.kind === 'text' ? null : { ...item, color: typed.payload.color }));
    case 'SET_ITEM_FONT_SIZE':
      return updateItem(state, id, (item) =>
        item.kind === 'frame' ? null : { ...item, fontSize: typed.payload.fontSize },
      );
    case 'REORDER_ITEM':
      return reorderItem(state, id, typed.payload.after);
    case 'DELETE_ITEM':
      if (!state.items.some((item) => item.id === id)) return null;
      return {
        ...state,
        items: state.items.filter((item) => item.id !== id),
        connectors: state.connectors.filter((connector) => connector.from !== id && connector.to !== id),
      };
    case 'CONNECT_ITEMS': {
      const p = typed.payload;
      if (state.connectors.some((connector) => connector.id === p.id)) return state;
      if (state.items.some((item) => item.id === p.id)) return null;
      if (p.from === p.to) return null;
      if (!state.items.some((item) => item.id === p.from) || !state.items.some((item) => item.id === p.to)) return null;
      const connector: WbConnector = {
        id: p.id,
        from: p.from,
        to: p.to,
        style: p.style ?? 'arrow',
        route: p.route ?? 'straight',
        ...(p.label === undefined || p.label === '' ? {} : { label: p.label }),
      };
      return { ...state, connectors: [...state.connectors, connector] };
    }
    case 'SET_CONNECTOR_LABEL':
      return updateConnector(state, id, (connector) => {
        const { label: _previous, ...rest } = connector;
        return typed.payload.label === '' ? rest : { ...rest, label: typed.payload.label };
      });
    case 'SET_CONNECTOR_ROUTE':
      return updateConnector(state, id, (connector) => ({ ...connector, route: typed.payload.route }));
    case 'DELETE_CONNECTOR':
      if (!state.connectors.some((connector) => connector.id === id)) return null;
      return { ...state, connectors: state.connectors.filter((connector) => connector.id !== id) };
    default:
      return assertNever(typed);
  }
};

const updateItem = (
  state: WhiteboardState,
  id: string,
  fn: (item: WbItem) => WbItem | null,
): WhiteboardState | null => {
  const current = state.items.find((item) => item.id === id);
  if (current === undefined) return null;
  const next = fn(current);
  if (next === null) return null;
  return { ...state, items: state.items.map((item) => (item.id === id ? next : item)) };
};

/** Takes the item out and puts it back just after `after` (`null`: first, so painted behind everything). */
const reorderItem = (state: WhiteboardState, id: string, after: string | null): WhiteboardState | null => {
  const moving = state.items.find((item) => item.id === id);
  if (moving === undefined || after === id) return null;
  const rest = state.items.filter((item) => item.id !== id);
  const index = after === null ? 0 : rest.findIndex((item) => item.id === after) + 1;
  if (index === 0 && after !== null) return null;
  return { ...state, items: [...rest.slice(0, index), moving, ...rest.slice(index)] };
};

const updateConnector = (
  state: WhiteboardState,
  id: string,
  fn: (connector: WbConnector) => WbConnector,
): WhiteboardState | null => {
  const current = state.connectors.find((connector) => connector.id === id);
  if (current === undefined) return null;
  const next = fn(current);
  return { ...state, connectors: state.connectors.map((connector) => (connector.id === id ? next : connector)) };
};
