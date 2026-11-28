import * as v from 'valibot';

export const DIAGRAM_LAYOUTS = ['auto', 'grid'] as const;
export const DIAGRAM_DIRECTIONS = ['right', 'down'] as const;
export const DIAGRAM_CROSSINGS = ['jump', 'plain'] as const;
export const NODE_SHAPES = ['rounded', 'box', 'pill', 'circle', 'diamond', 'cylinder'] as const;
export const DIAGRAM_TONES = ['neutral', 'accent', 'blue', 'green', 'amber', 'violet', 'danger'] as const;
export const EDGE_LINES = ['solid', 'dashed', 'dotted'] as const;
export const EDGE_MARKERS = ['none', 'arrow', 'open-arrow', 'hollow-arrow', 'circle', 'diamond', 'slash'] as const;

export type DiagramLayout = (typeof DIAGRAM_LAYOUTS)[number];
export type DiagramDirection = (typeof DIAGRAM_DIRECTIONS)[number];
export type DiagramCrossings = (typeof DIAGRAM_CROSSINGS)[number];
export type NodeShape = (typeof NODE_SHAPES)[number];
export type DiagramTone = (typeof DIAGRAM_TONES)[number];
export type EdgeLine = (typeof EDGE_LINES)[number];
export type EdgeMarkerName = (typeof EDGE_MARKERS)[number];

export type DiagramNode = {
  readonly id: string;
  readonly label: string;
  readonly shape: NodeShape;
  readonly tone: DiagramTone;
  readonly cell: { readonly col: number; readonly row: number } | null;
  readonly group: string | null;
};

export type DiagramEdge = {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly label: string;
  readonly line: EdgeLine;
  readonly start: EdgeMarkerName;
  readonly end: EdgeMarkerName;
  readonly flow: boolean;
  readonly tone: DiagramTone;
};

export type DiagramGroup = { readonly id: string; readonly label: string; readonly tone: DiagramTone };

export type Diagram = {
  readonly layout: DiagramLayout;
  readonly direction: DiagramDirection;
  readonly crossings: DiagramCrossings;
  readonly nodes: readonly DiagramNode[];
  readonly edges: readonly DiagramEdge[];
  readonly groups: readonly DiagramGroup[];
};

export type DiagramKind = 'node' | 'edge' | 'group';

/** What the container read from its children, before any check. Attribute values are raw strings. */
export type RawAttributes = Readonly<Record<string, string | null>>;
export type RawDiagram = {
  readonly attributes: RawAttributes;
  readonly nodes: readonly {
    readonly attributes: RawAttributes;
    readonly label: string;
    readonly group: string | null;
  }[];
  readonly edges: readonly { readonly attributes: RawAttributes; readonly label: string }[];
  readonly groups: readonly { readonly attributes: RawAttributes }[];
  /** Ids (or tag names, for an element without one) of groups placed inside another group. */
  readonly nestedGroups: readonly string[];
};

export type DiagramError =
  | { readonly code: 'missing-id'; readonly kind: DiagramKind }
  | { readonly code: 'duplicate-id'; readonly id: string }
  | { readonly code: 'unknown-end'; readonly id: string; readonly end: string }
  | { readonly code: 'bad-value'; readonly id: string; readonly attribute: string; readonly value: string }
  | { readonly code: 'missing-cell'; readonly id: string }
  | { readonly code: 'nested-group'; readonly id: string };

export type DiagramResult =
  | { readonly ok: true; readonly diagram: Diagram }
  | { readonly ok: false; readonly errors: readonly DiagramError[] };

const absent = (value: string | null | undefined): value is null | undefined => value === null || value === undefined;

const cellNumber = v.pipe(v.string(), v.regex(/^\d+$/), v.transform(Number));

/** Reads one enum attribute: absent means the default, anything outside the list is an error. */
const pick = <const T extends readonly [string, ...string[]]>(
  options: T,
  fallback: T[number],
  owner: string,
  attribute: string,
  attributes: RawAttributes,
  errors: DiagramError[],
): T[number] => {
  const value = attributes[attribute];
  if (absent(value)) return fallback;
  const parsed = v.safeParse(v.picklist(options), value.trim());
  if (parsed.success) return parsed.output;
  errors.push({ code: 'bad-value', id: owner, attribute, value });
  return fallback;
};

