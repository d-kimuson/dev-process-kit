import { html, type LitElement, type TemplateResult } from 'lit';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { ContextMenuRequest } from '../../core/context-menu/types';

import { parseTargetRef } from '../../core/target';
import { DiagramElement } from './element';
import { diagramMessages } from './messages';
import { reach, type DiagramEdgeInput, type DiagramNodeInput, type DiagramSelection, type Reach } from './model';
import { pathData } from './view';

const m = diagramMessages('en');

/**
 * Minimal diagram used to exercise the shared foundation: three tagged nodes and
 * one edge, each marked with its own `commentRef` so the right-click "Review
 * comment" item can find it.
 */
type TinyNode = DiagramNodeInput & { readonly label: string };
type TinyEdge = DiagramEdgeInput & { readonly label: string };
type TinyData = { readonly nodes: readonly TinyNode[]; readonly edges: readonly TinyEdge[] };

const tinyData: TinyData = {
  nodes: [
    { id: 'a', label: 'Alpha', tags: ['x'], width: 100, height: 50 },
    { id: 'b', label: 'Beta', tags: ['y'], width: 100, height: 50 },
    { id: 'c', label: 'Gamma', tags: ['x', 'y'], width: 100, height: 50 },
  ],
  edges: [{ id: 'ab', from: 'a', to: 'b', label: 'A to B', tags: ['link'] }],
};

class TinyDiagram extends DiagramElement<TinyData> {
  protected override parseData(input: unknown): TinyData {
    const value = input as Partial<TinyData>;
    if (!Array.isArray(value.nodes) || !Array.isArray(value.edges)) throw new Error('nodes/edges must be arrays');
    return { nodes: value.nodes, edges: value.edges };
  }

  protected override emptyData(): TinyData {
    return { nodes: [], edges: [] };
  }

  protected override defaultHeading(): string {
    return 'Tiny';
  }

  protected override statsLabels(): { readonly node: string; readonly edge: string } {
    return { node: 'node', edge: 'edge' };
  }

  protected override relations(selection: DiagramSelection, visible: TinyData): Reach {
    if (selection === null || selection.kind !== 'node') return { nodes: new Map(), edges: new Set() };
    return reach(visible.edges, selection.id, 'outgoing', false);
  }

  protected override renderCanvas(): TemplateResult {
    const edges = this.visible.edges.map((edge) => {
      const state = this.edgeState(edge.id);
      return html`<g
        class=${this.elementClass(state, 'd-edge')}
        data-edge=${edge.id}
        data-dpk-target=${this.commentRef('edge', edge.id)}
        role="button"
        tabindex="0"
        @click=${() => this.select({ kind: 'edge', id: edge.id })}
      >
        <path class="d-edge-path" d=${pathData(this.routeOf(edge.id))}></path>
      </g>`;
    });
    const nodes = this.visible.nodes.map((node) => {
      const placed = this.placedNode(node.id);
      const state = this.nodeState(node.id);
      return html`<button
        type="button"
        class=${this.elementClass(state, 'd-node', this.isDraggingNode(node.id) && 'is-dragging')}
        data-node=${node.id}
        data-dpk-target=${this.commentRef('node', node.id)}
        style="left:${placed?.x ?? 0}px; top:${placed?.y ?? 0}px; width:${node.width}px; height:${node.height}px"
        @pointerdown=${(event: PointerEvent) => this.onNodeDragStart(event, node.id)}
        @click=${() => {
          if (!this.consumeDragClick()) this.select({ kind: 'node', id: node.id });
        }}
      >
        ${node.label}
      </button>`;
    });
    const group = html`<div
      class="d-group${this.isDraggingGroup('x') ? ' is-dragging' : ''}"
      data-group="x"
      @pointerdown=${(event: PointerEvent) => this.onGroupDragStart(event, 'x', ['a', 'c'])}
    ></div>`;
    return html`${this.renderEdges(edges, [{ id: 'tiny-arrow', color: '#888' }])}${group}${nodes}`;
  }
}

class FixedTinyDiagram extends TinyDiagram {
  protected override get layoutMode(): 'fixed' {
    return 'fixed';
  }
}

customElements.define('tiny-diagram', TinyDiagram);
customElements.define('fixed-tiny-diagram', FixedTinyDiagram);

