import { LitElement, html, nothing, type CSSResultGroup, type PropertyDeclarations, type TemplateResult } from 'lit';
import { safeParse } from 'valibot';

import type { HandoffOutcome } from './claude-handoff';
import type {
  BoundSettingsSection,
  SettingsSection,
  ViewApi,
  ViewSnapshot,
  ShellRegions,
  ViewRenderContext,
} from './shell/contracts';
import type { MenuArea } from './shell/floating-menu';
import type {
  ActionInput,
  BatchDispatchOutcome,
  ActionTarget,
  DispatchOutcome,
  Navigation,
  NavigationPatch,
  ViewDefinition,
  ViewSettings,
  ValidationIssue,
} from './types';

import { revealWithin } from '../lib/dom/scroll';
import { COMMENT_ACTION, serializeDraft } from './action';
import { CHANGES_ATTRIBUTE, jumpOf, type ChangeEntry } from './changes';
import { hasCheckedTargets } from './check-mode';
import { parseColorScheme, type ColorScheme } from './color-scheme';
import { componentCommentSubmissionSchema } from './comment-targets';
import { ConfirmDialogController } from './confirm-dialog/controller';
import { ContextMenuController } from './context-menu/controller';
import { contextMenuMessages } from './context-menu/messages';
import { contextMenuStyles } from './context-menu/styles';
import { DraftController } from './controller';
import { DialogController } from './dialog/controller';
import { dialogStyles } from './dialog/styles';
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
import {
  iconChecklist,
  iconChevronRight,
  iconComment,
  iconHistory,
  iconMoon,
  iconQuestion,
  iconSun,
  brandMark,
} from './icons';
import { defineLayoutElements, type DpkInternalLayoutSidebar } from './layouts/index';
import {
  DEFAULT_SIDEBAR_LAYOUT,
  DEFAULT_SIDEBAR_PANE,
  type SidebarLayout,
  type SidebarSide,
} from './layouts/sidebar/model';
import { coreMessages, LANGUAGE_NAMES, type CoreMessages } from './messages';
import { EMPTY_NAVIGATION, formatHash, parseHash, patchNavigation } from './navigation';
import { pageHostOf, pageNameOf, inDraftPage, type PageHost } from './page/host';
import { pageNavigation, pagePatchFor } from './page/navigation';
import { resolvePageTarget } from './page/page-target';
import { defaultStorage, defaultStorageKey, MemoryDraftStorage, type DraftStorage } from './persistence';
import { PopoverController } from './popover-controller';
import { SelectController } from './select/controller';
import { createViewApi, renderContextOf, snapshotOf, type ViewFacadeSource } from './shell/api';
import { BaseDataController, type BaseRead } from './shell/base-data';
import { ChangeNoticeController } from './shell/change-notice-controller';
import {
  NOTICE_LIST_ID,
  renderNoticeBell,
  renderNoticeList,
  renderNoticeToasts,
  type NoticeIntents,
} from './shell/change-notices';
import { collectCheckBindings, CheckModeBadgeController, type CheckBadgeBinding } from './shell/check-mode-badges';
import { CheckModeController } from './shell/check-mode-controller';
import { ClaudeHandoffController } from './shell/claude-handoff-controller';
import { ColorSchemeController } from './shell/color-scheme-controller';
import { assignElementActions, findComponentProviders, readComponentSnapshot } from './shell/comment-targets';
import { FloatingMenuController } from './shell/floating-menu-controller';
import { floatingMenuStyles, renderFloatingMenu } from './shell/floating-menu-view';
import { collectBadges, GrillBadgeController, type BadgeBinding } from './shell/grill-badges';
import {
  openQuestionOf,
  presentGrillPanel,
  renderGrillPanel,
  type GrillPanelIntents,
  type GrillRoundSelection,
} from './shell/grill-panel';
import { HandoffDockController } from './shell/handoff-dock-controller';
import { HeaderHeightController } from './shell/header-height-controller';
import { LocaleChoiceController } from './shell/locale-choice-controller';
import { readNavigationFromHash, writeNavigationToUrl } from './shell/navigation';
import { PreviewRouter } from './shell/preview-router';
import { findTarget, highlightTarget, revealTarget } from './shell/reveal';
import { ReviewPopoverController } from './shell/review-popover-controller';
import {
  renderSettingsDialog,
  renderSettingsSwitches,
  renderSettingsTrigger,
  SETTINGS_APPEARANCE_SECTION,
  SETTINGS_DISPLAY_SECTION,
  SETTINGS_ID,
  settingsDialogStyles,
  type SettingsTriggerIntents,
} from './shell/settings-dialog';
import { chromeStyles } from './shell/styles';
import { SUPPLEMENT_HEIGHT } from './shell/supplement-height';
import { SupplementHeightController } from './shell/supplement-height-controller';
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
import { renderUndoRedo, UndoRedoKeyboardController, type UndoRedoIntents } from './shell/undo-redo';
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

/** A badge's text, or none for a count of zero. */
const countOf = (count: number): string | null => (count > 0 ? String(count) : null);

type ReviewSection = 'changes' | 'questions' | 'comments';

/**
 * The template's switches, and the change that flips one, as the settings
 * dialog's `display` section shows them (`ViewElement.settingsSwitches`).
 */
export type SettingsSwitches = {
  readonly settings: ViewSettings;
  readonly flip: (input: ActionInput) => void;
};

