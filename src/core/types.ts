/**
 * Core contracts — the boundary between the core and a template.
 *
 * Three layers are deliberately distinguished here:
 *
 * 1. **Public contract** (what generated HTML may use): custom elements,
 *    attributes, properties, DOM events and slots. That contract lives in
 *    `src/components` / `src/templates` and is documented in `docs/index.md`;
 *    nothing in this file is part of it.
 * 2. **Template extension API** (what a template implements or produces):
 *    `TemplateDefinition`, `ActionDescriptor`, `ActionInput`, `ApplyResult`,
 *    `ActionDescription`, `CommentTargetOption`.
 * 3. **Internal pipeline types** (owned by the core, read by templates):
 *    `DraftAction`, `ActionTarget`, `ActionMode`, `ActionTone`, `Navigation`,
 *    `ValidationIssue`, `DispatchOutcome`.
 *
 * Everything here is template-agnostic: the core must never learn about
 * `Activity`, `UserStory`, `DomainEvent`, ... Those live in `src/templates/*`.
 * A template's action union is derived from its own action map
 * (`src/core/schema.ts`), so payload types are never written twice.
 */
import type { GenericSchema } from 'valibot';

/* ------------------------------------------------------------------ internal */

/** Immutable key/value view of the URL hash. */
export type Navigation = Readonly<Record<string, string>>;

/** Patch applied to the navigation. `null` removes a key. */
export type NavigationPatch = Readonly<Record<string, string | null | undefined>>;

/** A pointer into the template's meaning model. */
export type ActionTarget = {
  readonly type: string;
  readonly id: string;
};

/**
 * A pending change request produced by a human in the browser.
 * This is also the canonical payload handed back to the agent.
 */
export type DraftAction = {
  readonly id: string;
  readonly type: string;
  readonly target: ActionTarget;
  readonly payload: unknown;
  readonly note?: string;
  readonly createdAt: string;
};

/** Untrusted action shape accepted from user code / templates / agents. */
export type ActionInput = {
  readonly type: string;
  /** `{ type, id }` or the shorthand `"id"` (normalized with the action's target type). */
  readonly target: string | ActionTarget;
  readonly payload?: unknown;
  readonly note?: string;
  /** Only used when re-importing an exported draft. Omit for new actions. */
  readonly id?: string;
  readonly createdAt?: string;
};

/**
 * `patch` actions express "the page should look like this" (last write wins,
 * deduped per target). `append` actions accumulate (comments, additions, links).
 */
export type ActionMode = 'patch' | 'sequence' | 'append';

export type ActionDescriptor = {
  /** Validates the whole action envelope + payload. Invalid actions are never stored. */
  readonly schema: GenericSchema;
  readonly mode: ActionMode;
  /** Used to normalize the `target: "id"` shorthand, and for `describe()` fallbacks. */
  readonly targetType: string;
  /** Overrides the default patch dedupe key. Return `null` to never dedupe. */
  readonly dedupeKey?: (action: DraftAction) => string | null;
};

/** `null` means "this action cannot be applied to the current state" (stale). */
export type ApplyResult<S> = S | null;

/* -------------------------------------------------------- template extension */

export type ActionTone = 'comment' | 'create' | 'update' | 'delete' | 'move' | 'meta';

export type ActionDescription = {
  /** Short action label, e.g. `ステップ名を変更`. */
  readonly title: string;
  /** Optional before/after or payload summary. */
  readonly summary?: string;
  /** Human readable target, e.g. `Step · Google ログイン`. */
  readonly targetLabel: string;
  readonly tone: ActionTone;
};

export type ValidationIssue = {
  readonly path: string;
  readonly message: string;
};

export type DispatchOutcome =
  | { readonly ok: true; readonly id: string }
  | { readonly ok: false; readonly issues: readonly ValidationIssue[] };

export type BatchDispatchOutcome =
  | { readonly ok: true; readonly ids: readonly string[] }
  | { readonly ok: false; readonly issues: readonly ValidationIssue[] };

export type CommentTargetOption = {
  readonly value: string;
  readonly label: string;
  readonly group?: string;
};

/**
 * The template contract. Everything here is a pure function of
 * `(baseState | derivedState, action)` so it can be unit tested without a DOM.
 *
 * Implemented by each `src/templates/<name>/definition.ts`; the element side
 * (`src/templates/<name>/element.ts`) only renders what this returns.
 */
export type TemplateDefinition<S> = {
  /** Machine name, also exposed as `element.dataset.template`. */
  readonly name: string;
  /** Human label used in shell chrome and exports. */
  readonly label: string;

  /** Validates and normalizes the JSON baked into the HTML. Throws when invalid. */
  parseBase(input: unknown): S;
  /** Used when the element has no base JSON at all. */
  emptyBase(): S;

  /** Action vocabulary. `comment` is contributed by the core. */
  readonly actions: Readonly<Record<string, ActionDescriptor>>;

  /** Pure reducer for a single action. `null` when not applicable. */
  apply(state: S, action: DraftAction): ApplyResult<S>;

  /**
   * Rewrites incidental structure (for example the global order of items that
   * are only ever shown per lane) so that two states meaning the same page
   * compare equal. Deciding whether a draft still changes anything relies on
   * it; without it, states are compared as they are.
   */
  canonicalState?(state: S): S;

  /** Resolves a live shorthand target to its canonical reference before storing. */
  canonicalTarget?(state: S, target: ActionTarget): ActionTarget;

  /** Used for applicability validation of comments and stale-reason reporting. */
  hasTarget(state: S, target: ActionTarget): boolean;

  /**
   * CommentPanel rendering for one action. Must not throw on stale actions.
   * `base` is the pre-draft state: use it for the "before" side of a summary.
   */
  describe(action: DraftAction, state: S, base?: S): ActionDescription;

  /** Stable one-line serialization for the draft list and agent exports. */
  serialize(action: DraftAction): string;

  /** Fills navigation defaults without writing to the URL. */
  resolveNavigation(state: S, nav: Navigation): Navigation;

  /** Selectable comment targets for the composer. */
  commentTargets(state: S, nav: Navigation): readonly CommentTargetOption[];

  /**
   * What the reader is looking at right now, as a comment target.
   *
   * When a template provides it, the composer offers a checkbox that attaches a
   * note to that element; unchecked, or when the template has no notion of a
   * current element, the note is page-wide (`target.type === 'page'`,
   * which the core always treats as applicable).
   */
  currentTarget?(state: S, nav: Navigation): CommentTargetOption | null;

  /** Title shown in the template chrome. */
  title(state: S): string;
};
