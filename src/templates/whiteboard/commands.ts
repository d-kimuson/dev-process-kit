/**
 * The board's "add" affordances as pure functions: what a new item looks like
 * and where it lands. The element dispatches the payload these return.
 */
import type { WhiteboardMessages } from './messages';

import { createEntityId } from '../../core/target';
import { freeSpot, type Point } from './layout';
import { allIds, DEFAULT_COLOR, DEFAULT_SIZE, type WbItem, type WhiteboardState } from './model';

/** What the toolbar can add. */
export type NewItemKind = 'sticky' | 'text' | 'rect' | 'ellipse' | 'frame';

export const NEW_ITEM_KINDS: readonly NewItemKind[] = ['sticky', 'text', 'rect', 'ellipse', 'frame'];

const sizeOf = (kind: NewItemKind): { readonly w: number; readonly h: number } =>
  kind === 'rect' || kind === 'ellipse' ? DEFAULT_SIZE.shape : DEFAULT_SIZE[kind];

/** A new item centered on `center` (nudged off anything already there), with a fresh id. */
export const newItem = (state: WhiteboardState, m: WhiteboardMessages, kind: NewItemKind, center: Point): WbItem => {
  const { w, h } = sizeOf(kind);
  const at = { x: Math.round(center.x - w / 2), y: Math.round(center.y - h / 2) };
  const spot = freeSpot(state, { ...at, w, h }, kind === 'frame');
  const prefix = kind === 'rect' || kind === 'ellipse' ? 'shape' : kind;
  const id = createEntityId(`new-${prefix}`, allIds(state));
  const box = { id, x: spot.x, y: spot.y, w, h };
  switch (kind) {
    case 'sticky':
      return { ...box, kind: 'sticky', text: '', color: DEFAULT_COLOR.sticky };
    case 'text':
      return { ...box, kind: 'text', text: '' };
    case 'rect':
    case 'ellipse':
      return { ...box, kind: 'shape', shape: kind, text: '', color: DEFAULT_COLOR.shape };
    case 'frame':
      return { ...box, kind: 'frame', title: m.newFrameTitle, color: DEFAULT_COLOR.frame };
  }
};

/** A fresh connector id between two items. */
export const newConnectorId = (state: WhiteboardState, from: string, to: string): string =>
  createEntityId(`${from}-to-${to}`, allIds(state));
