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
 * Sample page → the template it renders, and the shape that owns its shell:
 * `'app'` for a `<dpk-app>` document of pages (the shell — banner, review rail,
 * header row — lives in the app's shadow root), `'page'` for a bare `<dpk-page>`
 * sample (shell in the page's shadow root; none at the moment), and
 * `'standalone'` for a template that is still the page root on its own (none at
 * the moment).
 *
 * Every landing sample is an `'app'` now: the chrome moved up from the page to
 * the document that owns it, so the app is where the banner and the review rail
 * are — and it also has to have rendered the board inside its page.
 */
const SAMPLES = [
  // The catalog: one `<dpk-app>` with `page-nav="none"`, so it draws no page
  // switcher, but it does own the shell its page renders under.
  ['index', 'plain', 'app'],
  ['prototype', 'prototype', 'app'],
  ['usm', 'usm', 'app'],
  ['event-storming', 'event-storming', 'app'],
  ['example-mapping', 'example-mapping', 'app'],
  // English UI (`lang="en"`); every other sample is Japanese.
  ['example-mapping-en', 'example-mapping', 'app'],
  ['grill', 'plain', 'app'],
  ['diagrams', 'plain', 'app'],
  ['design-doc', 'plain', 'app'],
  ['architecture', 'plain', 'app'],
  ['ddd-primer', 'plain', 'app'],
  ['formal-spec', 'plain', 'app'],
  ['slides', 'slides', 'app'],
  ['task-board', 'task-board', 'app'],
  ['delegation-poker', 'delegation-poker', 'app'],
  ['whiteboard', 'whiteboard', 'app'],
] as const;
const SESSION = process.env['AGENT_BROWSER_SESSION'] ?? 'browser-ops';
const PROFILE = process.env['AGENT_BROWSER_PROFILE'] ?? `${process.env['HOME']}/.config/agent-browser/profiles/shared`;

const ab = (...args: readonly string[]): string =>
  execFileSync('pnpm', ['exec', 'agent-browser', '--session', SESSION, '--profile', PROFILE, ...args], {
    encoding: 'utf8',
  });

/** A sample's shape: a `<dpk-page>`-hosted board, an `<dpk-app>` of pages, or a bare template. */
type Shape = 'page' | 'app' | 'standalone';

/**
 * The probe result is external input: validate it instead of trusting its
 * shape. `pages`/`rendered` count the app's pages and those whose content
 * rendered; they are `0` for a sample that is not an app.
 */
const probeSchema = v.object({
  banner: v.boolean(),
  rail: v.boolean(),
  pages: v.number(),
  rendered: v.number(),
});

type ProbeState = v.InferOutput<typeof probeSchema>;

/**
 * Reads `{ banner, rail, pages, rendered }` out of the shell's shadow root, or
 * `null` when the probe failed. The shell is `<dpk-page>` for a board,
 * `<dpk-app>` for a document of pages, and the template element itself when it
 * is still the page root on its own. The same two things are read in every
 * shape — the error banner, and the review rail the shell mounts — so an app is
 * held to what a page is, plus its pages having rendered.
 */
const probeState = (template: string, shape: Shape): ProbeState | null => {
  const scope = shape === 'page' ? 'dpk-page' : shape === 'app' ? 'dpk-app' : `dpk-view-${template}`;
  try {
    const raw = ab(
      'eval',
      `(() => {
        const el = document.querySelector('${scope}');
        const shadow = el?.shadowRoot;
        const pages = [...document.querySelectorAll('${scope} > dpk-page')];
        const rendered = pages.filter((page) => page.firstElementChild?.shadowRoot).length;
        return JSON.stringify({
          banner: !!shadow?.querySelector('.dpk-banner'),
          rail: !!shadow?.querySelector('dpk-comment-panel'),
          pages: pages.length,
          rendered,
        });
      })()`,
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
 * (the page connects, then the board registers with it) — and an app's pages
 * likewise need a pass each to upgrade and render — so the comment panel can
 * still be missing right after `open` returns. Poll briefly rather than fail on
 * that race.
 */
const probeReady = (template: string, shape: Shape): ProbeState | null => {
  let state = probeState(template, shape);
  const missing = (ready: ProbeState | null): boolean =>
    ready === null || (!ready.banner && !ready.rail) || (shape === 'app' && ready.rendered === 0);
  for (let attempt = 0; attempt < 20 && missing(state); attempt += 1) {
    sleep(150);
    state = probeState(template, shape);
  }
  return state;
};

/** Whether a probe says the sample rendered as its shape promises. */
const healthy = (state: ProbeState | null, shape: Shape): boolean =>
  state !== null &&
  state.banner === false &&
  state.rail === true &&
  // An app holds pages, and at least one of them has to have rendered its board.
  (shape !== 'app' || (state.pages > 0 && state.rendered > 0));

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
  const ok = state !== null && errors === '' && healthy(state, shape);
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
