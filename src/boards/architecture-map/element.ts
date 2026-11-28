import { html, svg, nothing, type CSSResultGroup, type TemplateResult } from 'lit';

import type { CommentTargetOption } from '../../core/types';
import type { LayoutPoint, LayoutResult } from '../../lib/layout/layered';

import { jumpedPaths } from '../../lib/layout/line-jumps';
import { endFrame, stepsData, type PathStep } from '../../lib/layout/path-steps';
import { END_MARKERS, edgeBody, type EdgeEndView } from '../base/edge';
import { BoardCanvasElement } from '../base/element';
import { EMPTY_REACH, reach, type DiagramSelection, type Reach } from '../base/model';
import { diagramStyles } from '../base/styles';
import { openingCorner } from '../base/viewport';
import { LINK_CHIP, boundaryTitleBox, linkChipWidth, placeLinkLabels, rateLinkLabels } from './labels';
import { architectureMapMessages } from './messages';
import {
  boundaryBoxes,
  emptyArchitectureData,
  parseArchitectureData,
  type ArchitectureData,
  type ArchitectureService,
  type BoundaryBox,
} from './model';
import { LANE, withFacingRoutes, type RouteRect, type RoutedLinks } from './route';
import { architectureStyles } from './styles';

/** Room around the cards: a boundary frame, its title, and two lanes for links going round it. */
const MAP_PADDING = 72;

/**
 * A jump keeps clear of each end glyph's own reach. A link keeps a straight run
 * in front of its arrowhead anyway (`archLinkSteps` keeps 11px), so this never
 * disturbs a drawn glyph.
 */
const JUMP_CLEARANCE = END_MARKERS.arrow.reach;

/** Length of an arrowhead along its link: the last run stays straight under it. */
const ARROW_LENGTH = 11;

/**
 * A link's polyline as drawing steps: every bend rounded, and the run into the
 * arrowhead kept straight for the head's whole length. A corner takes at most
 * half of the shorter run beside it, so the lane-sized runs always fit.
 */
export const archLinkSteps = (points: readonly LayoutPoint[]): readonly PathStep[] => {
  const radius = LANE / 2;
  const steps: PathStep[] = [];
  points.forEach((point, index) => {
    const before = points[index - 1];
    const after = points[index + 1];
    if (before === undefined) {
      steps.push({ kind: 'move', to: point });
      return;
    }
    if (after === undefined) {
      steps.push({ kind: 'line', to: point });
      return;
    }
    const enter = Math.min(radius, (Math.abs(point.x - before.x) + Math.abs(point.y - before.y)) / 2);
    const ahead = Math.abs(after.x - point.x) + Math.abs(after.y - point.y);
    const leave = Math.min(radius, index === points.length - 2 ? Math.max(0, ahead - ARROW_LENGTH) : ahead / 2);
    const enterAt = {
      x: point.x - Math.sign(point.x - before.x) * enter,
      y: point.y - Math.sign(point.y - before.y) * enter,
    };
    const leaveAt = {
      x: point.x + Math.sign(after.x - point.x) * leave,
      y: point.y + Math.sign(after.y - point.y) * leave,
    };
    steps.push({ kind: 'line', to: enterAt }, { kind: 'quad', control: point, to: leaveAt });
  });
  return steps;
};

/** The tile's text for a service with neither artwork nor a symbol: initials, or one glyph of a CJK name. */
const monogram = (name: string): string => {
  const words = name
    .trim()
    .split(/[\s\-_/・]+/u)
    .filter((word) => word !== '');
  const glyph = (word: string | undefined): string => {
    const point = word?.codePointAt(0);
    return point === undefined ? '' : String.fromCodePoint(point);
  };
  const first = glyph(words[0]);
  if ((first.codePointAt(0) ?? 0) >= 0x2e80) return first;
  const second = glyph(words[1]);
  return `${first}${/^[A-Za-z0-9]$/u.test(second) ? second : ''}`.toUpperCase();
};

/** System map: services grouped into boundaries, with the links between them. */
export class DpkBoardArchitectureMap extends BoardCanvasElement<ArchitectureData> {
  static override styles: CSSResultGroup = [diagramStyles, architectureStyles];

  #showBoundaries = true;
  /** Jumped paths for the routes they were computed from; a hover or a selection reuses them. */
  #paths: { readonly signature: string; readonly byId: ReadonlyMap<string, string> } | null = null;

  protected override parseData(input: unknown): ArchitectureData {
    return parseArchitectureData(input);
  }

  protected override emptyData(): ArchitectureData {
    return emptyArchitectureData();
  }

  protected override defaultHeading(): string {
    return architectureMapMessages(this.locale).heading;
  }

  protected override statsLabels(): { readonly node: string; readonly edge: string } {
    const m = architectureMapMessages(this.locale);
    return { node: m.node, edge: m.edge };
  }

  protected override emptyMessage(): string {
    return architectureMapMessages(this.locale).empty;
  }

  protected override get layoutMode(): 'fixed' {
    return 'fixed';
  }

