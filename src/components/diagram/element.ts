import { LitElement, html, svg, type CSSResultGroup, type PropertyValues } from 'lit';

import type { ContextMenuGroup, ContextMenuRequest } from '../../core/context-menu/types';
import type { CommentTargetOption } from '../../core/types';

import { contextMenuMessages } from '../../core/context-menu/messages';
import { LocaleController } from '../../core/locale-controller';
import { controls, popoverSurface, tokens } from '../../core/theme';
import { CommentPopoverController, reviewCommentMenuGroup } from '../comment-composer/controller';
import { edgeBody, lineStyleClass } from './edge/render';
import { edgeStyles } from './edge/styles';
import { diagramMessages, type DiagramMessages } from './messages';
import {
  diagramTargetValue,
  parseDiagram,
  type Diagram,
  type DiagramError,
  type DiagramKind,
  type RawAttributes,
} from './model';
import { presentDiagram, type DiagramView, type Size } from './present';
import { diagramStyles } from './styles';

export type DiagramSelection = { readonly kind: DiagramKind; readonly id: string };

const NODE = 'dpk-diagram-node';
const EDGE = 'dpk-diagram-edge';
const GROUP = 'dpk-diagram-group';
/** The narrowest the figure shrinks to fit its column before it scrolls sideways instead. */
const MIN_SCALE = 0.6;
const OBSERVED = [
  'id',
  'label',
  'layout',
  'direction',
  'crossings',
  'shape',
  'tone',
  'col',
  'row',
  'from',
  'to',
  'line',
  'start',
  'end',
  'flow',
];

const attributesOf = (element: Element): RawAttributes =>
  Object.fromEntries(OBSERVED.map((name) => [name, element.getAttribute(name)]));

const textOf = (element: Element): string => (element.textContent ?? '').replace(/\s+/g, ' ').trim();

const sameSelection = (a: DiagramSelection | null, b: DiagramSelection | null): boolean =>
  a?.kind === b?.kind && a?.id === b?.id;

/**
 * `<dpk-diagram>` — a small figure composed from `dpk-diagram-node`,
 * `dpk-diagram-edge` and `dpk-diagram-group` children. It measures the nodes
 * and label chips, lays them out (`layout`, `direction`), draws the lines with
 * their end glyphs and jumps (`crossings`), and makes every node, line and
 * group selectable and commentable.
 */
export class DpkDiagram extends LitElement {
  static override styles: CSSResultGroup = [tokens, controls, popoverSurface, edgeStyles, diagramStyles];

  static override properties = {
    id: { type: String, reflect: true },
    label: { type: String },
    selection: { attribute: false },
  };
  declare label: string | null;
  declare selection: DiagramSelection | null;

  readonly #i18n = new LocaleController(this);
  readonly #commentPopover = new CommentPopoverController(this);
  readonly #observer = new MutationObserver(() => this.#collect());
  readonly #resize = new ResizeObserver(() => this.#scheduleMeasure());
  #diagram: Diagram | null = null;
  #errors: readonly DiagramError[] = [];
  #view: DiagramView | null = null;
  #nodes = new Map<string, HTMLElement>();
  #edges = new Map<string, HTMLElement>();
  #sizeSignature = '';
  #targetSignature = '';
  #frame = 0;
  #width = 0;

