import { html, svg, nothing, type CSSResultGroup, type TemplateResult } from 'lit';

import type { CommentTargetOption } from '../../core/types';
import type { LayoutPoint, LayoutResult } from '../../lib/layout/layered';
import type { CanvasDetail } from '../base/detail-fields';

import {
  edgeBody,
  edgeSteps,
  lineStyleClass,
  type EdgeEndView,
  type EdgeSpec,
  type EndMarker,
} from '../../components/diagram/edge';
import { jumpedPaths } from '../../lib/layout/line-jumps';
import { endFrame, stepsData, type PathStep } from '../../lib/layout/path-steps';
import { BoardCanvasElement } from '../base/element';
import { EMPTY_REACH, tagStateMatches, type DiagramSelection, type GraphSelection, type Reach } from '../base/model';
import { diagramStyles } from '../base/styles';
import { CORNER_RADIUS } from '../base/view';
import { bpmnPlacement, type BpmnBands, type BpmnLayout } from './layout';
import { flowSpec } from './markers';
import { bpmnMessages, type BpmnMessages } from './messages';
import { emptyBpmnData, parseBpmnData, type BpmnData, type BpmnFlow, type BpmnNode } from './model';
import { bpmnFlowLabelPoint, bpmnNodeLabelBox, withBpmnRoutes } from './route';
import { externalLabel } from './shapes';
import { bpmnStyles } from './styles';
import { bpmnNodeShape } from './view';

/** Jumped flow paths per drawn layout, so a hover or a selection reuses them. */
const PATHS = new WeakMap<LayoutResult, ReadonlyMap<string, string>>();

const EMPTY_BANDS: BpmnBands = { pools: [], contentLeft: 0 };

/** Pools cycle through this many hues (`--bpmn-hue-<n>` in `styles.ts`). */
const POOL_HUES = 5;

/**
 * `<dpk-board-bpmn>` — a business process: pools and lanes, events, tasks,
 * gateways and the flows between them, laid out automatically from the data.
 */
export class DpkBoardBpmn extends BoardCanvasElement<BpmnData> {
  static override styles: CSSResultGroup = [diagramStyles, bpmnStyles];

  #bands: BpmnBands = EMPTY_BANDS;

  /** The pool and lane bands of the current layout. */
  get bands(): BpmnBands {
    return this.#bands;
  }

  protected override parseData(input: unknown): BpmnData {
    return parseBpmnData(input);
  }

  protected override emptyData(): BpmnData {
    return emptyBpmnData();
  }

  protected override defaultHeading(): string {
    return bpmnMessages(this.locale).heading;
  }

  protected override statsLabels(): { readonly node: string; readonly edge: string } {
    const m = bpmnMessages(this.locale);
    return { node: m.node, edge: m.edge };
  }

  protected override emptyMessage(): string {
    return bpmnMessages(this.locale).empty;
  }

  protected override computePlacement(visible: BpmnData): LayoutResult {
    const layout: BpmnLayout = bpmnPlacement(visible);
    this.#bands = layout.bands;
    return layout.placement;
  }

  protected override routePlacement(placement: LayoutResult, visible: BpmnData): LayoutResult {
    return withBpmnRoutes(placement, visible, this.#bands);
  }

  /** Pools and lanes always stay; the tag filter hides elements and the flows that would dangle. */
  protected override filtered(): BpmnData {
    const items = this.items();
    const tags = this.tagFilter;
    if (tags.active.length === 0) return items;
    const nodes = items.nodes.filter((node) => tagStateMatches(node.tags, tags));
    const visible = new Set(nodes.map((node) => node.id));
    const pools = new Set(items.pools.map((pool) => pool.id));
    const shown = (id: string): boolean => visible.has(id) || pools.has(id);
    return { ...items, nodes, edges: items.edges.filter((flow) => shown(flow.from) && shown(flow.to)) };
  }

  /** A band's identity changes what the layout draws, and a label's length what a column needs. */
  protected override layoutSignature(): string {
    const data = this.filtered();
    return JSON.stringify({
      pools: data.pools.map((pool) => [pool.id, pool.lanes.map((lane) => lane.id)]),
      lanes: data.nodes.map((node) => `${node.id}:${node.lane ?? ''}`),
      labels: data.edges.filter((flow) => flow.label !== null).map((flow) => `${flow.id}:${(flow.label ?? '').length}`),
    });
  }

  protected override relations(selection: DiagramSelection, visible: BpmnData): Reach {
    if (selection === null || selection.kind !== 'node') return EMPTY_REACH;
    const nodeIds = new Set(visible.nodes.map((node) => node.id));
    const nodes = new Map<string, number>();
    const edges = new Set<string>();
    for (const flow of visible.edges) {
      if (flow.from !== selection.id && flow.to !== selection.id) continue;
      edges.add(flow.id);
      const other = flow.from === selection.id ? flow.to : flow.from;
      if (nodeIds.has(other) && other !== selection.id) nodes.set(other, 1);
    }
    return { nodes, edges };
  }

  #m(): BpmnMessages {
    return bpmnMessages(this.locale);
  }

