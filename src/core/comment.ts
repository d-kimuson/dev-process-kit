import * as v from 'valibot';

import type { ActionDescriptor } from './types';

import { COMMENT_ACTION } from './action';

/**
 * Free comments are draft actions like any other (design §15): same envelope,
 * same pipeline, same CommentPanel. Only `payload.body` is core-owned.
 */
export const commentActionSchema = v.object({
  id: v.pipe(v.string(), v.minLength(1)),
  type: v.literal(COMMENT_ACTION),
  target: v.object({ type: v.pipe(v.string(), v.minLength(1)), id: v.pipe(v.string(), v.minLength(1)) }),
  payload: v.object({ body: v.pipe(v.string(), v.minLength(1)) }),
  note: v.exactOptional(v.string()),
  createdAt: v.pipe(v.string(), v.minLength(1)),
});

export type CommentPayload = v.InferOutput<typeof commentActionSchema>['payload'];

export const COMMENT_DESCRIPTOR: ActionDescriptor = {
  schema: commentActionSchema,
  mode: 'append',
  targetType: 'artifact',
};

/** A comment's body is external input: validate the payload instead of asserting it. */
const commentBodySchema = v.object({ body: v.string() });

export const commentBody = (action: { payload: unknown }): string => {
  const parsed = v.safeParse(commentBodySchema, action.payload);
  return parsed.success ? parsed.output.body : '';
};
