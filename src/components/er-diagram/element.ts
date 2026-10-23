import { html, svg, nothing, type CSSResultGroup, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';

import type { ElementActionResult } from '../../core/element-actions';
import type { CommentTargetOption, DraftAction } from '../../core/types';
import type { ViewportBox } from '../diagram/viewport';
import type { DpkDialogPanel } from '../dialog-panel/element';

import { iconDiamond, iconKey, iconLink, iconPencil, iconPlus, iconTrash } from '../../core/icons';
import { PopoverController } from '../../core/popover-controller';
import { SelectController } from '../../core/select/controller';
import { DismissController } from '../../lib/dom/dismiss';
import { revealWithin } from '../../lib/dom/scroll';
import {
  fixedLayout,
  layeredLayout,
  type LayoutOptions,
  type LayoutPoint,
  type LayoutResult,
} from '../../lib/layout/layered';
import { controlAtom } from '../atoms/controls';
import { DiagramElement } from '../diagram/element';
import {
  EMPTY_REACH,
  classNames,
  reach,
  tagStateMatches,
  type DiagramSelection,
  type Reach,
  type TagState,
} from '../diagram/model';
import { diagramStyles } from '../diagram/styles';
import { erDiagramMessages, type ErDiagramMessages } from './messages';
import {
  ADD_FIELD,
  BC_TAG_PREFIX,
  CARDINALITIES,
  DELETE_FIELD,
  EDIT_CARDINALITY,
  EDIT_FIELD,
  cardinalityText,
  constraintText,
  emptyErData,
  erLayoutSpec,
  fieldRelations,
  outgoingFan,
  parseErData,
  reduceErActions,
  type ErData,
  type ErFieldDiff,
  type ErRelation,
  type ErTableDiff,
} from './model';
import { CIRCLE_RADIUS, endGlyph, type ErEnd } from './notation';
import { erStyles } from './styles';
import {
  aggregateGroups,
  BC_LABEL_SPACE,
  BC_PADDING,
  boundedContextGroups,
  cardinalityValue,
  columnIcon,
  editorVerdict,
  fieldChanges,
  fieldDetail,
  GROUP_LABEL_SPACE,
  GROUP_PADDING,
  highlightOf,
  relationPath,
  relationRoute,
  resumeEditor,
  typeMenu,
  typeSuggestions,
  type CardinalityEditor,
  type ColumnEditor,
  type ColumnIcon,
  type ErFocus,
  type ErHighlight,
  type ParkedEditor,
} from './view';

/** Distance from a line to the centre of the text beside it. */
const LABEL_LIFT = 7;

// Extra room between two aggregates' bands, so their drawn frames never touch, let alone overlap: the frame
// extends GROUP_PADDING below its bottommost table and GROUP_PADDING + GROUP_LABEL_SPACE above its topmost
// one (the label's own space), so both sides of that gap must fit before the next band's tables begin, plus
// a little margin so adjacent frames never touch.
/**
 * Exported (not just an internal const) so anything that needs to run the
 * same layout off-DOM — the layout-complexity bench, in particular — uses
 * these exact tuning numbers instead of a copy that could quietly drift.
 */
export const LAYOUT = {
  nodeSpacing: 40,
  layerSpacing: 136,
  padding: 32,
  groupSpacing: GROUP_PADDING * 2 + GROUP_LABEL_SPACE + 12,
  // Same reasoning one level up: a Bounded Context's frame must clear the aggregate frames nested
  // inside it (not just their tables), so it needs BC_PADDING's own room on top of groupSpacing.
  superGroupSpacing: BC_PADDING * 2 + BC_LABEL_SPACE + 12,
} as const satisfies LayoutOptions;
/** How far a relation keeps from a table it passes: the middle of the gap between two. */
export const LANE_MARGIN = LAYOUT.nodeSpacing / 2;
/** How wide a relation's curve may reach: half the gap between two layers. */
const CURVE_REACH = LAYOUT.layerSpacing / 2;

/** Every control that opens a column editor; a press on one is not a press outside the editor. */
const EDITOR_TRIGGERS = '[data-action="add-field"], [data-action="edit-field"]';

const SYMBOLS = { same: '', added: '+', removed: '−', changed: '~' } as const;

const ICONS: Record<ColumnIcon, () => TemplateResult> = {
  primary: iconKey,
  foreign: iconLink,
  'not-null': iconDiamond,
  nullable: iconDiamond,
};

/** The keys a row names beside its column, besides the one its icon already shows. */
const extraKeys = (field: ErFieldDiff, icon: ColumnIcon): readonly string[] =>
  field.keys.filter((key) => !(icon === 'primary' && key === 'PK') && !(icon === 'foreign' && key === 'FK'));

/** Where each table's rows sit, measured from the DOM. */
type TableSize = {
  readonly height: number;
  /** Vertical centre of the header: the anchor of relations whose column is not listed. */
  readonly head: number;
  /** Vertical centre of each listed column's first line, by column id. */
  readonly rows: Readonly<Record<string, number>>;
};

/** Schema diagram with an always-on diff between the `before` and `after` snapshots. */
export class DpkErDiagram extends DiagramElement<ErData> {
  static override styles: CSSResultGroup = [diagramStyles, erStyles, controlAtom];

  #query = '';
  #hovered: ErFocus | null = null;
  #editor: ColumnEditor | null = null;
  /** What {@link #editor} was opened as, before any input. */
  #base: ColumnEditor | null = null;
  /** Editors closed with Escape, by {@link editorKey}: reopening one brings its input back. */
  #parked = new Map<string, ParkedEditor>();
  /**
   * The type input's list: null while it is closed; else where the arrow keys
   * moved the highlight, null for the default one ({@link typeMenu}).
   */
  #typeList: { readonly moved: number | null } | null = null;
  #sizes = new Map<string, TableSize>();
  /**
   * Set once {@link #measureTables} has re-fitted the view after a table's
   * first real measurement (see that method): a table's initial layout height
   * is a row-count estimate ({@link tableHeight}), not the real rendered
   * size, so the schema the view opens fitted to is briefly smaller than the
   * truth. Only that first gap is worth re-opening the view for; later
   * remeasures (a font loading, a zoom level) must leave the reader's view
   * alone.
   */
  #refitted = false;
  #resize: ResizeObserver | null = null;
  readonly #popovers = new PopoverController(this);
  readonly #cardinalitySelect = new SelectController(this);
  /** Open for the selected edge; its value is lost once a different edge is selected. */
  #cardinalityEditor: CardinalityEditor | null = null;
  /** Which columns render: every one, only keys (so the relationships alone can be read), or none (header only). */
  #columnFilter: 'all' | 'keys' | 'tables-only' = 'all';

  constructor() {
    super();
    // The editor floats like a tooltip: a press anywhere else puts it away, input kept.
    new DismissController(this, {
      open: () => this.#editor !== null,
      closesOn: (path) =>
        !path.some((target) => target instanceof Element && target.matches(`.er-editor, ${EDITOR_TRIGGERS}`)),
      ownsEscape: () => false,
      dismiss: () => this.#close(false, false),
    });
  }

  override disconnectedCallback(): void {
    this.#resize?.disconnect();
    this.#resize = null;
    super.disconnectedCallback();
  }

  protected override willUpdate(changed: Map<PropertyKey, unknown>): void {
    super.willUpdate(changed);
    // A hovered table or relation that a filter removed never saw the pointer leave.
    if (this.#hovered !== null && !this.#isVisible(this.#hovered)) this.#hovered = null;
    // The cardinality editor follows the selected edge: a fresh draft for a newly
    // selected one, kept as-is while the same edge stays selected, gone otherwise.
    const selection = this.selection;
    if (selection !== null && selection.kind === 'edge' && this.#recordable) {
      if (this.#cardinalityEditor === null || this.#cardinalityEditor.edge !== selection.id) {
        const edge = this.visible.edges.find((item) => item.id === selection.id);
        this.#cardinalityEditor =
          edge === undefined ? null : { edge: edge.id, cardinality: cardinalityValue(edge.cardinality), failed: false };
      }
    } else if (this.#cardinalityEditor !== null) {
      this.#cardinalityEditor = null;
    }
  }

  protected override updated(): void {
    super.updated();
    this.#syncEditor();
    this.#syncCardinalityEditor();
    if (typeof ResizeObserver !== 'undefined') this.#resize ??= new ResizeObserver(() => this.#measureTables());
    this.#resize?.disconnect();
    for (const card of this.renderRoot.querySelectorAll('.er-table')) {
      this.#resize?.observe(card);
      for (const row of card.querySelectorAll('.er-field')) this.#resize?.observe(row);
    }
    this.#measureTables();
  }

  #measureTables(): void {
    let changed = false;
    for (const card of this.renderRoot.querySelectorAll<HTMLElement>('.er-table')) {
      const id = card.dataset['erTable'];
      const bounds = card.getBoundingClientRect();
      if (id === undefined || bounds.width === 0) continue;
      // Undo viewport zoom; DOM geometry also accounts for fonts, wrapping and borders.
      const scale = bounds.width / card.offsetWidth;
      const round = (value: number) => Math.round(value * 64) / 64;
      const centre = (element: Element | null) => {
        const rect = element?.getBoundingClientRect();
        return rect === undefined ? 0 : round((rect.top + rect.height / 2 - bounds.top) / scale);
      };
      const rows: Record<string, number> = {};
      for (const row of card.querySelectorAll<HTMLElement>('.er-field[data-field]')) {
        const field = row.dataset['field'];
        if (field !== undefined) rows[field] = centre(row.querySelector('.er-field-line') ?? row);
      }
      const size: TableSize = {
        height: round(bounds.height / scale),
        head: centre(card.querySelector('.er-head')),
        rows,
      };
      if (JSON.stringify(this.#sizes.get(id)) === JSON.stringify(size)) continue;
      this.#sizes.set(id, size);
      changed = true;
    }
    if (!changed) return;
    this.requestUpdate();
    if (this.#refitted) return;
    this.#refitted = true;
    // Wait for the re-layout this measurement just triggered (real heights
    // now feed `filtered()`, below) to finish, so the fit it does is against
    // the diagram's true content size, not the pre-measurement estimate.
    void this.updateComplete.then(() => this.fitViewport());
  }

  protected override layoutSignature(): string {
    return JSON.stringify([...this.#sizes]);
  }

  /** The active filter's Bounded Context tags alone, or `null` when none are active. */
  #bcFilter(): TagState | null {
    const active = this.tagFilter.active.filter((tag) => tag.startsWith(BC_TAG_PREFIX));
    return active.length === 0 ? null : { ...this.tagFilter, active };
  }

  protected override filtered(): ErData {
    const items = this.items();
    const bc = this.#bcFilter();
    // Picking a Bounded Context focuses the view (`focusBounds`, below) and dims
    // the other tables (`renderCanvas`), but a BC tag never hides a table: it
    // plays no part in the hide/show test here, only the rest of the active tag
    // filter (and the search box, via `matchesFilter`) does.
    const hideFilter: TagState =
      bc === null
        ? this.tagFilter
        : { ...this.tagFilter, active: this.tagFilter.active.filter((tag) => !tag.startsWith(BC_TAG_PREFIX)) };
    const nodes = items.nodes.filter((node) => tagStateMatches(node.tags, hideFilter) && this.matchesFilter(node));
    const ids = new Set(nodes.map((node) => node.id));
    const data = { ...items, nodes, edges: items.edges.filter((edge) => ids.has(edge.from) && ids.has(edge.to)) };
    const fan = outgoingFan(data.edges);
    return {
      ...data,
      nodes: data.nodes.map((node) => {
        const size = this.#sizes.get(node.id);
        if (!size) return node;
        const ports = { ...node.ports };
        for (const edge of data.edges) {
          if (edge.from === node.id && edge.fromPort !== undefined) {
            const y = size.rows[edge.sourceField] ?? size.head;
            ports[edge.fromPort] = { x: node.width, y: y + (fan.get(edge.id) ?? 0) };
          }
          if (edge.to === node.id && edge.toPort !== undefined) {
            ports[edge.toPort] = { x: 0, y: size.rows[edge.targetField] ?? size.head };
          }
        }
        return { ...node, height: size.height, ports };
      }),
    };
  }

  protected override parseData(input: unknown): ErData {
    return parseErData(input);
  }

  protected override reduceElementActions(
    data: ErData,
    actions: readonly DraftAction[],
  ): { readonly data: ErData; readonly results: readonly ElementActionResult[] } {
    return reduceErActions(erDiagramMessages(this.locale), data, actions);
  }

  protected override emptyData(): ErData {
    return emptyErData();
  }

  protected override defaultHeading(): string {
    return erDiagramMessages(this.locale).heading;
  }

  protected override statsLabels(): { readonly node: string; readonly edge: string } {
    const m = erDiagramMessages(this.locale);
    return { node: m.node, edge: m.edge };
  }

  protected override emptyMessage(): string {
    return erDiagramMessages(this.locale).empty;
  }

  protected override layoutOptions(): LayoutOptions {
    return LAYOUT;
  }

  /**
   * One level above the aggregate grouping `group` already gives (see
   * `parseErData`): every table's Bounded Context becomes its `superGroup`, so
   * the layout keeps a whole BC's aggregates — and the lone tables outside any
   * aggregate — together in one band, apart from the other BCs'. Otherwise
   * mirrors the base `computePlacement`, which only knows about `group`.
   */
  protected override computePlacement(visible: ErData): LayoutResult {
    const { nodes, edges } = erLayoutSpec(visible);
    const options = this.layoutOptions();
    return this.layoutMode === 'fixed' ? fixedLayout(nodes, edges, options) : layeredLayout(nodes, edges, options);
  }

  /**
   * While a Bounded Context is the active tag filter, the box around its drawn
   * frame (the same one `renderCanvas` draws from `boundedContextGroups`): the
   * view pans/zooms to it instead of the usual fit, so the chosen BC fills the
   * canvas. `null` once the filter clears, which restores the normal fitted
   * view (`DiagramChromeElement`'s `focusBounds` fallback).
   */
  protected override focusBounds(): ViewportBox | null {
    const bc = this.#bcFilter();
    if (bc === null) return null;
    const names = new Set(bc.active.map((tag) => tag.slice(BC_TAG_PREFIX.length)));
    const boxes = boundedContextGroups(
      this.visible.nodes.map((table) => ({
        id: table.id,
        boundedContext: table.boundedContext,
        box: this.placedNode(table.id) ?? null,
      })),
    )
      .filter((group) => names.has(group.boundedContext))
      .map((group) => group.box);
    if (boxes.length === 0) return null;
    const left = Math.min(...boxes.map((box) => box.x));
    const top = Math.min(...boxes.map((box) => box.y));
    const right = Math.max(...boxes.map((box) => box.x + box.width));
    const bottom = Math.max(...boxes.map((box) => box.y + box.height));
    return { x: left, y: top, width: right - left, height: bottom - top };
  }

  /**
   * Tables are wide and aggregates space them further apart, so the schema
   * routinely does not fit the panel at 100%: opening there like a typical
   * diagram would clip it top and bottom (inline) or left and right
   * (fullscreen). Fit it instead, so the whole schema is visible on open; the
   * zoom control still reaches 100% from there.
   */
  protected override initialView(): void {
    this.fitViewport();
  }

  /**
   * Entering or leaving fullscreen reshapes the canvas (wide-and-short inline,
   * narrow-and-tall maximized, or the reverse): the fit {@link initialView}
   * computed for the old shape routinely clips or shrinks the schema in the
   * new one, so it is worth re-fitting on the toggle specifically — rather
   * than on every window resize — which also restores a reader's prior zoom
   * on request (the exit-fullscreen icon) fittingly rather than verbatim.
   */
  protected override onMaximizeChange(): void {
    const panel = this.renderRoot.querySelector<DpkDialogPanel>('dpk-dialog-panel');
    // Wait for the panel's own update: its canvas has the new `is-maximized`
    // size only once that lands, which `fitViewport` reads geometry from.
    void (panel?.updateComplete ?? Promise.resolve(true)).then(() => this.fitViewport());
  }

  protected override matchesFilter(node: ErTableDiff): boolean {
    if (this.#query === '') return true;
    return [node.id, node.name, ...node.fields.map((field) => field.id)].some((value) =>
      value.toLowerCase().includes(this.#query),
    );
  }

  protected override relations(selection: DiagramSelection, visible: ErData): Reach {
    if (selection === null || selection.kind !== 'node') return EMPTY_REACH;
    const outgoing = reach(visible.edges, selection.id, 'outgoing', false);
    const incoming = reach(visible.edges, selection.id, 'incoming', false);
    return {
      nodes: new Map([...outgoing.nodes, ...incoming.nodes]),
      edges: new Set([...outgoing.edges, ...incoming.edges]),
    };
  }

  /** Table and field names, not raw ids, so "Review comment" reads like the schema does. */
  protected override commentItems(): readonly CommentTargetOption[] {
    const items = this.items();
    return [
      ...items.nodes.map((table) => ({
        value: this.commentRef('node', table.id),
        label: `${table.id} · ${table.name}`,
      })),
      ...items.edges.map((relation) => ({
        value: this.commentRef('edge', relation.id),
        label: `${relation.from}.${relation.sourceField} → ${relation.to}.${relation.targetField}`,
      })),
    ];
  }

  protected override renderToolbarActions(): TemplateResult {
    const m = erDiagramMessages(this.locale);
    return html`
      <label class="er-search">
        <span class="dpk-label">${m.search}</span>
        <input
          class="dpk-input"
          type="search"
          placeholder="table / field"
          .value=${this.#query}
          @input=${(event: Event) => {
            const input = event.currentTarget;
            if (!(input instanceof HTMLInputElement)) return;
            this.#query = input.value.trim().toLowerCase();
            this.requestUpdate();
          }}
        />
      </label>
    `;
  }

  protected override renderLegend(): TemplateResult {
    const m = erDiagramMessages(this.locale);
    return html`<div class="diagram-legend">
      <span><i class="er-swatch-added"></i>${m.legendAdded}</span>
      <span><i class="er-swatch-removed"></i>${m.legendRemoved}</span>
      <span><i class="er-swatch-changed"></i>${m.legendChanged}</span>
    </div>`;
  }

  /** Beside zoom and maximize: how much of each table's columns render. */
  protected override renderControls(): TemplateResult {
    const m = erDiagramMessages(this.locale);
    const options: readonly { readonly value: 'all' | 'keys' | 'tables-only'; readonly label: string }[] = [
      { value: 'all', label: m.columnFilterAll },
      { value: 'keys', label: m.columnFilterKeys },
      { value: 'tables-only', label: m.columnFilterTablesOnly },
    ];
    return html`<div class="dpk-segmented er-column-filter" role="group" aria-label=${m.columnFilterLabel}>
      ${options.map(
        (option) => html`<button
          type="button"
          aria-pressed=${this.#columnFilter === option.value ? 'true' : 'false'}
          @click=${() => {
            this.#columnFilter = option.value;
            this.requestUpdate();
          }}
        >
          ${option.label}
        </button>`,
      )}
    </div>`;
  }

  /**
   * What the pointer is on and what is selected light up the keys they reach:
   * a table every relation it takes part in, a column row only the ones its
   * key carries, a relation itself. No table dims; only the relations left
   * unlit fade, so the lit lines stand out.
   */
  #highlight(visible: ErData): ErHighlight {
    const selection = this.selection;
    const selected: ErFocus | null =
      selection === null
        ? null
        : selection.kind === 'node'
          ? { kind: 'table', id: selection.id }
          : { kind: 'relation', id: selection.id };
    return highlightOf(
      visible.edges,
      [this.#hovered, selected].filter((focus) => focus !== null),
    );
  }

  #isVisible(focus: ErFocus): boolean {
    const visible = this.visible;
    if (focus.kind === 'relation') return visible.edges.some((edge) => edge.id === focus.id);
    const table = focus.kind === 'table' ? focus.id : focus.table;
    return visible.nodes.some((node) => node.id === table);
  }

  /**
   * The relation's route, re-routed through the gaps between the tables it
   * passes (any two of them, in any relative position), so a line never runs
   * behind a card it does not join.
   */
  #route(relation: ErRelation, visible: ErData): readonly LayoutPoint[] {
    const points = this.routeOf(relation.id);
    const tables = visible.nodes.flatMap((node) => {
      const placed = this.placedNode(node.id);
      return placed === undefined ? [] : [{ id: node.id, box: placed }];
    });
    const groupable = visible.nodes.map((node) => ({
      id: node.id,
      aggregate: node.aggregate,
      boundedContext: node.boundedContext,
      box: this.placedNode(node.id) ?? null,
    }));
    const frames = [
      ...aggregateGroups(groupable).map((group) => ({ box: group.box, members: group.tables })),
      ...boundedContextGroups(groupable).map((group) => ({ box: group.box, members: group.tables })),
    ];
    return relationRoute(relation, points, tables, LANE_MARGIN, frames);
  }

  protected override renderCanvas(): TemplateResult {
    const m = erDiagramMessages(this.locale);
    const visible = this.visible;
    const lit = this.#highlight(visible);
    const fan = outgoingFan(visible.edges);
    // While a Bounded Context is the active filter, every table outside it (and every
    // relation touching one) dims instead of disappearing — `filtered()` above keeps
    // them in `visible` on purpose, so the schema's shape around the chosen BC still reads.
    const bcFilter = this.#bcFilter();
    const bcDimmed = new Set(
      bcFilter === null
        ? []
        : visible.nodes.filter((table) => !tagStateMatches(table.tags, bcFilter)).map((table) => table.id),
    );
    // Lit relations paint last, over the ones they cross. Keyed, so a relation
    // moved on top keeps its own element and the pointer stays on the line it entered.
    const ordered = [...visible.edges].sort((a, b) => Number(lit.edges.has(a.id)) - Number(lit.edges.has(b.id)));
    // Built here, not inside repeat(), which would defer them past renderSelection().
    const edges = ordered.map((relation) => {
      const state = this.edgeState(relation.id);
      const points = this.#route(relation, visible);
      const d = relationPath(points, CURVE_REACH);
      const select = () => this.select({ kind: 'edge', id: relation.id });
      const meaning = [cardinalityText(relation.cardinality), relation.label].filter(Boolean).join(' · ');
      const before =
        relation.before === null
          ? null
          : [cardinalityText(relation.before.cardinality), relation.before.label].filter(Boolean).join(' · ');
      return svg`
        <g
          class=${this.elementClass(
            { ...state, dimmed: false },
            'd-edge',
            'er-edge',
            `is-${relation.status}`,
            lit.edges.has(relation.id) && 'is-lit',
            lit.edges.size > 0 && !lit.edges.has(relation.id) && 'is-faded',
            (bcDimmed.has(relation.from) || bcDimmed.has(relation.to)) && 'is-bc-dimmed',
          )}
          data-relation=${relation.id}
          data-dpk-target=${this.commentRef('edge', relation.id)}
          @pointerenter=${() => this.#hover({ kind: 'relation', id: relation.id })}
          @pointerleave=${() => this.#hover(null)}
        >
          <title>${[
            `${relation.from}.${relation.sourceField} → ${relation.to}.${relation.targetField}`,
            meaning,
            before === null ? null : `(${m.was(before)})`,
          ]
            .filter(Boolean)
            .join(' · ')}</title>
          <path class="d-edge-path" d=${d}></path>
          <path class="er-edge-flow" d=${d}></path>
          <path
            class="d-edge-hit"
            d=${d}
            role="button"
            tabindex="0"
            aria-label=${m.edgeLabel(relation.from, relation.to, meaning)}
            @click=${select}
            @keydown=${(event: KeyboardEvent) => {
              if (event.key !== 'Enter' && event.key !== ' ') return;
              event.preventDefault();
              select();
            }}
          ></path>
          ${points.length > 0 ? this.#renderEnds(points, relation, fan.get(relation.id) ?? 0) : nothing}
        </g>
      `;
    });
    const bcGroups = boundedContextGroups(
      visible.nodes.map((table) => ({
        id: table.id,
        boundedContext: table.boundedContext,
        box: this.placedNode(table.id) ?? null,
      })),
    );
    const groups = aggregateGroups(
      visible.nodes.map((table) => ({
        id: table.id,
        aggregate: table.aggregate,
        box: this.placedNode(table.id) ?? null,
      })),
    );
    return html`${bcGroups.map(
      (group) =>
        html`<div
          class=${classNames(
            'er-bc',
            bcFilter !== null &&
              !tagStateMatches([`${BC_TAG_PREFIX}${group.boundedContext}`], bcFilter) &&
              'is-bc-dimmed',
          )}
          style="left:${group.box.x}px; top:${group.box.y}px; width:${group.box.width}px; height:${group.box.height}px"
        >
          <span class="er-bc-label">${group.boundedContext}</span>
        </div>`,
    )}${groups.map(
      (group) =>
        html`<div
          class=${classNames('er-aggregate', this.isDraggingGroup(group.aggregate) && 'is-dragging')}
          style="left:${group.box.x}px; top:${group.box.y}px; width:${group.box.width}px; height:${group.box.height}px"
          @pointerdown=${(event: PointerEvent) => {
            // A table always paints over the frame it belongs to, so a press on the table
            // never reaches this handler in the current DOM order. Guard anyway: the
            // group drag must never start on a node's own press, whatever paints where.
            if (event.composedPath().some((node) => node instanceof Element && node.matches('.d-node'))) return;
            this.onGroupDragStart(event, group.aggregate, group.tables);
          }}
        >
          <span class="er-aggregate-label">${group.aggregate}</span>
        </div>`,
    )}${this.renderEdges(
      repeat(
        edges,
        (_, index) => ordered[index]?.id,
        (edge) => edge,
      ),
      [],
    )}${visible.nodes.map((table) => this.#renderTable(table, lit, m, bcDimmed.has(table.id)))}`;
  }

  /**
   * Crow's foot symbols with their multiplicity beside each end: the
   * referenced table's (`parent`) where the line leaves it, the FK table's
   * (`child`) where it arrives. The relation's label sits under the FK end:
   * one referenced column often sends several relations whose lines leave it
   * together, but every FK column receives exactly one. Relations fanned out
   * of one column put the lower ones' start text under their line, clear of
   * the sibling above. A changed value keeps its previous one, struck through.
   */
  #renderEnds(points: readonly LayoutPoint[], relation: ErRelation, fan: number): TemplateResult {
    const previous = relation.before;
    const value = (now: string | null, was: string | null | undefined) =>
      svg`${
        was !== undefined && was !== null && was !== now ? svg`<tspan class="er-was">${was}</tspan> ` : nothing
      }${now ?? nothing}`;
    const end = (side: ErEnd) => {
      const multiplicity = side === 'start' ? relation.cardinality.parent : relation.cardinality.child;
      const was = previous && (side === 'start' ? previous.cardinality.parent : previous.cardinality.child);
      const glyph = endGlyph(points, side, multiplicity);
      return {
        glyph,
        content: svg`
          <g class="er-end" data-end=${side} data-multiplicity=${multiplicity}>
            ${glyph.segments.map(([a, b]) => svg`<line x1=${a.x} y1=${a.y} x2=${b.x} y2=${b.y}></line>`)}
            ${glyph.circle === null ? nothing : svg`<circle cx=${glyph.circle.x} cy=${glyph.circle.y} r=${CIRCLE_RADIUS}></circle>`}
          </g>
          <text
            class="er-cardinality is-${relation.status}"
            data-end=${side}
            text-anchor=${glyph.label.anchor}
            dominant-baseline="central"
            x=${glyph.label.x}
            y=${glyph.label.y + (side === 'start' && fan > 0 ? LABEL_LIFT : -LABEL_LIFT)}
          >${value(multiplicity, was)}</text>
        `,
      };
    };
    const start = end('start');
    const finish = end('end');
    const label = relation.label ?? previous?.label ?? null;
    return svg`
      ${start.content}${finish.content}
      ${
        label === null
          ? nothing
          : svg`<text
              class="er-relation-label is-${relation.status}"
              text-anchor=${finish.glyph.label.anchor}
              x=${finish.glyph.label.x}
              dominant-baseline="central"
              y=${finish.glyph.label.y + LABEL_LIFT}
            >${value(relation.label, previous?.label)}</text>`
      }
    `;
  }

  #renderTable(
    table: ErTableDiff,
    lit: ErHighlight,
    m: ErDiagramMessages,
    bcDimmed: boolean,
  ): TemplateResult | typeof nothing {
    const placed = this.placedNode(table.id);
    if (!placed) return nothing;
    const state = this.nodeState(table.id);
    const fields =
      this.#columnFilter === 'tables-only'
        ? []
        : this.#columnFilter === 'keys'
          ? table.fields.filter((field) => field.keys.length > 0 || field.ref !== null)
          : table.fields;
    return html`
      <div
        class=${this.elementClass(
          { ...state, dimmed: false },
          'd-node',
          'er-table',
          `is-${table.status}`,
          lit.tables.has(table.id) && 'is-lit',
          table.fields.some((field) => field.status !== 'same') && 'has-diff',
          this.isDraggingNode(table.id) && 'is-dragging',
          bcDimmed && 'is-bc-dimmed',
        )}
        data-er-table=${table.id}
        data-grill-questions=${this.questionsOf(table)}
        data-dpk-target=${this.commentRef('node', table.id)}
        style="left:${placed.x}px; top:${placed.y}px; width:${table.width}px"
        @pointerdown=${(event: PointerEvent) => this.onNodeDragStart(event, table.id)}
        @pointerenter=${() => this.#hover({ kind: 'table', id: table.id })}
        @pointerleave=${() => this.#hover(null)}
      >
        <div class="er-head">
          <button
            type="button"
            class="er-head-select"
            data-table=${table.id}
            aria-pressed=${state.selected ? 'true' : 'false'}
            title=${`${table.id} / ${table.name}`}
            @pointerdown=${(event: PointerEvent) => this.onNodeDragStart(event, table.id)}
            @click=${() => {
              if (!this.consumeDragClick()) this.select({ kind: 'node', id: table.id });
            }}
          >
            <span class="er-title">
              <span class="er-title-top">
                <span class="er-name">${table.id}</span>
                ${
                  table.pattern === null
                    ? nothing
                    : html`<span
                        class="er-pattern-badge"
                        data-pattern=${table.pattern}
                        title=${m.patternLabel(table.pattern)}
                        >${m.patternLabel(table.pattern)}</span
                      >`
                }
              </span>
              <span class="er-label">${table.name}</span>
            </span>
            ${
              table.status === 'same'
                ? nothing
                : html`<span class="er-status"
                    ><span aria-hidden="true">${SYMBOLS[table.status]}</span>${m.statusLabel(table.status)}</span
                  >`
            }
          </button>
        </div>
        ${
          fields.length === 0
            ? nothing
            : html`<div class="er-fields">${fields.map((field) => this.#renderField(table, field, lit, m))}</div>`
        }
        ${this.#renderConstraints(table, m)} ${this.#renderAdd(table, m)}
      </div>
    `;
  }

  /** Table-level constraints (composite UNIQUE / PK, CHECK, EXCLUDE), reviewed through the table's own comment target. */
  #renderConstraints(table: ErTableDiff, m: ErDiagramMessages): TemplateResult | typeof nothing {
    if (table.constraints.length === 0) return nothing;
    return html`<ul class="er-constraints" aria-label=${m.tableConstraintsLabel}>
      ${table.constraints.map((constraint) => html`<li class="er-constraint">${constraintText(constraint)}</li>`)}
    </ul>`;
  }

  #renderIcon(icon: ColumnIcon, m: ErDiagramMessages): TemplateResult {
    return html`<span class="er-icon" data-icon=${icon} role="img" aria-label=${m.columnRole(icon)}
      >${ICONS[icon]()}</span
    >`;
  }

  #renderField(table: ErTableDiff, field: ErFieldDiff, lit: ErHighlight, m: ErDiagramMessages): TemplateResult {
    const editor = this.#editor;
    const editing = editor?.kind === 'edit' && editor.table === table.id && editor.field === field.id;
    // Every present column may be opened: a relation's multiplicities derive from its column, so Save stays
    // disabled for one that carries a ref (see editorVerdict), but Delete is always offered (see #deletable).
    const editable = this.#recordable && field.status !== 'removed';
    const matches = this.#query !== '' && field.id.toLowerCase().includes(this.#query);
    const icon = columnIcon(field);
    const changes = fieldChanges(field, m);
    const typeChange = changes.find((change) => change.attribute === 'type');
    const others = changes.filter((change) => change.attribute !== 'type');
    return html`
      <div
        class=${classNames(
          'er-field',
          `is-${field.status}`,
          matches && 'is-match',
          lit.columns.has(`${table.id}.${field.id}`) && 'is-lit',
          editing && 'is-editing',
        )}
        data-field=${field.id}
        data-grill-questions=${this.questionsOf(field)}
        title=${[m.statusLabel(field.status), field.id, fieldDetail(field, m, true)].join(' / ')}
        @pointerenter=${() => this.#hover({ kind: 'column', table: table.id, field: field.id })}
        @pointerleave=${() => this.#hover({ kind: 'table', id: table.id })}
      >
        <div class="er-field-line">
          <span class="er-field-mark" aria-hidden="true">${SYMBOLS[field.status]}</span>
          ${this.#renderIcon(icon, m)}
          <span class="er-field-name"
            >${field.id}${extraKeys(field, icon).map((key) => html`<span class="er-key">${key}</span>`)}</span
          >
          <span class="er-field-type">
            ${
              typeChange === undefined
                ? field.type
                : html`<del>${typeChange.before}</del><ins>${typeChange.after}</ins>`
            }
          </span>
          <span class="er-field-action">
            ${
              editable
                ? html`<button
                    type="button"
                    class="dpk-icon-btn er-field-edit"
                    data-action="edit-field"
                    data-field=${field.id}
                    aria-label=${m.editFieldButton(field.id)}
                    aria-haspopup="dialog"
                    aria-expanded=${editing ? 'true' : 'false'}
                    title=${m.editFieldButton(field.id)}
                    @click=${() =>
                      this.#toggle({
                        kind: 'edit',
                        table: table.id,
                        field: field.id,
                        type: field.type,
                        nullable: field.nullable,
                        description: field.description ?? '',
                        failed: false,
                      })}
                  >
                    ${iconPencil()}
                  </button>`
                : nothing
            }
          </span>
        </div>
        ${field.description === null ? nothing : html`<p class="er-field-description">${field.description}</p>`}
        ${
          others.length === 0
            ? nothing
            : html`<ul class="er-deltas" aria-label=${m.changesLabel}>
                ${others.map(
                  (change) =>
                    html`<li class="er-delta" data-attribute=${change.attribute}>
                      <span class="er-delta-name">${m.attributeLabel(change.attribute)}</span>
                      <del>${change.before}</del><span aria-hidden="true">→</span><ins>${change.after}</ins>
                    </li>`,
                )}
              </ul>`
        }
      </div>
    `;
  }

  /** A change is recorded against the diagram's id, so without one there is nothing to offer. */
  get #recordable(): boolean {
    return this.id !== '';
  }

  /** Any present column may be deleted; one that carries relations takes them down with it (see fieldRelations). */
  #deletable(field: ErFieldDiff): boolean {
    return this.#recordable && field.status !== 'removed';
  }

  /** Deletes a column from inside its editor, closing it once the delete is recorded. */
  #deleteFromEditor(table: string, field: string): void {
    const recorded = this.dispatchElementAction(DELETE_FIELD, ['node', table], { field });
    if (!recorded) {
      if (this.#editor !== null) this.#editor = { ...this.#editor, failed: true };
      this.requestUpdate();
      return;
    }
    this.#close(true);
  }

  #renderAdd(table: ErTableDiff, m: ErDiagramMessages): TemplateResult | typeof nothing {
    if (!this.#recordable || table.status === 'removed') return nothing;
    const adding = this.#editor?.kind === 'add' && this.#editor.table === table.id;
    return html`<div class="er-add">
      <button
        type="button"
        class=${classNames('er-add-button', adding && 'is-open')}
        data-action="add-field"
        aria-haspopup="dialog"
        aria-expanded=${adding ? 'true' : 'false'}
        @click=${() =>
          this.#toggle({
            kind: 'add',
            table: table.id,
            name: '',
            type: '',
            nullable: false,
            description: '',
            failed: false,
          })}
      >
        <span class="er-icon" aria-hidden="true">${iconPlus()}</span><span>${m.addFieldButton}</span>
      </button>
    </div>`;
  }

  /** The open column or cardinality editor, floating in the top layer beside what it edits. */
  protected override renderSelection(): TemplateResult | typeof nothing {
    const editor = this.#editor;
    const table = editor === null ? undefined : this.visible.nodes.find((node) => node.id === editor.table);
    const composer = super.renderSelection();
    const columnEditor =
      editor === null || table === undefined
        ? nothing
        : this.#renderEditor(table, editor, erDiagramMessages(this.locale));
    const cardinalityEditor = this.#renderCardinalityEditor();
    return html`${composer}${columnEditor}${cardinalityEditor}`;
  }

  /**
   * A small card like a tooltip: what it edits (with the icon the row will
   * show), the name, type and description, the nullability, and the explicit
   * Cancel and confirm (plus, editing an existing column, a danger delete).
   * The row it edits stays in place, marked, under it.
   */
  #renderEditor(table: ErTableDiff, editor: ColumnEditor, m: ErDiagramMessages): TemplateResult {
    const verdict = editorVerdict(editor, table);
    const field = editor.kind === 'edit' ? table.fields.find((item) => item.id === editor.field) : undefined;
    const icon =
      field !== undefined && field.keys.includes('PK') ? 'primary' : editor.nullable ? 'nullable' : 'not-null';
    const title = editor.kind === 'add' ? m.addFieldTitle : m.editFieldTitle;
    const target = editor.kind === 'add' ? table.id : `${table.id}.${editor.field}`;
    const deleteTarget =
      editor.kind === 'edit' && field !== undefined && this.#deletable(field)
        ? { table: table.id, field: editor.field }
        : null;
    const relationsToRemove = deleteTarget === null ? [] : fieldRelations(this.items(), table.id, deleteTarget.field);
    return html`<div
      class="er-editor"
      popover="manual"
      role="dialog"
      data-kind=${editor.kind}
      aria-label=${`${title} ${target}`}
      @keydown=${(event: KeyboardEvent) => this.#onEditorKey(event)}
    >
      <div class="er-editor-head">
        ${this.#renderIcon(icon, m)}
        <span class="er-editor-title">${title}</span>
        <code class="er-editor-target">${target}</code>
      </div>
      <div class="er-editor-fields">
        ${
          editor.kind === 'add'
            ? html`<label class="er-editor-field">
                <span class="dpk-label">${m.columnNameLabel}</span>
                <input
                  class="dpk-input"
                  data-input="add-name"
                  autocomplete="off"
                  spellcheck="false"
                  aria-invalid=${verdict.issue === 'name-taken' ? 'true' : 'false'}
                  placeholder=${m.columnNamePlaceholder}
                  .value=${editor.name}
                  @input=${(event: Event) => {
                    const input = event.currentTarget;
                    if (this.#editor?.kind === 'add' && input instanceof HTMLInputElement)
                      this.#change({ ...this.#editor, name: input.value });
                  }}
                />
              </label>`
            : nothing
        }
        ${this.#renderTypeField(editor, m)}
      </div>
      <label class="er-editor-field">
        <span class="dpk-label">${m.columnDescriptionLabel}</span>
        <input
          class="dpk-input"
          data-input="description"
          autocomplete="off"
          spellcheck="false"
          placeholder=${m.columnDescriptionPlaceholder}
          .value=${editor.description}
          @input=${(event: Event) => {
            const input = event.currentTarget;
            if (this.#editor !== null && input instanceof HTMLInputElement)
              this.#change({ ...this.#editor, description: input.value });
          }}
        />
      </label>
      ${verdict.issue === 'name-taken' ? html`<p class="er-editor-note" role="status">${m.columnNameTaken}</p>` : nothing}
      ${editor.failed ? html`<p class="er-error" role="alert">${m.notRecorded}</p>` : nothing}
      <label class="er-editor-check">
        <input
          type="checkbox"
          data-input="nullable"
          .checked=${editor.nullable}
          @change=${(event: Event) => {
            const input = event.currentTarget;
            if (this.#editor !== null && input instanceof HTMLInputElement)
              this.#change({ ...this.#editor, nullable: input.checked });
          }}
        />
        <span>${m.columnNullable}</span>
      </label>
      <div class="er-editor-foot">
        <span class="er-editor-keys">${m.columnKeys}</span>
        ${
          deleteTarget === null || relationsToRemove.length === 0
            ? nothing
            : html`<span class="er-editor-note" role="status"
                >${m.deleteFieldRelationsNote(relationsToRemove.length)}</span
              >`
        }
        <div class="er-editor-actions">
          ${
            deleteTarget === null
              ? nothing
              : html`<button
                  type="button"
                  class="dpk-btn dpk-btn--danger"
                  data-action="delete-column"
                  @click=${() => this.#deleteFromEditor(deleteTarget.table, deleteTarget.field)}
                >
                  ${iconTrash()}<span>${m.deleteFieldTitle}</span>
                </button>`
          }
          <div class="er-editor-actions-right">
            <button
              type="button"
              class="dpk-btn dpk-btn--ghost"
              data-action="cancel-column"
              data-dpk-text-discard
              @click=${() => this.#close(true)}
            >
              ${m.cancel}
            </button>
            <button
              type="button"
              class="dpk-btn dpk-btn--accent"
              data-action="submit-column"
              ?disabled=${!verdict.ready}
              @click=${() => this.#submit()}
            >
              ${editor.kind === 'add' ? m.columnAdd : m.columnSave}
            </button>
          </div>
        </div>
      </div>
    </div>`;
  }

  /** Anchors the open editor under the row it edits, or under the button that adds one. */
  #syncEditor(): void {
    const editor = this.#editor;
    const surface = this.renderRoot.querySelector<HTMLElement>('.er-editor');
    if (editor === null || surface === null) return;
    const anchor = this.renderRoot.querySelector(`[data-er-table="${CSS.escape(editor.table)}"] ${triggerOf(editor)}`);
    const row = editor.kind === 'edit' ? anchor?.closest('.er-field') : anchor;
    if (!row) return;
    // Bounded to the diagram's own panel (on top of the plain viewport) so a row near the
    // panel's top edge never flips the editor up into whatever the host page draws above it.
    const panel = this.renderRoot.querySelector<DpkDialogPanel>('dpk-dialog-panel');
    const boundaryOption = panel === null ? {} : { boundary: panel };
    this.#popovers.open(
      surface,
      row,
      { width: 300, height: 400 },
      {
        placement: 'bottom-start',
        trackTransform: true,
        ...boundaryOption,
      },
    );
    // The type's list floats too, shown after the card so it lies above it, and
    // turns upward where the window has no room below the input.
    const list = surface.querySelector<HTMLElement>('.er-type-options');
    const input = surface.querySelector<HTMLElement>('.er-editor-type');
    if (list === null || input === null) return;
    this.#popovers.open(
      list,
      input,
      { width: Math.max(input.offsetWidth, 200), height: 220 },
      { placement: 'bottom-start', trackTransform: true, ...boundaryOption },
    );
  }

  /**
   * A small card beside the selected relation: its cardinality as a `parent:child`
   * select. Picking a value commits it at once — there is no separate Save. Opens
   * and closes with the edge's own selection, so no separate trigger is needed,
   * and no Cancel either: deselecting the edge (a press elsewhere, or Escape) is
   * what puts it away.
   */
  #renderCardinalityEditor(): TemplateResult | typeof nothing {
    const state = this.#cardinalityEditor;
    if (state === null) return nothing;
    const edge = this.visible.edges.find((item) => item.id === state.edge);
    if (edge === undefined) return nothing;
    const m = erDiagramMessages(this.locale);
    return html`<div
      class="er-editor er-cardinality-editor"
      popover="manual"
      role="dialog"
      aria-label=${`${m.editCardinalityTitle} ${edge.from}.${edge.sourceField} → ${edge.to}.${edge.targetField}`}
      @keydown=${(event: KeyboardEvent) => this.#onCardinalityKey(event)}
    >
      <div class="er-editor-head">
        <span class="er-icon" aria-hidden="true">${iconLink()}</span>
        <span class="er-editor-title">${m.editCardinalityTitle}</span>
        <code class="er-editor-target">${edge.from} → ${edge.to}</code>
      </div>
      <label class="er-editor-field">
        <span class="dpk-label">${m.cardinalityLabel}</span>
        ${this.#cardinalitySelect.render({
          options: CARDINALITIES.map((value) => ({ value, label: value.replace(':', ' : ') })),
          value: state.cardinality,
          ariaLabel: m.cardinalityLabel,
          onChange: (value) => this.#pickCardinality(value),
        })}
      </label>
      ${state.failed ? html`<p class="er-error" role="alert">${m.notRecorded}</p>` : nothing}
    </div>`;
  }

  /** A picked cardinality commits immediately: no separate Save (see {@link #renderCardinalityEditor}). */
  #pickCardinality(value: string): void {
    const state = this.#cardinalityEditor;
    if (state === null) return;
    const recorded = this.dispatchElementAction(EDIT_CARDINALITY, ['edge', state.edge], { cardinality: value });
    this.#cardinalityEditor = { ...state, cardinality: value, failed: !recorded };
    this.requestUpdate();
  }

  /** Anchors the cardinality editor to the selected relation's `<g>`, floating like a tooltip beside it. */
  #syncCardinalityEditor(): void {
    const state = this.#cardinalityEditor;
    const surface = this.renderRoot.querySelector<HTMLElement>('.er-cardinality-editor');
    if (state === null || surface === null) return;
    const anchor = this.renderRoot.querySelector(`[data-relation="${CSS.escape(state.edge)}"]`);
    if (!anchor) return;
    this.#popovers.open(
      surface,
      anchor,
      { width: 240, height: 170 },
      { placement: 'bottom-start', trackTransform: true },
    );
  }

  #onCardinalityKey(event: KeyboardEvent): void {
    if (event.isComposing) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.select(null);
    }
  }

  /** Keeps the open editor's input for when the same editor opens again. */
  #park(): void {
    if (this.#editor === null || this.#base === null) return;
    this.#parked.set(editorKey(this.#editor), { draft: this.#editor, base: this.#base });
  }

  #hover(focus: ErFocus | null): void {
    if (JSON.stringify(this.#hovered) === JSON.stringify(focus)) return;
    this.#hovered = focus;
    this.requestUpdate();
  }

  /** Its trigger opens an editor, or puts it away when that editor is the open one. */
  #toggle(editor: ColumnEditor): void {
    if (this.#editor !== null && editorKey(this.#editor) === editorKey(editor)) {
      this.#close(false);
      return;
    }
    this.#open(editor);
  }

  /** Opens an editor; one already open elsewhere keeps its input for later. */
  #open(editor: ColumnEditor): void {
    this.#park();
    this.#editor = resumeEditor(this.#parked.get(editorKey(editor)), editor);
    this.#base = editor;
    this.#parked.delete(editorKey(editor));
    this.#typeList = null;
    this.requestUpdate();
    const field = editor.kind === 'add' ? 'add-name' : 'edit-type';
    void this.updateComplete.then(() => {
      const input = this.renderRoot.querySelector<HTMLInputElement>(`.er-editor [data-input="${field}"]`);
      input?.focus({ preventScroll: true });
      input?.select();
    });
  }

  /**
   * The type input as a combobox: a click, typing or an arrow key opens its
   * list of the schema's types, narrowed as it is typed, with what was typed offered as a
   * new type. The arrow keys move through it, Enter or a click takes one, and
   * Enter on the type already in the input confirms the editor instead.
   * Escape closes the list before the editor.
   */
  #renderTypeField(editor: ColumnEditor, m: ErDiagramMessages): TemplateResult {
    const list = this.#typeList;
    const menu = list === null ? null : typeMenu(typeSuggestions(this.items()), editor.type, list.moved);
    const expanded = menu !== null && menu.options.length > 0;
    const optionId = (index: number): string => `er-type-option-${index}`;
    const open = (): void => {
      if (this.#typeList !== null) return;
      this.#typeList = { moved: null };
      this.requestUpdate();
    };
    return html`<div class="er-editor-combo">
      <label class="er-editor-field">
        <span class="dpk-label">${m.addFieldType}</span>
        <input
          class="dpk-input er-editor-type"
          data-input=${editor.kind === 'add' ? 'add-type' : 'edit-type'}
          role="combobox"
          aria-autocomplete="list"
          aria-controls="er-type-options"
          aria-expanded=${String(expanded)}
          aria-activedescendant=${expanded ? optionId(menu.active) : nothing}
          autocomplete="off"
          spellcheck="false"
          placeholder=${m.columnTypePlaceholder}
          .value=${editor.type}
          @click=${open}
          @blur=${() => this.#closeTypeList()}
          @input=${(event: Event) => {
            const input = event.currentTarget;
            if (this.#editor === null || !(input instanceof HTMLInputElement)) return;
            this.#typeList = { moved: null };
            this.#change({ ...this.#editor, type: input.value });
          }}
          @keydown=${(event: KeyboardEvent) => this.#onTypeKey(event)}
        />
      </label>
      ${
        expanded
          ? html`<ul
              id="er-type-options"
              class="er-type-options"
              popover="manual"
              role="listbox"
              aria-label=${m.columnTypeChoices}
            >
              ${menu.options.map(
                (option, index) =>
                  html`<li
                    id=${optionId(index)}
                    role="option"
                    data-type=${option.type}
                    data-kind=${option.kind}
                    aria-selected=${String(index === menu.active)}
                    @pointerdown=${(event: PointerEvent) => event.preventDefault()}
                    @click=${() => this.#pickType(option.type)}
                  >
                    ${option.kind === 'new' ? html`<span class="er-icon" aria-hidden="true">${iconPlus()}</span>` : nothing}
                    <code>${option.type}</code>
                    ${option.kind === 'new' ? html`<span class="er-type-option-hint">${m.columnTypeNew}</span>` : nothing}
                  </li>`,
              )}
            </ul>`
          : nothing
      }
    </div>`;
  }

  #onTypeKey(event: KeyboardEvent): void {
    const editor = this.#editor;
    const list = this.#typeList;
    if (event.isComposing || editor === null) return;
    const menu = list === null ? null : typeMenu(typeSuggestions(this.items()), editor.type, list.moved);
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        event.preventDefault();
        this.#typeList =
          menu === null || menu.options.length === 0
            ? { moved: null }
            : { moved: menu.active + (event.key === 'ArrowDown' ? 1 : -1) };
        this.requestUpdate();
        void this.updateComplete.then(() => {
          const list = this.renderRoot.querySelector('.er-type-options');
          const active = list?.querySelector('[aria-selected="true"]');
          if (list && active) revealWithin(list, active);
        });
        return;
      case 'Enter': {
        const option = menu?.options[menu.active];
        // The type already in the input: Enter goes on to confirm the editor.
        if (option === undefined || option.type === editor.type.trim()) {
          this.#closeTypeList();
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        this.#pickType(option.type);
        return;
      }
      case 'Escape':
        if (list === null) return;
        event.preventDefault();
        event.stopPropagation();
        this.#closeTypeList();
        return;
    }
  }

  #pickType(type: string): void {
    if (this.#editor === null) return;
    this.#typeList = null;
    this.#change({ ...this.#editor, type });
  }

  #closeTypeList(): void {
    if (this.#typeList === null) return;
    this.#typeList = null;
    this.requestUpdate();
  }

  #change(editor: ColumnEditor): void {
    this.#editor = { ...editor, failed: false };
    this.requestUpdate();
  }

  /**
   * Closes the editor. Cancel throws the input away; Escape, the trigger and a
   * press outside park it, so reopening the same editor brings it back. Focus
   * goes back to the control that opened it, unless a press took it elsewhere.
   */
  #close(discard: boolean, refocus = true): void {
    const editor = this.#editor;
    if (editor === null) return;
    if (!discard) this.#park();
    this.#editor = null;
    this.#typeList = null;
    this.requestUpdate();
    if (!refocus) return;
    void this.updateComplete.then(() =>
      this.renderRoot
        .querySelector<HTMLElement>(`[data-er-table="${CSS.escape(editor.table)}"] ${triggerOf(editor)}`)
        ?.focus({ preventScroll: true }),
    );
  }

  #onEditorKey(event: KeyboardEvent): void {
    if (event.isComposing) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.#close(false);
      return;
    }
    if (event.key !== 'Enter' || !(event.target instanceof HTMLInputElement) || event.target.type === 'checkbox')
      return;
    event.preventDefault();
    // Enter on a new column's name moves on to its type until one is typed.
    const editor = this.#editor;
    if (editor?.kind === 'add' && event.target.dataset['input'] === 'add-name' && editor.type.trim() === '') {
      event.target.closest('.er-editor')?.querySelector<HTMLInputElement>('[data-input="add-type"]')?.focus();
      return;
    }
    this.#submit();
  }

  #submit(): void {
    const editor = this.#editor;
    const table = editor === null ? undefined : this.visible.nodes.find((node) => node.id === editor.table);
    if (editor === null || table === undefined || !editorVerdict(editor, table).ready) return;
    const type = editor.type.trim();
    const description = editor.description.trim();
    const recorded =
      editor.kind === 'add'
        ? this.dispatchElementAction(ADD_FIELD, ['node', editor.table], {
            id: editor.name.trim(),
            type,
            nullable: editor.nullable,
            description,
          })
        : this.dispatchElementAction(EDIT_FIELD, ['node', editor.table], {
            field: editor.field,
            type,
            nullable: editor.nullable,
            description,
          });
    if (!recorded) {
      this.#editor = { ...editor, failed: true };
      this.requestUpdate();
      return;
    }
    this.#close(true);
  }
}

/** The control that opens an editor, within its table's card. */
const triggerOf = (editor: ColumnEditor): string =>
  editor.kind === 'add'
    ? '[data-action="add-field"]'
    : `[data-action="edit-field"][data-field="${CSS.escape(editor.field)}"]`;

/** One editor per new column of a table, and per existing column. */
const editorKey = (editor: ColumnEditor): string =>
  editor.kind === 'add' ? `add:${editor.table}` : `edit:${editor.table}:${editor.field}`;
