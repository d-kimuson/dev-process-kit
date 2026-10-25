import type { ActionTarget } from '../types';
import type { ContextMenuGroup, ContextMenuProvider, ContextMenuRequest } from './types';

import { TARGET_ATTRIBUTE } from '../shell/reveal';
import { parseTargetRef } from '../target';

const isProvider = (value: unknown): value is ContextMenuProvider =>
  typeof value === 'object' &&
  value !== null &&
  'getContextMenuItems' in value &&
  typeof (value as { getContextMenuItems: unknown }).getContextMenuItems === 'function';

/**
 * Asks every provider along the event's composed path for its groups,
 * innermost first — `composedPath()` already returns nodes in that order, so
 * a component's own items read above its board's, which read above the
 * page's, with no extra sorting needed.
 */
export const collectContextMenuGroups = (
  path: readonly EventTarget[],
  request: ContextMenuRequest,
): readonly ContextMenuGroup[] => {
  const groups: ContextMenuGroup[] = [];
  for (const node of path) {
    if (!isProvider(node)) continue;
    const found = node.getContextMenuItems(request);
    if (found !== null) groups.push(...found);
  }
  return groups;
};

/**
 * What the click actually landed on: the first `Element` on the composed path.
 * `path[0]` is the event target, which is not necessarily an element (a click
 * on bare text reaches no `Element`), so the first element is taken instead.
 */
export const contextMenuOrigin = (path: readonly EventTarget[]): Element | null => {
  for (const node of path) {
    if (node instanceof Element) return node;
  }
  return null;
};

/**
 * The nearest `data-dpk-target` / `data-dpk-comment` ancestor's target along
 * the path, innermost first — the reverse of `findTarget` in `./reveal.ts`. A
 * marked element wins over a `data-dpk-comment` button for the same target,
 * matching that file's own precedence.
 */
export const resolveContextMenuTarget = (path: readonly EventTarget[]): ActionTarget | null => {
  for (const node of path) {
    if (!(node instanceof Element)) continue;
    const marked = node.getAttribute(TARGET_ATTRIBUTE);
    if (marked !== null && marked.trim() !== '') {
      try {
        return parseTargetRef(marked);
      } catch {
        continue;
      }
    }
    const commented = node.getAttribute('data-dpk-comment');
    if (commented !== null && commented.trim() !== '') {
      try {
        return parseTargetRef(commented);
      } catch {
        continue;
      }
    }
  }
  return null;
};

/** The nearest element along the path whose own method matches `name` — the duck-typed component lookup (e.g. `resetView`). */
export const findMethodProvider = <K extends string>(
  path: readonly EventTarget[],
  name: K,
): (Element & Record<K, () => void>) | null => {
  for (const node of path) {
    if (node instanceof Element && typeof Reflect.get(node, name) === 'function') {
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- duck-typed lookup; checked above, TS cannot narrow a dynamic key.
      return node as Element & Record<K, () => void>;
    }
  }
  return null;
};

/** The nearest marked element itself along the path (for its `textContent`). */
export const findMarkedElement = (path: readonly EventTarget[]): Element | null => {
  for (const node of path) {
    if (node instanceof Element && (node.hasAttribute(TARGET_ATTRIBUTE) || node.hasAttribute('data-dpk-comment'))) {
      return node;
    }
  }
  return null;
};
