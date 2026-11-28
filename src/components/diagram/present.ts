import type { Diagram, DiagramEdge, DiagramTone, EdgeLine, EdgeMarkerName, NodeShape } from './model';

import { placeEdgeLabels, type LabelBox } from '../../lib/layout/edge-labels';
import { gridPositions } from '../../lib/layout/grid';
import { layeredLayout, type LayoutPoint } from '../../lib/layout/layered';
import { jumpedPaths, LINE_JUMP_RADIUS } from '../../lib/layout/line-jumps';
import { routeAroundObstacles, type RouteSegment } from '../../lib/layout/orthogonal-router';
import { endFrame, stepsData, type EndFrame, type EndSide, type PathStep } from '../../lib/layout/path-steps';
import { facingPortSide, staggeredEdgePorts, type FanSideContext, type PortSide } from '../../lib/layout/ports';
import { transposeLayout } from '../../lib/layout/transpose';
import { END_MARKERS, markerZone, type EndMarker } from './edge/glyphs';
import { edgeSteps, type EdgeSpec } from './edge/spec';

export type Size = { readonly width: number; readonly height: number };
export type Box = LabelBox;

export type DiagramEndView = { readonly side: EndSide; readonly marker: EndMarker; readonly frame: EndFrame };

export type DiagramNodeView = Box & { readonly id: string };

export type DiagramEdgeView = {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly d: string;
  readonly ends: readonly DiagramEndView[];
  readonly line: EdgeLine;
  readonly flow: boolean;
  readonly tone: DiagramTone;
  /** The label chip's box, or null for an edge without a label. */
  readonly chip: Box | null;
};

export type DiagramFrameView = Box & { readonly id: string; readonly label: string; readonly tone: DiagramTone };

export type DiagramView = {
  readonly width: number;
  readonly height: number;
  readonly nodes: readonly DiagramNodeView[];
  readonly edges: readonly DiagramEdgeView[];
  readonly frames: readonly DiagramFrameView[];
};

export type DiagramSizes = {
  readonly nodes: ReadonlyMap<string, Size>;
  /** Measured label chips; an edge without a label has none. */
  readonly chips: ReadonlyMap<string, Size>;
};

const PADDING = 24;
const CORNER_RADIUS = 8;
const FRAME_INSET = 18;
/** How far a group's title chip rises above the frame's top border. */
const FRAME_TITLE_RISE = 12;
const GRID_GAPS = { columnGap: 88, rowGap: 64 };
const GRID_STUB = 18;
const GRID_MARGIN = 14;
const JUMP_GAP = 4;
/**
 * The layout band every node outside a group shares. Ids are trimmed and never
 * empty, so no group can take this name. Without it each loose node becomes a
 * band of its own and the figure spreads diagonally.
 */
const LOOSE_BAND = ' ';
/** The largest offset `straighten` removes between two nodes an edge joins. */
const JOG = 28;
/** The room a straightened node keeps from every other node. */
const JOG_CLEARANCE = 16;

const MARKERS: Readonly<Record<EdgeMarkerName, EndMarker | null>> = {
  none: null,
  arrow: END_MARKERS.arrow,
  'open-arrow': END_MARKERS.openArrow,
  'hollow-arrow': END_MARKERS.hollowArrow,
  circle: END_MARKERS.circle,
  diamond: END_MARKERS.diamond,
  slash: END_MARKERS.slash,
};

/** Shapes whose outline meets its box only at the middle of each side, so every end must arrive there. */
const MIDPOINT_SHAPES: ReadonlySet<NodeShape> = new Set(['circle', 'diamond', 'pill', 'cylinder']);

const specOf = (edge: DiagramEdge): EdgeSpec => ({
  line: edge.line,
  start: MARKERS[edge.start],
  end: MARKERS[edge.end],
  flow: edge.flow ? 'active' : 'none',
});

