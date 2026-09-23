import type { LayoutPoint, LayoutResult, PlacedNode } from '../../lib/layout/layered';

/**
 * Links of a hand-placed map. The shared fixed layout routes as if every card
 * sat in one row (out on the right, in on the left), so a link between stacked
 * cards loops through them. Here a link leaves and enters by the sides that face
 * each other, with one orthogonal elbow halfway across the gap.
 */

/**
 * The route between two cards, or `null` when they overlap (or are the same
 * card) and no pair of sides faces the other. Cards side by side are joined
 * horizontally even when they are also offset vertically, so flows keep reading
 * left to right.
 */
export const facingRoute = (from: PlacedNode, to: PlacedNode): readonly LayoutPoint[] | null => {
  const middleY = (node: PlacedNode): number => node.y + node.height / 2;
  const middleX = (node: PlacedNode): number => node.x + node.width / 2;
  const elbow = (start: LayoutPoint, end: LayoutPoint, horizontal: boolean): readonly LayoutPoint[] => {
    if (horizontal ? start.y === end.y : start.x === end.x) return [start, end];
    if (horizontal) {
      const channel = (start.x + end.x) / 2;
      return [start, { x: channel, y: start.y }, { x: channel, y: end.y }, end];
    }
    const channel = (start.y + end.y) / 2;
    return [start, { x: start.x, y: channel }, { x: end.x, y: channel }, end];
  };
  if (to.x >= from.x + from.width) {
    return elbow({ x: from.x + from.width, y: middleY(from) }, { x: to.x, y: middleY(to) }, true);
  }
  if (from.x >= to.x + to.width) {
    return elbow({ x: from.x, y: middleY(from) }, { x: to.x + to.width, y: middleY(to) }, true);
  }
  if (to.y >= from.y + from.height) {
    return elbow({ x: middleX(from), y: from.y + from.height }, { x: middleX(to), y: to.y }, false);
  }
  if (from.y >= to.y + to.height) {
    return elbow({ x: middleX(from), y: from.y }, { x: middleX(to), y: to.y + to.height }, false);
  }
  return null;
};

/** Replaces the layout's routes with facing-side ones wherever the cards allow. */
export const withFacingRoutes = (
  placement: LayoutResult,
  links: readonly { readonly id: string; readonly from: string; readonly to: string }[],
): LayoutResult => {
  const byId = new Map(placement.nodes.map((node) => [node.id, node]));
  const routes = placement.routes.map((route) => {
    const link = links.find((candidate) => candidate.id === route.id);
    const from = link ? byId.get(link.from) : undefined;
    const to = link ? byId.get(link.to) : undefined;
    const points = from && to && from !== to ? facingRoute(from, to) : null;
    return points === null ? route : { id: route.id, points };
  });
  return { ...placement, routes };
};
