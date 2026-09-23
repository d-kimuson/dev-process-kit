import * as v from 'valibot';

import type { ActionDescriptor, ActionMode, ActionTarget, DraftAction } from './types';

export const targetSchema = v.object({
  type: v.pipe(v.string(), v.minLength(1)),
  id: v.pipe(v.string(), v.minLength(1)),
});

/**
 * Entity ids baked into the base data.
 *
 * `.` is reserved as the path separator in target references
 * (`step:onboarding.account.landing`), so an id may not contain one. Keeping the
 * alphabet tight also keeps refs copy-pasteable into a prompt.
 */
export const entityIdSchema = v.pipe(
  v.string(),
  v.minLength(1),
  v.regex(/^[A-Za-z0-9_-]+$/, 'ids may only contain letters, digits, "_" and "-" (a "." builds a path)'),
);

/** `onboarding.account.landing` -> `['onboarding', 'account', 'landing']`, or `null`. */
export const splitPath = (id: string, depth: number): string[] | null => {
  if (depth === 1) return id.includes('.') ? null : [id];
  const parts = id.split('.');
  return parts.length === depth && parts.every((part) => part.length > 0) ? parts : null;
};

/**
 * The core-owned envelope every draft action shares. A template's action schema
 * validates the same envelope plus its own payload, so this is the schema that
 * turns stored or dispatched data into a typed `DraftAction`.
 */
export const draftActionEnvelopeSchema = v.object({
  id: v.pipe(v.string(), v.minLength(1)),
  type: v.pipe(v.string(), v.minLength(1)),
  target: targetSchema,
  payload: v.unknown(),
  note: v.exactOptional(v.string()),
  createdAt: v.pipe(v.string(), v.minLength(1)),
});

/**
 * A declared action: the runtime descriptor plus the phantom types that keep a
 * template's payloads typed.
 *
 * `actionType` and `payloadSchema` are never read at runtime. They exist so that
 * `TemplateAction` can derive a discriminated union from a template's action
 * map, which is what makes `apply`'s switch exhaustive and its payload typed.
 */
/** The action object a spec's schema produces. */
export type ActionEnvelope<T extends string, PL> = {
  readonly id: string;
  readonly type: T;
  readonly target: ActionTarget;
  readonly payload: PL;
  readonly note?: string;
  readonly createdAt: string;
};

export type ActionSpec<T extends string = string, P extends v.GenericSchema = v.GenericSchema> = ActionDescriptor & {
  readonly actionType: T;
  readonly payloadSchema: P;
  /**
   * Validates one action against this spec and returns its typed form.
   *
   * Declared per spec (where the payload type is concrete) so callers never need
   * a type assertion to recover the union member after validation.
   */
  readonly parse: (action: DraftAction) => ActionEnvelope<T, v.InferOutput<P>> | null;
};

export type ActionSpecs = Readonly<Record<string, ActionSpec>>;

/** The action names a template declares. */
export type ActionName<M extends ActionSpecs> = keyof M & string;

/** The payload type a declared action validates. */
export type PayloadOfSpec<D> = D extends { readonly payloadSchema: infer P extends v.GenericSchema }
  ? v.InferOutput<P>
  : never;

/** The discriminated union of a template's actions, derived from its action map. */
export type TemplateAction<M extends ActionSpecs> = {
  [K in ActionName<M>]: {
    readonly id: string;
    readonly type: K;
    readonly target: ActionTarget;
    readonly payload: PayloadOfSpec<M[K]>;
    readonly note?: string;
    readonly createdAt: string;
  };
}[ActionName<M>];

/**
 * Declares one action of a template's vocabulary.
 *
 * ```ts
 * SET_STEP_NAME: defineAction('SET_STEP_NAME', 'step', v.object({ name: v.pipe(v.string(), v.minLength(1)) }))
 * ```
 */
export const defineAction = <T extends string, P extends v.GenericSchema>(
  type: T,
  targetType: string,
  payload: P,
  options: {
    mode?: ActionMode;
    dedupeKey?: (action: DraftAction) => string | null;
    identifier?: (payload: v.InferOutput<P>) => string;
  } = {},
): ActionSpec<T, P> => {
  const schema = v.object({
    id: v.pipe(v.string(), v.minLength(1)),
    type: v.literal(type),
    target: targetSchema,
    payload,
    note: v.exactOptional(v.string()),
    createdAt: v.pipe(v.string(), v.minLength(1)),
  });
  const parse = (action: DraftAction): ActionEnvelope<T, v.InferOutput<P>> | null => {
    // The envelope and the payload are validated separately so the result is
    // built from checked values instead of asserted into shape.
    const envelope = v.safeParse(draftActionEnvelopeSchema, action);
    if (!envelope.success || envelope.output.type !== type) return null;
    const parsedPayload = v.safeParse(payload, action.payload);
    if (!parsedPayload.success) return null;
    return {
      id: envelope.output.id,
      type,
      target: envelope.output.target,
      payload: parsedPayload.output,
      ...(envelope.output.note === undefined ? {} : { note: envelope.output.note }),
      createdAt: envelope.output.createdAt,
    };
  };
  return {
    schema,
    mode: options.mode ?? 'patch',
    targetType,
    actionType: type,
    payloadSchema: payload,
    parse,
    ...(options.dedupeKey ? { dedupeKey: options.dedupeKey } : {}),
  };
};

/**
 * Validates one action against a template's vocabulary and returns it as the
 * matching union member, or `null` when the action is unknown or invalid.
 *
 * Each spec validates and types its own action (see `defineAction`), so the
 * shape is checked before this point. TypeScript cannot correlate the generic
 * lookup `specs[action.type]` with the matching union member, so recovering the
 * union needs one assertion — the only one in the codebase, and it never runs
 * on unvalidated data.
 */
export const parseTemplateAction = <M extends ActionSpecs>(specs: M, action: DraftAction): TemplateAction<M> | null => {
  const spec = ownAction(specs, action.type);
  if (spec === undefined) return null;
  const parsed = spec.parse(action);
  if (parsed === null) return null;
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- validated above; TS cannot correlate the lookup.
  return parsed as TemplateAction<M>;
};

/**
 * Schema-validated payload accessor. The payload type comes from the declared
 * spec, so it can never drift from the schema that validates it.
 */
export const payloadFor = <P extends v.GenericSchema>(
  spec: ActionSpec<string, P>,
  action: DraftAction,
): v.InferOutput<P> => {
  const parsed = v.safeParse(spec.payloadSchema, action.payload);
  if (!parsed.success) throw new Error(`invalid payload for action "${action.type}"`);
  return parsed.output;
};

/**
 * Own-property lookup for an action vocabulary.
 *
 * `actions['toString']` would otherwise reach `Object.prototype` and hand back a
 * function where a descriptor is expected, so every vocabulary lookup goes
 * through here.
 */
export const ownAction = <T>(vocabulary: Readonly<Record<string, T>>, type: string): T | undefined => {
  return Object.hasOwn(vocabulary, type) ? vocabulary[type] : undefined;
};

/** Compile-time exhaustiveness check for a discriminated union switch. */
export const assertNever = (value: never): never => {
  throw new Error(`unhandled action: ${JSON.stringify(value)}`);
};

/** Addition actions carry their own entity id; the same id can only land once. */
const payloadIdSchema = v.object({ id: v.pipe(v.string(), v.minLength(1)) });

export const entityDedupeKey = (action: DraftAction): string => {
  const payload = v.safeParse(payloadIdSchema, action.payload);
  return `${action.type}|${payload.success ? payload.output.id : JSON.stringify(action.payload)}`;
};
