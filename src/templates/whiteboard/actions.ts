import * as v from 'valibot';

import type { ActionInput } from '../../core/types';

import {
  defineAction,
  entityDedupeKey,
  entityIdSchema,
  type ActionSpecs,
  type TemplateAction,
} from '../../core/schema';
import {
  itemSchema,
  MIN_ITEM_SIZE,
  WB_COLORS,
  WB_CONNECTOR_ROUTES,
  WB_CONNECTOR_STYLES,
  WB_FONT_SIZES,
  type WbColor,
  type WbConnectorRoute,
  type WbFontSize,
} from './model';

const coordinate = v.pipe(v.number(), v.finite());
const size = v.pipe(v.number(), v.finite(), v.minValue(MIN_ITEM_SIZE));

/** The page-wide target that additions hang off. */
export const BOARD_TARGET = { type: 'page', id: 'whiteboard' } as const;

export const whiteboardActions = {
  ADD_ITEM: defineAction('ADD_ITEM', 'page', itemSchema, { dedupeKey: entityDedupeKey }),
  /** A frame's title, every other item's body text. */
  SET_ITEM_TEXT: defineAction('SET_ITEM_TEXT', 'item', v.object({ text: v.string() })),
  MOVE_ITEM: defineAction('MOVE_ITEM', 'item', v.object({ x: coordinate, y: coordinate })),
  RESIZE_ITEM: defineAction('RESIZE_ITEM', 'item', v.object({ w: size, h: size })),
  SET_ITEM_COLOR: defineAction('SET_ITEM_COLOR', 'item', v.object({ color: v.picklist(WB_COLORS) })),
  SET_ITEM_FONT_SIZE: defineAction('SET_ITEM_FONT_SIZE', 'item', v.object({ fontSize: v.picklist(WB_FONT_SIZES) })),
  /** Stacking order: just in front of the `after` item, or behind everything for `null`. */
  REORDER_ITEM: defineAction(
    'REORDER_ITEM',
    'item',
    v.object({ after: v.nullable(v.pipe(v.string(), v.minLength(1))) }),
  ),
  DELETE_ITEM: defineAction('DELETE_ITEM', 'item', v.object({})),
  CONNECT_ITEMS: defineAction(
    'CONNECT_ITEMS',
    'page',
    v.object({
      id: entityIdSchema,
      from: v.pipe(v.string(), v.minLength(1)),
      to: v.pipe(v.string(), v.minLength(1)),
      label: v.exactOptional(v.string()),
      style: v.exactOptional(v.picklist(WB_CONNECTOR_STYLES)),
      route: v.exactOptional(v.picklist(WB_CONNECTOR_ROUTES)),
    }),
    { dedupeKey: entityDedupeKey },
  ),
  SET_CONNECTOR_LABEL: defineAction('SET_CONNECTOR_LABEL', 'connector', v.object({ label: v.string() })),
  SET_CONNECTOR_ROUTE: defineAction(
    'SET_CONNECTOR_ROUTE',
    'connector',
    v.object({ route: v.picklist(WB_CONNECTOR_ROUTES) }),
  ),
  DELETE_CONNECTOR: defineAction('DELETE_CONNECTOR', 'connector', v.object({})),
} satisfies ActionSpecs;

/** The discriminated union of this template's actions. */
export type WhiteboardAction = TemplateAction<typeof whiteboardActions>;

const item = (id: string) => ({ type: 'item', id });

/** Action builders the board (and tests) dispatch. */
export const whiteboardAction = {
  addItem: (payload: v.InferInput<typeof itemSchema>): ActionInput => ({
    type: 'ADD_ITEM',
    target: BOARD_TARGET,
    payload,
  }),
  setText: (id: string, text: string): ActionInput => ({ type: 'SET_ITEM_TEXT', target: item(id), payload: { text } }),
  move: (id: string, x: number, y: number): ActionInput => ({
    type: 'MOVE_ITEM',
    target: item(id),
    payload: { x, y },
  }),
  resize: (id: string, w: number, h: number): ActionInput => ({
    type: 'RESIZE_ITEM',
    target: item(id),
    payload: { w, h },
  }),
  setColor: (id: string, color: WbColor): ActionInput => ({
    type: 'SET_ITEM_COLOR',
    target: item(id),
    payload: { color },
  }),
  setFontSize: (id: string, fontSize: WbFontSize): ActionInput => ({
    type: 'SET_ITEM_FONT_SIZE',
    target: item(id),
    payload: { fontSize },
  }),
  reorder: (id: string, after: string | null): ActionInput => ({
    type: 'REORDER_ITEM',
    target: item(id),
    payload: { after },
  }),
  deleteItem: (id: string): ActionInput => ({ type: 'DELETE_ITEM', target: item(id), payload: {} }),
  connect: (id: string, from: string, to: string, label?: string): ActionInput => ({
    type: 'CONNECT_ITEMS',
    target: BOARD_TARGET,
    payload: { id, from, to, ...(label === undefined ? {} : { label }) },
  }),
  setConnectorLabel: (id: string, label: string): ActionInput => ({
    type: 'SET_CONNECTOR_LABEL',
    target: { type: 'connector', id },
    payload: { label },
  }),
  setConnectorRoute: (id: string, route: WbConnectorRoute): ActionInput => ({
    type: 'SET_CONNECTOR_ROUTE',
    target: { type: 'connector', id },
    payload: { route },
  }),
  deleteConnector: (id: string): ActionInput => ({
    type: 'DELETE_CONNECTOR',
    target: { type: 'connector', id },
    payload: {},
  }),
};
