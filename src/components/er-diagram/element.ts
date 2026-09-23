import { html, svg, nothing, type CSSResultGroup, type TemplateResult } from 'lit';

import type { LayoutOptions } from '../../lib/layout/layered';

import { DiagramElement } from '../diagram/element';
import { EMPTY_REACH, reach, type DiagramSelection, type Reach } from '../diagram/model';
import { diagramStyles } from '../diagram/styles';
import { pathData } from '../diagram/view';
import {
  emptyErData,
  fieldRowHeight,
  parseErData,
  tableHeight,
  type ErData,
  type ErFieldDiff,
  type ErTableDiff,
} from './model';
import { erStyles } from './styles';

const ARROWS = [{ id: 'er-neutral' }, { id: 'er-added' }, { id: 'er-removed' }, { id: 'er-selected' }] as const;

const STATUS_LABELS = { same: '変更なし', added: '追加', removed: '削除', changed: '変更' } as const;
const SYMBOLS = { same: '', added: '+', removed: '−', changed: '~' } as const;

/** Schema diagram with an always-on diff between the `before` and `after` snapshots. */
export class ArtifactErDiagram extends DiagramElement<ErData> {
  static override styles: CSSResultGroup = [diagramStyles, erStyles];

  #query = '';

  protected override parseData(input: unknown): ErData {
    return parseErData(input);
  }

  protected override emptyData(): ErData {
    return emptyErData();
  }

  protected override defaultHeading(): string {
    return 'ERD';
  }

  protected override statsLabels(): { readonly node: string; readonly edge: string } {
    return { node: 'テーブル', edge: '関連' };
  }

  protected override emptyMessage(): string {
    return '該当するテーブルはありません。';
  }

  protected override layoutOptions(): LayoutOptions {
    return { nodeSpacing: 38, layerSpacing: 96, padding: 32 };
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
    return html`
      <label class="er-search">
        <span class="af-label">検索</span>
        <input
          class="af-input"
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
    return html`<div class="diagram-legend">
      <span><i class="er-swatch-added"></i>追加</span>
      <span><i class="er-swatch-removed"></i>削除</span>
      <span><i class="er-swatch-changed"></i>変更</span>
    </div>`;
  }

  #marker(status: ErTableDiff['status']): string {
    const selection = this.selection;
    if (selection !== null && selection.kind === 'edge') return 'er-selected';
    return status === 'added' ? 'er-added' : status === 'removed' ? 'er-removed' : 'er-neutral';
  }

  protected override renderCanvas(): TemplateResult {
    const visible = this.visible;
    const edges = visible.edges.map((relation) => {
      const state = this.edgeState(relation.id);
      const points = this.routeOf(relation.id);
      const d = pathData(points);
      const select = () => this.select({ kind: 'edge', id: relation.id });
      return svg`
        <g class=${this.elementClass(state, 'd-edge', 'er-edge', `is-${relation.status}`)} data-relation=${relation.id}>
          <title>${`${relation.from}.${relation.sourceField} → ${relation.to}.${relation.targetField}`}</title>
          <path class="d-edge-path" d=${d} marker-end=${`url(#${this.#marker(relation.status)})`}></path>
          <path
            class="d-edge-hit"
            d=${d}
            role="button"
            tabindex="0"
            aria-label=${`${relation.from} と ${relation.to} の関連`}
            @click=${select}
            @keydown=${(event: KeyboardEvent) => {
              if (event.key !== 'Enter' && event.key !== ' ') return;
              event.preventDefault();
              select();
            }}
          ></path>
          ${points.length > 0 ? this.#renderCardinality(points, relation.status) : nothing}
          ${this.renderEdgeCommentTrigger(
            { kind: 'edge', id: relation.id },
            `${relation.from}.${relation.sourceField} → ${relation.to}.${relation.targetField}`,
            points,
          )}
        </g>
      `;
    });
    return html`${this.renderEdges(edges, ARROWS)}${visible.nodes.map((table) => this.#renderTable(table))}`;
  }

  #renderCardinality(points: readonly { x: number; y: number }[], status: ErTableDiff['status']): TemplateResult {
    const start = points[0];
    const end = points.at(-1);
    if (!start || !end) return html``;
    return svg`
      <text class="er-cardinality is-${status}" x=${start.x + 9} y=${start.y - 5}>1</text>
      <text class="er-cardinality is-${status}" x=${end.x - 13} y=${end.y - 5}>N</text>
    `;
  }

  #renderTable(table: ErTableDiff): TemplateResult | typeof nothing {
    const placed = this.placedNode(table.id);
    if (!placed) return nothing;
    const state = this.nodeState(table.id);
    return html`
      <div
        class=${this.elementClass(state, 'd-node', 'er-table', `is-${table.status}`)}
        data-er-table=${table.id}
        data-grill-questions=${this.questionsOf(table)}
        style="left:${placed.x}px; top:${placed.y}px; width:${table.width}px; height:${tableHeight(table.fields)}px"
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
          <span class="af-label er-status">${STATUS_LABELS[table.status]}</span>
        </button>
        ${this.renderCommentTrigger({ kind: 'node', id: table.id }, `${table.id} · ${table.name}`)}
        <div class="er-fields">${table.fields.map((field) => this.#renderField(field))}</div>
      </div>
    `;
  }

  #renderField(field: ErFieldDiff): TemplateResult {
    const describe = (value: ErFieldDiff | NonNullable<ErFieldDiff['before']>): string =>
      [value.type, value.key ?? '—', value.ref ?? null, value.nullable ? 'null可' : null].filter(Boolean).join(' · ');
    const matches = this.#query !== '' && field.id.toLowerCase().includes(this.#query);
    return html`
      <div
        class="er-field is-${field.status} ${matches ? 'is-match' : ''}"
        style="height:${fieldRowHeight(field)}px"
        data-grill-questions=${this.questionsOf(field)}
        title=${[STATUS_LABELS[field.status], field.id, describe(field)].filter(Boolean).join(' / ')}
      >
        <span class="er-field-mark" aria-hidden="true">${SYMBOLS[field.status]}</span>
        <span class="er-key" data-empty=${field.key === null ? 'true' : 'false'}>${field.key ?? '·'}</span>
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