const sizeOf = (sizes: ReadonlyMap<string, Size>, id: string): Size => sizes.get(id) ?? { width: 0, height: 0 };

type NodeBox = Box & { readonly id: string };

const FRAME_GAP = 12;

const overlaps = (a: Box, b: Box, gap: number): boolean =>
  a.x < b.x + b.width + gap && b.x < a.x + a.width + gap && a.y < b.y + b.height + gap && b.y < a.y + a.height + gap;

/** Whether a group frame would touch another frame or cover a node outside its group. */
const framesClash = (diagram: Diagram, boxes: readonly NodeBox[]): boolean => {
  const frames = framesOf(diagram, new Map(boxes.map((box) => [box.id, box] as const)));
  const groupOf = new Map(diagram.nodes.map((node) => [node.id, node.group]));
  return frames.some(
    (frame, index) =>
      frames.slice(index + 1).some((other) => overlaps(frame, other, FRAME_GAP)) ||
      boxes.some((box) => groupOf.get(box.id) !== frame.id && overlaps(frame, box, 0)),
  );
};

/**
 * Pulls a node onto the line of its only predecessor when the two centres
 * differ by a little and the move keeps it clear of every other node, so a
 * straight edge does not turn twice for a jog.
 */
const straighten = (diagram: Diagram, boxes: readonly NodeBox[], down: boolean): readonly NodeBox[] => {
  const placed = new Map(boxes.map((box) => [box.id, box] as const));
  const incoming = new Map<string, number>();
  for (const edge of diagram.edges) incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + 1);
  for (const edge of diagram.edges) {
    const from = placed.get(edge.from);
    const to = placed.get(edge.to);
    if (from === undefined || to === undefined || incoming.get(edge.to) !== 1) continue;
    const offset = down
      ? from.x + from.width / 2 - (to.x + to.width / 2)
      : from.y + from.height / 2 - (to.y + to.height / 2);
    if (offset === 0 || Math.abs(offset) > JOG) continue;
    const moved = down ? { ...to, x: to.x + offset } : { ...to, y: to.y + offset };
    const blocked = [...placed.values()].some((box) => box.id !== to.id && overlaps(moved, box, JOG_CLEARANCE));
    if (!blocked) placed.set(edge.to, moved);
  }
  return [...placed.values()];
};

/**
 * Layers along `direction`; only the node boxes are kept, every edge is routed
 * afterwards. Groups are first placed like any other node; only when a frame
 * would then clash does each group get a band of its own.
 */
const autoBoxes = (diagram: Diagram, sizes: DiagramSizes): readonly NodeBox[] => {
  const down = diagram.direction === 'down';
  const chips = [...sizes.chips.values()];
  const widest = Math.max(0, ...chips.map((chip) => chip.width));
  const tallest = Math.max(0, ...chips.map((chip) => chip.height));
  const place = (banded: boolean): readonly NodeBox[] => {
    const result = layeredLayout(
      diagram.nodes.map((node) => {
        const size = sizeOf(sizes.nodes, node.id);
        return {
          id: node.id,
          width: down ? size.height : size.width,
          height: down ? size.width : size.height,
          ...(banded ? { group: node.group ?? LOOSE_BAND } : {}),
        };
      }),
      diagram.edges.map((edge) => ({ id: edge.id, from: edge.from, to: edge.to })),
      {
        nodeSpacing: down ? 44 : 36,
        layerSpacing: down ? Math.max(72, tallest + 52) : Math.max(84, widest + 52),
        padding: PADDING,
        groupSpacing: FRAME_INSET * 2 + 28,
      },
    );
    const boxes = (down ? transposeLayout(result) : result).nodes.map(({ id, x, y, width, height }) => ({
      id,
      x,
      y,
      width,
      height,
    }));
    return straighten(diagram, boxes, down);
  };
  const loose = place(false);
  return diagram.groups.length > 0 && framesClash(diagram, loose) ? place(true) : loose;
};

