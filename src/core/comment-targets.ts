import * as v from 'valibot';

import type { CommentTargetOption, TemplateDefinition } from './types';

import { elementActionResultSchema, isElementAction, type ElementActionResult } from './element-actions';
import { targetRef } from './target';

/** Component-owned references share the existing element target vocabulary. */
export const componentCommentTargetsSchema = v.array(
  v.strictObject({
    value: v.pipe(v.string(), v.regex(/^element:.+/)),
    label: v.pipe(v.string(), v.minLength(1)),
    group: v.exactOptional(v.string()),
  }),
);

export const componentSnapshotSchema = v.object({
  targets: componentCommentTargetsSchema,
  providers: v.array(
    v.object({
      id: v.pipe(v.string(), v.minLength(1)),
      results: v.array(elementActionResultSchema),
    }),
  ),
});

/** Direct submissions from a component-local composer use the same draft pipeline. */
export const componentCommentSubmissionSchema = v.strictObject({
  target: v.pipe(v.string(), v.regex(/^element:.+/)),
  body: v.pipe(v.string(), v.trim(), v.minLength(1)),
});

const labelOf = (target: CommentTargetOption): string =>
  target.group ? `${target.group} · ${target.label}` : target.label;

/**
 * Extends a template with what its components registered: comment targets and
 * the review-list wording of their element actions. All functions still depend
 * only on the captured snapshot and domain state.
 */
export const withComponentSnapshot = <S>(
  definition: TemplateDefinition<S>,
  targets: readonly CommentTargetOption[],
  results: ReadonlyMap<string, ElementActionResult>,
): TemplateDefinition<S> => {
  const byRef = new Map(targets.map((target) => [target.value, target]));
  return {
    ...definition,
    hasTarget: (state, target) => definition.hasTarget(state, target) || byRef.has(targetRef(target)),
    commentTargets: (state, navigation) => {
      const native = definition.commentTargets(state, navigation);
      const nativeRefs = new Set(native.map((target) => target.value));
      return [...native, ...targets.filter((target) => !nativeRefs.has(target.value))];
    },
    describe: (action, state, base) => {
      if (isElementAction(action)) {
        const result = results.get(action.id);
        const target = byRef.get(targetRef(action.target));
        return {
          title: result?.title ?? action.type,
          ...(result?.summary === undefined ? {} : { summary: result.summary }),
          tone: result?.tone ?? 'update',
          targetLabel: target ? labelOf(target) : action.target.id,
        };
      }
      const description = definition.describe(action, state, base);
      const target =
        action.type === 'comment' && !definition.hasTarget(state, action.target)
          ? byRef.get(targetRef(action.target))
          : undefined;
      return target === undefined ? description : { ...description, targetLabel: labelOf(target) };
    },
    serialize: (action) =>
      isElementAction(action)
        ? `${action.type} ${targetRef(action.target)} ${JSON.stringify(action.payload)}`
        : definition.serialize(action),
  };
};
