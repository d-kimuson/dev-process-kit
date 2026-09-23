/**
 * The element's public facade: the read-only snapshot, the render context handed
 * to templates and slot content, and the `ArtifactApi` object authors use.
 *
 * These are pure views over the element's state. The element owns the pipeline,
 * lifecycle and DOM wiring; keeping the views here means the facade can be read
 * (and tested) without reading the whole element.
 */
import type { ArtifactController } from '../controller';
import type { Derivation } from '../derive';
import type {
  ActionInput,
  BatchDispatchOutcome,
  ActionTarget,
  DispatchOutcome,
  Navigation,
  NavigationPatch,
  TemplateDefinition,
  ValidationIssue,
} from '../types';
import type { ArtifactApi, ArtifactSnapshot, TemplateRenderContext } from './contracts';

import { COMMENT_ACTION } from '../action';
import { buildAgentBrief } from '../export';
import { targetRef } from '../target';
import { FRAMEWORK_VERSION } from '../version';

/** Everything the facade needs from the element, as plain accessors. */
export type ArtifactFacadeSource<S> = {
  readonly definition: TemplateDefinition<S>;
  readonly controller: () => ArtifactController<S>;
  readonly derivation: () => Derivation<S>;
  readonly ready: Promise<void>;
  readonly navigation: () => Navigation;
  readonly issues: () => readonly ValidationIssue[];
  readonly dispatch: (input: ActionInput) => DispatchOutcome;
  readonly dispatchBatch: (inputs: readonly ActionInput[]) => BatchDispatchOutcome;
  readonly subscribe: (listener: (snapshot: ArtifactSnapshot<S>) => void) => () => void;
  readonly removeAction: (id: string) => void;
  readonly clearActions: () => void;
  readonly navigate: (patch: NavigationPatch, options?: { replace?: boolean }) => void;
  readonly hashFor: (patch: NavigationPatch) => string;
  readonly requestComment: (target: string | ActionTarget) => void;
};

/** The immutable view emitted with `artifact-change` and returned by `snapshot()`. */
export const snapshotOf = <S>(source: ArtifactFacadeSource<S>): ArtifactSnapshot<S> => {
  const derivation = source.derivation();
  return {
    base: derivation.base,
    state: derivation.state,
    navigation: source.navigation(),
    actions: source.controller().actions,
    comments: derivation.comments,
    stale: derivation.stale,
    issues: source.issues(),
  };
};

/** The read-only view templates render from. */
export const renderContextOf = <S>(source: ArtifactFacadeSource<S>): TemplateRenderContext<S> => {
  const derivation = source.derivation();
  return {
    state: derivation.state,
    base: derivation.base,
    navigation: source.navigation(),
    actions: source.controller().actions,
    comments: derivation.comments,
    stale: derivation.stale,
    commentCount: (target) => {
      const ref = typeof target === 'string' ? target : targetRef(target);
      return derivation.commentsByTarget.get(ref)?.length ?? 0;
    },
    dispatch: (input) => source.dispatch(input),
    dispatchBatch: (inputs) => source.dispatchBatch(inputs),
    navigate: (patch, options) => source.navigate(patch, options),
    hashFor: (patch) => source.hashFor(patch),
    requestComment: (target) => source.requestComment(target),
  };
};

/**
 * The object behind `element.artifact`. Getters close over `source`, so the
 * facade always reads current state instead of a stale copy.
 */
export const createArtifactApi = <S>(source: ArtifactFacadeSource<S>, host: HTMLElement): ArtifactApi<S> => {
  const snapshot = (): ArtifactSnapshot<S> => snapshotOf(source);
  return {
    version: FRAMEWORK_VERSION,
    template: source.definition.name,
    host,
    ready: source.ready,
    get base() {
      return source.controller().base;
    },
    get state() {
      return source.derivation().state;
    },
    get navigation() {
      return source.navigation();
    },
    get actions() {
      return source.controller().actions;
    },
    get comments() {
      return source.derivation().comments;
    },
    get stale() {
      return source.derivation().stale;
    },
    get issues() {
      return source.issues();
    },
    dispatch: (input) => source.dispatch(input),
    dispatchBatch: (inputs) => source.dispatchBatch(inputs),
    comment: (target, body) => source.dispatch({ type: COMMENT_ACTION, target, payload: { body } }),
    removeAction: (id) => source.removeAction(id),
    clearActions: () => source.clearActions(),
    importDraft: (actions) => source.controller().replaceActions(actions),
    navigate: (patch, options) => source.navigate(patch, options),
    hashFor: (patch) => source.hashFor(patch),
    snapshot,
    exportDraft: () => source.controller().exportDraft(FRAMEWORK_VERSION),
    exportBrief: () => buildAgentBrief(snapshot(), source.controller().definition, FRAMEWORK_VERSION),
    subscribe: (listener) => source.subscribe(listener),
  };
};
