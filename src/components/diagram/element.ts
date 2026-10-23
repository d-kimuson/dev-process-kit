import { LitElement, html, nothing, type CSSResultGroup, type TemplateResult } from 'lit';

import type { ContextMenuGroup, ContextMenuRequest } from '../../core/context-menu/types';
import type { TemplateApi } from '../../core/shell/contracts';
import type {
  ActionInput,
  BatchDispatchOutcome,
  CommentTargetOption,
  DispatchOutcome,
  DraftAction,
  TemplateDefinition,
} from '../../core/types';
import type { ViewportAlign, ViewportBox, ViewportController, ViewState } from './viewport';

import { COMMENT_ACTION } from '../../core/action';
import { contextMenuMessages } from '../../core/context-menu/messages';
import { DraftController } from '../../core/controller';
import { diagramBoardDefinition, type DiagramBoardState } from '../../core/diagram-board';
import { elementActionsFor, type ElementActionResult } from '../../core/element-actions';
import { type Locale } from '../../core/i18n';
import { LocaleController } from '../../core/locale-controller';
import { resolveBoardTarget } from '../../core/page/board-target';
import { boardHostOf, boardIdOf } from '../../core/page/host';
import { createTemplateApi, snapshotOf, type TemplateFacadeSource } from '../../core/shell/api';
import { toTarget } from '../../core/target';
import { observeJsonChild } from '../../lib/dom/base-data';
import {
  applyPositionOverrides,
  fixedLayout,
  layeredLayout,
  type LayoutEdgeSpec,
  type LayoutNodeSpec,
  type LayoutOptions,
  type LayoutPoint,
  type LayoutResult,
  type PlacedNode,
} from '../../lib/layout/layered';
import { CommentPopoverController, reviewCommentMenuGroup } from '../comment-composer/controller';
import { defineDialogPanel, type DpkDialogPanel } from '../dialog-panel/index';
import { defineTagFilter } from '../tag-filter/index';
import { beginGroupDrag, beginNodeDrag, IDLE_DRAG, updateDrag, type DragGesture } from './drag-gesture';
import { diagramMessages, type DiagramMessages } from './messages';
import {
  classNames,
  EMPTY_REACH,
  EMPTY_TAG_STATE,
  stateOf,
  tagCounts,
  tagStateMatches,
  type DiagramData,
  type DiagramEdgeInput,
  type DiagramNodeInput,
  type DiagramSelection,
  type ElementState,
  type GraphSelection,
  type Reach,
  type SelectionRef,
  type TagState,
} from './model';
import { PositionController } from './position-controller';
import { presentStats } from './present';
import { chromeStyles, diagramStyles } from './styles';
import { arrowDefinitions, type ArrowDefinition } from './view';

/** What a diagram drives of its canvas: the canvas methods of `<dpk-dialog-panel canvas>`. */
export type DiagramViewport = Pick<
  ViewportController,
  'apply' | 'fit' | 'fitTo' | 'fitWidth' | 'reset' | 'zoom' | 'view'
>;

/**
 * Everything an element built on `<dpk-dialog-panel>` has regardless of
 * whether its body is a canvas: data intake, the tag filter, selection,
 * contextual comments, the empty state and the shell's actions/toolbar slots.
 *
 * The shell and the tag row are the public elements `<dpk-dialog-panel>`
 * and `<dpk-tag-filter>`: an author composing them by hand gets the
 * same frame, controls and filter as the built-in elements.
 *
 * `DiagramChromeElement` below adds the pan/zoom canvas on top of this for
 * the diagrams proper; a document-flow element like the kanban extends this
 * class directly and lays its body out with ordinary CSS instead.
 */
/**
 * How a diagram renders (ADR 20261023_diagram-as-board): `embedded`, today's
 * behavior inside a template (can be maximized), or `board`, fixed full-screen
 * chrome fit to use the diagram as a whole board of `<dpk-page>`. Orthogonal
 * to whether the diagram actually acts as a board — that is the `board`
 * attribute (set by the page) alone, exactly like a template.
 */
export type DiagramVariant = 'embedded' | 'board';

const VARIANT_CONVERTER = {
  fromAttribute: (value: string | null): DiagramVariant => (value === 'board' ? 'board' : 'embedded'),
  toAttribute: (value: DiagramVariant): string => value,
};

/**
 * Narrows an `ActionInput.payload` (`unknown`, since the pipeline carries
 * every template's payload shape alike) back to the plain object
 * `dispatchElementAction` expects — a type predicate so a `#dispatch` helper
 * that forwards an own action-creator's `ActionInput` into it narrows by
 * checking, never by asserting.
 */
export const isActionPayload = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null;

export abstract class ElementChromeBase<D, S extends SelectionRef = GraphSelection> extends LitElement {
  static override styles: CSSResultGroup = chromeStyles;
  static override properties = {
    data: { attribute: false },
    id: { type: String, reflect: true },
    heading: { type: String },
    subject: { type: String },
    variant: { type: String, reflect: true, converter: VARIANT_CONVERTER },
  };

  /** Element data as a typed property. The JSON child is the HTML-side path. */
  declare data: D | null;
  /** Toolbar title; falls back to the component's own default. */
  declare heading: string | null;
  /** Toolbar subtitle, e.g. `Order lifecycle`. */
  declare subject: string | null;
  /** `embedded` (default) or `board`; see `DiagramVariant`. */
  declare variant: DiagramVariant;

