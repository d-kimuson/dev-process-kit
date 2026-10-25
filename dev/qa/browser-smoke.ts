#!/usr/bin/env node
/**
 * Real-browser smoke check for the repository samples.
 *
 * Usage:
 *   pnpm dev                            # dev asset server + sample server, via portless
 *   node dev/qa/browser-smoke.ts https://lp.dev-process-kit.localhost
 *
 * Drives the repo's `agent-browser` devDependency (headless, shared agent profile
 * per the browser-ops skill) and fails when a sample reports a page error or
 * renders the template error banner.
 */
import { execFileSync } from 'node:child_process';
import * as v from 'valibot';

const base = process.argv[2];
if (base === undefined) {
  console.error('usage: node dev/qa/browser-smoke.ts <lp-url>');
  process.exit(2);
}

/**
 * Sample page → the template element it renders, and the page's shape:
 * `'page'` for a `<dpk-page>` holding that template as its one board (the shell
 * — banner, review rail — lives in the page's shadow root), `'standalone'` for
 * a template that is still the page root on its own (none at the moment).
 */
const SAMPLES = [
  ['prototype', 'prototype', 'page'],
  ['usm', 'usm', 'page'],
  ['event-storming', 'event-storming', 'page'],
  ['example-mapping', 'example-mapping', 'page'],
  // English UI (`lang="en"`); every other sample is Japanese.
  ['example-mapping-en', 'example-mapping', 'page'],
  ['grill', 'plain', 'page'],
  ['diagrams', 'plain', 'page'],
  ['design-doc', 'plain', 'page'],
  ['architecture', 'plain', 'page'],
  ['ddd-primer', 'plain', 'page'],
  ['formal-spec', 'plain', 'page'],
  ['slides', 'slides', 'page'],
  ['task-board', 'task-board', 'page'],
  ['delegation-poker', 'delegation-poker', 'page'],
  ['whiteboard', 'whiteboard', 'page'],
] as const;
const SESSION = process.env['AGENT_BROWSER_SESSION'] ?? 'browser-ops';
const PROFILE = process.env['AGENT_BROWSER_PROFILE'] ?? `${process.env['HOME']}/.config/agent-browser/profiles/shared`;

const ab = (...args: readonly string[]): string =>
  execFileSync('pnpm', ['exec', 'agent-browser', '--session', SESSION, '--profile', PROFILE, ...args], {
    encoding: 'utf8',
  });

/** The probe result is external input: validate it instead of trusting its shape. */
const probeSchema = v.object({ banner: v.boolean(), rail: v.boolean() });

/**
 * Reads `{ banner, rail }` out of the shell's shadow root, or `null` when the
 * probe failed. The shell is `<dpk-page>` for a board, the template element
 * itself when it is still the page root on its own.
 */
const probeState = (template: string, shape: 'page' | 'standalone'): { banner: boolean; rail: boolean } | null => {
  const selector = shape === 'page' ? 'dpk-page' : `dpk-view-${template}`;
  try {
    const raw = ab(
      'eval',
      `(() => { const el = document.querySelector('${selector}'); return JSON.stringify({ banner: !!el?.shadowRoot?.querySelector('.dpk-banner'), rail: !!el?.shadowRoot?.querySelector('dpk-comment-panel') }); })()`,
    ).trim();
    const decoded: unknown = JSON.parse(raw);
    const parsed = v.safeParse(probeSchema, typeof decoded === 'string' ? JSON.parse(decoded) : decoded);
    return parsed.success ? parsed.output : null;
  } catch {
    return null;
  }
};

/** Blocks the event loop for `ms`, so the probe can be retried without going async. */
const sleep = (ms: number): void => {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
};

/**
 * A board takes an extra render pass to mount inside its `<dpk-page>` shell
 * (the page connects, then the board registers with it), so the comment
 * panel can still be missing right after `open` returns. Poll briefly rather
 * than fail on that race.
 */
const probeReady = (template: string, shape: 'page' | 'standalone'): { banner: boolean; rail: boolean } | null => {
  let state = probeState(template, shape);
  for (let attempt = 0; attempt < 20 && state !== null && !state.banner && !state.rail; attempt += 1) {
    sleep(150);
    state = probeState(template, shape);
  }
  return state;
};

let failed = 0;
for (const [sample, template, shape] of SAMPLES) {
  let errors = '';
  try {
    ab('open', `${base}/${sample}.html`);
    errors = ab('errors').trim();
  } catch (error) {
    errors = String(error);
  }
  const state = probeReady(template, shape);
  const ok = state !== null && errors === '' && state.banner === false && state.rail === true;
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${sample}: errors=${JSON.stringify(errors)} state=${JSON.stringify(state)}`);
}

try {
  ab('close');
} catch {
  /* the session may already be gone; nothing to clean up */
}

if (failed > 0) {
  console.error(`✗ ${failed} sample(s) failed`);
  process.exit(1);
}
console.log('✔ all samples rendered without page errors');