  protected override layoutOptions(): { readonly padding: number } {
    // A boundary frame reaches about 45px above its cards, so this padding is
    // frame room, not a blank band: a chrome-less figure keeps it too.
    return { padding: MAP_PADDING };
  }

  /**
   * Links are routed by the map's own router: facing sides, one port per link,
   * and around the cards in between (see `./route.ts`). Running it from
   * `routePlacement` means a card the reader dragged gets the same route as the
   * computed layout — dropping a card between two linked cards must never put
   * the link through it.
   */
  protected override routePlacement(placement: LayoutResult, visible: ArchitectureData): LayoutResult {
    const positions = new Map(placement.nodes.map((node) => [node.id, node] as const));
    const placed = visible.nodes.flatMap((node) => {
      const position = positions.get(node.id);
      return position ? [{ ...node, position: { x: position.x, y: position.y } }] : [];
    });
    const frames = boundaryBoxes(placed, this.items().boundaries).map((box) => ({
      box,
      title: boundaryTitleBox(box, box.boundary.label),
    }));
    const cards = placement.nodes.map((node) => ({ x: node.x, y: node.y, width: node.width, height: node.height }));
    const titles = frames.map((frame) => frame.title);
    const boxes = frames.map((frame) => frame.box);
    const labels = new Map(
      visible.edges.flatMap((link) => (link.label === null ? [] : [[link.id, link.label] as const])),
    );
    // A label left lying on another link or on a border asks the router for a lane with more room.
    const rate = (routed: RoutedLinks) => {
      const routes = [...routed].map(([id, points]) => ({ id, points }));
      const labelled = routes.flatMap((route) => {
        const label = labels.get(route.id);
        return label === undefined ? [] : [{ ...route, label }];
      });
      return [...rateLinkLabels(labelled, { cards, titles, frames: boxes, routes })].map(([link, placed]) => ({
        link,
        penalty: placed.crossing.length + placed.borders + (placed.covering ? 1 : 0),
        crossing: placed.crossing,
      }));
    };
    return withFacingRoutes(placement, visible.edges, { frames, ...(labels.size === 0 ? {} : { rate }) });
  }

  /** The placed cards, for the label placement's collision check. */
  #cardBoxes(): readonly RouteRect[] {
    return this.visible.nodes.flatMap((node) => {
      const placed = this.placedNode(node.id);
      return placed ? [{ x: placed.x, y: placed.y, width: placed.width, height: placed.height }] : [];
    });
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