const sideStep = (side: PortSide): LayoutPoint =>
  side === 'left'
    ? { x: -1, y: 0 }
    : side === 'right'
      ? { x: 1, y: 0 }
      : side === 'top'
        ? { x: 0, y: -1 }
        : { x: 0, y: 1 };

const sideMiddle = (box: Box, side: PortSide): LayoutPoint =>
  side === 'left'
    ? { x: box.x, y: box.y + box.height / 2 }
    : side === 'right'
      ? { x: box.x + box.width, y: box.y + box.height / 2 }
      : side === 'top'
        ? { x: box.x + box.width / 2, y: box.y }
        : { x: box.x + box.width / 2, y: box.y + box.height };

const withoutRepeats = (points: readonly LayoutPoint[]): readonly LayoutPoint[] =>
  points.filter((point, index) => {
    const before = points[index - 1];
    return before === undefined || before.x !== point.x || before.y !== point.y;
  });

/** Grid cells fix every node. */
const gridBoxes = (diagram: Diagram, sizes: DiagramSizes): readonly NodeBox[] => {
  const positions = gridPositions(
    diagram.nodes.map((node) => ({
      id: node.id,
      ...sizeOf(sizes.nodes, node.id),
      col: node.cell?.col ?? 0,
      row: node.cell?.row ?? 0,
    })),
    GRID_GAPS,
  );
  return diagram.nodes.map((node) => {
    const at = positions.get(node.id) ?? { x: 0, y: 0 };
    return { id: node.id, ...at, ...sizeOf(sizes.nodes, node.id) };
  });
};

const facingSide = ({ node, other }: FanSideContext): PortSide => facingPortSide(node, other);

/** Whether the straight line between two nodes' centres crosses any other node. */
const corridorBlocked = (from: Box, to: Box, placed: readonly NodeBox[]): boolean => {
  const a = { x: from.x + from.width / 2, y: from.y + from.height / 2 };
  const b = { x: to.x + to.width / 2, y: to.y + to.height / 2 };
  return placed.some((box) => {
    if (box === from || box === to) return false;
    const samples = 24;
    return Array.from({ length: samples + 1 }, (_, step) => step / samples).some((t) => {
      const x = a.x + (b.x - a.x) * t;
      const y = a.y + (b.y - a.y) * t;
      return x > box.x && x < box.x + box.width && y > box.y && y < box.y + box.height;
    });
  });
};

/**
 * An edge that would cut through another node leaves and enters over the top
 * (or, laid out downwards, on the left), so it arches around the nodes between
 * instead of squeezing into the ports of its neighbours.
 */
const detourSide =
  (direction: Diagram['direction']) =>
  (context: FanSideContext, placed: readonly NodeBox[]): PortSide => {
    const ends = placed.filter((box) => box.id === context.edge.from || box.id === context.edge.to);
    const [first, second] = ends;
    if (first !== undefined && second !== undefined && corridorBlocked(first, second, placed)) {
      return direction === 'down' ? 'left' : 'top';
    }
    return facingPortSide(context.node, context.other);
  };

/**
 * Each edge leaves the side facing its other end, from its own port on that
 * side, and routes around every other node and every line already drawn, so
 * two edges never share a lane.
 */
