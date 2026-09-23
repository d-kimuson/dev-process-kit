import { html, svg, nothing, type CSSResultGroup, type TemplateResult } from 'lit';

import type { ElementActionResult } from '../../core/element-actions';
import type { CommentTargetOption, DraftAction } from '../../core/types';
import type { LayoutResult, PlacedNode } from '../../lib/layout/layered';

import { createEntityId } from '../../core/target';
import { DiagramElement } from '../diagram/element';
import { reach, tagStateMatches, type DiagramSelection, type Reach } from '../diagram/model';
import { diagramStyles } from '../diagram/styles';
import { branchPath, layoutMindMap } from './layout';
import {
  ADD_TOPIC,
  ancestorsOf,
  descendantCount,
  emptyMindMapData,
  parseMindMapData,
  reduceMindMapActions,
  visibleMindMap,
  type MindMapData,
  type MindMapEdge,
  type MindMapNode,
} from './model';
import { mindMapStyles } from './styles';

/** Branch colors cycle through the theme's accent tokens. */
const BRANCH_COLORS = 5;

/**
 * `<dpk-component-mind-map>` — a central topic and a tree of subtopics.
 *
 * Selecting a topic lights its path to the centre and everything beneath it.
 * Topics with subtopics fold and unfold; folding is view state, like the tag
 * filter, and never changes the comment targets.
 *
 * A selected topic offers a subtopic and a comment right below it. A new
 * subtopic is an `ADD_TOPIC` element action recorded by the hosting template
 * (it lists it with the other draft actions); the map shows it as added.
 */
export class DpkComponentMindMap extends DiagramElement<MindMapData> {
  static override styles: CSSResultGroup = [diagramStyles, mindMapStyles];

  #collapsed = new Set<string>();
  #seededFrom: MindMapData | null = null;
  #fitted = false;
  /** The subtopic being typed under a topic; `failed` when no template recorded it. */
  #adding: { readonly parent: string; readonly label: string; readonly failed: boolean } | null = null;

