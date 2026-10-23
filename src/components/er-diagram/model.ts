import * as v from 'valibot';

import type { ElementActionResult } from '../../core/element-actions';
import type { DraftAction } from '../../core/types';
import type { ErDiagramMessages } from './messages';

import { elementRefSegments, type DiagramEdgeInput, type DiagramNodeInput } from '../diagram/model';

/**
 * Domain model of the ER diagram: two schema snapshots in, one always-on diff
 * out (added / removed / changed per table, field and relation).
 *
 * The diff is derived, never authored: the JSON child only carries the two
 * snapshots, so red/green can never disagree with the data.
 */

export const TABLE_WIDTH = 280;
export const TABLE_HEAD_HEIGHT = 40;
const ROW_HEIGHT = 32;
const CHANGED_ROW_HEIGHT = 52;

export type ErStatus = 'same' | 'added' | 'removed' | 'changed';
export type ErKey = 'PK' | 'FK' | 'UQ';

/** How many rows of one table relate to a single row of the other. */
export type ErMultiplicity = '1' | '0..1' | '1..N' | '0..N';

/**
 * Both ends of an FK relation, each read "across" the line: `parent` is how
 * many referenced rows one FK row has (`0..1` when the FK is nullable), and
 * `child` is how many FK rows one referenced row has.
 */
export type ErCardinality = { readonly parent: '1' | '0..1'; readonly child: ErMultiplicity };

const PARENT_ENDS = ['1', '0..1'] as const;
const CHILD_ENDS = ['1', '0..1', '1..N', '0..N'] as const;
/** Every `parent:child` pair a relation's cardinality may hold, offered whole in its editor. */
export const CARDINALITIES = PARENT_ENDS.flatMap((parent) => CHILD_ENDS.map((child) => `${parent}:${child}` as const));

/**
 * A table's major structural pattern, shown as a badge on its card — an
 * auxiliary attribute, never a filter (the tag row already covers that).
 */
export const ER_DESIGN_PATTERNS = ['immutable', 'mutable', 'sti', 'cti', 'value-object'] as const;
export type ErDesignPattern = (typeof ER_DESIGN_PATTERNS)[number];
const designPatternSchema = v.picklist(ER_DESIGN_PATTERNS);

/** Folds a table's Bounded Context into its tags, so the existing tag filter row and its Single/AND/OR semantics cover it for free. */
export const BC_TAG_PREFIX = 'BC:';
export const boundedContextTag = (boundedContext: string): string => `${BC_TAG_PREFIX}${boundedContext}`;

const keySchema = v.picklist(['PK', 'FK', 'UQ']);

const fieldSchema = v.strictObject({
  id: v.pipe(v.string(), v.minLength(1)),
  type: v.pipe(v.string(), v.minLength(1)),
  /** One key, or several when a column plays more than one role (e.g. `["FK", "UQ"]`). */
  key: v.optional(v.union([keySchema, v.pipe(v.array(keySchema), v.minLength(1))])),
  /** `table.field` this FK points at. */
  ref: v.optional(v.string()),
  nullable: v.optional(v.boolean(), false),
  /** `parent:child` multiplicities, for what the keys alone cannot say (e.g. `1:1..N`). */
  cardinality: v.optional(v.picklist(CARDINALITIES)),
  /** A short verb phrase naming the relation, e.g. `places`. */
  label: v.optional(v.pipe(v.string(), v.minLength(1))),
  questions: v.optional(v.string()),
});

const tableSchema = v.strictObject({
  id: v.pipe(v.string(), v.minLength(1)),
  name: v.pipe(v.string(), v.minLength(1)),
  tags: v.optional(v.array(v.string()), []),
  /** Separate from `tags`; folded into them as `BC:<name>` so it filters the same way. */
  boundedContext: v.optional(v.string()),
  /** Groups tables on the canvas; purely visual. */
  aggregate: v.optional(v.string()),
  pattern: v.optional(designPatternSchema),
  fields: v.array(fieldSchema),
  questions: v.optional(v.string()),
});

const snapshotSchema = v.strictObject({ tables: v.array(tableSchema) });

const diagramSchema = v.strictObject({
  /** Omitted means "no diff": the baseline is `after` itself. */
  before: v.optional(snapshotSchema),
  after: snapshotSchema,
});

type SnapshotField = v.InferOutput<typeof fieldSchema>;
type SnapshotTable = v.InferOutput<typeof tableSchema>;

