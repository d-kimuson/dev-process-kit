import { html, svg, nothing, type CSSResultGroup, type TemplateResult } from 'lit';

import type { CommentTargetOption } from '../../core/types';
import type { LayoutOptions, LayoutResult } from '../../lib/layout/layered';

import { BoardCanvasElement } from '../base/element';
import { EMPTY_REACH, reach, routeLabelPoint, type DiagramSelection, type Reach } from '../base/model';
import { diagramStyles } from '../base/styles';
import { roundedPathData } from '../base/view';
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

const ARROWS = [
  { id: 'state-arrow' },
  { id: 'state-arrow-selected' },
  { id: 'state-arrow-related' },
  { id: 'state-arrow-exception' },
] as const;

/** Room around the states for what is drawn outside them: self transitions, their labels, outer lanes. */
const CANVAS_PADDING = 72;
const NODE_SPACING = 56;
/** Gap between two ranks: the widest label plus the line that has to stay visible beside it. */
const LAYER_SPACING = { min: 112, max: 240, besideLabel: 72 } as const;

/** Lifecycle diagram: select a state to see its transitions, or one transition. */
export class DpkBoardStateDiagram extends BoardCanvasElement<StateDiagramData> {
  static override styles: CSSResultGroup = [diagramStyles, stateDiagramStyles];

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
    return html`
      ${this.renderEdges(
        this.visible.edges.map((edge) => this.#renderTransition(edge)),
        ARROWS,
      )}
      ${this.visible.nodes.map((node) => this.#renderState(node))}
      ${this.visible.edges.map((edge) => this.#renderLabel(edge))}
    `;
  }

  #name(id: string): string {
    return this.filtered().nodes.find((node) => node.id === id)?.name ?? id;
  }

  /** The guard and the effect, which only the tooltip carries now that there is no details panel. */
  #tooltip(edge: StateTransition): string {
    return [edge.guard, edge.effect].filter((value) => value !== null).join('\n') || edge.title;
  }

  #renderTransition(edge: StateTransition): TemplateResult {
    const m = stateDiagramMessages(this.locale);
    const state = this.edgeState(edge.id);
    const points = this.routeOf(edge.id);
    const path = roundedPathData(points);
    const marker = state.selected
      ? 'state-arrow-selected'
      : state.related
        ? 'state-arrow-related'
        : edge.kind === 'exception'
          ? 'state-arrow-exception'
          : 'state-arrow';
    const select = () => this.select({ kind: 'edge', id: edge.id });
    return svg`
      <g
        class=${this.elementClass(state, 'd-edge', 'state-edge', edge.kind === 'exception' && 'is-exception')}
        data-transition=${edge.id}
      >
        <title>${this.#tooltip(edge)}</title>
        <path class="d-edge-path" d=${path} marker-end=${`url(#${marker})`}></path>
        <path
          class="d-edge-hit"
          d=${path}
          role="button"
          tabindex="0"
          aria-label=${m.transitionLabel(this.#name(edge.from), this.#name(edge.to), edge.title)}
          @click=${select}
          @keydown=${(event: KeyboardEvent) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            select();
          }}
        ></path>
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
