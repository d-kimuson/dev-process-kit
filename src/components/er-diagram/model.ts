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
export type ErKey = 'PK' | 'FK' | 'UQ' | null;

const fieldSchema = v.strictObject({
  id: v.pipe(v.string(), v.minLength(1)),
  type: v.pipe(v.string(), v.minLength(1)),
  key: v.optional(v.picklist(['PK', 'FK', 'UQ'])),
  /** `table.field` this FK points at. */
  ref: v.optional(v.string()),
  nullable: v.optional(v.boolean(), false),
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
  readonly key: ErKey;
  readonly ref: string | null;
  readonly nullable: boolean;
  /** Space-separated `artifact-grill-panel` references. */
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

export type ErRelation = DiagramEdgeInput & {
  readonly sourceField: string;
  readonly targetField: string;
  readonly status: ErStatus;
};

export type ErData = {
  readonly nodes: readonly ErTableDiff[];
  readonly edges: readonly ErRelation[];
};

export const emptyErData = (): ErData => ({ nodes: [], edges: [] });

const fieldOf = (field: SnapshotField): ErField => ({
  id: field.id,
  type: field.type,
  key: field.key ?? null,
  ref: field.ref ?? null,
  nullable: field.nullable,
  questions: field.questions ?? null,
});

const sameField = (a: ErField, b: ErField): boolean =>
  a.type === b.type && a.key === b.key && a.ref === b.ref && a.nullable === b.nullable;

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

const relationsOf = (
  tables: readonly SnapshotTable[],
): { id: string; from: string; to: string; sourceField: string; targetField: string }[] =>
  tables.flatMap((table) =>
    table.fields.flatMap((field) => {
      if (field.ref === undefined) return [];
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
    const status: ErStatus = !oldRelation ? 'added' : !newRelation ? 'removed' : 'same';
    return [
      {
        id,
        from: relation.from,
        to: relation.to,
        sourceField: relation.sourceField,
        targetField: relation.targetField,
        status,
        tags: [],
        fromPort: `${id}:out`,
        toPort: `${id}:in`,
      } satisfies ErRelation,
    ];
  });

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
        out[`${edge.id}:out`] = { x: TABLE_WIDTH, y: fieldOffset(table.fields, edge.sourceField) };
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