export type ErField = {
  readonly id: string;
  readonly type: string;
  /** In authored order, without duplicates; empty for a plain column. */
  readonly keys: readonly ErKey[];
  readonly ref: string | null;
  readonly nullable: boolean;
  /** The authored `parent:child` declaration, if any. */
  readonly cardinality: string | null;
  readonly label: string | null;
  /** Space-separated grill question ids. */
  readonly questions: string | null;
};

export type ErFieldDiff = ErField & {
  readonly status: ErStatus;
  /** The previous definition, for the "− before / + after" row. */
  readonly before: ErField | null;
};

export type ErTableDiff = DiagramNodeInput & {
  readonly name: string;
  readonly status: ErStatus;
  readonly fields: readonly ErFieldDiff[];
  /** `null` outside any Bounded Context; also folded into `tags` as {@link boundedContextTag}. */
  readonly boundedContext: string | null;
  /** `null` outside any aggregate; tables sharing one are grouped on the canvas. */
  readonly aggregate: string | null;
  readonly pattern: ErDesignPattern | null;
};

/** What a relation says, apart from which columns it joins. */
export type ErRelationMeaning = {
  readonly cardinality: ErCardinality;
  readonly label: string | null;
};

export type ErRelation = DiagramEdgeInput &
  ErRelationMeaning & {
    readonly sourceField: string;
    readonly targetField: string;
    readonly status: ErStatus;
    /** The previous meaning of a `changed` relation. */
    readonly before: ErRelationMeaning | null;
  };

export type ErData = {
  readonly nodes: readonly ErTableDiff[];
  readonly edges: readonly ErRelation[];
};

export const emptyErData = (): ErData => ({ nodes: [], edges: [] });

const keysOf = (field: SnapshotField): readonly ErKey[] =>
  field.key === undefined ? [] : [...new Set(typeof field.key === 'string' ? [field.key] : field.key)];

const fieldOf = (field: SnapshotField): ErField => ({
  id: field.id,
  type: field.type,
  keys: keysOf(field),
  ref: field.ref ?? null,
  nullable: field.nullable,
  cardinality: field.cardinality ?? null,
  label: field.label ?? null,
  questions: field.questions ?? null,
});

const sameField = (a: ErField, b: ErField): boolean =>
  a.type === b.type &&
  a.keys.join() === b.keys.join() &&
  a.ref === b.ref &&
  a.nullable === b.nullable &&
  a.cardinality === b.cardinality &&
  a.label === b.label;

export const cardinalityText = (cardinality: ErCardinality): string => `${cardinality.parent} : ${cardinality.child}`;

const sameMeaning = (a: ErRelationMeaning, b: ErRelationMeaning): boolean =>
  cardinalityText(a.cardinality) === cardinalityText(b.cardinality) && a.label === b.label;

/**
 * A column alone identifies at most one row when it is `UQ`, or when it is the
 * table's whole primary key (one `PK` column among several is only part of a
 * composite key, so its values repeat).
 */
const isUnique = (table: SnapshotTable, field: SnapshotField): boolean => {
  const keys = keysOf(field);
  if (keys.includes('UQ')) return true;
  return keys.includes('PK') && table.fields.filter((other) => keysOf(other).includes('PK')).length === 1;
};

const PARENT_END = new Map<string, ErCardinality['parent']>(PARENT_ENDS.map((end) => [end, end]));
const CHILD_END = new Map<string, ErMultiplicity>(CHILD_ENDS.map((end) => [end, end]));

/**
 * The multiplicities an FK column implies, or the ones it declares. A
 * declaration may narrow what the keys allow (`0..N` to `1..N`) but must not
 * contradict them, or the diagram would mislead.
 */
const cardinalityOf = (table: SnapshotTable, field: SnapshotField): ErCardinality => {
  const unique = isUnique(table, field);
  const derived: ErCardinality = { parent: field.nullable ? '0..1' : '1', child: unique ? '0..1' : '0..N' };
  if (field.cardinality === undefined) return derived;
  const [parentEnd = '', childEnd = ''] = field.cardinality.split(':');
  const parent = PARENT_END.get(parentEnd);
  const child = CHILD_END.get(childEnd);
  const where = `${table.id}.${field.id}`;
  // The schema only admits known pairs; this narrows the type.
  if (parent === undefined || child === undefined) throw new Error(`invalid cardinality on ${where}`);
  if (parent !== derived.parent) {
    throw new Error(
      `cardinality "${field.cardinality}" on ${where} needs the parent end ${derived.parent}: the FK is ${field.nullable ? '' : 'not '}nullable`,
    );
  }
  if (unique && (child === '1..N' || child === '0..N')) {
    throw new Error(`cardinality "${field.cardinality}" on ${where} allows many rows, but the column is unique`);
  }
  return { parent, child };
};

