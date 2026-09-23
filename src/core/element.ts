import { LitElement, html, nothing, type CSSResultGroup, type PropertyDeclarations, type TemplateResult } from 'lit';
import { safeParse } from 'valibot';

import type { ArtifactApi, ArtifactSnapshot, ShellRegions, TemplateRenderContext } from './shell/contracts';
import type {
  ActionInput,
  BatchDispatchOutcome,
  ActionTarget,
  DispatchOutcome,
  Navigation,
  NavigationPatch,
  TemplateDefinition,
} from './types';

import { COMMENT_ACTION } from './action';
import { componentCommentSubmissionSchema } from './comment-targets';
import { ArtifactController } from './controller';
import { componentElementActionSchema } from './element-actions';
import { EMPTY_NAVIGATION, formatHash, parseHash, patchNavigation } from './navigation';
import { defaultStorage, MemoryDraftStorage, type DraftStorage } from './persistence';
import { createArtifactApi, renderContextOf, snapshotOf, type ArtifactFacadeSource } from './shell/api';
import { assignElementActions, findComponentProviders, readComponentSnapshot } from './shell/comment-targets';
import { readNavigationFromHash, writeNavigationToUrl } from './shell/navigation';
import { PreviewRouter } from './shell/preview-router';
import { chromeStyles } from './shell/styles';
import { targetRef } from './target';
import { FRAMEWORK_VERSION } from './version';

export abstract class ArtifactElement<S> extends LitElement {
  static override styles: CSSResultGroup = chromeStyles;

  /**
   * Annotated so subclasses may declare their own reactive state without having
   * to repeat the shell's attributes.
   */
  static override properties: PropertyDeclarations = {
    storageKey: { type: String, attribute: 'storage-key' },
    storage: { type: String },
    notes: { type: String },
    notesOpen: { state: true },
  };

  /** `storage-key="..."` overrides the default LocalStorage key. */
  declare storageKey: string | null;
  /** `storage="off"` disables persistence entirely. */
  declare storage: string | null;
  /**
   * Review rail visibility. It is closed by default and reached through the
   * floating comment button; `notes="on"` opens it on load.
   */
  declare notes: string | null;
  /** Internal UI state of the floating review toggle. */
  declare notesOpen: boolean;
  #notesInitialized = false;
  #previewRouter = new PreviewRouter(this);

  abstract readonly definition: TemplateDefinition<S>;

