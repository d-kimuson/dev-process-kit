import { isEqual } from 'es-toolkit/predicate';
import { array, parse, safeParse, unknown } from 'valibot';

import type {
  ActionDescriptor,
  ActionTarget,
  BatchDispatchOutcome,
  DispatchOutcome,
  DraftAction,
  ViewDefinition,
  ValidationIssue,
} from './types';

import { actionInputSchema, appendAction, buildAction, COMMENT_ACTION, firstIssue, type BuildOutcome } from './action';
import { COMMENT_DESCRIPTOR, commentBody } from './comment';
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
import { ANSWER_ACTION, ANSWER_DESCRIPTOR, applyAnswer, EMPTY_GRILL, isAnswerAction, replaceAnswer } from './grill';
import { withGrill, type GrillLayer } from './grill-targets';
import { defaultStorage, defaultStorageKey, type DraftStorage } from './persistence';
import { draftActionEnvelopeSchema, ownAction } from './schema';
import { toTarget } from './target';
import { canRedo, canUndo, clearRedo, redoStep, undoStep, EMPTY_UNDO_REDO, type UndoRedoState } from './undo-redo';

export type DraftControllerOptions<S> = {
  readonly definition: ViewDefinition<S>;
  readonly base: S;
  readonly storage?: DraftStorage | null;
  readonly storageKey?: string;
  readonly initialActions?: readonly DraftAction[];
  /** The questions the page asks; none until `setGrill`. */
  readonly grill?: GrillLayer;
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
  #template: ViewDefinition<S>;
  #definition: ViewDefinition<S>;
  #snapshot: ComponentSnapshot = { targets: [], providers: [] };
  #grill: GrillLayer;
  #elementResults: ReadonlyMap<string, ElementActionResult> = new Map();
  #base: S;
  #actions: DraftAction[];
  #derivation: Derivation<S>;
  readonly #storage: DraftStorage | null;
  readonly #storageKey: string;
  readonly #listeners = new Set<ControllerListener>();
  #lastIssues: readonly ValidationIssue[] = [];
  #prunedCount = 0;
  #undoRedo: UndoRedoState = EMPTY_UNDO_REDO;

  constructor(options: DraftControllerOptions<S>) {
    this.#template = options.definition;
    this.#grill = options.grill ?? { grill: EMPTY_GRILL, locale: 'en' };
    this.#definition = this.#wrap();
    this.#base = options.base;
    this.#storageKey = options.storageKey ?? defaultStorageKey(options.definition.name);
    this.#storage = options.storage === undefined ? defaultStorage() : options.storage;
    const restored = options.initialActions ?? this.#storage?.load(this.#storageKey, this.definition.name) ?? [];
    this.#actions = normalizeRestored(this.definition, restored);
    this.#derivation = this.#derive(this.#actions);
    if (this.#normalize()) this.#persist();
  }

  get definition(): ViewDefinition<S> {
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
  setTemplate(definition: ViewDefinition<S>): void {
    this.#template = definition;
    this.#rewrap();
    this.#derivation = this.#derive(this.#actions);
    for (const listener of this.#listeners) listener();
  }

  /**
   * The questions the page asks, read apart from the base data. Answers to
   * questions that are gone stay in the draft as stale, like any action.
   */
  setGrill(layer: GrillLayer): void {
    this.#grill = layer;
    this.#rewrap();
    this.#derivation = this.#derive(this.#actions);
    for (const listener of this.#listeners) listener();
  }

  /** Element results are keyed by action id, so they follow the draft. */
  #rewrap(): void {
    this.#elementResults = elementResultsById(this.#actions, this.#snapshot.providers);
    this.#definition = this.#wrap();
  }

  #wrap(): ViewDefinition<S> {
    return withGrill(withComponentSnapshot(this.#template, this.#snapshot.targets, this.#elementResults), this.#grill);
  }

  #derive(actions: readonly DraftAction[]): Derivation<S> {
    return derive(
      this.definition,
      this.#base,
      actions,
      elementResultsById(actions, this.#snapshot.providers),
      this.#grill.grill,
    );
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
  /** Whether there is a draft entry `undo()` would remove. */
  get canUndo(): boolean {
    return canUndo(this.#actions);
  }
  /** Whether there is a removed entry `redo()` would replay. */
  get canRedo(): boolean {
    return canRedo(this.#undoRedo);
  }

  /** Comments, answers and component element actions are core-owned; the rest is the template's vocabulary. */
  descriptorFor(type: string, target?: ActionTarget): ActionDescriptor | undefined {
    return descriptorOf(this.definition, type, target);
  }

  dispatch(input: unknown): DispatchOutcome {
    const built = this.#build(input, this.#derivation.state);
    if (!built.ok) return this.#reject([built.issue]);
    const descriptor = this.descriptorFor(built.action.type, built.action.target);
    if (!descriptor) return this.#reject([{ path: 'type', message: 'unknown action type' }]);
    this.#commit(append(this.#actions, built.action, descriptor), { dispatched: [built.action.id] });
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
    let answers = this.#derivation.answers;
    const ids: string[] = [];
    for (const input of inputs) {
      const built = this.#build(input, state);
      if (!built.ok) return this.#reject([built.issue]);
      const action = built.action;
      const descriptor = this.descriptorFor(action.type, action.target);
      if (!descriptor) return this.#reject([{ path: 'type', message: 'unknown action type' }]);
      // Comments, answers and component actions never change template state.
      const next = isAnswerAction(action)
        ? applyAnswer(this.#grill.grill, answers, action) === null
          ? null
          : state
        : action.type === 'comment' || isElementAction(action)
          ? action.target.type === 'page' || this.definition.hasTarget(state, action.target)
            ? state
            : null
          : this.definition.apply(state, action);
      if (next === null) return this.#reject([{ path: 'target', message: 'batch action is not applicable' }]);
      actions = append(actions, action, descriptor);
      // Per-target dedupe can replace a patch with a different payload. Validate
      // following inputs against the draft we will actually commit, not `next`.
      const derivation = this.#derive(actions);
      state = derivation.state;
      answers = derivation.answers;
      ids.push(action.id);
    }
    this.#commit(actions, { dispatched: ids });
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

  /**
   * Rewrites a comment the reader already posted. Only the body changes: the
   * comment keeps its id, target, time and place in the draft, so nothing else
   * in the draft is revisited.
   */
  editComment(id: string, body: string): DispatchOutcome {
    const existing = this.#actions.find((action) => action.id === id);
    if (existing?.type !== COMMENT_ACTION)
      return this.#reject([{ path: 'id', message: `no comment "${id}" in the draft` }]);
    if (commentBody(existing) === body) return { ok: true, id };
    const parsed = safeParse(COMMENT_DESCRIPTOR.schema, { ...existing, payload: { body } });
    if (!parsed.success) return this.#reject([firstIssue(parsed.issues)]);
    const edited = safeParse(draftActionEnvelopeSchema, parsed.output);
    if (!edited.success) return this.#reject([firstIssue(edited.issues)]);
    const replacement = edited.output;
    this.#commit(
      this.#actions.map((action) => (action === existing ? replacement : action)),
      { dispatched: [] },
    );
    return { ok: true, id };
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

  /** Removes the draft's last entry (comments included) and re-derives. `false` when the draft is empty. */
  undo(): boolean {
    const outcome = undoStep(this.#actions, this.#undoRedo);
    if (outcome === null) return false;
    this.#undoRedo = outcome.state;
    this.#commit([...outcome.actions], { preserveRedo: true });
    return true;
  }

  /** Replays the most recently undone entry. `false` when there is nothing to redo. */
  redo(): boolean {
    const outcome = redoStep(this.#actions, this.#undoRedo);
    if (outcome === null) return false;
    this.#undoRedo = outcome.state;
    this.#commit([...outcome.actions], { preserveRedo: true });
    return true;
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

  /** `preserveRedo` keeps the redo stack `undo`/`redo` just adjusted; any other commit clears it. */
  #commit(
    actions: DraftAction[],
    options?: { readonly preserveRedo?: boolean; readonly dispatched?: readonly string[] },
  ): void {
    this.#lastIssues = [];
    this.#actions = actions;
    this.#rewrap();
    this.#derivation = this.#derive(this.#actions);
    this.#normalize(options?.dispatched);
    if (options?.preserveRedo !== true) this.#undoRedo = clearRedo();
    this.#persist();
    for (const listener of this.#listeners) listener();
  }

  /** `dispatched` narrows the cancellation search to what just changed; omitted, the whole draft is revisited. */
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

  /** Drops patches the base (or an earlier action) already satisfies. */
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
  definition: ViewDefinition<S>,
  type: string,
  target: ActionTarget | undefined,
): ActionDescriptor | undefined => {
  if (type === 'comment') return COMMENT_DESCRIPTOR;
  if (type === ANSWER_ACTION) return ANSWER_DESCRIPTOR;
  if (target !== undefined && isElementAction({ type, target })) return ELEMENT_DESCRIPTOR;
  if (definition.actionFor) return definition.actionFor(type, target);
  return ownAction(definition.actions, type);
};

/** An answer replaces the question's last one; everything else follows its descriptor. */
const append = (actions: readonly DraftAction[], action: DraftAction, descriptor: ActionDescriptor): DraftAction[] =>
  isAnswerAction(action) ? replaceAnswer(actions, action) : appendAction(actions, action, descriptor);

/** Validate the envelope before reading fields; preserve normalized schema output. */
const normalizeRestored = <S>(definition: ViewDefinition<S>, actions: readonly unknown[]): DraftAction[] => {
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
