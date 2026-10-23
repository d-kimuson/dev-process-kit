/**
 * Prints the ER layout-complexity bench as a table: one row per fixture in
 * `dev/layout-bench/run.ts`'s `FIXTURES`, scored by `scoreLayout`
 * (`src/lib/layout/metrics.ts`). Run with `pnpm bench:layout`.
 *
 * This is a plain Node script, not a Vite-bundled one, so it loads the
 * repo's extensionless, bundler-resolved TypeScript through a Vite dev
 * server's SSR module graph instead of `tsx`/`ts-node` — the same loader the
 * component tests already rely on indirectly via Vitest, kept here as an
 * explicit, standalone entrypoint.
 */
import { createServer } from 'vite';

import type { BenchRow } from './layout-bench/run';

const formatNumber = (value: number, digits = 2): string =>
  value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });

const printTable = (rows: readonly BenchRow[]): void => {
  const columns: readonly { readonly header: string; readonly value: (row: BenchRow) => string }[] = [
    { header: 'fixture', value: (row) => row.name },
    { header: 'tables', value: (row) => String(row.tableCount) },
    { header: 'edges', value: (row) => String(row.edgeCount) },
    { header: 'layoutMs', value: (row) => formatNumber(row.layoutMs) },
    { header: 'crossings', value: (row) => String(row.crossings) },
    {
      header: 'edgeThruNode',
      value: (row) => `${row.edgeThroughNode.incidents}/${formatNumber(row.edgeThroughNode.length, 0)}`,
    },
    { header: 'frameViol', value: (row) => String(row.frameViolations) },
    {
      header: 'collinear',
      value: (row) => `${row.collinearOverlap.incidents}/${formatNumber(row.collinearOverlap.length, 0)}`,
    },
    { header: 'edgeLen', value: (row) => formatNumber(row.totalEdgeLength, 0) },
    { header: 'bends', value: (row) => String(row.totalBends) },
    { header: 'overlaps', value: (row) => String(row.overlaps) },
    { header: 'aspectDev', value: (row) => formatNumber(row.aspectDeviation) },
    { header: 'wastedArea', value: (row) => formatNumber(row.wastedArea) },
    { header: 'TOTAL', value: (row) => formatNumber(row.total) },
  ];

  const widths = columns.map((column) =>
    Math.max(column.header.length, ...rows.map((row) => column.value(row).length)),
  );

  const renderRow = (cells: readonly string[]): string => cells.map((cell, i) => cell.padEnd(widths[i]!)).join('  ');

  console.log(renderRow(columns.map((column) => column.header)));
  console.log(widths.map((width) => '-'.repeat(width)).join('  '));
  for (const row of rows) {
    console.log(renderRow(columns.map((column) => column.value(row))));
  }

  const sum = rows.reduce((acc, row) => acc + row.total, 0);
  console.log(`\nsum of totals across ${rows.length} fixtures: ${formatNumber(sum)}`);
};

const server = await createServer({ configFile: false, server: { middlewareMode: true }, logLevel: 'error' });
try {
  const runMod = await server.ssrLoadModule('/dev/layout-bench/run.ts');
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- SSR module loading erases static types; the shape is guaranteed by `./layout-bench/run.ts`'s own export, not checkable here.
  const runBench = runMod['runBench'] as () => readonly BenchRow[];
  printTable(runBench());
} finally {
  await server.close();
}
