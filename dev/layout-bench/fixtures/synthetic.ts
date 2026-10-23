/**
 * Synthetic schemas for the layout bench, deliberately shaped to stress cases
 * the sample fixtures do not cover on their own: no Bounded Context at all,
 * many edges crossing BC boundaries, one hub table many others reference, and
 * self-references. Every schema here is deterministic — none depends on
 * wall-clock time or an unseeded RNG — so a bench run is reproducible and a
 * score change is never a false alarm from a different random draw.
 *
 * Each schema is the `{ tables }` snapshot shape `parseErData` accepts as
 * either half of its `{ before?, after }` input.
 */

type SnapshotKey = 'PK' | 'FK' | 'UQ';
type SnapshotField = {
  readonly id: string;
  readonly type: string;
  readonly key?: SnapshotKey | readonly SnapshotKey[];
  readonly ref?: string;
  readonly nullable?: boolean;
};
type SnapshotTable = {
  readonly id: string;
  readonly name: string;
  readonly boundedContext?: string;
  readonly aggregate?: string;
  readonly fields: readonly SnapshotField[];
};
export type SyntheticSchema = { readonly tables: readonly SnapshotTable[] };

const pk = (): SnapshotField => ({ id: 'id', type: 'uuid', key: 'PK' });
const fk = (fieldId: string, ref: string, nullable = false): SnapshotField => ({
  id: fieldId,
  type: 'uuid',
  key: 'FK',
  ref,
  ...(nullable ? { nullable } : {}),
});
const col = (id: string, type = 'varchar'): SnapshotField => ({ id, type });

const table = (
  id: string,
  fields: readonly SnapshotField[],
  extra: { readonly boundedContext?: string; readonly aggregate?: string } = {},
): SnapshotTable => ({ id, name: id, fields: [pk(), ...fields], ...extra });

/** A plain chain, no Bounded Context or aggregate at all — the common case the fix must not regress. */
export const noBcSchema = (): SyntheticSchema => {
  const COUNT = 12;
  const tables: SnapshotTable[] = [];
  for (let i = 0; i < COUNT; i++) {
    const fields = i === 0 ? [col('name')] : [fk('prev_id', `table_${i - 1}.id`), col('name')];
    tables.push(table(`table_${i}`, fields));
  }
  return { tables };
};

/**
 * Three Bounded Contexts, each with its own aggregate, wired with several
 * edges that deliberately cross BC boundaries — the case that most directly
 * stresses frame violations and long cross-cutting lines.
 */
export const manyCrossBcEdgesSchema = (): SyntheticSchema => {
  const bcs = ['alpha', 'beta', 'gamma'];
  const perBc = 4;
  const tables: SnapshotTable[] = [];
  for (const bc of bcs) {
    for (let i = 0; i < perBc; i++) {
      const fields: SnapshotField[] =
        i === 0 ? [col('name')] : [fk(`${bc}_${i - 1}_id`, `${bc}_${i - 1}.id`), col('name')];
      tables.push(table(`${bc}_${i}`, fields, { boundedContext: bc, aggregate: `${bc}-agg` }));
    }
  }
  const byId = new Map(tables.map((item, index) => [item.id, index]));
  const addCrossRef = (fromId: string, fieldId: string, ref: string) => {
    const index = byId.get(fromId);
    if (index === undefined) return;
    const current = tables[index]!;
    tables[index] = { ...current, fields: [...current.fields, fk(fieldId, ref, true)] };
  };
  // Every BC's last table references the next BC's first table, round-robin.
  for (let i = 0; i < bcs.length; i++) {
    const from = bcs[i]!;
    const to = bcs[(i + 1) % bcs.length]!;
    addCrossRef(`${from}_${perBc - 1}`, `${to}_ref_id`, `${to}_0.id`);
  }
  // One edge skipping straight across, from the first BC's first table to the last BC's last table.
  addCrossRef(`${bcs[0]}_0`, 'far_ref_id', `${bcs.at(-1)}_${perBc - 1}.id`);
  return { tables };
};

/** One hub table ten others reference — the layout must not let ten lines converge through unrelated cards. */
export const hubTableSchema = (): SyntheticSchema => {
  const SPOKES = 10;
  const tables: SnapshotTable[] = [table('hub', [col('name')])];
  for (let i = 0; i < SPOKES; i++) tables.push(table(`spoke_${i}`, [fk('hub_id', 'hub.id'), col('name')]));
  return { tables };
};

/** A self-referencing table (a tree, e.g. categories with a parent) alongside ordinary relations. */
export const selfReferenceSchema = (): SyntheticSchema => ({
  tables: [
    table('categories', [fk('parent_id', 'categories.id', true), col('name')]),
    table('products', [fk('category_id', 'categories.id'), col('name')]),
    table('tags', [col('name')]),
    table('product_tags', [fk('product_id', 'products.id'), fk('tag_id', 'tags.id')]),
    table('reviews', [fk('product_id', 'products.id'), col('body')]),
  ],
});

/** A small, deterministic PRNG (mulberry32): the same seed always produces the same schema. */
const mulberry32 = (seed: number): (() => number) => {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * A reproducible random schema: `tableCount` tables, each (after the first
 * two) optionally referencing one or two earlier tables, so the reference
 * graph stays acyclic by construction. About three quarters of tables land in
 * one of four Bounded Contexts, each with one of two aggregates — a denser,
 * messier mix than any hand-authored fixture.
 */
export const seededRandomSchema = (seed: number, tableCount = 24): SyntheticSchema => {
  const rand = mulberry32(seed);
  const bcs = ['north', 'south', 'east', 'west'];
  const tables: SnapshotTable[] = [];
  for (let i = 0; i < tableCount; i++) {
    const hasBc = rand() < 0.75;
    const bc = hasBc ? bcs[Math.floor(rand() * bcs.length)] : undefined;
    const aggregate = bc === undefined ? undefined : `${bc}-agg-${Math.floor(rand() * 2)}`;
    const fields: SnapshotField[] = [col('name')];
    const refCount = i < 2 ? 0 : rand() < 0.3 ? 2 : 1;
    for (let r = 0; r < refCount; r++) {
      const target = Math.floor(rand() * i);
      fields.push(fk(`ref_${r}_id`, `rnd_${target}.id`, rand() < 0.3));
    }
    tables.push(
      table(`rnd_${i}`, fields, {
        ...(bc === undefined ? {} : { boundedContext: bc }),
        ...(aggregate === undefined ? {} : { aggregate }),
      }),
    );
  }
  return { tables };
};
