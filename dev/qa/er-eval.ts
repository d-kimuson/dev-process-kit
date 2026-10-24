#!/usr/bin/env node
/**
 * Real-browser half of the ER readability appraisal.
 *
 * Opens `sample/er-eval.html`, which renders the er-complex schema without the
 * page shell and records initial layout/render/long-task numbers plus a
 * hover-label audit. This script then captures:
 *
 * - `fit.png`: the whole diagram at its default fit
 * - `tile-*.png`: legible tiles over the whole world (default 50%)
 * - `hover.png`: one table highlighted, so cardinality/label placement is visible
 *
 * and writes `browser.json` next to the deterministic `report.json`.
 *
 * Usage:
 *   pnpm dev
 *   node dev/qa/er-eval.ts [base-url] [--out <dir>]
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import * as v from 'valibot';

const args = process.argv.slice(2);
const outIndex = args.indexOf('--out');
const outDir = resolve(outIndex >= 0 ? (args[outIndex + 1] ?? 'dev/eval/out') : 'dev/eval/out');
const base = (
  args.find((arg, index) => !arg.startsWith('--') && index !== outIndex + 1) ??
  'https://sample.dev-process-kit.localhost'
).replace(/\/+$/u, '');

const SESSION = process.env['AGENT_BROWSER_SESSION'] ?? 'browser-ops';
const PROFILE = process.env['AGENT_BROWSER_PROFILE'] ?? `${process.env['HOME']}/.config/agent-browser/profiles/shared`;

const ab = (cmdArgs: readonly string[]): string =>
  execFileSync('pnpm', ['exec', 'agent-browser', '--session', SESSION, '--profile', PROFILE, ...cmdArgs], {
    encoding: 'utf8',
  });

const envelopeSchema = v.object({ success: v.boolean(), data: v.unknown() });
const evalDataSchema = v.object({ result: v.unknown() });

const evalJson = (script: string): unknown => {
  const parsed = v.parse(envelopeSchema, JSON.parse(ab(['eval', script, '--json']).trim()));
  const data = v.parse(evalDataSchema, parsed.data);
  const text = v.parse(v.string(), data.result);
  return JSON.parse(text) as unknown;
};

const sleep = (ms: number): void => {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
};

const statusSchema = v.object({ ready: v.boolean(), error: v.nullable(v.string()) });

const waitForReady = (): { readonly ready: boolean; readonly error: string | null } => {
  let state: { ready: boolean; error: string | null } = { ready: false, error: null };
  for (let attempt = 0; attempt < 80; attempt += 1) {
    state = v.parse(
      statusSchema,
      evalJson(`JSON.stringify({
        ready: document.documentElement.dataset.erEvalReady === 'true',
        error: document.documentElement.dataset.erEvalError ?? null,
      })`),
    );
    if (state.ready || state.error !== null) return state;
    sleep(200);
  }
  return state;
};

const reportSchema = v.object({
  status: v.string(),
  createMs: v.optional(v.number()),
  updateMs: v.optional(v.number()),
  readyMs: v.optional(v.number()),
  longTasks: v.optional(v.array(v.object({ start: v.number(), duration: v.number() }))),
  errors: v.optional(v.array(v.string())),
  metrics: v.optional(
    v.object({
      fitScale: v.number(),
      world: v.nullable(v.object({ width: v.number(), height: v.number() })),
      canvas: v.nullable(v.object({ width: v.number(), height: v.number() })),
      dom: v.object({
        tables: v.number(),
        fields: v.number(),
        edges: v.number(),
        paths: v.number(),
        elements: v.number(),
      }),
      pathCommands: v.number(),
    }),
  ),
  interactions: v.optional(v.array(v.object({ name: v.string(), ms: v.number() }))),
  labelAudit: v.optional(
    v.array(v.object({ edge: v.nullable(v.string()), issue: v.string(), text: v.optional(v.string()) })),
  ),
});

type Report = v.InferOutput<typeof reportSchema>;

const setViewport = (width: number, height: number): void => {
  ab(['set', 'viewport', String(width), String(height)]);
};

/** Pans/zooms the world directly, so screenshots can cover a legible region without fighting the fit controller. */
const setWorld = (scale: number, x: number, y: number): void => {
  evalJson(`(() => {
    const panel = document.querySelector('dpk-er-diagram').shadowRoot.querySelector('dpk-dialog-panel');
    const world = panel.shadowRoot.querySelector('.world');
    const controls = panel.shadowRoot.querySelector('.controls');
    if (controls) controls.hidden = true;
    world.style.transform = 'translate(${-x * scale}px, ${-y * scale}px) scale(${scale})';
    return JSON.stringify({ ok: true });
  })()`);
};