  /** Folds or unfolds a topic's subtopics. */
  toggle(id: string, collapsed?: boolean): void {
    const node = this.items().nodes.find((item) => item.id === id);
    if (node === undefined || node.children.length === 0) return;
    const next = collapsed ?? !this.#collapsed.has(id);
    if (next === this.#collapsed.has(id)) return;
    if (next) {
      this.#collapsed.add(id);
      const selection = this.selection;
      if (selection !== null && ancestorsOf(this.items(), selection.id).includes(id)) this.select(null);
    } else {
      this.#collapsed.delete(id);
    }
    this.requestUpdate();
  }

  /** Ids of the currently folded topics. */
  get collapsed(): readonly string[] {
    return [...this.#collapsed];
  }

  protected override parseData(input: unknown): MindMapData {
    return parseMindMapData(input);
  }

  protected override emptyData(): MindMapData {
    return emptyMindMapData();
  }

  protected override reduceElementActions(
    data: MindMapData,
    actions: readonly DraftAction[],
  ): { readonly data: MindMapData; readonly results: readonly ElementActionResult[] } {
    return reduceMindMapActions(data, actions);
  }

  protected override defaultHeading(): string {
    return 'Mind map';
  }

  protected override emptyMessage(): string {
    return '該当するトピックはありません。';
  }

  protected override statsText(): string {
    const total = this.items().nodes.length;
    const shown = this.filtered().nodes.length;
    return shown === total ? `${total} トピック` : `${shown} / ${total} トピック`;
  }

  protected override filtered(): MindMapData {
    const tags = this.tagFilter;
    const matches = tags.active.length === 0 ? null : (node: MindMapNode) => tagStateMatches(node.tags, tags);
    return visibleMindMap(this.items(), matches, this.#collapsed);
  }

  protected override layoutSignature(): string {
    return this.filtered()
      .nodes.map((node) => `${node.id}<${node.parent ?? ''}:${node.side ?? ''}`)
      .join(',');
  }

  protected override computePlacement(visible: MindMapData): LayoutResult {
    return layoutMindMap(visible);
  }

  /**
   * Authored folding seeds the live state whenever new data arrives. Replayed
   * element actions are not new data: they keep the reader's folding and view.
   */
  protected override refreshContent(): void {
    const authored = this.authoredItems();
    if (authored !== this.#seededFrom) {
      this.#seededFrom = authored;
      this.#collapsed = new Set(authored.nodes.filter((node) => node.collapsed).map((node) => node.id));
      this.#fitted = false;
      this.#adding = null;
    }
    super.refreshContent();
  }

  /**
   * The central topic sits in the middle, so opening at 100% from the top-left
   * corner would hide half the map: fit it once, then leave the reader's view
   * alone while they fold and filter.
   */
  protected override initialView(): void {
    if (this.#fitted) {
      this.viewport?.apply();
      return;
    }
    this.#fitted = true;
    this.viewport?.fit();
  }

  protected override commentItems(): readonly CommentTargetOption[] {
    return this.items().nodes.map((node) => ({ value: this.commentRef('node', node.id), label: node.label }));
  }

  protected override hasSelection(selection: { readonly kind: string; readonly id: string }): boolean {
    return selection.kind === 'node' && this.items().nodes.some((node) => node.id === selection.id);
  }

  protected override relations(selection: DiagramSelection, visible: MindMapData): Reach {
    if (selection === null || selection.kind !== 'node') return { nodes: new Map(), edges: new Set() };
    const below = reach(visible.edges, selection.id, 'outgoing', true);
    const above = reach(visible.edges, selection.id, 'incoming', true);
    return {
      nodes: new Map([...below.nodes, ...above.nodes]),
      edges: new Set([...below.edges, ...above.edges]),
    };
  }

  /** The map is its own detail view: the selection's actions sit next to the topic. */
  protected override renderSelection(): typeof nothing {
    return nothing;
  }

  protected override renderCanvas(): TemplateResult {
    const visible = this.filtered();
    return html`
      ${this.renderEdges(
        visible.edges.map((edge) => this.#renderBranch(edge)),
        [],
      )}
      ${visible.nodes.map((node) => this.#renderTopic(node))} ${this.#renderActions()}
    `;
  }

  // ---------------------------------------------------------------- internals

  #branchClass(node: MindMapNode | undefined): string {
    if (node === undefined || node.branch < 0) return 'branch-root';
    return `branch-${node.branch % BRANCH_COLORS}`;
  }

  #renderBranch(edge: MindMapEdge): TemplateResult {
    const child = this.items().nodes.find((node) => node.id === edge.to);
    const state = this.edgeState(edge.id);
    return svg`
      <path
        class=${this.elementClass(state, 'd-edge', 'mind-branch', this.#branchClass(child), `depth-${Math.min(child?.depth ?? 1, 3)}`)}
        data-branch=${edge.id}
        d=${branchPath(this.routeOf(edge.id))}
      ></path>
    `;
  }

  #renderTopic(node: MindMapNode): TemplateResult | typeof nothing {
    const placed = this.placedNode(node.id);
    if (!placed) return nothing;
    const state = this.nodeState(node.id);
    const folded = this.#collapsed.has(node.id);
    const depthClass = `depth-${Math.min(node.depth, 3)}`;
    return html`
      <button
        type="button"
        class=${this.elementClass(
          state,
          'd-node',
          'mind-topic',
          depthClass,
          this.#branchClass(node),
          folded && 'is-folded',
          node.added && 'is-added',
        )}
        data-topic=${node.id}
        data-grill-questions=${this.questionsOf(node)}
        style="left:${placed.x}px; top:${placed.y}px; width:${placed.width}px; height:${placed.height}px"
        aria-pressed=${state.selected ? 'true' : 'false'}
        title=${node.description ?? node.label}
        @click=${() => this.select({ kind: 'node', id: node.id })}
      >
        <span class="mind-label">${node.label}</span>
      </button>
      ${node.depth === 0 || node.children.length === 0 ? nothing : this.#renderToggle(node, placed, folded, state.dimmed)}
    `;
  }

