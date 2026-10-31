/**
 * `<dpk-app>`: the document that holds the app's pages.
 *
 * The app is a view element whose definition routes every action to a page
 * (`definition.ts`), so the shell — header, review, draft, storage, brief,
 * questions, change notices and hash — is the ordinary one, once per
 * document. Each child `<dpk-page name="<id>">` holds exactly one view or
 * board and hands everything to the app through `PAGE_HOST`. The app mirrors
 * each page's part of the draft back into it, so a page renders the same
 * state and comment counts it would on its own.
 *
 * The switcher lists the pages of the app's state, not of its markup: a page
 * the draft adds gets an element the app makes for it, and a page the draft
 * removes is hidden until the agent takes it out.
 */
import { css, html, nothing, type CSSResultGroup, type PropertyDeclarations, type TemplateResult } from 'lit';
import { LayoutTemplate } from 'lucide';

import type { ComponentSnapshot } from '../element-actions';
import type { Locale } from '../i18n';
import type {
  BoundSettingsSection,
  SettingsSection,
  ShellRegions,
  ViewApi,
  ViewRenderContext,
  ViewSnapshot,
} from '../shell/contracts';
import type { DraftAction, Navigation, ViewDefinition } from '../types';

import { announcedEntryUrl } from '../../lib/announce';
import { DismissController } from '../../lib/dom/dismiss';
import { contextMenuStyles } from '../context-menu/styles';
import { dialogStyles } from '../dialog/styles';
import { ViewElement, type SettingsSwitches } from '../element';
import { GRILL_ATTRIBUTE, GRILL_TARGET_TYPE, type Grill } from '../grill';
import { iconPlus, iconSwitch, lucide } from '../icons';
import { PAGE_STATE_EVENT, isPageContentState, type PageContentState } from '../page/element';
import { pageOfMark, pageGrill, refCandidates } from '../page/grill';
import { DRAFT_PAGE_ATTRIBUTE, PAGE_HOST, PAGE_NAME_ATTRIBUTE, appPageNameOf, type PageHost } from '../page/host';
import { PAGE_KEY, pageNavigation } from '../page/navigation';
import { APP_WIDE_TARGET, isAppWide, splitPage } from '../page/page-target';
import { PopoverController } from '../popover-controller';
import { parseViewAction } from '../schema';
import { floatingMenuStyles } from '../shell/floating-menu-view';
import { settingsDialogStyles } from '../shell/settings-dialog';
import { chromeStyles } from '../shell/styles';
import { appActions, belongsToPage } from './actions';
import { pagesSection, withPages } from './brief';
import {
  appDefinition,
  freshPageId,
  type AnyDefinition,
  type AppBase,
  type AppState,
  type PageEntry,
  type PageSpec,
} from './definition';
import { appMessages } from './messages';
import { renderSwitcherMenu, renderSwitcherTrigger, SWITCHER_ID, type SwitcherRow } from './switcher';
import { boardEntryUrl, siblingEntryUrl } from './template-loader';

/** A view or board a page can be added from, with the icon the switcher shows for its pages. */
export type PageContent = {
  /** Which tier it belongs to; picks the `dpk-view-` or `dpk-board-` tag. */
  readonly kind: 'view' | 'board';
  /** The content's name (`usm`, `er-diagram`); `dpk-view-<name>` / `dpk-board-<name>` must be defined. */
  readonly name: string;
  /** The label the add menu shows, read before the content's own element may even be loaded. */
  readonly label: string;
  readonly icon: () => TemplateResult;
  /**
   * Whether the "+" add menu offers an empty page of this content. Mirrors
   * the content's own `ViewDefinition.addable` — kept here too so the menu
   * can gate it before its entry is loaded. Defaults to `true`.
   */
  readonly addable?: boolean;
};

/**
 * A page as the app reaches it. Read structurally: each entry bundles its own
 * core, so a page may not share this module's classes.
 */
type PageElementLike = HTMLElement & {
  /** The view or board this page holds, once it is there. */
  readonly content: HTMLElement | null;
  readonly definition: AnyDefinition;
  /**
   * `definition`, extended with this page content's own component-registered
   * targets; the app's own `hasTarget` etc. delegate through this one when a
   * page has it. Only `ViewElement` content does — a board (a diagram or
   * `dpk-board-kanban` used as a page) is structurally a `PageElementLike`
   * (`definition` + `api`) without one, so this stays optional and `#specs()`
   * falls back to `definition` for it.
   */
  readonly liveDefinition?: AnyDefinition;
  readonly api: ViewApi<unknown>;
  readonly controller: { replaceActions(actions: readonly unknown[]): void };
  /** What the content's components registered; `null` before the content started. */
  readonly componentSnapshot?: ComponentSnapshot | null;
  /** What the page found where its content belongs; `null` until it is inspected. */
  readonly contentState: PageContentState | null;
  /** Resolves once the page knows what its content is (ready, empty or unavailable). */
  readonly ready: Promise<void>;
  /** The page's content asks to render again (the page itself is a slot). */
  refreshContent(): void;
  /** The app says this page's content now has its part of the draft and its navigation. */
  deliver(): void;
};

