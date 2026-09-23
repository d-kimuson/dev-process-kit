import { html, type TemplateResult } from 'lit';
import { afterEach, describe, expect, it } from 'vitest';

import { DiagramElement } from './element';
import { reach, type DiagramEdgeInput, type DiagramNodeInput, type DiagramSelection, type Reach } from './model';
import { pathData, renderZoom } from './view';

/**
 * Minimal diagram used to exercise the shared foundation: three tagged nodes and
 * one edge, each with its contextual comment trigger.
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
        role="button"
        tabindex="0"
        @click=${() => this.select({ kind: 'edge', id: edge.id })}
      >
        <path class="d-edge-path" d=${pathData(this.routeOf(edge.id))}></path>
        ${this.renderEdgeCommentTrigger({ kind: 'edge', id: edge.id }, edge.label, this.routeOf(edge.id))}
      </g>`;
    });
    const nodes = this.visible.nodes.map((node) => {
      const placed = this.placedNode(node.id);
      const state = this.nodeState(node.id);
      return html`<button
          type="button"
          class=${this.elementClass(state, 'd-node')}
          data-node=${node.id}
          style="left:${placed?.x ?? 0}px; top:${placed?.y ?? 0}px; width:${node.width}px; height:${node.height}px"
          @click=${() => this.select({ kind: 'node', id: node.id })}
        >
          ${node.label}
        </button>
        ${this.renderCommentTrigger({ kind: 'node', id: node.id }, node.label, { x: placed?.x ?? 0, y: placed?.y ?? 0 })}`;
    });
    return html`${this.renderEdges(edges, [{ id: 'tiny-arrow', color: '#888' }])}${nodes}`;
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
  for (let index = 0; index < 3; index++) await element.updateComplete;
};

const triggerOf = (element: DiagramElement<TinyData>, kind: string, id: string): HTMLButtonElement | undefined =>
  [...element.renderRoot.querySelectorAll<HTMLButtonElement>('[data-comment-kind]')].find(
    (button) => button.dataset['commentKind'] === kind && button.dataset['commentId'] === id,
  );

const nodeIds = (element: DiagramElement<TinyData>): (string | undefined)[] =>
  [...element.renderRoot.querySelectorAll<HTMLElement>('.d-node')].map((node) => node.dataset['node']);

afterEach(() => {
  document.body.replaceChildren();
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
    expect(element.renderRoot.querySelector('.diagram-title')?.textContent).toBe('Tiny');
    expect([...element.renderRoot.querySelectorAll('.dpk-tag')].map((tag) => tag.textContent?.trim())).toEqual([
      'x2',
      'y2',
    ]);
    expect(element.renderRoot.querySelector('.diagram-stats')?.textContent).toBe('3 node · 1 edge');
    expect(nodeIds(element)).toEqual(['a', 'b', 'c']);
    expect(element.renderRoot.querySelectorAll('.d-edge')).toHaveLength(1);
    expect(element.renderRoot.querySelector('.d-edge-path')?.getAttribute('d')).toMatch(/^M\d/);
    expect(element.renderRoot.querySelector('.diagram-empty')).toBeNull();
  });

  it('filters by tag with Single, AND and OR, and clears', async () => {
    const element = await mount('tiny-diagram', tinyData);
    const tag = (name: string) => element.renderRoot.querySelector<HTMLButtonElement>(`[data-tag="${name}"]`);
    tag('x')?.click();
    await element.updateComplete;
    expect(nodeIds(element)).toEqual(['a', 'c']);
    expect(element.renderRoot.querySelectorAll('.d-edge')).toHaveLength(0);

    element.renderRoot.querySelector<HTMLButtonElement>('[data-match="all"]')?.click();
    await element.updateComplete;
    tag('y')?.click();
    await element.updateComplete;
    expect(nodeIds(element)).toEqual(['c']);

    element.renderRoot.querySelector<HTMLButtonElement>('[data-match="any"]')?.click();
    await element.updateComplete;
    expect(nodeIds(element)).toEqual(['a', 'b', 'c']);

    element.renderRoot.querySelector<HTMLButtonElement>('[data-match="single"]')?.click();
    await element.updateComplete;
    expect(element.tagFilter).toEqual({ match: 'single', active: ['y'] });
    expect(nodeIds(element)).toEqual(['b', 'c']);

    element.renderRoot.querySelector<HTMLButtonElement>('.dpk-tag-clear')?.click();
    await element.updateComplete;
    expect(nodeIds(element)).toEqual(['a', 'b', 'c']);
  });

  it('shows the empty state when a tag matches nothing', async () => {
    const element = await mount('tiny-diagram', tinyData);
    element.tagFilter = { match: 'all', active: ['x', 'nothing'] };
    await element.updateComplete;
    expect(nodeIds(element)).toEqual([]);
    expect(element.renderRoot.querySelector('.diagram-empty')?.textContent).toContain('該当する要素はありません');
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
    expect(element.renderRoot.querySelector('.diagram')?.lastElementChild?.classList.contains('diagram-canvas')).toBe(
      true,
    );
  });

  it('renders comment triggers only for a diagram with an id', async () => {
    const element = await mount('tiny-diagram', tinyData);
    expect(element.renderRoot.querySelector('.diagram-comment-trigger')).toBeNull();
    element.id = 'tiny';
    await settle(element);
    expect(triggerOf(element, 'node', 'a')?.getAttribute('aria-label')).toBe('Alphaにコメント');
    expect(triggerOf(element, 'node', 'a')?.getAttribute('aria-haspopup')).toBe('dialog');
    expect(triggerOf(element, 'edge', 'ab')?.closest('foreignObject')?.namespaceURI).toBe('http://www.w3.org/2000/svg');
  });

  it('opens the contextual composer from a trigger and submits to the enclosing template', async () => {
    const element = await mount('tiny-diagram', tinyData);
    element.id = 'tiny';
    await settle(element);
    const submitted: unknown[] = [];
    element.addEventListener('dpk-comment-submit', (event) => {
      if (!(event instanceof CustomEvent)) return;
      submitted.push(event.detail);
      event.preventDefault();
    });
    const trigger = triggerOf(element, 'edge', 'ab');
    trigger?.click();
    await settle(element);
    expect(element.selection).toEqual({ kind: 'edge', id: 'ab' });
    expect(trigger?.getAttribute('aria-expanded')).toBe('true');
    expect(element.renderRoot.querySelector('.comment-target')?.textContent).toBe('A to B');
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
    expect(element.selection).toBeNull();
  });

  it('keeps the draft on a rejected submission and closes when the selection moves', async () => {
    const element = await mount('tiny-diagram', tinyData);
    element.id = 'tiny';
    await settle(element);
    triggerOf(element, 'node', 'a')?.click();
    await settle(element);
    const area = element.renderRoot.querySelector('textarea');
    if (!area) throw new Error('missing composer');
    area.value = 'Keep me';
    area.dispatchEvent(new Event('input'));
    await settle(element);
    area.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true }));
    await settle(element);
    expect(element.renderRoot.querySelector('[role="alert"]')?.textContent).toContain('送信できませんでした');
    expect(element.renderRoot.querySelector('textarea')?.value).toBe('Keep me');
    element.select({ kind: 'node', id: 'b' });
    await settle(element);
    expect(element.renderRoot.querySelector('.comment-pop')).toBeNull();
    triggerOf(element, 'node', 'a')?.click();
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
    expect(error?.textContent).toContain('図のデータを読み込めませんでした');
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
    const label = () => element.renderRoot.querySelector('.diagram-zoom-value')?.textContent;
    expect(label()).toBe('100%');
    element.renderRoot.querySelector<HTMLButtonElement>('[aria-label="縮小"]')?.click();
    await element.updateComplete;
    expect(label()).toBe('91%');
    element.renderRoot.querySelector<HTMLButtonElement>('.diagram-zoom-value')?.click();
    await element.updateComplete;
    expect(label()).toBe('100%');
  });

  it('maximizes to the viewport from the toolbar and restores with the button or Escape', async () => {
    const element = await mount('tiny-diagram', tinyData);
    const shell = () => element.renderRoot.querySelector<HTMLElement>('.diagram');
    const toggle = () => element.renderRoot.querySelector<HTMLButtonElement>('.diagram-maximize');
    expect(toggle()?.getAttribute('aria-label')).toBe('最大化');
    expect(toggle()?.getAttribute('aria-pressed')).toBe('false');

    toggle()?.click();
    await settle(element);
    expect(shell()?.classList.contains('is-maximized')).toBe(true);
    expect(toggle()?.getAttribute('aria-label')).toBe('元のサイズに戻す');
    expect(toggle()?.getAttribute('aria-pressed')).toBe('true');
    toggle()?.click();
    await settle(element);
    expect(shell()?.classList.contains('is-maximized')).toBe(false);

    toggle()?.click();
    await settle(element);
    const canvas = element.renderRoot.querySelector<HTMLElement>('.diagram-canvas');
    // Escape first clears the selection, and restores only when nothing is selected.
    element.select({ kind: 'node', id: 'a' });
    await settle(element);
    canvas?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }));
    await settle(element);
    expect(element.selection).toBeNull();
    expect(shell()?.classList.contains('is-maximized')).toBe(true);
    canvas?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }));
    await settle(element);
    expect(shell()?.classList.contains('is-maximized')).toBe(false);
  });

  it('holds its place in the page while maximized, so the page does not reflow', async () => {
    const element = await mount('tiny-diagram', tinyData);
    const shell = element.renderRoot.querySelector<HTMLElement>('.diagram');
    if (!shell) throw new Error('missing shell');
    Object.defineProperty(shell, 'offsetHeight', { configurable: true, value: 480 });
    element.renderRoot.querySelector<HTMLButtonElement>('.diagram-maximize')?.click();
    await settle(element);
    const placeholder = element.renderRoot.querySelector<HTMLElement>('.diagram-placeholder');
    expect(placeholder?.style.height).toBe('480px');
    element.renderRoot.querySelector<HTMLButtonElement>('.diagram-maximize')?.click();
    await settle(element);
    expect(element.renderRoot.querySelector('.diagram-placeholder')).toBeNull();
  });

  it('keeps every wheel inside a maximized diagram so the page behind never scrolls', async () => {
    const element = await mount('tiny-diagram', tinyData);
    const canvas = element.renderRoot.querySelector<HTMLElement>('.diagram-canvas');
    const wheel = (): boolean | undefined =>
      canvas?.dispatchEvent(new WheelEvent('wheel', { deltaY: 40, cancelable: true, bubbles: true }));
    // The tiny diagram fits vertically, so a wheel normally scrolls the page.
    expect(wheel()).toBe(true);
    element.renderRoot.querySelector<HTMLButtonElement>('.diagram-maximize')?.click();
    await settle(element);
    expect(wheel()).toBe(false);
  });

  it('exposes the zoom control markup for components that need a custom shell', () => {
    const fragment = renderZoom();
    expect(fragment.strings.join('')).toContain('diagram-zoom');
  });
});