const mount = async (tag: string, data: TinyData | null): Promise<TinyDiagram> => {
  const element = document.createElement(tag);
  if (!(element instanceof TinyDiagram)) throw new Error('element did not upgrade');
  if (data) element.data = data;
  document.body.append(element);
  for (let index = 0; index < 3; index++) await element.updateComplete;
  return element;
};

const settle = async (element: DiagramElement<TinyData>): Promise<void> => {
  for (let index = 0; index < 3; index++) {
    await element.updateComplete;
    for (const part of element.renderRoot.querySelectorAll<LitElement>('dpk-dialog-panel, dpk-tag-filter')) {
      await part.updateComplete;
    }
  }
};

/** The public elements the shell is made of, and the controls inside their shadow roots. */
const shellOf = (element: DiagramElement<TinyData>) => {
  const panel = element.renderRoot.querySelector<HTMLElement>('dpk-dialog-panel');
  const filter = element.renderRoot.querySelector<HTMLElement>('dpk-tag-filter');
  return {
    panel,
    filter,
    maximize: () => panel?.shadowRoot?.querySelector<HTMLButtonElement>('.maximize') ?? null,
    maximized: () => panel?.hasAttribute('maximized') ?? false,
    canvas: () => panel?.shadowRoot?.querySelector<HTMLElement>('.canvas') ?? null,
    zoomValue: () => panel?.shadowRoot?.querySelector<HTMLButtonElement>('.zoom-value') ?? null,
  };
};

/**
 * Runs the right-click menu's "Review comment" item for `ref`, the same way
 * `collectContextMenuGroups` + a click would: resolve the target, ask the
 * element for its groups, run the matching entry.
 */
const reviewComment = (element: DiagramElement<TinyData>, ref: string): void => {
  const request: ContextMenuRequest = { clientX: 0, clientY: 0, target: parseTargetRef(ref) };
  const groups = element.getContextMenuItems(request) ?? [];
  const entry = groups.flatMap((group) => group.entries).find((candidate) => candidate.id === 'review-comment');
  if (entry?.kind === 'item') entry.run();
};

const nodeIds = (element: DiagramElement<TinyData>): (string | undefined)[] =>
  [...element.renderRoot.querySelectorAll<HTMLElement>('.d-node')].map((node) => node.dataset['node']);

afterEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
});