export const fieldRowHeight = (field: ErFieldDiff): number =>
  field.status === 'changed' ? CHANGED_ROW_HEIGHT : ROW_HEIGHT;

export const tableHeight = (fields: readonly ErFieldDiff[]): number =>
  TABLE_HEAD_HEIGHT + fields.reduce((height, field) => height + fieldRowHeight(field), 0);

/** Vertical centre of a field row inside its table card. */
export const fieldOffset = (fields: readonly ErFieldDiff[], fieldId: string): number => {
  let y = TABLE_HEAD_HEIGHT;
  for (const field of fields) {
    if (field.id === fieldId) return y + fieldRowHeight(field) / 2;
    y += fieldRowHeight(field);
  }
  return TABLE_HEAD_HEIGHT / 2;
};

const FAN_GAP = 14;

/**
 * Vertical offset of the `index`-th of `count` relations that leave one
 * referenced column. Each gets its own short stub, so the crow's foot symbol
 * and multiplicity at that end never sit on top of a sibling's.
 */
export const fanOffset = (index: number, count: number): number => (index - (count - 1) / 2) * FAN_GAP;

/** Each relation's {@link fanOffset} among those leaving the same referenced column. */
export const outgoingFan = (edges: readonly ErRelation[]): ReadonlyMap<string, number> => {
  const groups = new Map<string, string[]>();
  for (const edge of edges) {
    const key = `${edge.from}.${edge.sourceField}`;
    groups.set(key, [...(groups.get(key) ?? []), edge.id]);
  }
  return new Map(
    [...groups.values()].flatMap((ids) => ids.map((id, index) => [id, fanOffset(index, ids.length)] as const)),
  );
};

type SnapshotRelation = ErRelationMeaning & {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly sourceField: string;
  readonly targetField: string;
};

const relationsOf = (tables: readonly SnapshotTable[]): SnapshotRelation[] =>
  tables.flatMap((table) =>
    table.fields.flatMap((field): SnapshotRelation[] => {
      if (field.ref === undefined) {
        if (field.cardinality !== undefined || field.label !== undefined) {
          throw new Error(`cardinality and label on ${table.id}.${field.id} describe a relation; add its ref`);
        }
        return [];
      }
      const [from, sourceField] = field.ref.split('.');
      if (from === undefined || sourceField === undefined) {
        throw new Error(`invalid ref "${field.ref}" on ${table.id}.${field.id}; expected table.field`);
      }
      return [
        {
          id: `${from}:${sourceField}>${table.id}:${field.id}`,
          from,
          to: table.id,
          sourceField,
          targetField: field.id,
          cardinality: cardinalityOf(table, field),
          label: field.label ?? null,
        },
      ];
    }),
  );

const diffFields = (before: readonly SnapshotField[], after: readonly SnapshotField[]): readonly ErFieldDiff[] => {
  const ids = [...new Set([...before, ...after].map((field) => field.id))];
  return ids.flatMap((id): readonly ErFieldDiff[] => {
    const oldField = before.find((field) => field.id === id);
    const newField = after.find((field) => field.id === id);
    const source = newField ?? oldField;
    // The id comes from the union of both snapshots, so one side always exists.
    if (!source) return [];
    const current = fieldOf(source);
    if (!oldField) return [{ ...current, status: 'added' as const, before: null }];
    if (!newField) return [{ ...current, status: 'removed' as const, before: null }];
    const previous = fieldOf(oldField);
    return [
      {
        ...current,
        status: sameField(previous, current) ? ('same' as const) : ('changed' as const),
        before: sameField(previous, current) ? null : previous,
      },
    ];
  });
};

type Point = { x: number; y: number };