  /** The authored data, before this element's element actions. */
  #authored: D | null = null;
  /** `#authored` with the element actions replayed: what the component shows. */
  #items: D | null = null;
  #elementActions: readonly DraftAction[] = [];
  #elementResults: readonly ElementActionResult[] = [];
  #dataError: string | null = null;
  #tags: TagState = EMPTY_TAG_STATE;
  #selection: S | null = null;
  #stopJsonChild: (() => void) | null = null;
  #targetSignature = '';
  readonly #commentPopover = new CommentPopoverController(this);
  readonly #i18n = new LocaleController(this, () => {
    this.#targetSignature = '';
  });
  /**
   * Set only once this element acts as its own board (ADR
   * 20261023_diagram-as-board): a `DraftController` driven by
   * `diagramBoardDefinition`, exactly what a `TemplateElement` keeps for
   * itself. Forwards to the page when hosted (`board !== null`), like any
   * other board; owns real persistence standalone.
   */
  #boardController: DraftController<DiagramBoardState> | null = null;
  #boardApi: TemplateApi<DiagramBoardState> | null = null;

  constructor() {
    super();
    this.id = this.getAttribute('id') ?? '';
    this.data = null;
    this.heading = null;
    this.subject = null;
    this.variant = VARIANT_CONVERTER.fromAttribute(this.getAttribute('variant'));
  }

  override connectedCallback(): void {
    // The shell is made of these; a page that registers only this element still gets them.
    defineDialogPanel();
    defineTagFilter();
    super.connectedCallback();
    this.#targetSignature = '';
    this.requestUpdate();
    this.#stopJsonChild = observeJsonChild(
      this,
      (input) => this.parseData(input),
      (result) => {
        if (result.ok) this.#applyData(result.value);
        else this.#failData(result.error);
      },
    );
    // A board's children are its own; an enclosing page's provider scan must
    // not also treat this element as a flat, directly-owned component.
    if (this.board !== null) this.#ensureBoardController();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#stopJsonChild?.();
    this.#stopJsonChild = null;
  }

  protected override willUpdate(changed: Map<PropertyKey, unknown>): void {
    if (changed.has('data') && this.data !== null) this.#applyData(this.data);
  }

  protected override updated(): void {
    this.#syncTargets();
    this.#commentPopover.sync(this.renderRoot.querySelector<HTMLElement>('.comment-pop'));
  }

  #syncTargets(): void {
    const signature = JSON.stringify([this.commentTargets, this.#elementResults]);
    if (signature !== this.#targetSignature) {
      this.#targetSignature = signature;
      this.dispatchEvent(new CustomEvent('dpk-comment-targets-change', { bubbles: true, composed: true }));
    }
  }

  // ------------------------------------------------------------------- public

  /** Full-data targets: filtering or folding the view never makes a comment stale. */
  get commentTargets(): readonly CommentTargetOption[] {
    if (!this.id || this.#dataError !== null) return [];
    const group = `${this.subject ?? this.heading ?? this.defaultHeading()} · ${this.id}`;
    return this.commentItems().map((item) => ({ ...item, group }));
  }

  protected commentItems(): readonly CommentTargetOption[] {
    return [];
  }

  /**
   * The provider segment is this element's own `id` when the author set one
   * (several embedded siblings need it to tell their elements apart) — or,
   * failing that, its `board` (unique page-wide already, by the same rule a
   * board id follows) or its tag name as a last resort. Without this fallback
   * a diagram-as-board left without an `id` (`docs/components/diagrams.md`'s
   * own Board hosting example has none) produces an empty provider segment,
   * which `componentTargetSchema`/`providerOf` (`core/element-actions.ts`)
   * reject as not a component reference at all — every element action on it
   * then looks up its type against the board's own (empty) action map instead
   * of the generic element-action descriptor, and is rejected as unknown.
   * `#onBoardChange` below reads back actions/results under this same id, so
   * it uses this identical fallback rather than `this.id` directly.
   */
  #providerId(): string {
    return this.id !== '' ? this.id : (this.board ?? this.tagName.toLowerCase());
  }

  protected commentRef(kind: string, ...ids: readonly string[]): string {
    return `element:${[this.#providerId(), kind, ...ids].map((id) => encodeURIComponent(id)).join('/')}`;
  }

  /**
   * The draft actions the hosting template recorded against this element, in
   * order. The host assigns them; the element replays them over its data.
   */
  get elementActions(): readonly DraftAction[] {
    return this.#elementActions;
  }

  set elementActions(actions: readonly DraftAction[]) {
    this.#elementActions = actions;
    this.#replay();
  }

  /** How each element action applied, for the host's review list. */
  get elementActionResults(): readonly ElementActionResult[] {
    return this.#elementResults;
  }

  // -------------------------------------------------------- board hosting

  /**
   * The id this element has as a board of `<dpk-page>` (ADR
   * 20261023_diagram-as-board), or `null` outside one — exactly
   * `TemplateElement`'s own notion of `board`, read from the same attribute.
   */
  get board(): string | null {
    return boardIdOf(this);
  }

  /** The board's definition name: the page's `BoardLayout.template`. Override for a stable name. */
  protected boardName(): string {
    return this.tagName.toLowerCase();
  }

  /** The board's label, shown in the page's switcher and review list. */
  protected boardLabel(): string {
    return this.heading ?? this.defaultHeading();
  }

  /**
   * Read fresh on every access: a page reads this directly (its own global
   * comment composer, the add-board catalog), so it always carries this
   * element's current comment targets and element-action results.
   */
  get definition(): TemplateDefinition<DiagramBoardState> {
    return diagramBoardDefinition({
      name: this.boardName(),
      label: this.boardLabel(),
      commentTargets: () => this.commentTargets,
      elementActionResults: () => this.elementActionResults,
    });
  }

  /** The draft controller this element owns when it acts as its own board. */
  get controller(): DraftController<DiagramBoardState> {
    return this.#ensureBoardController();
  }

  /** The public API surface a board of `<dpk-page>` is expected to carry. */
  get api(): TemplateApi<DiagramBoardState> {
    this.#boardApi ??= createTemplateApi(this.#boardFacadeSource(), this);
    return this.#boardApi;
  }

  #ensureBoardController(): DraftController<DiagramBoardState> {
    if (this.#boardController) return this.#boardController;
    const hosted = this.board !== null;
    // Bare: no live comment targets/results baked in here, since this
    // definition is captured once by the controller. Freshness instead comes
    // from `setComponentSnapshot`, below — the same mechanism an embedded
    // component's host template already uses for itself.
    const definition = diagramBoardDefinition({ name: this.boardName(), label: this.boardLabel() });
    const controller = new DraftController<DiagramBoardState>(
      hosted ? { definition, base: {}, storage: null } : { definition, base: {} },
    );
    this.#boardController = controller;
    if (hosted) this.dataset['template'] = definition.name;
    controller.subscribe(() => this.#onBoardChange());
    this.#onBoardChange();
    return controller;
  }

  /** Keeps the board controller's own notion of this element's targets/results current. */
  #onBoardChange(): void {
    const controller = this.#boardController;
    if (!controller) return;
    const provider = this.#providerId();
    this.elementActions = elementActionsFor(controller.actions, provider);
    controller.setComponentSnapshot({
      targets: this.commentTargets,
      providers: [{ id: provider, results: this.elementActionResults }],
    });
  }

  #boardFacadeSource(): TemplateFacadeSource<DiagramBoardState> {
    const controller = (): DraftController<DiagramBoardState> => this.#ensureBoardController();
    const source: TemplateFacadeSource<DiagramBoardState> = {
      definition: this.definition,
      controller,
      derivation: () => controller().derivation,
      ready: Promise.resolve(),
      navigation: () => ({}),
      issues: () => controller().lastIssues,
      dispatch: (input) => this.#dispatchBoard(input),
      dispatchBatch: (inputs) => this.#dispatchBoardBatch(inputs),
      subscribe: (listener) => controller().subscribe(() => listener(snapshotOf(source))),
      editComment: (id, body) => controller().editComment(id, body),
      removeAction: (id) => controller().removeAction(id),
      clearActions: () => controller().clearActions(),
      navigate: () => {},
      hashFor: () => '',
      // No page-level "request a comment on this" picker reaches a diagram
      // board directly; its own contextual composer covers that.
      requestComment: () => {},
    };
    return source;
  }

  /** A target this element names, resolved into the page's terms when hosted. */
  #toPageInput(input: ActionInput): ActionInput {
    const controller = this.#ensureBoardController();
    const fallbackType = controller.descriptorFor(input.type)?.targetType ?? 'element';
    const resolved = toTarget(input.target, fallbackType);
    const board = this.board;
    if (board === null) return { ...input, target: resolved };
    const boards = boardHostOf(this)?.boardIds() ?? new Set<string>();
    return { ...input, target: resolveBoardTarget(resolved, board, boards) };
  }

  /**
   * Dispatches into this element's own board draft: forwarded to the page
   * when hosted (exactly `TemplateElement.dispatch()`'s own branching), or
   * into its own, self-persisted controller standalone.
   */
  #dispatchBoard(input: ActionInput): DispatchOutcome {
    const host = this.board !== null ? boardHostOf(this) : null;
    if (host === null) return this.#ensureBoardController().dispatch(input);
    return host.dispatch(this.#toPageInput(input));
  }

  #dispatchBoardBatch(inputs: readonly ActionInput[]): BatchDispatchOutcome {
    const host = this.board !== null ? boardHostOf(this) : null;
    if (host === null) return this.#ensureBoardController().dispatchBatch(inputs);
    return host.dispatchBatch(inputs.map((input) => this.#toPageInput(input)));
  }

  /**
   * Replays element actions over the authored data. Pure: the result depends
   * only on the arguments. Elements that accept no actions report every one as
   * unsupported.
   */
  protected reduceElementActions(
    data: D,
    actions: readonly DraftAction[],
  ): { readonly data: D; readonly results: readonly ElementActionResult[] } {
    return {
      data,
      results: actions.map((action) => ({ id: action.id, title: action.type, stale: 'unsupported-action-type' })),
    };
  }

  /**
   * Asks the hosting template to record an action against one of this
   * element's own elements — or, acting as its own board, records it on its
   * own draft directly. `true` once accepted; by then the action is already
   * replayed into `items()`.
   */
  protected dispatchElementAction(
    type: string,
    element: readonly [kind: string, ...ids: string[]],
    payload: Readonly<Record<string, unknown>>,
  ): boolean {
    const target = this.commentRef(...element);
    if (this.board !== null) return this.#dispatchBoard({ type, target, payload }).ok;
    const event = new CustomEvent('dpk-element-action', {
      detail: { type, target, payload },
      bubbles: true,
      composed: true,
      cancelable: true,
    });
    this.dispatchEvent(event);
    return event.defaultPrevented;
  }

  get selection(): S | null {
    return this.#selection;
  }

  select(selection: S | null): void {
    this.#select(selection);
  }

  get tagFilter(): TagState {
    return this.#tags;
  }

  set tagFilter(state: TagState) {
    this.#tags = state;
    this.requestUpdate();
  }

  /** Data problem from a malformed JSON child; the body shows it instead. */
  get dataError(): string | null {
    return this.#dataError;
  }

  /** Closes an open contextual composer, e.g. because the shell just maximized or restored. */
  protected closeComposer(): void {
    this.#commentPopover.close();
  }

  // ------------------------------------------------- subclass responsibilities

  /** The language of the page around this element, resolved on connect. */
  protected get locale(): Locale {
    return this.#i18n.locale;
  }

  /** The shared chrome's text in `locale`. */
  protected get chromeMessages(): DiagramMessages {
    return diagramMessages(this.#i18n.locale);
  }

  /** Validates one JSON payload into the component's domain data. */
  protected abstract parseData(input: unknown): D;

  /** Data used when nothing was supplied; usually empty collections. */
  protected abstract emptyData(): D;

  /**
   * Selection UI. It lives in the top layer, beside the element it is about, so
   * selecting never resizes the body. It is the comment composer the board's
   * right-click "Review comment" item opened.
   */
  protected renderSelection(): TemplateResult | typeof nothing {
    return this.#commentPopover.render({
      locale: this.#i18n.locale,
      errorMessage: this.chromeMessages.sendFailed,
      submit: (target, body) => this.#submitComment(target, body),
    });
  }

  /**
   * The right-click menu's generic "Review comment" item: offered whenever
   * the resolved target matches one of this element's own `commentTargets`.
   * A subclass that adds its own groups (e.g. the graph diagrams' "Reset
   * positions") calls this and merges in its own.
   */
  getContextMenuItems(request: ContextMenuRequest): readonly ContextMenuGroup[] | null {
    const group = reviewCommentMenuGroup(
      request.target,
      this.commentTargets,
      contextMenuMessages(this.locale),
      (ref, label) => this.#openCommentPopover(ref, label),
    );
    return group === null ? null : [group];
  }

  #openCommentPopover(ref: string, label: string): void {
    const anchor = this.renderRoot.querySelector<Element>(`[data-dpk-target="${CSS.escape(ref)}"]`);
    if (anchor === null) return;
    this.#commentPopover.open(ref, anchor, label);
  }

  /**
   * `data-grill-questions` for a rendered element, or `nothing` when the data
   * carries no references. The shell's grill (ADR 20261016_grill-in-core)
   * places a badge per reference; it reaches into this shadow root to find
   * them.
   */
  protected questionsOf(item: { readonly questions?: string | null }): string | typeof nothing {
    const value = item.questions?.trim();
    return value === undefined || value === '' ? nothing : value;
  }

  protected statsText(): string {
    return '';
  }

  /** Tags offered by the filter row. */
  protected tagItems(): readonly (readonly string[])[] {
    return [];
  }

  protected isEmpty(): boolean {
    return false;
  }

  /** Extra class on the shell, for component-specific chrome styling. */
  protected shellClass(): string {
    return '';
  }

  /**
   * Whether this element's `<dpk-dialog-panel>` frame offers maximize and
   * resize: true for `embedded` (today's chrome), false for `board` — a
   * full-page board frame already fills the page (ADR
   * 20261023_diagram-as-board), so neither affordance makes sense. Every
   * subclass passes this straight through as `maximizable`/`resizable`
   * instead of re-deriving `variant !== 'board'` on its own.
   */
  protected get frameControls(): boolean {
    return this.variant !== 'board';
  }

  protected defaultHeading(): string {
    return '';
  }

  protected defaultSubject(): string {
    return '';
  }

  protected emptyMessage(): string {
    return this.chromeMessages.noMatches;
  }

  /** Component-specific toolbar controls, before the stats line. */
  protected renderToolbarActions(): TemplateResult | typeof nothing {
    return nothing;
  }

  // ------------------------------------------------------------------ helpers

  protected items(): D {
    return this.#items ?? this.emptyData();
  }

  /** The data as authored, without the element actions. */
  protected authoredItems(): D {
    return this.#authored ?? this.emptyData();
  }

  /** `<div slot="actions">`: the component's own toolbar controls plus the stats pill. */
  protected renderToolbarActionsSlot(): TemplateResult {
    return html`<div slot="actions" class="diagram-toolbar-actions">
      ${this.renderToolbarActions()}
      <span class="diagram-stats">${this.statsText()}</span>
    </div>`;
  }

  /** `<div slot="toolbar">`: the tag filter, plus anything a canvas element renders above its body. */
  protected renderTagFilterRow(extra: TemplateResult | typeof nothing = nothing): TemplateResult {
    return html`<div slot="toolbar" class="diagram-toolbar-rows">
      <dpk-tag-filter
        .tags=${tagCounts(this.tagItems())}
        .active=${this.#tags.active}
        .match=${this.#tags.match}
        @dpk-tag-filter-change=${(event: CustomEvent<TagState>) => {
          event.stopPropagation();
          this.#tags = { active: event.detail.active, match: event.detail.match };
          this.requestUpdate();
        }}
      ></dpk-tag-filter>
      ${extra}
    </div>`;
  }

  // ---------------------------------------------------------------- internals

  #applyData(items: D): void {
    this.#dataError = null;
    this.#authored = items;
    this.#replay();
  }

  #replay(): void {
    if (this.#authored === null) {
      // Nothing to replay onto: the actions' elements do not exist here.
      this.#elementResults = this.#elementActions.map((action) => ({
        id: action.id,
        title: action.type,
        stale: 'target-missing',
      }));
      this.requestUpdate();
      return;
    }
    const replayed = this.reduceElementActions(this.#authored, this.#elementActions);
    this.#items = replayed.data;
    this.#elementResults = replayed.results;
    if (this.#selection !== null) {
      const exists = this.hasSelection(this.#selection);
      if (!exists) this.#selection = null;
    }
    this.requestUpdate();
  }

  /**
   * A board owns its own draft and comments go straight into it; an embedded
   * diagram instead asks its enclosing template to save the comment, which
   * cancels the event once it has. `true` once accepted.
   */
  #submitComment(target: string, body: string): boolean {
    return this.board !== null
      ? this.#dispatchBoard({ type: COMMENT_ACTION, target, payload: { body } }).ok
      : !this.dispatchEvent(
          new CustomEvent('dpk-comment-submit', {
            detail: { target, body },
            bubbles: true,
            composed: true,
            cancelable: true,
          }),
        );
  }

  #failData(error: string): void {
    this.#dataError = error;
    this.#authored = null;
    this.#items = null;
    this.#replay();
    console.error('[dev-process-kit] invalid element data:', error);
    this.requestUpdate();
  }

  /** Whether a still-existing element carries this id (guards stale selections). */
  protected hasSelection(_selection: S): boolean {
    return true;
  }

  #select(selection: S | null): void {
    const same =
      selection === null
        ? this.#selection === null
        : this.#selection !== null && this.#selection.kind === selection.kind && this.#selection.id === selection.id;
    if (same) return;
    this.#selection = selection;
    this.dispatchEvent(new CustomEvent('dpk-diagram-select', { detail: { selection }, bubbles: true, composed: true }));
    this.requestUpdate();
  }

  /** Recompute derived content for this render (layout, relations, rows). */
  protected refreshContent(): void {}

  /** Call at the top of `render()`: refreshes derived content before the subclass draws it. */
  protected prepareRender(): void {
    this.refreshContent();
  }
}

