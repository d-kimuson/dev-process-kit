import { html, svg, nothing, type CSSResultGroup, type TemplateResult } from 'lit';

import type { LayoutOptions, LayoutPoint } from '../../lib/layout/layered';

import { DiagramElement } from '../diagram/element';
import { EMPTY_REACH, reach, type DiagramSelection, type Reach } from '../diagram/model';
import { diagramStyles } from '../diagram/styles';
import { pathData } from '../diagram/view';
import { erDiagramMessages, type ErDiagramMessages } from './messages';
import {
  cardinalityText,
  emptyErData,
  outgoingFan,
  parseErData,
  type ErData,
  type ErField,
  type ErFieldDiff,
  type ErRelation,
  type ErTableDiff,
} from './model';
import { CIRCLE_RADIUS, endGlyph, type ErEnd } from './notation';
import { erStyles } from './styles';

/** Distance from a line to the centre of the text beside it. */
const LABEL_LIFT = 7;

const SYMBOLS = { same: '', added: '+', removed: '−', changed: '~' } as const;

/** Schema diagram with an always-on diff between the `before` and `after` snapshots. */
export class DpkComponentErDiagram extends DiagramElement<ErData> {
  static override styles: CSSResultGroup = [diagramStyles, erStyles];

  #query = '';
  #sizes = new Map<string, { height: number; rows: readonly number[] }>();
  #resize: ResizeObserver | null = null;

  override disconnectedCallback(): void {
    this.#resize?.disconnect();
    this.#resize = null;
    super.disconnectedCallback();
  }

  protected override updated(): void {
    super.updated();
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
      const size = {
        height: round(bounds.height / scale),
        rows: [...card.querySelectorAll('.er-field')].map((row) => {
          const rect = row.getBoundingClientRect();
          return round((rect.top + rect.height / 2 - bounds.top) / scale);
        }),
      };
      if (JSON.stringify(this.#sizes.get(id)) === JSON.stringify(size)) continue;
      this.#sizes.set(id, size);
      changed = true;
    }
    if (changed) this.requestUpdate();
  }

  protected override layoutSignature(): string {
    return JSON.stringify([...this.#sizes]);
  }

  protected override filtered(): ErData {
    const data = super.filtered();
    const fan = outgoingFan(data.edges);
    return {
      ...data,
      nodes: data.nodes.map((node) => {
        const size = this.#sizes.get(node.id);
        if (!size) return node;
        const ports = { ...node.ports };
        for (const edge of data.edges) {
          if (edge.from === node.id && edge.fromPort !== undefined) {
            const y = size.rows[node.fields.findIndex((field) => field.id === edge.sourceField)];
            if (y !== undefined) ports[edge.fromPort] = { x: node.width, y: y + (fan.get(edge.id) ?? 0) };
          }
          if (edge.to === node.id && edge.toPort !== undefined) {
            const y = size.rows[node.fields.findIndex((field) => field.id === edge.targetField)];
            if (y !== undefined) ports[edge.toPort] = { x: 0, y };
          }
        }
        return { ...node, height: size.height, ports };
      }),
    };
  }

  protected override parseData(input: unknown): ErData {
    return parseErData(input);
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
    return { nodeSpacing: 38, layerSpacing: 128, padding: 32 };
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
      <span class="er-legend-cardinality">${m.legendCardinality}</span>
    </div>`;
  }

  protected override renderCanvas(): TemplateResult {
    const m = erDiagramMessages(this.locale);
    const visible = this.visible;
    const fan = outgoingFan(visible.edges);
    const edges = visible.edges.map((relation) => {
      const state = this.edgeState(relation.id);
      const points = this.routeOf(relation.id);
      const d = pathData(points);
      const select = () => this.select({ kind: 'edge', id: relation.id });
      const meaning = [cardinalityText(relation.cardinality), relation.label].filter(Boolean).join(' · ');
      const before =
        relation.before === null
          ? null
          : [cardinalityText(relation.before.cardinality), relation.before.label].filter(Boolean).join(' · ');
      return svg`
        <g class=${this.elementClass(state, 'd-edge', 'er-edge', `is-${relation.status}`)} data-relation=${relation.id}>
          <title>${[
            `${relation.from}.${relation.sourceField} → ${relation.to}.${relation.targetField}`,
            meaning,
            before === null ? null : `(${m.was(before)})`,
          ]
            .filter(Boolean)
            .join(' · ')}</title>
          <path class="d-edge-path" d=${d}></path>
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
          ${this.renderEdgeCommentTrigger(
            { kind: 'edge', id: relation.id },
            `${relation.from}.${relation.sourceField} → ${relation.to}.${relation.targetField}`,
            points,
          )}
        </g>
      `;
    });
    return html`${this.renderEdges(edges, [])}${visible.nodes.map((table) => this.#renderTable(table, m))}`;
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

  #renderTable(table: ErTableDiff, m: ErDiagramMessages): TemplateResult | typeof nothing {
    const placed = this.placedNode(table.id);
    if (!placed) return nothing;
    const state = this.nodeState(table.id);
    return html`
      <div
        class=${this.elementClass(state, 'd-node', 'er-table', `is-${table.status}`)}
        data-er-table=${table.id}
        data-grill-questions=${this.questionsOf(table)}
        style="left:${placed.x}px; top:${placed.y}px; width:${table.width}px"
      >
        <button
          type="button"
          class="er-head"
          data-table=${table.id}
          aria-pressed=${state.selected ? 'true' : 'false'}
          title=${`${table.id} / ${table.name}`}
          @click=${() => this.select({ kind: 'node', id: table.id })}
        >
          ${table.status === 'same' ? nothing : html`<span class="er-mark" aria-hidden="true">${SYMBOLS[table.status]}</span>`}
          <span class="er-name">${table.id}</span>
          <span class="er-label">${table.name}</span>
          <span class="dpk-label er-status">${m.statusLabel(table.status)}</span>
        </button>
        ${this.renderCommentTrigger({ kind: 'node', id: table.id }, `${table.id} · ${table.name}`)}
        <div class="er-fields">${table.fields.map((field) => this.#renderField(field, m))}</div>
      </div>
    `;
  }

  #renderField(field: ErFieldDiff, m: ErDiagramMessages): TemplateResult {
    const describe = (value: ErField): string =>
      [
        value.type,
        value.keys.length === 0 ? '—' : value.keys.join('+'),
        value.ref,
        value.cardinality,
        value.label === null ? null : `“${value.label}”`,
        value.nullable ? m.nullable : null,
      ]
        .filter(Boolean)
        .join(' · ');
    const matches = this.#query !== '' && field.id.toLowerCase().includes(this.#query);
    return html`
      <div
        class="er-field is-${field.status} ${matches ? 'is-match' : ''}"
        data-grill-questions=${this.questionsOf(field)}
        title=${[m.statusLabel(field.status), field.id, describe(field)].filter(Boolean).join(' / ')}
      >
        <span class="er-field-mark" aria-hidden="true">${SYMBOLS[field.status]}</span>
        <span class="er-key" data-empty=${field.keys.length === 0 ? 'true' : 'false'}
          >${field.keys.length === 0 ? '·' : field.keys.map((key) => html`<span>${key}</span>`)}</span
        >
        <span class="er-field-name">${field.id}</span>
        ${
          field.status === 'changed' && field.before !== null
            ? html`<span class="er-change">
                <del>− ${describe(field.before)}</del>
                <ins>+ ${describe(field)}</ins>
              </span>`
            : html`<span class="er-field-type">${describe(field)}</span>`
        }
      </div>
    `;
  }
}
