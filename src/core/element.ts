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
  ValidationIssue,
} from './types';

import { DismissController } from '../lib/dom/dismiss';
import { onSelectChange } from '../lib/dom/events';
import { revealWithin } from '../lib/dom/scroll';
import { COMMENT_ACTION, serializeDraft } from './action';
import { CHANGES_ATTRIBUTE, jumpOf, type ChangeEntry } from './changes';
import { parseColorScheme } from './color-scheme';
import { componentCommentSubmissionSchema } from './comment-targets';
import { DraftController } from './controller';
import { componentElementActionSchema } from './element-actions';
import { buildAgentBrief } from './export';
import {
  answerCounts,
  answerGrill,
  EMPTY_GRILL,
  GRILL_ATTRIBUTE,
  GRILL_TARGET_TYPE,
  isAnswerAction,
  nextOpenQuestion,
  parseGrill,
  type AnswerPayload,
  type Grill,
} from './grill';
import { presentDock, type DockViewModel } from './handoff-dock';
import { LOCALES, type Locale } from './i18n';
import { iconChevronLeft, iconChevronRight, iconComment, iconHistory, iconMoon, iconQuestion, iconSun } from './icons';
import { coreMessages, LANGUAGE_NAMES, type CoreMessages } from './messages';
import { EMPTY_NAVIGATION, formatHash, parseHash, patchNavigation } from './navigation';
import { resolveBoardTarget } from './page/board-target';
import { boardHostOf, boardIdOf, DRAFT_BOARD_ATTRIBUTE, type BoardHost } from './page/host';
import { boardNavigation, pagePatchFor } from './page/navigation';
import { defaultStorage, defaultStorageKey, MemoryDraftStorage, type DraftStorage } from './persistence';
import { PopoverController } from './popover-controller';
import { createTemplateApi, renderContextOf, snapshotOf, type TemplateFacadeSource } from './shell/api';
import { ChangeNoticeController } from './shell/change-notice-controller';
import {
  NOTICE_LIST_ID,
  renderNoticeBell,
  renderNoticeList,
  renderNoticeToasts,
  type NoticeIntents,
} from './shell/change-notices';
import { ClaudeHandoffController } from './shell/claude-handoff-controller';
import { ColorSchemeController } from './shell/color-scheme-controller';
import { assignElementActions, findComponentProviders, readComponentSnapshot } from './shell/comment-targets';
import { collectBadges, GrillBadgeController, type BadgeBinding } from './shell/grill-badges';
import {
  openQuestionOf,
  presentGrillPanel,
  renderGrillPanel,
  type GrillPanelIntents,
  type GrillRoundSelection,
} from './shell/grill-panel';
import { HandoffDockController } from './shell/handoff-dock-controller';
import { LocaleChoiceController } from './shell/locale-choice-controller';
import { NarrowScreenController } from './shell/narrow-screen-controller';
import { readNavigationFromHash, writeNavigationToUrl } from './shell/navigation';
import { PreviewRouter } from './shell/preview-router';
import { findTarget, highlightTarget, revealTarget } from './shell/reveal';
import { ReviewPopoverController } from './shell/review-popover-controller';
import {
  renderSettingsMenu,
  renderSettingsTrigger,
  SETTINGS_ANCHOR,
  SETTINGS_ID,
  SETTINGS_SIZE,
  type SettingsIntents,
} from './shell/settings-menu';
import { SidebarCollapseController } from './shell/sidebar-collapse-controller';
import { SidebarResizeController } from './shell/sidebar-resize-controller';
import { chromeStyles } from './shell/styles';
import {
  FOLDED_SUPPLEMENTS,
  LEGACY_MEMO_SLOT,
  openSupplementOf,
  openSupplementRule,
  pressSupplement,
  SUPPLEMENT_SLOT,
  supplementsOf,
  toggleSupplements,
  type SupplementView,
} from './shell/supplements';
import { TextRecoveryController } from './shell/text-recovery-controller';
import { VersionChoiceController } from './shell/version-choice-controller';
import { DEFAULT_SIDEBAR_LAYOUT, SIDEBAR_WIDTH, sidebarToggle, type SidebarLayout } from './sidebar-width';
import { parseTargetRef, targetRef, toTarget } from './target';
import { FRAMEWORK_VERSION } from './version';

/** Base data is the JSON child that is neither the change log nor the questions. */
const BASE_SELECTOR = `script[type="application/json"]:not([${CHANGES_ATTRIBUTE}]):not([${GRILL_ATTRIBUTE}])`;
const GRILL_SELECTOR = `script[type="application/json"][${GRILL_ATTRIBUTE}]`;
/** Frames to wait for a target to render after navigating to it. */
const REVEAL_FRAMES = 30;
const NOTICE_LIST_SIZE = { width: 360, height: 480 };
const REVIEW_ID = 'dpk-review';

const isPopoverOpen = (element: Element): boolean => {
  try {
    return element.matches(':popover-open');
  } catch {
    return false;
  }
};

const nextFrame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()));

type ReviewSection = 'changes' | 'questions' | 'comments';