/**
 * Everything a pan/zoom diagram adds on top of `ElementChromeBase`: the
 * viewport sizing, the world box, the legend, and the empty/error notices
 * placed over the canvas.
 *
 * Components that are graphs (state, dependency, ER, map) extend `DiagramElement`
 * below for layout as well; the sequence diagram uses this class directly because
 * its content is rows, not nodes.
 */
export abstract class DiagramChromeElement<D, S extends SelectionRef = GraphSelection> extends ElementChromeBase<D, S> {
  static override styles: CSSResultGroup = diagramStyles;

  #lastLayoutVersion = -1;
  #lastFocusKey: string | null = null;

  constructor() {
    super();
    // Capture: before the panel, which restores on an Escape nobody used.
    this.addEventListener('keydown', this.#holdEscape, { capture: true });
  }

  protected override updated(): void {
    super.updated();
    void this.#syncViewport();
  }

  /**
   * Hands the content box to the viewport, then opens the view once per layout.
   * The box is measured here, after render, because some content is sized by
   * the browser.
   */
  async #syncViewport(): Promise<void> {
    const viewport = this.#viewportElement();
    if (!viewport) return;
    const size = this.contentSize();
    viewport.contentWidth = size?.width ?? 0;
    viewport.contentHeight = size?.height ?? 0;
    await viewport.updateComplete;
    if (size === null) return;
    const version = this.layoutVersion();
    if (version !== this.#lastLayoutVersion) {
      this.#lastLayoutVersion = version;
      this.initialView();
    }
    const focus = this.focusBounds();
    const focusKey = this.focusKey();
    if (focusKey !== this.#lastFocusKey) {
      this.#lastFocusKey = focusKey;
      if (focus !== null) this.viewport?.fitTo(focus);
      else this.fitViewport();
    }
  }

