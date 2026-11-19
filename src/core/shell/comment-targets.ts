import { safeParse } from 'valibot';

import type { CommentTargetOption, DraftAction } from '../types';

import { componentCommentTargetsSchema } from '../comment-targets';
import {
  elementActionResultSchema,
  elementActionsFor,
  elementCommentsFor,
  type ComponentSnapshot,
  type ElementActionResult,
} from '../element-actions';

/**
 * Elements of one template that take part in the provider contract: they
 * register `commentTargets`, or accept `elementActions` under their `id`.
 * Providers in open shadow roots count; nested templates own their history.
 */
export const findComponentProviders = (
  host: Element,
  observe?: (root: Element | ShadowRoot) => void,
): readonly Element[] => {
  const providers: Element[] = [];
  const visit = (root: Element | ShadowRoot): void => {
    if (root === host || root instanceof ShadowRoot) observe?.(root);
    for (const child of root.children) {
      if (child.hasAttribute('data-template')) continue;
      if ('commentTargets' in child || 'elementActions' in child || 'elementComments' in child) providers.push(child);
      visit(child);
      if (child.shadowRoot) visit(child.shadowRoot);
    }
  };
  visit(host);
  return providers;
};

/** Ambiguous ids must not silently attach anything to the wrong component. */
const unique = <T>(values: readonly T[], key: (value: T) => string): readonly T[] => {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return values.filter((value) => counts.get(key(value)) === 1);
};

/**
 * Providers that take a property under a unique `id` (`elementActions`, `elementComments`). A provider's `id` is read
 * defensively: a custom element that redeclares `id` as a reactive property (to reflect it, say)
 * can leave it `null`/`undefined` before its own constructor default runs, and this check must
 * never throw on that — it just treats the provider as unaddressable, like an empty id.
 */
const addressable = (providers: readonly Element[], property: string): readonly Element[] =>
  unique(
    providers.filter((provider) => property in provider && typeof provider.id === 'string' && provider.id.length > 0),
    (provider) => provider.id,
  );

const actionProviders = (providers: readonly Element[]): readonly Element[] => addressable(providers, 'elementActions');

/** Hands each component its own actions; unchanged lists are not reassigned (no update loops). */
export const assignElementActions = (providers: readonly Element[], actions: readonly DraftAction[]): void => {
  for (const provider of actionProviders(providers)) {
    const next = elementActionsFor(actions, provider.id);
    const current: unknown = Reflect.get(provider, 'elementActions');
    const same =
      Array.isArray(current) &&
      current.length === next.length &&
      next.every((action, index) => {
        const existing: unknown = current[index];
        return typeof existing === 'object' && existing !== null && 'id' in existing && existing.id === action.id;
      });
    if (!same) Reflect.set(provider, 'elementActions', next);
  }
};

/**
 * Hands each component that asks for them (`elementComments`) the review comments on its own
 * targets, in draft order, so it can show them where they point. A comment the reader edits is a
 * new action object, so comparing by identity also catches an edited body.
 */
export const assignElementComments = (providers: readonly Element[], actions: readonly DraftAction[]): void => {
  for (const provider of addressable(providers, 'elementComments')) {
    const next = elementCommentsFor(actions, provider.id);
    const current: unknown = Reflect.get(provider, 'elementComments');
    const same =
      Array.isArray(current) &&
      current.length === next.length &&
      next.every((action, index) => current[index] === action);
    if (!same) Reflect.set(provider, 'elementComments', next);
  }
};

const resultsOf = (provider: Element): readonly ElementActionResult[] => {
  const results: unknown = Reflect.get(provider, 'elementActionResults');
  if (!Array.isArray(results)) return [];
  return results.flatMap((result: unknown) => {
    const parsed = safeParse(elementActionResultSchema, result);
    return parsed.success ? [parsed.output] : [];
  });
};

/** Read the browser-native provider contract. A malformed provider never hides the others. */
export const readComponentSnapshot = (providers: readonly Element[]): ComponentSnapshot => {
  const targets: CommentTargetOption[] = [];
  for (const provider of providers) {
    if (!('commentTargets' in provider)) continue;
    const parsed = safeParse(componentCommentTargetsSchema, provider.commentTargets);
    if (parsed.success) targets.push(...parsed.output);
  }
  return {
    targets: unique(targets, (target) => target.value),
    providers: actionProviders(providers).map((provider) => ({ id: provider.id, results: resultsOf(provider) })),
  };
};
