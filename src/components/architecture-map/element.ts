import { html, svg, nothing, type CSSResultGroup, type TemplateResult } from 'lit';

import type { LayoutResult } from '../../lib/layout/layered';

import { DiagramElement } from '../diagram/element';
import { EMPTY_REACH, reach, type DiagramSelection, type Reach } from '../diagram/model';
import { diagramStyles } from '../diagram/styles';
import { pathData } from '../diagram/view';
import {
  boundaryBoxes,
  emptyArchitectureData,
  parseArchitectureData,
  type ArchitectureData,
  type ArchitectureService,
  type BoundaryBox,
} from './model';
import { withFacingRoutes } from './route';
import { architectureStyles } from './styles';

const ARROWS = [{ id: 'arch-neutral' }, { id: 'arch-selected' }] as const;

/** System map: services grouped into boundaries, with the links between them. */
export class ArtifactArchitectureMap extends DiagramElement<ArchitectureData> {
  static override styles: CSSResultGroup = [diagramStyles, architectureStyles];

  #showBoundaries = true;

  protected override parseData(input: unknown): ArchitectureData {
    return parseArchitectureData(input);
  }

  protected override emptyData(): ArchitectureData {
    return emptyArchitectureData();
  }

  protected override defaultHeading(): string {
    return 'Architecture';
  }

  protected override statsLabels(): { readonly node: string; readonly edge: string } {
    return { node: 'サービス', edge: '接続' };
  }

  protected override emptyMessage(): string {
    return '該当するサービスはありません。';
  }

  protected override get layoutMode(): 'fixed' {
    return 'fixed';
  }

  protected override layoutOptions(): { readonly padding: number } {
    return { padding: 40 };
  }

  protected override computePlacement(visible: ArchitectureData): LayoutResult {
    return withFacingRoutes(super.computePlacement(visible), visible.edges);
  }

  protected override isEmpty(): boolean {
    return this.visible.nodes.length === 0;
  }

  protected override contentSize(): { readonly width: number; readonly height: number } | null {
    const size = super.contentSize();
    if (size === null) return null;
    const boxes = this.#boundaryBoxes();
    if (boxes.length === 0) return size;
    return {
      width: Math.max(size.width, ...boxes.map((box) => box.x + box.width)),
      height: Math.max(size.height, ...boxes.map((box) => box.y + box.height)),
    };
  }

  protected override relations(selection: DiagramSelection, visible: ArchitectureData): Reach {
    if (selection === null || selection.kind !== 'node') return EMPTY_REACH;
    const outgoing = reach(visible.edges, selection.id, 'outgoing', false);
    const incoming = reach(visible.edges, selection.id, 'incoming', false);
    return {
      nodes: new Map([...outgoing.nodes, ...incoming.nodes]),
      edges: new Set([...outgoing.edges, ...incoming.edges]),
    };
  }

  protected override renderToolbarActions(): TemplateResult {
    return html`
      <button
        type="button"
        class="af-btn af-btn--ghost arch-toggle"
        data-toggle="boundaries"
        aria-pressed=${this.#showBoundaries ? 'true' : 'false'}
        @click=${() => {
          this.#showBoundaries = !this.#showBoundaries;
          this.requestUpdate();
        }}
      >
        境界
      </button>
    `;
  }

  #boundaryBoxes(): readonly BoundaryBox[] {
    const placed = this.visible.nodes.flatMap((node) => {
      const position = this.placedNode(node.id);
      return position ? [{ ...node, position: { x: position.x, y: position.y } }] : [];
    });
    return boundaryBoxes(placed, this.items().boundaries);
  }

  protected override renderCanvas(): TemplateResult {
    const visible = this.visible;
    const name = (id: string) => visible.nodes.find((node) => node.id === id)?.name ?? id;
    const edges = visible.edges.map((link) => {
      const state = this.edgeState(link.id);
      const route = this.routeOf(link.id);
      const d = pathData(route);
      const select = () => this.select({ kind: 'edge', id: link.id });
      return svg`
        <g class=${this.elementClass(state, 'd-edge', 'arch-link')} data-link=${link.id}>
          <title>${link.label ?? link.id}</title>
          <path
            class="d-edge-path"
            d=${d}
            marker-end=${`url(#${state.selected ? 'arch-selected' : 'arch-neutral'})`}
          ></path>
          <path
            class="d-edge-hit"
            d=${d}
            role="button"
            tabindex="0"
            aria-label=${`${name(link.from)} から ${name(link.to)} への接続`}
            @click=${select}
            @keydown=${(event: KeyboardEvent) => {
              if (event.key !== 'Enter' && event.key !== ' ') return;
              event.preventDefault();
              select();
            }}
          ></path>
          ${link.label === null || route.length === 0 ? nothing : this.#renderLinkLabel(link.label, route)}
          ${this.renderEdgeCommentTrigger(
            { kind: 'edge', id: link.id },
            `${name(link.from)} → ${name(link.to)}${link.label === null ? '' : ` · ${link.label}`}`,
            route,
          )}
        </g>
      `;
    });
    return html`
      ${
        this.#showBoundaries
          ? this.#boundaryBoxes().map(
              (box) => html`<div
                class=${`arch-boundary ${box.boundary.kind === 'external' ? 'is-external' : ''}`}
                data-boundary=${box.boundary.id}
                style="left:${box.x}px; top:${box.y}px; width:${box.width}px; height:${box.height}px"
              >
                <span>${box.boundary.label}</span>
              </div>`,
            )
          : nothing
      }
      ${this.renderEdges(edges, ARROWS)} ${visible.nodes.map((service) => this.#renderService(service))}
    `;
  }

  #renderLinkLabel(label: string, points: readonly { x: number; y: number }[]): TemplateResult {
    const middle = points[Math.floor(points.length / 2)] ?? points[0];
    if (!middle) return html``;
    return svg`<text class="arch-link-label" x=${middle.x} y=${middle.y - 6}>${label}</text>`;
  }

  #renderService(service: ArchitectureService): TemplateResult | typeof nothing {
    const placed = this.placedNode(service.id);
    if (!placed) return nothing;
    const state = this.nodeState(service.id);
    return html`
      <button
        type="button"
        class=${this.elementClass(state, 'd-node', 'arch-service')}
        data-service=${service.id}
        data-grill-questions=${this.questionsOf(service)}
        style="left:${placed.x}px; top:${placed.y}px; width:${service.width}px; height:${service.height}px"
        aria-pressed=${state.selected ? 'true' : 'false'}
        title=${service.description ?? service.name}
        @click=${() => this.select({ kind: 'node', id: service.id })}
      >
        ${
          service.artwork === null
            ? html`<span class="arch-symbol" aria-hidden="true">${service.symbol ?? service.name.slice(0, 2)}</span>`
            : html`<img
                class="arch-artwork"
                src=${service.artwork.src}
                alt=${service.artwork.alt}
                title=${service.artwork.license === null ? nothing : `アイコン出典: ${service.artwork.license}`}
              />`
        }
        <span class="arch-body">
          <span class="arch-name">${service.name}</span>
          ${service.description === null ? nothing : html`<span class="arch-description">${service.description}</span>`}
        </span>
      </button>
      ${this.renderCommentTrigger({ kind: 'node', id: service.id }, service.name, {
        x: placed.x + service.width - 20,
        y: placed.y - 14,
      })}
    `;
  }
}