  #viewportElement(): DpkDialogPanel | null {
    return this.renderRoot.querySelector<DpkDialogPanel>('dpk-dialog-panel');
  }

  resetView(): void {
    this.fitViewport();
  }

  /** Escape clears a selection first (the canvas does that); only with none does a maximized shell restore. */
  readonly #holdEscape = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.selection !== null) event.preventDefault();
  };

  // ------------------------------------------------- subclass responsibilities

  /** Draws the world. */
  protected abstract renderCanvas(): TemplateResult;

  /** World size, or `null` when there is nothing to lay out. */
  protected abstract contentSize(): { readonly width: number; readonly height: number } | null;

  /** Changes when the content should be re-fitted (a new layout, a filter). */
  protected layoutVersion(): number {
    return 0;
  }

  protected fitViewport(): void {
    if (this.fitMode() === 'width') this.viewport?.fitWidth();
    else this.viewport?.fit();
  }

  /** What fitting means for this content: all of it, or its width (tall content read by scrolling). */
  protected fitMode(): 'all' | 'width' {
    return 'all';
  }

  /**
   * The view the diagram opens in: 100%, so the reader sees real size rather
   * than whatever shrinking made the whole diagram fit. Fitting stays available
   * through the zoom control.
   */
  protected initialView(): void {
    this.viewport?.reset();
  }

  /** Where the content sits on an axis it fits: in the middle, or at the top-left corner. */
  protected viewAlign(): ViewportAlign {
    return 'center';
  }

  /**
   * A sub-region of the content to pan/zoom to instead of the usual fitted or
   * reset view (e.g. a chosen bounded context in the ER diagram). `null` means
   * no focus is active; the view then falls back to {@link fitViewport}.
   */
  protected focusBounds(): ViewportBox | null {
    return null;
  }

  /**
   * Whether the focus has changed enough to re-fit the view. Defaults to the
   * box itself, but a subclass whose box is derived from measured, re-laid-out
   * geometry should key this on the underlying *selection* instead (e.g. which
   * group is chosen) — otherwise a re-measured card that nudges the box by a
   * sub-pixel re-opens the view, which can re-trigger the very remeasurement
   * that moved it, looping forever between a slightly different zoom and a
   * slightly different measured size.
   */
  protected focusKey(): string | null {
    const focus = this.focusBounds();
    return focus === null ? null : JSON.stringify(focus);
  }

  /** Mirrors the pan/zoom into component-owned chrome (the participant rail). */
  protected onViewChange(_view: ViewState): void {}

  /**
   * The panel entered or left fullscreen: its canvas just changed shape and
   * size, so a view fitted to the old one (see {@link initialView}) can leave
   * content clipped or shrunk pointlessly small in the new one. A no-op here
   * keeps the reader's deliberate zoom/pan across the toggle, which is right
   * for content that opens at a truthful 100%; a diagram that opens fitted
   * instead should re-fit here too.
   */
  protected onMaximizeChange(_maximized: boolean): void {}

  protected override isEmpty(): boolean {
    return this.contentSize() === null;
  }

  protected renderLegend(): TemplateResult | typeof nothing {
    return nothing;
  }

  /** Rendered between the tag row and the canvas (the sequence participant rail). */
  protected renderAboveCanvas(): TemplateResult | typeof nothing {
    return nothing;
  }

  /** A component's own buttons in the floating bottom-right controls bar, beside zoom and maximize. */
  protected renderControls(): TemplateResult | typeof nothing {
    return nothing;
  }

  // ------------------------------------------------------------------ helpers

  protected get viewport(): DiagramViewport | null {
    const element = this.#viewportElement();
    if (element === null) return null;
    return {
      apply: () => element.apply(),
      fit: () => element.fit(),
      fitTo: (box) => element.fitTo(box),
      fitWidth: () => element.fitWidth(),
      reset: (corner) => element.reset(corner),
      zoom: (factor) => element.zoom(factor),
      view: () => element.view,
    };
  }

  protected elementClass(state: ElementState, ...extra: readonly (string | false | null | undefined)[]): string {
    return classNames(
      ...extra,
      state.selected && 'is-selected',
      state.related && 'is-related',
      state.dimmed && 'is-dimmed',
    );
  }

  protected override render(): TemplateResult {
    this.prepareRender();
    const m = this.chromeMessages;
    const subject = this.subject ?? this.defaultSubject();
    const controls = this.renderControls();
    return html`
      <dpk-dialog-panel
        class=${classNames('diagram', this.shellClass())}
        flush
        ?maximizable=${this.frameControls}
        ?resizable=${this.frameControls}
        canvas
        initial="none"
        fit-mode=${this.fitMode()}
        align=${this.viewAlign()}
        label=${m.canvas}
        heading=${this.heading ?? this.defaultHeading()}
        subject=${subject === '' ? nothing : subject}
        @dpk-maximize-change=${(event: CustomEvent<{ readonly maximized: boolean }>) => {
          this.closeComposer();
          this.onMaximizeChange(event.detail.maximized);
        }}
        @dpk-canvas-change=${(event: CustomEvent<{ readonly view: ViewState }>) => {
          event.stopPropagation();
          const { view } = event.detail;
          this.dispatchEvent(new CustomEvent('dpk-diagram-view', { detail: { view }, bubbles: true, composed: true }));
          this.onViewChange(view);
        }}
        @dpk-canvas-dismiss=${(event: Event) => {
          event.stopPropagation();
          if (this.selection === null) return;
          event.preventDefault();
          this.select(null);
        }}
      >
        ${this.renderToolbarActionsSlot()} ${this.renderTagFilterRow(this.renderAboveCanvas())}
        <div class="diagram-world">${this.renderCanvas()}</div>
        ${controls === nothing ? nothing : html`<div slot="controls">${controls}</div>`}
        <div slot="overlay" class="diagram-overlay">
          ${this.isEmpty() ? html`<p class="diagram-empty">${this.emptyMessage()}</p>` : nothing}
          ${
            this.dataError === null
              ? nothing
              : html`<p class="diagram-notice" role="alert">${m.dataError}<br />${this.dataError}</p>`
          }
          ${this.renderLegend()}
        </div>
      </dpk-dialog-panel>
      ${this.renderSelection()}
    `;
  }
}