describe('DiagramElement', () => {
  it('exposes node and edge comment targets with stable encoded ids independent of filters', async () => {
    const element = await mount('tiny-diagram', tinyData);
    element.id = 'schema/one';
    await element.updateComplete;
    const targets = element.commentTargets;
    expect(targets.map((target) => target.value)).toEqual([
      'element:schema%2Fone/node/a',
      'element:schema%2Fone/node/b',
      'element:schema%2Fone/node/c',
      'element:schema%2Fone/edge/ab',
    ]);
    element.tagFilter = { match: 'single', active: ['absent'] };
    await element.updateComplete;
    expect(element.commentTargets).toEqual(targets);
  });

  it('renders the toolbar, tags, stats and both element kinds', async () => {
    const element = await mount('tiny-diagram', tinyData);
    const { panel, filter } = shellOf(element);
    expect(panel?.getAttribute('heading')).toBe('Tiny');
    expect(panel?.shadowRoot?.querySelector('.title')?.textContent).toBe('Tiny');
    expect(
      [...(filter?.shadowRoot?.querySelectorAll('.dpk-tag') ?? [])].map((tag) => tag.textContent?.replace(/\s+/g, '')),
    ).toEqual(['x2', 'y2']);
    expect(element.renderRoot.querySelector('.diagram-stats')?.textContent).toBe('3 node · 1 edge');
    expect(nodeIds(element)).toEqual(['a', 'b', 'c']);
    expect(element.renderRoot.querySelectorAll('.d-edge')).toHaveLength(1);
    expect(element.renderRoot.querySelector('.d-edge-path')?.getAttribute('d')).toMatch(/^M\d/);
    expect(element.renderRoot.querySelector('.diagram-empty')).toBeNull();
  });

  it('hides the whole toolbar row when nothing carries a tag', async () => {
    const element = await mount('tiny-diagram', {
      nodes: [{ id: 'a', label: 'Alpha', tags: [], width: 100, height: 50 }],
      edges: [],
    });
    const { filter } = shellOf(element);
    expect(filter?.shadowRoot?.querySelector('.diagram-match')).toBeNull();
    expect(filter?.shadowRoot?.textContent?.trim()).toBe('');
  });

  it('filters by tag with Single, AND and OR, and clears', async () => {
    const element = await mount('tiny-diagram', tinyData);
    const inFilter = (selector: string) =>
      shellOf(element).filter?.shadowRoot?.querySelector<HTMLButtonElement>(selector) ?? null;
    const tag = (name: string) => inFilter(`[data-tag="${name}"]`);
    tag('x')?.click();
    await settle(element);
    expect(nodeIds(element)).toEqual(['a', 'c']);
    expect(element.renderRoot.querySelectorAll('.d-edge')).toHaveLength(0);

    inFilter('[data-match="all"]')?.click();
    await settle(element);
    tag('y')?.click();
    await settle(element);
    expect(nodeIds(element)).toEqual(['c']);

    inFilter('[data-match="any"]')?.click();
    await settle(element);
    expect(nodeIds(element)).toEqual(['a', 'b', 'c']);

    inFilter('[data-match="single"]')?.click();
    await settle(element);
    expect(element.tagFilter).toEqual({ match: 'single', active: ['y'] });
    expect(nodeIds(element)).toEqual(['b', 'c']);

    inFilter('.dpk-tag-clear')?.click();
    await settle(element);
    expect(nodeIds(element)).toEqual(['a', 'b', 'c']);
  });

  it('shows the empty state when a tag matches nothing', async () => {
    const element = await mount('tiny-diagram', tinyData);
    element.tagFilter = { match: 'all', active: ['x', 'nothing'] };
    await element.updateComplete;
    expect(nodeIds(element)).toEqual([]);
    expect(element.renderRoot.querySelector('.diagram-empty')?.textContent).toBe(m.noMatches);
  });

  it('highlights relations, dims the rest and publishes the selection', async () => {
    const element = await mount('tiny-diagram', tinyData);
    const events: unknown[] = [];
    element.addEventListener('dpk-diagram-select', (event) => events.push((event as CustomEvent).detail));
    element.renderRoot.querySelector<HTMLButtonElement>('[data-node="a"]')?.click();
    await element.updateComplete;
    const stateOfNode = (id: string) => {
      const node = element.renderRoot.querySelector<HTMLElement>(`[data-node="${id}"]`);
      return {
        selected: node?.classList.contains('is-selected'),
        related: node?.classList.contains('is-related'),
        dimmed: node?.classList.contains('is-dimmed'),
      };
    };
    expect(stateOfNode('a')).toEqual({ selected: true, related: false, dimmed: false });
    expect(stateOfNode('b')).toEqual({ selected: false, related: true, dimmed: false });
    expect(stateOfNode('c')).toEqual({ selected: false, related: false, dimmed: true });
    expect(element.renderRoot.querySelector('.d-edge')?.classList.contains('is-related')).toBe(true);
    expect(events).toEqual([{ selection: { kind: 'node', id: 'a' } }]);

    element.select(null);
    await element.updateComplete;
    expect(element.renderRoot.querySelectorAll('.is-dimmed')).toHaveLength(0);
    expect(events).toHaveLength(2);
  });

  it('has no bottom detail view: selecting never adds UI below the canvas', async () => {
    const element = await mount('tiny-diagram', tinyData);
    element.id = 'tiny';
    element.select({ kind: 'node', id: 'a' });
    await settle(element);
    expect(element.renderRoot.querySelector('.diagram-details')).toBeNull();
    expect(element.renderRoot.querySelector('.comment-pop')).toBeNull();
    expect(shellOf(element).panel?.lastElementChild?.classList.contains('diagram-overlay')).toBe(true);
  });

  it('offers "Review comment" from the context menu only once the diagram has an id', async () => {
    const element = await mount('tiny-diagram', tinyData);
    const refOf = (id: string) =>
      element.renderRoot.querySelector<HTMLElement>(`[data-node="${id}"]`)?.getAttribute('data-dpk-target') ?? '';
    const entryIdsFor = (ref: string) =>
      (element.getContextMenuItems({ clientX: 0, clientY: 0, target: parseTargetRef(ref) }) ?? [])
        .flatMap((group) => group.entries)
        .map((entry) => entry.id);
    expect(entryIdsFor(refOf('a'))).not.toContain('review-comment');
    element.id = 'tiny';
    await settle(element);
    expect(entryIdsFor(refOf('a'))).toContain('review-comment');
  });

  it('opens the composer from the context menu and submits to the enclosing template', async () => {
    const element = await mount('tiny-diagram', tinyData);
    element.id = 'tiny';
    await settle(element);
    const submitted: unknown[] = [];
    element.addEventListener('dpk-comment-submit', (event) => {
      if (!(event instanceof CustomEvent)) return;
      submitted.push(event.detail);
      event.preventDefault();
    });
    reviewComment(element, 'element:tiny/edge/ab');
    await settle(element);
    expect(element.renderRoot.querySelector('.comment-target')?.textContent).toBe('a → b (ab)');
    const area = element.renderRoot.querySelector('textarea');
    if (!area) throw new Error('missing composer');
    expect(element.shadowRoot?.activeElement).toBe(area);
    area.value = 'Why this edge?';
    area.dispatchEvent(new Event('input'));
    await settle(element);
    area.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true }));
    await settle(element);
    expect(submitted).toEqual([{ target: 'element:tiny/edge/ab', body: 'Why this edge?' }]);
    expect(element.renderRoot.querySelector('.comment-pop')).toBeNull();
  });

  it('keeps the draft on a rejected submission, scoped to its own target', async () => {
    const element = await mount('tiny-diagram', tinyData);
    element.id = 'tiny';
    await settle(element);
    reviewComment(element, 'element:tiny/node/a');
    await settle(element);
    const area = element.renderRoot.querySelector('textarea');
    if (!area) throw new Error('missing composer');
    area.value = 'Keep me';
    area.dispatchEvent(new Event('input'));
    await settle(element);
    area.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true }));
    await settle(element);
    expect(element.renderRoot.querySelector('[role="alert"]')?.textContent).toContain(m.sendFailed);
    expect(element.renderRoot.querySelector('textarea')?.value).toBe('Keep me');

    reviewComment(element, 'element:tiny/node/b');
    await settle(element);
    expect(element.renderRoot.querySelector('textarea')?.value).toBe('');

    reviewComment(element, 'element:tiny/node/a');
    await settle(element);
    expect(element.renderRoot.querySelector('textarea')?.value).toBe('Keep me');
  });

  it('reads a JSON child, reports invalid data and keeps the layout stable', async () => {
    const host = document.createElement('div');
    host.innerHTML = `<tiny-diagram><script type="application/json">${JSON.stringify(tinyData)}</script></tiny-diagram>`;
    document.body.append(host);
    const element = host.querySelector('tiny-diagram');
    if (!(element instanceof TinyDiagram)) throw new Error('element did not upgrade');
    for (let index = 0; index < 3; index++) await element.updateComplete;
    expect(nodeIds(element)).toEqual(['a', 'b', 'c']);

    const before = element.renderRoot.querySelector<HTMLElement>('[data-node="a"]')?.style.left;
    element.tagFilter = { match: 'single', active: [] };
    await element.updateComplete;
    expect(element.renderRoot.querySelector<HTMLElement>('[data-node="a"]')?.style.left).toBe(before);

    const broken = document.createElement('tiny-diagram');
    if (!(broken instanceof TinyDiagram)) throw new Error('element did not upgrade');
    broken.innerHTML = '<script type="application/json">{"nodes":1}</script>';
    document.body.append(broken);
    await broken.updateComplete;
    await broken.updateComplete;
    const error = broken.renderRoot.querySelector('.diagram-notice');
    expect(broken.dataError).toMatch(/nodes/);
    expect(error?.textContent).toContain(m.dataError);
  });

  it('places fixed-layout nodes where the data says', async () => {
    const fixed = await mount('fixed-tiny-diagram', {
      nodes: [
        { id: 'a', label: 'Alpha', tags: [], width: 80, height: 40, position: { x: 0, y: 0 } },
        { id: 'b', label: 'Beta', tags: [], width: 80, height: 40, position: { x: 300, y: 0 } },
      ],
      edges: [{ id: 'ab', from: 'a', to: 'b', label: 'A to B', tags: [] }],
    });
    const left = (id: string) => fixed.renderRoot.querySelector<HTMLElement>(`[data-node="${id}"]`)?.style.left;
    expect(left('a')).toBe('28px');
    expect(left('b')).toBe('328px');
    expect(fixed.layout?.routes[0]?.points.length).toBe(2);
  });

  it('zooms and refits through the shared controls', async () => {
    const element = await mount('tiny-diagram', tinyData);
    const shell = shellOf(element);
    const label = () => shell.zoomValue()?.textContent?.trim();
    expect(label()).toBe('100%');
    shell.panel?.shadowRoot?.querySelector<HTMLButtonElement>(`[aria-label="${m.zoomOut}"]`)?.click();
    await settle(element);
    expect(label()).toBe('91%');
    shell.zoomValue()?.click();
    await settle(element);
    expect(label()).toBe('100%');
  });

  it('announces every view change, so badges over the diagram follow it', async () => {
    const element = await mount('tiny-diagram', tinyData);
    const views: unknown[] = [];
    element.addEventListener('dpk-diagram-view', (event) =>
      views.push((event as CustomEvent<{ view: unknown }>).detail.view),
    );
    const outer: Event[] = [];
    document.addEventListener('dpk-canvas-change', (event) => outer.push(event));
    shellOf(element).panel?.shadowRoot?.querySelector<HTMLButtonElement>(`[aria-label="${m.zoomIn}"]`)?.click();
    expect(views.at(-1)).toMatchObject({ scale: 1.1 });
    // The canvas's own event stays inside the diagram: its contract is dpk-diagram-view.
    expect(outer).toHaveLength(0);
  });

  it('maximizes to the viewport from the toolbar and restores with the button or Escape', async () => {
    const element = await mount('tiny-diagram', tinyData);
    const shell = shellOf(element);
    expect(shell.maximize()?.getAttribute('aria-label')).toBe('Maximize');
    expect(shell.maximize()?.getAttribute('aria-pressed')).toBe('false');

    shell.maximize()?.click();
    await settle(element);
    expect(shell.maximized()).toBe(true);
    expect(shell.maximize()?.getAttribute('aria-label')).toBe('Restore size');
    expect(shell.maximize()?.getAttribute('aria-pressed')).toBe('true');
    shell.maximize()?.click();
    await settle(element);
    expect(shell.maximized()).toBe(false);

    shell.maximize()?.click();
    await settle(element);
    const canvas = shell.canvas();
    // Escape first clears the selection, and restores only when nothing is selected.
    element.select({ kind: 'node', id: 'a' });
    await settle(element);
    canvas?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true, cancelable: true }),
    );
    await settle(element);
    expect(element.selection).toBeNull();
    expect(shell.maximized()).toBe(true);
    canvas?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true, cancelable: true }),
    );
    await settle(element);
    expect(shell.maximized()).toBe(false);
  });

  it('hides the maximize button and the resize grip when rendered as a full-page board', async () => {
    const element = await mount('tiny-diagram', tinyData);
    const shell = shellOf(element);
    expect(shell.maximize()).not.toBeNull();
    expect(shell.panel?.hasAttribute('resizable')).toBe(true);

    element.setAttribute('variant', 'board');
    await settle(element);
    expect(shell.maximize()).toBeNull();
    expect(shell.panel?.hasAttribute('resizable')).toBe(false);
  });

  it('keeps Escape from restoring while something is selected, wherever the key comes from', async () => {
    const element = await mount('tiny-diagram', tinyData);
    element.id = 'tiny';
    const shell = shellOf(element);
    shell.maximize()?.click();
    element.select({ kind: 'node', id: 'a' });
    await settle(element);
    element.renderRoot
      .querySelector<HTMLElement>('[data-node="a"]')
      ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true, cancelable: true }));
    await settle(element);
    expect(shell.maximized()).toBe(true);
  });

  it('closes an open composer when the shell is maximized', async () => {
    const element = await mount('tiny-diagram', tinyData);
    element.id = 'tiny';
    await settle(element);
    reviewComment(element, 'element:tiny/node/a');
    await settle(element);
    expect(element.renderRoot.querySelector('.comment-pop')).not.toBeNull();
    shellOf(element).maximize()?.click();
    await settle(element);
    expect(element.renderRoot.querySelector('.comment-pop')).toBeNull();
  });

  it('keeps every wheel inside a maximized diagram so the page behind never scrolls', async () => {
    const element = await mount('tiny-diagram', tinyData);
    const shell = shellOf(element);
    const wheel = (): boolean | undefined =>
      shell
        .canvas()
        ?.dispatchEvent(new WheelEvent('wheel', { deltaY: 40, cancelable: true, bubbles: true, composed: true }));
    // The tiny diagram fits vertically, so a wheel normally scrolls the page.
    expect(wheel()).toBe(true);
    shell.maximize()?.click();
    await settle(element);
    expect(wheel()).toBe(false);
  });

  describe('whole-node drag', () => {
    beforeEach(() => {
      // jsdom has no pointer capture; every browser the kit targets does.
      if (!('setPointerCapture' in HTMLElement.prototype)) {
        Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', { configurable: true, value: () => {} });
      }
    });

    const pointer = (target: HTMLElement, type: string, clientX: number, clientY: number): void => {
      target.dispatchEvent(new PointerEvent(type, { pointerId: 1, button: 0, clientX, clientY, bubbles: true }));
    };

    it('still selects on a press that never wanders past the threshold', async () => {
      const element = await mount('tiny-diagram', tinyData);
      const node = element.renderRoot.querySelector<HTMLElement>('[data-node="a"]');
      if (!node) throw new Error('missing node');
      pointer(node, 'pointerdown', 10, 10);
      pointer(node, 'pointerup', 11, 10);
      node.click();
      await element.updateComplete;
      expect(element.selection).toEqual({ kind: 'node', id: 'a' });
      expect(node.classList.contains('is-dragging')).toBe(false);
    });

    it('moves the node once the press wanders past the threshold, without selecting it', async () => {
      const element = await mount('tiny-diagram', tinyData);
      const node = element.renderRoot.querySelector<HTMLElement>('[data-node="a"]');
      if (!node) throw new Error('missing node');
      const before = node.style.left;
      pointer(node, 'pointerdown', 10, 10);
      pointer(node, 'pointermove', 60, 40);
      await element.updateComplete;
      expect(node.classList.contains('is-dragging')).toBe(true);
      pointer(node, 'pointerup', 60, 40);
      await element.updateComplete;
      expect(node.style.left).not.toBe(before);
      expect(node.classList.contains('is-dragging')).toBe(false);
      expect(element.selection).toBeNull();
    });

    it('swallows the click synthesized by a drag release, so it never re-selects', async () => {
      const element = await mount('tiny-diagram', tinyData);
      const node = element.renderRoot.querySelector<HTMLElement>('[data-node="a"]');
      if (!node) throw new Error('missing node');
      pointer(node, 'pointerdown', 10, 10);
      pointer(node, 'pointermove', 60, 40);
      pointer(node, 'pointerup', 60, 40);
      // A real browser synthesizes exactly one click here; simulate it directly.
      node.click();
      await element.updateComplete;
      expect(element.selection).toBeNull();
    });

    it('persists the dragged position across a reload of the same diagram', async () => {
      const element = await mount('tiny-diagram', tinyData);
      const node = element.renderRoot.querySelector<HTMLElement>('[data-node="a"]');
      if (!node) throw new Error('missing node');
      pointer(node, 'pointerdown', 10, 10);
      pointer(node, 'pointermove', 60, 40);
      pointer(node, 'pointerup', 60, 40);
      await element.updateComplete;
      const moved = node.style.left;

      const reloaded = await mount('tiny-diagram', tinyData);
      const reloadedNode = reloaded.renderRoot.querySelector<HTMLElement>('[data-node="a"]');
      expect(reloadedNode?.style.left).toBe(moved);
    });

    it('clears a dragged position through the public resetPositions() API, same as the context menu item', async () => {
      const element = await mount('tiny-diagram', tinyData);
      const node = element.renderRoot.querySelector<HTMLElement>('[data-node="a"]');
      if (!node) throw new Error('missing node');
      const before = node.style.left;
      pointer(node, 'pointerdown', 10, 10);
      pointer(node, 'pointermove', 60, 40);
      pointer(node, 'pointerup', 60, 40);
      await element.updateComplete;
      expect(node.style.left).not.toBe(before);

      element.resetPositions();
      await element.updateComplete;
      expect(node.style.left).toBe(before);

      // A freshly mounted instance of the same diagram id must not re-apply a stale override.
      const reloaded = await mount('tiny-diagram', tinyData);
      const reloadedNode = reloaded.renderRoot.querySelector<HTMLElement>('[data-node="a"]');
      expect(reloadedNode?.style.left).toBe(before);
    });
  });

  describe('whole-group drag', () => {
    beforeEach(() => {
      // jsdom has no pointer capture; every browser the kit targets does.
      if (!('setPointerCapture' in HTMLElement.prototype)) {
        Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', { configurable: true, value: () => {} });
      }
    });

    const pointer = (target: HTMLElement, type: string, clientX: number, clientY: number): void => {
      target.dispatchEvent(new PointerEvent(type, { pointerId: 1, button: 0, clientX, clientY, bubbles: true }));
    };

    it('moves every member of the group once the press wanders past the threshold', async () => {
      const element = await mount('tiny-diagram', tinyData);
      const group = element.renderRoot.querySelector<HTMLElement>('[data-group="x"]');
      const nodeA = element.renderRoot.querySelector<HTMLElement>('[data-node="a"]');
      const nodeC = element.renderRoot.querySelector<HTMLElement>('[data-node="c"]');
      if (!group || !nodeA || !nodeC) throw new Error('missing group or member nodes');
      const beforeA = nodeA.style.left;
      const beforeC = nodeC.style.left;
      pointer(group, 'pointerdown', 10, 10);
      pointer(group, 'pointermove', 60, 40);
      await element.updateComplete;
      expect(group.classList.contains('is-dragging')).toBe(true);
      expect(nodeA.style.left).not.toBe(beforeA);
      expect(nodeC.style.left).not.toBe(beforeC);
      pointer(group, 'pointerup', 60, 40);
      await element.updateComplete;
      expect(group.classList.contains('is-dragging')).toBe(false);
    });

    it('leaves a non-member node untouched by a group drag', async () => {
      const element = await mount('tiny-diagram', tinyData);
      const group = element.renderRoot.querySelector<HTMLElement>('[data-group="x"]');
      const nodeB = element.renderRoot.querySelector<HTMLElement>('[data-node="b"]');
      if (!group || !nodeB) throw new Error('missing group or node b');
      const beforeB = nodeB.style.left;
      pointer(group, 'pointerdown', 10, 10);
      pointer(group, 'pointermove', 60, 40);
      pointer(group, 'pointerup', 60, 40);
      await element.updateComplete;
      expect(nodeB.style.left).toBe(beforeB);
    });

    it('persists the dragged group position across a reload, same as a single-node drag', async () => {
      const element = await mount('tiny-diagram', tinyData);
      const group = element.renderRoot.querySelector<HTMLElement>('[data-group="x"]');
      const nodeA = element.renderRoot.querySelector<HTMLElement>('[data-node="a"]');
      if (!group || !nodeA) throw new Error('missing group or node a');
      pointer(group, 'pointerdown', 10, 10);
      pointer(group, 'pointermove', 60, 40);
      pointer(group, 'pointerup', 60, 40);
      await element.updateComplete;
      const moved = nodeA.style.left;

      const reloaded = await mount('tiny-diagram', tinyData);
      const reloadedNodeA = reloaded.renderRoot.querySelector<HTMLElement>('[data-node="a"]');
      expect(reloadedNodeA?.style.left).toBe(moved);
    });

    it('does not commit a press that never wanders past the threshold', async () => {
      const element = await mount('tiny-diagram', tinyData);
      const group = element.renderRoot.querySelector<HTMLElement>('[data-group="x"]');
      const nodeA = element.renderRoot.querySelector<HTMLElement>('[data-node="a"]');
      if (!group || !nodeA) throw new Error('missing group or node a');
      const before = nodeA.style.left;
      pointer(group, 'pointerdown', 10, 10);
      pointer(group, 'pointerup', 11, 10);
      await element.updateComplete;
      expect(nodeA.style.left).toBe(before);
    });
  });
});
