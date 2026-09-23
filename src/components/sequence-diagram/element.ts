import { html, svg, nothing, type CSSResultGroup, type TemplateResult } from 'lit';

import type { CommentTargetOption } from '../../core/types';
import type { ViewState } from '../diagram/viewport';

import { DiagramChromeElement } from '../diagram/element';
import { tagStateMatches, type ElementState } from '../diagram/model';
import { diagramStyles } from '../diagram/styles';
import { arrowDefinitions } from '../diagram/view';
import {
  emptySequenceData,
  flattenMessages,
  layoutSequence,
  messageNumbers,
  parseSequenceData,
  type SequenceDiagramData,
  type SequenceFragment,
  type SequenceItem,
  type SequenceLayout,
  type SequenceMessage,
  type SequenceParticipant,
} from './model';
import { sequenceStyles } from './styles';

export type SequenceSelection =
  | { readonly kind: 'participant'; readonly id: string }
  | { readonly kind: 'message'; readonly id: string };

const ARROWS = [
  { id: 'seq-request' },
  { id: 'seq-response' },
  { id: 'seq-async' },
  { id: 'seq-related' },
  { id: 'seq-selected' },
] as const;

const DETAIL_LABELS: Readonly<Record<SequenceMessage['style'], string>> = {
  request: '処理 / 保証',
  response: '応答 / 保証',
  async: '非同期処理 / 保証',
};

/** Interaction diagram: participants on a rail, messages as numbered rows. */
export class DpkComponentSequenceDiagram extends DiagramChromeElement<SequenceDiagramData, SequenceSelection> {
  static override styles: CSSResultGroup = [diagramStyles, sequenceStyles];

  #layout: SequenceLayout | null = null;
  #numbers: ReadonlyMap<string, string> = new Map();
  #collapsed = new Map<string, boolean>();
  #relatedMessages = new Set<string>();
  #relatedParticipants = new Set<string>();
  #signature = '';
  #version = 0;

  protected override commentItems(): readonly CommentTargetOption[] {
    const items = this.items();
    return [
      ...items.participants.map((participant) => ({
        value: this.commentRef('participant', participant.id),
        label: participant.name,
      })),
      ...flattenMessages(items.items).map((message) => ({
        value: this.commentRef('message', message.id),
        label: message.title,
      })),
    ];
  }

  protected override parseData(input: unknown): SequenceDiagramData {
    this.#collapsed.clear();
    return parseSequenceData(input);
  }

  protected override emptyData(): SequenceDiagramData {
    return emptySequenceData();
  }

  protected override defaultHeading(): string {
    return 'Sequence';
  }

  protected override shellClass(): string {
    return 'sequence';
  }

  protected override emptyMessage(): string {
    return '該当するメッセージはありません。';
  }

  protected override fitViewport(): void {
    this.viewport?.fitWidth();
  }

  protected override onViewChange(view: ViewState): void {
    const rail = this.renderRoot.querySelector<HTMLElement>('.sequence-rail-world');
    if (rail) rail.style.transform = `translateX(${view.x}px) scale(${view.scale})`;
  }

  protected override hasSelection(selection: SequenceSelection): boolean {
    const items = this.items();
    return selection.kind === 'participant'
      ? items.participants.some((participant) => participant.id === selection.id)
      : flattenMessages(items.items).some((message) => message.id === selection.id);
  }

  protected override tagItems(): readonly (readonly string[])[] {
    return flattenMessages(this.items().items).map((message) => message.tags);
  }

  protected override statsText(): string {
    const layout = this.#layout;
    const total = flattenMessages(this.items().items).length;
    return layout === null ? '' : `${layout.rows.length} / ${total} メッセージ`;
  }

  protected override contentSize(): { readonly width: number; readonly height: number } | null {
    const layout = this.#layout;
    if (layout === null || layout.rows.length === 0) return null;
    return { width: layout.width, height: layout.height };
  }

  protected override isEmpty(): boolean {
    return this.contentSize() === null;
  }

  protected override layoutVersion(): number {
    return this.#version;
  }

