import type { LayoutGeometry } from '../../src/lib/layout/metrics';

/**
 * `ErData` -> the geometry `scoreLayout` needs, built from the exact same
 * pipeline `dpk-er-diagram` runs: `erLayoutSpec` -> `layeredLayout` (same
 * `LAYOUT` tuning as the live element) -> `relationRoute` for every edge's
 * actual drawn polyline, plus `aggregateGroups`/`boundedContextGroups` for the
 * frame boxes. Nothing here is a simplified stand-in; this is the one place
 * the bench and the live element could drift, so it imports the element's own
 * constants and the view's own routing/grouping functions rather than
 * reimplementing them.
 */
import { LANE_MARGIN, LAYOUT } from '../../src/components/er-diagram/element';
import { erLayoutSpec, type ErData } from '../../src/components/er-diagram/model';
import { aggregateGroups, boundedContextGroups, relationRoute } from '../../src/components/er-diagram/view';
import { layeredLayout } from '../../src/lib/layout/layered';

export type GeometryResult = { readonly geometry: LayoutGeometry; readonly layoutMs: number };

/** Runs the real layout + routing pipeline for `data` and returns the drawn geometry, plus how long layout took. */
export const geometryOf = (data: ErData): GeometryResult => {
  const { nodes, edges } = erLayoutSpec(data);
  const start = performance.now();
  const result = layeredLayout(nodes, edges, LAYOUT);
  const layoutMs = performance.now() - start;

  const placedById = new Map(result.nodes.map((node) => [node.id, node]));
  const tables = data.nodes.flatMap((table) => {
    const placed = placedById.get(table.id);
    return placed === undefined ? [] : [{ id: table.id, box: placed }];
  });

  const groupable = data.nodes.map((table) => ({
    id: table.id,
    aggregate: table.aggregate,
    boundedContext: table.boundedContext,
    box: placedById.get(table.id) ?? null,
  }));
  const aggregateFrames = aggregateGroups(groupable).map((group) => ({
    id: `aggregate:${group.aggregate}`,
    box: group.box,
    members: group.tables,
  }));
  const bcFrames = boundedContextGroups(groupable).map((group) => ({
    id: `bc:${group.boundedContext}`,
    box: group.box,
    members: group.tables,
  }));
  const frames = [...aggregateFrames, ...bcFrames];

  const routeById = new Map(result.routes.map((route) => [route.id, route.points]));
  const metricEdges = data.edges.map((relation) => {
    const points = routeById.get(relation.id) ?? [];
    return {
      id: relation.id,
      from: relation.from,
      to: relation.to,
      points: relationRoute(relation, points, tables, LANE_MARGIN, frames),
    };
  });

  return {
    geometry: { nodes: tables, edges: metricEdges, frames },
    layoutMs,
  };
};
