/**
 * Validated persistence for `PositionState` (see `./layout-position`). Reader-local
 * only: kept in the same browser storage as other reader UI state (sidebar width,
 * change-notice "seen" state), never in the draft or the hand-off.
 */
import * as v from 'valibot';

import { defaultJsonStore, memoryJsonStore, type JsonStore } from '../lib/dom/json-store';
import { EMPTY_POSITION_STATE, type PositionState } from './layout-position';

const pointSchema = v.object({ x: v.number(), y: v.number() });

const overrideSchema = v.object({
  board: v.string(),
  diagram: v.string(),
  node: v.string(),
  position: pointSchema,
});

const positionStateSchema = v.object({
  v: v.literal(1),
  overrides: v.array(overrideSchema),
});

export type PositionStore = JsonStore<PositionState>;

/** `null` on anything that is not a well-formed record: corrupt storage is treated as "nothing stored". */
export const parsePositionState = (input: unknown): PositionState | null => {
  const result = v.safeParse(positionStateSchema, input);
  return result.success ? result.output : null;
};

/** One key per page path, like the draft's own storage key. */
export const positionStorageKey = (path: string): string => `dev-process-kit:layout-positions:${path}`;

/** The current page's key, the same way `defaultStorageKey` locates the draft's. */
export const currentPositionStorageKey = (): string => {
  const path = typeof location === 'undefined' ? 'local' : `${location.pathname}${location.search}`;
  return positionStorageKey(path);
};

export const defaultPositionStore = (): PositionStore => defaultJsonStore(parsePositionState);

/** Used by tests and anywhere persistence should stay in memory for the session. */
export const memoryPositionStore = (): PositionStore => memoryJsonStore(parsePositionState);

export { EMPTY_POSITION_STATE };