/** Anchors each relation touching `table` to the row of the column that carries it. */
const withPorts = (table: ErTableDiff, edges: readonly ErRelation[]): ErTableDiff => {
  const fan = outgoingFan(edges);
  const ports: Record<string, Point> = {};
  for (const edge of edges) {
    if (edge.from === table.id) {
      ports[`${edge.id}:out`] = {
        x: TABLE_WIDTH,
        y: fieldOffset(table.fields, edge.sourceField) + (fan.get(edge.id) ?? 0),
      };
    }
    if (edge.to === table.id) ports[`${edge.id}:in`] = { x: 0, y: fieldOffset(table.fields, edge.targetField) };
  }
  return { ...table, ports };
};

export const parseErData = (input: unknown): ErData => {
  const parsed = v.parse(diagramSchema, input);
  const before = parsed.before?.tables ?? parsed.after.tables;
  const after = parsed.after.tables;
  const ids = [...new Set([...before, ...after].map((table) => table.id))];
  const tags = new Map<string, readonly string[]>();
  const boundedContexts = new Map<string, string | null>();
  const aggregates = new Map<string, string | null>();
  const patterns = new Map<string, ErDesignPattern | null>();
  for (const table of [...before, ...after]) {
    tags.set(table.id, table.tags);
    boundedContexts.set(table.id, table.boundedContext ?? null);
    aggregates.set(table.id, table.aggregate ?? null);
    patterns.set(table.id, table.pattern ?? null);
  }

  const nodes = ids.flatMap((id): ErTableDiff[] => {
    const oldTable = before.find((table) => table.id === id);
    const newTable = after.find((table) => table.id === id);
    const source = newTable ?? oldTable;
    // The id comes from the union of both snapshots, so one side always exists.
    if (!source) return [];
    const fields = diffFields(oldTable?.fields ?? [], newTable?.fields ?? []);
    const status: ErStatus = !oldTable
      ? 'added'
      : !newTable
        ? 'removed'
        : fields.some((field) => field.status !== 'same')
          ? 'changed'
          : 'same';
    const boundedContext = boundedContexts.get(id) ?? null;
    const aggregate = aggregates.get(id) ?? null;
    return [
      {
        id,
        name: source.name,
        status,
        fields,
        tags: [...(tags.get(id) ?? []), ...(boundedContext === null ? [] : [boundedContextTag(boundedContext)])],
        boundedContext,
        aggregate,
        // Folded into the layered layout's generic `group`, the same way `boundedContext` is folded into `tags`:
        // tables sharing an aggregate are clustered into one non-overlapping band on the canvas.
        ...(aggregate === null ? {} : { group: aggregate }),
        pattern: patterns.get(id) ?? null,
        width: TABLE_WIDTH,
        height: tableHeight(fields),
        ...(source.questions === undefined ? {} : { questions: source.questions }),
      } satisfies ErTableDiff,
    ];
  });

  const byId = new Map(nodes.map((node) => [node.id, node]));
  const oldRelations = relationsOf(before);
  const newRelations = relationsOf(after);
  const relationIds = [...new Set([...oldRelations, ...newRelations].map((relation) => relation.id))];
  const edges = relationIds.flatMap((id) => {
    const oldRelation = oldRelations.find((relation) => relation.id === id);
    const newRelation = newRelations.find((relation) => relation.id === id);
    const relation = newRelation ?? oldRelation;
    if (!relation) return [];
    const from = byId.get(relation.from);
    const to = byId.get(relation.to);
    // A relation whose endpoint table is gone from both snapshots cannot be drawn.
    if (!from || !to) return [];
    const previous = oldRelation && newRelation && !sameMeaning(oldRelation, newRelation) ? oldRelation : null;
    const status: ErStatus = !oldRelation ? 'added' : !newRelation ? 'removed' : previous ? 'changed' : 'same';
    return [
      {
        id,
        from: relation.from,
        to: relation.to,
        sourceField: relation.sourceField,
        targetField: relation.targetField,
        cardinality: relation.cardinality,
        label: relation.label,
        before: previous && { cardinality: previous.cardinality, label: previous.label },
        status,
        tags: [],
        fromPort: `${id}:out`,
        toPort: `${id}:in`,
      } satisfies ErRelation,
    ];
  });

  return {
    nodes: nodes.map((node) => withPorts(node, edges)),
    edges,
  };
};

/* ---------------------------------------------------------- element actions */

export const ADD_FIELD = 'ADD_FIELD';
export const EDIT_FIELD = 'EDIT_FIELD';
export const DELETE_FIELD = 'DELETE_FIELD';
export const EDIT_CARDINALITY = 'EDIT_CARDINALITY';

