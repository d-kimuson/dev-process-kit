import type { MapFilterKey } from './map-filter';

/**
 * Ephemeral UI state of `<dpk-view-usm>` as one closed union.
 *
 * At most one drop is waiting for
 * a step choice; encoding that as a single value (instead of nullable fields)
 * makes the exclusivity a fact of the type. Which story the panel shows is
 * navigation (`story`), and drag state lives in `DragController` because it
 * is orthogonal and reset by the platform.
 */
export type UsmUiMode =
  | { readonly kind: 'idle' }
  /** The menu of one of the map's filters is open. */
  | { readonly kind: 'filtering'; readonly key: MapFilterKey }
  /** The menu of the page tabs that do not fit on the bar is open. */
  | { readonly kind: 'choosing-tab' }
  | {
      /** A cross-activity drop: the column named no step, so the reader picks one. */
      readonly kind: 'picking-step';
      readonly storyId: string;
      readonly activityId: string;
      readonly milestoneId: string | undefined;
      readonly point: { readonly x: number; readonly y: number };
    };

export const IDLE_MODE: UsmUiMode = { kind: 'idle' };
