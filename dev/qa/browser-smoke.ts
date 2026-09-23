#!/usr/bin/env node
/**
 * Real-browser smoke check for the published samples.
 *
 * Usage:
 *   pnpm dev                            # wrangler (assets) + sample server, via portless
 *   node dev/qa/browser-smoke.ts https://sample.dev-process-kit.localhost
 *
 * Drives the repo's `agent-browser` devDependency (headless, shared agent profile
 * per the browser-ops skill) and fails when a sample reports a page error or
 * renders the template error banner.
 */
import { execFileSync } from 'node:child_process';
import * as v from 'valibot';

const base = process.argv[2];
if (base === undefined) {
  console.error('usage: node dev/qa/browser-smoke.ts <sample-server-url>');
  process.exit(2);
}

/** Sample page → the template element it renders. */
const SAMPLES = [
  ['prototype', 'prototype'],
  ['usm', 'usm'],
  ['event-storming', 'event-storming'],
  ['example-mapping', 'example-mapping'],
  ['grill', 'grill'],
  ['diagrams', 'plain'],
  ['design-doc', 'plain'],
  ['architecture', 'plain'],
  ['ddd-primer', 'plain'],
] as const;
const SESSION = process.env['AGENT_BROWSER_SESSION'] ?? 'browser-ops';
const PROFILE = process.env['AGENT_BROWSER_PROFILE'] ?? `${process.env['HOME']}/.config/agent-browser/profiles/shared`;

const ab = (...args: readonly string[]): string =>
  execFileSync('pnpm', ['exec', 'agent-browser', '--session', SESSION, '--profile', PROFILE, ...args], {
    encoding: 'utf8',
  });

/** The probe result is external input: validate it instead of trusting its shape. */
const probeSchema = v.object({ banner: v.boolean(), rail: v.boolean() });

/** Reads `{ banner, rail }` out of the template element, or `null` when the probe failed. */
const probeState = (template: string): { banner: boolean; rail: boolean } | null => {
  try {
    const raw = ab(
      'eval',
      `(() => { const el = document.querySelector('dpk-template-${template}'); return JSON.stringify({ banner: !!el?.shadowRoot?.querySelector('.dpk-banner'), rail: !!el?.shadowRoot?.querySelector('dpk-component-comment-panel') }); })()`,
    ).trim();
    const decoded: unknown = JSON.parse(raw);
    const parsed = v.safeParse(probeSchema, typeof decoded === 'string' ? JSON.parse(decoded) : decoded);
    return parsed.success ? parsed.output : null;
  } catch {
    return null;
  }
};

let failed = 0;
for (const [sample, template] of SAMPLES) {
  let errors = '';
  try {
    ab('open', `${base}/${sample}.html`);
    errors = ab('errors').trim();
  } catch (error) {
    errors = String(error);
  }
  const state = probeState(template);
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