const isPageElement = (element: Element): element is PageElementLike =>
  element instanceof HTMLElement && 'definition' in element && 'api' in element && appPageNameOf(element) !== null;

/**
 * A page's content, as the app reads its settings: the page's own switches
 * (`ViewDefinition.settings`) and the sections it renders itself. Read
 * structurally, like `PageElementLike`, because each entry bundles its own
 * core — but only a view or board element (`ViewElement`) has them, which is
 * why a plain `HTMLElement` is narrowed with `in`.
 */
type SettingsContent = HTMLElement & {
  readonly settingsSections: readonly BoundSettingsSection[];
};

const isSettingsContent = (element: Element | null): element is SettingsContent =>
  element instanceof HTMLElement && 'settingsSections' in element;

const isDefinition = (value: unknown): value is AnyDefinition =>
  typeof value === 'object' && value !== null && 'name' in value && 'emptyBase' in value;

const PAGE_GRILL_SELECTOR = `:scope > script[type="application/json"][${GRILL_ATTRIBUTE}]`;

/**
 * A page's part of the app's draft, as the page itself knows its targets.
 * A page's questions are the app's (`grill:retry@<page>`), so what the draft
 * says about them stays with the app.
 */
const sliceOf = (actions: readonly DraftAction[], page: string): readonly DraftAction[] =>
  actions.flatMap((action) => {
    if (action.target.type === GRILL_TARGET_TYPE) return [];
    const scoped = splitPage(action.target);
    return scoped?.page === page ? [{ ...action, target: scoped.target }] : [];
  });

const isNavigation = (value: unknown): value is Navigation =>
  typeof value === 'object' && value !== null && Object.values(value).every((item) => typeof item === 'string');

const sameNavigation = (a: Navigation, b: Navigation): boolean => {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((key) => a[key] === b[key]);
};

const isPopoverOpen = (element: Element): boolean => {
  try {
    return element.matches(':popover-open');
  } catch {
    return false;
  }
};

const iconPage = lucide(LayoutTemplate);
const SWITCHER_SIZE = { width: 240, height: 420 } as const;
/** Long enough that the pointer can cross the gap from the trigger into the popover. */
const SWITCHER_CLOSE_DELAY_MS = 220;

const pageStyles = css`
  .dpk-main-body {
    animation: none;
  }

  /* The switcher trigger is a .dpk-chrome-action icon button in the header; its
     popover is sized here, the rest of its rows reuse .dpk-settings as-is. With
     two or more pages it widens to fit a quiet inline count next to the icon,
     instead of the corner badge other icon buttons use for something unread
     (there's nothing to read here, only to pick from). With one page, or none
     shown, it stays the plain icon square. */
  .dpk-page-switcher-trigger {
    width: auto;
    min-width: 32px;
    padding: 0 8px;
    gap: 4px;
  }

  .dpk-page-switcher-count {
    /* Inherits the trigger's own color (and its accent tint while the popover is
       open) rather than a fixed token, so it stays legible in both states; the
       lower opacity is what keeps it quiet next to the icon. */
    color: inherit;
    opacity: 0.68;
    font-family: var(--dpk-mono);
    font-size: 11px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }

  .dpk-page-switcher-menu {
    width: 240px;
  }

  .dpk-page-switcher-option .dpk-settings-check svg {
    width: 16px;
    height: 16px;
  }

  /* A page row of the switcher, with its optional remove button beside it. */
  .dpk-page-switcher-row {
    position: relative;
    display: flex;
    align-items: center;
  }

  .dpk-page-switcher-row .dpk-page-switcher-option {
    flex: 1 1 auto;
  }

  /* The page shown now: its name is renamed where it is listed, so the row is
     that name rather than a button that would only re-open the page it is on. */
  .dpk-page-switcher-option[data-current] {
    cursor: default;
    align-items: center;
  }

  .dpk-page-switcher-option[data-current] .dpk-settings-check {
    margin-top: 0;
  }

  .dpk-page-switcher-name dpk-inline-edit {
    display: block;
    min-width: 0;
  }

  .dpk-page-switcher-remove {
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    width: 22px;
    height: 22px;
    margin-right: 6px;
    padding: 0;
    border: none;
    border-radius: var(--dpk-radius-xs);
    background: transparent;
    color: var(--dpk-ink-faint);
    cursor: pointer;
  }

  .dpk-page-switcher-remove svg {
    width: 13px;
    height: 13px;
  }

  .dpk-page-switcher-remove:hover {
    background: var(--dpk-paper-raised);
    color: var(--dpk-danger, var(--dpk-ink));
  }

  .dpk-page-switcher-remove:focus-visible {
    outline: 2px solid var(--dpk-focus);
    outline-offset: -2px;
  }

  .dpk-app-pages {
    flex: 1 1 0%;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr);
    min-width: 0;
    min-height: 0;
  }

  ::slotted(*) {
    min-width: 0;
    min-height: 0;
  }

  /* Important: the app.s own CSS often gives a page display: block. */
  ::slotted([hidden]) {
    display: none !important;
  }
`;

