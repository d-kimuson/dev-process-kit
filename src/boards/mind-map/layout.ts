import type { LayoutPoint, LayoutResult, PlacedNode } from '../../lib/layout/layered';
import type { MindMapGraph, MindMapNode } from './model';

/**
 * Mind map layout: the central topic in the middle, main topics fanned out to
 * their side, and every subtree stacked so it never overlaps its siblings.
 *
 * Pure and deterministic, like the layered layout: the same visible map always
 * lands on the same coordinates. Each route runs from the parent's facing edge
 * to the child's facing edge, and the element draws it as a curve.
 */

export type MindMapLayoutOptions = {
  readonly padding?: number;
};

/** Horizontal gap between a parent and its children, by the parent's depth. */
const LEVEL_GAP: readonly number[] = [72, 52, 40];
/** Vertical gap between sibling subtrees, by the siblings' depth. */
const SIBLING_GAP: readonly number[] = [0, 22, 10, 8];

const levelGap = (depth: number): number => LEVEL_GAP[Math.min(depth, LEVEL_GAP.length - 1)] ?? 40;
const siblingGap = (depth: number): number => SIBLING_GAP[Math.min(depth, SIBLING_GAP.length - 1)] ?? 8;

type Box = { x: number; y: number; readonly node: MindMapNode };

export const layoutMindMap = (visible: MindMapGraph, options: MindMapLayoutOptions = {}): LayoutResult => {
  const padding = options.padding ?? 40;
  const root = visible.nodes.find((node) => node.parent === null);
  if (root === undefined) return { width: 0, height: 0, nodes: [], routes: [] };

  const byId = new Map(visible.nodes.map((node) => [node.id, node]));
  const childrenOf = (node: MindMapNode): readonly MindMapNode[] =>
    node.children.flatMap((id) => {
      const child = byId.get(id);
      return child === undefined ? [] : [child];
    });

  /** Height a subtree needs: its own box, or its stacked children, whichever is taller. */
  const spans = new Map<string, number>();
  const stackHeight = (nodes: readonly MindMapNode[]): number =>
    nodes.reduce((sum, node, index) => sum + span(node) + (index === 0 ? 0 : siblingGap(node.depth)), 0);
  const span = (node: MindMapNode): number => {
    const known = spans.get(node.id);
    if (known !== undefined) return known;
    const value = Math.max(node.height, stackHeight(childrenOf(node)));
    spans.set(node.id, value);
    return value;
  };

  const boxes: Box[] = [];

  /** Places `children` of `parent` beside it, centred on the parent's middle. */
  const placeChildren = (parent: Box, children: readonly MindMapNode[], side: 'left' | 'right'): void => {
    if (children.length === 0) return;
    const gap = levelGap(parent.node.depth);
    let top = parent.y + parent.node.height / 2 - stackHeight(children) / 2;
    for (const child of children) {
      const slot = span(child);
      const x = side === 'right' ? parent.x + parent.node.width + gap : parent.x - gap - child.width;
      const box: Box = { x, y: top + slot / 2 - child.height / 2, node: child };
      boxes.push(box);
      placeChildren(box, childrenOf(child), side);
      top += slot + siblingGap(child.depth);
    }
  };

  const rootBox: Box = { x: -root.width / 2, y: -root.height / 2, node: root };
  boxes.push(rootBox);
  const main = childrenOf(root);
  placeChildren(
    rootBox,
    main.filter((node) => node.side !== 'left'),
    'right',
  );
  placeChildren(
    rootBox,
    main.filter((node) => node.side === 'left'),
    'left',
  );

  const minX = Math.min(...boxes.map((box) => box.x));
  const minY = Math.min(...boxes.map((box) => box.y));
  const maxX = Math.max(...boxes.map((box) => box.x + box.node.width));
  const maxY = Math.max(...boxes.map((box) => box.y + box.node.height));
  const dx = padding - minX;
  const dy = padding - minY;

  const orderInLayer = new Map<number, number>();
  const nodes: PlacedNode[] = boxes.map((box) => {
    const order = orderInLayer.get(box.node.depth) ?? 0;
    orderInLayer.set(box.node.depth, order + 1);
    return {
      id: box.node.id,
      x: box.x + dx,
      y: box.y + dy,
      width: box.node.width,
      height: box.node.height,
      layer: box.node.depth,
      order,
    };
  });

  const placed = new Map(nodes.map((node) => [node.id, node]));
  const routes = visible.edges.flatMap((edge) => {
    const from = placed.get(edge.from);
    const to = placed.get(edge.to);
    const child = byId.get(edge.to);
    if (from === undefined || to === undefined || child === undefined) return [];
    const left = child.side === 'left';
    const start: LayoutPoint = { x: left ? from.x : from.x + from.width, y: from.y + from.height / 2 };
    const end: LayoutPoint = { x: left ? to.x + to.width : to.x, y: to.y + to.height / 2 };
    return [{ id: edge.id, points: [start, end] }];
  });

  return { width: maxX - minX + padding * 2, height: maxY - minY + padding * 2, nodes, routes };
};

/** A horizontal S-curve between two points, for the branch lines. */
export const branchPath = (points: readonly LayoutPoint[]): string => {
  const start = points[0];
  const end = points.at(-1);
  if (start === undefined || end === undefined) return '';
  const bend = (end.x - start.x) / 2;
  return `M${start.x} ${start.y} C${start.x + bend} ${start.y} ${end.x - bend} ${end.y} ${end.x} ${end.y}`;
};