/** Screen pixels a press on a node may wander before it counts as a drag instead of a click. */
const DRAG_THRESHOLD_PX = 4;

/** A node root may itself be a button (most diagrams) or wrap real controls of its own (the ER table); either way, a press that lands on one of these — other than the node root itself — never starts a drag. */
const NODE_INTERACTIVE_SELECTOR = 'button,[role="button"],a,input,textarea,select';

/**
 * Graph-shaped diagrams: nodes and edges, laid out by the shared layout engine
 * and highlighted through the component's own notion of "related".
 */
export abstract class DiagramElement<D extends DiagramData> extends DiagramChromeElement<D, GraphSelection> {
  #placement: LayoutResult | null = null;
  #placementSignature = '';
  /** `#placement` with the reader's dragged positions merged in; every external read uses this. */
  #appliedPlacement: LayoutResult | null = null;
  /** What the view opens on: the nodes and links shown, not their measured sizes. */
  #viewSignature = '';
  #viewVersion = 0;
  #relations: Reach = EMPTY_REACH;
  readonly #positions = new PositionController(this, { host: () => this, diagram: () => this.id });
  /**
   * The one whole-node-or-whole-group drag that can be in flight at a time,
   * as a single discriminated union (see `drag-gesture.ts`) instead of two
   * parallel sets of ad-hoc fields. `idle` is the only state in which a new
   * gesture may begin.
   */
  #drag: DragGesture = IDLE_DRAG;
  /** Set after a drag's release, so the node's own `@click` (see `consumeDragClick`) can swallow the ghost click. */
  #dragConsumeClick = false;