export class AppElement extends ViewElement<AppState> {
  /**
   * The shell's chrome, plus the dialog frame and rows the settings panel draws.
   * The app owns the screen's header row, its floating menu and its settings
   * dialog, so their styles are part of this set too: `static styles` replaces —
   * not merges with — the `ViewElement` one.
   */
  static override styles: CSSResultGroup = [
    chromeStyles,
    contextMenuStyles,
    dialogStyles,
    settingsDialogStyles,
    floatingMenuStyles,
    pageStyles,
  ];

  static override properties: PropertyDeclarations = {
    pageNav: { type: String, attribute: 'page-nav' },
    hash: { type: String },
  };

  /**
   * `page-nav="none"` draws no page nav at all: no switcher, no "+" — the
   * app's own header (comment, history, …) still shows, for a document
   * embedded where pages are chosen some other way (a catalog's own
   * showcase). Absent (or any other value) switches pages from a control in
   * the header — the app's base form for every document of several pages.
   */
  declare pageNav: string | null;

  /**
   * `hash="off"` leaves `location.hash` alone: the app neither reads it on
   * start nor writes it on navigation or action, for a document embedded
   * where the hash already belongs to something else (a catalog's own
   * routing). Page switching still works, in memory, either way. Absent (or
   * any other value) keeps the hash as every document always had it.
   */
  declare hash: string | null;

  protected override get hashMode(): 'auto' | 'off' {
    return this.hash === 'off' ? 'off' : 'auto';
  }

  #pagesReady = false;
  /** Set once the app's own draft exists; pages find no host before that. */
  #started = false;
  /** The pages the app's base was last read from, so only a real change re-reads it. */
  #baseIds = '';
  /** The pages the questions were last read from. */
  #askingIds = '';
  /** The app draft each page was last given, so a render that changed nothing gives nothing. */
  #mirrored = new WeakMap<PageElementLike, readonly DraftAction[]>();
  /** Whether each page has read its base: a page is given its part of the draft only after that. */
  readonly #ready = new WeakMap<PageElementLike, boolean>();
  readonly #catalogs = new Map<Locale, readonly AnyDefinition[]>();
  /** One dynamic import per view name, so a second click before it settles does not import it twice. */
  readonly #pendingImports = new Map<string, Promise<unknown>>();
  #host: PageHost | undefined;
  /** The app's navigation as of the last `dpk-navigate` handed to its pages. */
  #lastPageNavigation: Navigation | null = null;
  /** Whether the switcher popover is open. */
  #switcherOpen = false;
  /** Within the open switcher, whether it shows addable content instead of the app's pages. */
  #switcherAdding = false;
  #switcherCloseTimer: ReturnType<typeof setTimeout> | undefined;
  readonly #popovers = new PopoverController(this);

  constructor() {
    super();
    new DismissController(this, {
      open: () => this.#switcherOpen,
      closesOn: (path) =>
        !path.some(
          (node) => node instanceof Element && (node.id === SWITCHER_ID || node.matches('.dpk-page-switcher-trigger')),
        ),
      ownsEscape: () => true,
      dismiss: () => this.#closeSwitcher(),
    });
  }

  /** The views and boards a page can be added from; an app without them offers no "+". */
  protected pageContents(): readonly PageContent[] {
    return [];
  }

