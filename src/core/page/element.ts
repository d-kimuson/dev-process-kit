/**
 * `<dpk-page>`: one page holding several templates as boards.
 *
 * The page is a template whose definition routes every action to its board
 * (`definition.ts`), so the shell — header, review, draft, storage, brief,
 * questions, change notices and hash — is the ordinary one, once per page.
 * Each child with `board="<id>"` — a `dpk-template-*` or a diagram component
 * used as a board (ADR 20261023_diagram-as-board) — renders its own regions
 * and hands everything else to the page through `BOARD_HOST`. The page mirrors
 * each board's part of the draft back into it, so a board renders the same
 * state and comment counts it would on its own.
 *
 * The rail lists the boards of the page's state, not of its markup: a board
 * the draft adds gets an element the page makes for it, and a board the
 * draft removes is hidden until the agent takes it out.
 */
import { css, html, nothing, type CSSResultGroup, type PropertyDeclarations, type TemplateResult } from 'lit';
import { LayoutTemplate } from 'lucide';

import type { Locale } from '../i18n';
import type { ShellRegions, TemplateApi, TemplateRenderContext, TemplateSnapshot } from '../shell/contracts';
import type { DraftAction, Navigation, TemplateDefinition } from '../types';

import { announcedEntryUrl } from '../../lib/announce';
import { DismissController } from '../../lib/dom/dismiss';
import { onCommit } from '../../lib/dom/events';
import { TemplateElement } from '../element';
import { GRILL_ATTRIBUTE, GRILL_TARGET_TYPE, type Grill } from '../grill';
import { iconPlus, iconSwitch, lucide } from '../icons';
import { coreMessages } from '../messages';
import { PopoverController } from '../popover-controller';
import { parseTemplateAction } from '../schema';
import { renderSettingsMenu, renderSettingsTrigger, SETTINGS_ANCHOR } from '../shell/settings-menu';
import { chromeStyles } from '../shell/styles';
import { pageActions } from './actions';
import { isPageWide, PAGE_WIDE_TARGET, splitBoard } from './board-target';
import { boardsSection, withBoards } from './brief';
import {
  freshBoardId,
  pageDefinition,
  type AnyDefinition,
  type BoardLayout,
  type BoardSpec,
  type PageBase,
  type PageState,
} from './definition';
import { boardOfMark, pageGrill, refCandidates } from './grill';
import { BOARD_ATTRIBUTE, BOARD_HOST, boardIdOf, DRAFT_BOARD_ATTRIBUTE, type BoardHost } from './host';
import { pageMessages } from './messages';
import { BOARD_KEY, boardNavigation } from './navigation';
import { renderSwitcherMenu, renderSwitcherTrigger, SWITCHER_ID, type SwitcherRow } from './switcher';
import { siblingEntryUrl } from './template-loader';

/** A template a board can be added from, with the icon the rail shows for its boards. */
export type BoardTemplate = {
  /** The template's name (`usm`); `dpk-template-<name>` must be defined for it to be offered. */
  readonly name: string;
  /** The label the add menu shows, read before the template's own element may even be loaded. */
  readonly label: string;
  readonly icon: () => TemplateResult;
  /**
   * Whether the "+" add menu offers an empty board of this template. Mirrors
   * the template's own `TemplateDefinition.addable` — kept here too so the
   * menu can gate a template before its entry is loaded. Defaults to `true`.
   */
  readonly addable?: boolean;
};

/**
 * A board as the page reaches it. Read structurally: each template entry
 * bundles its own core, so a board may not share this module's classes.
 */
type BoardElement = HTMLElement & {
  readonly board: string | null;
  readonly definition: AnyDefinition;
  /**
   * `definition`, extended with this board's own component-registered
   * targets; the page's own `hasTarget` etc. delegate through this one when
   * a board has it. Only `TemplateElement` boards do — an element-chrome
   * board (a diagram or `dpk-kanban` used as a board) is structurally a
   * `BoardElement` (`definition` + `api`) without one, so this stays
   * optional and `#specs()` falls back to `definition` for it.
   */
  readonly liveDefinition?: AnyDefinition;
  readonly api: TemplateApi<unknown>;
  readonly controller: { replaceActions(actions: readonly unknown[]): void };
  requestUpdate(): void;
};