  protected override commentItems(): readonly CommentTargetOption[] {
    const items = this.items();
    return [
      ...items.nodes.map((node) => ({ value: this.commentRef('node', node.id), label: node.id })),
      ...items.edges.map((edge) => ({
        value: this.commentRef('edge', edge.id),
        label: `${edge.from} → ${edge.to} (${edge.id})`,
      })),
    ];
  }

  /** Nodes and edges that survive the tag filter (and the component's own). */
  get visible(): { readonly nodes: D['nodes']; readonly edges: D['edges'] } {
    const visible = this.filtered();
    return { nodes: visible.nodes, edges: visible.edges };
  }

  /** Layout of the currently visible diagram, in world coordinates, with dragged positions applied. */
  get layout(): LayoutResult | null {
    return this.#appliedPlacement;
  }

  /** What a selection means for this diagram. */
  protected abstract relations(selection: DiagramSelection, visible: D): Reach;

  /** `fixed` uses the authored `position` of every node. */
  protected get layoutMode(): 'layered' | 'fixed' {
    return 'layered';
  }

  /**
   * Which side the tag filter applies to. Node diagrams (dependency, ER, map)
   * hide nodes and the edges between them; transition diagrams (state) hide
   * edges and the states left without any.
   */
  protected get tagDimension(): 'node' | 'edge' {
    return 'node';
  }

  protected layoutOptions(): LayoutOptions {
    return {};
  }

  /** Extra filter on top of the tag filter (search boxes, status toggles). */
  protected matchesFilter(_item: DiagramNodeInput | DiagramEdgeInput): boolean {
    return true;
  }

  /** Changes that affect layout but not the visible id set. */
  protected layoutSignature(): string {
    return '';
  }

  protected statsLabels(): { readonly node: string; readonly edge: string } {
    return { node: this.chromeMessages.nodes, edge: this.chromeMessages.edges };
  }

  protected override statsText(): string {
    const visible = this.filtered();
    return presentStats(visible.nodes.length, visible.edges.length, this.statsLabels());
  }

  protected override tagItems(): readonly (readonly string[])[] {
    const items = this.items();
    return (this.tagDimension === 'edge' ? items.edges : items.nodes).map((item) => item.tags);
  }

  protected override contentSize(): { readonly width: number; readonly height: number } | null {
    const placement = this.#appliedPlacement;
    if (placement === null || placement.nodes.length === 0) return null;
    return { width: placement.width, height: placement.height };
  }

  /**
   * A re-measured card (a font that loaded, sub-pixel rounding at another
   * zoom) lays the content out again but must not move the reader's view;
   * only other nodes, links or layout re-open it.
   */
  protected override layoutVersion(): number {
    return this.#viewVersion;
  }

  protected override hasSelection(selection: GraphSelection): boolean {
    const items = this.items();
    return selection.kind === 'node'
      ? items.nodes.some((node) => node.id === selection.id)
      : items.edges.some((edge) => edge.id === selection.id);
  }

  protected placedNode(id: string): PlacedNode | undefined {
    return this.#appliedPlacement?.nodes.find((node) => node.id === id);
  }

  protected routeOf(id: string): readonly LayoutPoint[] {
    return this.#appliedPlacement?.routes.find((route) => route.id === id)?.points ?? [];
  }

