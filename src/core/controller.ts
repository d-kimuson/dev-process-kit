import { isEqual } from 'es-toolkit/predicate';
import { array, parse, safeParse, unknown } from 'valibot';

import type {
  ActionDescriptor,
  ActionTarget,
  BatchDispatchOutcome,
  DispatchOutcome,
  DraftAction,
  TemplateDefinition,
  ValidationIssue,
} from './types';

import { actionInputSchema, appendAction, buildAction, firstIssue, type BuildOutcome } from './action';
import { COMMENT_DESCRIPTOR } from './comment';
import { componentSnapshotSchema, withComponentSnapshot } from './comment-targets';
import { compactDraft } from './compact';
import { derive, liveActions, type Derivation } from './derive';
import {
  ELEMENT_DESCRIPTOR,
  elementResultsById,
  isElementAction,
  type ComponentSnapshot,
  type ElementActionResult,
} from './element-actions';
import { defaultStorage, defaultStorageKey, type DraftStorage } from './persistence';
import { draftActionEnvelopeSchema, ownAction } from './schema';
import { toTarget } from './target';

export type DraftControllerOptions<S> = {
  readonly definition: TemplateDefinition<S>;
  readonly base: S;
  readonly storage?: DraftStorage | null;
  readonly storageKey?: string;
  readonly initialActions?: readonly DraftAction[];
};

export type DraftExport = {
  readonly template: string;
  readonly frameworkVersion: string;
  readonly exportedAt: string;
  readonly actions: readonly DraftAction[];
};

export type ControllerListener = () => void;

const batchInputSchema = array(unknown());

/** Owns validation, canonical actions, derivation and a single persistence/notification boundary. */
export class DraftController<S> {
  #template: TemplateDefinition<S>;
  #definition: TemplateDefinition<S>;
  #snapshot: ComponentSnapshot = { targets: [], providers: [] };
  #elementResults: ReadonlyMap<string, ElementActionResult> = new Map();
  #base: S;
  #actions: DraftAction[];
  #derivation: Derivation<S>;
  readonly #storage: DraftStorage | null;
  readonly #storageKey: string;
  readonly #listeners = new Set<ControllerListener>();
  #lastIssues: readonly ValidationIssue[] = [];
  #prunedCount = 0;