  #controller: ArtifactController<S> | undefined;
  #navigation: Navigation = EMPTY_NAVIGATION;
  #pendingCommentTarget: string | null = null;
  readonly #listeners = new Set<(snapshot: ArtifactSnapshot<S>) => void>();
  #baseError: string | null = null;
  #unsubscribe: (() => void) | undefined;
  #previewObserver: MutationObserver | undefined;
  #targetObserver: MutationObserver | undefined;
  #providers: readonly Element[] = [];
  #resolveReady: (() => void) | undefined;
  #readyPromise: Promise<void> = new Promise<void>((resolve) => {
    this.#resolveReady = resolve;
  });
  #api: ArtifactApi<S> | undefined;

  // ---------------------------------------------------------------- lifecycle

  override connectedCallback(): void {
    super.connectedCallback();
    this.dataset['template'] = this.definition.name;
    if (!this.#notesInitialized) {
      this.#notesInitialized = true;
      this.notesOpen = this.notes === 'on' || this.notes === 'open';
    }
    this.#start();
    window.addEventListener('hashchange', this.#onHashChange);
    this.addEventListener('click', this.#onClick);
    this.addEventListener('artifact-comment-targets-change', this.#refreshCommentTargets);
    this.addEventListener('artifact-comment-request', this.#onCommentRequest);
    this.addEventListener('artifact-comment-submit', this.#onCommentSubmit);
    this.addEventListener('artifact-element-action', this.#onElementAction);
    this.#targetObserver ??= new MutationObserver(this.#refreshCommentTargets);
    this.#refreshCommentTargets();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    // The controller is object-owned, not DOM-owned: facade subscriptions keep
    // working while detached. Only external DOM resources are released here.
    window.removeEventListener('hashchange', this.#onHashChange);
    this.removeEventListener('click', this.#onClick);
    this.#previewObserver?.disconnect();
    this.#targetObserver?.disconnect();
    this.removeEventListener('artifact-comment-targets-change', this.#refreshCommentTargets);
    this.removeEventListener('artifact-comment-request', this.#onCommentRequest);
    this.removeEventListener('artifact-comment-submit', this.#onCommentSubmit);
    this.removeEventListener('artifact-element-action', this.#onElementAction);
  }

  /**
   * Base data and preview markup are child nodes, and a parser may upgrade the
   * element before appending them. Wait one microtask in that case, then fall
   * back to `emptyBase()` so a genuinely empty element still renders.
   */
  #start(attempt = 0): void {
    if (this.#controller) {
      this.#subscribe();
      return;
    }
    if (this.childNodes.length === 0 && attempt < 2) {
      queueMicrotask(() => this.#start(attempt + 1));
      return;
    }
    this.#initialize();
  }

  #subscribe(): void {
    if (this.#unsubscribe) return;
    this.#unsubscribe = this.#controller?.subscribe(() => this.#onControllerChange());
  }

  protected override updated(): void {
    this.#routePreviews();
  }

  // ------------------------------------------------------------------ public

  get artifact(): ArtifactApi<S> {
    this.#api ??= this.#createApi();
    return this.#api;
  }

  get controller(): ArtifactController<S> {
    if (!this.#controller) throw new Error(`<${this.tagName.toLowerCase()}> is not initialized yet`);
    return this.#controller;
  }

  get derivation() {
    return this.controller.derivation;
  }

  get navigation(): Navigation {
    return this.#navigation;
  }

  dispatch(input: ActionInput): DispatchOutcome {
    const outcome = this.controller.dispatch(input);
    if (!outcome.ok) {
      this.requestUpdate();
      this.dispatchEvent(
        new CustomEvent('artifact-error', {
          detail: { issues: outcome.issues },
          bubbles: true,
          composed: true,
        }),
      );
      this.#notify();
    }
    return outcome;
  }

  dispatchBatch(inputs: readonly ActionInput[]): BatchDispatchOutcome {
    const outcome = this.controller.dispatchBatch(inputs);
    if (!outcome.ok) {
      this.requestUpdate();
      this.dispatchEvent(
        new CustomEvent('artifact-error', { detail: { issues: outcome.issues }, bubbles: true, composed: true }),
      );
      this.#notify();
    }
    return outcome;
  }

  removeAction(id: string): void {
    this.controller.removeAction(id);
  }

  clearActions(): void {
    this.controller.clearActions();
  }

  navigate(patch: NavigationPatch, options: { replace?: boolean } = {}): void {
    const before = formatHash(this.#effectiveNavigation());
    this.#navigation = patchNavigation(this.#navigation, patch);
    this.#canonicalizeNavigation(options.replace ?? false);
    const after = formatHash(this.#effectiveNavigation());
    this.requestUpdate();
    if (before === after) return;
    this.#notify();
    this.dispatchEvent(
      new CustomEvent('artifact-navigate', {
        detail: { navigation: this.#navigation },
        bubbles: true,
        composed: true,
      }),
    );
  }

  hashFor(patch: NavigationPatch): string {
    const effective = this.#effectiveNavigation();
    return formatHash(this.definition.resolveNavigation(this.derivation.state, patchNavigation(effective, patch)));
  }

  requestComment(target: string | ActionTarget): void {
    this.#pendingCommentTarget = typeof target === 'string' ? target : targetRef(target);
    this.notesOpen = true;
    this.requestUpdate();
  }

  /** Layout hook. The base provides the review rail, header and footer chrome. */
  protected abstract renderRegions(context: TemplateRenderContext<S>): ShellRegions;

  /** Templates may embed the one shared review panel in their own rail. */
  protected get integratedReview(): boolean {
    return false;
  }

  protected renderReviewPanel(context: TemplateRenderContext<S>): TemplateResult {
    return html`<artifact-comment-panel
      .definition=${this.controller.definition}
      .state=${context.state}
      .navigation=${context.navigation}
      .derivation=${this.derivation}
      .issues=${this.controller.lastIssues}
      .exportBrief=${() => this.artifact.exportBrief()}
      .pendingTarget=${this.#pendingCommentTarget}
      .embedded=${this.integratedReview}
      .onDelete=${(id: string) => this.removeAction(id)}
      .onClear=${() => this.clearActions()}
      .onComment=${(target: string, body: string) => {
        const outcome = this.dispatch({ type: COMMENT_ACTION, target, payload: { body } });
        if (outcome.ok) this.#pendingCommentTarget = null;
        return outcome;
      }}
    ></artifact-comment-panel>`;
  }

  protected renderChrome(context: TemplateRenderContext<S>, regions: ShellRegions): TemplateResult {
    const draftCount = context.actions.length;
    const commentCount = context.comments.length;
    return html`
      <div class="af-shell">
        <header class="af-header">
          <div class="af-title">
            <span class="af-template-mark">${this.definition.label}</span>
            <h1>${this.definition.title(context.state)}</h1>
          </div>
          <div class="af-header-slot">
            ${regions.header ?? nothing}
            <slot name="header"></slot>
          </div>
          <div class="af-header-meta">
            <span>dev-process-kit@${FRAMEWORK_VERSION}</span>
            <span>${this.definition.name}</span>
            <span>${draftCount} draft · ${commentCount} note</span>
          </div>
        </header>
        <div class="af-body">
          <aside class="af-sidebar" ?hidden=${regions.sidebarHidden || (!regions.sidebar && !this.hasSidebarContent())}>
            ${regions.sidebar ?? nothing}
            <slot name="sidebar"></slot>
          </aside>
          <main class="af-main">
            <div class="af-main-body">
              ${
                this.#baseError
                  ? html`<div class="af-banner" role="alert">
                      <strong>base data を読み込めませんでした（空の Artifact として表示中）</strong>
                      <code>${this.#baseError}</code>
                    </div>`
                  : nothing
              }
              ${regions.main ?? nothing}
              <slot name="main"></slot>
              <section class="af-orphans" ?hidden=${this.#previewRouter.orphans === 0}>
                <p class="af-label">previews without metadata</p>
                <slot name="preview"></slot>
              </section>
            </div>
            <div class="af-memo" ?hidden=${!this.hasMemoContent()}>
              <slot name="memo"></slot>
            </div>
          </main>
          ${
            this.integratedReview
              ? nothing
              : html`<aside class="af-notes" ?hidden=${!this.notesOpen}>${this.renderReviewPanel(context)}</aside>`
          }
        </div>
        ${
          regions.footer || this.hasFooterContent()
            ? html`<footer class="af-footer">
                ${regions.footer ?? nothing}
                <slot name="footer"></slot>
              </footer>`
            : nothing
        }
        ${
          this.integratedReview
            ? nothing
            : html`<button
                class="af-fab"
                type="button"
                aria-expanded=${this.notesOpen ? 'true' : 'false'}
                title="レビュー / コメント"
                @click=${() => {
                  this.notesOpen = !this.notesOpen;
                }}
              >
                <span class="af-fab-icon" aria-hidden="true"></span>
                <span
                  class="af-label"
                  style="position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)"
                >
                  レビュー
                </span>
                ${draftCount > 0 ? html`<span class="af-fab-badge">${draftCount}</span>` : nothing}
              </button>`
        }
      </div>
    `;
  }

  protected override render(): TemplateResult | typeof nothing {
    if (!this.#controller) return nothing;
    const context = this.#renderContext();
    return this.renderChrome(context, this.renderRegions(context));
  }

  /** Set to `false` when the template has no sidebar at all. */
  protected hasSidebarContent(): boolean {
    const slot = this.querySelector('[slot="sidebar"]');
    return slot !== null;
  }

  /** The floating memo only exists when the author slotted content into it. */
  protected hasMemoContent(): boolean {
    return this.querySelector('[slot="memo"]') !== null;
  }

  /** The footer row only exists when someone slotted content into it. */
  protected hasFooterContent(): boolean {
    return this.querySelector('[slot="footer"]') !== null;
  }

  protected context(): TemplateRenderContext<S> {
    return this.#renderContext();
  }

  // --------------------------------------------------------------- internals

  #facadeSource(): ArtifactFacadeSource<S> {
    return {
      definition: this.definition,
      controller: () => this.controller,
      derivation: () => this.derivation,
      ready: this.#readyPromise,
      navigation: () => this.#effectiveNavigation(),
      issues: () => this.controller.lastIssues,
      dispatch: (input) => this.dispatch(input),
      dispatchBatch: (inputs) => this.dispatchBatch(inputs),
      subscribe: (listener) => {
        this.#listeners.add(listener);
        return () => {
          this.#listeners.delete(listener);
        };
      },
      removeAction: (id) => this.removeAction(id),
      clearActions: () => this.clearActions(),
      navigate: (patch, options) => this.navigate(patch, options),
      hashFor: (patch) => this.hashFor(patch),
      requestComment: (target) => this.requestComment(target),
    };
  }

  #createApi(): ArtifactApi<S> {
    return createArtifactApi(this.#facadeSource(), this);
  }

  #snapshot(): ArtifactSnapshot<S> {
    return snapshotOf(this.#facadeSource());
  }

  #renderContext(): TemplateRenderContext<S> {
    return renderContextOf(this.#facadeSource());
  }

  #effectiveNavigation(): Navigation {
    return this.definition.resolveNavigation(this.derivation.state, this.#navigation);
  }

  #initialize(): void {
    const base = this.#readBase();
    this.#navigation = readNavigationFromHash();
    const storageKey = this.storageKey;
    this.#controller = new ArtifactController<S>({
      definition: this.definition,
      base,
      storage: this.#resolveStorage(),
      ...(typeof storageKey === 'string' ? { storageKey } : {}),
    });
    this.#subscribe();
    this.#refreshCommentTargets();
    this.#canonicalizeNavigation(true);
    this.#resolveReady?.();
    this.#observeBaseScript();
    this.requestUpdate();
  }

  #resolveStorage(): DraftStorage | null {
    if (this.storage === 'off') return null;
    if (this.storage === 'memory') return new MemoryDraftStorage();
    return defaultStorage();
  }

  #readBase(): S {
    const script = this.querySelector('script[type="application/json"]');
    if (!script?.textContent || script.textContent.trim().length === 0) {
      console.warn(
        `[dev-process-kit] <${this.tagName.toLowerCase()}> has no base JSON; starting from an empty artifact.`,
      );
      this.#baseError = 'no <script type="application/json"> child found';
      return this.definition.emptyBase();
    }
    try {
      return this.definition.parseBase(JSON.parse(script.textContent));
    } catch (error) {
      console.error('[dev-process-kit] invalid base data:', error);
      this.#baseError = error instanceof Error ? error.message : String(error);
      return this.definition.emptyBase();
    }
  }

  /**
   * Base data may be written after the element is upgraded (dynamically created
   * elements, streaming HTML). Re-read it once the JSON script shows up.
   */
  #observeBaseScript(): void {
    if (this.querySelector('script[type="application/json"]')) return;
    this.#previewObserver = new MutationObserver(() => {
      const script = this.querySelector('script[type="application/json"]');
      if (!script) return;
      this.#previewObserver?.disconnect();
      this.#previewObserver = undefined;
      try {
        this.controller.setBase(this.definition.parseBase(JSON.parse(script.textContent ?? 'null')));
      } catch (error) {
        console.error('[dev-process-kit] invalid base data:', error);
      }
    });
    this.#previewObserver.observe(this, { childList: true, subtree: true });
  }

  #notify(): void {
    const snapshot = this.#snapshot();
    for (const listener of this.#listeners) listener(snapshot);
  }

  #onControllerChange(): void {
    if (!this.isConnected) {
      this.requestUpdate();
      this.#notify();
      return;
    }
    this.#canonicalizeNavigation(true);
    // Components replay their actions synchronously, so a component that just
    // dispatched one sees it applied as soon as its event returns. Their
    // results are read back once the current change has settled.
    assignElementActions(this.#providers, this.controller.actions);
    queueMicrotask(this.#refreshCommentTargets);
    this.requestUpdate();
    this.#notify();
    this.dispatchEvent(
      new CustomEvent('artifact-change', {
        detail: this.#snapshot(),
        bubbles: true,
        composed: true,
      }),
    );
  }

  /** Keeps the hash canonical and pointing at something that still exists. */
  #canonicalizeNavigation(replace: boolean): void {
    const effective = this.#effectiveNavigation();
    this.#navigation = effective;
    writeNavigationToUrl(effective, replace);
  }

  #onHashChange = (): void => {
    this.#navigation = readNavigationFromHash();
    this.#canonicalizeNavigation(true);
    this.requestUpdate();
    this.#notify();
    this.dispatchEvent(
      new CustomEvent('artifact-navigate', {
        detail: { navigation: this.#navigation },
        bubbles: true,
        composed: true,
      }),
    );
  };

  #refreshCommentTargets = (): void => {
    this.#targetObserver?.disconnect();
    this.#providers = findComponentProviders(this, (root) => {
      if (this.isConnected) this.#targetObserver?.observe(root, { childList: true, subtree: true });
    });
    if (!this.#controller) return;
    assignElementActions(this.#providers, this.#controller.actions);
    this.#controller.setComponentSnapshot(readComponentSnapshot(this.#providers));
  };

  #onCommentRequest = (event: Event): void => {
    // Even a rejected request belongs to its nearest artifact, never an ancestor.
    event.stopPropagation();
    if (!(event instanceof CustomEvent) || !this.#controller) return;
    const detail: unknown = event.detail;
    if (typeof detail !== 'object' || detail === null || !('target' in detail) || typeof detail.target !== 'string')
      return;
    this.#refreshCommentTargets();
    const targets = this.controller.definition.commentTargets(this.derivation.state, this.navigation);
    if (!targets.some((target) => target.value === detail.target)) return;
    this.requestComment(detail.target);
  };

  #onCommentSubmit = (event: Event): void => {
    event.stopPropagation();
    if (!(event instanceof CustomEvent) || !event.cancelable || !this.#controller) return;
    const parsed = safeParse(componentCommentSubmissionSchema, event.detail);
    if (!parsed.success) return;
    this.#refreshCommentTargets();
    const { target, body } = parsed.output;
    const targets = this.controller.definition.commentTargets(this.derivation.state, this.navigation);
    if (!targets.some((option) => option.value === target)) return;
    const outcome = this.dispatch({ type: COMMENT_ACTION, target, payload: { body } });
    // Cancelling acknowledges that this host accepted the local submission.
    if (outcome.ok) event.preventDefault();
  };

  /** A component records a change request against one of its registered elements. */
  #onElementAction = (event: Event): void => {
    event.stopPropagation();
    if (!(event instanceof CustomEvent) || !event.cancelable || !this.#controller) return;
    const parsed = safeParse(componentElementActionSchema, event.detail);
    if (!parsed.success) return;
    this.#refreshCommentTargets();
    const { type, target, payload } = parsed.output;
    const targets = this.controller.definition.commentTargets(this.derivation.state, this.navigation);
    if (!targets.some((option) => option.value === target)) return;
    const outcome = this.dispatch({ type, target, payload });
    if (outcome.ok) event.preventDefault();
  };

  /** `data-artifact-navigate="step=next"` and `data-artifact-comment="step:x"` sugar. */
  #onClick = (event: Event): void => {
    for (const node of event.composedPath()) {
      if (!(node instanceof Element)) continue;
      if (node === this || node.hasAttribute('data-template')) break;
      const nav = node.getAttribute('data-artifact-navigate');
      if (nav !== null) {
        event.preventDefault();
        this.navigate(parseHash(nav.includes('=') ? nav : `step=${nav}`));
        return;
      }
      const comment = node.getAttribute('data-artifact-comment');
      if (comment !== null) {
        event.preventDefault();
        this.requestComment(comment);
        return;
      }
    }
  };

  /** Assigns light-DOM previews to the frame slots the template rendered. */
  #routePreviews(): void {
    this.#previewRouter.route();
  }
}
