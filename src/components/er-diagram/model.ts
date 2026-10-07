import * as v from 'valibot';

import type { DiagramEdgeInput, DiagramNodeInput } from '../diagram/model';

/**
 * Domain model of the ER diagram: two schema snapshots in, one always-on diff
 * out (added / removed / changed per table, field and relation).
 *
 * The diff is derived, never authored: the JSON child only carries the two
 * snapshots, so red/green can never disagree with the data.
 */

export const TABLE_WIDTH = 276;
export const TABLE_HEAD_HEIGHT = 74;
const ROW_HEIGHT = 28;
const CHANGED_ROW_HEIGHT = 44;

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
const CARDINALITIES = PARENT_ENDS.flatMap((parent) => CHILD_ENDS.map((child) => `${parent}:${child}` as const));

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
  /** Space-separated `dpk-template-grill` question ids. */
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

export const parseErData = (input: unknown): ErData => {
  const parsed = v.parse(diagramSchema, input);
  const before = parsed.before?.tables ?? parsed.after.tables;
  const after = parsed.after.tables;
  const ids = [...new Set([...before, ...after].map((table) => table.id))];
  const tags = new Map<string, readonly string[]>();
  for (const table of [...before, ...after]) tags.set(table.id, table.tags);

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
    return [
      {
        id,
        name: source.name,
        status,
        fields,
        tags: tags.get(id) ?? [],
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

  const fan = outgoingFan(edges);
  const portsOf = (
    table: ErTableDiff,
  ): {
    readonly out: Record<string, { x: number; y: number }>;
    readonly in: Record<string, { x: number; y: number }>;
  } => {
    const out: Record<string, { x: number; y: number }> = {};
    const incoming: Record<string, { x: number; y: number }> = {};
    for (const edge of edges) {
      if (edge.from === table.id)
        out[`${edge.id}:out`] = {
          x: TABLE_WIDTH,
          y: fieldOffset(table.fields, edge.sourceField) + (fan.get(edge.id) ?? 0),
        };
      if (edge.to === table.id) incoming[`${edge.id}:in`] = { x: 0, y: fieldOffset(table.fields, edge.targetField) };
    }
    return { out, in: incoming };
  };

  return {
    nodes: nodes.map((node) => {
      const ports = portsOf(node);
      return { ...node, ports: { ...ports.out, ...ports.in } };
    }),
    edges,
  };
};
