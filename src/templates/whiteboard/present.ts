import type {
  ActionDescription,
  ActionTarget,
  ActionTone,
  CommentTargetOption,
  DraftAction,
  Navigation,
} from '../../core/types';
import type { WhiteboardMessages } from './messages';

import { parseTemplateAction } from '../../core/schema';
import { targetRef } from '../../core/target';
import { whiteboardActions, type WhiteboardAction } from './actions';
import {
  findConnector,
  findItem,
  frameOf,
  hasColor,
  hasFontSize,
  itemText,
  type WbConnector,
  type WbItem,
  type WhiteboardState,
} from './model';
import { parseSelection, serializeSelection } from './selection';

const QUOTE_LENGTH = 40;

/** One line of an item's text, short enough for a label. */
export const excerpt = (m: WhiteboardMessages, text: string): string => {
  const line = text.replace(/\s+/g, ' ').trim();
  if (line === '') return m.empty;
  return line.length > QUOTE_LENGTH ? `${line.slice(0, QUOTE_LENGTH - 1)}…` : line;
};

export const itemLabel = (m: WhiteboardMessages, item: WbItem): string => {
  const kind = item.kind === 'shape' ? m.shapeLabel(item.shape) : m.kindLabel(item.kind);
  return `${kind} · ${excerpt(m, itemText(item))}`;
};

const endName = (m: WhiteboardMessages, state: WhiteboardState, base: WhiteboardState, id: string): string => {
  const item = findItem(state, id) ?? findItem(base, id);
  return item === undefined ? id : excerpt(m, itemText(item));
};

export const connectorLabel = (
  m: WhiteboardMessages,
  state: WhiteboardState,
  connector: WbConnector,
  base: WhiteboardState = state,
): string =>
  `${m.connector} · ${m.connection(endName(m, state, base, connector.from), endName(m, state, base, connector.to))}`;

type Summary = { readonly title: string; readonly tone: ActionTone; readonly body?: string };

/**
 * Where an item ends up, said the way the reader thinks of it: which frame it
 * left or joined, and the coordinates only when the frame did not change.
 */
const movedSummary = (
  m: WhiteboardMessages,
  state: WhiteboardState,
  before: WbItem | undefined,
  after: WbItem,
  base: WhiteboardState,
): string => {
  const from = before === undefined ? undefined : frameOf(base, before);
  const to = frameOf(state, after);
  const position = m.position(Math.round(after.x), Math.round(after.y));
  if (from?.id !== to?.id) {
    if (from !== undefined && to !== undefined) return `${m.betweenFrames(from.title, to.title)} ${position}`;
    if (to !== undefined) return `${m.intoFrame(to.title)} ${position}`;
    if (from !== undefined) return `${m.outOfFrame(from.title)} ${position}`;
  }
  if (before === undefined) return `→ ${position}`;
  return m.plain(m.position(Math.round(before.x), Math.round(before.y)), position);
};

