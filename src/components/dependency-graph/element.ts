import { html, svg, nothing, type CSSResultGroup, type TemplateResult } from 'lit';

import type { LayoutOptions } from '../../lib/layout/layered';

import { DiagramElement } from '../diagram/element';
import {
  cycleMembership,
  findCycles,
  isCycleEdge,
  EMPTY_REACH,
  reach,
  tagStateMatches,
  type DiagramSelection,
  type Reach,
} from '../diagram/model';
import { diagramStyles } from '../diagram/styles';
import { pathData } from '../diagram/view';
import {
  emptyDependencyData,
  parseDependencyData,
  type DependencyData,
  type DependencyDirection,
  type DependencyLink,
  type DependencyModule,
} from './model';
import { dependencyStyles } from './styles';

const ARROWS = [
  { id: 'dep-neutral' },
  { id: 'dep-outgoing' },
  { id: 'dep-incoming' },
  { id: 'dep-cycle' },
  { id: 'dep-selected' },
] as const;

/** Module dependencies: pick a module to see what it uses and what uses it. */
export class DpkComponentDependencyGraph extends DiagramElement<DependencyData> {
  static override styles: CSSResultGroup = [diagramStyles, dependencyStyles];

  #direction: DependencyDirection = 'both';
  #transitive = false;
  #cyclesOnly = false;
  #allCycles: readonly (readonly string[])[] = [];
  #outgoing: Reach = EMPTY_REACH;
  #incoming: Reach = EMPTY_REACH;

  protected override parseData(input: unknown): DependencyData {
    return parseDependencyData(input);
  }

  protected override emptyData(): DependencyData {
    return emptyDependencyData();
  }

  protected override defaultHeading(): string {
    return 'Dependencies';
  }

  protected override statsLabels(): { readonly node: string; readonly edge: string } {
    return { node: 'モジュール', edge: '依存' };
  }

  protected override emptyMessage(): string {
    return this.#cyclesOnly ? '該当する循環依存はありません。' : '該当するモジュールはありません。';
  }

  protected override layoutOptions(): LayoutOptions {
    return { nodeSpacing: 40, layerSpacing: 96, padding: 32 };
  }