  #renderToggle(
    node: MindMapNode,
    placed: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
    folded: boolean,
    dimmed: boolean,
  ): TemplateResult {
    const hidden = folded ? descendantCount(this.items(), node.id) : 0;
    const x = node.side === 'left' ? placed.x : placed.x + placed.width;
    const label = folded ? `${node.label} のサブトピック ${hidden} 件をひらく` : `${node.label} のサブトピックをたたむ`;
    return html`
      <button
        type="button"
        class=${this.elementClass(
          { selected: false, related: false, dimmed, depth: null },
          'mind-toggle',
          this.#branchClass(node),
          folded && 'is-folded',
        )}
        data-toggle=${node.id}
        style="left:${x}px; top:${placed.y + placed.height / 2}px"
        aria-expanded=${folded ? 'false' : 'true'}
        aria-label=${label}
        title=${label}
        @click=${(event: Event) => {
          event.stopPropagation();
          this.toggle(node.id);
        }}
      >
        ${folded ? hidden : '−'}
      </button>
    `;
  }

  /** Subtopic and comment for the selected topic, just below it. */
  #renderActions(): TemplateResult | typeof nothing {
    const selection = this.selection;
    if (selection === null || selection.kind !== 'node') return nothing;
    const node = this.items().nodes.find((item) => item.id === selection.id);
    const placed = this.placedNode(selection.id);
    if (node === undefined || placed === undefined) return nothing;
    const adding = this.#adding?.parent === node.id ? this.#adding : null;
    return html`
      <div
        class="mind-actions"
        data-for=${node.id}
        style="left:${this.#actionsLeft(node, placed)}px; top:${placed.y + placed.height + 8}px"
        @click=${(event: Event) => event.stopPropagation()}
      >
        ${
          adding === null
            ? html`
                <button type="button" class="dpk-btn" data-action="add" @click=${() => this.#startAdding(node.id)}>
                  ＋ サブトピック
                </button>
                <button
                  type="button"
                  class="dpk-btn"
                  data-action="comment"
                  @click=${() => this.requestElementComment('node', node.id)}
                >
                  コメント
                </button>
              `
            : html`
                <input
                  class="dpk-input"
                  aria-label="${node.label} のサブトピック"
                  placeholder="サブトピック名（Enter で追加）"
                  .value=${adding.label}
                  @input=${(event: Event) => {
                    const input = event.currentTarget;
                    if (input instanceof HTMLInputElement)
                      this.#adding = { ...adding, label: input.value, failed: false };
                  }}
                  @keydown=${(event: KeyboardEvent) => this.#onAddKey(event, node.id)}
                />
                ${
                  adding.failed
                    ? html`<span class="mind-actions-error" role="alert"
                        >記録できませんでした（dpk-template-* 要素の中に置いてください）。</span
                      >`
                    : nothing
                }
              `
        }
      </div>
    `;
  }

  /** Left-side topics grow leftwards, so their actions hug the topic's right edge. */
  #actionsLeft(node: MindMapNode, placed: PlacedNode): number {
    return node.side === 'left' ? placed.x + placed.width - 220 : placed.x;
  }

  #startAdding(parent: string): void {
    this.#adding = { parent, label: '', failed: false };
    this.requestUpdate();
    void this.updateComplete.then(() =>
      this.renderRoot.querySelector<HTMLInputElement>('.mind-actions input')?.focus(),
    );
  }

  #onAddKey(event: KeyboardEvent, parent: string): void {
    if (event.isComposing) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.#adding = null;
      this.requestUpdate();
      return;
    }
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const label = this.#adding?.label.trim() ?? '';
    if (label.length === 0) return;
    // Labels are often not ASCII; the prefix keeps such ids readable (`topic-2`).
    const id = createEntityId(
      `topic ${label}`,
      this.items().nodes.map((node) => node.id),
    );
    const accepted = this.dispatchElementAction(ADD_TOPIC, ['node', parent], { id, label });
    if (!accepted) {
      this.#adding = { parent, label, failed: true };
      this.requestUpdate();
      return;
    }
    // The template replayed the action synchronously: the topic exists now.
    this.#adding = null;
    this.#collapsed.delete(parent);
    this.select({ kind: 'node', id });
    this.requestUpdate();
  }
}
