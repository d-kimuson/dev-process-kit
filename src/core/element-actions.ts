import * as v from 'valibot';

import type { ActionDescriptor, ActionTarget, CommentTargetOption, DraftAction } from './types';

import { COMMENT_ACTION } from './action';

/**
 * Component element actions (ADR 20260924_component-element-actions).
 *
 * A component inside a template (a diagram, a custom provider) owns its own
 * authored JSON. It may still record change requests against its elements: the
 * core stores them in the same draft as template actions and comments, and the
 * component reports how each one applied. The core never interprets them.
 *
 * Component references always carry a provider segment
 * (`element:<provider-id>/<kind>/<item-id>`). Template entity ids cannot
 * contain `/`, so a template's own `element:<id>` targets never collide.
 */
export const ELEMENT_TARGET_TYPE = 'element';

export const elementActionTypeSchema = v.pipe(
  v.string(),
  v.regex(/^[A-Z][A-Z0-9_]*$/, 'component action types are CONSTANT_CASE'),
);

const elementPayloadSchema = v.record(v.string(), v.unknown());

const componentTargetSchema = v.object({
  type: v.literal(ELEMENT_TARGET_TYPE),
  id: v.pipe(v.string(), v.regex(/^[^/]+\/.+/, 'component references start with a provider id')),
});

export const elementActionSchema = v.object({
  id: v.pipe(v.string(), v.minLength(1)),
  type: elementActionTypeSchema,
  target: componentTargetSchema,
  payload: elementPayloadSchema,
  note: v.exactOptional(v.string()),
  createdAt: v.pipe(v.string(), v.minLength(1)),
});

/** Never deduped: each request is a step the component replays in order. */
export const ELEMENT_DESCRIPTOR: ActionDescriptor = {
  schema: elementActionSchema,
  mode: 'sequence',
  targetType: ELEMENT_TARGET_TYPE,
};

/** `dpk-element-action` detail. The target must be a registered comment target. */
export const componentElementActionSchema = v.strictObject({
  type: elementActionTypeSchema,
  target: v.pipe(v.string(), v.regex(/^element:[^/]+\/.+/)),
  payload: v.optional(elementPayloadSchema, {}),
});

export const elementActionResultSchema = v.strictObject({
  id: v.pipe(v.string(), v.minLength(1)),
  title: v.pipe(v.string(), v.minLength(1)),
  summary: v.exactOptional(v.string()),
  tone: v.exactOptional(v.picklist(['create', 'update', 'delete', 'move', 'meta'])),
  stale: v.exactOptional(v.picklist(['unsupported-action-type', 'target-missing', 'constraint-violated'])),
});

export type ElementActionResult = v.InferOutput<typeof elementActionResultSchema>;

/**
 * What the shell reads from the components of one template.
 * A malformed provider must not hide the others, so each part is checked on
 * its own and invalid entries are dropped.
 */
export type ComponentSnapshot = {
  readonly targets: readonly CommentTargetOption[];
  readonly providers: readonly { readonly id: string; readonly results: readonly ElementActionResult[] }[];
};

/** The provider id a component reference belongs to, or `null` for any other target. */
export const providerOf = (target: ActionTarget): string | null => {
  if (target.type !== ELEMENT_TARGET_TYPE) return null;
  const slash = target.id.indexOf('/');
  if (slash <= 0) return null;
  try {
    return decodeURIComponent(target.id.slice(0, slash));
  } catch {
    return null;
  }
};

/** Comments on component elements stay comments; everything else there is a component action. */
export const isElementAction = (action: { readonly type: string; readonly target: ActionTarget }): boolean =>
  action.type !== COMMENT_ACTION && providerOf(action.target) !== null;

/** The actions one provider replays, in draft order. */
export const elementActionsFor = (actions: readonly DraftAction[], provider: string): readonly DraftAction[] =>
  actions.filter((action) => isElementAction(action) && providerOf(action.target) === provider);

/** Results keyed by action id; a provider can only report on its own actions. */
export const elementResultsById = (
  actions: readonly DraftAction[],
  providers: ComponentSnapshot['providers'],
): ReadonlyMap<string, ElementActionResult> => {
  const owners = new Map(
    actions.flatMap((action) => (isElementAction(action) ? [[action.id, providerOf(action.target)] as const] : [])),
  );
  return new Map(
    providers.flatMap((provider) =>
      provider.results.flatMap((result) =>
        owners.get(result.id) === provider.id ? [[result.id, result] as const] : [],
      ),
    ),
  );
};