const shot = (name: string): void => {
  const path = join(outDir, name);
  ab(['screenshot', 'dpk-er-diagram', path]);
  console.log(`  shot ${name}`);
};

mkdirSync(outDir, { recursive: true });
// Every run owns the whole capture set. Leaving an earlier run's tiles behind
// silently mixes them into the review input: a stale light-theme tile from a
// different build looks like a current regression (and vice versa).
for (const file of readdirSync(outDir)) {
  if (file === 'fit.png' || file === 'hover.png' || file === 'detail.png' || /^tile-\d+\.png$/u.test(file)) {
    unlinkSync(join(outDir, file));
  }
}

console.log(`open ${base}/er-eval.html`);
ab(['open', `${base}/er-eval.html`]);
setViewport(1600, 1200);
// The sample is dark; the OS/browser preference must not decide the capture.
ab(['set', 'media', 'dark']);
ab(['reload']);
const status = waitForReady();
if (status.error !== null) {
  writeFileSync(join(outDir, 'browser.json'), `${JSON.stringify({ status: 'error', error: status.error }, null, 2)}\n`);
  console.error(`✗ page error: ${status.error}`);
  process.exit(1);
}

const report = v.parse(reportSchema, evalJson('JSON.stringify(window.__erEval)')) as Report;
writeFileSync(join(outDir, 'browser.json'), `${JSON.stringify(report, null, 2)}\n`);

shot('fit.png');
const metrics = report.metrics;
if (metrics?.world !== undefined && metrics.world !== null && metrics.canvas !== null) {
  const scale = 0.55;
  const tileWidth = metrics.canvas.width / scale;
  const tileHeight = metrics.canvas.height / scale;
  const stepY = Math.max(120, tileHeight - 80);
  const xs = [0, ...(metrics.world.width - tileWidth > 80 ? [metrics.world.width - tileWidth] : [])];
  const ys: number[] = [];
  for (let y = 0; y < Math.max(1, metrics.world.height - tileHeight); y += stepY) ys.push(y);
  ys.push(Math.max(0, metrics.world.height - tileHeight));
  let index = 0;
  for (const y of new Set(ys)) {
    for (const x of xs) {
      index += 1;
      setWorld(scale, x, y);
      shot(`tile-${String(index).padStart(2, '0')}.png`);
    }
  }

  // One hovered card, framed near its centre, so the label audit has a visual counterpart.
  evalJson(`(() => {
    const card = document.querySelector('dpk-er-diagram').shadowRoot.querySelectorAll('.er-table')[0];
    card?.dispatchEvent(new PointerEvent('pointerenter', { bubbles: false, composed: true }));
    return JSON.stringify({ ok: true });
  })()`);
  setWorld(0.75, 0, 0);
  shot('hover.png');

  // A true 100% crop around a hub table: the only view in which the 10px
  // cardinality text is at its authored size, so a reviewer can judge label
  // placement and contrast rather than inferring them from a 55% thumbnail.
  const focus = evalJson(`(() => {
    const root = document.querySelector('dpk-er-diagram').shadowRoot;
    const card = root.querySelector('[data-er-table="users"]') ?? root.querySelector('.er-table');
    if (card === null) return JSON.stringify({ x: 0, y: 0 });
    return JSON.stringify({ x: parseFloat(card.style.left) || 0, y: parseFloat(card.style.top) || 0 });
  })()`);
  const focusPoint = v.parse(v.object({ x: v.number(), y: v.number() }), focus);
  setWorld(1, Math.max(0, focusPoint.x - 260), Math.max(0, focusPoint.y - 160));
  shot('detail.png');
}

try {
  ab(['close']);
} catch {
  /* nothing to clean up */
}

const worstTask = Math.max(0, ...(report.longTasks ?? []).map((task) => task.duration));
const slowestAction = Math.max(0, ...(report.interactions ?? []).map((action) => action.ms));
console.log(
  `ready ${(report.readyMs ?? 0).toFixed(0)}ms · create ${(report.createMs ?? 0).toFixed(0)}ms · update ${(report.updateMs ?? 0).toFixed(0)}ms · worst long task ${worstTask.toFixed(0)}ms · slowest interaction ${slowestAction.toFixed(1)}ms`,
);
console.log(`✗ labels flagged: ${(report.labelAudit ?? []).filter((item) => item.issue !== 'ok').length}`);
console.log(`report: ${join(outDir, 'browser.json')}`);
