/**
 * The fixture corpus and the pure "parse → lay out → score" step shared by
 * the printable bench (`dev/layout-bench.ts`) and its vitest ratchet test
 * (`dev/layout-bench.test.ts`), so the two can never silently disagree on
 * what a fixture's score is.
 */
import { parseErData } from '../../src/boards/er-diagram/model';
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
  // Both snapshots, like `lp/er-complex.html` itself: passing only
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

/** How many times each fixture is laid out and routed; the fastest pass is reported. */
const TIMING_PASSES = 3;

/** Parses, lays out and scores every fixture in `FIXTURES`. Deterministic: same input, same numbers, every run. */
export const runBench = (): readonly BenchRow[] =>
  FIXTURES.map((fixture) => {
    const data = parseErData(fixture.input);
    const measured = geometryOf(data);
    // A pass includes JIT warm-up and the occasional GC pause, so take the fastest
    // of a few: the least-work estimate is the one comparable to the recorded
    // ceiling. Cross-process load is already out of these numbers —
    // `geometryOf` times CPU time, not wall-clock (see `now` there).
    let layoutMs = measured.layoutMs;
    let routingMs = measured.routingMs;
    for (let pass = 1; pass < TIMING_PASSES; pass++) {
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