const isBoardElement = (element: Element): element is BoardElement =>
  element instanceof HTMLElement && 'definition' in element && 'api' in element && boardIdOf(element) !== null;

const isDefinition = (value: unknown): value is AnyDefinition =>
  typeof value === 'object' && value !== null && 'name' in value && 'emptyBase' in value;

const BOARD_GRILL_SELECTOR = `:scope > script[type="application/json"][${GRILL_ATTRIBUTE}]`;

/**
 * A board's part of the page's draft, as the board itself knows its targets.
 * A board's questions are the page's (`grill:retry@<board>`), so what the
 * draft says about them stays with the page.
 */
const sliceOf = (actions: readonly DraftAction[], board: string): readonly DraftAction[] =>
  actions.flatMap((action) => {
    if (action.target.type === GRILL_TARGET_TYPE) return [];
    const scoped = splitBoard(action.target);
    return scoped?.board === board ? [{ ...action, target: scoped.target }] : [];
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

const iconBoard = lucide(LayoutTemplate);
const SWITCHER_SIZE = { width: 240, height: 420 } as const;
/** Long enough that the pointer can cross the gap from the trigger into the popover. */
const SWITCHER_CLOSE_DELAY_MS = 220;

const pageStyles = css`
  .dpk-main-body {
    animation: none;
  }

  /* The header reads "title / board ⚙": the title keeps its width and the board follows it. */
  .dpk-title {
    flex: 0 1 auto;
  }

  .dpk-header-slot {
    flex: 1 1 0%;
  }

  .dpk-page-heading {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }

  .dpk-page-crumb {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    color: var(--dpk-ink-soft);
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
  }

  .dpk-page-crumb::before {
    content: '/';
    color: var(--dpk-rule-strong);
    font-weight: 400;
  }

  .dpk-page-crumb svg {
    width: 15px;
    height: 15px;
  }

  /* The switcher trigger is a .dpk-header-action icon button; its popover is
     sized here, the rest of its rows reuse .dpk-settings as-is. With two or
     more boards it widens to fit a quiet inline count next to the icon,
     instead of the corner badge other icon buttons use for something unread
     (there's nothing to read here, only to pick from). With one board, or
     none shown, it stays the plain icon square. */
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

  /* A board row of the switcher, with its optional remove button beside it. */
  .dpk-page-switcher-row {
    position: relative;
    display: flex;
    align-items: center;
  }

  .dpk-page-switcher-row .dpk-page-switcher-option {
    flex: 1 1 auto;
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

  .dpk-page-boards {
    flex: 1 1 0%;
    display: grid;
    min-width: 0;
    min-height: 0;
  }

  ::slotted(*) {
    min-width: 0;
    min-height: 0;
  }

  /* Important: the page's own CSS often gives a template display: block. */
  ::slotted([hidden]) {
    display: none !important;
  }
`;

export class PageElement extends TemplateElement<PageState> {
  static override styles: CSSResultGroup = [chromeStyles, pageStyles];

  static override properties: PropertyDeclarations = {
    boardNav: { type: String, attribute: 'board-nav' },
    hash: { type: String },
  };

  /**
   * `board-nav="none"` draws no board nav at all: no switcher, no "+" — the
   * page's own header (comment, history, …) still shows, for a page embedded
   * where boards are chosen some other way (a catalog's own showcase). Absent
   * (or any other value) switches boards from a control in the header — the
   * page's base form for every page of several boards.
   */
  declare boardNav: string | null;

  /**
   * `hash="off"` leaves `location.hash` alone: the page neither reads it on
   * start nor writes it on navigation or action, for a page embedded where
   * the hash already belongs to something else (a catalog's own routing).
   * Board switching still works, in memory, either way. Absent (or any other
   * value) keeps the hash as every page always had it.
   */
  declare hash: string | null;

  protected override get hashMode(): 'auto' | 'off' {
    return this.hash === 'off' ? 'off' : 'auto';
  }

  #boardsReady = false;
  /** Set once the page's own draft exists; boards find no host before that. */
  #started = false;
  /** The boards the page's base was last read from, so only a real change re-reads it. */
  #baseIds = '';
  /** The boards the questions were last read from. */
  #askingIds = '';
  /** The page draft each board was last given, so a render that changed nothing gives nothing. */
  #mirrored = new WeakMap<BoardElement, readonly DraftAction[]>();
  /** Whether each board has read its base: a board is given its part of the draft only after that. */
  readonly #ready = new WeakMap<BoardElement, boolean>();
  readonly #catalogs = new Map<Locale, readonly AnyDefinition[]>();
  /** One dynamic import per template name, so a second click before it settles does not import it twice. */
  readonly #pendingImports = new Map<string, Promise<unknown>>();
  #host: BoardHost | undefined;
  /** The page's navigation as of the last `dpk-navigate` handed to its boards. */
  #lastPageNavigation: Navigation | null = null;
  /** Whether the switcher popover is open. */
  #switcherOpen = false;
  /** Within the open switcher, whether it shows addable templates instead of the page's boards. */
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

  /** The templates a board can be added from; a page without them offers no "+". */
  protected boardTemplates(): readonly BoardTemplate[] {
    return [];
  }

  protected override definitionFor(locale: Locale): TemplateDefinition<PageState> {
    return pageDefinition({
      boards: () => this.#specs(),
      base: () => this.#base(),
      catalog: () => this.#catalog(),
      messages: pageMessages(locale),
    });
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('dpk-comment-targets-change', this.#onBoardTargetsChange);
    this.addEventListener('dpk-navigate', this.#onPageNavigate);
    this.#lastPageNavigation = this.navigation;
    void this.api.ready.then(() => {
      this.#started = true;
      this.#baseIds = this.#idsOf(this.#markupBoards());
      this.requestUpdate();
    });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('dpk-comment-targets-change', this.#onBoardTargetsChange);
    this.removeEventListener('dpk-navigate', this.#onPageNavigate);
    this.#cancelSwitcherClose();
  }

  /**
   * A board keeps the `dpk-navigate` contract it has on its own: the page
   * fires it on every board whose board-relative navigation changed, with
   * that navigation as the detail (a board's slot content listens on the
   * board, and moving it into a page must not stop it from re-rendering).
   * A board's own event bubbles back up here; only the page's own event is
   * fanned out, so this cannot loop.
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
    for (const board of this.#boards()) {
      const id = board.board;
      if (id === null) continue;
      const before = boardNavigation(previous, id);
      const after = boardNavigation(navigation, id);
      if (sameNavigation(before, after)) continue;
      board.dispatchEvent(
        new CustomEvent('dpk-navigate', {
          detail: { navigation: after },
          bubbles: true,
          composed: true,
        }),
      );
    }
  };

  /**
   * A board's own component registered or dropped a target (`dpk-commentable`,
   * a diagram, …). The page's own provider scan stops at a board's boundary —
   * `findComponentProviders` treats a nested template as owning its own
   * history — so this bubbled event is the only signal the page gets that a
   * board's `liveDefinition` changed. Re-derives unconditionally
   * (`setTemplate`, not `setComponentSnapshot`) because the page's own
   * component snapshot is unchanged; only what a board's `hasTarget` answers
   * through it is.
   */
  #onBoardTargetsChange = (): void => {
    if (!this.#started) return;
    this.controller.setTemplate(this.definition);
  };

  get [BOARD_HOST](): BoardHost | undefined {
    if (!this.#started) return undefined;
    this.#host ??= {
      locale: () => this.locale,
      theme: () => this.dataset['theme'],
      navigation: () => this.navigation,
      boardIds: () => new Set(this.#boards().map((board) => board.board ?? '')),
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

  #boards(): readonly BoardElement[] {
    return Array.from(this.children).filter(isBoardElement);
  }

  /** The boards written in the page's markup, apart from the ones the page made for the draft. */
  #markupBoards(): readonly BoardElement[] {
    return this.#boards().filter((board) => !board.hasAttribute(DRAFT_BOARD_ATTRIBUTE));
  }

  #labelOf(board: BoardElement): string {
    return board.getAttribute('label') ?? board.definition.label;
  }

  #base(): PageBase {
    const boards = this.#markupBoards();
    return {
      layout: boards.map((board) => ({
        id: board.board ?? '',
        template: board.definition.name,
        label: this.#labelOf(board),
      })),
      boards: Object.fromEntries(boards.map((board): [string, unknown] => [board.board ?? '', board.api.base])),
    };
  }

  #idsOf(boards: readonly BoardElement[]): string {
    return boards.map((board) => board.board ?? '').join(' ');
  }

  #specs(): readonly BoardSpec[] {
    return this.#boards().map((board) => ({
      id: board.board ?? '',
      label: this.#labelOf(board),
      definition: board.liveDefinition ?? board.definition,
    }));
  }

  /**
   * The definitions of the templates a board can be added from, in the
   * page's language. A template is read from an element of its own, never
   * connected, since each entry bundles its own copy of the template.
   */
  #catalog(): readonly AnyDefinition[] {
    const locale = this.locale;
    const cached = this.#catalogs.get(locale);
    if (cached !== undefined) return cached;
    const templates = this.boardTemplates();
    const definitions = templates.flatMap(({ name }) => {
      const definition = this.#definitionFor(name, locale);
      return definition === undefined ? [] : [definition];
    });
    // A template whose entry is not loaded yet is looked for again next time.
    if (definitions.length === templates.length) this.#catalogs.set(locale, definitions);
    return definitions;
  }

  /** A template's definition, read from an element of its own; `undefined` while its entry is not loaded. */
  #definitionFor(name: string, locale: Locale): AnyDefinition | undefined {
    const tag = `dpk-template-${name}`;
    if (customElements.get(tag) === undefined) return undefined;
    const element = document.createElement(tag);
    element.setAttribute('lang', locale);
    const definition: unknown = 'definition' in element ? element.definition : undefined;
    return isDefinition(definition) ? definition : undefined;
  }

  /** The templates the "+" menu offers: those the catalog does not mark unaddable. */
  #addableTemplates(): readonly BoardTemplate[] {
    return this.boardTemplates().filter((template) => template.addable !== false);
  }

  /**
   * The clicked template's definition, loading its sibling entry first when
   * its element is not registered yet — every entry of one version ships as a
   * sibling of every other, by `import.meta.url` ([ADR](../../../dev-docs/adr/20260920_per-template-entries.md)),
   * so a page that loaded one template's entry can still reach another's by
   * URL. Concurrent clicks for the same template share one import. `undefined`
   * when there is no running entry to resolve a sibling against, or the
   * import fails.
   */
  async #ensureTemplate(name: string): Promise<AnyDefinition | undefined> {
    const locale = this.locale;
    const found = this.#definitionFor(name, locale);
    if (found !== undefined) return found;
    const url = siblingEntryUrl(name, announcedEntryUrl());
    if (url === null) return undefined;
    let pending = this.#pendingImports.get(name);
    pending ??= import(/* @vite-ignore */ url);
    this.#pendingImports.set(name, pending);
    try {
      await pending;
    } catch (error) {
      this.#pendingImports.delete(name);
      console.error(`dev-process-kit: could not load template "${name}" from ${url}`, error);
      return undefined;
    }
    await customElements.whenDefined(`dpk-template-${name}`);
    return this.#definitionFor(name, locale);
  }

  /** Resolves the clicked template's definition (loading it first if needed) and adds a board of it. */
  async #onAddTemplate(name: string): Promise<void> {
    const definition = await this.#ensureTemplate(name);
    if (definition !== undefined) this.#addBoard(definition);
  }

  #definitionOf(entry: BoardLayout): AnyDefinition | undefined {
    return (
      this.#boards().find((board) => board.board === entry.id)?.definition ??
      this.#catalog().find((definition) => definition.name === entry.template)
    );
  }

  #iconOf(template: string): () => TemplateResult {
    return this.boardTemplates().find((entry) => entry.name === template)?.icon ?? iconBoard;
  }

  /** The draft starts once every board is upgraded and has read its own base. */
  protected override pendingStart(): Promise<void> | null {
    if (this.#boardsReady) return null;
    return this.#whenBoardsReady().then(() => {
      this.#boardsReady = true;
      for (const board of this.#boards()) this.#ready.set(board, true);
    });
  }

  #whenBoardsReady(): Promise<void> {
    const tags = new Set(
      Array.from(this.children)
        .filter((child) => child.hasAttribute(BOARD_ATTRIBUTE))
        .map((child) => child.localName),
    );
    return Promise.all(Array.from(tags, (tag) => customElements.whenDefined(tag)))
      .then(() => Promise.all(this.#boards().map((board) => board.api.ready)))
      .then(() => undefined);
  }

  /**
   * Boards may come and go after the page started (a page streamed in, a board
   * taken out). The page's base is re-read from the boards its markup now
   * holds, so the work on a board that is gone turns stale instead of
   * vanishing. The boards the page makes for the draft are not its base.
   */
  #onBoardsChange(): void {
    if (!this.#started) return;
    void this.#whenBoardsReady().then(() => {
      const ids = this.#idsOf(this.#markupBoards());
      if (ids === this.#baseIds) return;
      this.#baseIds = ids;
      this.#mirrored = new WeakMap();
      this.controller.setBase({ ...this.controller.base, ...this.#base() });
      this.refreshGrill();
    });
  }

  /** The page's own JSON and questions are its children, not its boards'. */
  protected override scriptOf(selector: string): Element | null {
    return this.querySelector(`:scope > ${selector}`);
  }

  /** The page asks its own questions and those of every board its markup holds. */
  protected override readGrill(): Grill {
    const own = super.readGrill();
    const asking = this.#askingBoards();
    this.#askingIds = this.#idsOf(asking);
    return pageGrill(
      own,
      asking.map((board) => {
        const id = board.board ?? '';
        return { board: id, grill: this.parseGrillScript(board.querySelector(BOARD_GRILL_SELECTOR), `@${id}`) };
      }),
    );
  }

  /** The boards of the markup the draft still holds; a board it removed asks nothing. */
  #askingBoards(): readonly BoardElement[] {
    const boards = this.#markupBoards();
    if (!this.#started) return boards;
    const inLayout = new Set(this.api.state.layout.map((entry) => entry.id));
    return boards.filter((board) => inLayout.has(board.board ?? ''));
  }

  protected override grillRefsOf(mark: Element, token: string): readonly string[] {
    return refCandidates(token, boardOfMark(mark));
  }

  /** The board fills the main column; a board scrolls or pans inside itself. */
  protected override get mainLayout(): 'flow' | 'fill' {
    return 'fill';
  }

  protected override buildBrief(snapshot: TemplateSnapshot<PageState>): string {
    const specs = snapshot.state.layout.flatMap((entry): BoardSpec[] => {
      const definition = this.#definitionOf(entry);
      return definition === undefined ? [] : [{ id: entry.id, label: entry.label, definition }];
    });
    return withBoards(super.buildBrief(snapshot), boardsSection(specs, snapshot.actions));
  }

  #activeEntry(state: PageState, navigation: Readonly<Record<string, string>>): BoardLayout | undefined {
    return state.layout.find((entry) => entry.id === navigation[BOARD_KEY]);
  }

  /** `board-nav="none"`: the page's own header stays (comment, history, …) but it offers no board nav at all. */
  #isNoNav(): boolean {
    return this.boardNav === 'none';
  }

  protected override renderRegions(context: TemplateRenderContext<PageState>): ShellRegions {
    const layout = context.state.layout;
    const active = this.#activeEntry(context.state, context.navigation);
    const addable = this.#addableTemplates();
    const title = this.definition.title(context.state);
    const main = html`<div class="dpk-page-boards"><slot @slotchange=${() => this.#onBoardsChange()}></slot></div>`;
    if (this.#isNoNav()) {
      const header =
        active === undefined
          ? nothing
          : html`<div class="dpk-page-heading ${SETTINGS_ANCHOR}">${this.#renderBoardSettings(context, active)}</div>`;
      return { header, rail: nothing, main };
    }
    return { header: this.#renderHeaderNav(context, layout, active, addable, title), rail: nothing, main };
  }

  /**
   * The title keeps its spot, then (when there is more than one board) the
   * switcher trigger — one icon that opens a popover of the page's boards on
   * hover, click or focus, "+" its last row — ahead of the active board's own
   * name, so the trigger never moves as a name appears or changes length;
   * then the active board's settings.
   */
  #renderHeaderNav(
    context: TemplateRenderContext<PageState>,
    layout: readonly BoardLayout[],
    active: BoardLayout | undefined,
    addable: readonly BoardTemplate[],
    title: string,
  ): TemplateResult {
    return html`<div class="dpk-page-heading ${SETTINGS_ANCHOR}">
      ${this.#renderBoardSwitcher(layout, active, title, addable)}
      ${active === undefined ? nothing : this.#renderBoardSettings(context, active)}
    </div>`;
  }

  /** The switcher trigger, the active board's name (once there is more than one), and, while open, the popover. */
  #renderBoardSwitcher(
    layout: readonly BoardLayout[],
    active: BoardLayout | undefined,
    title: string,
    addable: readonly BoardTemplate[],
  ): TemplateResult | typeof nothing {
    if (layout.length === 0 && addable.length === 0) return nothing;
    const messages = pageMessages(this.locale);
    const intents = {
      open: () => this.#openSwitcher(),
      scheduleClose: () => this.#scheduleSwitcherClose(),
    };
    return html`
      ${renderSwitcherTrigger(iconSwitch, this.#switcherOpen, layout.length, messages, intents)}
      ${
        layout.length <= 1 || active === undefined
          ? nothing
          : this.#renderCrumb(
              active,
              layout.findIndex((entry) => entry.id === active.id),
              title,
            )
      }
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

  /** The active board's name beside the switcher trigger, renamed in place through the page's own draft. */
  #renderCrumb(entry: BoardLayout, index: number, title: string): TemplateResult {
    const messages = pageMessages(this.locale);
    const label = this.#switcherLabel(entry, index, title);
    return html`<span class="dpk-page-crumb"
      >${this.#iconOf(entry.template)()}<dpk-inline-edit
        .value=${label}
        .label=${messages.renameBoard}
        @dpk-commit=${onCommit((name) => this.#renameBoard(entry.id, name))}
      ></dpk-inline-edit
    ></span>`;
  }

  /** The switcher's rows: the page's boards, or — past its trailing "+" — the templates it can add. */
  #switcherRows(
    layout: readonly BoardLayout[],
    active: BoardLayout | undefined,
    title: string,
    addable: readonly BoardTemplate[],
  ): readonly SwitcherRow[] {
    const messages = pageMessages(this.locale);
    if (this.#switcherAdding) {
      return addable.map((template) => ({
        key: `template:${template.name}`,
        label: template.label,
        icon: template.icon,
        current: false,
        kind: 'action' as const,
        activate: () => {
          this.#closeSwitcher();
          void this.#onAddTemplate(template.name);
        },
      }));
    }
    const boards: SwitcherRow[] = layout.map((entry, index) => {
      const label = this.#switcherLabel(entry, index, title);
      return {
        key: `board:${entry.id}`,
        label,
        icon: this.#iconOf(entry.template),
        current: entry.id === active?.id,
        activate: () => {
          this.#closeSwitcher();
          this.navigate({ [BOARD_KEY]: entry.id });
        },
        ...(layout.length > 1
          ? { remove: { label: messages.removeBoard(label), activate: () => this.#removeBoard(entry.id) } }
          : {}),
      };
    });
    if (addable.length === 0) return boards;
    return [
      ...boards,
      {
        key: 'add',
        label: messages.addBoard,
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
   * Moves focus into the add view once it has rendered in place of the board list (#86). The
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

  /** The board's own name in the header crumb, dispatched like any other change of the draft. */
  #renameBoard(id: string, name: string): void {
    this.dispatch({ type: 'RENAME_BOARD', target: PAGE_WIDE_TARGET, payload: { board: id, label: name } });
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

  /** The active board's settings trigger and menu; shared between the rail heading and the header nav. */
  #renderBoardSettings(context: TemplateRenderContext<PageState>, entry: BoardLayout): TemplateResult | typeof nothing {
    const board = this.#boards().find((element) => element.board === entry.id);
    const settings = board?.definition.settings?.(context.state.boards[entry.id]);
    if (board === undefined || settings === undefined || settings.items.length === 0) return nothing;
    const messages = coreMessages(this.locale);
    const intents = {
      toggle: () => {
        this.settingsOpen = !this.settingsOpen;
      },
      flip: (input: Parameters<BoardElement['api']['dispatch']>[0]) => void board.api.dispatch(input),
    };
    return html`${renderSettingsTrigger(this.settingsOpen, messages, intents)}
    ${this.settingsOpen ? renderSettingsMenu(settings, messages, intents) : nothing}`;
  }

  /**
   * A board's label in the switcher: its own, given one, or else a fallback
   * that is never the template's name — the page's title for the first board,
   * an ordinal for the rest, since only the first can stand for the page.
   */
  #switcherLabel(entry: BoardLayout, index: number, title: string): string {
    const definition = this.#definitionOf(entry);
    const isTemplateName = definition !== undefined && entry.label === definition.label;
    if (!isTemplateName) return entry.label;
    return index === 0 ? title : pageMessages(this.locale).boardFallback(index + 1);
  }

  /** A new board is a change of the draft; the switcher shows it at once. */
  #addBoard(definition: AnyDefinition): void {
    const taken = new Set([
      ...this.api.state.layout.map((entry) => entry.id),
      ...Array.from(this.children, (child) => child.getAttribute(BOARD_ATTRIBUTE) ?? ''),
    ]);
    const board = freshBoardId(definition.name, taken);
    const outcome = this.dispatch({
      type: 'ADD_BOARD',
      target: PAGE_WIDE_TARGET,
      payload: { board, template: definition.name, label: definition.label },
    });
    if (outcome.ok) this.navigate({ [BOARD_KEY]: board });
  }

  /**
   * A board the draft added is taken back with everything the draft says
   * about it; a board of the page's markup leaves through a change of the
   * draft, so the agent takes it out.
   */
  #removeBoard(id: string): void {
    const actions = this.controller.actions;
    const added = actions.find((action) => {
      if (!isPageWide(action.target)) return false;
      const parsed = parseTemplateAction(pageActions, action);
      return parsed?.type === 'ADD_BOARD' && parsed.payload.board === id;
    });
    const inMarkup = this.#base().layout.some((entry) => entry.id === id);
    if (added === undefined || inMarkup) {
      this.dispatch({ type: 'REMOVE_BOARD', target: PAGE_WIDE_TARGET, payload: { board: id } });
      return;
    }
    for (const action of actions) {
      if (splitBoard(action.target)?.board === id) this.removeAction(action.id);
    }
    this.removeAction(added.id);
  }

  protected override updated(): void {
    super.updated();
    this.#placeSwitcherMenu();
    this.#syncBoards();
  }

  #placeSwitcherMenu(): void {
    const menu = this.renderRoot.querySelector<HTMLElement>(`#${SWITCHER_ID}`);
    const anchor = this.renderRoot.querySelector('.dpk-page-switcher-trigger');
    if (!menu || !anchor || isPopoverOpen(menu)) return;
    this.#popovers.open(menu, anchor, SWITCHER_SIZE, { placement: 'bottom-end' });
  }

  /**
   * Makes the boards the draft added and drops the ones it no longer adds,
   * shows the active board, and gives each board its part of the draft and a
   * chance to read the page's navigation, theme and language again.
   */
  #syncBoards(): void {
    if (!this.#boardsReady) return;
    const layout = this.api.state.layout;
    const inLayout = new Set(layout.map((entry) => entry.id));
    if (this.#idsOf(this.#askingBoards()) !== this.#askingIds) this.refreshGrill();
    for (const board of this.#boards()) {
      if (board.hasAttribute(DRAFT_BOARD_ATTRIBUTE) && !inLayout.has(board.board ?? '')) board.remove();
    }
    const present = new Set(Array.from(this.children, (child) => child.getAttribute(BOARD_ATTRIBUTE)));
    for (const entry of layout) {
      if (!present.has(entry.id)) this.#makeBoard(entry);
    }
    const actions = this.controller.actions;
    const active = this.navigation[BOARD_KEY];
    for (const board of this.#boards()) {
      const id = board.board ?? '';
      board.hidden = id !== active || !inLayout.has(id);
      if (!this.#isReady(board)) continue;
      if (this.#mirrored.get(board) !== actions) {
        this.#mirrored.set(board, actions);
        board.controller.replaceActions(sliceOf(actions, id));
      }
      board.requestUpdate();
    }
  }

  /** An element for a board the draft added; it starts from its template's empty base. */
  #makeBoard(entry: BoardLayout): void {
    const tag = `dpk-template-${entry.template}`;
    if (customElements.get(tag) === undefined) return;
    const board = document.createElement(tag);
    board.setAttribute(BOARD_ATTRIBUTE, entry.id);
    board.setAttribute('label', entry.label);
    board.setAttribute(DRAFT_BOARD_ATTRIBUTE, '');
    board.hidden = true;
    this.append(board);
  }

  #isReady(board: BoardElement): boolean {
    const ready = this.#ready.get(board);
    if (ready !== undefined) return ready;
    this.#ready.set(board, false);
    void board.api.ready.then(() => {
      this.#ready.set(board, true);
      this.requestUpdate();
    });
    return false;
  }
}
