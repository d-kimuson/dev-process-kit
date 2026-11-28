import { html, svg, nothing, type CSSResultGroup, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';

import type { DpkDialogPanel } from '../../components/dialog-panel/element';
import type { ElementActionResult } from '../../core/element-actions';
import type { PanelDetail } from '../../core/panel/host';
import type { CommentTargetOption, DraftAction } from '../../core/types';
import type { ViewportBox } from '../base/viewport';

import { controlAtom } from '../../components/atoms/controls';
import { EDGE_PATHS } from '../../components/diagram/edge';
import { iconDiamond, iconKey, iconLink, iconPencil, iconPlus } from '../../core/icons';
import {
  fixedLayout,
  layeredLayout,
  type LayoutOptions,
  type LayoutPoint,
  type LayoutResult,
} from '../../lib/layout/layered';
import { jumpedPaths } from '../../lib/layout/line-jumps';
import { stepsData } from '../../lib/layout/path-steps';
import { BoardCanvasElement } from '../base/element';
import {
  EMPTY_REACH,
  classNames,
  reach,
  tagStateMatches,
  type DiagramSelection,
  type GraphSelection,
  type Reach,
  type TagState,
} from '../base/model';
import { diagramStyles } from '../base/styles';
import {
  blankColumn,
  columnControl,
  columnOf,
  type ColumnPatch,
  type ErDetailActions,
  type ErDetailView,
} from './detail';
import { relationLabelPlans, type RelationLabelPlan } from './labels';
import { erDiagramMessages, type ErDiagramMessages } from './messages';
import {
  ADD_FIELD,
  BC_TAG_PREFIX,
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
import { CIRCLE_RADIUS, END_GLYPH_REACH, endGlyph, type ErEnd } from './notation';
import { erStyles } from './styles';
import {
  aggregateGroups,
  BC_GAP_COLUMN,
  BC_GAP_ROW,
  BC_LABEL_SPACE,
  BC_PADDING,
  boundedContextGroups,
  cardinalityValue,
  columnIcon,
  concealedRelations,
  editorVerdict,
  fieldChanges,
  fieldDetail,
  GROUP_LABEL_SPACE,
  GROUP_PADDING,
  highlightOf,
  relationRoute,
  relationRoutes,
  relationSteps,
  resumeEditor,
  typeSuggestions,
  type CardinalityEditor,
  type ColumnEditor,
  type ParkedEditor,
  type ColumnIcon,
  type ErFocus,
  type ErHighlight,
  type RelationScope,
} from './view';

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
  // Wide enough that the lane a relation runs beside a card (half of this)
  // clears both the port's end glyph and a line jump over that lane; at the
  // old 40 every crossing next to a card sat under a glyph and stayed plain.
  // The extra room also lets routes take the gap between two tables, which
  // trades a few more crossings (now jumped) for fewer hugging/parallel runs.
  nodeSpacing: 64,
  layerSpacing: 136,
  // A Bounded Context frame extends BC_PADDING on every side and another
  // BC_LABEL_SPACE above its topmost table. The world box has to contain that
  // frame, not just the nodes and routes, or the fit view clips the top/bottom
  // frames (and the bottom row of cards) — the stale world size the tuned
  // review measured. The old 32 was smaller than the frame's own top label
  // space (76).
  padding: BC_PADDING + BC_LABEL_SPACE + 4,
  groupSpacing: GROUP_PADDING * 2 + GROUP_LABEL_SPACE + 12,
  // Same reasoning one level up: a Bounded Context's frame must clear the aggregate frames nested
  // inside it (not just their tables), so it needs BC_PADDING's own room on top of groupSpacing.
  // Kept at the historic minimum (not BC_GAP_*-widened): this value also drives `arrangeBoxes`'s
  // crossing-minimising search over BC order/row-split, so inflating it would perturb which
  // arrangement wins. `superGroupRowGap`/`superGroupColumnGap` below add the BC_GAP_* constants
  // back in as a pure post-process instead.
  superGroupSpacing: BC_PADDING * 2 + BC_LABEL_SPACE + 12,
  // Extra breathing room between *different* BCs' frames, applied by `compoundLayout` only after
  // it has already picked the BC order/row-split from `superGroupSpacing` above — so widening these
  // can change how far apart BCs sit, never which arrangement the crossing-minimising search chose.
  // Two separate budgets, not one: see `view.ts`'s `BC_GAP_ROW`/`BC_GAP_COLUMN` for why stacked and
  // side-by-side BCs tolerate very different amounts of widening before routed crossings regress.
  superGroupRowGap: BC_GAP_ROW,
  superGroupColumnGap: BC_GAP_COLUMN,
} as const satisfies LayoutOptions;
/** How far a relation keeps from a table it passes: the middle of the gap between two. */
export const LANE_MARGIN = LAYOUT.nodeSpacing / 2;
/** How wide a relation's curve may reach: half the gap between two layers. */
const CURVE_REACH = LAYOUT.layerSpacing / 2;
// Jumped path sets kept per route signature: a few hovers and selections back and forth reuse theirs.
const PATHS_CACHE_LIMIT = 16;

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

/**
 * Below this, two measurements of the same table count as "the same size":
 * absorbs sub-pixel jitter between two otherwise-identical layout passes
 * (zoom rounding, a scrollbar's width changing) without masking a real
 * change, which is at minimum a text line's height. Comfortably above
 * `#measureTables`'s own 1/64px rounding step, so that rounding alone can
 * never push two equal measurements past it.
 */
const SIZE_CHANGE_EPSILON = 0.5;

/** Whether `next` differs from `previous` by more than `epsilon` in any field. `undefined` always counts as different (a table measured for the first time). */
const sizesEqual = (previous: TableSize | undefined, next: TableSize, epsilon: number): boolean => {
  if (previous === undefined) return false;
  if (Math.abs(previous.height - next.height) > epsilon) return false;
  if (Math.abs(previous.head - next.head) > epsilon) return false;
  const previousFields = Object.keys(previous.rows);
  const nextFields = Object.keys(next.rows);
  if (previousFields.length !== nextFields.length) return false;
  return nextFields.every((field) => {
    const before = previous.rows[field];
    return before !== undefined && Math.abs(before - next.rows[field]!) <= epsilon;
  });
};

/** Schema diagram with an always-on diff between the `before` and `after` snapshots. */
export class DpkBoardErDiagram extends BoardCanvasElement<ErData> {
  static override styles: CSSResultGroup = [diagramStyles, erStyles, controlAtom];

  #query = '';
  #hovered: ErFocus | null = null;
  #editor: ColumnEditor | null = null;
  /** What {@link #editor} was opened as, before any input. */
  #base: ColumnEditor | null = null;
  /** Editors closed with Escape, by {@link editorKey}: reopening one brings its input back. */
  #parked = new Map<string, ParkedEditor>();
  /** The control in the table's detail to focus once a column's form closes back to it. */
  #returnTo: string | null = null;
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
  /** Elements `#resize` currently watches, so `updated()` can observe only ones that are new. */
  #resizeTargets = new Set<Element>();
  /** The selected edge's cardinality as picked; its value is lost once a different edge is selected. */
  #cardinalityEditor: CardinalityEditor | null = null;
  /**
   * Which relations draw at rest: every one, only those inside one Bounded
   * Context, or only those inside one aggregate (see `concealedRelations`).
   * A concealed relation still draws while it is lit. Visual-only, like the
   * frame toggles below: the tables and routes never move.
   */
  #relationScope: RelationScope = 'bounded-context';
  /**
   * Whether the Bounded Context / aggregate frames draw at all (bottom
   * controls bar, like `#relationScope` above) — on by default, matching the
   * previously always-on behavior. Reader-local, in-memory only, like
   * `#relationScope`: neither is part of the draft, and this component has no
   * other precedent for persisting a view toggle across reloads.
   *
   * Deliberately visual-only: hiding a frame never reruns layout or routing.
   * The tables stay exactly where the grouped layout placed them, and
   * `#routes` keeps avoiding the same (now undrawn) frame boundaries, so a
   * toggle click never redoes `computePlacement` or the route search — the
   * one thing #152/#153 made expensive on a large schema.
   */
  #groupByBoundedContext = true;
  #groupByAggregate = true;
  /** `#routes`' memoised full batch result, see its own doc comment. */
  #routesCache: { readonly signature: string; readonly result: ReadonlyMap<string, readonly LayoutPoint[]> } | null =
    null;
  /** Label placement memoised by the same signature: hovering re-renders, but never moves a line or a label. */
  #labelsCache: { readonly signature: string; readonly result: ReadonlyMap<string, RelationLabelPlan> } | null = null;
  /** `#paths`' memoised jumped path data, see its own doc comment. */
  #pathsCache: {
    readonly signature: string;
    readonly byDrawn: Map<string, ReadonlyMap<string, string>>;
  } | null = null;

  override disconnectedCallback(): void {
    this.#resize?.disconnect();
    this.#resize = null;
    this.#resizeTargets.clear();
    super.disconnectedCallback();
  }

  protected override willUpdate(changed: Map<PropertyKey, unknown>): void {
    super.willUpdate(changed);
    // A hovered table or relation that a filter removed never saw the pointer leave.
    if (this.#hovered !== null && !this.#isVisible(this.#hovered)) this.#hovered = null;
    // The picked cardinality is kept while the same edge stays selected, gone otherwise.
    const selection = this.selection;
    if (
      this.#cardinalityEditor !== null &&
      (selection?.kind !== 'edge' || selection.id !== this.#cardinalityEditor.edge)
    )
      this.#cardinalityEditor = null;
    // A column's form belongs to its table's detail: selecting anything else puts it away, input kept.
    if (this.#editor !== null && (selection?.kind !== 'node' || selection.id !== this.#editor.table)) {
      this.#park();
      this.#editor = null;
    }
  }

  protected override updated(): void {
    super.updated();
    if (typeof ResizeObserver !== 'undefined') this.#resize ??= new ResizeObserver(() => this.#measureTables());
    this.#syncResizeTargets();
    this.#measureTables();
  }

  /**
   * Observes only `.er-table`/`.er-field` elements `#resize` is not already
   * watching, and drops ones no longer rendered — rather than disconnecting
   * and re-observing every one of them on every render. `observe()` always
   * schedules an initial notification for a newly watched target, even when
   * nothing resized, so re-observing the same stable elements on every
   * render guaranteed another measurement pass per render regardless of
   * whether anything actually changed (the freeze fixed in ce0ce13 started
   * here). Lit keeps each table/field's element identity stable across
   * renders (keyed by id), so most renders now have nothing new to observe.
   */
  #syncResizeTargets(): void {
    if (this.#resize === null) return;
    const current = new Set<Element>();
    for (const card of this.renderRoot.querySelectorAll('.er-table')) {
      current.add(card);
      for (const row of card.querySelectorAll('.er-field')) current.add(row);
    }
    for (const element of this.#resizeTargets) {
      if (!current.has(element)) {
        this.#resize.unobserve(element);
        this.#resizeTargets.delete(element);
      }
    }
    for (const element of current) {
      if (!this.#resizeTargets.has(element)) {
        this.#resize.observe(element);
        this.#resizeTargets.add(element);
      }
    }
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
      if (sizesEqual(this.#sizes.get(id), size, SIZE_CHANGE_EPSILON)) continue;
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
    // This padding is the frame room the drawing needs (BC_PADDING plus the
    // BC label), not a blank canvas margin, so a chrome-less figure keeps it.
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
   * view (`BoardCanvasChromeElement`'s `focusBounds` fallback).
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
   * Keyed on the active BC *selection*, not the computed box: the box moves by
   * a sub-pixel whenever a card is remeasured (new font metrics, a different
   * zoom's rounding), and re-fitting on every such nudge would re-trigger the
   * remeasurement that moved it, looping forever. Picking (or clearing) a
   * Bounded Context is the only change that should re-open this view.
   */
  protected override focusKey(): string | null {
    return this.#bcFilter()?.active.join(',') ?? null;
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

  /**
   * Beside zoom and maximize: which relations draw at rest, and whether the
   * Bounded Context / aggregate frames draw at all. Neither group touches
   * placement or routing: the first only swaps which lines are concealed, the
   * second only flips `#groupByBoundedContext` / `#groupByAggregate` (gating
   * `renderCanvas`'s frame `<div>`s), so no table ever moves on a click here.
   */
  protected override renderControls(): TemplateResult {
    const m = erDiagramMessages(this.locale);
    const options: readonly { readonly value: RelationScope; readonly label: string }[] = [
      { value: 'all', label: m.relationScopeAll },
      { value: 'bounded-context', label: m.relationScopeBoundedContext },
      { value: 'aggregate', label: m.relationScopeAggregate },
    ];
    const groupingOptions: readonly {
      readonly pressed: boolean;
      readonly label: string;
      readonly onClick: () => void;
    }[] = [
      {
        pressed: this.#groupByBoundedContext,
        label: m.boundedContextLabel,
        onClick: () => {
          this.#groupByBoundedContext = !this.#groupByBoundedContext;
          this.requestUpdate();
        },
      },
      {
        pressed: this.#groupByAggregate,
        label: m.aggregateLabel,
        onClick: () => {
          this.#groupByAggregate = !this.#groupByAggregate;
          this.requestUpdate();
        },
      },
    ];
    return html`<div class="er-controls-row">
      <div class="dpk-segmented er-relation-scope" role="group" aria-label=${m.relationScopeLabel}>
        ${options.map(
          (option) => html`<button
            type="button"
            aria-pressed=${this.#relationScope === option.value ? 'true' : 'false'}
            @click=${() => {
              this.#relationScope = option.value;
              this.requestUpdate();
            }}
          >
            ${option.label}
          </button>`,
        )}
      </div>
      <div class="dpk-segmented er-grouping-filter" role="group" aria-label=${m.groupingLabel}>
        ${groupingOptions.map(
          (option) => html`<button
            type="button"
            aria-pressed=${option.pressed ? 'true' : 'false'}
            @click=${option.onClick}
          >
            ${option.label}
          </button>`,
        )}
      </div>
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

  /**
   * The relations left undrawn unless lit, by `#relationScope`: a line leaving
   * its Bounded Context (or aggregate) runs long and across frames. Independent
   * of whether the frames draw, so hiding a frame never brings its lines back.
   */
  #concealed(visible: ErData): ReadonlySet<string> {
    return concealedRelations(this.#relationScope, visible.nodes, visible.edges);
  }

  /**
   * Every visible relation's path data, its level runs jumping the lines that
   * cross them while drawn (`jumpedPaths`): those drawn at rest, plus the
   * concealed ones `lit` brings out. Memoised per drawn set for one route
   * signature, since a hover never moves a line; mid-drag the lines draw
   * plain, as the labels stay put, rather than redo every crossing on each
   * pointer move.
   */
  #paths(visible: ErData, lit: ErHighlight): ReadonlyMap<string, string> {
    const routed = this.#routes(visible);
    const steps = () =>
      new Map(
        visible.edges.map(
          (relation) => [relation.id, relationSteps(routed.get(relation.id) ?? [], CURVE_REACH)] as const,
        ),
      );
    if (this.draggedNodeIds().size > 0)
      return new Map([...steps()].map(([id, line]) => [id, stepsData(line)] as const));
    const concealed = this.#concealed(visible);
    const drawn = visible.edges.map((relation) => relation.id).filter((id) => !concealed.has(id) || lit.edges.has(id));
    const signature = `${this.#routesCache?.signature ?? ''}|${this.layout?.width ?? 0}x${this.layout?.height ?? 0}`;
    if (this.#pathsCache?.signature !== signature) this.#pathsCache = { signature, byDrawn: new Map() };
    const byDrawn = this.#pathsCache.byDrawn;
    const key = drawn.join(',');
    const cached = byDrawn.get(key);
    if (cached !== undefined) return cached;
    const result = jumpedPaths(steps(), new Set(drawn), { clearance: END_GLYPH_REACH });
    // Bounded: one entry per distinct hover/selection seen since the lines last moved.
    if (byDrawn.size >= PATHS_CACHE_LIMIT) byDrawn.delete(byDrawn.keys().next().value ?? '');
    byDrawn.set(key, result);
    return result;
  }

  #isVisible(focus: ErFocus): boolean {
    const visible = this.visible;
    if (focus.kind === 'relation') return visible.edges.some((edge) => edge.id === focus.id);
    const table = focus.kind === 'table' ? focus.id : focus.table;
    return visible.nodes.some((node) => node.id === table);
  }

  /**
   * Every visible relation's route, re-routed through the gaps between the
   * tables it passes (any two of them, in any relative position) and then
   * pulled apart from any other route sharing its corridor, so a line never
   * runs behind a card it does not join, nor on top of another line or a
   * frame border.
   *
   * Memoised by `#routesCache`, keyed by every visible table's placed box
   * plus the visible node/edge id sets (#152): hovering, selecting,
   * searching or changing the column filter never moves a table, so none of
   * them change this signature, and the render reuses the last computed
   * batch instead of re-running the full pipeline (Pass 1 + rip-up-reroute +
   * nudge over every edge) — measured, before this cache, as the single
   * costliest step in the live component's render path (multi-second main-
   * thread long tasks on a 38-table/51-edge diagram, for work whose result
   * had not actually changed).
   *
   * While a node or group is being dragged (`draggedNodeIds()`), the cached
   * batch is left exactly as it was and only the edges touching a dragged
   * table are re-routed, each with one cheap, single-edge `relationRoute`
   * call (no batch `avoid` awareness, no rip-up, no nudge) instead of the
   * full pipeline — so a drag tick's cost depends on how many edges touch
   * the table being moved, not on the diagram's total edge count. The full,
   * batch-aware route is recomputed once the drag commits, since the
   * dragged table's final box then differs from the cached signature.
   */
  #routes(visible: ErData): ReadonlyMap<string, readonly LayoutPoint[]> {
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
    const pointsById = new Map(visible.edges.map((relation) => [relation.id, this.routeOf(relation.id)] as const));

    const boxSignature = (id: string): string => {
      const box = this.placedNode(id);
      return box === undefined ? '' : `${box.x},${box.y},${box.width},${box.height}`;
    };
    const signature = [
      visible.nodes.map((node) => `${node.id}:${boxSignature(node.id)}`).join(','),
      visible.edges.map((relation) => `${relation.id}:${relation.from}>${relation.to}`).join(','),
    ].join('|');

    const dragged = this.draggedNodeIds();
    const cached = this.#routesCache;
    if (dragged.size > 0 && cached !== null) {
      const touching = visible.edges.filter((relation) => dragged.has(relation.from) || dragged.has(relation.to));
      if (touching.length === 0) return cached.result;
      const overridden = new Map(cached.result);
      for (const relation of touching) {
        overridden.set(
          relation.id,
          relationRoute(relation, pointsById.get(relation.id) ?? [], tables, LANE_MARGIN, frames),
        );
      }
      return overridden;
    }

    if (cached !== null && cached.signature === signature) return cached.result;
    const result = relationRoutes(visible.edges, pointsById, tables, LANE_MARGIN, frames);
    this.#routesCache = { signature, result };
    return result;
  }

  protected override renderCanvas(): TemplateResult {
    const m = erDiagramMessages(this.locale);
    const visible = this.visible;
    const lit = this.#highlight(visible);
    // While a Bounded Context is the active filter, every table outside it (and every
    // relation touching one) dims instead of disappearing — `filtered()` above keeps
    // them in `visible` on purpose, so the schema's shape around the chosen BC still reads.
    const bcFilter = this.#bcFilter();
    const bcDimmed = new Set(
      bcFilter === null
        ? []
        : visible.nodes.filter((table) => !tagStateMatches(table.tags, bcFilter)).map((table) => table.id),
    );
    const concealed = this.#concealed(visible);
    // Lit relations paint last, over the ones they cross. Keyed, so a relation
    // moved on top keeps its own element and the pointer stays on the line it entered.
    const ordered = [...visible.edges].sort((a, b) => Number(lit.edges.has(a.id)) - Number(lit.edges.has(b.id)));
    const routed = this.#routes(visible);
    // End labels are placed once for the whole batch, so two labels can avoid
    // each other. The same function backs the offline appraisal, so a label
    // the reader cannot read is measured, not guessed at.
    const placedTables = visible.nodes.flatMap((node) => {
      const placed = this.placedNode(node.id);
      return placed === undefined ? [] : [{ id: node.id, box: placed }];
    });
    const labelGroupable = visible.nodes.map((node) => ({
      id: node.id,
      aggregate: node.aggregate,
      boundedContext: node.boundedContext,
      box: this.placedNode(node.id) ?? null,
    }));
    const labelFrames = [
      ...aggregateGroups(labelGroupable).map((group) => ({ box: group.box })),
      ...boundedContextGroups(labelGroupable).map((group) => ({ box: group.box })),
    ];
    const labelSignature = `${this.#routesCache?.signature ?? ''}|${this.layout?.width ?? 0}x${this.layout?.height ?? 0}`;
    const draggingLabel = this.draggedNodeIds().size > 0;
    let labelPlans =
      !draggingLabel && this.#labelsCache?.signature === labelSignature ? this.#labelsCache.result : null;
    if (labelPlans === null) {
      labelPlans = relationLabelPlans(visible.edges, routed, {
        nodes: placedTables,
        frames: labelFrames,
        edges: [...routed.values()],
        width: this.layout?.width ?? 0,
        height: this.layout?.height ?? 0,
      });
      if (!draggingLabel) this.#labelsCache = { signature: labelSignature, result: labelPlans };
    }
    const paths = this.#paths(visible, lit);
    // Built here, not inside repeat(), which would defer them past renderSelection().
    const edges = ordered.map((relation) => {
      const state = this.edgeState(relation.id);
      const points = routed.get(relation.id) ?? [];
      const d = paths.get(relation.id) ?? '';
      const select = () => this.openSelection({ kind: 'edge', id: relation.id });
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
            concealed.has(relation.id) && !lit.edges.has(relation.id) && 'is-concealed',
          )}
          data-relation=${relation.id}
          data-dpk-target=${this.commentRef('edge', relation.id)}
          data-dpk-check="off"
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
          <path class="d-edge-flow" d=${d}></path>
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
          ${points.length > 0 ? this.#renderEnds(points, relation, labelPlans.get(relation.id)) : nothing}
        </g>
      `;
    });
    // Hiding a frame (bottom controls bar) never touches placement: the tables
    // underneath stay at the boxes `computePlacement` already gave them, and
    // `#routes` keeps avoiding the same (now undrawn) frame boundaries — only
    // which of these two arrays is non-empty changes, so toggling never reruns
    // layout or re-routes a single relation.
    const bcGroups = this.#groupByBoundedContext
      ? boundedContextGroups(
          visible.nodes.map((table) => ({
            id: table.id,
            boundedContext: table.boundedContext,
            box: this.placedNode(table.id) ?? null,
          })),
        )
      : [];
    const groups = this.#groupByAggregate
      ? aggregateGroups(
          visible.nodes.map((table) => ({
            id: table.id,
            aggregate: table.aggregate,
            box: this.placedNode(table.id) ?? null,
          })),
        )
      : [];
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
    )}${visible.nodes.map((table) => this.#renderTable(table, lit, m, bcDimmed.has(table.id)))}`;
  }

  /**
   * Crow's foot symbols with their multiplicity beside each end: the
   * referenced table's (`parent`) where the line leaves it, the FK table's
   * (`child`) where it arrives. `plan` is the batch placement from
   * `labels.ts` — beside the stroke, beyond the glyph, and clear of cards,
   * frames, other labels and other lines. It is shared with the offline
   * appraisal, so this method never invents a position the metric cannot see.
   * A changed value keeps its previous one, struck through.
   */
  #renderEnds(
    points: readonly LayoutPoint[],
    relation: ErRelation,
    plan: RelationLabelPlan | undefined,
  ): TemplateResult {
    const previous = relation.before;
    const value = (now: string | null, was: string | null | undefined) =>
      svg`${
        was !== undefined && was !== null && was !== now ? svg`<tspan class="er-was">${was}</tspan> ` : nothing
      }${now ?? nothing}`;
    const end = (side: ErEnd) => {
      const multiplicity = side === 'start' ? relation.cardinality.parent : relation.cardinality.child;
      const was = previous && (side === 'start' ? previous.cardinality.parent : previous.cardinality.child);
      const glyph = endGlyph(points, side, multiplicity);
      const placed = plan?.[side];
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
            text-anchor=${placed?.anchor ?? glyph.label.anchor}
            dominant-baseline="central"
            x=${placed?.x ?? glyph.label.x}
            y=${placed?.y ?? glyph.label.y}
          >${value(multiplicity, was)}</text>
        `,
      };
    };
    const start = end('start');
    const finish = end('end');
    const label = relation.label ?? previous?.label ?? null;
    const relationLabel = plan?.relation;
    return svg`
      ${start.content}${finish.content}
      ${
        label === null
          ? nothing
          : svg`<text
              class="er-relation-label is-${relation.status}"
              text-anchor=${relationLabel?.anchor ?? finish.glyph.label.anchor}
              x=${relationLabel?.x ?? finish.glyph.label.x}
              dominant-baseline="central"
              y=${relationLabel?.y ?? finish.glyph.label.y}
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
    const fields = table.fields;
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
              if (!this.consumeDragClick()) this.openSelection({ kind: 'node', id: table.id });
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
                    title=${m.editFieldButton(field.id)}
                    @click=${() => this.#open(columnOf(table.id, field))}
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

  /** Deletes a column from its form, back to the table's detail once the delete is recorded. */
  #deleteColumn(table: string, field: string): void {
    const recorded = this.dispatchElementAction(DELETE_FIELD, ['node', table], { field });
    if (!recorded) {
      if (this.#editor !== null) this.#editor = { ...this.#editor, failed: true };
      this.requestUpdate();
      return;
    }
    this.#editor = null;
    this.#returnTo = 'add';
    this.requestUpdate();
  }

  #renderAdd(table: ErTableDiff, m: ErDiagramMessages): TemplateResult | typeof nothing {
    if (!this.#recordable || table.status === 'removed') return nothing;
    const adding = this.#editor?.kind === 'add' && this.#editor.table === table.id;
    return html`<div class="er-add">
      <button
        type="button"
        class=${classNames('er-add-button', adding && 'is-open')}
        data-action="add-field"
        @click=${() => this.#open(blankColumn(table.id))}
      >
        <span class="er-icon" aria-hidden="true">${iconPlus()}</span><span>${m.addFieldButton}</span>
      </button>
    </div>`;
  }

  // ----------------------------------------------------------------- detail

  protected override get providesPanelDetail(): boolean {
    return true;
  }

  /**
   * A table's detail lists its columns, and turns into a column's form while
   * one is open; a relation's detail holds its cardinality.
   */
  protected override panelDetail(selection: GraphSelection): PanelDetail | null {
    const m = erDiagramMessages(this.locale);
    const items = this.items();
    if (selection.kind === 'edge') {
      const relation = items.edges.find((edge) => edge.id === selection.id);
      if (relation === undefined) return null;
      const cardinality = this.#cardinalityEditor?.edge === relation.id ? this.#cardinalityEditor : null;
      return this.#detail(
        `edge:${relation.id}`,
        m.edge,
        `${relation.from} → ${relation.to}`,
        {
          kind: 'relation',
          relation,
          cardinality: this.#recordable ? (cardinality ?? this.#freshCardinality(relation)) : null,
        },
        () => this.renderRoot.querySelector<SVGElement>(`[data-relation="${CSS.escape(relation.id)}"] .d-edge-hit`),
        this.commentRef('edge', relation.id),
      );
    }
    const table = items.nodes.find((node) => node.id === selection.id);
    if (table === undefined) return null;
    const focus = (): HTMLElement | null =>
      this.renderRoot.querySelector<HTMLElement>(`[data-er-table="${CSS.escape(table.id)}"] .er-head-select`);
    const comment = this.commentRef('node', table.id);
    const editor = this.#editor;
    if (editor !== null && editor.table === table.id) {
      const field = editor.kind === 'edit' ? table.fields.find((item) => item.id === editor.field) : undefined;
      return this.#detail(
        editorKey(editor),
        editor.kind === 'add' ? m.addFieldTitle : m.editFieldTitle,
        editor.kind === 'add' ? table.id : `${table.id}.${editor.field}`,
        {
          kind: 'column',
          table,
          editor,
          types: typeSuggestions(items),
          deleteRelations:
            field !== undefined && this.#deletable(field) ? fieldRelations(items, table.id, field.id).length : null,
        },
        focus,
        comment,
      );
    }
    const returnTo = this.#returnTo;
    this.#returnTo = null;
    return this.#detail(
      `table:${table.id}`,
      m.node,
      table.id,
      { kind: 'table', table, recordable: this.#recordable, returnTo },
      focus,
      comment,
    );
  }

  #detail(
    key: string,
    kind: string,
    title: string,
    view: ErDetailView,
    target: () => Element | null,
    comment: string,
  ): PanelDetail {
    const m = erDiagramMessages(this.locale);
    return {
      key,
      kind,
      title,
      render: () =>
        html`<dpk-internal-er-diagram-detail
          .view=${view}
          .messages=${m}
          .actions=${this.#detailActions}
        ></dpk-internal-er-diagram-detail>`,
      focus: () => {
        const element = target();
        if (element instanceof HTMLElement || element instanceof SVGElement) element.focus({ preventScroll: true });
      },
      comment: () => this.openComment(comment),
    };
  }

  readonly #detailActions: ErDetailActions = {
    openColumn: (editor) => this.#open(editor),
    change: (patch) => this.#change(patch),
    submit: () => this.#submit(),
    close: (discard) => this.#close(discard, true),
    deleteColumn: (table, field) => this.#deleteColumn(table, field),
    pickCardinality: (value) => this.#pickCardinality(value),
  };

  #freshCardinality(relation: ErRelation): CardinalityEditor {
    return { edge: relation.id, cardinality: cardinalityValue(relation.cardinality), failed: false };
  }

  /** A picked cardinality commits immediately: no separate Save. */
  #pickCardinality(value: string): void {
    const selection = this.selection;
    if (selection?.kind !== 'edge') return;
    const recorded = this.dispatchElementAction(EDIT_CARDINALITY, ['edge', selection.id], { cardinality: value });
    this.#cardinalityEditor = { edge: selection.id, cardinality: value, failed: !recorded };
    this.requestUpdate();
  }

  /** Keeps the open editor's input for when the same editor opens again. */
  #park(): void {
    if (this.#editor === null || this.#base === null) return;
    this.#parked.set(editorKey(this.#editor), { draft: this.#editor, base: this.#base });
  }

  #hover(focus: ErFocus | null): void {
    if (JSON.stringify(this.#hovered) === JSON.stringify(focus)) return;
    this.#hovered = focus;
    // Hover changes only classes on the existing nodes/edges. Re-rendering the
    // whole template for that re-diffed ~2,800 elements per pointer move; the
    // layout, routes and label boxes are all unchanged by a hover.
    this.#applyHighlight();
  }

  /** Applies the current hover/selection highlight to the rendered DOM, without a template re-render. */
  #applyHighlight(): void {
    const lit = this.#highlight(this.visible);
    const concealed = this.#concealed(this.visible);
    // A concealed line coming out (or going back) adds (or drops) the jumps over it.
    const paths = this.#paths(this.visible, lit);
    const root = this.renderRoot;
    for (const edge of root.querySelectorAll<SVGGElement>('.er-edge')) {
      const id = edge.getAttribute('data-relation') ?? '';
      edge.classList.toggle('is-lit', lit.edges.has(id));
      edge.classList.toggle('is-faded', lit.edges.size > 0 && !lit.edges.has(id));
      edge.classList.toggle('is-concealed', concealed.has(id) && !lit.edges.has(id));
      const d = paths.get(id);
      if (d === undefined) continue;
      for (const path of edge.querySelectorAll(EDGE_PATHS)) {
        if (path.getAttribute('d') !== d) path.setAttribute('d', d);
      }
    }
    for (const table of root.querySelectorAll<HTMLElement>('.er-table')) {
      const id = table.getAttribute('data-er-table') ?? '';
      table.classList.toggle('is-lit', lit.tables.has(id));
      for (const field of table.querySelectorAll<HTMLElement>('.er-field')) {
        const fieldId = field.getAttribute('data-field') ?? '';
        field.classList.toggle('is-lit', lit.columns.has(`${id}.${fieldId}`));
      }
    }
  }

  /** Opens a column's form in the side panel; one already open elsewhere keeps its input for later. */
  #open(editor: ColumnEditor): void {
    this.#park();
    this.#editor = resumeEditor(this.#parked.get(editorKey(editor)), editor);
    this.#base = editor;
    this.#parked.delete(editorKey(editor));
    this.openSelection({ kind: 'node', id: editor.table });
    this.requestUpdate();
  }

  #change(patch: ColumnPatch): void {
    const editor = this.#editor;
    if (editor === null) return;
    const { name, ...rest } = patch;
    this.#editor =
      editor.kind === 'add'
        ? { ...editor, ...rest, ...(name === undefined ? {} : { name }), failed: false }
        : { ...editor, ...rest, failed: false };
    this.requestUpdate();
  }

  /**
   * Closes the column's form, back to its table's detail. Cancel throws the
   * input away; Escape and the row's own trigger park it, so reopening the
   * same form brings it back. Closed from the panel, the focus goes to the
   * control in the table's detail that opens the same form.
   */
  #close(discard: boolean, fromPanel: boolean): void {
    const editor = this.#editor;
    if (editor === null) return;
    if (!discard) this.#park();
    this.#editor = null;
    this.#returnTo = fromPanel ? columnControl(editor) : null;
    this.requestUpdate();
  }

  #submit(): void {
    const editor = this.#editor;
    const table = editor === null ? undefined : this.items().nodes.find((node) => node.id === editor.table);
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
    this.#close(true, true);
  }
}

/** One form per new column of a table, and per existing column. */
const editorKey = (editor: ColumnEditor): string =>
  editor.kind === 'add' ? `add:${editor.table}` : `edit:${editor.table}:${editor.field}`;
