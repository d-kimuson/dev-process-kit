/**
 * The right-click menu's contract: a flat ADT any part of the shell, a
 * template or a component can contribute to. An item runs a closure handed to
 * it by whoever built it — the menu itself interprets nothing and stores no
 * domain knowledge, the same way a `ViewSetting.toggle` is dispatched by
 * its owner rather than decided here.
 */
import type { ActionTarget } from '../types';

export type ContextMenuItem = {
  readonly kind: 'item';
  readonly id: string;
  readonly label: string;
  readonly run: () => void;
  readonly disabled?: boolean;
  /** Renders in the destructive tone (delete, disconnect, ...). */
  readonly danger?: boolean;
};

export type ContextMenuSubmenu = {
  readonly kind: 'submenu';
  readonly id: string;
  readonly label: string;
  readonly items: readonly ContextMenuEntry[];
};

export type ContextMenuEntry = ContextMenuItem | ContextMenuSubmenu;

export type ContextMenuGroup = {
  readonly id: string;
  readonly heading?: string;
  readonly entries: readonly ContextMenuEntry[];
};

/** Where the menu was asked to open, and what was under the pointer. */
export type ContextMenuRequest = {
  readonly clientX: number;
  readonly clientY: number;
  /** The nearest `data-dpk-target` / `data-dpk-comment` ancestor's target, if any. */
  readonly target: ActionTarget | null;
};

/**
 * Duck-typed extension point (same shape as `element-actions.ts` /
 * `comment-targets.ts`'s providers): any element along the event's composed
 * path — a component, a template's own element, the shell itself — may
 * contribute groups for what was right-clicked. `null` contributes nothing.
 */
export type ContextMenuProvider = {
  getContextMenuItems(request: ContextMenuRequest): readonly ContextMenuGroup[] | null;
};
