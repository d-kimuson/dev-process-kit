import { LitElement, html, nothing, type CSSResultGroup, type PropertyDeclarations, type TemplateResult } from 'lit';
import { safeParse } from 'valibot';

import type { HandoffOutcome } from './claude-handoff';
import type { TemplateApi, TemplateSnapshot, ShellRegions, TemplateRenderContext } from './shell/contracts';
import type {
  ActionInput,
  BatchDispatchOutcome,
  ActionTarget,
  DispatchOutcome,
  Navigation,
  NavigationPatch,
  TemplateDefinition,
} from './types';

import { onSelectChange } from '../lib/dom/events';
import { COMMENT_ACTION, serializeDraft } from './action';
import { parseColorScheme } from './color-scheme';
import { componentCommentSubmissionSchema } from './comment-targets';
import { DraftController } from './controller';
import { componentElementActionSchema } from './element-actions';
import { presentDock } from './handoff-dock';
import { LOCALES, type Locale } from './i18n';
import { iconMoon, iconSun } from './icons';
import { coreMessages, LANGUAGE_NAMES } from './messages';
import { EMPTY_NAVIGATION, formatHash, parseHash, patchNavigation } from './navigation';
import { defaultStorage, MemoryDraftStorage, type DraftStorage } from './persistence';
import { createTemplateApi, renderContextOf, snapshotOf, type TemplateFacadeSource } from './shell/api';
import { ClaudeHandoffController } from './shell/claude-handoff-controller';
import { ColorSchemeController } from './shell/color-scheme-controller';
import { assignElementActions, findComponentProviders, readComponentSnapshot } from './shell/comment-targets';
import { HandoffDockController } from './shell/handoff-dock-controller';
import { LocaleChoiceController } from './shell/locale-choice-controller';
import { readNavigationFromHash, writeNavigationToUrl } from './shell/navigation';
import { PreviewRouter } from './shell/preview-router';
import { chromeStyles } from './shell/styles';
import { targetRef } from './target';
import { FRAMEWORK_VERSION } from './version';

export abstract class TemplateElement<S> extends LitElement {
  static override styles: CSSResultGroup = chromeStyles;

  /**
   * Annotated so subclasses may declare their own reactive state without having
   * to repeat the shell's attributes.
   */
  static override properties: PropertyDeclarations = {
    storageKey: { type: String, attribute: 'storage-key' },
    storage: { type: String },
    notes: { type: String },
    theme: { type: String },
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
  /**
   * `theme="light|dark"` fixes the default palette. Without it the page follows
   * `<html data-theme>`, then the OS preference; the header toggle overrides
   * either for this reader.
   */
  declare theme: string | null;
  /** Internal UI state of the floating review toggle. */
  declare notesOpen: boolean;
  #notesInitialized = false;
  #previewRouter = new PreviewRouter(this);
  #colorScheme = new ColorSchemeController(this, () => this.storage !== 'off' && this.storage !== 'memory');
  #claude = new ClaudeHandoffController(this);
  #dock = new HandoffDockController(this);

  /**
   * The template in one language. Called again whenever the locale changes:
   * on connect, and when the reader picks a language in the header.
   */
  protected abstract definitionFor(locale: Locale): TemplateDefinition<S>;

  #localeChoice = new LocaleChoiceController(
    this,
    () => this.storage !== 'off' && this.storage !== 'memory',
    () => this.#controller?.setTemplate(this.definition),
  );
  #definition: { readonly locale: Locale; readonly value: TemplateDefinition<S> } | undefined;