  constructor(options: DraftControllerOptions<S>) {
    this.#template = options.definition;
    this.#definition = withComponentSnapshot(options.definition, [], this.#elementResults);
    this.#base = options.base;
    this.#storageKey = options.storageKey ?? defaultStorageKey(options.definition.name);
    this.#storage = options.storage === undefined ? defaultStorage() : options.storage;
    const restored = options.initialActions ?? this.#storage?.load(this.#storageKey, this.definition.name) ?? [];
    this.#actions = normalizeRestored(this.definition, restored);
    this.#derivation = this.#derive(this.#actions);
    if (this.#normalize()) this.#persist();
  }

  get definition(): TemplateDefinition<S> {
    return this.#definition;
  }

  /**
   * What the page's components registered: comment targets and the results
   * of their element actions. Refreshes applicability without creating actions
   * or writing to storage.
   */
  setComponentSnapshot(input: unknown): void {
    const snapshot = parse(componentSnapshotSchema, input);
    if (isEqual(snapshot, this.#snapshot)) return;
    this.#snapshot = snapshot;
    this.#rewrap();
    this.#derivation = this.#derive(this.#actions);
    for (const listener of this.#listeners) listener();
  }

  /**
   * Replaces the template with the same one in another language. The draft,
   * the base and storage stay as they are; only the text derived from them changes.
   */
  setTemplate(definition: TemplateDefinition<S>): void {
    this.#template = definition;
    this.#rewrap();
    this.#derivation = this.#derive(this.#actions);
    for (const listener of this.#listeners) listener();
  }

  /** Element results are keyed by action id, so they follow the draft. */
  #rewrap(): void {
    this.#elementResults = elementResultsById(this.#actions, this.#snapshot.providers);
    this.#definition = withComponentSnapshot(this.#template, this.#snapshot.targets, this.#elementResults);
  }

  #derive(actions: readonly DraftAction[]): Derivation<S> {
    return derive(this.definition, this.#base, actions, elementResultsById(actions, this.#snapshot.providers));
  }

  get base(): S {
    return this.#base;
  }
  get actions(): readonly DraftAction[] {
    return this.#actions;
  }
  get derivation(): Derivation<S> {
    return this.#derivation;
  }
  get lastIssues(): readonly ValidationIssue[] {
    return this.#lastIssues;
  }
  get prunedCount(): number {
    return this.#prunedCount;
  }

  /** Comments and component element actions are core-owned; the rest is the template's vocabulary. */
  descriptorFor(type: string, target?: ActionTarget): ActionDescriptor | undefined {
    return descriptorOf(this.definition, type, target);
  }

  dispatch(input: unknown): DispatchOutcome {
    const built = this.#build(input, this.#derivation.state);
    if (!built.ok) return this.#reject([built.issue]);
    const descriptor = this.descriptorFor(built.action.type, built.action.target);
    if (!descriptor) return this.#reject([{ path: 'type', message: 'unknown action type' }]);
    this.#commit(appendAction(this.#actions, built.action, descriptor), [built.action.id]);
    return { ok: true, id: built.action.id };
  }

  /** UI commands are all-or-nothing; intermediate states never escape to storage or subscribers. */
  dispatchBatch(input: unknown): BatchDispatchOutcome {
    const parsed = safeParse(batchInputSchema, input);
    if (!parsed.success) return this.#reject([firstIssue(parsed.issues)]);
    const inputs = parsed.output;
    if (inputs.length === 0) return { ok: true, ids: [] };
    let actions = this.#actions;
    let state = this.#derivation.state;
    const ids: string[] = [];
    for (const input of inputs) {
      const built = this.#build(input, state);
      if (!built.ok) return this.#reject([built.issue]);
      const action = built.action;
      const descriptor = this.descriptorFor(action.type, action.target);
      if (!descriptor) return this.#reject([{ path: 'type', message: 'unknown action type' }]);
      // Comments and component actions never change template state.
      const next =
        action.type === 'comment' || isElementAction(action)
          ? action.target.type === 'page' || this.definition.hasTarget(state, action.target)
            ? state
            : null
          : this.definition.apply(state, action);
      if (next === null) return this.#reject([{ path: 'target', message: 'batch action is not applicable' }]);
      actions = appendAction(actions, action, descriptor);
      // Compaction can replace an addition with a different payload. Validate
      // following inputs against the draft we will actually commit, not `next`.
      state = this.#derive(actions).state;
      ids.push(action.id);
    }
    this.#commit(actions, ids);
    return { ok: true, ids };
  }

  #build(input: unknown, state: S): BuildOutcome {
    const parsed = safeParse(actionInputSchema, input);
    if (!parsed.success) return { ok: false, issue: firstIssue(parsed.issues) };
    const descriptor = this.descriptorFor(
      parsed.output.type,
      typeof parsed.output.target === 'string' ? toTarget(parsed.output.target, 'page') : parsed.output.target,
    );
    if (!descriptor)
      return {
        ok: false,
        issue: { path: 'type', message: `unknown action type "${parsed.output.type}"` },
      };
    const built = buildAction(parsed.output, descriptor);
    if (!built.ok) return built;
    const target = this.definition.canonicalTarget?.(state, built.action.target) ?? built.action.target;
    return { ok: true, action: { ...built.action, target } };
  }

  #reject(issues: readonly ValidationIssue[]): { readonly ok: false; readonly issues: readonly ValidationIssue[] } {
    this.#lastIssues = issues;
    return { ok: false, issues };
  }

  removeAction(id: string): void {
    const next = this.#actions.filter((action) => action.id !== id);
    if (next.length !== this.#actions.length) this.#commit(next);
  }

  clearActions(): void {
    if (this.#actions.length > 0) this.#commit([]);
  }

  replaceActions(actions: readonly unknown[]): void {
    this.#commit(normalizeRestored(this.definition, actions));
  }

  setBase(base: S): void {
    this.#base = base;
    this.#commit(this.#actions);
  }

  subscribe(listener: ControllerListener): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  exportDraft(frameworkVersion: string): DraftExport {
    return {
      template: this.definition.name,
      frameworkVersion,
      exportedAt: new Date().toISOString(),
      actions: this.#actions,
    };
  }

  /** `dispatched` narrows the cancellation search to what just changed; omitted, the whole draft is revisited. */
  #commit(actions: DraftAction[], dispatched?: readonly string[]): void {
    this.#lastIssues = [];
    this.#actions = actions;
    this.#rewrap();
    this.#derivation = this.#derive(this.#actions);
    this.#normalize(dispatched);
    this.#persist();
    for (const listener of this.#listeners) listener();
  }

  /** Keeps the draft interpretive: no-op patches and actions that cancel out are dropped. */
  #normalize(dispatched?: readonly string[]): boolean {
    const pruned = this.#prune();
    const compacted = compactDraft(this.definition, this.#derivation, (actions) => this.#derive(actions), dispatched);
    if (compacted === this.#derivation) return pruned;
    this.#prunedCount += this.#actions.length - compacted.actions.length;
    this.#actions = [...compacted.actions];
    this.#rewrap();
    this.#derivation = this.#derive(this.#actions);
    this.#prune();
    return true;
  }

  #prune(): boolean {
    if (this.#derivation.obsolete.length === 0) return false;
    this.#prunedCount += this.#derivation.obsolete.length;
    this.#actions = liveActions(this.#derivation);
    this.#rewrap();
    this.#derivation = this.#derive(this.#actions);
    return true;
  }

  #persist(): void {
    this.#storage?.save(this.#storageKey, this.definition.name, this.#actions);
  }
}

const descriptorOf = <S>(
  definition: TemplateDefinition<S>,
  type: string,
  target: ActionTarget | undefined,
): ActionDescriptor | undefined => {
  if (type === 'comment') return COMMENT_DESCRIPTOR;
  if (target !== undefined && isElementAction({ type, target })) return ELEMENT_DESCRIPTOR;
  return ownAction(definition.actions, type);
};

/** Validate the envelope before reading fields; preserve normalized schema output. */
const normalizeRestored = <S>(definition: TemplateDefinition<S>, actions: readonly unknown[]): DraftAction[] => {
  return actions.flatMap((input) => {
    const envelope = safeParse(draftActionEnvelopeSchema, input);
    if (!envelope.success) return [];
    const action = envelope.output;
    const descriptor = descriptorOf(definition, action.type, action.target);
    if (!descriptor) return [];
    const parsed = safeParse(descriptor.schema, action);
    if (!parsed.success) return [];
    const normalized = safeParse(draftActionEnvelopeSchema, parsed.output);
    return normalized.success ? [normalized.output] : [];
  });
};