  protected nodeState(id: string): ElementState {
    return stateOf(id, this.selection, 'node', this.#relations);
  }

  protected edgeState(id: string): ElementState {
    return stateOf(id, this.selection, 'edge', this.#relations);
  }

  /** SVG wrapper for the edges; the width/height follow the current layout. */
  protected renderEdges(content: unknown, definitions: readonly ArrowDefinition[]): TemplateResult {
    const width = this.#appliedPlacement?.width ?? 0;
    const height = this.#appliedPlacement?.height ?? 0;
    return html`<svg class="diagram-edges" width=${width} height=${height}>
      ${arrowDefinitions(definitions)}${content}
    </svg>`;
  }

  protected filtered(): D {
    const items = this.items();
    if (this.tagDimension === 'edge') {
      const edges = items.edges.filter(
        (edge) => tagStateMatches(edge.tags, this.tagFilter) && this.matchesFilter(edge),
      );
      const ids = new Set(edges.flatMap((edge) => [edge.from, edge.to]));
      return { ...items, edges, nodes: items.nodes.filter((node) => ids.has(node.id)) };
    }
    const nodes = items.nodes.filter((node) => tagStateMatches(node.tags, this.tagFilter) && this.matchesFilter(node));
    const ids = new Set(nodes.map((node) => node.id));
    return { ...items, nodes, edges: items.edges.filter((edge) => ids.has(edge.from) && ids.has(edge.to)) };
  }

  /** Recomputes layout + relations for this render, memoised by signature. */
  protected override refreshContent(): void {
    const visible = this.filtered();
    const signature = [
      this.layoutMode,
      visible.nodes.map((node) => `${node.id}:${node.width}x${node.height}`).join(','),
      visible.edges.map((edge) => `${edge.id}:${edge.from}>${edge.to}`).join(','),
      this.layoutSignature(),
    ].join('|');
    if (signature !== this.#placementSignature) {
      this.#placementSignature = signature;
      this.#placement = this.computePlacement(visible);
    }
    const viewSignature = [
      this.layoutMode,
      visible.nodes.map((node) => node.id).join(','),
      visible.edges.map((edge) => edge.id).join(','),
    ].join('|');
    if (viewSignature !== this.#viewSignature) {
      this.#viewSignature = viewSignature;
      this.#viewVersion += 1;
    }
    this.#relations = this.relations(this.selection, visible);
    this.#applyPositions(visible);
  }

  protected computePlacement(visible: D): LayoutResult {
    const nodes = this.#nodeSpecs(visible);
    const edges = this.#edgeSpecs(visible);
    const options = this.layoutOptions();
    return this.layoutMode === 'fixed' ? fixedLayout(nodes, edges, options) : layeredLayout(nodes, edges, options);
  }

  #nodeSpecs(visible: D): LayoutNodeSpec[] {
    return visible.nodes.map((node) => ({
      id: node.id,
      width: node.width,
      height: node.height,
      ...(node.ports === undefined ? {} : { ports: node.ports }),
      ...(node.position === undefined ? {} : { position: node.position }),
      ...(node.group === undefined ? {} : { group: node.group }),
    }));
  }

  #edgeSpecs(visible: D): LayoutEdgeSpec[] {
    return visible.edges.map((edge) => ({
      id: edge.id,
      from: edge.from,
      to: edge.to,
      ...(edge.fromPort === undefined ? {} : { fromPort: edge.fromPort }),
      ...(edge.toPort === undefined ? {} : { toPort: edge.toPort }),
    }));
  }

