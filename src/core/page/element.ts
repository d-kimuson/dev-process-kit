/**
 * `<dpk-page>`: one page holding several templates as boards.
 *
 * The page is a template whose definition routes every action to its board
 * (`definition.ts`), so the shell — header, review, draft, storage, brief,
 * questions, change notices and hash — is the ordinary one, once per page.
 * Each `dpk-template-*` child with `board="<id>"` renders its own regions and
 * hands everything else to the page through `BOARD_HOST`. The page mirrors
 * each board's part of the draft back into it, so a board renders the same
 * state and comment counts it would on its own.
 *
 * The rail lists the boards of the page's state, not of its markup: a board
 * the draft adds gets an element the page makes for it, and a board the
 * draft removes is hidden until the agent takes it out.
 */
import { css, html, nothing, type CSSResultGroup, type TemplateResult } from 'lit';
import { LayoutTemplate } from 'lucide';

import type { Locale } from '../i18n';
import type { ShellRegions, TemplateApi, TemplateRenderContext, TemplateSnapshot } from '../shell/contracts';
import type { DraftAction, TemplateDefinition } from '../types';

import { DismissController } from '../../lib/dom/dismiss';
import { TemplateElement } from '../element';
import { iconClose, iconPlus, lucide } from '../icons';
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
import { BOARD_ATTRIBUTE, BOARD_HOST, boardIdOf, DRAFT_BOARD_ATTRIBUTE, type BoardHost } from './host';
import { pageMessages } from './messages';
import { BOARD_KEY } from './navigation';

/** A template a board can be added from, with the icon the rail shows for its boards. */
export type BoardTemplate = {
  /** The template's name (`usm`); `dpk-template-<name>` must be defined for it to be offered. */
  readonly name: string;
  readonly icon: () => TemplateResult;
};

/**
 * A board as the page reaches it. Read structurally: each template entry
 * bundles its own core, so a board may not share this module's classes.
 */
type BoardElement = HTMLElement & {
  readonly board: string | null;
  readonly definition: AnyDefinition;
  readonly api: TemplateApi<unknown>;
  readonly controller: { replaceActions(actions: readonly unknown[]): void };
  requestUpdate(): void;
};

const isBoardElement = (element: Element): element is BoardElement =>
  element instanceof HTMLElement && 'definition' in element && 'api' in element && boardIdOf(element) !== null;

const isDefinition = (value: unknown): value is AnyDefinition =>
  typeof value === 'object' && value !== null && 'name' in value && 'emptyBase' in value;

/** A board's part of the page's draft, as the board itself knows its targets. */
const sliceOf = (actions: readonly DraftAction[], board: string): readonly DraftAction[] =>
  actions.flatMap((action) => {
    const scoped = splitBoard(action.target);
    return scoped?.board === board ? [{ ...action, target: scoped.target }] : [];
  });

const isPopoverOpen = (element: Element): boolean => {
  try {
    return element.matches(':popover-open');
  } catch {
    return false;
  }
};

const iconBoard = lucide(LayoutTemplate);
const ADD_MENU_ID = 'dpk-page-add-menu';
const ADD_MENU_SIZE = { width: 260, height: 420 } as const;