/** The part of the shell a badge layer lies over. */
type BadgeRegion = 'main' | 'sidebar';

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
    settingsOpen: { state: true },
    reviewSection: { state: true },
  };

  /** `storage-key="..."` overrides the default LocalStorage key. */
  declare storageKey: string | null;
  /** `storage="off"` disables persistence entirely. */
  declare storage: string | null;
  /**
   * Review rail visibility. It is closed by default and reached through the
   * changes, questions and review comments buttons; `notes="on"` (or
   * `"comments"`) opens it on the review comments on load, `notes="changes"`
   * on the changes and `notes="questions"` on the page's questions.
   */
  declare notes: string | null;
  /**
   * `theme="light|dark"` fixes the default palette. Without it the page follows
   * `<html data-theme>`, then the OS preference; the header toggle overrides
   * either for this reader.
   */
  declare theme: string | null;
  /** Internal UI state of the review toggles. */
  declare notesOpen: boolean;
  /** Whether the settings menu in the header is open. */
  declare settingsOpen: boolean;
  /**
   * The part of the review shown: what the reader changed, what the page asks
   * them, or what they asked the agent to fix.
   */
  declare reviewSection: ReviewSection;
  /** The questions the page asks (`script[data-dpk-grill]`), read apart from the base data. */
  #grill: Grill = EMPTY_GRILL;
  #grillError: string | null = null;
  /** The question unfolded in the questions panel, and the round it shows. */
  #grillOpen: string | null = null;
  #grillRound: GrillRoundSelection = 'current';
  /** The question whose own-words box takes focus after the next render. */
  #focusFreeText: string | null = null;
  /** The question last scrolled to, so the list only moves when the reader opens another. */
  #revealedQuestion: string | null = null;
  #badges: readonly BadgeBinding[] = [];
  #grillPanelIntents: GrillPanelIntents = {
    open: (questionId) => this.#openQuestion(questionId),
    answer: (questionId, payload) => this.#answer(questionId, payload),
    next: (questionId) => this.#advance(questionId),
    pickRound: (round) => {
      this.#grillRound = round;
      this.#revealedQuestion = null;
      this.requestUpdate();
    },
  };
  #notesInitialized = false;
  #previewRouter = new PreviewRouter(this);
  /** The supplement the reader picked in the bar, and whether it is open. */
  #supplements: SupplementView = FOLDED_SUPPLEMENTS;
  #colorScheme = new ColorSchemeController(this, () => this.storage !== 'off' && this.storage !== 'memory');
  #claude = new ClaudeHandoffController(this);
  #dock = new HandoffDockController(this);
  #sidebarWidth = new SidebarResizeController(this, {
    persist: () => this.storage !== 'off' && this.storage !== 'memory',
    template: () => this.#persistedName,
    layout: () => this.sidebarLayout,
  });
  #sidebarCollapse = new SidebarCollapseController(this, {
    persist: () => this.storage !== 'off' && this.storage !== 'memory',
    template: () => this.#persistedName,
  });
  #narrowScreen = new NarrowScreenController(this);
  #textRecovery = new TextRecoveryController(this, {
    persist: () => this.storage !== 'off' && this.storage !== 'memory',
    storageKey: () => `${this.storageKey ?? defaultStorageKey(this.#persistedName)}:unsent-text`,
  });
  /** The latest "Show" still waiting for its target; earlier ones give up. */
  #showing: object | null = null;
  #notices = new ChangeNoticeController(this, {
    persist: () => this.storage !== 'off' && this.storage !== 'memory',
    storageKey: () => this.storageKey ?? defaultStorageKey(this.definition.name),
    inside: (path) =>
      path.some(
        (node) => node instanceof Element && (node.id === NOTICE_LIST_ID || node.classList.contains('dpk-bell')),
      ),
    show: (entry) => void this.#showChange(entry),
  });
  readonly #noticeIntents: NoticeIntents = {
    toggleList: () => this.#notices.toggleList(),
    openList: () => this.#notices.send({ kind: 'open-list' }),
    show: (key) => this.#notices.show(key),
    dismiss: (key) => this.#notices.send({ kind: 'close-toast', key }),
    readAll: () => this.#notices.send({ kind: 'read-all' }),
    pause: (hold) => this.#notices.pause(hold),
    resume: (hold) => this.#notices.resume(hold),
  };
  readonly #popovers = new PopoverController(this);
  readonly #settingsIntents: SettingsIntents = {
    toggle: () => {
      this.settingsOpen = !this.settingsOpen;
    },
    flip: (input) => void this.dispatch(input),
  };
  constructor() {
    super();
    this.settingsOpen = false;
    // The review floats over the page below the header actions.
    new ReviewPopoverController(this, {
      surface: () => this.renderRoot.querySelector<HTMLElement>(`#${REVIEW_ID}`),
      anchor: () => this.renderRoot.querySelector('.dpk-header-actions'),
      open: () => this.notesOpen,
      close: () => {
        this.notesOpen = false;
      },
    });
    new GrillBadgeController(this, {
      active: () => this.#grill.questions.length > 0,
      layers: () => Array.from(this.renderRoot.querySelectorAll<HTMLElement>('.dpk-grill-badges')),
      bindings: () => this.#badges,
    });
    // The settings close on Escape and on a press outside them and their trigger.
    new DismissController(this, {
      open: () => this.settingsOpen,
      // The trigger is left out, so its own click toggles the menu shut.
      closesOn: (path) =>
        !path.some(
          (node) => node instanceof Element && (node.id === SETTINGS_ID || node.matches('.dpk-settings-trigger')),
        ),
      ownsEscape: () => true,
      dismiss: () => {
        this.settingsOpen = false;
      },
    });
  }

  /** The fold button is replaced as the sidebar folds; focus follows it to the new one. */
  #focusSidebarToggle = false;

  /**
   * The template in one language. Called again whenever the locale changes:
   * on connect, and when the reader picks a language in the header.
   */
  protected abstract definitionFor(locale: Locale): TemplateDefinition<S>;

  #versionChoice = new VersionChoiceController(this);
  #localeChoice = new LocaleChoiceController(
    this,
    () => this.storage !== 'off' && this.storage !== 'memory',
    () => {
      this.#controller?.setTemplate(this.definition);
      this.#controller?.setGrill({ grill: this.#grill, locale: this.locale });
    },
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
  /**
   * The id this template has as a board of `<dpk-page>`, or `null` when it is
   * the page root itself. A board renders its regions and nothing of the
   * shell; its draft, hash and review belong to the page.
   */
  #boardId: string | null = null;
  /** The locale the board's controller was last given, so a pick on the page reaches it. */
  #boardLocale: Locale | undefined;
  /** The board's navigation as it last told its listeners, so it announces only a real move. */
  #boardNavigation = '';

  // ---------------------------------------------------------------- lifecycle

  /** The reader's pick from the header, else the closest `lang`. */
  get locale(): Locale {
    return this.#boardHost()?.locale() ?? this.#localeChoice.locale;
  }

  get definition(): TemplateDefinition<S> {
    const locale = this.locale;
    if (this.#definition?.locale !== locale) this.#definition = { locale, value: this.definitionFor(locale) };
    return this.#definition.value;
  }

  override connectedCallback(): void {
    this.#boardId = boardIdOf(this);
    super.connectedCallback();
    this.dataset['template'] = this.definition.name;
    if (!this.#notesInitialized) {
      this.#notesInitialized = true;
      this.notesOpen =
        this.notes === 'on' ||
        this.notes === 'open' ||
        this.notes === 'comments' ||
        this.notes === 'changes' ||
        this.notes === 'questions';
      this.reviewSection = this.notes === 'changes' || this.notes === 'questions' ? this.notes : 'comments';
    }
    this.#start();
    if (this.#boardId === null) window.addEventListener('hashchange', this.#onHashChange);
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
    const pending = this.pendingStart();
    if (pending !== null) {
      void pending.then(() => this.#start(attempt));
      return;
    }
    this.#initialize();
  }

  #subscribe(): void {
    if (this.#unsubscribe) return;
    this.#unsubscribe = this.#controller?.subscribe(() => this.#onControllerChange());
  }

  protected override willUpdate(): void {
    const host = this.#boardHost();
    // Reflected on the host so `color-scheme` (and so every `light-dark()`
    // token) cascades into nested components and slotted light DOM.
    this.dataset['theme'] = host?.theme() ?? this.#colorScheme.resolve(parseColorScheme(this.theme));
    // A board follows the page's language, picked in the page's header.
    if (host !== null && this.#controller && this.#boardLocale !== host.locale()) {
      this.#boardLocale = host.locale();
      this.#controller.setTemplate(this.definition);
    }
    if (this.#boardId !== null && this.#controller) this.#announceBoardNavigation();
  }

  protected override updated(): void {
    this.#routePreviews();
    this.#reserveDockSpace();
    this.#placeNoticeList();
    this.#placeSettings();
    this.#settleQuestions();
    if (this.#focusSidebarToggle) {
      this.#focusSidebarToggle = false;
      this.renderRoot.querySelector<HTMLElement>('.dpk-sidebar-toggle')?.focus();
    }
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
    return this.#boardId === null ? this.#navigation : this.#effectiveNavigation();
  }

  /** The id this template has as a board of `<dpk-page>`, or `null` on its own. */
  get board(): string | null {
    return this.#boardId;
  }

  dispatch(input: ActionInput): DispatchOutcome {
    if (this.#boardId !== null) return this.#onPage((host) => host.dispatch(this.#toPage(input)));
    const outcome = this.controller.dispatch(input);
    if (outcome.ok) this.#textRecovery.settle([input.payload, input.note]);
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
    if (this.#boardId !== null)
      return this.#onPage((host) => host.dispatchBatch(inputs.map((input) => this.#toPage(input))));
    const outcome = this.controller.dispatchBatch(inputs);
    if (outcome.ok) this.#textRecovery.settle(inputs.flatMap((input) => [input.payload, input.note]));
    if (!outcome.ok) {
      this.requestUpdate();
      this.dispatchEvent(
        new CustomEvent('dpk-error', { detail: { issues: outcome.issues }, bubbles: true, composed: true }),
      );
      this.#notify();
    }
    return outcome;
  }

  /** Rewrites a posted comment's body; a rejected edit is reported like a rejected dispatch. */
  editComment(id: string, body: string): DispatchOutcome {
    if (this.#boardId !== null) return this.#onPage((host) => host.editComment(id, body));
    const outcome = this.controller.editComment(id, body);
    if (outcome.ok) this.#textRecovery.settle([body]);
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
    if (this.#boardId !== null) this.#boardHost()?.removeAction(id);
    else this.controller.removeAction(id);
  }

  /** On a board, clears the board's own part of the page's draft. */
  clearActions(): void {
    if (this.#boardId === null) {
      this.controller.clearActions();
      return;
    }
    const host = this.#boardHost();
    for (const action of this.controller.actions) host?.removeAction(action.id);
  }

  navigate(patch: NavigationPatch, options: { replace?: boolean } = {}): void {
    if (this.#boardId !== null) {
      this.#boardHost()?.navigate(this.#pagePatch(patch), options);
      return;
    }
    const before = formatHash(this.#effectiveNavigation());
    this.#navigation = patchNavigation(this.#navigation, patch, this.definition.navigationHierarchy);
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
    const host = this.#boardHost();
    if (host !== null) return host.hashFor(this.#pagePatch(patch));
    const effective = this.#effectiveNavigation();
    return formatHash(
      this.definition.resolveNavigation(
        this.derivation.state,
        patchNavigation(effective, patch, this.definition.navigationHierarchy),
      ),
    );
  }

  requestComment(target: string | ActionTarget): void {
    if (this.#boardId !== null) {
      this.#boardHost()?.requestComment(targetRef(this.#toPageTarget(target, 'page')));
      return;
    }
    this.#pendingCommentTarget = typeof target === 'string' ? target : targetRef(target);
    this.notesOpen = true;
    this.reviewSection = 'comments';
    this.requestUpdate();
  }

  /** Layout hook. The base provides the review rail, header and footer chrome. */
  protected abstract renderRegions(context: TemplateRenderContext<S>): ShellRegions;

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
      .section=${this.#reviewSection === 'questions' ? null : this.#reviewSection}
      .onDelete=${(id: string) => this.removeAction(id)}
      .onEditComment=${(id: string, body: string) => this.editComment(id, body)}
      .onClear=${() => this.clearActions()}
      .onComment=${(target: string, body: string) => {
        const outcome = this.dispatch({ type: COMMENT_ACTION, target, payload: { body } });
        if (outcome.ok) this.#pendingCommentTarget = null;
        return outcome;
      }}
    ></dpk-component-comment-panel>`;
  }

  protected renderChrome(context: TemplateRenderContext<S>, regions: ShellRegions): TemplateResult {
    if (this.#boardId !== null) return this.#renderBoardChrome(regions);
    const draftCount = context.actions.length;
    // The draft holds all three; the header names its changes, answers and comments apart.
    const commentCount = context.actions.filter((action) => action.type === COMMENT_ACTION).length;
    // An answer is shown with its question, unless it no longer fits one.
    const stale = new Set(this.derivation.stale.map((entry) => entry.action.id));
    const answerCount = context.actions.filter((action) => isAnswerAction(action) && !stale.has(action.id)).length;
    const changeCount = draftCount - commentCount - answerCount;
    // Badges are derived from the DOM (the author's markup, and the shadow roots
    // a diagram renders into), so they are collected by the render that draws them.
    this.#badges = collectBadges(
      this,
      this.#grill,
      this.derivation.answers,
      this.notesOpen && this.reviewSection === 'questions' ? openQuestionOf(this.#grill, this.#grillOpen) : null,
      (mark, token) => this.grillRefsOf(mark, token),
    );
    // The header ellipsizes a long title; the tooltip has it whole.
    const title = this.definition.title(context.state);
    return html`
      <div class="dpk-shell" ?data-resizing=${this.#sidebarWidth.dragging}>
        <header class="dpk-header">
          <span class="dpk-brand" aria-hidden="true"></span>
          <div class="dpk-title">
            <span class="dpk-template-mark">${this.templateIdentity().label}</span>
            <h1 title=${title}>${title}</h1>
          </div>
          <div class="dpk-header-slot">
            ${regions.header ?? nothing}
            <slot name="header"></slot>
          </div>
          <div class="dpk-header-meta">
            ${this.#versionChoice.render(this.locale)}
            <span class="dpk-meta-name">${this.templateIdentity().name}</span>
          </div>
          <div class="dpk-header-tools">
            ${this.#renderNoticeBell()} ${this.#renderLanguageSelect()} ${this.#renderThemeToggle()}
          </div>
        </header>
        ${this.#renderBody(regions)} ${this.#renderFooter(regions)}
        ${this.#renderHeaderActions(context, changeCount, commentCount)} ${this.#renderReviewPopover(context)}
        ${this.#renderHandoffDock(draftCount)} ${this.#renderNoticeToasts()}
      </div>
    `;
  }

  /**
   * A board of a page: the template's own header controls in a bar, then its
   * sidebar, main column and footer. The header (with the board's name and
   * settings), the review and the hand-off are the page's.
   */
  #renderBoardChrome(regions: ShellRegions): TemplateResult {
    this.#badges = [];
    // The page's header names the board and holds its settings; a bar stays only for the template's own header.
    const bar =
      (regions.header !== undefined && regions.header !== nothing) ||
      this.querySelector(':scope > [slot="header"]') !== null;
    return html`
      <div class="dpk-shell" data-board ?data-resizing=${this.#sidebarWidth.dragging}>
        <div class="dpk-board-bar" ?hidden=${!bar}>
          <div class="dpk-header-slot">
            ${regions.header ?? nothing}
            <slot name="header"></slot>
          </div>
        </div>
        ${this.#renderBody(regions)} ${this.#renderFooter(regions)}
      </div>
    `;
  }

  #renderBody(regions: ShellRegions): TemplateResult {
    const messages = coreMessages(this.locale);
    const sidebarHidden = regions.sidebarHidden === true || (!regions.sidebar && !this.hasSidebarContent());
    const side = this.sidebarLayout.side;
    const drawer = this.#sidebarDrawer;
    const collapsed =
      !sidebarHidden &&
      this.#sidebarCollapsible &&
      (drawer ? !this.#sidebarCollapse.drawerOpen : this.#sidebarCollapse.collapsed);
    const edge = sidebarHidden ? nothing : this.#renderSidebarEdge(collapsed, drawer);
    return html`<div class="dpk-body" data-sidebar-side=${side} ?data-sidebar-drawer=${drawer}>
      ${side === 'right' ? edge : nothing}
      <aside
        id="dpk-sidebar"
        class="dpk-sidebar"
        ?hidden=${sidebarHidden || collapsed}
        style=${`--dpk-sidebar-width: ${this.#sidebarWidth.width}px`}
      >
        <div class="dpk-sidebar-body">
          ${regions.sidebar ?? nothing}
          <slot name="sidebar"></slot>
          ${this.#renderBadges('sidebar')}
        </div>
      </aside>
      ${side === 'left' ? edge : nothing}
      ${
        drawer && !collapsed && !sidebarHidden
          ? html`<div class="dpk-sidebar-scrim" @click=${() => this.#sidebarCollapse.closeDrawer()}></div>`
          : nothing
      }
      <main class="dpk-main">
        <div
          class="dpk-main-body"
          ?data-grill-gutter=${this.#badges.some(
            (binding) => this.contains(binding.target) && this.#badgeRegionOf(binding) === 'main',
          )}
        >
          ${
            this.#baseError
              ? html`<div class="dpk-banner" role="alert">
                  <strong>${messages.baseDataError}</strong>
                  <code>${this.#baseError}</code>
                </div>`
              : nothing
          }
          ${
            this.#grillError === null
              ? nothing
              : html`<div class="dpk-banner" role="alert">
                  <strong>${messages.grillError}</strong>
                  <code>${this.#grillError}</code>
                </div>`
          }
          ${
            this.#notices.error === null
              ? nothing
              : html`<div class="dpk-banner" role="alert">
                  <strong>${messages.changesError}</strong>
                  <code>${this.#notices.error}</code>
                </div>`
          }
          ${regions.main ?? nothing}
          <slot name="main"></slot>
          <section class="dpk-orphans" ?hidden=${this.#previewRouter.orphans === 0}>
            <p class="dpk-label">previews without metadata</p>
            <slot name="preview"></slot>
          </section>
          ${this.#renderBadges('main')}
        </div>
        ${this.#renderSupplements(messages)}
      </main>
    </div>`;
  }

  #renderFooter(regions: ShellRegions): TemplateResult | typeof nothing {
    return regions.footer || this.hasFooterContent()
      ? html`<footer class="dpk-footer">
          ${regions.footer ?? nothing}
          <slot name="footer"></slot>
        </footer>`
      : nothing;
  }

  /**
   * The icon buttons fixed at the top right: the page's settings when the
   * template has any, then the review toggles. Their popovers hang below the
   * whole group, aligned to its right edge.
   */
  #renderHeaderActions(context: TemplateRenderContext<S>, changeCount: number, commentCount: number): TemplateResult {
    const settings = this.definition.settings?.(context.state);
    const hasSettings = settings !== undefined && settings.items.length > 0;
    const messages = coreMessages(this.locale);
    return html`<div class="dpk-header-actions">
      ${hasSettings ? renderSettingsTrigger(this.settingsOpen, messages, this.#settingsIntents) : nothing}
      ${hasSettings && this.settingsOpen ? renderSettingsMenu(settings, messages, this.#settingsIntents) : nothing}
      ${this.#renderReviewToggles(changeCount, commentCount)}
    </div>`;
  }

  /** The open settings hang below the header actions in the top layer. */
  #placeSettings(): void {
    const menu = this.renderRoot.querySelector<HTMLElement>(`#${SETTINGS_ID}`);
    // A page puts the active board's settings beside its name rather than among the header actions.
    const own = this.renderRoot.querySelector(`.${SETTINGS_ANCHOR}`);
    const anchor = own ?? this.renderRoot.querySelector('.dpk-header-actions');
    if (!menu || !anchor || isPopoverOpen(menu)) return;
    this.#popovers.open(
      menu,
      anchor,
      { width: SETTINGS_SIZE.width, height: Math.min(SETTINGS_SIZE.height, window.innerHeight - 96) },
      { placement: own === null ? 'bottom-end' : 'bottom-start' },
    );
  }

  /**
   * Each part of the review has its own button: the changes made on the page,
   * the questions the page asks (when it asks any), and the review comments
   * for the agent. Pressing the one shown closes the review; another switches
   * it over.
   */
  #renderReviewToggles(changeCount: number, commentCount: number): TemplateResult {
    const messages = coreMessages(this.locale);
    const toggle = (section: ReviewSection, label: string, icon: TemplateResult, badge: string | null) => {
      const pressed = this.notesOpen && this.#reviewSection === section;
      return html`<button
        class="dpk-header-action dpk-review-toggle"
        type="button"
        data-section=${section}
        aria-controls=${REVIEW_ID}
        aria-pressed=${pressed ? 'true' : 'false'}
        aria-label=${`${label} (${badge ?? 0})`}
        data-tooltip=${label}
        @click=${() => {
          this.notesOpen = !pressed;
          this.reviewSection = section;
        }}
      >
        ${icon} ${badge === null ? nothing : html`<span class="dpk-review-badge">${badge}</span>`}
      </button>`;
    };
    const countOf = (count: number): string | null => (count > 0 ? String(count) : null);
    const counts = answerCounts(this.#grill, this.derivation.answers);
    return html`<div class="dpk-review-toggles" role="group" aria-label=${messages.review}>
      ${toggle('changes', messages.reviewChanges, iconHistory(), countOf(changeCount))}
      ${
        counts.total === 0
          ? nothing
          : toggle('questions', messages.grill, iconQuestion(), `${counts.answered}/${counts.total}`)
      }
      ${toggle('comments', messages.reviewComments, iconComment(), countOf(commentCount))}
    </div>`;
  }

  /**
   * Kept in the tree while closed, so a comment half written survives closing
   * it; the popover only shows and hides it, over the page.
   */
  #renderReviewPopover(context: TemplateRenderContext<S>): TemplateResult {
    const messages = coreMessages(this.locale);
    const section = this.#reviewSection;
    const label =
      section === 'changes'
        ? messages.reviewChanges
        : section === 'questions'
          ? messages.grill
          : messages.reviewComments;
    return html`<div
      id=${REVIEW_ID}
      class="dpk-review"
      popover="manual"
      role="dialog"
      aria-label=${label}
      data-section=${section}
    >
      ${section === 'questions' ? this.#renderQuestions(context.actions.length) : nothing}
      ${this.renderReviewPanel(context)}
    </div>`;
  }

  /** Questions only show while the page asks some; otherwise their part falls back to the comments. */
  get #reviewSection(): ReviewSection {
    return this.reviewSection === 'questions' && this.#grill.questions.length === 0 ? 'comments' : this.reviewSection;
  }

  /** The questions the page asks, with the hand-off at their foot: the comment panel's own is out of sight. */
  #renderQuestions(draftCount: number): TemplateResult {
    const messages = coreMessages(this.locale);
    const vm = presentGrillPanel(messages, this.#grill, this.derivation.answers, {
      open: this.#grillOpen,
      round: this.#grillRound,
    });
    const dock = this.#presentDock(draftCount, false);
    return renderGrillPanel(
      messages,
      vm,
      this.#grillPanelIntents,
      dock ? html`<footer class="dpk-grill-footer">${this.#renderHandoffActions(dock)}</footer>` : nothing,
    );
  }

  /** Opens the questions on one of them, from its badge, a change notice or the list itself. */
  #openQuestion(questionId: string): void {
    this.notesOpen = true;
    this.reviewSection = 'questions';
    this.#grillRound = 'current';
    this.#grillOpen = questionId;
    this.#revealedQuestion = null;
    this.requestUpdate();
  }

  #answer(questionId: string, payload: AnswerPayload): void {
    const outcome = this.dispatch(answerGrill(questionId, payload));
    if (!outcome.ok) return;
    // A choice is a decision: record it and move on to the next open question.
    if (payload.kind === 'option') this.#advance(questionId);
    // Words are still being written; the caret stays until ⌘/Ctrl+Enter.
    else if (payload.kind === 'free' && payload.text === '') this.#focusFreeText = questionId;
  }

  /** Opens the next unanswered question, if there is one. */
  #advance(questionId: string): void {
    const next = nextOpenQuestion(this.#grill, this.derivation.answers, questionId);
    if (next === null) return;
    this.#grillOpen = next;
    this.requestUpdate();
  }

  /** Keeps the open question in view in the list, and focuses the own-words box just chosen. */
  #settleQuestions(): void {
    if (!this.notesOpen || this.#reviewSection !== 'questions') return;
    const focus = this.#focusFreeText;
    this.#focusFreeText = null;
    if (focus !== null) this.renderRoot.querySelector<HTMLTextAreaElement>(`[data-free-text="${focus}"]`)?.focus();
    const open = openQuestionOf(this.#grill, this.#grillOpen);
    if (this.#grillRound !== 'current' || open === null || open === this.#revealedQuestion) return;
    this.#revealedQuestion = open;
    const card = this.renderRoot.querySelector(`.dpk-grill [data-question="${open}"]`);
    const list = card?.closest('.dpk-grill-list');
    if (card && list) revealWithin(list, card);
  }

  /**
   * Where a mark's badge goes: over the sidebar for a mark in it, since the
   * sidebar scrolls on its own, and over the main column otherwise.
   */
  #badgeRegionOf(binding: BadgeBinding): BadgeRegion {
    const sidebar = this.renderRoot.querySelector('.dpk-sidebar');
    let node: Element | null = binding.target;
    while (node !== null && node !== this) {
      if (node === sidebar) return 'sidebar';
      const root = node.getRootNode();
      node = node.assignedSlot ?? node.parentElement ?? (root instanceof ShadowRoot ? root.host : null);
    }
    return 'main';
  }

  /** A badge per mark of the region, over it; pressing one opens its question. */
  #renderBadges(region: BadgeRegion): TemplateResult | typeof nothing {
    const bindings = this.#badges.filter((binding) => this.#badgeRegionOf(binding) === region);
    if (bindings.length === 0) return nothing;
    const messages = coreMessages(this.locale);
    return html`<div class="dpk-grill-badges" data-region=${region}>
      ${bindings.map(
        (binding) => html`<button
          type="button"
          class="dpk-grill-badge"
          data-badge=${binding.index}
          data-answered=${String(binding.answered)}
          data-visible="false"
          aria-pressed=${binding.open ? 'true' : 'false'}
          aria-label=${messages.grillOpen(`${binding.ref} · ${binding.title}`)}
          title=${`${binding.ref} · ${binding.title}`}
          @click=${() => this.#openQuestion(binding.questionId)}
        >
          ${binding.ref}
        </button>`,
      )}
    </div>`;
  }

  #renderNoticeBell(): TemplateResult | typeof nothing {
    const vm = this.#notices.view;
    if (!vm) return nothing;
    const messages = coreMessages(this.locale);
    return html`${renderNoticeBell(vm, messages, this.#noticeIntents)}
    ${renderNoticeList(vm, messages, this.#noticeIntents)}`;
  }

  #renderNoticeToasts(): TemplateResult | typeof nothing {
    const vm = this.#notices.view;
    return vm ? renderNoticeToasts(vm, coreMessages(this.locale), this.#noticeIntents) : nothing;
  }

  /** The open change list hangs off the bell in the top layer. */
  #placeNoticeList(): void {
    const list = this.renderRoot.querySelector<HTMLElement>(`#${NOTICE_LIST_ID}`);
    const bell = this.renderRoot.querySelector('.dpk-bell');
    if (!list || !bell || isPopoverOpen(list)) return;
    this.#popovers.open(list, bell, {
      width: NOTICE_LIST_SIZE.width,
      height: Math.min(NOTICE_LIST_SIZE.height, window.innerHeight - 96),
    });
  }

  /** Goes where the change is seen, then points at the element it is about. */
  async #showChange(entry: ChangeEntry): Promise<void> {
    // A later "Show" supersedes this one while it waits for the target to render.
    const request = {};
    this.#showing = request;
    const state = this.derivation.state;
    const target =
      entry.target === null
        ? null
        : (this.definition.canonicalTarget?.(state, parseTargetRef(entry.target)) ?? parseTargetRef(entry.target));
    const jump = jumpOf({ ...entry, target: target && targetRef(target) }, (candidate) =>
      this.definition.navigationFor ? this.definition.navigationFor(state, candidate) : null,
    );
    if (!jump) return;
    if (jump.navigate) this.navigate(jump.navigate);
    if (target === null) return;
    if (target.type === GRILL_TARGET_TYPE) this.#openQuestion(target.id);
    else this.showTarget(target);
    const ref = targetRef(target);
    // The target renders once the navigation and the components below settle.
    for (let frame = 0; frame < REVEAL_FRAMES; frame += 1) {
      await this.updateComplete;
      await nextFrame();
      if (this.#showing !== request) return;
      const element = findTarget(this, ref);
      if (element === null || element.getClientRects().length === 0) continue;
      revealTarget(this, element);
      highlightTarget(element);
      return;
    }
  }

  /**
   * Brings a target on screen where navigation cannot: a tab the template keeps
   * to itself, a folded section, a canvas viewport. Runs after the template's
   * `navigationFor` patch is applied, before the element is looked for.
   */
  protected showTarget(_target: ActionTarget): void {}

  /** Send or copy the draft without opening the rail; the rail has the same buttons when it is open. */
  #renderHandoffDock(draftCount: number): TemplateResult | typeof nothing {
    const vm = this.#presentDock(draftCount, this.notesOpen);
    if (!vm) return nothing;
    const messages = coreMessages(this.locale);
    return html`<div class="dpk-dock" role="group" aria-label=${messages.handoffLabel}>
      ${this.#renderHandoffActions(vm)}
    </div>`;
  }

  #presentDock(draftCount: number, railOpen: boolean): DockViewModel | null {
    return presentDock(
      { actions: draftCount, railOpen, sendable: this.canSendToClaude, locale: this.locale },
      this.#dock.state,
    );
  }

  /** The send and copy buttons, floating over the page or at the foot of the questions. */
  #renderHandoffActions(vm: DockViewModel): TemplateResult {
    const messages = coreMessages(this.locale);
    return html`${vm.note ? html`<p class="dpk-dock-note" role="alert">${vm.note}</p>` : nothing}
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

  get #sidebarCollapsible(): boolean {
    return this.sidebarLayout.collapsible !== false;
  }

  /** On a phone-width screen a collapsible sidebar is a drawer, unless the template stacks it itself. */
  get #sidebarDrawer(): boolean {
    return this.#narrowScreen.narrow && this.#sidebarCollapsible && this.sidebarLayout.narrow !== 'stack';
  }

  /**
   * What sits between the sidebar and the main column: the resizable edge and
   * the fold button on it, or, once folded, a narrow strip holding the button
   * that brings the sidebar back. The resizer stays next to the sidebar, on
   * whichever side that is.
   */
  #renderSidebarEdge(collapsed: boolean, drawer: boolean): TemplateResult {
    const toggle = this.#sidebarCollapsible ? this.#renderSidebarToggle(collapsed, drawer) : nothing;
    // A drawer slides over the main column from its strip, so the strip stays.
    if (collapsed || drawer) return html`<div class="dpk-sidebar-strip">${toggle}</div>`;
    return this.sidebarLayout.side === 'left'
      ? html`${this.#renderSidebarResizer()}${toggle}`
      : html`${toggle}${this.#renderSidebarResizer()}`;
  }

  #renderSidebarToggle(collapsed: boolean, drawer: boolean): TemplateResult {
    const messages = coreMessages(this.locale);
    const toggle = sidebarToggle(this.sidebarLayout.side, collapsed);
    const label = toggle.action === 'collapse' ? messages.collapseSidebar : messages.expandSidebar;
    return html`<button
      class="dpk-sidebar-toggle"
      type="button"
      aria-controls="dpk-sidebar"
      aria-expanded=${collapsed ? 'false' : 'true'}
      aria-label=${label}
      title=${label}
      @click=${() => {
        this.#focusSidebarToggle = true;
        if (drawer) this.#sidebarCollapse.toggleDrawer();
        else this.#sidebarCollapse.toggle();
      }}
    >
      ${toggle.points === 'left' ? iconChevronLeft() : iconChevronRight()}
    </button>`;
  }

  /** The sidebar's edge facing the main column: dragged, or focused and moved with the arrow keys. */
  #renderSidebarResizer(): TemplateResult {
    const messages = coreMessages(this.locale);
    const on = this.#sidebarWidth.handlers;
    return html`<div
      class="dpk-sidebar-resizer"
      role="separator"
      tabindex="0"
      aria-orientation="vertical"
      aria-label=${messages.resizeSidebar}
      aria-valuemin=${SIDEBAR_WIDTH.min}
      aria-valuemax=${SIDEBAR_WIDTH.max}
      aria-valuenow=${this.#sidebarWidth.width}
      title=${messages.resizeSidebarHint}
      @pointerdown=${on.pointerdown}
      @pointermove=${on.pointermove}
      @pointerup=${on.pointerup}
      @pointercancel=${on.pointercancel}
      @keydown=${on.keydown}
      @dblclick=${on.dblclick}
    ></div>`;
  }

  protected override render(): TemplateResult | typeof nothing {
    if (!this.#controller) return nothing;
    const context = this.#renderContext();
    return this.renderChrome(context, this.renderRegions(context));
  }

  /**
   * Where the sidebar sits and how wide it starts. The edge facing the main
   * column resizes it; the reader's width is kept per template.
   */
  protected get sidebarLayout(): SidebarLayout {
    return DEFAULT_SIDEBAR_LAYOUT;
  }

  /** Set to `false` when the template has no sidebar at all. */
  protected hasSidebarContent(): boolean {
    const slot = this.querySelector('[slot="sidebar"]');
    return slot !== null;
  }

  /** The footer row only exists when someone slotted content into it. */
  protected hasFooterContent(): boolean {
    return this.querySelector('[slot="footer"]') !== null;
  }

  protected context(): TemplateRenderContext<S> {
    return this.#renderContext();
  }

  // --------------------------------------------------------------- internals

  /** The page this board sits in, once the page is upgraded; `null` on a template of its own. */
  #boardHost(): BoardHost | null {
    return this.#boardId === null ? null : boardHostOf(this);
  }

  /** The name the reader's per-template UI state is kept under; each board of a page keeps its own. */
  get #persistedName(): string {
    return this.#boardId === null ? this.definition.name : `${this.definition.name}@${this.#boardId}`;
  }

  /** Runs a draft operation on the page; refused while the page is still upgrading. */
  #onPage<O>(
    operation: (host: BoardHost) => O,
  ): O | { readonly ok: false; readonly issues: readonly [ValidationIssue] } {
    const host = this.#boardHost();
    if (host === null) return { ok: false, issues: [{ path: 'board', message: 'the page is not ready yet' }] };
    const outcome = operation(host);
    this.requestUpdate();
    return outcome;
  }

  /** A target written in this board, in the page's terms: unqualified ones are this board's. */
  #toPageTarget(target: string | ActionTarget, fallbackType: string): ActionTarget {
    const host = this.#boardHost();
    const board = this.#boardId;
    const resolved = toTarget(target, fallbackType);
    return board === null || host === null ? resolved : resolveBoardTarget(resolved, board, host.boardIds());
  }

  #toPage(input: ActionInput): ActionInput {
    const fallbackType = this.controller.descriptorFor(input.type)?.targetType ?? 'page';
    return { ...input, target: this.#toPageTarget(input.target, fallbackType) };
  }

  /** A navigation patch of this board, in the page's prefixed keys. */
  #pagePatch(patch: NavigationPatch): NavigationPatch {
    const host = this.#boardHost();
    const board = this.#boardId;
    if (host === null || board === null) return patch;
    return pagePatchFor(host.navigation(), board, patch, host.boardIds(), this.definition.navigationHierarchy);
  }

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
      editComment: (id, body) => this.editComment(id, body),
      removeAction: (id) => this.removeAction(id),
      clearActions: () => this.clearActions(),
      navigate: (patch, options) => this.navigate(patch, options),
      hashFor: (patch) => this.hashFor(patch),
      requestComment: (target) => this.requestComment(target),
      brief: (snapshot) => this.buildBrief(snapshot),
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
    const host = this.#boardHost();
    const raw =
      this.#boardId === null
        ? this.#navigation
        : boardNavigation(host?.navigation() ?? EMPTY_NAVIGATION, this.#boardId);
    // A board may render once before its draft starts, as a template on its own does.
    if (!this.#controller) return raw;
    return this.definition.resolveNavigation(this.derivation.state, raw);
  }

  /**
   * A board's navigation is the page's, so it moves whenever the page's does:
   * through this board, another board's link or the hash. The page asks every
   * board to render again then, and the board announces its own part the way
   * a template alone does. The event does not bubble, so the page's listeners
   * keep hearing only the page's own, page-qualified one.
   */
  #announceBoardNavigation(): void {
    const navigation = this.#effectiveNavigation();
    const key = formatHash(navigation);
    if (key === this.#boardNavigation) return;
    this.#boardNavigation = key;
    this.#notify();
    this.dispatchEvent(new CustomEvent('dpk-navigate', { detail: { navigation } }));
  }

  #initialize(): void {
    const base = this.#readBase();
    const board = this.#boardId !== null;
    // A board's questions, draft and hash are the page's.
    this.#grill = board ? EMPTY_GRILL : this.readGrill();
    this.#warnLegacyMemo();
    this.#navigation = board ? EMPTY_NAVIGATION : readNavigationFromHash();
    this.#boardLocale = this.locale;
    const storageKey = this.storageKey;
    this.#controller = new DraftController<S>({
      definition: this.definition,
      base,
      storage: board ? null : this.#resolveStorage(),
      grill: { grill: this.#grill, locale: this.locale },
      ...(typeof storageKey === 'string' ? { storageKey } : {}),
    });
    this.#subscribe();
    this.#refreshCommentTargets();
    this.#canonicalizeNavigation(true);
    if (board) this.#boardNavigation = formatHash(this.#effectiveNavigation());
    this.#resolveReady?.();
    this.#observeBaseScript();
    this.requestUpdate();
  }

  #warnLegacyMemo(): void {
    if (this.querySelector(`:scope > [slot="${LEGACY_MEMO_SLOT}"]`) === null) return;
    console.warn(
      `[dev-process-kit] <${this.tagName.toLowerCase()}> no longer shows slot="${LEGACY_MEMO_SLOT}"; slot each piece as slot="${SUPPLEMENT_SLOT}" data-name="…" instead.`,
    );
  }

  #resolveStorage(): DraftStorage | null {
    if (this.storage === 'off') return null;
    if (this.storage === 'memory') return new MemoryDraftStorage();
    return defaultStorage();
  }

  /**
   * The JSON child a script of this element is read from. A page overrides it
   * to look at its own children only, past the scripts of its boards.
   */
  protected scriptOf(selector: string): Element | null {
    return this.querySelector(selector);
  }

  /** Waited for before the draft starts: a page waits for its boards. */
  protected pendingStart(): Promise<void> | null {
    return null;
  }

  /** What the header names as the template; a page names the board it shows. */
  protected templateIdentity(): { readonly label: string; readonly name: string } {
    return this.definition;
  }

  /** The brief handed to the agent; a page groups it by board. */
  protected buildBrief(snapshot: TemplateSnapshot<S>): string {
    return buildAgentBrief(snapshot, this.controller.definition, FRAMEWORK_VERSION);
  }

  #readBase(): S {
    const script = this.scriptOf(BASE_SELECTOR);
    // A board the draft added has no base JSON yet: the agent writes it from the draft.
    if (script === null && this.hasAttribute(DRAFT_BOARD_ATTRIBUTE)) return this.definition.emptyBase();
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
   * The questions are optional: without their script the page asks nothing.
   * A page overrides it to ask its boards' questions as well.
   */
  protected readGrill(): Grill {
    this.#grillError = null;
    return this.parseGrillScript(this.scriptOf(GRILL_SELECTOR));
  }

  /** Reads one questions script; a malformed one is reported (named by `source`) and asks nothing. */
  protected parseGrillScript(script: Element | null, source?: string): Grill {
    if (!script?.textContent || script.textContent.trim().length === 0) return EMPTY_GRILL;
    try {
      return parseGrill(JSON.parse(script.textContent));
    } catch (error) {
      console.error(`[dev-process-kit] invalid questions${source === undefined ? '' : ` in ${source}`}:`, error);
      const message = error instanceof Error ? error.message : String(error);
      this.#grillError = source === undefined ? message : `${source}: ${message}`;
      return EMPTY_GRILL;
    }
  }

  /** Reads the questions again, for a page whose boards changed after it started. */
  protected refreshGrill(): void {
    if (this.#boardId !== null || !this.#controller) return;
    this.#grill = this.readGrill();
    this.#controller.setGrill({ grill: this.#grill, locale: this.locale });
    this.requestUpdate();
  }

  /** The question refs a mark's token may name, in order; a page reads a mark inside a board as that board's. */
  protected grillRefsOf(_mark: Element, token: string): readonly string[] {
    return [token];
  }

  /**
   * Base data may be written after the element is upgraded (dynamically created
   * elements, streaming HTML). Re-read it once the JSON script shows up.
   */
  #observeBaseScript(): void {
    if (this.scriptOf(BASE_SELECTOR)) return;
    this.#previewObserver = new MutationObserver(() => {
      const script = this.scriptOf(BASE_SELECTOR);
      if (!script) return;
      this.#previewObserver?.disconnect();
      this.#previewObserver = undefined;
      // The questions are written alongside the base data.
      if (this.#boardId === null) this.#grill = this.readGrill();
      this.controller.setGrill({ grill: this.#grill, locale: this.locale });
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
    if (this.#boardId === null) this.#canonicalizeNavigation(true);
    // Components replay their actions synchronously, so a component that just
    // dispatched one sees it applied as soon as its event returns. Their
    // results are read back once the current change has settled.
    assignElementActions(this.#providers, this.controller.actions);
    queueMicrotask(this.#refreshCommentTargets);
    this.requestUpdate();
    this.#notify();
    // A board announces its own part on itself, as a template alone does; the
    // page announces the whole draft, so the board's event does not bubble.
    const board = this.#boardId !== null;
    this.dispatchEvent(
      new CustomEvent('dpk-change', {
        detail: this.#snapshot(),
        bubbles: !board,
        composed: !board,
      }),
    );
  }

  /** Keeps the hash canonical and pointing at something that still exists. */
  #canonicalizeNavigation(replace: boolean): void {
    if (this.#boardId !== null) return;
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

  /**
   * The supplements bar at the bottom of the main column: one tab per
   * supplement, opening it alone above the bar. It exists only when the author
   * slotted a supplement, and follows the slot as the author adds more.
   */
  #renderSupplements(messages: CoreMessages): TemplateResult {
    const supplements = supplementsOf(this, messages.memo);
    const open = openSupplementOf(this.#supplements, supplements);
    const show = (view: SupplementView): void => {
      this.#supplements = view;
      this.requestUpdate();
    };
    return html`<div class="dpk-supplements" ?hidden=${supplements.length === 0} ?data-open=${open !== null}>
      <div class="dpk-supplements-bar" role="group" aria-label=${messages.supplements}>
        <button
          type="button"
          class="dpk-supplements-toggle"
          aria-expanded=${String(open !== null)}
          aria-controls="dpk-supplements-body"
          aria-label=${open === null ? messages.openSupplements : messages.closeSupplements}
          @click=${() => show(toggleSupplements(this.#supplements, supplements))}
        >
          ${iconChevronRight()}
        </button>
        ${supplements.map(
          (supplement) =>
            html`<button
              type="button"
              class="dpk-supplement-tab"
              aria-expanded=${String(supplement === open)}
              aria-controls="dpk-supplements-body"
              @click=${() => show(pressSupplement(this.#supplements, supplement.element))}
            >
              ${supplement.name}
            </button>`,
        )}
      </div>
      <div class="dpk-supplements-body" id="dpk-supplements-body" ?hidden=${open === null}>
        <style .textContent=${open === null ? '' : openSupplementRule(this, open)}></style>
        <slot name=${SUPPLEMENT_SLOT} @slotchange=${() => this.requestUpdate()}></slot>
      </div>
    </div>`;
  }

  /** The supplements bar keeps its right edge clear of the hand-off dock, whose width follows its labels. */
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