const cellOf = (
  owner: string,
  attributes: RawAttributes,
  errors: DiagramError[],
): { readonly col: number; readonly row: number } | null => {
  const col = attributes['col'];
  const row = attributes['row'];
  if (absent(col) || absent(row)) return null;
  const parsedCol = v.safeParse(cellNumber, col.trim());
  const parsedRow = v.safeParse(cellNumber, row.trim());
  if (!parsedCol.success) errors.push({ code: 'bad-value', id: owner, attribute: 'col', value: col });
  if (!parsedRow.success) errors.push({ code: 'bad-value', id: owner, attribute: 'row', value: row });
  return parsedCol.success && parsedRow.success ? { col: parsedCol.output, row: parsedRow.output } : null;
};

const idOf = (attributes: RawAttributes): string => (attributes['id'] ?? '').trim();

/** Checks everything the children declared and returns either the whole diagram or every problem found. */
export const parseDiagram = (raw: RawDiagram): DiagramResult => {
  const errors: DiagramError[] = [];
  const diagramId = idOf(raw.attributes) || 'diagram';
  const layout = pick(DIAGRAM_LAYOUTS, 'auto', diagramId, 'layout', raw.attributes, errors);
  const direction = pick(DIAGRAM_DIRECTIONS, 'right', diagramId, 'direction', raw.attributes, errors);
  const crossings = pick(DIAGRAM_CROSSINGS, 'jump', diagramId, 'crossings', raw.attributes, errors);

  const seen = new Set<string>();
  const claim = (id: string, kind: DiagramKind): boolean => {
    if (id === '') {
      errors.push({ code: 'missing-id', kind });
      return false;
    }
    if (seen.has(id)) {
      errors.push({ code: 'duplicate-id', id });
      return false;
    }
    seen.add(id);
    return true;
  };

  for (const id of raw.nestedGroups) errors.push({ code: 'nested-group', id });

  const groups = raw.groups.flatMap(({ attributes }): DiagramGroup[] => {
    const id = idOf(attributes);
    if (!claim(id, 'group')) return [];
    return [
      {
        id,
        label: (attributes['label'] ?? '').trim(),
        tone: pick(DIAGRAM_TONES, 'neutral', id, 'tone', attributes, errors),
      },
    ];
  });

  const nodes = raw.nodes.flatMap(({ attributes, label, group }): DiagramNode[] => {
    const id = idOf(attributes);
    if (!claim(id, 'node')) return [];
    const cell = cellOf(id, attributes, errors);
    if (layout === 'grid' && cell === null && (absent(attributes['col']) || absent(attributes['row']))) {
      errors.push({ code: 'missing-cell', id });
    }
    return [
      {
        id,
        label: label.trim(),
        shape: pick(NODE_SHAPES, 'rounded', id, 'shape', attributes, errors),
        tone: pick(DIAGRAM_TONES, 'neutral', id, 'tone', attributes, errors),
        cell,
        group,
      },
    ];
  });

  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = raw.edges.flatMap(({ attributes, label }): DiagramEdge[] => {
    const id = idOf(attributes);
    if (!claim(id, 'edge')) return [];
    const from = (attributes['from'] ?? '').trim();
    const to = (attributes['to'] ?? '').trim();
    for (const end of [from, to]) if (!nodeIds.has(end)) errors.push({ code: 'unknown-end', id, end });
    const flow = attributes['flow'];
    return [
      {
        id,
        from,
        to,
        label: label.trim(),
        line: pick(EDGE_LINES, 'solid', id, 'line', attributes, errors),
        start: pick(EDGE_MARKERS, 'none', id, 'start', attributes, errors),
        end: pick(EDGE_MARKERS, 'arrow', id, 'end', attributes, errors),
        flow: !absent(flow) && flow !== 'false',
        tone: pick(DIAGRAM_TONES, 'neutral', id, 'tone', attributes, errors),
      },
    ];
  });

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, diagram: { layout, direction, crossings, nodes, edges, groups } };
};

/** The comment target value of one item, in the same `element:` form every element uses. */
export const diagramTargetValue = (diagramId: string, kind: DiagramKind, itemId: string): string =>
  `element:${[diagramId, kind, itemId].map(encodeURIComponent).join('/')}`;