const addFieldPayloadSchema = v.object({
  id: v.pipe(v.string(), v.trim(), v.minLength(1)),
  type: v.pipe(v.string(), v.trim(), v.minLength(1)),
  nullable: v.optional(v.boolean(), false),
});

const editFieldPayloadSchema = v.object({
  field: v.pipe(v.string(), v.minLength(1)),
  type: v.pipe(v.string(), v.trim(), v.minLength(1)),
  nullable: v.boolean(),
});

const deleteFieldPayloadSchema = v.object({
  field: v.pipe(v.string(), v.minLength(1)),
});

const editCardinalityPayloadSchema = v.object({
  cardinality: v.picklist(CARDINALITIES),
});

/** `<diagram-id>/node/<id>` → the table id. */
const tableIdOfTarget = (targetId: string): string | null => {
  const segments = elementRefSegments(targetId);
  return segments?.length === 3 && segments[1] === 'node' ? (segments[2] ?? null) : null;
};

/** `<diagram-id>/edge/<id>` → the relation id. */
const edgeIdOfTarget = (targetId: string): string | null => {
  const segments = elementRefSegments(targetId);
  return segments?.length === 3 && segments[1] === 'edge' ? (segments[2] ?? null) : null;
};

/** Whether `field` of `table` carries any relation, as either its FK or the column an FK points at. */
const fieldInRelation = (data: ErData, tableId: string, fieldId: string): boolean =>
  data.edges.some(
    (edge) =>
      (edge.from === tableId && edge.sourceField === fieldId) || (edge.to === tableId && edge.targetField === fieldId),
  );

type Step = { readonly data: ErData; readonly result: ElementActionResult };

const replaceTable = (data: ErData, id: string, fields: readonly ErFieldDiff[]): ErData => {
  const nodes = data.nodes.map((node): ErTableDiff => {
    if (node.id !== id) return node;
    const status: ErStatus =
      node.status === 'added' || node.status === 'removed'
        ? node.status
        : fields.some((field) => field.status !== 'same')
          ? 'changed'
          : 'same';
    return withPorts({ ...node, status, fields, height: tableHeight(fields) }, data.edges);
  });
  return { ...data, nodes };
};

const addField = (m: ErDiagramMessages, data: ErData, action: DraftAction): Step => {
  const title = m.addFieldTitle;
  const table = data.nodes.find((node) => node.id === tableIdOfTarget(action.target.id));
  if (table === undefined) return { data, result: { id: action.id, title, stale: 'target-missing' } };
  const payload = v.safeParse(addFieldPayloadSchema, action.payload);
  if (!payload.success || table.fields.some((field) => field.id === payload.output.id)) {
    return { data, result: { id: action.id, title, stale: 'constraint-violated' } };
  }
  const field: ErFieldDiff = {
    id: payload.output.id,
    type: payload.output.type,
    keys: [],
    ref: null,
    nullable: payload.output.nullable,
    cardinality: null,
    label: null,
    questions: null,
    status: 'added',
    before: null,
  };
  return {
    data: replaceTable(data, table.id, [...table.fields, field]),
    result: { id: action.id, title, summary: m.addFieldSummary(table.id, field.id, field.type), tone: 'create' },
  };
};

const editField = (m: ErDiagramMessages, data: ErData, action: DraftAction): Step => {
  const title = m.editFieldTitle;
  const table = data.nodes.find((node) => node.id === tableIdOfTarget(action.target.id));
  const payload = v.safeParse(editFieldPayloadSchema, action.payload);
  const field = payload.success ? table?.fields.find((item) => item.id === payload.output.field) : undefined;
  if (table === undefined || (payload.success && field === undefined)) {
    return { data, result: { id: action.id, title, stale: 'target-missing' } };
  }
  // A relation's multiplicities derive from keys and nullability, so only plain columns are editable here.
  if (!payload.success || field === undefined || field.ref !== null || field.status === 'removed') {
    return { data, result: { id: action.id, title, stale: 'constraint-violated' } };
  }
  const { before: _before, status: _status, ...current } = field;
  const next: ErField = { ...current, type: payload.output.type, nullable: payload.output.nullable };
  const original = field.before ?? current;
  const status: ErStatus = field.status === 'added' ? 'added' : sameField(original, next) ? 'same' : 'changed';
  const edited: ErFieldDiff = { ...next, status, before: status === 'changed' ? original : null };
  return {
    data: replaceTable(
      data,
      table.id,
      table.fields.map((item) => (item.id === field.id ? edited : item)),
    ),
    result: { id: action.id, title, summary: m.editFieldSummary(table.id, field.id, next.type), tone: 'update' },
  };
};

