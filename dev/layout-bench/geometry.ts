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
import { aggregateGroups, boundedContextGroups, relationRoutes } from '../../src/components/er-diagram/view';
import { layeredLayout } from '../../src/lib/layout/layered';

/**
 * `layoutMs` and `routingMs` are timed separately because they have very
 * different costs on this corpus (`layoutMs` single-digit-to-low-double-digit
 * ms even on `er-complex`; `routingMs` dominates the total — see #152's entry
 * in `dev/layout-bench/baseline.ts`) and a regression in one must not hide
 * behind an improvement in the other. Before #152, only `layeredLayout` was
 * timed here at all — `relationRoutes` ran untimed, which is why this bench's
 * own numbers (a few ms) never matched what real-browser profiling found
 * (over a second): the one pipeline step actually costing that time was
 * invisible to it. `routingMs` and `LAYOUT_BENCH_TIME_BASELINE`
 * (`dev/layout-bench.test.ts`) exist so that mismatch cannot recur silently.
 */
export type GeometryResult = {
  readonly geometry: LayoutGeometry;
  /** The placed world's own box (`layeredLayout`'s width/height), which is what the viewport fits. */
  readonly width: number;
  readonly height: number;
  readonly layoutMs: number;
  readonly routingMs: number;
};

/** Runs the real layout + routing pipeline for `data` and returns the drawn geometry, plus how long each phase took. */
export const geometryOf = (data: ErData): GeometryResult => {
  const { nodes, edges } = erLayoutSpec(data);
  const layoutStart = performance.now();
  const result = layeredLayout(nodes, edges, LAYOUT);
  const layoutMs = performance.now() - layoutStart;

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
  const routingStart = performance.now();
  const routedById = relationRoutes(data.edges, routeById, tables, LANE_MARGIN, frames);
  const routingMs = performance.now() - routingStart;
  const metricEdges = data.edges.map((relation) => ({
    id: relation.id,
    from: relation.from,
    to: relation.to,
    points: routedById.get(relation.id) ?? [],
  }));

  return {
    geometry: { nodes: tables, edges: metricEdges, frames },
    width: result.width,
    height: result.height,
    layoutMs,
    routingMs,
  };
};
