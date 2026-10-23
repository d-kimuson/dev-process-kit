/**
 * The fixture corpus and the pure "parse → lay out → score" step shared by
 * the printable bench (`dev/layout-bench.ts`) and its vitest ratchet test
 * (`dev/layout-bench.test.ts`), so the two can never silently disagree on
 * what a fixture's score is.
 */
import { parseErData } from '../../src/components/er-diagram/model';
import { scoreLayout, type MetricResult } from '../../src/lib/layout/metrics';
import { erComplexFixtureAfter } from './fixtures/er-complex';
import { erLongNamesFixtureAfter } from './fixtures/er-long-names';
import { orderSchemaFixtureAfter } from './fixtures/order-schema';
import {
  hubTableSchema,
  manyCrossBcEdgesSchema,
  noBcSchema,
  seededRandomSchema,
  selfReferenceSchema,
} from './fixtures/synthetic';
import { geometryOf } from './geometry';

export type BenchFixture = { readonly name: string; readonly input: unknown };

/**
 * The sample corpus (the real diagrams the bug report was about) plus
 * synthetic stress schemas the samples do not exercise on their own: no
 * Bounded Context at all, many cross-BC edges, a hub table, self-references,
 * and two seeded-random schemas for a denser, messier mix.
 */
export const FIXTURES: readonly BenchFixture[] = [
  { name: 'er-complex', input: { after: erComplexFixtureAfter } },
  { name: 'order-schema', input: { after: orderSchemaFixtureAfter } },
  { name: 'er-long-names', input: { after: erLongNamesFixtureAfter } },
  { name: 'synthetic-no-bc', input: { after: noBcSchema() } },
  { name: 'synthetic-cross-bc', input: { after: manyCrossBcEdgesSchema() } },
  { name: 'synthetic-hub-table', input: { after: hubTableSchema() } },
  { name: 'synthetic-self-reference', input: { after: selfReferenceSchema() } },
  { name: 'synthetic-random-1', input: { after: seededRandomSchema(1) } },
  { name: 'synthetic-random-2', input: { after: seededRandomSchema(2) } },
];

export type BenchRow = MetricResult & {
  readonly name: string;
  readonly tableCount: number;
  readonly edgeCount: number;
  readonly layoutMs: number;
};

/** Parses, lays out and scores every fixture in `FIXTURES`. Deterministic: same input, same numbers, every run. */
export const runBench = (): readonly BenchRow[] =>
  FIXTURES.map((fixture) => {
    const data = parseErData(fixture.input);
    const { geometry, layoutMs } = geometryOf(data);
    const score = scoreLayout(geometry);
    return { name: fixture.name, tableCount: data.nodes.length, edgeCount: data.edges.length, layoutMs, ...score };
  });
