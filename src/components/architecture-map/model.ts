import * as v from 'valibot';

import type { DiagramEdgeInput, DiagramNodeInput } from '../diagram/model';

/**
 * Domain model of the architecture map: services placed by hand, grouped into
 * boundaries whose rectangles are derived from the members.
 *
 * Artwork is author-supplied (`src` + `alt` + optional licence note) so no icon
 * set is shipped in the bundle: the vendor terms stay the author's to honour.
 */

export const SERVICE_SIZE = { width: 220, height: 112 } as const;
const BOUNDARY_PADDING = 26;

const artworkSchema = v.strictObject({
  src: v.pipe(v.string(), v.minLength(1)),
  alt: v.pipe(v.string(), v.minLength(1)),
  license: v.optional(v.string()),
});

const serviceSchema = v.strictObject({
  id: v.pipe(v.string(), v.minLength(1)),
  name: v.pipe(v.string(), v.minLength(1)),
  description: v.optional(v.string()),
  boundary: v.optional(v.string()),
  /** Fallback glyph when there is no artwork, e.g. `DB`. */
  symbol: v.optional(v.string()),
  tags: v.optional(v.array(v.string()), []),
  artwork: v.optional(artworkSchema),
  position: v.strictObject({ x: v.number(), y: v.number() }),
  questions: v.optional(v.string()),
});

const boundarySchema = v.strictObject({
  id: v.pipe(v.string(), v.minLength(1)),
  label: v.pipe(v.string(), v.minLength(1)),
  kind: v.optional(v.picklist(['internal', 'external']), 'internal'),
});

const linkSchema = v.strictObject({
  id: v.pipe(v.string(), v.minLength(1)),
  from: v.pipe(v.string(), v.minLength(1)),
  to: v.pipe(v.string(), v.minLength(1)),
  label: v.optional(v.string()),
});

const diagramSchema = v.strictObject({
  boundaries: v.optional(v.array(boundarySchema), []),
  services: v.array(serviceSchema),
  links: v.optional(v.array(linkSchema), []),
});

export type BoundaryKind = 'internal' | 'external';

export type ArchitectureBoundary = {
  readonly id: string;
  readonly label: string;
  readonly kind: BoundaryKind;
};

export type ServiceArtwork = {
  readonly src: string;
  readonly alt: string;
  readonly license: string | null;
};

export type ArchitectureService = DiagramNodeInput & {
  readonly name: string;
  readonly description: string | null;
  readonly boundary: string | null;
  readonly symbol: string | null;
  readonly artwork: ServiceArtwork | null;
};

export type ArchitectureLink = DiagramEdgeInput & {
  readonly label: string | null;
};

export type ArchitectureData = {
  readonly nodes: readonly ArchitectureService[];
  readonly edges: readonly ArchitectureLink[];
  readonly boundaries: readonly ArchitectureBoundary[];
};