  #controller: DraftController<S> | undefined;
  #navigation: Navigation = EMPTY_NAVIGATION;
  #pendingCommentTarget: string | null = null;
  readonly #listeners = new Set<(snapshot: TemplateSnapshot<S>) => void>();
  #baseError: string | null = null;
  #unsubscribe: (() => void) | undefined;
  #previewObserver: MutationObserver | undefined;
  #targetObserver: MutationObserver | undefined;
  #providers: readonly Element[] = [];
  #resolveReady: (() => void) | undefined;
  #readyPromise: Promise<void> = new Promise<void>((resolve) => {
    this.#resolveReady = resolve;
  });
  #api: TemplateApi<S> | undefined;

  // ---------------------------------------------------------------- lifecycle

  /** The reader's pick from the header, else the closest `lang`. */
  get locale(): Locale {
    return this.#localeChoice.locale;
  }

  get definition(): TemplateDefinition<S> {
    const locale = this.locale;
    if (this.#definition?.locale !== locale) this.#definition = { locale, value: this.definitionFor(locale) };
    return this.#definition.value;
  }

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
    this.addEventListener('dpk-comment-targets-change', this.#refreshCommentTargets);
    this.addEventListener('dpk-comment-request', this.#onCommentRequest);
    this.addEventListener('dpk-comment-submit', this.#onCommentSubmit);
    this.addEventListener('dpk-element-action', this.#onElementAction);
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
    this.removeEventListener('dpk-comment-targets-change', this.#refreshCommentTargets);
    this.removeEventListener('dpk-comment-request', this.#onCommentRequest);
    this.removeEventListener('dpk-comment-submit', this.#onCommentSubmit);
    this.removeEventListener('dpk-element-action', this.#onElementAction);
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

  protected override willUpdate(): void {
    // Reflected on the host so `color-scheme` (and so every `light-dark()`
    // token) cascades into nested components and slotted light DOM.
    this.dataset['theme'] = this.#colorScheme.resolve(parseColorScheme(this.theme));
  }

  protected override updated(): void {
    this.#routePreviews();
    this.#reserveDockSpace();
  }

  // ------------------------------------------------------------------ public

  get api(): TemplateApi<S> {
    this.#api ??= this.#createApi();
    return this.#api;
  }

  get controller(): DraftController<S> {
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
        new CustomEvent('dpk-error', {
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
        new CustomEvent('dpk-error', { detail: { issues: outcome.issues }, bubbles: true, composed: true }),
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
      new CustomEvent('dpk-navigate', {
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

  /**
   * Inside a Claude Artifact that declared `comments` (and `db` for long
   * reviews), the review can go straight to the Claude session instead of
   * through the clipboard. `false` everywhere else.
   */
  protected get canSendToClaude(): boolean {
    return this.#claude.available;
  }

  /** Posts the brief as a comment sent to Claude, pinned to this element. */
  protected sendToClaude(): Promise<HandoffOutcome> {
    return this.#claude.send({
      brief: this.api.exportBrief(),
      draft: serializeDraft(this.derivation.actions),
      anchor: this,
    });
  }

  protected renderReviewPanel(context: TemplateRenderContext<S>): TemplateResult {
    return html`<dpk-component-comment-panel
      .definition=${this.controller.definition}
      .state=${context.state}
      .navigation=${context.navigation}
      .derivation=${this.derivation}
      .issues=${this.controller.lastIssues}
      .exportBrief=${() => this.api.exportBrief()}
      .sendToClaude=${this.canSendToClaude ? () => this.sendToClaude() : undefined}
      .pendingTarget=${this.#pendingCommentTarget}
      .embedded=${this.integratedReview}
      .onDelete=${(id: string) => this.removeAction(id)}
      .onClear=${() => this.clearActions()}
      .onComment=${(target: string, body: string) => {
        const outcome = this.dispatch({ type: COMMENT_ACTION, target, payload: { body } });
        if (outcome.ok) this.#pendingCommentTarget = null;
        return outcome;
      }}
    ></dpk-component-comment-panel>`;
  }

  protected renderChrome(context: TemplateRenderContext<S>, regions: ShellRegions): TemplateResult {
    const draftCount = context.actions.length;
    const commentCount = context.comments.length;
    const messages = coreMessages(this.locale);
    return html`
      <div class="dpk-shell">
        <header class="dpk-header">
          <span class="dpk-brand" aria-hidden="true"></span>
          <div class="dpk-title">
            <span class="dpk-template-mark">${this.definition.label}</span>
            <h1>${this.definition.title(context.state)}</h1>
          </div>
          <div class="dpk-header-slot">
            ${regions.header ?? nothing}
            <slot name="header"></slot>
          </div>
          <div class="dpk-header-meta">
            <span>dev-process-kit@${FRAMEWORK_VERSION}</span>
            <span>${this.definition.name}</span>
            <span class="dpk-meta-count" data-active=${draftCount > 0 ? 'true' : 'false'}>
              ${draftCount} draft · ${commentCount} note
            </span>
          </div>
          <div class="dpk-header-tools">${this.#renderLanguageSelect()} ${this.#renderThemeToggle()}</div>
        </header>
        <div class="dpk-body">
          <aside
            class="dpk-sidebar"
            ?hidden=${regions.sidebarHidden || (!regions.sidebar && !this.hasSidebarContent())}
          >
            ${regions.sidebar ?? nothing}
            <slot name="sidebar"></slot>
          </aside>
          <main class="dpk-main">
            <div class="dpk-main-body">
              ${
                this.#baseError
                  ? html`<div class="dpk-banner" role="alert">
                      <strong>${messages.baseDataError}</strong>
                      <code>${this.#baseError}</code>
                    </div>`
                  : nothing
              }
              ${regions.main ?? nothing}
              <slot name="main"></slot>
              <section class="dpk-orphans" ?hidden=${this.#previewRouter.orphans === 0}>
                <p class="dpk-label">previews without metadata</p>
                <slot name="preview"></slot>
              </section>
            </div>
            <div class="dpk-memo" ?hidden=${!this.hasMemoContent()}>
              <slot name="memo"></slot>
            </div>
          </main>
          ${
            this.integratedReview
              ? nothing
              : html`<aside class="dpk-notes" ?hidden=${!this.notesOpen}>${this.renderReviewPanel(context)}</aside>`
          }
        </div>
        ${
          regions.footer || this.hasFooterContent()
            ? html`<footer class="dpk-footer">
                ${regions.footer ?? nothing}
                <slot name="footer"></slot>
              </footer>`
            : nothing
        }
        ${
          this.integratedReview
            ? nothing
            : html`<button
                class="dpk-fab"
                type="button"
                aria-expanded=${this.notesOpen ? 'true' : 'false'}
                title=${messages.reviewToggle}
                @click=${() => {
                  this.notesOpen = !this.notesOpen;
                }}
              >
                <span class="dpk-fab-icon" aria-hidden="true"></span>
                <span
                  class="dpk-label"
                  style="position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)"
                >
                  ${messages.review}
                </span>
                ${draftCount > 0 ? html`<span class="dpk-fab-badge">${draftCount}</span>` : nothing}
              </button>`
        }
        ${this.integratedReview ? nothing : this.#renderHandoffDock(draftCount)}
      </div>
    `;
  }

  /** Send or copy the draft without opening the rail; the rail has the same buttons when it is open. */
  #renderHandoffDock(draftCount: number): TemplateResult | typeof nothing {
    const vm = presentDock(
      { actions: draftCount, railOpen: this.notesOpen, sendable: this.canSendToClaude, locale: this.locale },
      this.#dock.state,
    );
    if (!vm) return nothing;
    const messages = coreMessages(this.locale);
    return html`<div class="dpk-dock" role="group" aria-label=${messages.handoffLabel}>
      ${vm.note ? html`<p class="dpk-dock-note" role="alert">${vm.note}</p>` : nothing}
      <div class="dpk-dock-actions">
        ${
          vm.send
            ? html`<button
                class="dpk-btn dpk-btn--accent"
                type="button"
                ?disabled=${vm.send.disabled}
                @click=${() => void this.#dock.send(() => this.sendToClaude())}
              >
                ${vm.send.label}
              </button>`
            : nothing
        }
        <button
          class=${vm.send ? 'dpk-btn' : 'dpk-btn dpk-btn--accent'}
          type="button"
          data-status=${vm.copy.status}
          title=${messages.handoffCopyTitle}
          @click=${() => void this.#dock.copy(() => this.api.exportBrief())}
        >
          ${vm.copy.label}
        </button>
      </div>
    </div>`;
  }

  #renderLanguageSelect(): TemplateResult {
    const locale = this.locale;
    const label = coreMessages(locale).language;
    return html`<select
      class="dpk-lang-select"
      aria-label=${label}
      title=${label}
      @change=${onSelectChange((value) => {
        const picked = LOCALES.find((candidate) => candidate === value);
        if (picked !== undefined) this.#localeChoice.pick(picked);
      })}
    >
      ${LOCALES.map(
        (candidate) =>
          html`<option value=${candidate} lang=${candidate} ?selected=${candidate === locale}>
            ${LANGUAGE_NAMES[candidate]}
          </option>`,
      )}
    </select>`;
  }

  #renderThemeToggle(): TemplateResult {
    const dark = this.dataset['theme'] === 'dark';
    const messages = coreMessages(this.locale);
    const label = dark ? messages.useLightTheme : messages.useDarkTheme;
    return html`<button
      class="dpk-theme-toggle"
      type="button"
      aria-label=${label}
      title=${label}
      @click=${() => this.#colorScheme.toggle(parseColorScheme(this.theme))}
    >
      ${dark ? iconSun() : iconMoon()}
    </button>`;
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

  #facadeSource(): TemplateFacadeSource<S> {
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

  #createApi(): TemplateApi<S> {
    return createTemplateApi(this.#facadeSource(), this);
  }

  #snapshot(): TemplateSnapshot<S> {
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
    this.#controller = new DraftController<S>({
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
      console.warn(`[dev-process-kit] <${this.tagName.toLowerCase()}> has no base JSON; starting from an empty state.`);
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
      new CustomEvent('dpk-change', {
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
      new CustomEvent('dpk-navigate', {
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
    // Even a rejected request belongs to its nearest template, never an ancestor.
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

  /** `data-dpk-navigate="step=next"` and `data-dpk-comment="step:x"` sugar. */
  #onClick = (event: Event): void => {
    for (const node of event.composedPath()) {
      if (!(node instanceof Element)) continue;
      if (node === this || node.hasAttribute('data-template')) break;
      const nav = node.getAttribute('data-dpk-navigate');
      if (nav !== null) {
        event.preventDefault();
        this.navigate(parseHash(nav.includes('=') ? nav : `step=${nav}`));
        return;
      }
      const comment = node.getAttribute('data-dpk-comment');
      if (comment !== null) {
        event.preventDefault();
        this.requestComment(comment);
        return;
      }
    }
  };

  /** The floating memo keeps its right edge clear of the hand-off dock, whose width follows its labels. */
  #reserveDockSpace(): void {
    const shell = this.renderRoot.querySelector<HTMLElement>('.dpk-shell');
    const dock = this.renderRoot.querySelector<HTMLElement>('.dpk-dock-actions');
    if (!shell) return;
    if (dock) shell.style.setProperty('--dpk-dock-space', `${dock.offsetWidth + 8}px`);
    else shell.style.removeProperty('--dpk-dock-space');
  }

  /** Assigns light-DOM previews to the frame slots the template rendered. */
  #routePreviews(): void {
    this.#previewRouter.route();
  }
}