const summarize = (
  m: WhiteboardMessages,
  action: WhiteboardAction,
  state: WhiteboardState,
  base: WhiteboardState,
): Summary => {
  const id = action.target.id;
  const before = findItem(base, id);
  const current = findItem(state, id) ?? before;
  const kind = current?.kind ?? 'sticky';
  switch (action.type) {
    case 'ADD_ITEM': {
      // The item as it ends up: text typed into a fresh sticky reads as part of adding it.
      const added = findItem(state, action.payload.id) ?? action.payload;
      const frame = frameOf(state, added);
      const body = m.added(excerpt(m, itemText(added)));
      return {
        title: m.addedTitle(added.kind),
        tone: 'create',
        body: frame === undefined ? body : `${body} ${m.inFrame(frame.title)}`,
      };
    }
    case 'SET_ITEM_TEXT': {
      const after = excerpt(m, action.payload.text);
      return {
        title: m.textEditedTitle(kind),
        tone: 'update',
        body: before === undefined ? m.arrowTo(after) : m.arrowFrom(excerpt(m, itemText(before)), after),
      };
    }
    case 'MOVE_ITEM': {
      if (current === undefined) return { title: m.movedTitle(kind), tone: 'move' };
      const after = { ...current, x: action.payload.x, y: action.payload.y };
      return { title: m.movedTitle(kind), tone: 'move', body: movedSummary(m, state, before, after, base) };
    }
    case 'RESIZE_ITEM': {
      const size = m.size(Math.round(action.payload.w), Math.round(action.payload.h));
      return {
        title: m.resizedTitle(kind),
        tone: 'update',
        body: before === undefined ? `→ ${size}` : m.plain(m.size(Math.round(before.w), Math.round(before.h)), size),
      };
    }
    case 'SET_ITEM_COLOR': {
      const after = m.colorLabel(action.payload.color);
      return {
        title: m.recoloredTitle(kind),
        tone: 'update',
        body: before !== undefined && hasColor(before) ? m.plain(m.colorLabel(before.color), after) : `→ ${after}`,
      };
    }
    case 'SET_ITEM_FONT_SIZE': {
      const after = m.fontSizeLabel(action.payload.fontSize);
      return {
        title: m.resizedTextTitle(kind),
        tone: 'update',
        body:
          before !== undefined && hasFontSize(before) ? m.plain(m.fontSizeLabel(before.fontSize), after) : `→ ${after}`,
      };
    }
    case 'REORDER_ITEM': {
      const anchorId = action.payload.after;
      return {
        title: m.restackedTitle(kind),
        tone: 'move',
        body: anchorId === null ? m.toBack : m.inFrontOf(endName(m, state, base, anchorId)),
      };
    }
    case 'DELETE_ITEM':
      return {
        title: m.deletedTitle(kind),
        tone: 'delete',
        body: m.deleted(current === undefined ? id : excerpt(m, itemText(current))),
      };
    case 'CONNECT_ITEMS': {
      const p = action.payload;
      const link = m.connection(endName(m, state, base, p.from), endName(m, state, base, p.to));
      return {
        title: m.connectedTitle,
        tone: 'create',
        body: p.label === undefined || p.label === '' ? link : `${link} · ${m.labeled(p.label)}`,
      };
    }
    case 'SET_CONNECTOR_LABEL': {
      const previous = findConnector(base, id)?.label;
      const after = action.payload.label === '' ? m.noLabel : action.payload.label;
      return {
        title: m.relabeledTitle,
        tone: 'update',
        body: previous === undefined ? m.arrowTo(after) : m.arrowFrom(previous, after),
      };
    }
    case 'SET_CONNECTOR_ROUTE': {
      const previous = findConnector(base, id)?.route;
      const after = m.routeLabel(action.payload.route);
      return {
        title: m.reroutedTitle,
        tone: 'update',
        body: previous === undefined ? `→ ${after}` : m.plain(m.routeLabel(previous), after),
      };
    }
    case 'DELETE_CONNECTOR': {
      const connector = findConnector(base, id) ?? findConnector(state, id);
      return {
        title: m.disconnectedTitle,
        tone: 'delete',
        ...(connector === undefined
          ? {}
          : {
              body: m.connection(endName(m, state, base, connector.from), endName(m, state, base, connector.to)),
            }),
      };
    }
  }
};

export const describeWhiteboardAction = (
  m: WhiteboardMessages,
  action: DraftAction,
  state: WhiteboardState,
  base: WhiteboardState = state,
): ActionDescription => {
  let summary: Summary;
  try {
    const typed = parseTemplateAction(whiteboardActions, action);
    summary = typed === null ? { title: action.type, tone: 'meta' } : summarize(m, typed, state, base);
  } catch {
    summary = { title: action.type, tone: 'meta' };
  }
  return {
    title: summary.title,
    targetLabel: whiteboardTargetLabel(m, state, action.target, base),
    tone: summary.tone,
    ...(summary.body === undefined ? {} : { summary: summary.body }),
  };
};

