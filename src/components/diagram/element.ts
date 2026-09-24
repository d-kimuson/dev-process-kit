import { LitElement, html, nothing, svg, type CSSResultGroup, type TemplateResult } from 'lit';
import { keyed } from 'lit/directives/keyed.js';

import type { ElementActionResult } from '../../core/element-actions';
import type { CommentTargetOption, DraftAction } from '../../core/types';

import { type Locale } from '../../core/i18n';
import { iconComment, iconMaximize, iconMinimize } from '../../core/icons';
import { LocaleController } from '../../core/locale-controller';
import { PopoverController } from '../../core/popover-controller';
import { observeJsonChild } from '../../lib/dom/base-data';
import {
  fixedLayout,
  layeredLayout,
  type LayoutEdgeSpec,
  type LayoutNodeSpec,
  type LayoutOptions,
  type LayoutPoint,
  type LayoutResult,
  type PlacedNode,
} from '../../lib/layout/layered';
import { composerMessages } from '../comment-composer/messages';
import { presentComposer } from '../comment-composer/present';
import { renderComposer, type ComposerIntent } from '../comment-composer/view';
import { diagramMessages, type DiagramMessages } from './messages';
import {
  classNames,
  clearTags,
  EMPTY_REACH,
  EMPTY_TAG_STATE,
  setTagMatch,
  stateOf,
  tagStateMatches,
  toggleTag,
  type DiagramData,
  type DiagramEdgeInput,
  type DiagramIntent,
  type DiagramNodeInput,
  type DiagramSelection,
  type ElementState,
  type GraphSelection,
  type Reach,
  type SelectionRef,
  type TagState,
} from './model';
import { presentStats, presentTagBar } from './present';
import { diagramStyles } from './styles';
import { arrowDefinitions, renderTagBar, renderZoom, type ArrowDefinition, type DiagramSend } from './view';
import { createViewport, type ViewportAlign, type ViewportController, type ViewState } from './viewport';

/**
 * Everything a diagram has regardless of its shape: data intake, the tag filter,
 * selection, pan/zoom, contextual comments, the empty state and the shell.
 *
 * Components that are graphs (state, dependency, ER, map) extend `DiagramElement`
 * below for layout as well; the sequence diagram uses this class directly because
 * its content is rows, not nodes.
 */
export abstract class DiagramChromeElement<D, S extends SelectionRef = GraphSelection> extends LitElement {
  static override styles: CSSResultGroup = diagramStyles;
  static override properties = {
    data: { attribute: false },
    id: { type: String, reflect: true },
    heading: { type: String },
    subject: { type: String },
  };

  /** Diagram data as a typed property. The JSON child is the HTML-side path. */
  declare data: D | null;
  /** Toolbar title; falls back to the component's own default. */
  declare heading: string | null;
  /** Toolbar subtitle, e.g. `Order lifecycle`. */
  declare subject: string | null;

