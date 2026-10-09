/**
 * Ephemeral UI state of `<dpk-template-usm>` as one closed union.
 *
 * At most one status's icon menu is open and at most one drop is waiting for
 * a step choice; encoding that as a single value (instead of nullable fields)
 * makes the exclusivity a fact of the type. Which story the panel shows is
 * navigation (`story`), and drag state lives in `DragController` because it
 * is orthogonal and reset by the platform.
 */
export type UsmUiMode =
  | { readonly kind: 'idle' }
  /** The icon menu of one status (statuses tab) is open. */
  | { readonly kind: 'picking-icon'; readonly statusId: string }
  | {
      /** A cross-activity drop: the column named no step, so the reader picks one. */
      readonly kind: 'picking-step';
      readonly storyId: string;
      readonly activityId: string;
      readonly milestoneId: string | undefined;
      readonly point: { readonly x: number; readonly y: number };
    };

export const IDLE_MODE: UsmUiMode = { kind: 'idle' };
