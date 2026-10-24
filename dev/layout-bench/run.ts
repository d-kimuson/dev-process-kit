/**
 * The fixture corpus and the pure "parse → lay out → score" step shared by
 * the printable bench (`dev/layout-bench.ts`) and its vitest ratchet test
 * (`dev/layout-bench.test.ts`), so the two can never silently disagree on
 * what a fixture's score is.
 */
import { parseErData } from '../../src/components/er-diagram/model';
import { scoreLayout, type MetricResult } from '../../src/lib/layout/metrics';
import { erComplexFixtureAfter, erComplexFixtureBefore } from './fixtures/er-complex';
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
  // Both snapshots, like `sample/er-complex.html` itself: passing only
  // `after` drops the removed tables/relations the sample still draws (the
  // reader's view is a diff), so the bench would measure a different, smaller
  // schema than the page it claims to describe.
  { name: 'er-complex', input: { before: erComplexFixtureBefore, after: erComplexFixtureAfter } },
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
  readonly routingMs: number;
};

/** Parses, lays out and scores every fixture in `FIXTURES`. Deterministic: same input, same numbers, every run. */
export const runBench = (): readonly BenchRow[] =>
  FIXTURES.map((fixture) => {
    const data = parseErData(fixture.input);
    const measured = geometryOf(data);
    // Timing under a parallel test runner is noisy enough to trip a loose
    // ratchet on a busy machine. The layout itself is deterministic, so run it
    // twice more and report the fastest pass: that is the closest available
    // estimate of the work, not of the scheduler.
    let layoutMs = measured.layoutMs;
    let routingMs = measured.routingMs;
    for (let pass = 0; pass < 2; pass++) {
      const repeat = geometryOf(data);
      layoutMs = Math.min(layoutMs, repeat.layoutMs);
      routingMs = Math.min(routingMs, repeat.routingMs);
    }
    const score = scoreLayout(measured.geometry);
    return {
      name: fixture.name,
      tableCount: data.nodes.length,
      edgeCount: data.edges.length,
      layoutMs,
      routingMs,
      ...score,
    };
  });
