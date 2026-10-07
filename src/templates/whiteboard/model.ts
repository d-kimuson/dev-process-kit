import * as v from 'valibot';

import { entityIdSchema } from '../../core/schema';

/** Sticky, shape and frame colors. The board paints each one in both themes. */
export const WB_COLORS = ['yellow', 'orange', 'pink', 'purple', 'blue', 'green', 'gray'] as const;
export type WbColor = (typeof WB_COLORS)[number];

export const WB_SHAPES = ['rect', 'ellipse'] as const;
export type WbShape = (typeof WB_SHAPES)[number];

export const WB_ITEM_KINDS = ['sticky', 'text', 'shape', 'frame'] as const;
export type WbItemKind = (typeof WB_ITEM_KINDS)[number];

/** Text sizes a sticky, a text box or a shape may take; the board scales its own type by each. */
export const WB_FONT_SIZES = ['small', 'medium', 'large', 'xlarge'] as const;
export type WbFontSize = (typeof WB_FONT_SIZES)[number];
export const DEFAULT_FONT_SIZE: WbFontSize = 'medium';

export const WB_CONNECTOR_STYLES = ['arrow', 'line'] as const;
export type WbConnectorStyle = (typeof WB_CONNECTOR_STYLES)[number];

/** How a connector runs between its items: a straight line, right angles, or an S-curve. */
export const WB_CONNECTOR_ROUTES = ['straight', 'elbow', 'curve'] as const;
export type WbConnectorRoute = (typeof WB_CONNECTOR_ROUTES)[number];

/** Smallest box the reader may resize an item to, in canvas units. */
export const MIN_ITEM_SIZE = 24;

/** Size an item gets when the author (or the reader) leaves it out. */
export const DEFAULT_SIZE = {
  sticky: { w: 160, h: 160 },
  text: { w: 240, h: 48 },
  shape: { w: 180, h: 110 },
  frame: { w: 640, h: 420 },
} as const satisfies Record<WbItemKind, { readonly w: number; readonly h: number }>;

export const DEFAULT_COLOR = {
  sticky: 'yellow',
  shape: 'blue',
  frame: 'gray',
} as const satisfies Record<Exclude<WbItemKind, 'text'>, WbColor>;

type Box = {
  readonly id: string;
  /** Canvas coordinates of the top-left corner; any finite number, negatives included. */
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
};

export type WbSticky = Box & {
  readonly kind: 'sticky';
  readonly text: string;
  readonly color: WbColor;
  readonly fontSize: WbFontSize;
};
export type WbText = Box & { readonly kind: 'text'; readonly text: string; readonly fontSize: WbFontSize };
export type WbShapeItem = Box & {
  readonly kind: 'shape';
  readonly shape: WbShape;
  readonly text: string;
  readonly color: WbColor;
  readonly fontSize: WbFontSize;
};
/** A titled area. Whatever sits inside its box belongs to it, and moves with it. */
export type WbFrame = Box & { readonly kind: 'frame'; readonly title: string; readonly color: WbColor };

export type WbItem = WbSticky | WbText | WbShapeItem | WbFrame;

export type WbConnector = {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly label?: string;
  readonly style: WbConnectorStyle;
  readonly route: WbConnectorRoute;
};

export type WhiteboardState = {
  readonly title?: string;
  /** Paint order: frames are always drawn first, everything else in this order. */
  readonly items: readonly WbItem[];
  readonly connectors: readonly WbConnector[];
};

const coordinate = v.pipe(v.number(), v.finite());
const size = v.pipe(v.number(), v.finite(), v.minValue(MIN_ITEM_SIZE));
const color = v.picklist(WB_COLORS);
const fontSize = v.optional(v.picklist(WB_FONT_SIZES), DEFAULT_FONT_SIZE);

const box = {
  id: entityIdSchema,
  x: coordinate,
  y: coordinate,
};

const stickySchema = v.strictObject({
  ...box,
  kind: v.literal('sticky'),
  w: v.optional(size, DEFAULT_SIZE.sticky.w),
  h: v.optional(size, DEFAULT_SIZE.sticky.h),
  text: v.optional(v.string(), ''),
  color: v.optional(color, DEFAULT_COLOR.sticky),
  fontSize,
});

const textSchema = v.strictObject({
  ...box,
  kind: v.literal('text'),
  w: v.optional(size, DEFAULT_SIZE.text.w),
  h: v.optional(size, DEFAULT_SIZE.text.h),
  text: v.optional(v.string(), ''),
  fontSize,
});

const shapeSchema = v.strictObject({
  ...box,
  kind: v.literal('shape'),
  shape: v.optional(v.picklist(WB_SHAPES), 'rect'),
  w: v.optional(size, DEFAULT_SIZE.shape.w),
  h: v.optional(size, DEFAULT_SIZE.shape.h),
  text: v.optional(v.string(), ''),
  color: v.optional(color, DEFAULT_COLOR.shape),
  fontSize,
});

