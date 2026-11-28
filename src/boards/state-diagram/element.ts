import { html, svg, nothing, type CSSResultGroup, type TemplateResult } from 'lit';

import type { CommentTargetOption } from '../../core/types';
import type { LayoutOptions, LayoutPoint, LayoutResult } from '../../lib/layout/layered';

import {
  END_MARKERS,
  edgeBody,
  edgeSteps,
  lineStyleClass,
  type EdgeEndView,
  type EdgeSpec,
} from '../../components/diagram/edge';
import { jumpedPaths } from '../../lib/layout/line-jumps';
import { endFrame, stepsData, type PathStep } from '../../lib/layout/path-steps';
import { BoardCanvasElement } from '../base/element';
import { EMPTY_REACH, reach, routeLabelPoint, type DiagramSelection, type Reach } from '../base/model';
import { diagramStyles } from '../base/styles';
import { CORNER_RADIUS } from '../base/view';
import { stateDiagramMessages } from './messages';
import {
  emptyStateData,
  hasAuthoredPositions,
  parseStateData,
  type StateDiagramData,
  type StateNode,
  type StateTransition,
} from './model';
import { stateLabelPoint, stateLabelSize, withStateRoutes } from './route';
import { stateDiagramStyles } from './styles';

/** Every transition is drawn the same way: a solid line ending in an arrowhead. Dashed/flowing come from the state classes. */
const TRANSITION_SPEC: EdgeSpec = { line: 'solid', start: null, end: END_MARKERS.arrow, flow: 'active' };

/**
 * A transition's jump raises where another transition crosses it: the arrow
 * tip needs 10px kept straight, the start needs none.
 */
const JUMP_CLEARANCE = { start: 0, end: 10 } as const;

/** Room around the states for what is drawn outside them: self transitions, their labels, outer lanes. */
const CANVAS_PADDING = 72;
const NODE_SPACING = 56;
/** Gap between two ranks: the widest label plus the line that has to stay visible beside it. */
const LAYER_SPACING = { min: 112, max: 240, besideLabel: 72 } as const;

/** Lifecycle diagram: select a state to see its transitions, or one transition. */
export class DpkBoardStateDiagram extends BoardCanvasElement<StateDiagramData> {
  static override styles: CSSResultGroup = [diagramStyles, stateDiagramStyles];

  /**
   * Jumped paths for the routes they were computed from. The layout object is
   * rebuilt whenever a position override is applied (`#applyPositions`), so it
   * cannot be the key: a drag would miss the cache every render. The routes
   * themselves are what the jumps depend on, so they key it instead.
   */
  #jumps: { readonly signature: string; readonly paths: ReadonlyMap<string, string> } | null = null;

  protected override parseData(input: unknown): StateDiagramData {
    return parseStateData(input);
  }

  protected override emptyData(): StateDiagramData {
    return emptyStateData();
  }

  protected override defaultHeading(): string {
    return stateDiagramMessages(this.locale).heading;
  }

  protected override statsLabels(): { readonly node: string; readonly edge: string } {
    const m = stateDiagramMessages(this.locale);
    return { node: m.node, edge: m.edge };
  }

  protected override emptyMessage(): string {
    return stateDiagramMessages(this.locale).empty;
  }

  /** Transitions carry the tags here, so the filter decides which states exist. */
  protected override get tagDimension(): 'edge' {
    return 'edge';
  }

  protected override get layoutMode(): 'fixed' | 'layered' {
    return hasAuthoredPositions(this.filtered().nodes) ? 'fixed' : 'layered';
  }

  protected override layoutOptions(): LayoutOptions {
    if (this.layoutMode === 'fixed') return { padding: this.figurePadding(CANVAS_PADDING) };
    const widest = Math.max(0, ...this.filtered().edges.map((edge) => stateLabelSize(edge.title).width));
    return {
      nodeSpacing: NODE_SPACING,
      layerSpacing: Math.min(LAYER_SPACING.max, Math.max(LAYER_SPACING.min, widest + LAYER_SPACING.besideLabel)),
      padding: this.figurePadding(CANVAS_PADDING),
    };
  }

  /**
   * Transitions are drawn by the board's own router, not by the shared
   * layout's (see `./route.ts`). Running it from `routePlacement` means the
   * reader's dragged placement gets the same route as the computed one.
   */
  protected override routePlacement(placement: LayoutResult, visible: StateDiagramData): LayoutResult {
    return withStateRoutes(placement, visible.edges);
  }

  protected override relations(selection: DiagramSelection, visible: StateDiagramData): Reach {
    if (selection === null || selection.kind !== 'node') return EMPTY_REACH;
    const outgoing = reach(visible.edges, selection.id, 'outgoing', false);
    const incoming = reach(visible.edges, selection.id, 'incoming', false);
    return {
      nodes: new Map([...outgoing.nodes, ...incoming.nodes]),
      edges: new Set([...outgoing.edges, ...incoming.edges]),
    };
  }

  /** State and transition names, not raw ids, so "Review comment" reads like the diagram does. */
  protected override commentItems(): readonly CommentTargetOption[] {
    const items = this.items();
    const name = (id: string) => items.nodes.find((node) => node.id === id)?.name ?? id;
    return [
      ...items.nodes.map((node) => ({ value: this.commentRef('node', node.id), label: node.name })),
      ...items.edges.map((edge) => ({
        value: this.commentRef('edge', edge.id),
        label: `${name(edge.from)} → ${name(edge.to)} · ${edge.title}`,
      })),
    ];
  }