  protected override refreshContent(): void {
    const data = this.#viewData();
    const state = this.tagFilter;
    const signature = [
      state.match,
      [...state.active].join(','),
      [...this.#collapsed].map(([id, value]) => `${id}:${value}`).join(','),
      flattenMessages(data.items)
        .map((message) => message.id)
        .join(','),
    ].join('|');
    if (signature !== this.#signature) {
      this.#signature = signature;
      this.#version += 1;
      this.#numbers = messageNumbers(this.items());
      this.#layout = layoutSequence(data, (message) => tagStateMatches(message.tags, state));
    }
    this.#relatedMessages = new Set();
    this.#relatedParticipants = new Set();
    const selection = this.selection;
    const layout = this.#layout;
    if (selection !== null && layout !== null) {
      if (selection.kind === 'message') {
        const row = layout.rows.find((entry) => entry.message.id === selection.id);
        this.#relatedMessages.add(selection.id);
        if (row) {
          this.#relatedParticipants.add(row.message.from);
          this.#relatedParticipants.add(row.message.to);
        }
      } else {
        for (const row of layout.rows) {
          if (row.message.from !== selection.id && row.message.to !== selection.id) continue;
          this.#relatedMessages.add(row.message.id);
        }
      }
    }
  }

  /** The guard and what the message guarantees, which only the tooltip carries. */
  #tooltip(message: SequenceMessage): string {
    const detail = message.detail === null ? null : `${DETAIL_LABELS[message.style]}: ${message.detail}`;
    return [message.guard, detail].filter((value) => value !== null).join('\n') || message.title;
  }