export const serializeWhiteboardAction = (action: DraftAction): string =>
  `${action.type} ${targetRef(action.target)} ${JSON.stringify(action.payload)}`;

export const whiteboardTargetLabel = (
  m: WhiteboardMessages,
  state: WhiteboardState,
  target: ActionTarget,
  base: WhiteboardState = state,
): string => {
  switch (target.type) {
    case 'item': {
      const item = findItem(state, target.id) ?? findItem(base, target.id);
      return item === undefined ? `${target.type} · ${target.id} (missing)` : itemLabel(m, item);
    }
    case 'connector': {
      const connector = findConnector(state, target.id) ?? findConnector(base, target.id);
      return connector === undefined
        ? `${m.connector} · ${target.id} (missing)`
        : connectorLabel(m, state, connector, base);
    }
    case 'page':
      return `${m.board} · ${whiteboardTitle(state)}`;
    default:
      return `${target.type} · ${target.id}`;
  }
};

export const whiteboardCommentTargets = (
  m: WhiteboardMessages,
  state: WhiteboardState,
): readonly CommentTargetOption[] => {
  const options: CommentTargetOption[] = [{ value: 'page:whiteboard', label: m.wholeBoard, group: m.board }];
  const frames = state.items.filter((item) => item.kind === 'frame');
  const rest = state.items.filter((item) => item.kind !== 'frame');
  for (const item of [...frames, ...rest]) {
    const frame = frameOf(state, item);
    const text = excerpt(m, itemText(item));
    options.push({
      value: targetRef({ type: 'item', id: item.id }),
      label: frame === undefined ? text : `${frame.title} › ${text}`,
      group: m.kindLabel(item.kind),
    });
  }
  for (const connector of state.connectors) {
    options.push({
      value: targetRef({ type: 'connector', id: connector.id }),
      label: m.connection(endName(m, state, state, connector.from), endName(m, state, state, connector.to)),
      group: m.connector,
    });
  }
  return options;
};

/**
 * The selected item or connector, else the frame in focus: what a composer
 * note attaches to. Several selected items have no single one to attach to.
 */
export const whiteboardCurrentTarget = (
  m: WhiteboardMessages,
  state: WhiteboardState,
  nav: Navigation,
): CommentTargetOption | null => {
  const selection = parseSelection(nav['item']);
  const selected = selection.length === 1 ? selection[0] : undefined;
  const item = findItem(state, selected) ?? findItem(state, nav['frame']);
  if (item !== undefined) {
    return {
      value: targetRef({ type: 'item', id: item.id }),
      label: excerpt(m, itemText(item)),
      group: m.kindLabel(item.kind),
    };
  }
  const connector = findConnector(state, selected);
  if (connector === undefined) return null;
  return {
    value: targetRef({ type: 'connector', id: connector.id }),
    label: m.connection(endName(m, state, state, connector.from), endName(m, state, state, connector.to)),
    group: m.connector,
  };
};

export const whiteboardTitle = (state: WhiteboardState): string => state.title ?? 'Whiteboard';

/**
 * `frame` brings a frame into view, `item` selects items (`a,b,c`) or one
 * connector. Ids that no longer exist are dropped, so the hash stays canonical.
 */
export const resolveWhiteboardNavigation = (state: WhiteboardState, nav: Navigation): Navigation => {
  const next: Record<string, string> = { ...nav };
  if (findItem(state, nav['frame'])?.kind !== 'frame') delete next['frame'];
  const selection = parseSelection(nav['item']);
  const items = selection.filter((id) => findItem(state, id) !== undefined);
  const connector = selection.length === 1 ? findConnector(state, selection[0]) : undefined;
  const kept = serializeSelection(connector === undefined ? items : [connector.id]);
  if (kept === undefined) delete next['item'];
  else next['item'] = kept;
  return next;
};