const pageStyles = css`
  .dpk-main {
    overflow: hidden;
  }

  .dpk-main-body {
    display: flex;
    flex: 1 1 0%;
    min-height: 0;
    padding: 0;
    animation: none;
  }

  .dpk-page {
    flex: 1 1 auto;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    min-width: 0;
    min-height: 0;
  }

  .dpk-page-rail {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 6px 4px;
    border-right: 1px solid var(--dpk-rule);
    background: var(--dpk-paper-sunken);
    overflow-y: auto;
  }

  .dpk-page-tabs {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .dpk-page-tab-item {
    position: relative;
  }

  .dpk-page-tab {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    width: 52px;
    padding: 6px 2px 5px;
    border: 1px solid transparent;
    border-radius: var(--dpk-radius);
    background: transparent;
    color: var(--dpk-ink-soft);
    font: 600 10px / 1.2 var(--dpk-body);
    overflow-wrap: anywhere;
    text-align: center;
    cursor: pointer;
    transition:
      background 160ms var(--dpk-ease),
      color 160ms var(--dpk-ease);
  }

  .dpk-page-tab-icon {
    display: grid;
    place-items: center;
  }

  .dpk-page-tab-icon svg {
    width: 22px;
    height: 22px;
    stroke-width: 1.75;
  }

  .dpk-page-tab:hover {
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink);
  }

  .dpk-page-tab[aria-selected='true'] {
    border-color: var(--dpk-rule-strong);
    background: var(--dpk-paper-raised);
    color: var(--dpk-accent);
    box-shadow: var(--dpk-shadow-xs);
  }

  .dpk-page-tab:focus-visible,
  .dpk-page-tab-remove:focus-visible,
  .dpk-page-add:focus-visible {
    outline: 2px solid var(--dpk-focus);
    outline-offset: 2px;
  }

  .dpk-page-tab-count {
    position: absolute;
    top: -3px;
    right: -3px;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    border: 2px solid var(--dpk-paper-sunken);
    border-radius: 999px;
    background: var(--dpk-accent);
    color: var(--dpk-accent-ink);
    font-size: 9px;
    line-height: 12px;
  }

  /* Shown on the board under the pointer or keyboard focus, opposite its count. */
  .dpk-page-tab-remove {
    position: absolute;
    top: -3px;
    left: -3px;
    display: grid;
    place-items: center;
    width: 18px;
    height: 18px;
    padding: 0;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: 999px;
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink-soft);
    cursor: pointer;
    opacity: 0;
    transition: opacity 120ms var(--dpk-ease);
  }

  .dpk-page-tab-remove svg {
    width: 11px;
    height: 11px;
  }

  .dpk-page-tab-remove:hover {
    color: var(--dpk-danger, var(--dpk-ink));
  }

  .dpk-page-tab-item:hover > .dpk-page-tab-remove,
  .dpk-page-tab-item:focus-within > .dpk-page-tab-remove {
    opacity: 1;
  }

  .dpk-page-add {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    margin-top: 2px;
    padding: 0;
    border: 1px dashed var(--dpk-rule-strong);
    border-radius: var(--dpk-radius);
    background: transparent;
    color: var(--dpk-ink-soft);
    cursor: pointer;
  }

  .dpk-page-add:hover,
  .dpk-page-add[aria-expanded='true'] {
    border-style: solid;
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink);
  }

  .dpk-page-add svg {
    width: 16px;
    height: 16px;
  }

  .dpk-page-add-option .dpk-settings-check svg {
    width: 16px;
    height: 16px;
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

  .dpk-page-boards {
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

  #boardsReady = false;
  /** Set once the page's own draft exists; boards find no host before that. */
  #started = false;
  /** The boards the page's base was last read from, so only a real change re-reads it. */
  #baseIds = '';
  /** The page draft each board was last given, so a render that changed nothing gives nothing. */
  #mirrored = new WeakMap<BoardElement, readonly DraftAction[]>();
  /** Whether each board has read its base: a board is given its part of the draft only after that. */
  readonly #ready = new WeakMap<BoardElement, boolean>();
  readonly #catalogs = new Map<Locale, readonly AnyDefinition[]>();
  #host: BoardHost | undefined;
  #addOpen = false;
  readonly #popovers = new PopoverController(this);

  constructor() {
    super();
    new DismissController(this, {
      open: () => this.#addOpen,
      closesOn: (path) =>
        !path.some((node) => node instanceof Element && (node.id === ADD_MENU_ID || node.matches('.dpk-page-add'))),
      ownsEscape: () => true,
      dismiss: () => this.#setAddOpen(false),
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
    void this.api.ready.then(() => {
      this.#started = true;
      this.#baseIds = this.#idsOf(this.#markupBoards());
      this.requestUpdate();
    });
  }

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
      definition: board.definition,
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
      const tag = `dpk-template-${name}`;
      if (customElements.get(tag) === undefined) return [];
      const element = document.createElement(tag);
      element.setAttribute('lang', locale);
      const definition: unknown = 'definition' in element ? element.definition : undefined;
      return isDefinition(definition) ? [definition] : [];
    });
    // A template whose entry is not loaded yet is looked for again next time.
    if (definitions.length === templates.length) this.#catalogs.set(locale, definitions);
    return definitions;
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
    });
  }

  /** The page's own JSON and questions are its children, not its boards'. */
  protected override scriptOf(selector: string): Element | null {
    return this.querySelector(`:scope > ${selector}`);
  }

  protected override hasSidebarContent(): boolean {
    return false;
  }

  protected override hasFooterContent(): boolean {
    return this.querySelector(':scope > [slot="footer"]') !== null;
  }

  protected override buildBrief(snapshot: TemplateSnapshot<PageState>): string {
    const specs = snapshot.state.layout.flatMap((entry): BoardSpec[] => {
      const definition = this.#definitionOf(entry);
      return definition === undefined ? [] : [{ id: entry.id, label: entry.label, definition }];
    });
    return withBoards(super.buildBrief(snapshot), boardsSection(specs, snapshot.actions));
  }

  /** The header names the template of the board it shows. */
  protected override templateIdentity(): { readonly label: string; readonly name: string } {
    const active = this.#started ? this.#activeEntry(this.api.state, this.navigation) : undefined;
    return (active === undefined ? undefined : this.#definitionOf(active)) ?? super.templateIdentity();
  }

  #activeEntry(state: PageState, navigation: Readonly<Record<string, string>>): BoardLayout | undefined {
    return state.layout.find((entry) => entry.id === navigation[BOARD_KEY]);
  }

  protected override renderRegions(context: TemplateRenderContext<PageState>): ShellRegions {
    const messages = pageMessages(this.locale);
    const layout = context.state.layout;
    const active = this.#activeEntry(context.state, context.navigation);
    const catalog = this.#catalog();
    return {
      sidebarHidden: true,
      header: active === undefined ? nothing : this.#renderHeading(context, active),
      main: html`<div class="dpk-page">
        <nav class="dpk-page-rail" aria-label=${messages.boards}>
          <div
            class="dpk-page-tabs"
            role="tablist"
            aria-orientation="vertical"
            @keydown=${(event: KeyboardEvent) => this.#onRailKey(event, layout)}
          >
            ${layout.map((entry) =>
              this.#renderTab(entry, entry.id === active?.id, sliceOf(context.actions, entry.id).length, layout.length),
            )}
          </div>
          ${
            catalog.length === 0
              ? nothing
              : html`<button
                  class="dpk-page-add"
                  type="button"
                  aria-label=${messages.addBoard}
                  title=${messages.addBoard}
                  aria-haspopup="menu"
                  aria-controls=${ADD_MENU_ID}
                  aria-expanded=${this.#addOpen ? 'true' : 'false'}
                  @click=${() => this.#setAddOpen(!this.#addOpen)}
                >
                  ${iconPlus()}
                </button>`
          }
          ${this.#addOpen ? this.#renderAddMenu(catalog) : nothing}
        </nav>
        <div class="dpk-page-boards"><slot @slotchange=${() => this.#onBoardsChange()}></slot></div>
      </div>`,
    };
  }

  /** The board the page shows, after the page's title, with that board's settings beside it. */
  #renderHeading(context: TemplateRenderContext<PageState>, entry: BoardLayout): TemplateResult {
    const board = this.#boards().find((element) => element.board === entry.id);
    const settings = board?.definition.settings?.(context.state.boards[entry.id]);
    const hasSettings = board !== undefined && settings !== undefined && settings.items.length > 0;
    const messages = coreMessages(this.locale);
    const intents = {
      toggle: () => {
        this.settingsOpen = !this.settingsOpen;
      },
      flip: (input: Parameters<BoardElement['api']['dispatch']>[0]) => void board?.api.dispatch(input),
    };
    return html`<div class="dpk-page-heading ${SETTINGS_ANCHOR}">
      <span class="dpk-page-crumb">${this.#iconOf(entry.template)()} ${entry.label}</span>
      ${hasSettings ? renderSettingsTrigger(this.settingsOpen, messages, intents) : nothing}
      ${hasSettings && this.settingsOpen ? renderSettingsMenu(settings, messages, intents) : nothing}
    </div>`;
  }

  #renderTab(entry: BoardLayout, selected: boolean, pending: number, boards: number): TemplateResult {
    const messages = pageMessages(this.locale);
    const template = this.#definitionOf(entry)?.label ?? entry.template;
    return html`<div class="dpk-page-tab-item" role="presentation">
      <button
        class="dpk-page-tab"
        type="button"
        role="tab"
        data-board=${entry.id}
        aria-selected=${selected ? 'true' : 'false'}
        tabindex=${selected ? 0 : -1}
        title=${`${entry.label} · ${template}`}
        @click=${() => this.navigate({ [BOARD_KEY]: entry.id })}
      >
        <span class="dpk-page-tab-icon">${this.#iconOf(entry.template)()}</span>
        <span class="dpk-page-tab-label">${entry.label}</span>
        ${pending > 0 ? html`<span class="dpk-page-tab-count">${pending}</span>` : nothing}
      </button>
      ${
        boards > 1
          ? html`<button
              class="dpk-page-tab-remove"
              type="button"
              data-board=${entry.id}
              tabindex="-1"
              aria-label=${messages.removeBoard(entry.label)}
              title=${messages.removeBoard(entry.label)}
              @click=${() => this.#removeBoard(entry.id)}
            >
              ${iconClose()}
            </button>`
          : nothing
      }
    </div>`;
  }

  #renderAddMenu(catalog: readonly AnyDefinition[]): TemplateResult {
    const messages = pageMessages(this.locale);
    return html`<div
      id=${ADD_MENU_ID}
      class="dpk-settings dpk-page-add-menu"
      popover="manual"
      role="menu"
      aria-label=${messages.addBoard}
    >
      ${catalog.map(
        (definition) =>
          html`<button
            class="dpk-settings-option dpk-page-add-option"
            type="button"
            role="menuitem"
            data-template=${definition.name}
            @click=${() => this.#addBoard(definition)}
          >
            <span class="dpk-settings-check" aria-hidden="true">${this.#iconOf(definition.name)()}</span>
            <span class="dpk-settings-text"><span class="dpk-settings-name">${definition.label}</span></span>
          </button>`,
      )}
    </div>`;
  }

  #setAddOpen(open: boolean): void {
    if (this.#addOpen === open) return;
    this.#addOpen = open;
    this.requestUpdate();
  }

  /** A new board is a change of the draft; the rail shows it at once. */
  #addBoard(definition: AnyDefinition): void {
    this.#setAddOpen(false);
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

  /** The rail is a vertical tab list: arrows, Home and End move to a board and show it. */
  #onRailKey(event: KeyboardEvent, layout: readonly BoardLayout[]): void {
    const current = layout.findIndex((entry) => entry.id === this.navigation[BOARD_KEY]);
    const last = layout.length - 1;
    const next =
      event.key === 'ArrowDown'
        ? Math.min(last, current + 1)
        : event.key === 'ArrowUp'
          ? Math.max(0, current - 1)
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null;
    const entry = next === null ? undefined : layout[next];
    if (entry === undefined) return;
    event.preventDefault();
    this.navigate({ [BOARD_KEY]: entry.id });
    void this.updateComplete.then(() =>
      this.renderRoot.querySelector<HTMLElement>(`.dpk-page-tab[data-board="${entry.id}"]`)?.focus(),
    );
  }

  protected override updated(): void {
    super.updated();
    this.#placeAddMenu();
    this.#syncBoards();
  }

  #placeAddMenu(): void {
    const menu = this.renderRoot.querySelector<HTMLElement>(`#${ADD_MENU_ID}`);
    const anchor = this.renderRoot.querySelector('.dpk-page-add');
    if (!menu || !anchor || isPopoverOpen(menu)) return;
    this.#popovers.open(menu, anchor, ADD_MENU_SIZE, { placement: 'right-end' });
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
