import type { LayoutPoint } from '../../lib/layout/layered';
import type { ErRelation } from './model';

import { endDirection } from './notation';

/**
 * End-cardinality and relation-name placement, shared by the renderer and the
 * offline appraisal so the two can never measure different boxes.
 *
 * The old placement put the text on the line itself and lifted it by a fixed
 * ±7px. That happens to work for a horizontal line and does nothing for a
 * vertical one: the label sits directly on the stroke, and the start label —
 * the harder end to read — ends up no further away than the end label. This
 * module places both beside the stroke instead: beyond the crow's-foot along
 * the line, then a clear distance to one side, choosing among a handful of
 * deterministic candidates by what they would overlap.
 */

export type LabelBox = { readonly x: number; readonly y: number; readonly width: number; readonly height: number };

export type LabelPlan = {
  readonly id: string;
  readonly edge: string;
  readonly end: 'start' | 'end' | 'relation';
  readonly kind: 'cardinality' | 'relation';
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly anchor: 'start' | 'middle' | 'end';
  readonly box: LabelBox;
};

export type RelationLabelPlan = {
  readonly start: LabelPlan;
  readonly end: LabelPlan;
  readonly relation: LabelPlan | null;
};

export type LabelWorld = {
  readonly nodes: readonly { readonly id: string; readonly box: LabelBox }[];
  readonly frames: readonly { readonly box: LabelBox }[];
  readonly edges?: readonly (readonly LayoutPoint[])[];
  readonly width: number;
  readonly height: number;
};

const LABEL_HEIGHT = 10;
/** A full-width CJK glyph is about one em at the 10px label size; Latin/monospace a little over half. */
const estimatedWidth = (text: string): number => {
  let width = 0;
  for (const char of text) width += (char.codePointAt(0) ?? 0) >= 0x2e80 ? 10 : 6.2;
  return Math.ceil(width + 2);
};

/** The text that has to fit, including a changed value's struck-through previous one. */
const widthText = (current: string, previous: string | null | undefined): string =>
  previous !== undefined && previous !== null && previous !== current ? `${previous} ${current}` : current;

const boxesOverlap = (a: LabelBox, b: LabelBox): boolean =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

const segmentInBox = (a: LayoutPoint, b: LayoutPoint, box: LabelBox): number => {
  if (a.x === b.x) {
    if (a.x <= box.x || a.x >= box.x + box.width) return 0;
    return Math.max(0, Math.min(Math.max(a.y, b.y), box.y + box.height) - Math.max(Math.min(a.y, b.y), box.y));
  }
  if (a.y <= box.y || a.y >= box.y + box.height) return 0;
  return Math.max(0, Math.min(Math.max(a.x, b.x), box.x + box.width) - Math.max(Math.min(a.x, b.x), box.x));
};

const borderSegments = (box: LabelBox): readonly (readonly [LayoutPoint, LayoutPoint])[] => [
  [
    { x: box.x, y: box.y },
    { x: box.x + box.width, y: box.y },
  ],
  [
    { x: box.x, y: box.y + box.height },
    { x: box.x + box.width, y: box.y + box.height },
  ],
  [
    { x: box.x, y: box.y },
    { x: box.x, y: box.y + box.height },
  ],
  [
    { x: box.x + box.width, y: box.y },
    { x: box.x + box.width, y: box.y + box.height },
  ],
];

type Candidate = {
  readonly x: number;
  readonly y: number;
  readonly anchor: 'start' | 'middle' | 'end';
  readonly box: LabelBox;
  readonly along: number;
  readonly across: number;
};

const candidatesFor = (
  points: readonly LayoutPoint[],
  end: 'start' | 'end' | 'relation',
  text: string,
  extended: boolean,
): readonly Candidate[] => {
  const side = end === 'relation' ? 'end' : end;
  const tip = side === 'start' ? points[0] : points.at(-1);
  if (tip === undefined) return [];
  const u = endDirection(points, side);
  const normal = { x: -u.y, y: u.x };
  const horizontal = Math.abs(u.x) >= Math.abs(u.y);
  const width = estimatedWidth(text);
  // Measured from the port, not from the glyph's far corner: a short port
  // stub used to push the text past the next corner, where it read as a label
  // for a different line. The start label sits farther out than the end label
  // by construction, not merely by a tie-break penalty.
  const alongs = end === 'start' ? [14, 20, 26] : end === 'end' ? [4, 8, 12] : [14, 20, 26];
  const acrosses = [16, -16, 24, -24];
  if (extended) {
    alongs.push(...alongs.map((value) => value + 36));
    acrosses.push(32, -32);
  }
  const out: Candidate[] = [];
  for (const along of alongs) {
    for (const across of acrosses) {
      const x = tip.x + u.x * along + normal.x * across;
      const y = tip.y + u.y * along + normal.y * across;
      let anchor: Candidate['anchor'];
      let box: LabelBox;
      if (horizontal) {
        // Extend along the line's own direction, away from the card, instead
        // of centring the text back over the card edge it just left.
        const right = u.x > 0;
        anchor = right ? 'start' : 'end';
        box = { x: right ? x : x - width, y: y - LABEL_HEIGHT / 2, width, height: LABEL_HEIGHT };
      } else {
        const right = normal.x * across > 0;
        anchor = right ? 'start' : 'end';
        box = { x: right ? x : x - width, y: y - LABEL_HEIGHT / 2, width, height: LABEL_HEIGHT };
      }
      out.push({ x, y, anchor, box, along, across });
    }
  }
  return out;
};