  protected override renderCanvas(): TemplateResult {
    const paths = this.#paths();
    return html`
      ${this.renderEdges(this.visible.edges.map((edge) => this.#renderTransition(edge, paths)))}
      ${this.visible.nodes.map((node) => this.#renderState(node))}
      ${this.visible.edges.map((edge) => this.#renderLabel(edge))}
    `;
  }

  /**
   * Every transition's drawn `d`, its level runs jumping the transitions that
   * cross them. Memoised by route signature, so a hover or a selection (which
   * only changes classes) reuses its own paths, and so does a drag: the base
   * element rebuilds the layout on every override, but the routes only change
   * when a state actually moves. Mid-drag the lines draw plain, as the ER
   * board's do, rather than redo every crossing on each pointer move.
   */
  #paths(): ReadonlyMap<string, string> {
    const routed = new Map(this.visible.edges.map((edge) => [edge.id, this.routeOf(edge.id)] as const));
    const lines = new Map<string, readonly PathStep[]>(
      this.visible.edges.map((edge) => [
        edge.id,
        edgeSteps(routed.get(edge.id) ?? [], TRANSITION_SPEC, { radius: CORNER_RADIUS }),
      ]),
    );
    if (this.draggedNodeIds().size > 0) {
      return new Map([...lines].map(([id, steps]) => [id, stepsData(steps)] as const));
    }
    const signature = [...lines].map(([id, steps]) => `${id}:${stepsData(steps)}`).join('|');
    if (this.#jumps?.signature === signature) return this.#jumps.paths;
    const paths = jumpedPaths(lines, new Set(lines.keys()), { clearance: JUMP_CLEARANCE });
    this.#jumps = { signature, paths };
    return paths;
  }

  /** One transition's end glyph, at the route's arrival end. */
  #end(points: readonly LayoutPoint[]): EdgeEndView | null {
    if (points.length < 2) return null;
    return { side: 'end', marker: END_MARKERS.arrow, frame: endFrame(points, 'end') };
  }

  #name(id: string): string {
    return this.filtered().nodes.find((node) => node.id === id)?.name ?? id;
  }

  /** The guard and the effect, which only the tooltip carries now that there is no details panel. */
  #tooltip(edge: StateTransition): string {
    return [edge.guard, edge.effect].filter((value) => value !== null).join('\n') || edge.title;
  }

  #renderTransition(edge: StateTransition, paths: ReadonlyMap<string, string>): TemplateResult {
    const m = stateDiagramMessages(this.locale);
    const state = this.edgeState(edge.id);
    const points = this.routeOf(edge.id);
    const d = paths.get(edge.id) ?? '';
    const end = this.#end(points);
    const select = () => this.select({ kind: 'edge', id: edge.id });
    return svg`
      <g
        class=${this.elementClass(
          state,
          'd-edge',
          'state-edge',
          edge.kind === 'exception' && 'is-exception',
          lineStyleClass(edge.kind === 'exception' ? 'dashed' : 'solid'),
          state.related && 'is-flowing',
        )}
        data-transition=${edge.id}
      >
        <title>${this.#tooltip(edge)}</title>
        ${edgeBody({
          d,
          ends: end === null ? [] : [end],
          flow: true,
          hit: {
            label: m.transitionLabel(this.#name(edge.from), this.#name(edge.to), edge.title),
            onSelect: select,
          },
        })}
      </g>
    `;
  }

  #renderState(node: StateNode): TemplateResult | typeof nothing {
    const placed = this.placedNode(node.id);
    if (!placed) return nothing;
    const state = this.nodeState(node.id);
    return html`
      <button
        type="button"
        class=${this.elementClass(
          state,
          'd-node',
          'state-node',
          `is-${node.kind}`,
          this.isDraggingNode(node.id) && 'is-dragging',
        )}
        data-state=${node.id}
        data-grill-questions=${this.questionsOf(node)}
        data-dpk-target=${this.commentRef('node', node.id)}
        style="left:${placed.x}px; top:${placed.y}px; width:${node.width}px; height:${node.height}px"
        aria-pressed=${state.selected ? 'true' : 'false'}
        title=${node.description ?? node.name}
        @pointerdown=${(event: PointerEvent) => this.onNodeDragStart(event, node.id)}
        @click=${() => {
          if (!this.consumeDragClick()) this.select({ kind: 'node', id: node.id });
        }}
      >
        <span class="state-title">
          ${node.kind === 'initial' ? html`<span class="state-initial-mark" aria-hidden="true"></span>` : nothing}
          ${node.kind === 'terminal' ? html`<span class="state-terminal-mark" aria-hidden="true"></span>` : nothing}
          <span class="state-name">${node.name}</span>
        </span>
        ${node.code === null ? nothing : html`<span class="state-code">${node.code}</span>`}
      </button>
    `;
  }

  #renderLabel(edge: StateTransition): TemplateResult {
    const state = this.edgeState(edge.id);
    const point = stateLabelPoint(this.layout, edge.id) ?? routeLabelPoint(this.routeOf(edge.id));
    return html`
      <span class="state-label-slot" style="left:${point.x}px; top:${point.y}px">
        <button
          type="button"
          class=${this.elementClass(state, 'state-label', edge.kind === 'exception' && 'is-exception')}
          style="max-width:${stateLabelSize(edge.title).width}px"
          data-transition-label=${edge.id}
          data-grill-questions=${this.questionsOf(edge)}
          data-dpk-target=${this.commentRef('edge', edge.id)}
          data-dpk-check="off"
          title=${this.#tooltip(edge)}
          @click=${() => this.select({ kind: 'edge', id: edge.id })}
        >
          ${edge.title}
        </button>
      </span>
    `;
  }
}