export type BoundaryBox = {
  readonly boundary: ArchitectureBoundary;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

export const emptyArchitectureData = (): ArchitectureData => ({ nodes: [], edges: [], boundaries: [] });

export const parseArchitectureData = (input: unknown): ArchitectureData => {
  const parsed = v.parse(diagramSchema, input);
  const boundaryIds = new Set<string>();
  for (const boundary of parsed.boundaries) {
    if (boundaryIds.has(boundary.id)) throw new Error(`duplicate boundary id: ${boundary.id}`);
    boundaryIds.add(boundary.id);
  }
  const ids = new Set<string>();
  const nodes = parsed.services.map((service) => {
    if (ids.has(service.id)) throw new Error(`duplicate service id: ${service.id}`);
    ids.add(service.id);
    if (service.boundary !== undefined && !boundaryIds.has(service.boundary)) {
      throw new Error(`unknown boundary: ${service.boundary}`);
    }
    return {
      id: service.id,
      name: service.name,
      description: service.description ?? null,
      boundary: service.boundary ?? null,
      symbol: service.symbol ?? null,
      artwork: service.artwork
        ? { src: service.artwork.src, alt: service.artwork.alt, license: service.artwork.license ?? null }
        : null,
      tags: service.tags,
      width: SERVICE_SIZE.width,
      height: SERVICE_SIZE.height,
      position: service.position,
      ...(service.questions === undefined ? {} : { questions: service.questions }),
    } satisfies ArchitectureService;
  });
  const edgeIds = new Set<string>();
  const edges = parsed.links.map((link) => {
    if (edgeIds.has(link.id)) throw new Error(`duplicate link id: ${link.id}`);
    edgeIds.add(link.id);
    if (!ids.has(link.from)) throw new Error(`unknown link source: ${link.from}`);
    if (!ids.has(link.to)) throw new Error(`unknown link target: ${link.to}`);
    return {
      id: link.id,
      from: link.from,
      to: link.to,
      label: link.label ?? null,
      tags: [],
    } satisfies ArchitectureLink;
  });
  return {
    nodes,
    edges,
    boundaries: parsed.boundaries.map((boundary) => ({
      id: boundary.id,
      label: boundary.label,
      kind: boundary.kind,
    })),
  };
};

type Bounds = { readonly left: number; readonly top: number; readonly right: number; readonly bottom: number };
type Padding = { readonly left: number; readonly top: number; readonly right: number; readonly bottom: number };

/** Label room on top, even padding elsewhere. */
const FULL_PADDING: Padding = {
  left: BOUNDARY_PADDING,
  top: BOUNDARY_PADDING * 1.6,
  right: BOUNDARY_PADDING,
  bottom: BOUNDARY_PADDING,
};
const NO_PADDING: Padding = { left: 0, top: 0, right: 0, bottom: 0 };
/** Space always left between a rectangle and whatever is next to it. */
const BOUNDARY_GUTTER = 12;

const boundsOf = (services: readonly ArchitectureService[]): Bounds => ({
  left: Math.min(...services.map((service) => service.position?.x ?? 0)),
  top: Math.min(...services.map((service) => service.position?.y ?? 0)),
  right: Math.max(...services.map((service) => (service.position?.x ?? 0) + service.width)),
  bottom: Math.max(...services.map((service) => (service.position?.y ?? 0) + service.height)),
});

/**
 * The padding `own` may keep on each side without reaching `other`, which keeps
 * its own padding (`theirs`). Where the padded rectangles would meet, the free
 * gap is shared in proportion to what each side asked for, across the axis with
 * the wider gap. Bounds that already interleave cannot be separated and are left
 * alone.
 */
const paddingBeside = (own: Bounds, mine: Padding, other: Bounds, theirs: Padding): Padding => {
  const meetsX = own.left - mine.left < other.right + theirs.right && other.left - theirs.left < own.right + mine.right;
  const meetsY = own.top - mine.top < other.bottom + theirs.bottom && other.top - theirs.top < own.bottom + mine.bottom;
  if (!meetsX || !meetsY) return mine;
  const gapX = Math.max(other.left - own.right, own.left - other.right);
  const gapY = Math.max(other.top - own.bottom, own.top - other.bottom);
  if (gapX < 0 && gapY < 0) return mine;
  const share = (asked: number, opposite: number, gap: number): number =>
    asked === 0 ? 0 : (Math.max(0, gap - BOUNDARY_GUTTER) * asked) / (asked + opposite);
  if (gapX >= gapY) {
    return other.left >= own.right
      ? { ...mine, right: Math.min(mine.right, share(mine.right, theirs.left, gapX)) }
      : { ...mine, left: Math.min(mine.left, share(mine.left, theirs.right, gapX)) };
  }
  return other.top >= own.bottom
    ? { ...mine, bottom: Math.min(mine.bottom, share(mine.bottom, theirs.top, gapY)) }
    : { ...mine, top: Math.min(mine.top, share(mine.top, theirs.bottom, gapY)) };
};

/**
 * The rectangle around a boundary's services, padded for its label. Positions are
 * hand-placed, so the padding gives way wherever it would run into another
 * boundary's rectangle or a service outside the boundary.
 */
export const boundaryBoxes = (
  services: readonly ArchitectureService[],
  boundaries: readonly ArchitectureBoundary[],
): readonly BoundaryBox[] => {
  const groups = boundaries.flatMap((boundary) => {
    const members = services.filter((service) => service.boundary === boundary.id);
    return members.length === 0 ? [] : [{ boundary, bounds: boundsOf(members) }];
  });
  // Every constraint is decided from the full paddings, so each pair splits its
  // gap the same way from both sides and the result does not depend on order.
  const obstacles = [
    ...groups.map((group) => ({ id: group.boundary.id, bounds: group.bounds, padding: FULL_PADDING })),
    ...services
      .filter((service) => service.boundary === null || !groups.some((group) => group.boundary.id === service.boundary))
      .map((service) => ({ id: null, bounds: boundsOf([service]), padding: NO_PADDING })),
  ];
  return groups.map(({ boundary, bounds }) => {
    const padding = obstacles
      .filter((obstacle) => obstacle.id !== boundary.id)
      .map((obstacle) => paddingBeside(bounds, FULL_PADDING, obstacle.bounds, obstacle.padding))
      .reduce(
        (kept, next) => ({
          left: Math.min(kept.left, next.left),
          top: Math.min(kept.top, next.top),
          right: Math.min(kept.right, next.right),
          bottom: Math.min(kept.bottom, next.bottom),
        }),
        FULL_PADDING,
      );
    const x = bounds.left - padding.left;
    const y = bounds.top - padding.top;
    return {
      boundary,
      x,
      y,
      width: bounds.right + padding.right - x,
      height: bounds.bottom + padding.bottom - y,
    };
  });
};