  protected override definitionFor(locale: Locale): ViewDefinition<AppState> {
    return appDefinition({
      pages: () => this.#specs(),
      base: () => this.#base(),
      catalog: () => this.#catalog(),
      messages: appMessages(locale),
    });
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('dpk-comment-targets-change', this.#onPageTargetsChange);
    this.addEventListener('dpk-navigate', this.#onPageNavigate);
    this.addEventListener(PAGE_STATE_EVENT, this.#onPageState);
    this.#lastPageNavigation = this.navigation;
    void this.api.ready.then(() => {
      this.#started = true;
      this.#baseIds = this.#idsOf(this.#markupPages());
      this.requestUpdate();
    });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('dpk-comment-targets-change', this.#onPageTargetsChange);
    this.removeEventListener('dpk-navigate', this.#onPageNavigate);
    this.removeEventListener(PAGE_STATE_EVENT, this.#onPageState);
    this.#cancelSwitcherClose();
  }

  /**
   * A page settled into what its content is. A page that can render now has a
   * base the app has not read yet (its entry may have arrived after the app
   * started), so the app re-reads the document's base; one that cannot keeps
   * its own notice and takes no part in the draft until it does.
   */
  #onPageState = (event: Event): void => {
    if (!(event instanceof CustomEvent) || !isPageContentState(event.detail)) return;
    const page = event.target;
    if (!(page instanceof HTMLElement) || !isPageElement(page) || page.parentElement !== this) return;
    this.#ready.set(page, event.detail.status === 'ready');
    if (!this.#started || !this.#pagesReady) return;
    // A page the draft made carries no base of its own; its readiness only
    // decides when the draft's part reaches it.
    if (page.hasAttribute(DRAFT_PAGE_ATTRIBUTE)) this.requestUpdate();
    else this.#refreshBase();
  };

  /**
   * A page keeps the `dpk-navigate` contract its content has on its own: the
   * app fires it on every page whose page-relative navigation changed, with
   * that navigation as the detail (a page's slot content listens on the page,
   * and moving it into an app must not stop it from re-rendering). A page's
   * own event bubbles back up here; only the app's own event is fanned out,
   * so this cannot loop.
   */
  #onPageNavigate = (event: Event): void => {
    if (event.target !== this || !(event instanceof CustomEvent)) return;
    const detail: unknown = event.detail;
    if (typeof detail !== 'object' || detail === null || !('navigation' in detail)) return;
    const navigation = detail.navigation;
    if (!isNavigation(navigation)) return;
    const previous = this.#lastPageNavigation;
    this.#lastPageNavigation = navigation;
    if (previous === null) return;
    for (const page of this.#pages()) {
      const id = this.#nameOf(page);
      const before = pageNavigation(previous, id);
      const after = pageNavigation(navigation, id);
      if (sameNavigation(before, after)) continue;
      (page.content ?? page).dispatchEvent(
        new CustomEvent('dpk-navigate', {
          detail: { navigation: after },
          bubbles: true,
          composed: true,
        }),
      );
    }
  };

  /**
   * A page content's own component registered or dropped a target
   * (`dpk-commentable`, a board, …). The app's own provider scan stops at a
   * page's boundary — `findComponentProviders` treats a nested view as
   * owning its own history — so this bubbled event is the only signal the app
   * gets that a page's `liveDefinition` changed. Re-derives unconditionally
   * (`setTemplate`, not `setComponentSnapshot`) because the app's own
   * component snapshot is unchanged; only what a page's `hasTarget` answers
   * through it is.
   */
  #onPageTargetsChange = (): void => {
    if (!this.#started) return;
    this.controller.setTemplate(this.definition);
  };

  get [PAGE_HOST](): PageHost | undefined {
    if (!this.#started) return undefined;
    this.#host ??= {
      locale: () => this.locale,
      theme: () => this.dataset['theme'],
      navigation: () => this.navigation,
      pageNames: () => new Set(this.#pages().map((page) => this.#nameOf(page))),
      dispatch: (input) => this.dispatch(input),
      dispatchBatch: (inputs) => this.dispatchBatch(inputs),
      editComment: (id, body) => this.editComment(id, body),
      removeAction: (id) => this.removeAction(id),
      clearActions: () => this.clearActions(),
      navigate: (patch, options) => this.navigate(patch, options),
      hashFor: (patch) => this.hashFor(patch),
      requestComment: (target) => this.requestComment(target),
    };
    return this.#host;
  }

  /**
   * A page reads its content's component results too: the content replays the
   * element actions itself, but the app derives with the same results so an
   * action inside a page is not listed as `target-missing` in the app's review.
   */
  protected override adoptedComponentProviders(): ComponentSnapshot['providers'] {
    return this.#pages().flatMap((page) => page.componentSnapshot?.providers ?? []);
  }

  #pages(): readonly PageElementLike[] {
    return Array.from(this.children).filter(isPageElement);
  }

  /** The pages written in the app's markup, apart from the ones the app made for the draft. */
  #markupPages(): readonly PageElementLike[] {
    return this.#pages().filter((page) => !page.hasAttribute(DRAFT_PAGE_ATTRIBUTE));
  }

  #nameOf(page: PageElementLike): string {
    return page.getAttribute(PAGE_NAME_ATTRIBUTE) ?? '';
  }

  #labelOf(page: PageElementLike): string {
    return page.getAttribute('label') ?? page.definition.label;
  }

  #base(): AppBase {
    const pages = this.#markupPages();
    return {
      layout: pages.map((page) => ({
        id: this.#nameOf(page),
        kind: page.definition.kind,
        content: page.definition.name,
        label: this.#labelOf(page),
      })),
      // Only a page that can render has a base to read. One that cannot (no
      // content, or a tag nothing defines) keeps its place in the layout so
      // the reader sees the page and why it is empty, and gets its base when
      // its content arrives.
      pages: Object.fromEntries(
        pages.map((page): [string, unknown] => [
          this.#nameOf(page),
          page.contentState?.status === 'ready' ? page.api.base : {},
        ]),
      ),
    };
  }

  /** Reads the document's base again: a page became renderable, or the markup's pages changed. */
  #refreshBase(): void {
    this.#mirrored = new WeakMap();
    this.controller.setBase({ ...this.controller.base, ...this.#base() });
    this.refreshGrill();
  }

  #idsOf(pages: readonly PageElementLike[]): string {
    return pages.map((page) => this.#nameOf(page)).join(' ');
  }

  #specs(): readonly PageSpec[] {
    return this.#pages().map((page) => ({
      id: this.#nameOf(page),
      label: this.#labelOf(page),
      definition: page.liveDefinition ?? page.definition,
    }));
  }

  /**
   * The definitions of the views and boards a page can be added from, in the
   * app's language. A definition is read from an element of its own, never
   * connected, since each entry bundles its own copy.
   */
  #catalog(): readonly AnyDefinition[] {
    const locale = this.locale;
    const cached = this.#catalogs.get(locale);
    if (cached !== undefined) return cached;
    const contents = this.pageContents();
    const definitions = contents.flatMap(({ kind, name }) => {
      const definition = this.#definitionFor(kind, name, locale);
      return definition === undefined ? [] : [definition];
    });
    // A content whose entry is not loaded yet is looked for again next time.
    if (definitions.length === contents.length) this.#catalogs.set(locale, definitions);
    return definitions;
  }

  /** A content's definition, read from an element of its own; `undefined` while its entry is not loaded. */
  #definitionFor(kind: 'view' | 'board', name: string, locale: Locale): AnyDefinition | undefined {
    const tag = `${kind === 'view' ? 'dpk-view' : 'dpk-board'}-${name}`;
    if (customElements.get(tag) === undefined) return undefined;
    const element = document.createElement(tag);
    element.setAttribute('lang', locale);
    const definition: unknown = 'definition' in element ? element.definition : undefined;
    return isDefinition(definition) ? definition : undefined;
  }

  /**
   * The contents the "+" menu offers: those the catalog does not mark
   * unaddable, whether or not their entry is loaded. A view and a board each
   * live in an entry that is a sibling of the running one, so a pick can load
   * it ([`template-loader.ts`](template-loader.ts)).
   */
  #addableContents(): readonly PageContent[] {
    return this.pageContents().filter((content) => content.addable !== false && this.#reachable(content));
  }

  /** Whether the content's entry can be loaded now: it is here, or it is one of the running entry's siblings. */
  #reachable(content: PageContent): boolean {
    const tag = `${content.kind === 'view' ? 'dpk-view' : 'dpk-board'}-${content.name}`;
    if (customElements.get(tag) !== undefined) return true;
    const entryUrl = announcedEntryUrl();
    return content.kind === 'view'
      ? siblingEntryUrl(content.name, entryUrl) !== null
      : boardEntryUrl(entryUrl) !== null;
  }

  /**
   * The clicked content's definition, loading its entry first when its element
   * is not registered yet — every entry of one version ships as a sibling of
   * the running one ([ADR](../../../dev-docs/adr/20260920_per-template-entries.md)),
   * so an app that loaded any entry can still reach another view's entry or
   * `boards.js` by URL. Concurrent clicks for the same entry share one import.
   */
  async #ensureContent(content: PageContent): Promise<AnyDefinition | undefined> {
    const locale = this.locale;
    const found = this.#definitionFor(content.kind, content.name, locale);
    if (found !== undefined) return found;
    const entryUrl = announcedEntryUrl();
    const url = content.kind === 'view' ? siblingEntryUrl(content.name, entryUrl) : boardEntryUrl(entryUrl);
    if (url === null) return undefined;
    // One import per entry: every board shares `boards.js`, every view its own.
    const key = content.kind === 'view' ? `view:${content.name}` : 'boards';
    let pending = this.#pendingImports.get(key);
    pending ??= import(/* @vite-ignore */ url);
    this.#pendingImports.set(key, pending);
    try {
      await pending;
    } catch (error) {
      this.#pendingImports.delete(key);
      console.error(`dev-process-kit: could not load ${content.kind} "${content.name}" from ${url}`, error);
      return undefined;
    }
    await customElements.whenDefined(`${content.kind === 'view' ? 'dpk-view' : 'dpk-board'}-${content.name}`);
    return this.#definitionFor(content.kind, content.name, locale);
  }

  /** Resolves the clicked content's definition (loading it first if needed) and adds a page of it. */
  async #onAddContent(content: PageContent): Promise<void> {
    const definition = await this.#ensureContent(content);
    if (definition !== undefined) this.#addPage(content);
  }

  #definitionOf(entry: PageEntry): AnyDefinition | undefined {
    return (
      this.#pages().find((page) => this.#nameOf(page) === entry.id)?.definition ??
      this.#catalog().find((definition) => definition.kind === entry.kind && definition.name === entry.content)
    );
  }

  #iconOf(entry: { kind: 'view' | 'board'; content: string }): () => TemplateResult {
    return (
      this.pageContents().find((content) => content.kind === entry.kind && content.name === entry.content)?.icon ??
      iconPage
    );
  }

  /** The draft starts once every page is upgraded and has read its own base. */
  protected override pendingStart(): Promise<void> | null {
    if (this.#pagesReady) return null;
    return this.#whenPagesReady().then(() => {
      this.#pagesReady = true;
      // A page that answered `empty` or `unavailable` is settled too: the app
      // starts for the pages that can render instead of waiting on it.
      for (const page of this.#pages()) this.#ready.set(page, page.contentState?.status === 'ready');
    });
  }

  #whenPagesReady(): Promise<void> {
    return customElements
      .whenDefined('dpk-page')
      .then(() => Promise.all(this.#pages().map((page) => page.ready)))
      .then(() => undefined);
  }

  /**
   * Pages may come and go after the app started (a page streamed in, a page
   * taken out). The app's base is re-read from the pages its markup now
   * holds, so the work on a page that is gone turns stale instead of
   * vanishing. The pages the app makes for the draft are not its base.
   */
  #onPagesChange(): void {
    if (!this.#started) return;
    void this.#whenPagesReady().then(() => {
      const ids = this.#idsOf(this.#markupPages());
      if (ids === this.#baseIds) return;
      this.#baseIds = ids;
      this.#refreshBase();
    });
  }

  /** The app's own JSON and questions are its children, not its pages'. */
  protected override scriptOf(selector: string): Element | null {
    return this.querySelector(`:scope > ${selector}`);
  }

  /** The app asks its own questions and those of every page its markup holds. */
  protected override readGrill(): Grill {
    const own = super.readGrill();
    const asking = this.#askingPages();
    this.#askingIds = this.#idsOf(asking);
    return pageGrill(
      own,
      asking.map((page) => {
        const id = this.#nameOf(page);
        return {
          page: id,
          grill: this.parseGrillScript(page.content?.querySelector(PAGE_GRILL_SELECTOR) ?? null, `@${id}`),
        };
      }),
    );
  }

  /** The pages of the markup the draft still holds; a page it removed asks nothing. */
  #askingPages(): readonly PageElementLike[] {
    const pages = this.#markupPages();
    if (!this.#started) return pages;
    const inLayout = new Set(this.api.state.layout.map((entry) => entry.id));
    return pages.filter((page) => inLayout.has(this.#nameOf(page)));
  }

  protected override grillRefsOf(mark: Element, token: string): readonly string[] {
    return refCandidates(token, pageOfMark(mark));
  }

  /** The page fills the main column; a page scrolls or pans inside itself. */
  protected override get mainLayout(): 'flow' | 'fill' {
    return 'fill';
  }

  protected override buildBrief(snapshot: ViewSnapshot<AppState>): string {
    const specs = snapshot.state.layout.flatMap((entry): PageSpec[] => {
      const definition = this.#definitionOf(entry);
      return definition === undefined ? [] : [{ id: entry.id, label: entry.label, definition }];
    });
    return withPages(super.buildBrief(snapshot), pagesSection(specs, snapshot.actions));
  }

  #activeEntry(state: AppState, navigation: Readonly<Record<string, string>>): PageEntry | undefined {
    return state.layout.find((entry) => entry.id === navigation[PAGE_KEY]);
  }

  /** `page-nav="none"`: the app's own header stays (its title, settings, …) but it offers no page nav at all. */
  #isNoNav(): boolean {
    return this.pageNav === 'none';
  }

  protected override renderRegions(_context: ViewRenderContext<AppState>): ShellRegions {
    const main = html`<div class="dpk-app-pages"><slot @slotchange=${() => this.#onPagesChange()}></slot></div>`;
    // The pages themselves only; the switcher is the header's, and the title
    // (with the author's `slot="header"` markup) is the shell's own.
    return { main };
  }

  /**
   * The header's lead: the switcher trigger ahead of the page's title, so the
   * trigger never moves as a page is added or renamed, and, while it is open,
   * the popover of the app's pages.
   */
  protected override renderHeaderLead(context: ViewRenderContext<AppState>): TemplateResult | typeof nothing {
    if (this.#isNoNav()) return nothing;
    const layout = context.state.layout;
    const active = this.#activeEntry(context.state, context.navigation);
    return this.#renderPageSwitcher(layout, active, this.definition.title(context.state), this.#addableContents());
  }

  /**
   * The switcher trigger — one icon in the header that opens the popover of the
   * app's pages on hover, click or focus, "+" its last row — and, while open,
   * that popover. The page shown is named in the trigger's own label and
   * marked in the list, rather than written out beside it: the header names the
   * document, not the page.
   */
  #renderPageSwitcher(
    layout: readonly PageEntry[],
    active: PageEntry | undefined,
    title: string,
    addable: readonly PageContent[],
  ): TemplateResult | typeof nothing {
    if (layout.length === 0 && addable.length === 0) return nothing;
    const messages = appMessages(this.locale);
    const intents = {
      open: () => this.#openSwitcher(),
      scheduleClose: () => this.#scheduleSwitcherClose(),
    };
    return html`
      ${renderSwitcherTrigger(iconSwitch, this.#switcherOpen, layout.length, messages, intents, {
        active: active === undefined ? null : this.#switcherLabel(active, this.#indexOf(layout, active), title),
      })}
      ${
        this.#switcherOpen
          ? renderSwitcherMenu(this.#switcherRows(layout, active, title, addable), messages, {
              cancelClose: () => this.#cancelSwitcherClose(),
              scheduleClose: () => this.#scheduleSwitcherClose(),
            })
          : nothing
      }
    `;
  }

  #indexOf(layout: readonly PageEntry[], entry: PageEntry): number {
    return layout.findIndex((candidate) => candidate.id === entry.id);
  }

  /** The switcher's rows: the app's pages, or — past its trailing "+" — the views and boards it can add. */
  #switcherRows(
    layout: readonly PageEntry[],
    active: PageEntry | undefined,
    title: string,
    addable: readonly PageContent[],
  ): readonly SwitcherRow[] {
    const messages = appMessages(this.locale);
    if (this.#switcherAdding) {
      return addable.map((content) => ({
        key: `content:${content.kind}:${content.name}`,
        label: content.label,
        icon: content.icon,
        current: false,
        kind: 'action' as const,
        activate: () => {
          this.#closeSwitcher();
          void this.#onAddContent(content);
        },
      }));
    }
    const pages: SwitcherRow[] = layout.map((entry, index) => {
      const label = this.#switcherLabel(entry, index, title);
      const current = entry.id === active?.id;
      return {
        key: `page:${entry.id}`,
        label,
        icon: this.#iconOf(entry),
        current,
        activate: () => {
          this.#closeSwitcher();
          this.navigate({ [PAGE_KEY]: entry.id });
        },
        // The page shown now is renamed where it is listed: it has nowhere else to be named.
        ...(current
          ? { rename: { label: messages.renamePage, commit: (name: string) => this.#renamePage(entry.id, name) } }
          : {}),
        ...(layout.length > 1
          ? { remove: { label: messages.removePage(label), activate: () => this.#removePage(entry.id) } }
          : {}),
      };
    });
    if (addable.length === 0) return pages;
    return [
      ...pages,
      {
        key: 'add',
        label: messages.addPage,
        icon: iconPlus,
        current: false,
        kind: 'action' as const,
        activate: () => {
          this.#switcherAdding = true;
          this.requestUpdate();
          this.#focusFirstSwitcherRowAfterUpdate();
        },
      },
    ];
  }

  /**
   * Moves focus into the add view once it has rendered in place of the page list (#86). The
   * "+" row that was just clicked does not survive that swap (the row sets differ in length), so
   * the browser drops focus to nothing of its own accord; without somewhere to land it inside the
   * menu, that reads as a press outside and schedules the whole menu closed (`@focusin` on the
   * menu is what cancels that schedule once this focus lands).
   */
  #focusFirstSwitcherRowAfterUpdate(): void {
    void this.updateComplete.then(() => {
      this.renderRoot.querySelector<HTMLElement>(`#${SWITCHER_ID} .dpk-page-switcher-option`)?.focus();
    });
  }

  /** The page's own name, dispatched like any other change of the draft. */
  #renamePage(id: string, name: string): void {
    this.dispatch({ type: 'RENAME_PAGE', target: APP_WIDE_TARGET, payload: { page: id, label: name } });
  }

  #openSwitcher(): void {
    this.#cancelSwitcherClose();
    if (this.#switcherOpen) return;
    this.#switcherOpen = true;
    this.requestUpdate();
  }

  /** Closes the switcher a moment out, so the pointer can cross from the trigger into its popover. */
  #scheduleSwitcherClose(): void {
    this.#cancelSwitcherClose();
    this.#switcherCloseTimer = setTimeout(() => this.#closeSwitcher(), SWITCHER_CLOSE_DELAY_MS);
  }

  #cancelSwitcherClose(): void {
    if (this.#switcherCloseTimer === undefined) return;
    clearTimeout(this.#switcherCloseTimer);
    this.#switcherCloseTimer = undefined;
  }

  #closeSwitcher(): void {
    this.#cancelSwitcherClose();
    if (!this.#switcherOpen && !this.#switcherAdding) return;
    this.#switcherOpen = false;
    this.#switcherAdding = false;
    this.requestUpdate();
  }

  /**
   * The active page content's sections, after the kit's `display` section: a
   * page's settings belong to the content the page holds, and only that
   * content knows its own state.
   */
  protected override renderSettingsSections(
    context: ViewRenderContext<AppState>,
  ): readonly SettingsSection<AppState>[] {
    const content = this.#settingsContent(context);
    if (content === null) return [];
    return content.settingsSections.map((section) => ({
      id: section.id,
      label: section.label,
      render: () => section.render(),
    }));
  }

  /**
   * The active page content's switches, flipped on that content rather than on
   * the app: a page's settings are a change of the page's own part of the
   * draft, exactly as its template dispatches them on its own.
   */
  protected override settingsSwitches(context: ViewRenderContext<AppState>): SettingsSwitches | null {
    const entry = this.#activeEntry(context.state, context.navigation);
    const page = entry === undefined ? undefined : this.#pageOf(entry.id);
    if (entry === undefined || page === undefined) return null;
    const settings = page.definition.settings?.(context.state.pages[entry.id]);
    if (settings === undefined || settings.items.length === 0) return null;
    return { settings, flip: (input) => void page.api.dispatch(input) };
  }

  /** The page element of one entry, once it is there. */
  #pageOf(id: string): PageElementLike | undefined {
    return this.#pages().find((element) => this.#nameOf(element) === id);
  }

  /** The content of the page the reader is on, whose settings the dialog shows. */
  #settingsContent(context: ViewRenderContext<AppState>): SettingsContent | null {
    const entry = this.#activeEntry(context.state, context.navigation);
    const content = (entry === undefined ? undefined : this.#pageOf(entry.id))?.content ?? null;
    return isSettingsContent(content) ? content : null;
  }

  /**
   * A page's label in the switcher: its own, given one, or else a fallback
   * that is never the content's name — the app's title for the first page,
   * an ordinal for the rest, since only the first can stand for the document.
   */
  #switcherLabel(entry: PageEntry, index: number, title: string): string {
    const definition = this.#definitionOf(entry);
    const isContentName = definition !== undefined && entry.label === definition.label;
    if (!isContentName) return entry.label;
    return index === 0 ? title : appMessages(this.locale).pageFallback(index + 1);
  }

  /** A new page is a change of the draft; the switcher shows it at once. */
  #addPage(content: PageContent): void {
    const taken = new Set([
      ...this.api.state.layout.map((entry) => entry.id),
      ...Array.from(this.children, (child) => child.getAttribute(PAGE_NAME_ATTRIBUTE) ?? ''),
    ]);
    const page = freshPageId(content.name, taken);
    const outcome = this.dispatch({
      type: 'ADD_PAGE',
      target: APP_WIDE_TARGET,
      payload: { page, kind: content.kind, content: content.name, label: content.label },
    });
    if (outcome.ok) this.navigate({ [PAGE_KEY]: page });
  }

  /**
   * A page the draft added is taken back with everything the draft says about
   * it; a page of the app's markup leaves through a change of the draft, so
   * the agent takes it out.
   */
  #removePage(id: string): void {
    const actions = this.controller.actions;
    const added = actions.find((action) => {
      if (!isAppWide(action.target)) return false;
      const parsed = parseViewAction(appActions, action);
      return parsed?.type === 'ADD_PAGE' && parsed.payload.page === id;
    });
    const inMarkup = this.#base().layout.some((entry) => entry.id === id);
    if (added === undefined || inMarkup) {
      this.dispatch({ type: 'REMOVE_PAGE', target: APP_WIDE_TARGET, payload: { page: id } });
      return;
    }
    // The page is gone, so is everything the draft said about it: its own
    // actions, and the app-wide ones that name it (a rename targets no page
    // in its target, only in its payload).
    for (const action of actions) {
      if (belongsToPage(action, id)) this.removeAction(action.id);
    }
  }

  protected override updated(): void {
    super.updated();
    this.#placeSwitcherMenu();
    this.#syncPages();
  }

  #placeSwitcherMenu(): void {
    const menu = this.renderRoot.querySelector<HTMLElement>(`#${SWITCHER_ID}`);
    const anchor = this.renderRoot.querySelector('.dpk-page-switcher-trigger');
    if (!menu || !anchor || isPopoverOpen(menu)) return;
    this.#popovers.open(menu, anchor, SWITCHER_SIZE, { placement: 'bottom-end' });
  }

  /**
   * Makes the pages the draft added and drops the ones it no longer adds,
   * shows the active page, and gives each page its part of the draft and a
   * chance to read the app's navigation, theme and language again.
   */
  #syncPages(): void {
    if (!this.#pagesReady) return;
    const layout = this.api.state.layout;
    const inLayout = new Set(layout.map((entry) => entry.id));
    if (this.#idsOf(this.#askingPages()) !== this.#askingIds) this.refreshGrill();
    for (const page of this.#pages()) {
      if (page.hasAttribute(DRAFT_PAGE_ATTRIBUTE) && !inLayout.has(this.#nameOf(page))) page.remove();
    }
    const present = new Set(Array.from(this.children, (child) => child.getAttribute(PAGE_NAME_ATTRIBUTE)));
    for (const entry of layout) {
      if (!present.has(entry.id)) this.#makePage(entry);
    }
    const actions = this.controller.actions;
    const active = this.navigation[PAGE_KEY];
    let handed = false;
    for (const page of this.#pages()) {
      const id = this.#nameOf(page);
      page.hidden = id !== active || !inLayout.has(id);
      if (!this.#isReady(page)) continue;
      if (this.#mirrored.get(page) !== actions) {
        this.#mirrored.set(page, actions);
        page.controller.replaceActions(sliceOf(actions, id));
        handed = true;
      }
      page.refreshContent();
      page.deliver();
    }
    // The settings dialog shows the active page's own sections, and they read
    // that page's state — which the page only takes in here, after this render
    // built the dialog. One more render of the app, with the page's fresh state,
    // is what makes an edit inside the open dialog show itself (a status it
    // just added, a name it just changed) instead of waiting for a reopen.
    if (handed && this.settingsOpen) this.requestUpdate();
  }

  /** An element for a page the draft added; it starts from its content's empty base. */
  #makePage(entry: PageEntry): void {
    const pageTag = 'dpk-page';
    const contentTag = `${entry.kind === 'view' ? 'dpk-view' : 'dpk-board'}-${entry.content}`;
    if (customElements.get(pageTag) === undefined || customElements.get(contentTag) === undefined) return;
    const page = document.createElement(pageTag);
    page.setAttribute(PAGE_NAME_ATTRIBUTE, entry.id);
    page.setAttribute('label', entry.label);
    page.setAttribute(DRAFT_PAGE_ATTRIBUTE, '');
    const content = document.createElement(contentTag);
    page.append(content);
    page.hidden = true;
    this.append(page);
  }

  #isReady(page: PageElementLike): boolean {
    const ready = this.#ready.get(page);
    if (ready !== undefined) return ready;
    this.#ready.set(page, false);
    void page.ready.then(() => {
      const settled = page.contentState?.status === 'ready';
      this.#ready.set(page, settled);
      if (settled) this.requestUpdate();
    });
    return false;
  }
}
