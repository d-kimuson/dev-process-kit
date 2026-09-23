import { html, svg, nothing, type CSSResultGroup, type TemplateResult } from 'lit';

import type { LayoutOptions } from '../../lib/layout/layered';

import { DiagramElement } from '../diagram/element';
import { classNames, EMPTY_REACH, reach, routeLabelPoint, type DiagramSelection, type Reach } from '../diagram/model';
import { diagramStyles } from '../diagram/styles';
import { pathData } from '../diagram/view';
import {
  emptyStateData,
  hasAuthoredPositions,
  parseStateData,
  type StateDiagramData,
  type StateNode,
  type StateTransition,
} from './model';
import { stateDiagramStyles } from './styles';

const ARROWS = [{ id: 'state-arrow' }, { id: 'state-arrow-active' }, { id: 'state-arrow-exception' }] as const;

/** Lifecycle diagram: select a state to see its transitions, or one transition. */
export class DpkComponentStateDiagram extends DiagramElement<StateDiagramData> {
  static override styles: CSSResultGroup = [diagramStyles, stateDiagramStyles];

  protected override parseData(input: unknown): StateDiagramData {
    return parseStateData(input);
  }

  protected override emptyData(): StateDiagramData {
    return emptyStateData();
  }

  protected override defaultHeading(): string {
    return 'State machine';
  }

  protected override statsLabels(): { readonly node: string; readonly edge: string } {
    return { node: '状態', edge: '遷移' };
  }

  protected override emptyMessage(): string {
    return '該当する遷移はありません。';
  }

  /** Transitions carry the tags here, so the filter decides which states exist. */
  protected override get tagDimension(): 'edge' {
    return 'edge';
  }

  protected override get layoutMode(): 'fixed' | 'layered' {
    return hasAuthoredPositions(this.filtered().nodes) ? 'fixed' : 'layered';
  }

  protected override layoutOptions(): LayoutOptions {
    return this.layoutMode === 'fixed' ? { padding: 44 } : { nodeSpacing: 40, layerSpacing: 110, padding: 44 };
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

  protected override renderCanvas(): TemplateResult {
    const nodes = this.visible.nodes;
    const markers = nodes.filter((node) => node.kind === 'initial').map((node) => this.#renderInitialMark(node));
    return html`
      ${this.renderEdges([...markers, ...this.visible.edges.map((edge) => this.#renderTransition(edge))], ARROWS)}
      ${nodes.map((node) => this.#renderState(node))} ${this.visible.edges.map((edge) => this.#renderLabel(edge))}
    `;
  }

  #name(id: string): string {
    return this.filtered().nodes.find((node) => node.id === id)?.name ?? id;
  }

  /** The guard and the effect, which only the tooltip carries now that there is no details panel. */
  #tooltip(edge: StateTransition): string {
    return [edge.guard, edge.effect].filter((value) => value !== null).join('\n') || edge.title;
  }

  #renderInitialMark(node: StateNode): TemplateResult | typeof nothing {
    const placed = this.placedNode(node.id);
    if (!placed) return nothing;
    const center = placed.y + placed.height / 2;
    const state = this.nodeState(node.id);
    return svg`
      <g class=${classNames('state-initial-mark', state.dimmed && 'is-dimmed')}>
        <circle cx=${placed.x - 22} cy=${center} r="5"></circle>
        <path
          d=${pathData([
            { x: placed.x - 17, y: center },
            { x: placed.x - 1, y: center },
          ])}
          stroke-width="1.6"
        ></path>
      </g>
    `;
  }

  #renderTransition(edge: StateTransition): TemplateResult {
    const state = this.edgeState(edge.id);
    const points = this.routeOf(edge.id);
    const path = pathData(points);
    const active = state.selected || state.related;
    const marker = active ? 'state-arrow-active' : edge.kind === 'exception' ? 'state-arrow-exception' : 'state-arrow';
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
          aria-label=${`${this.#name(edge.from)} から ${this.#name(edge.to)} への ${edge.title}`}
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
        class=${this.elementClass(state, 'd-node', 'state-node', `is-${node.kind}`)}
        data-state=${node.id}
        data-grill-questions=${this.questionsOf(node)}
        style="left:${placed.x}px; top:${placed.y}px; width:${node.width}px; height:${node.height}px"
        aria-pressed=${state.selected ? 'true' : 'false'}
        title=${node.description ?? node.name}
        @click=${() => this.select({ kind: 'node', id: node.id })}
      >
        <span class="state-name">${node.name}</span>
        ${node.code === null ? nothing : html`<span class="state-code">${node.code}</span>`}
      </button>
      ${this.renderCommentTrigger({ kind: 'node', id: node.id }, node.name, {
        x: placed.x + node.width - 20,
        y: placed.y - 14,
      })}
    `;
  }

  #renderLabel(edge: StateTransition): TemplateResult {
    const state = this.edgeState(edge.id);
    const point = routeLabelPoint(this.routeOf(edge.id));
    return html`
      <span class="state-label-slot" style="left:${point.x}px; top:${point.y}px">
        <button
          type="button"
          class=${this.elementClass(state, 'state-label')}
          data-transition-label=${edge.id}
          data-grill-questions=${this.questionsOf(edge)}
          title=${this.#tooltip(edge)}
          @click=${() => this.select({ kind: 'edge', id: edge.id })}
        >
          ${edge.title}
        </button>
        ${this.renderCommentTrigger(
          { kind: 'edge', id: edge.id },
          `${this.#name(edge.from)} → ${this.#name(edge.to)} · ${edge.title}`,
        )}
      </span>
    `;
  }
}
