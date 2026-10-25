/**
 * Turns the routes the ER view actually draws into the label boxes the
 * appraisal checks. Uses `relationLabelPlans` — the same function the
 * renderer uses — so the appraisal can never score a label at a position the
 * browser does not paint.
 */

import type { ErData, ErRelation } from '../../src/boards/er-diagram/model';
import type { LayoutGeometry } from '../../src/lib/layout/metrics';
import type { AppraisalLabel } from './appraisal';

import { relationLabelPlans } from '../../src/boards/er-diagram/labels';

/**
 * Every label the view would paint for `data`'s edges, in the same world
 * coordinates as `geometry`.
 */
export const labelsOf = (
  data: ErData,
  geometry: LayoutGeometry,
  world: { readonly width: number; readonly height: number },
): readonly AppraisalLabel[] => {
  const routes = new Map(geometry.edges.map((edge) => [edge.id, edge.points] as const));
  const plans = relationLabelPlans(data.edges, routes, {
    nodes: geometry.nodes,
    frames: (geometry.frames ?? []).map((frame) => ({ box: frame.box })),
    edges: geometry.edges.map((edge) => edge.points),
    width: world.width,
    height: world.height,
  });
  const labels: AppraisalLabel[] = [];
  for (const plan of plans.values()) {
    for (const label of [plan.start, plan.end, plan.relation]) {
      if (label === null) continue;
      labels.push({
        id: label.id,
        edge: label.edge,
        end: label.end,
        kind: label.kind,
        text: label.text,
        box: label.box,
      });
    }
  }
  return labels;
};

/** The relations the view may omit, for a caller that wants to explain missing labels. */
export const relationsWithoutRoute = (
  data: ErData,
  edges: readonly { readonly id: string }[],
): readonly ErRelation[] => {
  const routed = new Set(edges.map((edge) => edge.id));
  return data.edges.filter((relation) => !routed.has(relation.id));
};