  #kindName(node: BpmnNode): string {
    const m = this.#m();
    if (node.kind === 'event') return m.eventKind(node.event, node.trigger);
    if (node.kind === 'task') return m.taskKind(node.task);
    if (node.kind === 'subprocess') return m.subprocessKind();
    if (node.kind === 'gateway') return m.gatewayKind(node.gateway);
    if (node.kind === 'dataObject') return m.dataObjectKind();
    return m.annotationKind();
  }

  #nodeName(node: BpmnNode): string {
    if (node.kind === 'annotation') return node.text;
    return node.name ?? this.#kindName(node);
  }

  #name(id: string): string {
    const data = this.items();
    const node = data.nodes.find((candidate) => candidate.id === id);
    if (node !== undefined) return this.#nodeName(node);
    return data.pools.find((pool) => pool.id === id)?.name ?? id;
  }

  /** The pool, and the lane within it, the node sits in. */
  #placeName(node: BpmnNode): string | null {
    const pools = this.items().pools;
    for (const pool of pools) {
      const lane = pool.lanes.find((candidate) => candidate.id === node.lane);
      if (lane !== undefined) return this.#m().laneLabel(pool.name, lane.name);
    }
    return pools.find((pool) => pool.id === node.pool)?.name ?? null;
  }

  protected override get providesPanelDetail(): boolean {
    return true;
  }

  protected override detailFields(selection: GraphSelection): CanvasDetail | null {
    const m = this.#m();
    const data = this.items();
    if (selection.kind === 'node') {
      const node = data.nodes.find((candidate) => candidate.id === selection.id);
      if (node === undefined) return null;
      return {
        kind: m.node,
        name: this.#nodeName(node),
        fields: [
          { label: m.detailKind, value: this.#kindName(node) },
          { label: m.detailLane, value: this.#placeName(node) },
          { label: m.detailDescription, value: node.description },
        ],
      };
    }
    const flow = data.edges.find((candidate) => candidate.id === selection.id);
    if (flow === undefined) return null;
    const kind = m.flowKind(flow.kind);
    return {
      kind: m.edge,
      name: flow.label ?? kind,
      fields: [
        { label: m.detailKind, value: flow.isDefault ? m.defaultFlow(kind) : kind },
        { label: m.detailFrom, value: this.#name(flow.from) },
        { label: m.detailTo, value: this.#name(flow.to) },
        { label: m.detailCondition, value: flow.condition === flow.label ? null : flow.condition },
      ],
    };
  }

  protected override commentItems(): readonly CommentTargetOption[] {
    const data = this.items();
    const m = this.#m();
    return [
      ...data.nodes.map((node) => ({ value: this.commentRef('node', node.id), label: this.#nodeName(node) })),
      ...data.edges.map((flow) => ({
        value: this.commentRef('edge', flow.id),
        label: `${this.#name(flow.from)} → ${this.#name(flow.to)} · ${m.flowKind(flow.kind)}${flow.label === null ? '' : ` (${flow.label})`}`,
      })),
      ...data.pools.map((pool) => ({ value: this.commentRef('pool', pool.id), label: pool.name })),
      ...data.pools.flatMap((pool) =>
        pool.lanes.map((lane) => ({
          value: this.commentRef('lane', lane.id),
          label: m.laneLabel(pool.name, lane.name),
        })),
      ),
    ];
  }

  protected override renderCanvas(): TemplateResult {
    const paths = this.#paths();
    return html`
      ${this.#renderBands()} ${this.renderEdges(this.visible.edges.map((flow) => this.#renderFlow(flow, paths)))}
      ${this.visible.nodes.map((node) => this.#renderNode(node))}
      ${this.visible.nodes.map((node) => this.#renderNodeLabel(node))}
      ${this.visible.edges.map((flow) => this.#renderFlowLabel(flow))}
    `;
  }

  #renderBands(): TemplateResult | typeof nothing {
    const layout = this.layout;
    if (layout === null) return nothing;
    return html`
      <div class="bpmn-frames">
        ${this.#bands.pools.map(
          (pool, index) => html`
            <div
              class=${pool.blackBox ? 'bpmn-pool is-black-box' : 'bpmn-pool'}
              style="top:${pool.y}px;height:${pool.height}px;width:${layout.width}px;--bpmn-hue:var(--bpmn-hue-${
                index % POOL_HUES
              })"
              data-bpmn-pool-frame=${pool.id}
            >
              ${pool.lanes.map(
                (lane) => html`<div
                  class="bpmn-lane"
                  style="top:${lane.y - pool.y}px;height:${lane.height}px"
                  data-bpmn-lane-frame=${lane.id}
                ></div>`,
              )}
              <button
                type="button"
                class="bpmn-pool-head"
                data-dpk-target=${this.commentRef('pool', pool.id)}
                data-grill-questions=${pool.questions ?? nothing}
                title=${pool.name}
                @click=${() => this.openComment(this.commentRef('pool', pool.id))}
              >
                ${pool.name}
              </button>
              ${pool.lanes.map(
                (lane) => html`<button
                  type="button"
                  class="bpmn-lane-head"
                  style="top:${lane.y - pool.y}px;height:${lane.height}px"
                  data-dpk-target=${this.commentRef('lane', lane.id)}
                  data-grill-questions=${lane.questions ?? nothing}
                  title=${lane.name}
                  @click=${() => this.openComment(this.commentRef('lane', lane.id))}
                >
                  ${lane.name}
                </button>`,
              )}
            </div>
          `,
        )}
      </div>
    `;
  }

  /**
   * Every flow's drawn `d`, with its level runs jumping crossing flows. Memoised
   * per layout; while a node is being dragged the lines draw plain.
   */
  #paths(): ReadonlyMap<string, string> {
    const layout = this.layout;
    if (layout === null) return new Map();
    const cached = PATHS.get(layout);
    if (cached !== undefined) return cached;
    const nodes = new Map(this.items().nodes.map((node) => [node.id, node]));
    const specs = new Map(
      this.visible.edges.map((flow) => [flow.id, flowSpec(flow, nodes.get(flow.from) ?? null)] as const),
    );
    const plain = new Map<string, readonly PathStep[]>(
      this.visible.edges.map((flow) => [
        flow.id,
        edgeSteps(this.routeOf(flow.id), specs.get(flow.id) ?? flowSpec(flow, null), { radius: CORNER_RADIUS }),
      ]),
    );
    if (this.draggedNodeIds().size > 0) {
      return new Map([...plain].map(([id, steps]) => [id, stepsData(steps)] as const));
    }
    const result = jumpedPaths(plain, new Set(plain.keys()), {
      clearance: (id) => {
        const spec = specs.get(id);
        return { start: spec?.start?.reach ?? 0, end: spec?.end?.reach ?? 0 };
      },
    });
    PATHS.set(layout, result);
    return result;
  }

  #end(points: readonly LayoutPoint[], side: 'start' | 'end', marker: EndMarker): EdgeEndView {
    return { side, marker, frame: endFrame(points, side) };
  }

  #renderFlow(flow: BpmnFlow, paths: ReadonlyMap<string, string>): TemplateResult {
    const m = this.#m();
    const state = this.edgeState(flow.id);
    const points = this.routeOf(flow.id);
    const spec: EdgeSpec = flowSpec(flow, this.items().nodes.find((node) => node.id === flow.from) ?? null);
    const ends: EdgeEndView[] = [];
    if (spec.start !== null && points.length >= 2) ends.push(this.#end(points, 'start', spec.start));
    if (spec.end !== null && points.length >= 2) ends.push(this.#end(points, 'end', spec.end));
    const select = (): void => this.select({ kind: 'edge', id: flow.id });
    return svg`
      <g
        class=${this.elementClass(
          state,
          'd-edge',
          'bpmn-flow',
          `is-${flow.kind}`,
          lineStyleClass(spec.line),
          state.related && 'is-flowing',
        )}
        data-flow=${flow.id}
      >
        <title>${flow.condition ?? flow.label ?? m.flowKind(flow.kind)}</title>
        ${edgeBody({
          d: paths.get(flow.id) ?? '',
          ends,
          flow: spec.flow === 'active',
          hit: {
            label: m.flowLabel(m.flowKind(flow.kind), this.#name(flow.from), this.#name(flow.to), flow.label),
            onSelect: select,
            ...(flow.questions === undefined ? {} : { questions: flow.questions }),
          },
        })}
      </g>
    `;
  }

  #renderNode(node: BpmnNode): TemplateResult | typeof nothing {
    const placed = this.placedNode(node.id);
    if (placed === undefined) return nothing;
    const state = this.nodeState(node.id);
    const label = node.name ?? (node.kind === 'annotation' ? node.text : this.#kindName(node));
    const named = node.kind === 'event' || node.kind === 'gateway' || node.kind === 'dataObject';
    return html`
      <button
        type="button"
        class=${this.elementClass(
          state,
          'd-node',
          'bpmn-node',
          `is-${node.kind}`,
          node.kind === 'task' && node.task !== 'none' && 'has-icon',
        )}
        data-node=${node.id}
        data-grill-questions=${this.questionsOf(node)}
        data-dpk-target=${this.commentRef('node', node.id)}
        style="left:${placed.x}px; top:${placed.y}px; width:${node.width}px; height:${node.height}px"
        aria-label=${named ? `${label} (${this.#kindName(node)})` : nothing}
        aria-pressed=${state.selected ? 'true' : 'false'}
        title=${node.description ?? label}
        @click=${() => this.select({ kind: 'node', id: node.id })}
      >
        ${bpmnNodeShape(node)}
        ${
          node.kind === 'task' || node.kind === 'subprocess'
            ? html`<span class="bpmn-task-label">${node.name}</span>`
            : node.kind === 'annotation'
              ? html`<span class="bpmn-annotation-text">${node.lines.map((line) => html`<span>${line}</span>`)}</span>`
              : nothing
        }
      </button>
    `;
  }

  #renderNodeLabel(node: BpmnNode): TemplateResult | typeof nothing {
    const label = externalLabel(node);
    const box = bpmnNodeLabelBox(this.layout, node.id);
    if (label === null || box === null) return nothing;
    const state = this.nodeState(node.id);
    return html`
      <span
        class=${this.elementClass(state, 'bpmn-node-label')}
        style="left:${box.x}px; top:${box.y}px; width:${box.width}px; height:${box.height}px"
        data-node-label=${node.id}
        title=${node.name ?? ''}
        @click=${() => this.select({ kind: 'node', id: node.id })}
      >
        ${label.lines.map((line) => html`<span>${line}</span>`)}
      </span>
    `;
  }

  #renderFlowLabel(flow: BpmnFlow): TemplateResult | typeof nothing {
    const label = flow.label ?? flow.condition;
    const point = bpmnFlowLabelPoint(this.layout, flow.id);
    if (label === null || point === null) return nothing;
    const state = this.edgeState(flow.id);
    return html`
      <span class="bpmn-flow-label-slot" style="left:${point.x}px; top:${point.y}px">
        <button
          type="button"
          class=${this.elementClass(state, 'bpmn-flow-label', `is-${flow.kind}`)}
          data-flow-label=${flow.id}
          data-dpk-target=${this.commentRef('edge', flow.id)}
          data-dpk-check="off"
          title=${flow.condition ?? label}
          @click=${() => this.select({ kind: 'edge', id: flow.id })}
        >
          ${label}
        </button>
      </span>
    `;
  }
}
