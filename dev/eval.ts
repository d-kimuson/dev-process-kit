/**
 * Prints the ER readability appraisal as a table and writes the full JSON
 * report for the tuning loop.
 *
 * Usage:
 *   pnpm eval                 # table + dev/eval/out/report.json
 *   pnpm eval -- --out <dir>  # custom output directory
 *
 * Like `dev/layout-bench.ts`, this loads the repo's extensionless TypeScript
 * through a Vite dev server's SSR module graph, so the appraisal runs the
 * exact same modules the component does.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createServer } from 'vite';

import type { EvalReport, EvalRow } from './eval/run';

const args = process.argv.slice(2);
const outIndex = args.indexOf('--out');
const outDir = outIndex >= 0 ? (args[outIndex + 1] ?? 'dev/eval/out') : 'dev/eval/out';

const format = (value: number, digits = 2): string =>
  value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });

const issueCount = (row: EvalRow): number => {
  const { labels } = row.appraisal;
  return labels.overNode + labels.onBorder + labels.onEdge + labels.overlappingEachOther + labels.offCanvas;
};

const printTable = (rows: readonly EvalRow[]): void => {
  const columns: readonly { readonly header: string; readonly value: (row: EvalRow) => string }[] = [
    { header: 'fixture', value: (row) => row.name },
    { header: 't/e', value: (row) => `${row.tables}/${row.edges}` },
    { header: 'fit%', value: (row) => format(row.appraisal.fitScale * 100, 0) },
    { header: 'idPx', value: (row) => format(row.appraisal.effectiveTableIdPx, 1) },
    { header: 'aspect', value: (row) => format(row.appraisal.world.aspect, 2) },
    { header: 'cross', value: (row) => String(row.appraisal.score.crossings) },
    {
      header: 'inward',
      value: (row) => `${row.appraisal.endpoints.inwardDepartures}/${row.appraisal.endpoints.inwardArrivals}`,
    },
    {
      header: 'ownThru',
      value: (row) =>
        `${row.appraisal.endpoints.throughOwnNode.incidents}/${format(row.appraisal.endpoints.throughOwnNode.length, 0)}`,
    },
    {
      header: 'contact',
      value: (row) => `${row.appraisal.borders.contact.incidents}/${format(row.appraisal.borders.contact.length, 0)}`,
    },
    {
      header: 'near',
      value: (row) =>
        `${row.appraisal.borders.nearContact.incidents}/${format(row.appraisal.borders.nearContact.length, 0)}`,
    },
    {
      header: 'parallel',
      value: (row) =>
        `${row.appraisal.parallel.nearMiss.incidents}/${format(row.appraisal.parallel.nearMiss.length, 0)}`,
    },
    {
      header: 'hug',
      value: (row) =>
        `${row.appraisal.score.outlineHugging.incidents}/${format(row.appraisal.score.outlineHugging.length, 0)}`,
    },
    { header: 'label', value: (row) => String(issueCount(row)) },
    { header: 'detour%', value: (row) => format((row.appraisal.detour.averageRatio - 1) * 100, 0) },
    { header: 'long', value: (row) => String(row.appraisal.detour.longEdges) },
    { header: 'bends', value: (row) => String(row.appraisal.score.totalBends) },
    { header: 'len', value: (row) => format(row.appraisal.score.totalEdgeLength, 0) },
    { header: 'layout', value: (row) => format(row.layoutMs, 1) },
    { header: 'route', value: (row) => format(row.routingMs, 1) },
    { header: 'TOTAL', value: (row) => format(row.appraisal.score.total, 0) },
  ];
  const widths = columns.map((column) =>
    Math.max(column.header.length, ...rows.map((row) => column.value(row).length)),
  );
  const renderRow = (cells: readonly string[]): string => cells.map((cell, i) => cell.padEnd(widths[i]!)).join('  ');
  console.log(renderRow(columns.map((column) => column.header)));
  console.log(widths.map((width) => '-'.repeat(width)).join('  '));
  for (const row of rows) console.log(renderRow(columns.map((column) => column.value(row))));
};

const server = await createServer({ configFile: false, server: { middlewareMode: true }, logLevel: 'error' });
try {
  const mod = await server.ssrLoadModule('/dev/eval/run.ts');
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- SSR module loading erases static types; the shape is guaranteed by `./eval/run.ts`'s own export, not checkable here.
  const runEval = mod['runEval'] as () => EvalReport;
  const report = runEval();
  printTable(report.rows);
  mkdirSync(outDir, { recursive: true });
  const file = join(outDir, 'report.json');
  writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`\nreport: ${file}`);
} finally {
  await server.close();
}
