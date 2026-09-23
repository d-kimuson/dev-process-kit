import { safeParse, type BaseIssue } from 'valibot';
import * as v from 'valibot';

import type { ActionDescriptor, DraftAction, ValidationIssue } from './types';

import { draftActionEnvelopeSchema, targetSchema } from './schema';
import { createActionId, sameTarget, targetRef, toTarget } from './target';

/** Core-owned action type. Templates must not redefine it. */
export const COMMENT_ACTION = 'comment';

export type BuildOutcome =
  | { readonly ok: true; readonly action: DraftAction }
  | { readonly ok: false; readonly issue: ValidationIssue };

export const firstIssue = (issues: readonly BaseIssue<unknown>[]): ValidationIssue => {
  const [issue] = issues;
  return {
    path: issue?.path?.map((segment) => String(segment.key)).join('.') ?? '',
    message: issue?.message ?? 'invalid action',
  };
};

/**
 * Dispatch input is external input (it comes from DOM handlers and from
 * hand-written templates), so the envelope is validated before any field is
 * read: `{ target: null }` must be a validation error, not a crash.
 */
export const actionInputSchema = v.object({
  type: v.pipe(v.string(), v.minLength(1)),
  target: v.union([v.pipe(v.string(), v.minLength(1)), targetSchema]),
  payload: v.optional(v.unknown()),
  note: v.exactOptional(v.string()),
  id: v.exactOptional(v.pipe(v.string(), v.minLength(1))),
  createdAt: v.exactOptional(v.pipe(v.string(), v.minLength(1))),
});

/** Validate + normalize. Invalid actions are never persisted (design §11). */
export const buildAction = (input: unknown, descriptor: ActionDescriptor): BuildOutcome => {
  const validated = safeParse(actionInputSchema, input);
  if (!validated.success) return { ok: false, issue: firstIssue(validated.issues) };
  const fields = validated.output;
  const target = toTarget(fields.target, descriptor.targetType);
  const candidate = {
    id: fields.id ?? createActionId(),
    type: fields.type,
    target,
    payload: fields.payload ?? {},
    ...(fields.note === undefined ? {} : { note: fields.note }),
    createdAt: fields.createdAt ?? new Date().toISOString(),
  };
  const parsed = safeParse(descriptor.schema, candidate);
  if (!parsed.success) return { ok: false, issue: firstIssue(parsed.issues) };
  const envelope = safeParse(draftActionEnvelopeSchema, parsed.output);
  if (!envelope.success) return { ok: false, issue: firstIssue(envelope.issues) };
  return { ok: true, action: envelope.output };
};

/**
 * Patch actions are deduped per `(type, target)` so a draft stays small and
 * idempotent-ish: the last requested value wins (design §8, §12).
 */
export const dedupeKeyOf = (action: DraftAction, descriptor: ActionDescriptor): string | null => {
  if (descriptor.dedupeKey) return descriptor.dedupeKey(action);
  if (descriptor.mode !== 'patch') return null;
  return `${action.type}|${targetRef(action.target)}`;
};

/**
 * Only adjacent patches may be compacted. Crossing another action can change
 * dependencies (moves, additions or deletions), even for a simple field update.
 */
export const appendAction = (
  actions: readonly DraftAction[],
  action: DraftAction,
  descriptor: ActionDescriptor,
): DraftAction[] => {
  const key = dedupeKeyOf(action, descriptor);
  if (key === null) return [...actions, action];
  const previous = actions.at(-1);
  if (!previous || dedupeKeyOf(previous, descriptor) !== key || !sameTargetDescriptor(previous, action)) {
    return [...actions, action];
  }
  return [...actions.slice(0, -1), action];
};

const sameTargetDescriptor = (existing: DraftAction, action: DraftAction): boolean => {
  return sameTarget(existing.target, action.target);
};

/** Serializes a draft for the agent: the canonical JSON payload. */
export const serializeDraft = (actions: readonly DraftAction[]): string => {
  return JSON.stringify(
    actions.map((action) => ({
      id: action.id,
      type: action.type,
      target: action.target,
      payload: action.payload,
      ...(action.note === undefined ? {} : { note: action.note }),
      createdAt: action.createdAt,
    })),
    null,
    2,
  );
};
