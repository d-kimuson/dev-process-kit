/**
 * The context menu's one group that needs no per-component or per-template
 * code at all: it reads the target already resolved from the DOM
 * (`data-dpk-target` / `data-dpk-comment`, see `./provider.ts`) against
 * surface the template already exposes — `ViewDefinition.hasTarget`
 * and `ViewElement`'s own public `requestComment` — so "copy text",
 * "give feedback" and so on map to behaviour that already exists, rather
 * than inventing new review semantics.
 */
import type { ViewDefinition, ActionTarget } from '../types';
import type { ContextMenuMessages } from './messages';
import type { ContextMenuGroup, ContextMenuItem } from './types';

import { copyText } from '../../lib/dom/clipboard';
import { targetRef } from '../target';

/** What `buildCommonContextMenuGroup` needs from the host element — `ViewElement`'s public surface. */
export type CommonActionsHost = {
  readonly definition: ViewDefinition<unknown>;
  readonly requestComment: (target: string | ActionTarget) => void;
};

export type CommonActionsParams = {
  readonly host: CommonActionsHost;
  readonly state: unknown;
  /** The resolved target under the pointer, from `resolveContextMenuTarget`. */
  readonly target: ActionTarget | null;
  /** The element that carries that target (for its `textContent`), if any. */
  readonly targetElement: Element | null;
  /** The nearest element along the path with a callable `resetView()`, if any. */
  readonly resetViewElement: (Element & { resetView(): void }) | null;
  readonly messages: ContextMenuMessages;
};

/** `null` when there is nothing this group can offer (nothing marked, no reset-able view under the pointer). */
export const buildCommonContextMenuGroup = (params: CommonActionsParams): ContextMenuGroup | null => {
  const { host, state, target, targetElement, resetViewElement, messages } = params;
  const entries: ContextMenuItem[] = [];

  const text = targetElement?.textContent?.trim() ?? '';
  if (target !== null && text !== '') {
    entries.push({
      kind: 'item',
      id: 'copy-text',
      label: messages.copyText,
      run: () => void copyText(text),
    });
  }

  if (target !== null && host.definition.hasTarget(state, target)) {
    entries.push({
      kind: 'item',
      id: 'feedback',
      label: messages.feedback,
      run: () => host.requestComment(targetRef(target)),
    });
  }

  if (resetViewElement !== null) {
    entries.push({
      kind: 'item',
      id: 'reset-view',
      label: messages.resetView,
      run: () => resetViewElement.resetView(),
    });
  }

  if (entries.length === 0) return null;
  return { id: 'common', entries };
};