const routeEdges = (
  diagram: Diagram,
  placed: readonly NodeBox[],
  sideOf: (context: FanSideContext, placed: readonly NodeBox[]) => PortSide,
): ReadonlyMap<string, readonly LayoutPoint[]> => {
  const boxes = new Map(placed.map((box) => [box.id, box] as const));
  const shapes = new Map(diagram.nodes.map((node) => [node.id, node.shape]));
  const ports = staggeredEdgePorts([...boxes.values()], diagram.edges, {
    sideOf: (context) => sideOf(context, placed),
  });
  const drawn: RouteSegment[] = [];
  const routes = diagram.edges.flatMap((edge) => {
    const pair = ports.get(edge.id);
    const fromBox = boxes.get(edge.from);
    const toBox = boxes.get(edge.to);
    if (pair === undefined || fromBox === undefined || toBox === undefined) return [];
    const endOf = (box: Box, id: string, port: { point: LayoutPoint; side: PortSide }) =>
      MIDPOINT_SHAPES.has(shapes.get(id) ?? 'rounded') ? sideMiddle(box, port.side) : port.point;
    const start = endOf(fromBox, edge.from, pair.from);
    const end = endOf(toBox, edge.to, pair.to);
    const out = sideStep(pair.from.side);
    const into = sideStep(pair.to.side);
    const startStub = { x: start.x + out.x * GRID_STUB, y: start.y + out.y * GRID_STUB };
    const endStub = { x: end.x + into.x * GRID_STUB, y: end.y + into.y * GRID_STUB };
    const obstacles = [...boxes.values()].filter((box) => box.id !== edge.from && box.id !== edge.to);
    const middle = routeAroundObstacles(startStub, endStub, obstacles, GRID_MARGIN, drawn);
    const points = withoutRepeats([start, ...middle, end]);
    for (let index = 1; index < points.length; index += 1) drawn.push([points[index - 1]!, points[index]!]);
    return [[edge.id, points] as const];
  });
  return new Map(routes);
};

const framesOf = (diagram: Diagram, nodes: ReadonlyMap<string, Box>): readonly DiagramFrameView[] =>
  diagram.groups.flatMap((group) => {
    const members = diagram.nodes.flatMap((node) => {
      const box = node.group === group.id ? nodes.get(node.id) : undefined;
      return box === undefined ? [] : [box];
    });
    if (members.length === 0) return [];
    const left = Math.min(...members.map((box) => box.x)) - FRAME_INSET;
    const top = Math.min(...members.map((box) => box.y)) - FRAME_INSET;
    const right = Math.max(...members.map((box) => box.x + box.width)) + FRAME_INSET;
    const bottom = Math.max(...members.map((box) => box.y + box.height)) + FRAME_INSET;
    return [
      {
        id: group.id,
        label: group.label,
        tone: group.tone,
        x: left,
        y: top,
        width: right - left,
        height: bottom - top,
      },
    ];
  });

/** Roughly where a frame's title chip sits, so no edge label lands on it. */
const titleZone = (frame: DiagramFrameView): Box => {
  const { label } = frame;
  const width = Array.from({ length: label.length }, (_, index) => (label.charCodeAt(index) > 0xff ? 12 : 8)).reduce(
    (sum, step) => sum + step,
    20,
  );
  return { x: frame.x + 14, y: frame.y - FRAME_TITLE_RISE, width: Math.min(width, frame.width - 28), height: 24 };
};

const shiftBox = <T extends Box>(box: T, dx: number, dy: number): T => ({ ...box, x: box.x + dx, y: box.y + dy });

/**
 * Where everything in the figure goes, given the measured size of every node
 * and label chip: node boxes, group frames, each edge's path data with its end
 * glyphs, and each chip's box. The figure is cropped to its content with an
 * even padding.
 */
