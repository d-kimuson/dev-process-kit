import type { Diagram, DiagramEdge, DiagramTone, EdgeLine, EdgeMarkerName, NodeShape } from './model';

import { placeEdgeLabels, type LabelBox } from '../../lib/layout/edge-labels';
import { gridPositions } from '../../lib/layout/grid';
import { layeredLayout, type LayoutPoint, type LayoutResult } from '../../lib/layout/layered';
import { jumpedPaths, LINE_JUMP_RADIUS } from '../../lib/layout/line-jumps';
import { routeAroundObstacles, type RouteSegment } from '../../lib/layout/orthogonal-router';
import { endFrame, stepsData, type EndFrame, type EndSide, type PathStep } from '../../lib/layout/path-steps';
import { staggeredEdgePorts, type PortSide } from '../../lib/layout/ports';
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

const autoLayout = (diagram: Diagram, sizes: DiagramSizes): LayoutResult => {
  const down = diagram.direction === 'down';
  const chips = [...sizes.chips.values()];
  const widest = Math.max(0, ...chips.map((chip) => chip.width));
  const tallest = Math.max(0, ...chips.map((chip) => chip.height));
  const grouped = diagram.groups.length > 0;
  const result = layeredLayout(
    diagram.nodes.map((node) => {
      const size = sizeOf(sizes.nodes, node.id);
      return {
        id: node.id,
        width: down ? size.height : size.width,
        height: down ? size.width : size.height,
        ...(node.group === null ? {} : { group: node.group }),
      };
    }),
    diagram.edges.map((edge) => ({ id: edge.id, from: edge.from, to: edge.to })),
    {
      nodeSpacing: down ? 44 : 36,
      layerSpacing: down ? Math.max(72, tallest + 52) : Math.max(84, widest + 52),
      padding: grouped ? PADDING + FRAME_INSET + FRAME_TITLE_RISE : PADDING,
      groupSpacing: grouped ? FRAME_INSET * 2 + 28 : 34,
    },
  );
  return down ? transposeLayout(result) : result;
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

/** Grid cells fix every node; each edge leaves the side facing its other end and routes around the other nodes. */
const gridLayout = (diagram: Diagram, sizes: DiagramSizes): LayoutResult => {
  const offset = PADDING + (diagram.groups.length > 0 ? FRAME_INSET + FRAME_TITLE_RISE : 0);
  const positions = gridPositions(
    diagram.nodes.map((node) => ({
      id: node.id,
      ...sizeOf(sizes.nodes, node.id),
      col: node.cell?.col ?? 0,
      row: node.cell?.row ?? 0,
    })),
    GRID_GAPS,
  );
  const boxes = new Map(
    diagram.nodes.map((node) => {
      const at = positions.get(node.id) ?? { x: 0, y: 0 };
      return [node.id, { id: node.id, x: at.x + offset, y: at.y + offset, ...sizeOf(sizes.nodes, node.id) }] as const;
    }),
  );
  const shapes = new Map(diagram.nodes.map((node) => [node.id, node.shape]));
  const ports = staggeredEdgePorts([...boxes.values()], diagram.edges);
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
    return [{ id: edge.id, points }];
  });
  const placed = [...boxes.values()];
  return {
    width: Math.max(0, ...placed.map((box) => box.x + box.width)) + offset,
    height: Math.max(0, ...placed.map((box) => box.y + box.height)) + offset,
    nodes: placed.map((box) => ({ ...box, layer: 0, order: 0 })),
    routes,
  };
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

const shiftBox = <T extends Box>(box: T, dx: number, dy: number): T => ({ ...box, x: box.x + dx, y: box.y + dy });

/**
 * Where everything in the figure goes, given the measured size of every node
 * and label chip: node boxes, group frames, each edge's path data with its end
 * glyphs, and each chip's box. The figure is cropped to its content with an
 * even padding.
 */
export const presentDiagram = (diagram: Diagram, sizes: DiagramSizes): DiagramView => {
  const layout = diagram.layout === 'grid' ? gridLayout(diagram, sizes) : autoLayout(diagram, sizes);
  const nodeBoxes = new Map(
    layout.nodes.map((node) => [
      node.id,
      { id: node.id, x: node.x, y: node.y, width: node.width, height: node.height },
    ]),
  );
  const routes = new Map(layout.routes.map((route) => [route.id, route.points] as const));
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
    { boxes: [...nodeBoxes.values()], zones, lines: routes },
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