  /**
   * Services sit where the author put them, so one far down the left must not
   * open the map on empty space: it opens on what the first screenful shows.
   */
  protected override initialView(): void {
    const nodes = this.visible.nodes.flatMap((node) => {
      const placed = this.placedNode(node.id);
      return placed ? [placed] : [];
    });
    const canvas = this.renderRoot.querySelector('dpk-dialog-panel')?.shadowRoot?.querySelector('[part~="canvas"]');
    const corner = openingCorner([...nodes, ...this.#boundaryBoxes()], canvas?.clientHeight ?? 0);
    this.viewport?.reset(corner ?? undefined);
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

  /** Service names and a `from → to` summary, not raw ids, so "Review comment" reads like the map does. */
  protected override commentItems(): readonly CommentTargetOption[] {
    const items = this.items();
    const name = (id: string) => items.nodes.find((node) => node.id === id)?.name ?? id;
    return [
      ...items.nodes.map((service) => ({ value: this.commentRef('node', service.id), label: service.name })),
      ...items.edges.map((link) => ({
        value: this.commentRef('edge', link.id),
        label: `${name(link.from)} → ${name(link.to)}${link.label === null ? '' : ` · ${link.label}`}`,
      })),
    ];
  }

  protected override renderToolbarActions(): TemplateResult {
    const m = architectureMapMessages(this.locale);
    return html`
      <button
        type="button"
        class="dpk-btn dpk-btn--ghost arch-toggle"
        data-toggle="boundaries"
        aria-pressed=${this.#showBoundaries ? 'true' : 'false'}
        @click=${() => {
          this.#showBoundaries = !this.#showBoundaries;
          this.requestUpdate();
        }}
      >
        ${m.boundaries}
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

  /**
   * Every link's drawn `d` and its arrival frame, its level runs jumping the
   * links that cross them. No link shares a trunk with another here, so the
   * jump pass needs no bundle. Memoised by route signature, so a hover or a
   * selection reuses its own paths; mid-drag the lines draw plain.
   */
  #drawn(): ReadonlyMap<string, { readonly d: string; readonly end: EdgeEndView | null }> {
    const lines = new Map<string, readonly PathStep[]>();
    const ends = new Map<string, EdgeEndView>();
    for (const link of this.visible.edges) {
      const route = this.routeOf(link.id);
      lines.set(link.id, archLinkSteps(route));
      if (route.length >= 2)
        ends.set(link.id, { side: 'end', marker: END_MARKERS.arrow, frame: endFrame(route, 'end') });
    }
    const assemble = (
      data: ReadonlyMap<string, string>,
    ): Map<string, { readonly d: string; readonly end: EdgeEndView | null }> =>
      new Map([...data].map(([id, d]) => [id, { d, end: ends.get(id) ?? null }] as const));
    if (this.draggedNodeIds().size > 0) {
      return assemble(new Map([...lines].map(([id, steps]) => [id, stepsData(steps)] as const)));
    }
    const signature = [...lines].map(([id, steps]) => `${id}:${stepsData(steps)}`).join('|');
    if (this.#paths?.signature === signature) return assemble(this.#paths.byId);
    const jumped = jumpedPaths(lines, new Set(lines.keys()), { clearance: JUMP_CLEARANCE });
    this.#paths = { signature, byId: jumped };
    return assemble(jumped);
  }

  protected override renderCanvas(): TemplateResult {
    const m = architectureMapMessages(this.locale);
    const visible = this.visible;
    const name = (id: string) => visible.nodes.find((node) => node.id === id)?.name ?? id;
    const boundaries = this.#boundaryBoxes();
    const routes = visible.edges.map((link) => ({ id: link.id, label: link.label, points: this.routeOf(link.id) }));
    const chips = placeLinkLabels(
      routes.flatMap((route) => (route.label === null ? [] : [{ ...route, label: route.label }])),
      {
        cards: this.#cardBoxes(),
        titles: boundaries.map((box) => boundaryTitleBox(box, box.boundary.label)),
        frames: boundaries,
        routes,
      },
    );
    const drawn = this.#drawn();
    const edges = visible.edges.map((link) => {
      const state = this.edgeState(link.id);
      const body = drawn.get(link.id);
      const select = () => this.select({ kind: 'edge', id: link.id });
      return svg`
        <g
          class=${this.elementClass(state, 'd-edge', 'arch-link', (state.related || state.selected) && 'is-flowing')}
          data-link=${link.id}
          data-dpk-target=${this.commentRef('edge', link.id)}
          data-dpk-check="off"
        >
          <title>${link.label ?? link.id}</title>
          ${edgeBody({
            d: body?.d ?? '',
            ends: body?.end === null || body?.end === undefined ? [] : [body.end],
            flow: true,
            hit: { label: m.edgeLabel(name(link.from), name(link.to)), onSelect: select },
          })}
        </g>
      `;
    });
    return html`
      ${
        this.#showBoundaries
          ? boundaries.map(
              (box) => html`<div
                class=${`arch-boundary ${box.boundary.kind === 'external' ? 'is-external' : ''}`}
                data-boundary=${box.boundary.id}
                style="left:${box.x}px; top:${box.y}px; width:${box.width}px; height:${box.height}px"
              >
                <span class="arch-boundary-title">${box.boundary.label}</span>
              </div>`,
            )
          : nothing
      }
      ${this.renderEdges(edges)}
      ${visible.edges.map((link) => {
        const chip = chips.get(link.id);
        if (chip === undefined || link.label === null) return nothing;
        return html`<button
          type="button"
          class=${this.elementClass(this.edgeState(link.id), 'arch-link-chip')}
          ?data-wrapped=${chip.height > LINK_CHIP.height}
          ?data-shortened=${chip.height === LINK_CHIP.height && chip.width < linkChipWidth(link.label)}
          title=${link.label}
          data-link-label=${link.id}
          tabindex="-1"
          aria-hidden="true"
          style="left:${chip.x}px; top:${chip.y}px; width:${chip.width}px; height:${chip.height}px"
          @click=${() => this.select({ kind: 'edge', id: link.id })}
        >
          <span>${link.label}</span>
        </button>`;
      })}
      ${visible.nodes.map((service) => this.#renderService(service, m))}
    `;
  }

  #renderService(
    service: ArchitectureService,
    m: ReturnType<typeof architectureMapMessages>,
  ): TemplateResult | typeof nothing {
    const placed = this.placedNode(service.id);
    if (!placed) return nothing;
    const state = this.nodeState(service.id);
    return html`
      <button
        type="button"
        class=${this.elementClass(
          state,
          'd-node',
          'arch-service',
          service.description === null && 'is-brief',
          this.isDraggingNode(service.id) && 'is-dragging',
        )}
        data-service=${service.id}
        data-grill-questions=${this.questionsOf(service)}
        data-dpk-target=${this.commentRef('node', service.id)}
        style="left:${placed.x}px; top:${placed.y}px; width:${service.width}px; height:${service.height}px"
        aria-pressed=${state.selected ? 'true' : 'false'}
        title=${service.description ?? service.name}
        @pointerdown=${(event: PointerEvent) => this.onNodeDragStart(event, service.id)}
        @click=${() => {
          if (!this.consumeDragClick()) this.select({ kind: 'node', id: service.id });
        }}
      >
        ${
          service.artwork === null
            ? html`<span class="arch-symbol" aria-hidden="true">${service.symbol ?? monogram(service.name)}</span>`
            : html`<img
                class="arch-artwork"
                src=${service.artwork.src}
                alt=${service.artwork.alt}
                title=${service.artwork.license === null ? nothing : m.artworkCredit(service.artwork.license)}
              />`
        }
        <span class="arch-body">
          <span class="arch-name">${service.name}</span>
          ${service.description === null ? nothing : html`<span class="arch-description">${service.description}</span>`}
        </span>
      </button>
    `;
  }
}