const scoreCandidate = (candidate: Candidate, world: LabelWorld, occupied: readonly LabelBox[]): number => {
  const { box } = candidate;
  let score = 0;
  if (box.x < 0 || box.y < 0 || box.x + box.width > world.width || box.y + box.height > world.height) score += 1e7;
  for (const node of world.nodes) if (boxesOverlap(box, node.box)) score += 1e6;
  for (const frame of world.frames) {
    for (const [a, b] of borderSegments(frame.box)) {
      if (segmentInBox(a, b, box) > 0) {
        score += 1e5;
        break;
      }
    }
  }
  for (const other of occupied) if (boxesOverlap(box, other)) score += 1e5;
  for (const points of world.edges ?? []) {
    for (let index = 1; index < points.length; index++) {
      if (segmentInBox(points[index - 1]!, points[index]!, box) > 0.5) {
        score += 1e4;
        break;
      }
    }
  }
  // The start label is structurally farther along the line than the end
  // label (its along candidates start above the end's maximum), and both sit
  // a full glyph-width to the side, so neither covers its own crow's-foot.
  if (Math.abs(candidate.across) < 14) score += 1000;
  score += candidate.along * 0.1 + Math.abs(candidate.across) * 0.5;
  return score;
};

const place = (
  relation: ErRelation,
  end: 'start' | 'end' | 'relation',
  points: readonly LayoutPoint[],
  text: string,
  widthOf: string,
  world: LabelWorld,
  occupied: readonly LabelBox[],
): LabelPlan => {
  let best = candidatesFor(points, end, widthOf, false)[0]!;
  let bestScore = Number.POSITIVE_INFINITY;
  const consider = (candidates: readonly Candidate[]): void => {
    for (const candidate of candidates) {
      const score = scoreCandidate(candidate, world, occupied);
      if (score < bestScore) {
        best = candidate;
        bestScore = score;
      }
    }
  };
  consider(candidatesFor(points, end, widthOf, false));
  // A free spot is the common case. Only a label whose default candidates all
  // hit something pays for the wider search.
  if (bestScore >= 1e4) consider(candidatesFor(points, end, widthOf, true));
  return {
    id: `${relation.id}:${end}`,
    edge: relation.id,
    end,
    kind: end === 'relation' ? 'relation' : 'cardinality',
    text,
    x: best.x,
    y: best.y,
    anchor: best.anchor,
    box: best.box,
  };
};

/**
 * Every visible relation's labels, in one deterministic pass. Relations are
 * processed by id and each relation's start/end/name in that order, so a
 * later label can avoid every earlier one but the result never depends on
 * input order or iteration order.
 */
export const relationLabelPlans = (
  relations: readonly ErRelation[],
  routes: ReadonlyMap<string, readonly LayoutPoint[]>,
  world: LabelWorld,
): ReadonlyMap<string, RelationLabelPlan> => {
  const occupied: LabelBox[] = [];
  const plans = new Map<string, RelationLabelPlan>();
  for (const relation of [...relations].sort((a, b) => a.id.localeCompare(b.id))) {
    const points = routes.get(relation.id);
    if (points === undefined || points.length < 2) continue;
    const startText = relation.cardinality.parent;
    const endText = relation.cardinality.child;
    const start = place(
      relation,
      'start',
      points,
      startText,
      widthText(startText, relation.before?.cardinality.parent),
      world,
      occupied,
    );
    occupied.push(start.box);
    const end = place(
      relation,
      'end',
      points,
      endText,
      widthText(endText, relation.before?.cardinality.child),
      world,
      occupied,
    );
    occupied.push(end.box);
    const relationLabel =
      relation.label === null
        ? null
        : place(
            relation,
            'relation',
            points,
            relation.label,
            widthText(relation.label, relation.before?.label),
            world,
            occupied,
          );
    if (relationLabel !== null) occupied.push(relationLabel.box);
    plans.set(relation.id, { start, end, relation: relationLabel });
  }
  return plans;
};