/**
 * Deletes a plain column: an `added` one disappears outright (undoing the
 * add), any other is marked `removed` like an authored deletion, so it keeps
 * reading as a struck-through row. A column that carries a relation, on
 * either end, cannot be deleted here — its multiplicities and the edge that
 * draws it would be left dangling.
 */
const deleteField = (m: ErDiagramMessages, data: ErData, action: DraftAction): Step => {
  const title = m.deleteFieldTitle;
  const table = data.nodes.find((node) => node.id === tableIdOfTarget(action.target.id));
  const payload = v.safeParse(deleteFieldPayloadSchema, action.payload);
  const field = payload.success ? table?.fields.find((item) => item.id === payload.output.field) : undefined;
  if (table === undefined || (payload.success && field === undefined)) {
    return { data, result: { id: action.id, title, stale: 'target-missing' } };
  }
  if (
    !payload.success ||
    field === undefined ||
    field.status === 'removed' ||
    field.ref !== null ||
    fieldInRelation(data, table.id, field.id)
  ) {
    return { data, result: { id: action.id, title, stale: 'constraint-violated' } };
  }
  const fields =
    field.status === 'added'
      ? table.fields.filter((item) => item.id !== field.id)
      : table.fields.map((item): ErFieldDiff =>
          item.id === field.id ? { ...field, status: 'removed', before: null } : item,
        );
  return {
    data: replaceTable(data, table.id, fields),
    result: { id: action.id, title, summary: m.deleteFieldSummary(table.id, field.id), tone: 'delete' },
  };
};

const editCardinality = (m: ErDiagramMessages, data: ErData, action: DraftAction): Step => {
  const title = m.editCardinalityTitle;
  const edge = data.edges.find((item) => item.id === edgeIdOfTarget(action.target.id));
  if (edge === undefined) return { data, result: { id: action.id, title, stale: 'target-missing' } };
  const payload = v.safeParse(editCardinalityPayloadSchema, action.payload);
  if (!payload.success || edge.status === 'removed') {
    return { data, result: { id: action.id, title, stale: 'constraint-violated' } };
  }
  const [parentEnd = '', childEnd = ''] = payload.output.cardinality.split(':');
  const parent = PARENT_END.get(parentEnd);
  const child = CHILD_END.get(childEnd);
  // The schema only admits known pairs; this narrows the type.
  if (parent === undefined || child === undefined) {
    return { data, result: { id: action.id, title, stale: 'constraint-violated' } };
  }
  const cardinality: ErCardinality = { parent, child };
  const meaning: ErRelationMeaning = { cardinality, label: edge.label };
  const original = edge.before ?? { cardinality: edge.cardinality, label: edge.label };
  const status: ErStatus = edge.status === 'added' ? 'added' : sameMeaning(original, meaning) ? 'same' : 'changed';
  const edited: ErRelation = { ...edge, cardinality, status, before: status === 'changed' ? original : null };
  return {
    data: { ...data, edges: data.edges.map((item) => (item.id === edge.id ? edited : item)) },
    result: {
      id: action.id,
      title,
      summary: m.editCardinalitySummary(edge.from, edge.to, cardinalityText(cardinality)),
      tone: 'update',
    },
  };
};

/**
 * Replays the draft's element actions over the diffed schema, in order. An
 * added or edited column is drawn against the `after` snapshot like any other
 * change. Each action is reported on: applied, or why it is stale. Pure.
 */
export const reduceErActions = (
  m: ErDiagramMessages,
  data: ErData,
  actions: readonly DraftAction[],
): { readonly data: ErData; readonly results: readonly ElementActionResult[] } => {
  let schema = data;
  const results: ElementActionResult[] = [];
  for (const action of actions) {
    const step =
      action.type === ADD_FIELD
        ? addField(m, schema, action)
        : action.type === EDIT_FIELD
          ? editField(m, schema, action)
          : action.type === DELETE_FIELD
            ? deleteField(m, schema, action)
            : action.type === EDIT_CARDINALITY
              ? editCardinality(m, schema, action)
              : {
                  data: schema,
                  result: { id: action.id, title: action.type, stale: 'unsupported-action-type' as const },
                };
    schema = step.data;
    results.push(step.result);
  }
  return { data: schema, results };
};