export const presentDiagram = (diagram: Diagram, sizes: DiagramSizes): DiagramView => {
  const placed = diagram.layout === 'grid' ? gridBoxes(diagram, sizes) : autoBoxes(diagram, sizes);
  const nodeBoxes = new Map(placed.map((box) => [box.id, box] as const));
  const routes = routeEdges(diagram, placed, diagram.layout === 'grid' ? facingSide : detourSide(diagram.direction));
  const frames = framesOf(diagram, nodeBoxes);

  const zones = diagram.edges.flatMap((edge) => {
    const points = routes.get(edge.id);
    if (points === undefined || points.length < 2) return [];
    const spec = specOf(edge);
    return [
      ...(spec.start === null ? [] : [markerZone(spec.start, endFrame(points, 'start'))]),
      ...(spec.end === null ? [] : [markerZone(spec.end, endFrame(points, 'end'))]),
    ];
  });
  const placements = placeEdgeLabels(
    diagram.edges.flatMap((edge) => {
      const size = sizes.chips.get(edge.id);
      const points = routes.get(edge.id);
      return size === undefined || points === undefined ? [] : [{ id: edge.id, points, size }];
    }),
    { boxes: [...nodeBoxes.values()], zones: [...zones, ...frames.map(titleZone)], lines: routes },
  );
  const chips = new Map(
    [...placements].map(([id, placement]) => {
      const size = sizeOf(sizes.chips, id);
      const chip = {
        x: placement.center.x - size.width / 2,
        y: placement.center.y - size.height / 2,
        width: size.width,
        height: size.height,
      };
      return [id, chip] as const;
    }),
  );

  const extents: Box[] = [
    ...nodeBoxes.values(),
    ...chips.values(),
    ...frames.map((frame) => ({ ...frame, y: frame.y - FRAME_TITLE_RISE, height: frame.height + FRAME_TITLE_RISE })),
    ...[...routes.values()].flat().map((point) => ({ x: point.x, y: point.y, width: 0, height: 0 })),
  ];
  const left = Math.min(...extents.map((box) => box.x));
  const top = Math.min(...extents.map((box) => box.y));
  const right = Math.max(...extents.map((box) => box.x + box.width));
  const bottom = Math.max(...extents.map((box) => box.y + box.height));
  const dx = PADDING - left;
  const dy = PADDING - top;

  const shiftedRoutes = new Map(
    [...routes].map(([id, points]) => [id, points.map((point) => ({ x: point.x + dx, y: point.y + dy }))] as const),
  );
  const steps = new Map<string, readonly PathStep[]>();
  for (const edge of diagram.edges) {
    const points = shiftedRoutes.get(edge.id);
    if (points !== undefined) steps.set(edge.id, edgeSteps(points, specOf(edge), { radius: CORNER_RADIUS }));
  }
  const reachOf = (name: EdgeMarkerName): number => (MARKERS[name]?.reach ?? 0) + JUMP_GAP;
  const reaches = new Map(
    diagram.edges.map((edge) => [edge.id, { start: reachOf(edge.start), end: reachOf(edge.end) }]),
  );
  const paths =
    diagram.crossings === 'jump'
      ? jumpedPaths(steps, new Set(steps.keys()), {
          clearance: (id) => reaches.get(id) ?? { start: JUMP_GAP, end: JUMP_GAP },
          radius: LINE_JUMP_RADIUS,
        })
      : new Map([...steps].map(([id, list]) => [id, stepsData(list)] as const));

  const edges = diagram.edges.flatMap((edge): DiagramEdgeView[] => {
    const points = shiftedRoutes.get(edge.id);
    const d = paths.get(edge.id);
    if (points === undefined || d === undefined) return [];
    const spec = specOf(edge);
    const ends: DiagramEndView[] = [
      ...(spec.start === null
        ? []
        : [{ side: 'start' as const, marker: spec.start, frame: endFrame(points, 'start') }]),
      ...(spec.end === null ? [] : [{ side: 'end' as const, marker: spec.end, frame: endFrame(points, 'end') }]),
    ];
    const chip = chips.get(edge.id);
    return [
      {
        id: edge.id,
        from: edge.from,
        to: edge.to,
        d,
        ends,
        line: edge.line,
        flow: edge.flow,
        tone: edge.tone,
        chip: chip === undefined ? null : shiftBox(chip, dx, dy),
      },
    ];
  });

  return {
    width: Math.ceil(right - left + PADDING * 2),
    height: Math.ceil(bottom - top + PADDING * 2),
    nodes: [...nodeBoxes.values()].map((box) => shiftBox(box, dx, dy)),
    edges,
    frames: frames.map((frame) => shiftBox(frame, dx, dy)),
  };
};
