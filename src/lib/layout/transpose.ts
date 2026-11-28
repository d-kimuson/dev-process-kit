import type { LayoutResult } from './layered';

/**
 * A layout mirrored across its diagonal: x and y, width and height swap. Laying
 * out with swapped sizes and transposing the result turns the left-to-right
 * layered layout into a top-to-bottom one.
 */
export const transposeLayout = (layout: LayoutResult): LayoutResult => ({
  width: layout.height,
  height: layout.width,
  nodes: layout.nodes.map((node) => ({ ...node, x: node.y, y: node.x, width: node.height, height: node.width })),
  routes: layout.routes.map((route) => ({
    ...route,
    points: route.points.map((point) => ({ x: point.y, y: point.x })),
  })),
});