  constructor() {
    super();
    this.id = this.getAttribute('id') ?? '';
    this.label = null;
    this.selection = null;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#observer.observe(this, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: OBSERVED,
    });
    this.#resize.observe(this);
    this.addEventListener('click', this.#onClick);
    this.addEventListener('keydown', this.#onKeydown);
    void Promise.all([NODE, EDGE, GROUP].map((tag) => customElements.whenDefined(tag))).then(() => this.#collect());
    this.#collect();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#observer.disconnect();
    this.#resize.disconnect();
    cancelAnimationFrame(this.#frame);
    this.removeEventListener('click', this.#onClick);
    this.removeEventListener('keydown', this.#onKeydown);
  }

  get commentTargets(): readonly CommentTargetOption[] {
    const diagram = this.#diagram;
    if (!this.id || diagram === null) return [];
    const m = this.#m;
    const group = `${this.label ?? m.heading} · ${this.id}`;
    const nodeLabel = new Map(diagram.nodes.map((node) => [node.id, node.label || node.id]));
    return [
      ...diagram.nodes.map((node) => ({
        value: diagramTargetValue(this.id, 'node', node.id),
        label: `${m.node}: ${node.label || node.id}`,
        group,
      })),
      ...diagram.edges.map((edge) => ({
        value: diagramTargetValue(this.id, 'edge', edge.id),
        label: `${m.edge}: ${nodeLabel.get(edge.from)} → ${nodeLabel.get(edge.to)}${edge.label ? ` (${edge.label})` : ''}`,
        group,
      })),
      ...diagram.groups.map((item) => ({
        value: diagramTargetValue(this.id, 'group', item.id),
        label: `${m.group}: ${item.label || item.id}`,
        group,
      })),
    ];
  }

  getContextMenuItems(request: ContextMenuRequest): readonly ContextMenuGroup[] | null {
    const group = reviewCommentMenuGroup(
      request.target,
      this.commentTargets,
      contextMenuMessages(this.#i18n.locale),
      (ref, label) => this.#openCommentPopover(ref, label),
    );
    return group === null ? null : [group];
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('id') || changed.has('label')) {
      this.#applyChildState();
      this.#syncTargets();
    }
    if (changed.has('selection')) this.#applyChildState();
  }

  protected override updated(): void {
    this.#commentPopover.sync(this.renderRoot.querySelector<HTMLElement>('.comment-pop'));
  }

  protected override render(): unknown {
    const m = this.#m;
    const popover = this.#commentPopover.render({
      locale: this.#i18n.locale,
      errorMessage: m.sendFailed,
      submit: (target, body) => this.#submitComment(target, body),
    });
    if (this.#errors.length > 0) {
      return html`<div class="error" role="alert">
          <p>${m.invalid}</p>
          <ul>
            ${this.#errors.map((error) => html`<li>${this.#errorText(error)}</li>`)}
          </ul>
        </div>
        <slot hidden></slot>`;
    }
    const view = this.#view;
    const scale = view === null || this.#width === 0 ? 1 : Math.max(MIN_SCALE, Math.min(1, this.#width / view.width));
    const width = view?.width ?? 0;
    const height = view?.height ?? 0;
    return html`<figure
        class="scroller"
        role="figure"
        aria-label=${this.label ?? m.heading}
        style="margin:0"
        @click=${this.#onCanvasClick}
      >
        <div class="sizer" style=${`width:${width}px`}></div>
        <div class="stage" style=${`width:${width * scale}px;height:${height * scale}px`}>
          <div
            class=${view === null ? 'canvas is-measuring' : 'canvas'}
            style=${`width:${width}px;height:${height}px;transform:scale(${scale})`}
          >
            ${view?.frames.map(
              (frame) =>
                html`<div
                  class=${`frame tone-${frame.tone}${this.#isSelected('group', frame.id) ? ' is-selected' : ''}`}
                  style=${`left:${frame.x}px;top:${frame.y}px;width:${frame.width}px;height:${frame.height}px`}
                  role="button"
                  tabindex="0"
                  aria-label=${`${m.group}: ${frame.label || frame.id}`}
                  data-dpk-target=${diagramTargetValue(this.id, 'group', frame.id)}
                  @click=${(event: Event) => this.#select(event, { kind: 'group', id: frame.id })}
                  @keydown=${(event: KeyboardEvent) => this.#selectByKey(event, { kind: 'group', id: frame.id })}
                >
                  ${frame.label ? html`<span class="frame-title">${frame.label}</span>` : null}
                </div>`,
            )}
            <svg class="lines" width=${width} height=${height} aria-hidden=${view === null ? 'true' : 'false'}>
              ${view?.edges.map((edge) => {
                const state = this.#edgeState(edge.id, edge.from, edge.to);
                const classes = [
                  'd-edge',
                  `tone-${edge.tone}`,
                  lineStyleClass(edge.line),
                  edge.flow ? 'is-flowing' : false,
                  state,
                ].filter(Boolean);
                return svg`<g class=${classes.join(' ')} data-dpk-target=${diagramTargetValue(this.id, 'edge', edge.id)}>
                  ${edgeBody({
                    d: edge.d,
                    ends: edge.ends,
                    flow: edge.flow || state === 'is-selected' || state === 'is-lit',
                    hit: {
                      label: this.#edgeLabel(edge.id),
                      onSelect: () => this.#setSelection({ kind: 'edge', id: edge.id }),
                    },
                  })}
                </g>`;
              })}
            </svg>
            <slot @slotchange=${() => this.#collect()}></slot>
          </div>
        </div>
        ${this.#summary()}
      </figure>
      ${popover}`;
  }

  get #m(): DiagramMessages {
    return diagramMessages(this.#i18n.locale);
  }

  #errorText(error: DiagramError): string {
    const m = this.#m;
    switch (error.code) {
      case 'missing-id':
        return m.missingId(m[error.kind]);
      case 'duplicate-id':
        return m.duplicateId(error.id);
      case 'unknown-end':
        return m.unknownEnd(error.id, error.end);
      case 'bad-value':
        return m.badValue(error.id, error.attribute, error.value);
      case 'missing-cell':
        return m.missingCell(error.id);
      case 'nested-group':
        return m.nestedGroup(error.id);
      default:
        return '';
    }
  }

  #edgeLabel(id: string): string {
    const value = diagramTargetValue(this.id, 'edge', id);
    return this.commentTargets.find((target) => target.value === value)?.label ?? id;
  }

  /** The structure as text for a screen reader, since the drawn lines carry no reading order. */
  #summary(): unknown {
    const diagram = this.#diagram;
    if (diagram === null) return null;
    const m = this.#m;
    return html`<div class="sr-only">
      <p>${m.nodes}</p>
      <ul>
        ${diagram.nodes.map((node) => html`<li>${node.label || node.id}</li>`)}
      </ul>
      <p>${m.edges}</p>
      <ul>
        ${diagram.edges.map((edge) => html`<li>${this.#edgeLabel(edge.id)}</li>`)}
      </ul>
    </div>`;
  }

  #isSelected(kind: DiagramKind, id: string): boolean {
    return this.selection?.kind === kind && this.selection.id === id;
  }

  #edgeState(id: string, from: string, to: string): 'is-selected' | 'is-lit' | 'is-dimmed' | false {
    const selection = this.selection;
    if (selection === null || selection.kind === 'group') return false;
    if (selection.kind === 'edge') return selection.id === id ? 'is-selected' : 'is-dimmed';
    return from === selection.id || to === selection.id ? 'is-lit' : 'is-dimmed';
  }

  #nodeState(id: string): string {
    const selection = this.selection;
    const diagram = this.#diagram;
    if (selection === null || diagram === null || selection.kind === 'group') return '';
    if (selection.kind === 'node') {
      if (selection.id === id) return 'selected';
      const near = diagram.edges.some(
        (edge) => (edge.from === selection.id && edge.to === id) || (edge.to === selection.id && edge.from === id),
      );
      return near ? '' : 'dimmed';
    }
    const edge = diagram.edges.find((item) => item.id === selection.id);
    return edge !== undefined && (edge.from === id || edge.to === id) ? '' : 'dimmed';
  }

  #setSelection(next: DiagramSelection | null): void {
    if (sameSelection(this.selection, next)) return;
    this.selection = next;
    this.dispatchEvent(
      new CustomEvent('dpk-diagram-select', { detail: { selection: next }, bubbles: true, composed: true }),
    );
  }

  #select(event: Event, next: DiagramSelection): void {
    event.stopPropagation();
    this.#setSelection(sameSelection(this.selection, next) ? null : next);
  }

  #selectByKey(event: KeyboardEvent, next: DiagramSelection): void {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    this.#select(event, next);
  }

  /** Clicks on the light-DOM nodes and chips: the element hit is one of this diagram's own children. */
  readonly #onClick = (event: MouseEvent): void => {
    const next = this.#selectionAt(event);
    if (next !== null) this.#select(event, next);
  };

  readonly #onKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.selection !== null) {
      this.#setSelection(null);
      return;
    }
    const next = this.#selectionAt(event);
    if (next !== null) this.#selectByKey(event, next);
  };

  readonly #onCanvasClick = (event: Event): void => {
    if (this.#selectionAt(event) !== null) return;
    if (event.target instanceof Element && event.target.closest('.d-edge-hit, .frame') !== null) return;
    this.#setSelection(null);
  };

  #selectionAt(event: Event): DiagramSelection | null {
    for (const item of event.composedPath()) {
      if (!(item instanceof HTMLElement)) continue;
      if (item === this) return null;
      const id = item.getAttribute('id') ?? '';
      if (item.localName === NODE && this.#nodes.get(id) === item) return { kind: 'node', id };
      if (item.localName === EDGE && this.#edges.get(id) === item) return { kind: 'edge', id };
    }
    return null;
  }

  #openCommentPopover(ref: string, label: string): void {
    const selector = `[data-dpk-target="${CSS.escape(ref)}"]`;
    const anchor = this.querySelector<Element>(selector) ?? this.renderRoot.querySelector<Element>(selector);
    if (anchor === null) return;
    this.#commentPopover.open(ref, anchor, label);
  }

  #submitComment(target: string, body: string): boolean {
    return !this.dispatchEvent(
      new CustomEvent('dpk-comment-submit', {
        detail: { target, body },
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    );
  }

  /** Reads the children into a diagram; a structural problem replaces the figure with the list of problems. */
  #collect(): void {
    const nodes: { attributes: RawAttributes; label: string; group: string | null }[] = [];
    const edges: { attributes: RawAttributes; label: string }[] = [];
    const groups: { attributes: RawAttributes }[] = [];
    const nested: string[] = [];
    const nodeElements = new Map<string, HTMLElement>();
    const edgeElements = new Map<string, HTMLElement>();
    const addNode = (element: HTMLElement, group: string | null) => {
      nodes.push({ attributes: attributesOf(element), label: textOf(element), group });
      nodeElements.set(element.id, element);
    };
    for (const child of this.children) {
      if (!(child instanceof HTMLElement)) continue;
      if (child.localName === NODE) addNode(child, null);
      else if (child.localName === EDGE) {
        edges.push({ attributes: attributesOf(child), label: textOf(child) });
        edgeElements.set(child.id, child);
      } else if (child.localName === GROUP) {
        groups.push({ attributes: attributesOf(child) });
        for (const inner of child.children) {
          if (!(inner instanceof HTMLElement)) continue;
          if (inner.localName === NODE) addNode(inner, child.id);
          else if (inner.localName === GROUP) nested.push(inner.id || GROUP);
        }
      }
    }
    const result = parseDiagram({ attributes: attributesOf(this), nodes, edges, groups, nestedGroups: nested });
    this.#nodes = nodeElements;
    this.#edges = edgeElements;
    this.#resize.disconnect();
    this.#resize.observe(this);
    for (const element of [...nodeElements.values(), ...edgeElements.values()]) this.#resize.observe(element);
    if (result.ok) {
      this.#diagram = result.diagram;
      this.#errors = [];
    } else {
      this.#diagram = null;
      this.#errors = result.errors;
      this.#view = null;
    }
    this.#sizeSignature = '';
    this.#applyChildState();
    this.#syncTargets();
    this.#scheduleMeasure();
    this.requestUpdate();
  }

  #scheduleMeasure(): void {
    cancelAnimationFrame(this.#frame);
    this.#frame = requestAnimationFrame(() => this.#measure());
  }

  /** Measures nodes and chips at their natural size and lays the figure out again when any of them changed. */
  #measure(): void {
    this.#width = this.clientWidth;
    const diagram = this.#diagram;
    if (diagram === null) {
      this.requestUpdate();
      return;
    }
    const nodeSizes = new Map<string, Size>();
    for (const node of diagram.nodes) {
      const element = this.#nodes.get(node.id);
      if (element !== undefined) nodeSizes.set(node.id, { width: element.offsetWidth, height: element.offsetHeight });
    }
    const chipSizes = new Map<string, Size>();
    for (const edge of diagram.edges) {
      const element = this.#edges.get(edge.id);
      if (element === undefined || edge.label === '') continue;
      chipSizes.set(edge.id, { width: element.offsetWidth, height: element.offsetHeight });
    }
    const signature = JSON.stringify([...nodeSizes, ...chipSizes]);
    if (signature !== this.#sizeSignature || this.#view === null) {
      this.#sizeSignature = signature;
      this.#view = presentDiagram(diagram, { nodes: nodeSizes, chips: chipSizes });
      this.#place(this.#view);
    }
    this.requestUpdate();
  }

  #place(view: DiagramView): void {
    for (const box of view.nodes) {
      const element = this.#nodes.get(box.id);
      if (element !== undefined) element.style.transform = `translate(${box.x}px, ${box.y}px)`;
    }
    for (const edge of view.edges) {
      const element = this.#edges.get(edge.id);
      if (element === undefined) continue;
      element.style.display = edge.chip === null ? 'none' : '';
      if (edge.chip !== null) element.style.transform = `translate(${edge.chip.x}px, ${edge.chip.y}px)`;
    }
  }

  /** Marks the light-DOM children with their comment target and their part in the current selection. */
  #applyChildState(): void {
    const diagram = this.#diagram;
    if (diagram === null) return;
    for (const node of diagram.nodes) {
      const element = this.#nodes.get(node.id);
      if (element === undefined) continue;
      if (this.id) element.setAttribute('data-dpk-target', diagramTargetValue(this.id, 'node', node.id));
      element.setAttribute('aria-pressed', String(this.#isSelected('node', node.id)));
      const state = this.#nodeState(node.id);
      if (state === '') element.removeAttribute('data-state');
      else element.setAttribute('data-state', state);
    }
    for (const edge of diagram.edges) {
      const element = this.#edges.get(edge.id);
      if (element === undefined) continue;
      if (this.id) element.setAttribute('data-dpk-target', diagramTargetValue(this.id, 'edge', edge.id));
      const state = this.#edgeState(edge.id, edge.from, edge.to);
      if (state === false || state === 'is-lit') element.removeAttribute('data-state');
      else element.setAttribute('data-state', state.slice(3));
    }
  }

  #syncTargets(): void {
    const signature = JSON.stringify(this.commentTargets);
    if (signature === this.#targetSignature) return;
    this.#targetSignature = signature;
    this.dispatchEvent(new CustomEvent('dpk-comment-targets-change', { bubbles: true, composed: true }));
  }
}

export const defineDiagram = (): void => {
  if (!customElements.get('dpk-diagram')) customElements.define('dpk-diagram', DpkDiagram);
};