  /**
   * Cheap, unmemoised tier on top of `#placement`: merges the reader's dragged
   * positions (plus any in-progress drag preview) every render, without re-running
   * the expensive ranking/packing `computePlacement` does. Also prunes overrides
   * for nodes the agent's data no longer has.
   */
  #applyPositions(visible: D): void {
    this.#positions.prune(new Set(visible.nodes.map((node) => node.id)));
    let overrides = this.#positions.overrides();
    const drag = this.#drag;
    if (drag.kind === 'node' && drag.preview !== null) {
      overrides = new Map(overrides).set(drag.id, drag.preview);
    } else if (drag.kind === 'group' && drag.preview !== null) {
      const merged = new Map(overrides);
      for (const [id, point] of drag.preview) merged.set(id, point);
      overrides = merged;
    }
    const placement = this.#placement;
    this.#appliedPlacement =
      placement === null || overrides.size === 0
        ? placement
        : applyPositionOverrides(
            placement,
            overrides,
            this.#nodeSpecs(visible),
            this.#edgeSpecs(visible),
            this.layoutOptions(),
          );
  }

  /** Whether any node of this diagram has a position the reader dragged it to. */
  protected hasPositionOverrides(): boolean {
    return this.#positions.hasOverrides();
  }

  /**
   * Public API: clears every reader-dragged position of this diagram, back to
   * its computed layout. The board's right-click "Reset positions" item calls
   * this; a host page (e.g. a demo's own "reset" control) can call it too,
   * instead of reaching into the reader-local position storage directly.
   */
  resetPositions(): void {
    this.#positions.reset();
  }

  /** The board's right-click menu: reset every node, alongside the inherited comment item. */
  override getContextMenuItems(request: ContextMenuRequest): readonly ContextMenuGroup[] | null {
    const cm = contextMenuMessages(this.locale);
    const resetPositions: ContextMenuGroup = {
      id: 'diagram-reset-positions',
      entries: [
        {
          kind: 'item',
          id: 'reset-positions',
          label: cm.resetPositions,
          disabled: !this.hasPositionOverrides(),
          run: () => this.resetPositions(),
        },
      ],
    };
    return [...(super.getContextMenuItems(request) ?? []), resetPositions];
  }

  /**
   * Whether `id` is currently being dragged past the movement threshold — for a
   * subclass that wants to show drag feedback (e.g. a `is-dragging` class).
   */
  protected isDraggingNode(id: string): boolean {
    return this.#drag.kind === 'node' && this.#drag.moved && this.#drag.id === id;
  }

  /**
   * Call from a node's own `@click` handler before acting on the click: a real
   * drag's release still synthesizes a click on the node (pointer capture
   * redirects it there, but nothing suppresses it), so this swallows exactly
   * that one ghost click. Returns `true` when the click must be ignored.
   */
  protected consumeDragClick(): boolean {
    if (!this.#dragConsumeClick) return false;
    this.#dragConsumeClick = false;
    return true;
  }

  /**
   * Starts a possible whole-node drag from a `pointerdown` on the node's own
   * root element. Nothing happens yet: a plain click (the pointer never
   * wanders past the threshold) must still reach the node's `@click`, and a
   * press that started on a nested interactive control (inline edit, a row's
   * own buttons, "+ 追加", inputs) never starts a drag at all.
   */
  protected onNodeDragStart(event: PointerEvent, id: string): void {
    if (event.button !== 0 || this.#drag.kind !== 'idle') return;
    const origin = event.target instanceof Element ? event.target.closest(NODE_INTERACTIVE_SELECTOR) : null;
    if (origin !== null && origin !== event.currentTarget) return;
    const node = this.placedNode(id);
    const target = event.currentTarget;
    if (!node || !(target instanceof HTMLElement)) return;
    // Stop here, not at the canvas: an un-captured press on a plain (non-button)
    // node root — the ER table body — would otherwise also start the canvas pan.
    event.stopPropagation();
    this.#beginDrag(
      beginNodeDrag({
        id,
        pointerId: event.pointerId,
        target,
        start: { x: node.x, y: node.y },
        origin: { screenX: event.clientX, screenY: event.clientY },
      }),
      target,
      event.pointerId,
    );
  }

  /**
   * Whether the group identified by `key` is currently being dragged past the
   * movement threshold — for a subclass that wants to show drag feedback on
   * its own group outline (e.g. an ER aggregate's frame).
   */
  protected isDraggingGroup(key: string): boolean {
    return this.#drag.kind === 'group' && this.#drag.moved && this.#drag.key === key;
  }

  /**
   * Starts a possible whole-group drag from a `pointerdown` on a group's own
   * outline element: every id in `ids` moves by the same delta. `key` only
   * identifies the group for `isDraggingGroup`; it never has to be a node id,
   * and nothing requires it to match one.
   */
  protected onGroupDragStart(event: PointerEvent, key: string, ids: readonly string[]): void {
    if (event.button !== 0 || this.#drag.kind !== 'idle') return;
    const target = event.currentTarget;
    if (!(target instanceof HTMLElement) || ids.length === 0) return;
    const starts = new Map<string, LayoutPoint>();
    for (const id of ids) {
      const node = this.placedNode(id);
      if (node) starts.set(id, { x: node.x, y: node.y });
    }
    if (starts.size === 0) return;
    event.stopPropagation();
    this.#beginDrag(
      beginGroupDrag({
        key,
        pointerId: event.pointerId,
        target,
        starts,
        origin: { screenX: event.clientX, screenY: event.clientY },
      }),
      target,
      event.pointerId,
    );
  }

  /**
   * Commits a freshly-begun gesture and wires its DOM side, all in one place:
   * pointer capture is engaged synchronously, before the method returns —
   * never deferred to a later `pointermove` — so every subsequent pointer
   * event for this gesture is guaranteed to reach `target` regardless of
   * where the pointer visually is. A real mouse can move far enough between
   * two `pointermove` ticks to leave a small node's bounds entirely; without
   * immediate capture, that first move (and every event after it, since nothing
   * ever re-engages capture) is silently lost to normal hit-testing, which
   * leaves the drag state stuck forever and blocks every later gesture.
   */
  #beginDrag(gesture: DragGesture, target: HTMLElement, pointerId: number): void {
    this.#drag = gesture;
    target.setPointerCapture(pointerId);
    target.addEventListener('pointermove', this.#onDragPointerMove);
    target.addEventListener('pointerup', this.#onDragPointerUp);
    target.addEventListener('pointercancel', this.#onDragPointerCancel);
    target.addEventListener('lostpointercapture', this.#onDragLostCapture);
  }

  readonly #onDragPointerMove = (event: PointerEvent): void => {
    const drag = this.#drag;
    if (drag.kind === 'idle' || event.pointerId !== drag.pointerId) return;
    event.stopPropagation();
    const scale = this.viewport?.view().scale ?? 1;
    const next = updateDrag(drag, { screenX: event.clientX, screenY: event.clientY }, scale, DRAG_THRESHOLD_PX);
    if (next.kind === 'idle' || next === drag) return;
    if (!drag.moved && next.moved) next.target.style.userSelect = 'none';
    this.#drag = next;
    this.requestUpdate();
  };

  readonly #onDragPointerUp = (event: PointerEvent): void => {
    const drag = this.#drag;
    if (drag.kind === 'idle' || event.pointerId !== drag.pointerId) return;
    event.stopPropagation();
    this.#endDrag(true);
  };

  readonly #onDragPointerCancel = (event: PointerEvent): void => {
    const drag = this.#drag;
    if (drag.kind === 'idle' || event.pointerId !== drag.pointerId) return;
    event.stopPropagation();
    this.#endDrag(false);
  };

  /**
   * Defensive cleanup: the browser can take pointer capture away mid-gesture
   * (a context menu, an OS-level gesture, devtools) without ever delivering a
   * `pointerup` or `pointercancel`. Without this listener that leaves the same
   * stuck, un-resettable drag state as the lost-events bug immediate capture
   * fixes above — just from a different cause. Never commits: a capture loss
   * is never a deliberate release at the drop point.
   */
  readonly #onDragLostCapture = (event: PointerEvent): void => {
    const drag = this.#drag;
    if (drag.kind === 'idle' || event.pointerId !== drag.pointerId) return;
    this.#endDrag(false);
  };

  #endDrag(commit: boolean): void {
    const drag = this.#drag;
    if (drag.kind === 'idle') return;
    const { target } = drag;
    target.removeEventListener('pointermove', this.#onDragPointerMove);
    target.removeEventListener('pointerup', this.#onDragPointerUp);
    target.removeEventListener('pointercancel', this.#onDragPointerCancel);
    target.removeEventListener('lostpointercapture', this.#onDragLostCapture);
    target.style.userSelect = '';
    this.#drag = IDLE_DRAG;
    if (commit && drag.moved) {
      if (drag.kind === 'node' && drag.preview !== null) {
        this.#positions.commit(drag.id, drag.preview);
        // The release still synthesizes a click on `id`'s node; `consumeDragClick` swallows it.
        this.#dragConsumeClick = true;
      } else if (drag.kind === 'group' && drag.preview !== null) {
        this.#positions.commitMany(drag.preview);
      }
    }
    this.requestUpdate();
  }
}