  /** The data with local collapse overrides applied. */
  #viewData(): SequenceDiagramData {
    const items = this.items();
    const apply = (entries: readonly SequenceItem[]): readonly SequenceItem[] =>
      entries.map((entry) => {
        if (entry.kind === 'message') return entry;
        return {
          ...entry,
          collapsed: this.#collapsed.get(entry.id) ?? entry.collapsed,
          branches: entry.branches.map((branch) => ({ label: branch.label, items: apply(branch.items) })),
        };
      });
    return { participants: items.participants, items: apply(items.items) };
  }

  #isCollapsed(fragment: SequenceFragment): boolean {
    return (
      this.#layout?.frames.find((frame) => frame.fragment.id === fragment.id)?.fragment.collapsed ?? fragment.collapsed
    );
  }

  #toggleFragment(fragment: SequenceFragment): void {
    this.#collapsed.set(fragment.id, !this.#isCollapsed(fragment));
    this.requestUpdate();
  }

  #messageState(id: string): ElementState {
    const selected = this.selection?.kind === 'message' && this.selection.id === id;
    const related = !selected && this.#relatedMessages.has(id);
    return {
      selected,
      related,
      dimmed: this.selection !== null && !selected && !related,
      depth: null,
    };
  }

  #participantState(id: string): ElementState {
    const selected = this.selection?.kind === 'participant' && this.selection.id === id;
    const related = !selected && this.#relatedParticipants.has(id);
    return {
      selected,
      related,
      dimmed: this.selection !== null && !selected && !related,
      depth: null,
    };
  }

  protected override renderAboveCanvas(): TemplateResult | typeof nothing {
    const layout = this.#layout;
    if (layout === null) return nothing;
    return html`
      <div class="sequence-rail" role="group" aria-label="参加者">
        <div class="sequence-rail-world">
          ${layout.participants.map((participant) => this.#renderParticipant(participant, layout))}
        </div>
      </div>
    `;
  }

  #renderParticipant(participant: SequenceParticipant, layout: SequenceLayout): TemplateResult {
    const center = layout.x.get(participant.id) ?? 0;
    const state = this.#participantState(participant.id);
    return html`
      <button
        type="button"
        class=${this.elementClass(state, 'sequence-participant', participant.external && 'is-external')}
        data-participant=${participant.id}
        data-grill-questions=${this.questionsOf(participant)}
        style="left:${center - 95}px"
        aria-pressed=${state.selected ? 'true' : 'false'}
        title=${participant.description ?? participant.name}
        @click=${() => this.select({ kind: 'participant', id: participant.id })}
      >
        <span class="sequence-symbol" aria-hidden="true">${participant.symbol ?? participant.name.slice(0, 2)}</span>
        <span>
          <span class="sequence-name">${participant.name}</span>
          ${participant.role === null ? nothing : html`<span class="sequence-role">${participant.role}</span>`}
        </span>
      </button>
      ${this.renderCommentTrigger({ kind: 'participant', id: participant.id }, participant.name, {
        x: center + 95 - 34,
        y: 17,
      })}
    `;
  }

  protected override renderCanvas(): TemplateResult {
    const layout = this.#layout;
    if (layout === null) return html``;
    return html`
      ${this.#renderEdges(layout)}
      ${layout.frames.map(
        (frame) => html`<div
          class="sequence-frame"
          style="left:${frame.x}px; top:${frame.y}px; width:${frame.width}px; height:${frame.height}px"
        ></div>`,
      )}
      ${layout.frames.map((frame) => this.#renderFrameHeader(frame.fragment, frame.x, frame.y, frame.width, frame.count))}
      ${layout.branches.map(
        (branch) => html`<span class="sequence-branch" style="left:${branch.x}px; top:${branch.y}px"
          >[${branch.label}]</span
        >`,
      )}
      ${layout.folds.map(
        (fold) => html`<span class="sequence-fold" style="left:${fold.x}px; top:${fold.y}px"
          >${fold.fragment.branches.map((branch) => `[${branch.label}]`).join(' / ')}</span
        >`,
      )}
      ${layout.rows.map((row) => this.#renderMessage(row.y, row.message, layout))}
    `;
  }

  #renderEdges(layout: SequenceLayout): TemplateResult {
    const lifelines = layout.participants.map(
      (participant) =>
        svg`<path
          class="sequence-lifeline"
          d=${`M${layout.x.get(participant.id) ?? 0} 0 V${layout.height}`}
        ></path>`,
    );
    const dividers = layout.dividers.map(
      (divider) => svg`<path class="sequence-divider" d=${`M${divider.x} ${divider.y} h${divider.width}`}></path>`,
    );
    const messages = layout.rows.map((row) => {
      const from = layout.x.get(row.message.from) ?? 0;
      const to = layout.x.get(row.message.to) ?? 0;
      const d = from === to ? `M${from} ${row.y} h42 v25 H${from}` : `M${from} ${row.y} H${to}`;
      const state = this.#messageState(row.message.id);
      const marker = state.selected
        ? 'seq-selected'
        : state.related
          ? 'seq-related'
          : row.message.style === 'async'
            ? 'seq-async'
            : row.message.style === 'response'
              ? 'seq-response'
              : 'seq-request';
      const select = () => this.select({ kind: 'message', id: row.message.id });
      return svg`
        <g
          class=${this.elementClass(state, 'sequence-message-row', 'd-edge', `is-${row.message.style}`)}
          data-message=${row.message.id}
        >
          <title>${this.#tooltip(row.message)}</title>
          <path class="d-edge-hit" d=${d} role="button" tabindex="0"
            aria-label=${`${row.message.title}を選択`}
            @click=${select}
            @keydown=${(event: KeyboardEvent) => {
              if (event.key !== 'Enter' && event.key !== ' ') return;
              event.preventDefault();
              select();
            }}></path>
          <path class="sequence-message is-${row.message.style}" d=${d} marker-end=${`url(#${marker})`}></path>
        </g>
      `;
    });
    return html`<svg class="diagram-edges" width=${layout.width} height=${layout.height}>
      ${arrowDefinitions(ARROWS)} ${lifelines} ${dividers} ${messages}
    </svg>`;
  }

  #renderFrameHeader(fragment: SequenceFragment, x: number, y: number, width: number, count: number): TemplateResult {
    const collapsed = this.#isCollapsed(fragment);
    return html`
      <button
        type="button"
        class="sequence-frame-header"
        data-fragment=${fragment.id}
        style="left:${x}px; top:${y}px; width:${width}px"
        aria-expanded=${collapsed ? 'false' : 'true'}
        aria-label=${`${fragment.operator} · ${fragment.title}を${collapsed ? '展開' : '折りたたむ'}`}
        @click=${() => this.#toggleFragment(fragment)}
      >
        <span aria-hidden="true">${collapsed ? '▸' : '▾'}</span>
        <span class="sequence-operator">${fragment.operator}</span>
        <span class="sequence-text">${fragment.title}</span>
        <span class="sequence-frame-count">${count} メッセージ</span>
      </button>
    `;
  }

  #renderMessage(y: number, message: SequenceMessage, layout: SequenceLayout): TemplateResult {
    const from = layout.x.get(message.from) ?? 0;
    const to = layout.x.get(message.to) ?? 0;
    const self = from === to;
    const state = this.#messageState(message.id);
    const left = self ? from + 12 : Math.min(from, to) + 14;
    const width = self ? 175 : Math.abs(to - from) - 28;
    return html`
      <button
        type="button"
        class=${this.elementClass(state, 'sequence-label')}
        data-message-label=${message.id}
        data-grill-questions=${this.questionsOf(message)}
        style="left:${left}px; top:${y - 28}px; width:${width}px"
        title=${this.#tooltip(message)}
        @click=${() => this.select({ kind: 'message', id: message.id })}
      >
        <span class="sequence-number">${this.#numbers.get(message.id) ?? ''}</span>
        <span class="sequence-text">${message.title}</span>
      </button>
      ${this.renderCommentTrigger(
        { kind: 'message', id: message.id },
        `${this.#numbers.get(message.id) ?? ''} ${message.title}`.trim(),
        { x: left + width - 30, y: y - 31 },
      )}
    `;
  }
}