  /** The authored data, before this diagram's element actions. */
  #authored: D | null = null;
  /** `#authored` with the element actions replayed: what the diagram shows. */
  #items: D | null = null;
  #elementActions: readonly DraftAction[] = [];
  #elementResults: readonly ElementActionResult[] = [];
  #dataError: string | null = null;
  #tags: TagState = EMPTY_TAG_STATE;
  #selection: S | null = null;
  #viewport: ViewportController | null = null;
  #zoomLabel: HTMLElement | null = null;
  #stopJsonChild: (() => void) | null = null;
  #lastLayoutVersion = -1;
  #targetSignature = '';
  /** The target whose composer a trigger opened; it closes when the selection moves. */
  #commenting: string | null = null;
  #previousCommenting: string | null = null;
  #drafts: ReadonlyMap<string, string> = new Map();
  #failedTarget: string | null = null;
  /** Labels of the triggers the current render drew, by target: the composer needs a visible anchor. */
  #triggers = new Map<string, string>();
  /**
   * Set while the shell covers the viewport (in the top layer where the browser
   * has one). `height` is what the shell took in the page: a placeholder keeps
   * it, so the page neither reflows nor scroll-anchors to a new position.
   */
  #maximized: { readonly height: number } | null = null;
  readonly #popovers = new PopoverController(this);
  readonly #i18n = new LocaleController(this, () => {
    this.#targetSignature = '';
  });

  constructor() {
    super();
    this.id = this.getAttribute('id') ?? '';
    this.data = null;
    this.heading = null;
    this.subject = null;
  }

  override connectedCallback(): void {
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
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#stopJsonChild?.();
    this.#stopJsonChild = null;
    this.#viewport?.destroy();
    this.#viewport = null;
    this.#zoomLabel = null;
  }

  protected override willUpdate(changed: Map<PropertyKey, unknown>): void {
    if (changed.has('data') && this.data !== null) this.#applyData(this.data);
  }

  protected override updated(): void {
    this.#syncTargets();
    this.#syncMaximized();
    this.#syncViewport();
    this.#syncComposer();
  }

  /**
   * Lifts the maximized shell into the top layer, so no ancestor's overflow,
   * transform or stacking context can clip it. Without the Popover API the
   * fixed positioning of `.is-maximized` alone covers the viewport. Removing the
   * `popover` attribute on restore takes the shell out of the top layer again.
   */
  #syncMaximized(): void {
    const shell = this.renderRoot.querySelector<HTMLElement>('.diagram');
    if (this.#maximized === null || !shell || typeof shell.showPopover !== 'function') return;
    if (shell.matches(':popover-open')) return;
    try {
      shell.showPopover();
    } catch {
      /* not in a document yet */
    }
  }

  #syncTargets(): void {
    const signature = JSON.stringify([this.commentTargets, this.#elementResults]);
    if (signature !== this.#targetSignature) {
      this.#targetSignature = signature;
      this.dispatchEvent(new CustomEvent('dpk-comment-targets-change', { bubbles: true, composed: true }));
    }
  }

  #syncViewport(): void {
    this.#zoomLabel = this.renderRoot.querySelector<HTMLElement>('.diagram-zoom-value');
    const canvas = this.renderRoot.querySelector<HTMLElement>('.diagram-canvas');
    const world = this.renderRoot.querySelector<HTMLElement>('.diagram-world');
    if (!canvas || !world) return;
    this.#viewport ??= createViewport({
      canvas,
      world,
      align: this.viewAlign(),
      onClearSelection: () => this.#select(null),
      onView: (view) => {
        if (this.#zoomLabel) this.#zoomLabel.textContent = `${Math.round(view.scale * 100)}%`;
        this.dispatchEvent(
          new CustomEvent('dpk-diagram-view', {
            detail: { view },
            bubbles: true,
            composed: true,
          }),
        );
        this.onViewChange(view);
      },
    });
    const size = this.contentSize();
    if (size === null) {
      this.#viewport.apply();
      return;
    }
    this.#viewport.setContent({ x: 0, y: 0, width: size.width, height: size.height });
    const version = this.layoutVersion();
    if (version !== this.#lastLayoutVersion) {
      this.#lastLayoutVersion = version;
      this.initialView();
    }
  }

  /** Anchors an open composer to its trigger; focus moves in only when it opens. */
  #syncComposer(): void {
    const opened = this.#previousCommenting !== this.#commenting;
    this.#previousCommenting = this.#commenting;
    const surface = this.renderRoot.querySelector<HTMLElement>('.comment-pop');
    const anchor = this.#commentAnchor();
    if (!surface || !anchor) return;
    this.#popovers.open(
      surface,
      anchor,
      { width: 300, height: 280 },
      { placement: 'right-start', trackTransform: true },
    );
    if (opened) surface.querySelector('textarea')?.focus({ preventScroll: true });
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

  protected commentRef(kind: string, ...ids: readonly string[]): string {
    return `element:${[this.id, kind, ...ids].map((id) => encodeURIComponent(id)).join('/')}`;
  }

  protected requestElementComment(kind: string, ...ids: readonly string[]): void {
    const target = this.commentRef(kind, ...ids);
    if (!this.commentTargets.some((option) => option.value === target)) return;
    this.dispatchEvent(
      new CustomEvent('dpk-comment-request', {
        detail: { target },
        bubbles: true,
        composed: true,
      }),
    );
  }

  /**
   * The draft actions the hosting template recorded against this diagram, in
   * order. The host assigns them; the diagram replays them over its data.
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

  /**
   * Replays element actions over the authored data. Pure: the result depends
   * only on the arguments. Diagrams that accept no actions report every one as
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
   * diagram's elements. `true` when a template accepted it; by then the action
   * is already replayed into `items()`.
   */
  protected dispatchElementAction(
    type: string,
    element: readonly [kind: string, ...ids: string[]],
    payload: Readonly<Record<string, unknown>>,
  ): boolean {
    const event = new CustomEvent('dpk-element-action', {
      detail: { type, target: this.commentRef(...element), payload },
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

  /** Data problem from a malformed JSON child; the canvas shows it instead. */
  get dataError(): string | null {
    return this.#dataError;
  }

  resetView(): void {
    this.fitViewport();
  }

  #setMaximized(maximized: boolean): void {
    if (maximized === (this.#maximized !== null)) return;
    const shell = this.renderRoot.querySelector<HTMLElement>('.diagram');
    this.#maximized = maximized ? { height: shell?.offsetHeight ?? 0 } : null;
    // An open composer would stay beneath the lifted shell.
    this.#commenting = null;
    this.requestUpdate();
  }

  /** While maximized nothing is visible behind the diagram, so the page must not scroll. */
  readonly #holdWheel = {
    handleEvent: (event: WheelEvent): void => event.preventDefault(),
    passive: false,
  };

  /** Escape clears a selection first (the canvas does that); with none, it restores. */
  readonly #restoreOnEscape = {
    handleEvent: (event: KeyboardEvent): void => {
      if (event.key !== 'Escape' || this.#selection !== null) return;
      event.preventDefault();
      this.#setMaximized(false);
    },
    capture: true,
  };

  // ------------------------------------------------- subclass responsibilities

  /** Validates one JSON payload into the component's domain data. */
  /** The language of the page around this diagram, resolved on connect. */
  protected get locale(): Locale {
    return this.#i18n.locale;
  }

  /** The shared chrome's text in `locale`. */
  protected get chromeMessages(): DiagramMessages {
    return diagramMessages(this.#i18n.locale);
  }

  protected abstract parseData(input: unknown): D;

  /** Data used when nothing was supplied; usually empty collections. */
  protected abstract emptyData(): D;

  /** Draws the world. */
  protected abstract renderCanvas(): TemplateResult;

  /**
   * Selection UI. It lives in the top layer, beside the element it is about, so
   * selecting never resizes the canvas. By default it is the comment composer a
   * trigger opened.
   */
  protected renderSelection(): TemplateResult | typeof nothing {
    const ref = this.#commenting;
    const label = ref === null ? undefined : this.#triggers.get(ref);
    if (ref === null || label === undefined) return nothing;
    const vm = presentComposer(this.#drafts.get(ref) ?? '', [], {
      label,
      ...(this.#failedTarget === ref ? { error: this.chromeMessages.sendFailed } : {}),
    });
    return html`${keyed(
      ref,
      renderComposer(composerMessages(this.#i18n.locale), vm, (intent) => this.#commentIntent(ref, intent)),
    )}`;
  }

  /**
   * The comment icon for one element, revealed while the element (or its
   * immediately preceding sibling) is hovered, focused or selected. Activating
   * it opens the composer beside it. `at` places it absolutely in the world, at
   * that top-left corner; without it the component's own styles place it.
   * Needs a diagram id, like every element comment.
   */
  protected renderCommentTrigger(
    selection: S,
    label: string,
    at?: { readonly x: number; readonly y: number },
  ): TemplateResult | typeof nothing {
    if (!this.id) return nothing;
    const ref = this.commentRef(selection.kind, selection.id);
    this.#triggers.set(ref, label);
    return html`<button
      type="button"
      class=${classNames('diagram-comment-trigger', at && 'is-placed')}
      style=${at ? `left:${at.x}px; top:${at.y}px` : nothing}
      data-comment-kind=${selection.kind}
      data-comment-id=${selection.id}
      aria-label=${this.chromeMessages.commentOn(label)}
      title=${this.chromeMessages.commentOn(label)}
      aria-haspopup="dialog"
      aria-expanded=${this.#commenting === ref ? 'true' : 'false'}
      @click=${() => {
        this.#select(selection);
        this.#commenting = ref;
        this.requestUpdate();
      }}
    >
      ${iconComment()}
    </button>`;
  }

  /** The comment icon of an edge, on the middle of its route, inside the edge's SVG group. */
  protected renderEdgeCommentTrigger(
    selection: S,
    label: string,
    route: readonly LayoutPoint[],
  ): TemplateResult | typeof nothing {
    const middle = Math.floor((route.length - 1) / 2);
    const start = route[middle];
    const end = route[middle + 1] ?? start;
    if (!this.id || !start || !end) return nothing;
    return svg`<foreignObject
      class="diagram-edge-comment"
      x=${(start.x + end.x) / 2 - 16}
      y=${(start.y + end.y) / 2 - 16}
      width="32"
      height="32"
    >${this.renderCommentTrigger(selection, label)}</foreignObject>`;
  }

  /** World size, or `null` when there is nothing to lay out. */
  protected abstract contentSize(): { readonly width: number; readonly height: number } | null;

  /** Changes when the content should be re-fitted (a new layout, a filter). */
  protected layoutVersion(): number {
    return 0;
  }

  protected fitViewport(): void {
    this.viewport?.fit();
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
   * `data-grill-questions` for a rendered element, or `nothing` when the data
   * carries no references. `dpk-template-grill` places a badge per reference;
   * it reaches into this shadow root to find them.
   */
  protected questionsOf(item: { readonly questions?: string | null }): string | typeof nothing {
    const value = item.questions?.trim();
    return value === undefined || value === '' ? nothing : value;
  }

  /** Mirrors the pan/zoom into component-owned chrome (the participant rail). */
  protected onViewChange(_view: ViewState): void {}

  protected statsText(): string {
    return '';
  }

  /** Tags offered by the filter row. */
  protected tagItems(): readonly (readonly string[])[] {
    return [];
  }

  protected isEmpty(): boolean {
    return this.contentSize() === null;
  }

  /** Extra class on the shell, for component-specific chrome styling. */
  protected shellClass(): string {
    return '';
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

  protected renderLegend(): TemplateResult | typeof nothing {
    return nothing;
  }

  /** Rendered between the tag row and the canvas (the sequence participant rail). */
  protected renderAboveCanvas(): TemplateResult | typeof nothing {
    return nothing;
  }

  // ------------------------------------------------------------------ helpers

  protected get viewport(): ViewportController | null {
    return this.#viewport;
  }

  protected items(): D {
    return this.#items ?? this.emptyData();
  }

  /** The data as authored, without the element actions. */
  protected authoredItems(): D {
    return this.#authored ?? this.emptyData();
  }

  protected elementClass(state: ElementState, ...extra: readonly (string | false | null | undefined)[]): string {
    return classNames(
      ...extra,
      state.selected && 'is-selected',
      state.related && 'is-related',
      state.dimmed && 'is-dimmed',
    );
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
      if (!exists) {
        this.#selection = null;
        this.#commenting = null;
      }
    }
    this.requestUpdate();
  }

  #commentAnchor(): HTMLButtonElement | null {
    const selection = this.#selection;
    if (!selection) return null;
    return (
      [...this.renderRoot.querySelectorAll<HTMLButtonElement>('[data-comment-kind]')].find(
        (button) => button.dataset['commentKind'] === selection.kind && button.dataset['commentId'] === selection.id,
      ) ?? null
    );
  }

  #commentIntent(target: string, intent: ComposerIntent): void {
    if (intent.kind === 'input') {
      this.#drafts = new Map(this.#drafts).set(target, intent.body);
      this.#failedTarget = null;
      this.requestUpdate();
      return;
    }
    if (intent.kind === 'comment') {
      // Only an enclosing template that saved the comment cancels the event.
      const accepted = !this.dispatchEvent(
        new CustomEvent('dpk-comment-submit', {
          detail: { target, body: intent.body },
          bubbles: true,
          composed: true,
          cancelable: true,
        }),
      );
      if (!accepted) {
        this.#failedTarget = target;
        this.requestUpdate();
        return;
      }
      const drafts = new Map(this.#drafts);
      drafts.delete(target);
      this.#drafts = drafts;
    }
    this.#failedTarget = null;
    const anchor = this.#commentAnchor();
    this.#select(null);
    anchor?.focus({ preventScroll: true });
  }

  #failData(error: string): void {
    this.#dataError = error;
    this.#authored = null;
    this.#items = null;
    this.#replay();
    console.error('[dev-process-kit] invalid diagram data:', error);
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
    // A composer belongs to the element it was opened on.
    this.#commenting = null;
    this.dispatchEvent(new CustomEvent('dpk-diagram-select', { detail: { selection }, bubbles: true, composed: true }));
    this.requestUpdate();
  }

  #send: DiagramSend<S> = (intent: DiagramIntent<S>): void => {
    switch (intent.kind) {
      case 'tag':
        this.#tags = toggleTag(this.#tags, intent.tag);
        this.requestUpdate();
        return;
      case 'match':
        this.#tags = setTagMatch(this.#tags, intent.match);
        this.requestUpdate();
        return;
      case 'clear-tags':
        this.#tags = clearTags(this.#tags);
        this.requestUpdate();
        return;
      case 'select':
        this.#select(intent.selection);
        return;
      case 'zoom':
        this.#viewport?.zoom(intent.factor);
        return;
      case 'fit':
        this.fitViewport();
        return;
      default:
        return;
    }
  };

  /** Recompute derived content for this render (layout, relations, rows). */
  protected refreshContent(): void {}

  protected override render(): TemplateResult {
    this.#triggers = new Map();
    this.refreshContent();
    const tags = presentTagBar(this.tagItems(), this.#tags);
    const maximized = this.#maximized;
    const m = this.chromeMessages;
    const maximizeLabel = maximized === null ? m.maximize : m.restore;
    return html`
      ${
        maximized === null
          ? nothing
          : html`<div class="diagram-placeholder" style="height:${maximized.height}px"></div>`
      }
      <div
        class=${classNames('diagram', this.shellClass(), maximized !== null && 'is-maximized')}
        popover=${maximized === null ? nothing : 'manual'}
        @wheel=${maximized === null ? nothing : this.#holdWheel}
        @keydown=${maximized === null ? nothing : this.#restoreOnEscape}
      >
        <div class="diagram-toolbar">
          <span class="diagram-title">${this.heading ?? this.defaultHeading()}</span>
          ${
            (this.subject ?? this.defaultSubject()) === ''
              ? nothing
              : html`<span class="diagram-subject">${this.subject ?? this.defaultSubject()}</span>`
          }
          <div class="diagram-toolbar-actions">
            ${this.renderToolbarActions()}
            <span class="diagram-stats">${this.statsText()}</span>
            <button
              type="button"
              class="dpk-icon-btn diagram-maximize"
              aria-label=${maximizeLabel}
              title=${maximizeLabel}
              aria-pressed=${maximized === null ? 'false' : 'true'}
              @click=${() => this.#setMaximized(maximized === null)}
            >
              ${maximized === null ? iconMaximize() : iconMinimize()}
            </button>
          </div>
        </div>
        ${renderTagBar(m, tags, this.#tags.match, this.#send)} ${this.renderAboveCanvas()}
        <div class="diagram-canvas" tabindex="0" aria-label=${m.canvas}>
          <div class="diagram-world">${this.renderCanvas()}</div>
          ${this.isEmpty() ? html`<p class="diagram-empty">${this.emptyMessage()}</p>` : nothing}
          ${
            this.#dataError === null
              ? nothing
              : html`<p class="diagram-notice" role="alert">${m.dataError}<br />${this.#dataError}</p>`
          }
          ${this.renderLegend()} ${renderZoom(m, this.#send)}
        </div>
        ${this.renderSelection()}
      </div>
    `;
  }
}

/**
 * Graph-shaped diagrams: nodes and edges, laid out by the shared layout engine
 * and highlighted through the component's own notion of "related".
 */
export abstract class DiagramElement<D extends DiagramData> extends DiagramChromeElement<D, GraphSelection> {
  #placement: LayoutResult | null = null;
  #placementSignature = '';
  #placementVersion = 0;
  #relations: Reach = EMPTY_REACH;

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

  /** Layout of the currently visible diagram, in world coordinates. */
  get layout(): LayoutResult | null {
    return this.#placement;
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
    const placement = this.#placement;
    if (placement === null || placement.nodes.length === 0) return null;
    return { width: placement.width, height: placement.height };
  }

  protected override layoutVersion(): number {
    return this.#placementVersion;
  }

  protected override hasSelection(selection: GraphSelection): boolean {
    const items = this.items();
    return selection.kind === 'node'
      ? items.nodes.some((node) => node.id === selection.id)
      : items.edges.some((edge) => edge.id === selection.id);
  }

  protected placedNode(id: string): PlacedNode | undefined {
    return this.#placement?.nodes.find((node) => node.id === id);
  }

  protected routeOf(id: string): readonly LayoutPoint[] {
    return this.#placement?.routes.find((route) => route.id === id)?.points ?? [];
  }

  protected nodeState(id: string): ElementState {
    return stateOf(id, this.selection, 'node', this.#relations);
  }

  protected edgeState(id: string): ElementState {
    return stateOf(id, this.selection, 'edge', this.#relations);
  }

  /** SVG wrapper for the edges; the width/height follow the current layout. */
  protected renderEdges(content: unknown, definitions: readonly ArrowDefinition[]): TemplateResult {
    const width = this.#placement?.width ?? 0;
    const height = this.#placement?.height ?? 0;
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
      this.#placementVersion += 1;
      this.#placement = this.computePlacement(visible);
    }
    this.#relations = this.relations(this.selection, visible);
  }

  protected computePlacement(visible: D): LayoutResult {
    const nodes: LayoutNodeSpec[] = visible.nodes.map((node) => ({
      id: node.id,
      width: node.width,
      height: node.height,
      ...(node.ports === undefined ? {} : { ports: node.ports }),
      ...(node.position === undefined ? {} : { position: node.position }),
    }));
    const edges: LayoutEdgeSpec[] = visible.edges.map((edge) => ({
      id: edge.id,
      from: edge.from,
      to: edge.to,
      ...(edge.fromPort === undefined ? {} : { fromPort: edge.fromPort }),
      ...(edge.toPort === undefined ? {} : { toPort: edge.toPort }),
    }));
    const options = this.layoutOptions();
    return this.layoutMode === 'fixed' ? fixedLayout(nodes, edges, options) : layeredLayout(nodes, edges, options);
  }
}