const frameSchema = v.strictObject({
  ...box,
  kind: v.literal('frame'),
  // A frame encloses other items, so its size is never a guess.
  w: size,
  h: size,
  title: v.pipe(v.string(), v.minLength(1)),
  color: v.optional(color, DEFAULT_COLOR.frame),
});

/** One item as authored in the base JSON, or as carried by `ADD_ITEM`. */
export const itemSchema = v.variant('kind', [stickySchema, textSchema, shapeSchema, frameSchema]);

const connectorSchema = v.strictObject({
  id: entityIdSchema,
  from: v.pipe(v.string(), v.minLength(1)),
  to: v.pipe(v.string(), v.minLength(1)),
  label: v.exactOptional(v.string()),
  style: v.optional(v.picklist(WB_CONNECTOR_STYLES), 'arrow'),
  route: v.optional(v.picklist(WB_CONNECTOR_ROUTES), 'straight'),
});

export const whiteboardBaseSchema = v.strictObject({
  title: v.exactOptional(v.string()),
  items: v.optional(v.array(itemSchema), []),
  connectors: v.optional(v.array(connectorSchema), []),
});

export const parseWhiteboardBase = (input: unknown): WhiteboardState => {
  const parsed = v.parse(whiteboardBaseSchema, input);
  const seen = new Set<string>();
  for (const { id } of [...parsed.items, ...parsed.connectors]) {
    if (seen.has(id)) throw new Error(`duplicate id "${id}" (items and connectors share one id space)`);
    seen.add(id);
  }
  const itemIds = new Set(parsed.items.map((item) => item.id));
  for (const connector of parsed.connectors) {
    if (!itemIds.has(connector.from))
      throw new Error(`unknown item "${connector.from}" in connector "${connector.id}"`);
    if (!itemIds.has(connector.to)) throw new Error(`unknown item "${connector.to}" in connector "${connector.id}"`);
    if (connector.from === connector.to) throw new Error(`connector "${connector.id}" connects an item to itself`);
  }
  return parsed;
};

export const emptyWhiteboardBase = (): WhiteboardState => ({ items: [], connectors: [] });

export const findItem = (state: WhiteboardState, id: string | undefined): WbItem | undefined => {
  if (id === undefined) return undefined;
  return state.items.find((item) => item.id === id);
};

export const findConnector = (state: WhiteboardState, id: string | undefined): WbConnector | undefined => {
  if (id === undefined) return undefined;
  return state.connectors.find((connector) => connector.id === id);
};

/** Every id in use: items and connectors share one id space. */
export const allIds = (state: WhiteboardState): string[] => [
  ...state.items.map((item) => item.id),
  ...state.connectors.map((connector) => connector.id),
];

/** The text an item shows: a frame's title, everything else's body. */
export const itemText = (item: WbItem): string => (item.kind === 'frame' ? item.title : item.text);

export const hasColor = (item: WbItem): item is WbSticky | WbShapeItem | WbFrame => item.kind !== 'text';

/** Everything but a frame carries body text, and so a text size. */
export const hasFontSize = (item: WbItem): item is WbSticky | WbText | WbShapeItem => item.kind !== 'frame';

/* ----------------------------------------------------------------- frames */

const area = (item: WbItem): number => item.w * item.h;

const contains = (frame: WbItem, x: number, y: number): boolean =>
  x >= frame.x && x <= frame.x + frame.w && y >= frame.y && y <= frame.y + frame.h;

/**
 * The frame an item belongs to: the smallest frame whose box holds the item's
 * center. Membership is geometric on purpose — it is what the reader sees, and
 * an item dragged into a frame joins it without any bookkeeping.
 */
export const frameOf = (state: WhiteboardState, item: WbItem): WbFrame | undefined => {
  const cx = item.x + item.w / 2;
  const cy = item.y + item.h / 2;
  let best: WbFrame | undefined;
  for (const candidate of state.items) {
    if (candidate.kind !== 'frame' || candidate.id === item.id) continue;
    // A frame never belongs to a frame it encloses.
    if (item.kind === 'frame' && area(candidate) <= area(item)) continue;
    if (!contains(candidate, cx, cy)) continue;
    if (best === undefined || area(candidate) < area(best)) best = candidate;
  }
  return best;
};

/** Items that belong to `frame`, directly or through a nested frame. */
export const frameMembers = (state: WhiteboardState, frame: WbFrame): WbItem[] => {
  const members: WbItem[] = [];
  const inside = (item: WbItem): boolean => {
    let parent = frameOf(state, item);
    while (parent !== undefined) {
      if (parent.id === frame.id) return true;
      parent = frameOf(state, parent);
    }
    return false;
  };
  for (const item of state.items) if (item.id !== frame.id && inside(item)) members.push(item);
  return members;
};