  protected override relations(selection: DiagramSelection, _visible: DependencyData): Reach {
    if (selection === null || selection.kind !== 'node') return EMPTY_REACH;
    return {
      nodes: new Map([...this.#outgoing.nodes, ...this.#incoming.nodes]),
      edges: new Set([...this.#outgoing.edges, ...this.#incoming.edges]),
    };
  }

  /** Cycles are computed over the tag-filtered graph, before the cycle filter. */
  protected override refreshContent(): void {
    const items = this.items();
    const tags = this.tagFilter;
    const nodes = items.nodes.filter((node) => tagStateMatches(node.tags, tags));
    const ids = new Set(nodes.map((node) => node.id));
    const edges = items.edges.filter((edge) => ids.has(edge.from) && ids.has(edge.to));
    this.#allCycles = findCycles(
      nodes.map((node) => node.id),
      edges,
    );
    const selection = this.selection;
    this.#outgoing =
      selection !== null && selection.kind === 'node' && this.#direction !== 'incoming'
        ? reach(edges, selection.id, 'outgoing', this.#transitive)
        : EMPTY_REACH;
    this.#incoming =
      selection !== null && selection.kind === 'node' && this.#direction !== 'outgoing'
        ? reach(edges, selection.id, 'incoming', this.#transitive)
        : EMPTY_REACH;
    super.refreshContent();
  }

  protected override matchesFilter(node: DependencyModule): boolean {
    if (!this.#cyclesOnly) return true;
    return cycleMembership(this.#allCycles).has(node.id);
  }

  protected override filtered(): DependencyData {
    const visible = super.filtered();
    if (!this.#cyclesOnly) return visible;
    const membership = cycleMembership(this.#allCycles);
    const edges = visible.edges.filter((edge) => isCycleEdge(edge, membership));
    const ids = new Set(edges.flatMap((edge) => [edge.from, edge.to]));
    return { nodes: visible.nodes.filter((node) => ids.has(node.id)), edges };
  }

  protected override renderToolbarActions(): TemplateResult {
    const cycles = this.#allCycles.length;
    return html`
      <div class="dep-direction" role="group" aria-label="選択したモジュールから追う方向">
        ${(
          [
            ['outgoing', '依存先'],
            ['incoming', '依存元'],
            ['both', '両方'],
          ] as const
        ).map(
          ([id, label]) => html`
            <button
              type="button"
              data-direction=${id}
              aria-pressed=${this.#direction === id ? 'true' : 'false'}
              @click=${() => this.#setDirection(id)}
            >
              ${label}
            </button>
          `,
        )}
      </div>
      <button
        type="button"
        class="dpk-btn dpk-btn--ghost dep-toggle"
        data-toggle="transitive"
        aria-pressed=${this.#transitive ? 'true' : 'false'}
        @click=${() => {
          this.#transitive = !this.#transitive;
          this.requestUpdate();
        }}
      >
        間接も含む
      </button>
      <button
        type="button"
        class="dpk-btn dpk-btn--ghost dep-toggle"
        data-toggle="cycles"
        aria-pressed=${this.#cyclesOnly ? 'true' : 'false'}
        aria-label=${`循環依存 ${cycles} グループだけ表示`}
        ?disabled=${!this.#cyclesOnly && cycles === 0}
        @click=${() => {
          this.#cyclesOnly = !this.#cyclesOnly;
          this.requestUpdate();
        }}
      >
        循環 ${cycles}
      </button>
    `;
  }

  protected override renderLegend(): TemplateResult {
    return html`<div class="diagram-legend">
      <span><i class="dep-swatch-outgoing"></i>依存先</span>
      <span><i class="dep-swatch-incoming"></i>依存元</span>
      <span><i class="dep-swatch-cycle"></i>循環</span>
    </div>`;
  }

  #setDirection(direction: DependencyDirection): void {
    this.#direction = direction;
    this.requestUpdate();
  }

  #edgeMarker(link: DependencyLink, membership: ReadonlyMap<string, number>): string {
    const selection = this.selection;
    if (selection !== null && selection.kind === 'edge' && selection.id === link.id) return 'dep-selected';
    if (isCycleEdge(link, membership)) return 'dep-cycle';
    if (this.#outgoing.edges.has(link.id)) return 'dep-outgoing';
    if (this.#incoming.edges.has(link.id)) return 'dep-incoming';
    return 'dep-neutral';
  }

  protected override renderCanvas(): TemplateResult {
    const visible = this.visible;
    const membership = cycleMembership(this.#allCycles);
    const name = (id: string) => visible.nodes.find((node) => node.id === id)?.name ?? id;
    const edges = visible.edges.map((link) => {
      const state = this.edgeState(link.id);
      const route = this.routeOf(link.id);
      const points = pathData(route);
      const select = () => this.select({ kind: 'edge', id: link.id });
      return svg`
        <g class=${this.elementClass(state, 'd-edge', 'dep-edge')} data-dependency=${link.id}>
          <title>${[link.contract, link.description].filter((value) => value !== null).join('\n') || link.id}</title>
          <path class="d-edge-path" d=${points} marker-end=${`url(#${this.#edgeMarker(link, membership)})`}></path>
          <path
            class="d-edge-hit"
            d=${points}
            role="button"
            tabindex="0"
            aria-label=${`${name(link.from)} が ${name(link.to)} に依存`}
            @click=${select}
            @keydown=${(event: KeyboardEvent) => {
              if (event.key !== 'Enter' && event.key !== ' ') return;
              event.preventDefault();
              select();
            }}
          ></path>
          ${this.renderEdgeCommentTrigger({ kind: 'edge', id: link.id }, `${name(link.from)} → ${name(link.to)}`, route)}
        </g>
      `;
    });
    const nodes = visible.nodes.map((node) => {
      const placed = this.placedNode(node.id);
      if (!placed) return nothing;
      const state = this.nodeState(node.id);
      const cyclic = membership.has(node.id);
      const dependency = this.#outgoing.nodes.has(node.id);
      const dependent = this.#incoming.nodes.has(node.id);
      return html`
        <button
          type="button"
          class=${this.elementClass(
            state,
            'd-node',
            'dep-module',
            cyclic && 'is-cyclic',
            dependency && 'is-dependency',
            dependent && 'is-dependent',
          )}
          data-module=${node.id}
          data-grill-questions=${this.questionsOf(node)}
          style="left:${placed.x}px; top:${placed.y}px; width:${node.width}px; height:${node.height}px"
          aria-pressed=${state.selected ? 'true' : 'false'}
          aria-label=${`${node.name}${cyclic ? '・循環依存あり' : ''}`}
          title=${[node.path ?? node.name, node.description].filter((value) => value !== null).join('\n')}
          @click=${() => this.select({ kind: 'node', id: node.id })}
        >
          <span class="dep-head">
            <span class="dep-layer">${node.layer ?? ''}</span>
            ${cyclic ? html`<span class="dep-cycle-badge">循環</span>` : nothing}
          </span>
          <span class="dep-name">${node.name}</span>
          <span class="dep-path">${node.path ?? ''}</span>
        </button>
        ${this.renderCommentTrigger({ kind: 'node', id: node.id }, node.name, {
          x: placed.x + node.width - 20,
          y: placed.y - 14,
        })}
      `;
    });
    return html`${this.renderEdges(edges, ARROWS)}${nodes}`;
  }
}