/**
 * The element that owns the page's chrome, as a board's `openSettings` reaches
 * it — structural, because the element found up the tree has its own state
 * type and only the settings entry point is used.
 */
type SettingsRoot = {
  readonly board: string | null;
  openSettings(sectionId?: string): void;
};

/** The part of the shell a badge layer lies over. */
type BadgeRegion = 'main' | 'sidebar';

export abstract class ViewElement<S> extends LitElement {
  static override styles: CSSResultGroup = [
    chromeStyles,
    contextMenuStyles,
    dialogStyles,
    settingsDialogStyles,
    floatingMenuStyles,
  ];

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
  /** Whether the settings dialog is open. Viewing state of the page, never a change of the draft. */
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
  /** Check Mode's own badges, collected the same way as the grill's (`renderChrome`/`#renderBoardChrome`). */
  #checkBindings: readonly CheckBadgeBinding[] = [];
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
  /** How tall the drawer is: one height for every supplement, dragged from its top edge. */
  #supplementHeight = new SupplementHeightController(this, {
    persistKey: () => (this.storage === 'off' || this.storage === 'memory' ? null : this.#persistedName),
  });
  #colorScheme = new ColorSchemeController(this, () => this.storage !== 'off' && this.storage !== 'memory');
  #claude = new ClaudeHandoffController(this);
  #dock = new HandoffDockController(this);
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
  /**
   * Check Mode: reader-only, never part of the draft (`./check-mode.ts`).
   * Reuses the change log already parsed by `#notices` to tell a checked
   * target apart from one changed since.
   */
  #checkMode = new CheckModeController(this, {
    persist: () => this.storage !== 'off' && this.storage !== 'memory',
    storageKey: () => this.storageKey ?? defaultStorageKey(this.definition.name),
    log: () => this.#notices.log,
  });
  /** Confirms before Check Mode's "off" clears every mark; see `./confirm-dialog/controller.ts`. */
  readonly #confirmDialog = new ConfirmDialogController(this);
  readonly #popovers = new PopoverController(this);
  /** The right-click menu: attaches its own `contextmenu` listener on this element, see `./context-menu/controller.ts`. */
  readonly #contextMenu = new ContextMenuController(this, {
    state: () => this.controller.derivation.state,
    messages: () => contextMenuMessages(this.locale),
  });
  /** The settings section the dialog shows; the kit's display section until the reader picks another. */
  #settingsSection: string = SETTINGS_DISPLAY_SECTION;
  /**
   * Keeps the settings `<dialog>` in step with `settingsOpen`: it is shown
   * modally (never a popover), so the engine supplies the focus trap, the top
   * layer and the inert background, and Escape and a press on the backdrop
   * close it.
   */
  readonly #settingsDialog = new DialogController(this, {
    dialog: () => this.renderRoot.querySelector<HTMLDialogElement>(`#${SETTINGS_ID}`),
    open: () => this.settingsOpen,
    dismiss: () => {
      this.settingsOpen = false;
    },
  });
  readonly #undoRedoIntents: UndoRedoIntents = {
    undo: () => this.controller.undo(),
    redo: () => this.controller.redo(),
  };
  /**
   * The reader's dock for the floating menu, kept per content. It is this
   * reader's view state: never part of the draft, and forgotten with the page
   * when the page keeps its state in memory or turns storage off.
   */
  readonly #floatingMenu = new FloatingMenuController(this, {
    surface: () => this.renderRoot.querySelector<HTMLElement>('.dpk-floating-menu'),
    area: () => this.#menuArea(),
    persistKey: () => (this.storage === 'off' || this.storage === 'memory' ? null : this.#persistedName),
  });
  constructor() {
    super();
    this.settingsOpen = false;
    // The review opens from the floating menu, and floats over the page beside it.
    new ReviewPopoverController(this, {
      surface: () => this.renderRoot.querySelector<HTMLElement>(`#${REVIEW_ID}`),
      anchor: () => this.renderRoot.querySelector('.dpk-floating-menu'),
      trigger: () => this.renderRoot.querySelector('.dpk-review-toggles'),
      open: () => this.notesOpen,
      close: () => {
        this.notesOpen = false;
      },
    });
    new GrillBadgeController(this, {
      active: () => this.#grill.questions.length > 0,
      bindings: () => this.#badges,
      open: (questionId) => this.#openQuestion(questionId),
      labelOf: (binding) => coreMessages(this.locale).grillOpen(`${binding.ref} · ${binding.title}`),
      gutterOf: (target) => this.contains(target) && this.#badgeRegionOf(target) === 'main',
    });
    new CheckModeBadgeController(this, {
      active: () => this.#checkMode.enabled,
      bindings: () => this.#checkBindings,
      onToggle: (ref) => this.#checkMode.toggle(ref),
      labelOf: (status) => {
        const messages = coreMessages(this.locale);
        return status === 'checked'
          ? messages.checkModeChecked
          : status === 'stale'
            ? messages.checkModeStale
            : messages.checkModeUnchecked;
      },
    });
    // A board renders no header of its own: its panels stay clear of the
    // screen's, inherited from the page root through the flattened tree.
    new HeaderHeightController(this, () =>
      this.#boardId === null ? this.renderRoot.querySelector<HTMLElement>('.dpk-header') : null,
    );
  }

  /**
   * The template in one language. Called again whenever the locale changes:
   * on connect, and when the reader picks a language in the header.
   */
  protected abstract definitionFor(locale: Locale): ViewDefinition<S>;

  readonly #langSelect = new SelectController(this);
  /** The language picker of the settings dialog; the header's is its own, so one open never closes the other. */
  readonly #settingsLangSelect = new SelectController(this);
  readonly #roundSelect = new SelectController(this);
  #localeChoice = new LocaleChoiceController(
    this,
    () => this.storage !== 'off' && this.storage !== 'memory',
    () => this.#boardId === null,
    () => {
      this.#controller?.setTemplate(this.definition);
      this.#controller?.setGrill({ grill: this.#grill, locale: this.locale });
    },
  );
  #definition: { readonly locale: Locale; readonly value: ViewDefinition<S> } | undefined;

  #controller: DraftController<S> | undefined;
  #navigation: Navigation = EMPTY_NAVIGATION;
  #pendingCommentTarget: string | null = null;
  readonly #listeners = new Set<(snapshot: ViewSnapshot<S>) => void>();
  /**
   * The base JSON: read on start, re-read when the element gains or is given a
   * different one, and the single source of the banner that reports it
   * ([`base-data.ts`](shell/base-data.ts)).
   */
  readonly #baseData = new BaseDataController<S>({
    host: this,
    name: () => `<${this.tagName.toLowerCase()}>`,
    script: () => this.scriptOf(BASE_SELECTOR),
    parse: (input) => this.definition.parseBase(input),
    empty: () => this.definition.emptyBase(),
    optional: () => inDraftPage(this),
    onChange: (read) => this.#onBaseRead(read),
  });
  #unsubscribe: (() => void) | undefined;
  #targetObserver: MutationObserver | undefined;
  #providers: readonly Element[] = [];
  #resolveReady: (() => void) | undefined;
  #readyPromise: Promise<void> = new Promise<void>((resolve) => {
    this.#resolveReady = resolve;
  });
  #api: ViewApi<S> | undefined;
  /**
   * The id this template has as a board of `<dpk-page>`, or `null` when it is
   * the page root itself. A board renders its regions and nothing of the
   * shell; its draft, hash and review belong to the page.
   */
  #boardId: string | null = null;
  /** The locale the board's controller was last given, so a pick on the page reaches it. */
  #boardLocale: Locale | undefined;
  /** Undo/redo shortcuts belong to the page as a whole, not to any one board; created once. */
  #undoRedoKeyboardReady = false;

  // ---------------------------------------------------------------- lifecycle

  /** The reader's pick from the header, else the closest `lang`. */
  get locale(): Locale {
    return this.#boardHost()?.locale() ?? this.#localeChoice.locale;
  }

  get definition(): ViewDefinition<S> {
    const locale = this.locale;
    if (this.#definition?.locale !== locale) this.#definition = { locale, value: this.definitionFor(locale) };
    return this.#definition.value;
  }

  /**
   * `definition`, extended with what this board's own components registered
   * and the questions it asks — the same extension the controller derives
   * with internally. A page delegates to a board's targets through this one,
   * not the raw `definition`, or a component-registered target (`element:…`)
   * would never match and read as `target-missing` forever. Falls back to
   * the raw definition before the controller exists (a board may render once
   * before its draft starts).
   */
  get liveDefinition(): ViewDefinition<S> {
    return this.#controller?.definition ?? this.definition;
  }

  override connectedCallback(): void {
    // The shell is drawn with the layouts; whichever entry loaded the template, they are there.
    defineLayoutElements();
    this.#boardId = pageNameOf(this);
    this.toggleAttribute('data-dpk-page-content', this.#boardId !== null);
    if (this.#boardId === null && !this.#undoRedoKeyboardReady) {
      this.#undoRedoKeyboardReady = true;
      new UndoRedoKeyboardController(this, this.#undoRedoIntents);
    }
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
    if (this.#boardId === null && this.hashMode !== 'off') window.addEventListener('hashchange', this.#onHashChange);
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
    this.#baseData.disconnect();
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
  }

  protected override updated(): void {
    this.#routePreviews();
    this.#reserveDockSpace();
    this.#placeNoticeList();
    this.#settleQuestions();
  }

  // ------------------------------------------------------------------ public

  get api(): ViewApi<S> {
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

  /**
   * Whether this template draws its own sidebar column right now. A page's
   * rail reads this on its active board to decide whether to show a fold
   * toggle for it.
   */
  get hasOwnSidebar(): boolean {
    return this.renderRoot.querySelector('.dpk-sidebar') !== null;
  }

  /** The side this template's own sidebar sits on, or `null` when it draws none. */
  get sidebarFoldSide(): SidebarSide | null {
    return this.hasOwnSidebar ? this.sidebarLayout.side : null;
  }

  /** Whether this template's own sidebar is folded away right now; `null` when it has none to fold. */
  get sidebarFolded(): boolean | null {
    const side = this.sidebarFoldSide;
    if (side === null) return null;
    return (
      this.renderRoot.querySelector<DpkInternalLayoutSidebar>('dpk-internal-layout-sidebar')?.foldedOn(side) ?? null
    );
  }

  /**
   * Folds or unfolds this template's own sidebar — the control a page's rail
   * uses on the board it shows, besides the fold button the sidebar already
   * draws on its own edge. A no-op when the template has no sidebar to fold.
   */
  toggleSidebarFold(): void {
    const side = this.sidebarFoldSide;
    if (side === null) return;
    this.renderRoot.querySelector<DpkInternalLayoutSidebar>('dpk-internal-layout-sidebar')?.toggleFold(side);
    this.requestUpdate();
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

  /**
   * The template's own settings sections, bound to this element's current read
   * of its own state — what a host that shows another element's settings reads
   * (`<dpk-app>` draws its active page content's sections, and only that
   * content knows its own state). Without its draft started, none: there is no
   * state to describe yet.
   */
  get settingsSections(): readonly BoundSettingsSection[] {
    if (!this.#controller) return [];
    const context = this.#renderContext();
    return this.#bindSettingsSections(this.renderSettingsSections(context));
  }

  /**
   * Opens the settings dialog, on `sectionId` (the kit's `display` section by
   * default): the entry point a template, a board or the shell's own chrome
   * uses instead of reaching for the gear. Opening is viewing state, never a
   * change of the draft.
   *
   * A board has no chrome of its own: it asks the element that owns the page
   * (the `<dpk-app>`, or the page root it renders in) to open its settings, so
   * one dialog shows what the reader is looking at.
   */
  openSettings(sectionId: string = SETTINGS_DISPLAY_SECTION): void {
    const root = this.#settingsRoot();
    if (root === null || root === this) {
      this.#settingsSection = sectionId;
      this.settingsOpen = true;
      this.requestUpdate();
      return;
    }
    root.openSettings(sectionId);
  }

  /** Layout hook. The base provides the page's chrome (the header row, the floating menu) and its body regions. */
  protected abstract renderRegions(context: ViewRenderContext<S>): ShellRegions;

  /**
   * The sections the settings dialog offers after the kit's own `display`
   * section, in reading order (`SettingsSection`). One is shown at a time, and
   * the nav that switches between them is drawn only when a second section
   * exists. `openSettings(id)` opens the dialog on one of them.
   */
  protected renderSettingsSections(_context: ViewRenderContext<S>): readonly SettingsSection<S>[] {
    return [];
  }

  /**
   * The template's switches (`ViewDefinition.settings`), and the change that
   * flips one, as the settings dialog's `display` section shows them. `null`
   * when the template has none. A host that shows another element's settings
   * (the app, showing its active page) overrides it.
   */
  protected settingsSwitches(context: ViewRenderContext<S>): SettingsSwitches | null {
    const settings = this.definition.settings?.(context.state);
    if (settings === undefined || settings.items.length === 0) return null;
    return { settings, flip: (input) => void this.dispatch(input) };
  }

  /**
   * The gear's intents, wherever the gear is drawn: it opens the dialog, and
   * closes it again while it is open. A host that draws its own gear (the app,
   * over the active page) reuses them, so both gears behave alike.
   */
  protected get settingsTriggerIntents(): SettingsTriggerIntents {
    return {
      open: this.settingsOpen,
      toggle: () => {
        if (this.settingsOpen) {
          this.settingsOpen = false;
          return;
        }
        this.openSettings();
      },
    };
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

  protected renderReviewPanel(context: ViewRenderContext<S>): TemplateResult {
    return html`<dpk-comment-panel
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
    ></dpk-comment-panel>`;
  }

  protected renderChrome(context: ViewRenderContext<S>, regions: ShellRegions): TemplateResult {
    if (this.#boardId !== null) return this.#renderBoardChrome(regions);
    const draftCount = context.actions.length;
    const { changeCount, commentCount } = this.reviewCounts(context);
    // Badges are derived from the DOM (the author's markup, and the shadow roots
    // a diagram renders into), so they are collected by the render that draws them.
    this.#badges = collectBadges(
      this,
      this.#grill,
      this.derivation.answers,
      this.notesOpen && this.reviewSection === 'questions' ? openQuestionOf(this.#grill, this.#grillOpen) : null,
      (mark, token) => this.grillRefsOf(mark, token),
    );
    this.#checkBindings = collectCheckBindings(this, this.#checkMode.state, this.#notices.log);
    // The header ellipsizes a long title; its `title` attribute has it whole.
    const title = this.definition.title(context.state);
    const messages = coreMessages(this.locale);
    return html`
      <dpk-internal-layout-app class="dpk-shell">
        <header slot="header" class="dpk-header">
          <span class="dpk-brand" aria-hidden="true">${brandMark()}</span>
          ${this.renderHeaderLead(context)}
          <div class="dpk-title">
            <h1 title=${title}>${title}</h1>
          </div>
          <div class="dpk-header-slot">
            ${regions.header ?? nothing}
            <slot name="header"></slot>
          </div>
          <div class="dpk-header-tools">${this.#renderLanguageSelect()} ${this.#renderThemeToggle()}</div>
          ${renderSettingsTrigger(messages, this.settingsTriggerIntents)}
        </header>
        ${this.#renderBody(regions)} ${this.#renderFooter(regions)}
        <div slot="overlay" class="dpk-overlay">
          ${this.#renderMenu(changeCount, commentCount)} ${this.#renderReviewPopover(context)}
          ${this.#renderHandoffDock(draftCount)} ${this.#renderNoticeList()} ${this.#renderNoticeToasts()}
          ${this.#confirmDialog.render()} ${this.#renderSettingsDialog(context)}
        </div>
      </dpk-internal-layout-app>
    `;
  }

  /**
   * What the header draws between the brand mark and the page's title. Only a
   * chrome owner with things to switch between has anything there: the app's
   * page switcher.
   */
  protected renderHeaderLead(_context: ViewRenderContext<S>): TemplateResult | typeof nothing {
    return nothing;
  }

  /**
   * A page content: the template's own header controls in a bar, then its
   * sidebar, main column and footer. The header (with the page's title and
   * settings), the floating menu and the review are the page's.
   */
  #renderBoardChrome(regions: ShellRegions): TemplateResult {
    this.#badges = [];
    this.#checkBindings = [];
    // The page's header names the page and holds its settings; a bar stays only for the template's own header.
    const bar =
      (regions.header !== undefined && regions.header !== nothing) ||
      this.querySelector(':scope > [slot="header"]') !== null;
    return html`
      <dpk-internal-layout-app class="dpk-shell" data-board>
        <div slot="header" class="dpk-board-bar" ?hidden=${!bar}>
          <div class="dpk-header-slot">
            ${regions.header ?? nothing}
            <slot name="header"></slot>
          </div>
        </div>
        ${this.#renderBody(regions)} ${this.#renderFooter(regions)}
      </dpk-internal-layout-app>
    `;
  }

  /**
   * The screen's one floating menu, and where the reader left it. It holds the
   * page's own controls, so it is drawn by the element that owns the chrome and
   * never by a page content inside it.
   */
  #renderMenu(changeCount: number, commentCount: number): TemplateResult {
    const messages = coreMessages(this.locale);
    return renderFloatingMenu(
      messages,
      this.#floatingMenu.placement,
      {
        undoRedo: renderUndoRedo(this.controller.canUndo, this.controller.canRedo, messages, this.#undoRedoIntents),
        review: this.#renderReviewToggles(changeCount, commentCount),
        checkMode: this.#renderCheckModeToggle(),
        notices: this.#renderNoticeBell(),
      },
      { grip: this.#floatingMenu.grip },
      this.#floatingMenu.dragging,
    );
  }

  /**
   * The room the floating menu may use: the screen, less the header's own row,
   * so a menu docked to the top edge never covers the header's controls.
   */
  #menuArea(): MenuArea {
    const width = window.innerWidth || document.documentElement.clientWidth;
    const height = window.innerHeight || document.documentElement.clientHeight;
    const header = this.renderRoot.querySelector<HTMLElement>('.dpk-header');
    const top = Math.min(header?.getBoundingClientRect().height ?? 0, height);
    return { left: 0, top, width, height: height - top };
  }

  #renderBody(regions: ShellRegions): TemplateResult {
    const messages = coreMessages(this.locale);
    const sidebarHidden = regions.sidebarHidden === true || (!regions.sidebar && !this.hasSidebarContent());
    const layout = this.sidebarLayout;
    const asideSide = layout.side === 'left' ? 'right' : 'left';
    const fill = this.mainLayout === 'fill';
    const persistKey = this.storage === 'off' || this.storage === 'memory' ? null : this.#persistedName;
    const panes = {
      [layout.side]: {
        width: layout.defaultWidth,
        resizable: layout.resizable !== false,
        collapsible: layout.collapsible !== false,
        narrow: layout.narrow ?? 'drawer',
        persistKey,
      },
      [asideSide]: { ...DEFAULT_SIDEBAR_PANE, persistKey: persistKey === null ? null : `${persistKey}:aside` },
    };
    return html`<dpk-internal-layout-sidebar
      class="dpk-body"
      .left=${panes['left']}
      .right=${panes['right']}
      main=${fill ? 'fill' : 'scroll'}
    >
      ${regions.rail === undefined || regions.rail === nothing ? nothing : html`<div slot="rail">${regions.rail}</div>`}
      ${
        sidebarHidden
          ? nothing
          : html`<div slot=${layout.side} class="dpk-sidebar">
              ${regions.sidebar ?? nothing}
              <slot name="sidebar"></slot>
            </div>`
      }
      ${
        this.hasAsideContent()
          ? html`<div slot=${asideSide} class="dpk-aside"><slot name="aside"></slot></div>`
          : nothing
      }
      <main class="dpk-main">
        <div class="dpk-main-body" ?data-fill=${fill}>
          ${
            this.#baseData.error
              ? html`<div class="dpk-banner" role="alert">
                  <strong>${messages.baseDataError}</strong>
                  <code>${this.#baseData.error}</code>
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
        </div>
        ${this.#renderSupplements(messages)}
      </main>
    </dpk-internal-layout-sidebar>`;
  }

  #renderFooter(regions: ShellRegions): TemplateResult | typeof nothing {
    return regions.footer || this.hasFooterContent()
      ? html`<footer slot="footer" class="dpk-footer">
          ${regions.footer ?? nothing}
          <slot name="footer"></slot>
        </footer>`
      : nothing;
  }

  /** One review button: pressed when its section is the one open, showing its count as a badge. */
  #renderReviewToggle(
    section: ReviewSection,
    label: string,
    icon: TemplateResult,
    badge: string | null,
  ): TemplateResult {
    const pressed = this.notesOpen && this.#reviewSection === section;
    return html`<button
      class="dpk-chrome-action dpk-review-toggle"
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
  }

  /**
   * Each part of the review has its own button, in the order the menu reads:
   * the review comments for the agent (what the reader most often came to
   * write), the changes made on the page, then the questions the page asks
   * (only while it asks any). Pressing the one shown closes the review;
   * another switches it over.
   */
  #renderReviewToggles(changeCount: number, commentCount: number): TemplateResult {
    const messages = coreMessages(this.locale);
    const counts = answerCounts(this.#grill, this.derivation.answers);
    return html`<div class="dpk-review-toggles" role="group" aria-label=${messages.review}>
      ${this.#renderReviewToggle('comments', messages.reviewComments, iconComment(), countOf(commentCount))}
      ${this.#renderReviewToggle('changes', messages.reviewChanges, iconHistory(), countOf(changeCount))}
      ${
        counts.total === 0
          ? nothing
          : this.#renderReviewToggle('questions', messages.grill, iconQuestion(), `${counts.answered}/${counts.total}`)
      }
    </div>`;
  }

  /**
   * The counts the review toggles show: changes, answers and comments all
   * share one draft, so the menu tells them apart here.
   */
  protected reviewCounts(context: ViewRenderContext<S>): { changeCount: number; commentCount: number } {
    const draftCount = context.actions.length;
    const commentCount = context.actions.filter((action) => action.type === COMMENT_ACTION).length;
    // An answer is shown with its question, unless it no longer fits one.
    const stale = new Set(this.derivation.stale.map((entry) => entry.action.id));
    const answerCount = context.actions.filter((action) => isAnswerAction(action) && !stale.has(action.id)).length;
    return { changeCount: draftCount - commentCount - answerCount, commentCount };
  }

  /**
   * Kept in the tree while closed, so a comment half written survives closing
   * it; the popover only shows and hides it, over the page.
   */
  #renderReviewPopover(context: ViewRenderContext<S>): TemplateResult {
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
      this.#roundSelect,
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
   * Where a mark's badge goes: in the sidebar's own column for a mark in it,
   * since the sidebar scrolls on its own, and in the main column otherwise.
   * Only the author's own markup in the main column takes the gutter — a
   * corner badge there would cover the line it marks.
   */
  #badgeRegionOf(target: Element): BadgeRegion {
    const sidebar = this.renderRoot.querySelector('.dpk-sidebar');
    let node: Element | null = target;
    while (node !== null && node !== this) {
      if (node === sidebar) return 'sidebar';
      const root = node.getRootNode();
      node = node.assignedSlot ?? node.parentElement ?? (root instanceof ShadowRoot ? root.host : null);
    }
    return 'main';
  }

  /**
   * The bell lives in the floating menu; its list hangs off the bell in the top
   * layer, so it is drawn beside the menu rather than inside it: the menu is a
   * blurred surface, which would make it the list's containing block.
   */
  #renderNoticeBell(): TemplateResult | typeof nothing {
    const vm = this.#notices.view;
    return vm ? renderNoticeBell(vm, coreMessages(this.locale), this.#noticeIntents) : nothing;
  }

  #renderNoticeList(): TemplateResult | typeof nothing {
    const vm = this.#notices.view;
    return vm ? renderNoticeList(vm, coreMessages(this.locale), this.#noticeIntents) : nothing;
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

  #renderLanguageSelect(select: SelectController = this.#langSelect): TemplateResult {
    const locale = this.locale;
    const label = coreMessages(locale).language;
    return select.render({
      options: LOCALES.map((candidate) => ({ value: candidate, label: LANGUAGE_NAMES[candidate] })),
      value: locale,
      onChange: (value) => {
        const picked = LOCALES.find((candidate) => candidate === value);
        if (picked !== undefined) this.#localeChoice.pick(picked);
      },
      ariaLabel: label,
      className: 'dpk-lang-select',
    });
  }

  /**
   * Turning Check Mode on takes effect at once. Turning it off would clear
   * every mark, so it asks first (`#confirmDialog`) — see `./check-mode.ts`.
   * With nothing checked there is nothing to lose, so it skips the dialog
   * and exits at once (`hasCheckedTargets`).
   */
  #renderCheckModeToggle(): TemplateResult {
    const on = this.#checkMode.enabled;
    const messages = coreMessages(this.locale);
    const label = on ? messages.checkModeOn : messages.checkModeOff;
    return html`<button
      class="dpk-chrome-action dpk-check-toggle"
      type="button"
      data-active=${on ? 'true' : 'false'}
      aria-pressed=${on ? 'true' : 'false'}
      aria-label=${label}
      data-tooltip=${label}
      @click=${() => void this.#toggleCheckMode()}
    >
      ${iconChecklist()}
    </button>`;
  }

  async #toggleCheckMode(): Promise<void> {
    if (!this.#checkMode.enabled) {
      this.#checkMode.setEnabled(true);
      return;
    }
    if (!hasCheckedTargets(this.#checkMode.state)) {
      this.#checkMode.setEnabled(false);
      return;
    }
    const messages = coreMessages(this.locale);
    const confirmed = await this.#confirmDialog.ask({
      title: messages.checkModeConfirmTitle,
      body: messages.checkModeConfirmBody,
      confirmLabel: messages.checkModeConfirmOk,
      cancelLabel: messages.checkModeConfirmCancel,
      tone: 'danger',
    });
    if (confirmed) this.#checkMode.setEnabled(false);
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
    return html`${this.renderChrome(context, this.renderRegions(context))}${this.#renderContextMenu()}`;
  }

  /**
   * The settings dialog, always in the tree and shown modally while
   * `settingsOpen` (the `<dialog>` and its top layer are the engine's). Its
   * `appearance` section is always there (the language and theme controls the
   * header also carries); the template's `display` section and own sections
   * follow, the display one only when the template has switches. A board draws
   * none: the page that owns it does.
   */
  #renderSettingsDialog(context: ViewRenderContext<S>): TemplateResult | typeof nothing {
    if (this.#boardId !== null) return nothing;
    const messages = coreMessages(this.locale);
    // Closed, the panel shows nothing and its sections cost nothing: a template
    // may build them from its whole state, so they are built only while opened.
    const open = this.settingsOpen;
    const switches = open ? this.settingsSwitches(context) : null;
    const display = switches === null ? nothing : renderSettingsSwitches(switches.settings, messages, switches.flip);
    const sections: readonly BoundSettingsSection[] = open
      ? [
          ...(switches === null
            ? []
            : [{ id: SETTINGS_DISPLAY_SECTION, label: messages.settingsDisplay, render: () => display }]),
          {
            id: SETTINGS_APPEARANCE_SECTION,
            label: messages.settingsAppearance,
            render: () => this.#renderSettingsAppearance(),
          },
          ...this.#bindSettingsSections(this.renderSettingsSections(context)),
        ]
      : [];
    return renderSettingsDialog({
      id: SETTINGS_ID,
      open,
      label: messages.settings,
      closeLabel: messages.settingsClose,
      sectionsLabel: messages.settingsSections,
      controller: this.#settingsDialog,
      sections,
      activeSection: this.#settingsSection,
      onPick: (id) => this.#pickSettingsSection(id),
      display,
    });
  }

  /**
   * The kit's `appearance` section: the reader's language and light/dark, the
   * same controls the header carries. They are repeated here on purpose: a page
   * whose content has no switches of its own would otherwise open an empty
   * dialog.
   */
  #renderSettingsAppearance(): TemplateResult {
    const messages = coreMessages(this.locale);
    const scheme = this.#colorScheme.resolve(parseColorScheme(this.theme));
    const choices = [
      { scheme: 'light', label: messages.themeLight },
      { scheme: 'dark', label: messages.themeDark },
    ] as const;
    const pick = (next: ColorScheme, focus: boolean): void => {
      this.#colorScheme.pick(parseColorScheme(this.theme), next);
      if (!focus) return;
      void this.updateComplete.then(() => {
        this.renderRoot.querySelector<HTMLElement>(`[data-theme-choice="${next}"]`)?.focus();
      });
    };
    return html`<div class="dpk-settings-list">
      <div class="dpk-settings-row">
        <span class="dpk-settings-row-label">${messages.language}</span>
        ${this.#renderLanguageSelect(this.#settingsLangSelect)}
      </div>
      <div class="dpk-settings-row">
        <span class="dpk-settings-row-label">${messages.settingsTheme}</span>
        <div
          class="dpk-settings-segment"
          role="radiogroup"
          aria-label=${messages.settingsTheme}
          @keydown=${(event: KeyboardEvent) => {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
            event.preventDefault();
            pick(scheme === 'light' ? 'dark' : 'light', true);
          }}
        >
          ${choices.map(
            (choice) => html`<button
              type="button"
              role="radio"
              aria-checked=${scheme === choice.scheme ? 'true' : 'false'}
              tabindex=${scheme === choice.scheme ? '0' : '-1'}
              data-theme-choice=${choice.scheme}
              @click=${() => pick(choice.scheme, false)}
            >
              ${choice.label}
            </button>`,
          )}
        </div>
      </div>
    </div>`;
  }

  /** The template's sections, each bound to the context the dialog renders them with. */
  #bindSettingsSections(sections: readonly SettingsSection<S>[]): readonly BoundSettingsSection[] {
    return sections.map((section) => ({
      id: section.id,
      label: section.label,
      render: () => section.render(this.#renderContext()),
    }));
  }

  /** Shows another section of the open dialog; the reader's choice of what to look at, not a change. */
  #pickSettingsSection(id: string): void {
    this.#settingsSection = id;
    this.requestUpdate();
  }

  /**
   * The element that owns the page's chrome — the one whose settings dialog a
   * board's `openSettings()` opens. Itself when it is the page root, the
   * closest enclosing view or app when it is a board, and `null` for a board
   * with no page around it.
   */
  #settingsRoot(): SettingsRoot | null {
    if (this.#boardId === null) return this;
    let node: Node | null = this.parentNode;
    while (node !== null) {
      if (node instanceof ViewElement && node.board === null) return node;
      node = node.parentNode;
    }
    return null;
  }

  /** The right-click menu's surface, rendered on top of the chrome; `nothing` while it is closed. */
  #renderContextMenu(): TemplateResult | typeof nothing {
    return this.#contextMenu.render();
  }

  /**
   * Where the sidebar sits and how wide it starts. The edge facing the main
   * column resizes it; the reader's width is kept per template.
   */
  protected get sidebarLayout(): SidebarLayout {
    return DEFAULT_SIDEBAR_LAYOUT;
  }

  /**
   * How the main column holds the template's content: `flow` (default) pads
   * it and scrolls; `fill` gives it the whole column edge to edge, without
   * scrolling, for a canvas that pans inside.
   */
  protected get mainLayout(): 'flow' | 'fill' {
    return 'flow';
  }

  /** Set to `false` when the template has no sidebar at all. */
  protected hasSidebarContent(): boolean {
    return this.querySelector(':scope > [slot="sidebar"]') !== null;
  }

  /**
   * Whether the author slotted an aside: a second sidebar, on the side the
   * template's own does not take, with the default width, resize and fold.
   */
  protected hasAsideContent(): boolean {
    return this.querySelector(':scope > [slot="aside"]') !== null;
  }

  /** The footer row only exists when someone slotted content into it. */
  protected hasFooterContent(): boolean {
    return this.querySelector(':scope > [slot="footer"]') !== null;
  }

  protected context(): ViewRenderContext<S> {
    return this.#renderContext();
  }

  // --------------------------------------------------------------- internals

  /** The page this board sits in, once the page is upgraded; `null` on a template of its own. */
  #boardHost(): PageHost | null {
    return this.#boardId === null ? null : pageHostOf(this);
  }

  /** The name the reader's per-template UI state is kept under; each board of a page keeps its own. */
  get #persistedName(): string {
    return this.#boardId === null ? this.definition.name : `${this.definition.name}@${this.#boardId}`;
  }

  /** Runs a draft operation on the page; refused while the page is still upgrading. */
  #onPage<O>(
    operation: (host: PageHost) => O,
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
    return board === null || host === null ? resolved : resolvePageTarget(resolved, board, host.pageNames());
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
    return pagePatchFor(host.navigation(), board, patch, host.pageNames(), this.definition.navigationHierarchy);
  }

  #facadeSource(): ViewFacadeSource<S> {
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

  #createApi(): ViewApi<S> {
    return createViewApi(this.#facadeSource(), this);
  }

  #snapshot(): ViewSnapshot<S> {
    return snapshotOf(this.#facadeSource());
  }

  #renderContext(): ViewRenderContext<S> {
    return renderContextOf(this.#facadeSource());
  }

  #effectiveNavigation(): Navigation {
    const host = this.#boardHost();
    const raw =
      this.#boardId === null ? this.#navigation : pageNavigation(host?.navigation() ?? EMPTY_NAVIGATION, this.#boardId);
    // A board may render once before its draft starts, as a template on its own does.
    if (!this.#controller) return raw;
    return this.definition.resolveNavigation(this.derivation.state, raw);
  }

  #initialize(): void {
    const base = this.#baseData.read();
    const board = this.#boardId !== null;
    // A board's questions, draft and hash are the page's.
    this.#grill = board ? EMPTY_GRILL : this.readGrill();
    this.#warnLegacyMemo();
    this.#navigation = board || this.hashMode === 'off' ? EMPTY_NAVIGATION : readNavigationFromHash();
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
    this.#resolveReady?.();
    this.#baseData.observe();
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

  /**
   * Whether this root (never a board) owns `location.hash`: `'auto'` reads
   * and writes it as every template always has; `'off'` leaves it alone, for
   * a page embedded where the hash belongs to something else. A board never
   * reaches here (its hash is already the page's).
   */
  protected get hashMode(): 'auto' | 'off' {
    return 'auto';
  }

  /** The brief handed to the agent; a page groups it by board. */
  protected buildBrief(snapshot: ViewSnapshot<S>): string {
    return buildAgentBrief(snapshot, this.controller.definition, FRAMEWORK_VERSION);
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
   * A base block was read after the element started: a script that arrived or
   * was filled in later, an invalid one that was fixed. The questions are
   * written alongside it, so they are read again too, and the state the
   * element shows is always the one the banner speaks about.
   */
  #onBaseRead(read: BaseRead<S>): void {
    if (this.#boardId === null) this.#grill = this.readGrill();
    this.controller.setGrill({ grill: this.#grill, locale: this.locale });
    this.controller.setBase(read.state);
    this.requestUpdate();
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
    // A board's changes are the page's, announced by the page.
    if (this.#boardId !== null) return;
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
    if (this.#boardId !== null) return;
    const effective = this.#effectiveNavigation();
    this.#navigation = effective;
    if (this.hashMode === 'off') return;
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
   * slotted a supplement, and follows the slot as the author adds more. The
   * drawer keeps one height for every tab, which the reader sets from its top
   * edge; taller content scrolls inside it.
   */
  #renderSupplements(messages: CoreMessages): TemplateResult {
    const supplements = supplementsOf(this, messages.memo);
    const open = openSupplementOf(this.#supplements, supplements);
    const height = this.#supplementHeight;
    const show = (view: SupplementView): void => {
      this.#supplements = view;
      this.requestUpdate();
    };
    const on = height.handlers;
    return html`<div
      class="dpk-supplements"
      ?hidden=${supplements.length === 0}
      ?data-open=${open !== null}
      style=${`--dpk-supplement-height: ${height.height}px`}
    >
      <div
        class="dpk-supplements-edge"
        ?hidden=${open === null}
        role="separator"
        tabindex="0"
        aria-orientation="horizontal"
        aria-controls="dpk-supplements-body"
        aria-label=${messages.resizeSupplements}
        aria-valuemin=${SUPPLEMENT_HEIGHT.min}
        aria-valuemax=${height.max}
        aria-valuenow=${height.height}
        title=${messages.resizeSupplementsHint}
        ?data-dragging=${height.dragging}
        @pointerdown=${on.pointerdown}
        @pointermove=${on.pointermove}
        @pointerup=${on.pointerup}
        @pointercancel=${on.pointercancel}
        @lostpointercapture=${on.lostpointercapture}
        @keydown=${on.keydown}
        @dblclick=${on.dblclick}
      ></div>
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
