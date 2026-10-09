#!/usr/bin/env node
/**
 * Headless screenshot matrix for the chaos harness (`sample/chaos/`).
 *
 * For each selected template x fixture x theme x lang, opens the chaos page once and,
 * for every viewport, takes a screenshot — then records whether the template rendered
 * its error banner, `data-chaos-error`, and any page/console errors, into `<out>/report.json`.
 *
 * This is NOT a regression test: it has no expectations and never fails the process on
 * a rendering difference. It is a tool for *looking* at arbitrary data patterns.
 *
 * Usage:
 *   pnpm dev                                            # already running; do not start/stop it
 *   node dev/qa/chaos-capture.ts <sample-base-url> --out <dir> \
 *     [--template a,b] [--fixture x,y] \
 *     [--viewport 1440x900,390x844] [--theme light,dark] [--lang ja,en]
 *
 * Fixtures are discovered from the chaos index page's `window.chaosFixtures`
 * (set by sample/chaos/chaos.js) — nothing here duplicates that list.
 *
 * Drives the repo's `agent-browser` devDependency the same way dev/qa/browser-smoke.ts does.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import * as v from 'valibot';

const USAGE =
  'usage: node dev/qa/chaos-capture.ts <sample-base-url> --out <dir> ' +
  '[--template a,b] [--fixture x,y] [--viewport 1440x900,390x844] [--theme light,dark] [--lang ja,en]';

type Viewport = { readonly width: number; readonly height: number };

type Args = {
  readonly base: string;
  readonly out: string;
  readonly templates: readonly string[] | null;
  readonly fixtures: readonly string[] | null;
  readonly viewports: readonly Viewport[];
  readonly themes: readonly string[];
  readonly langs: readonly string[];
};

const DEFAULT_VIEWPORTS = ['1440x900', '1024x768', '768x1024', '390x844', '320x640'];
const DEFAULT_THEMES = ['light', 'dark'];
const READY_TIMEOUT_MS = 15000;

const parseCsv = (value: string): readonly string[] =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

const parseViewport = (value: string): Viewport => {
  const match = /^(\d+)x(\d+)$/u.exec(value);
  if (match === null) throw new Error(`invalid viewport "${value}", expected "<width>x<height>"`);
  const [, width, height] = match;
  return { width: Number(width), height: Number(height) };
};

const parseArgs = (argv: readonly string[]): Args => {
  const base = argv[0];
  if (base === undefined || base.startsWith('--')) throw new Error(USAGE);

  let out: string | undefined;
  let templates: readonly string[] | null = null;
  let fixtures: readonly string[] | null = null;
  let viewports: readonly string[] = DEFAULT_VIEWPORTS;
  let themes: readonly string[] = DEFAULT_THEMES;
  let langs: readonly string[] = [];

  let index = 1;
  while (index < argv.length) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (flag === undefined || value === undefined) throw new Error(`flag ${flag ?? ''} needs a value\n${USAGE}`);
    if (flag === '--out') out = value;
    else if (flag === '--template') templates = parseCsv(value);
    else if (flag === '--fixture') fixtures = parseCsv(value);
    else if (flag === '--viewport') viewports = parseCsv(value);
    else if (flag === '--theme') themes = parseCsv(value);
    else if (flag === '--lang') langs = parseCsv(value);
    else throw new Error(`unknown flag ${flag}\n${USAGE}`);
    index += 2;
  }
  if (out === undefined) throw new Error(`--out <dir> is required\n${USAGE}`);

  return {
    base: base.replace(/\/+$/u, ''),
    out,
    templates,
    fixtures,
    viewports: viewports.map(parseViewport),
    themes,
    langs,
  };
};

const args = parseArgs(process.argv.slice(2));

const SESSION = process.env['AGENT_BROWSER_SESSION'] ?? 'browser-ops';
const PROFILE = process.env['AGENT_BROWSER_PROFILE'] ?? `${process.env['HOME']}/.config/agent-browser/profiles/shared`;

const ab = (cmdArgs: readonly string[], env?: Record<string, string>): string =>
  execFileSync('pnpm', ['exec', 'agent-browser', '--session', SESSION, '--profile', PROFILE, ...cmdArgs], {
    encoding: 'utf8',
    env: env === undefined ? process.env : { ...process.env, ...env },
  });

/** `agent-browser ... --json` always answers `{ success, data, error }`; `data`'s shape depends on the command. */
const envelopeSchema = v.object({ success: v.boolean(), data: v.unknown() });

const runJson = (cmdArgs: readonly string[]): unknown => {
  const raw = ab([...cmdArgs, '--json']).trim();
  const parsed = v.parse(envelopeSchema, JSON.parse(raw));
  return parsed.data;
};

/** `eval --json`'s `data.result` holds whatever the script returned (here, always a JSON string we re-parse). */
const evalDataSchema = v.object({ result: v.unknown() });

const evalJson = <T>(schema: v.GenericSchema<unknown, T>, script: string): T => {
  const data = v.parse(evalDataSchema, runJson(['eval', script]));
  const resultText = v.parse(v.string(), data.result);
  return v.parse(schema, JSON.parse(resultText));
};

// Entries, not `v.record`: valibot's record drops a `prototype` key, which is a template name here.
const fixturesSchema = v.array(v.tuple([v.string(), v.array(v.string())]));

/** Reads `window.chaosFixtures` off the chaos index page — the one place this list is defined. */

const probeSchema = v.object({
  banner: v.boolean(),
  chaosError: v.nullable(v.string()),
  chaosStale: v.nullable(v.string()),
});

const probe = (): v.InferOutput<typeof probeSchema> =>
  evalJson(
    probeSchema,
    `JSON.stringify({
      banner: !!document.querySelector('[data-template]')?.shadowRoot?.querySelector('.dpk-banner'),
      chaosError: document.documentElement.dataset.chaosError ?? null,
      chaosStale: document.documentElement.dataset.chaosStale ?? null,
    })`,
  );

const readySchema = v.object({ ready: v.boolean(), error: v.boolean() });

/** `data-chaos-ready` / `data-chaos-error`, read once. */
const readyState = (): { readonly ready: boolean; readonly error: boolean } =>
  evalJson(
    readySchema,
    `JSON.stringify({
      ready: document.documentElement.dataset.chaosReady !== undefined,
      error: document.documentElement.dataset.chaosError !== undefined,
    })`,
  );

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const POLL_INTERVAL_MS = 300;

/**
 * Polls `data-chaos-ready`/`data-chaos-error` with plain `eval` calls instead of `agent-browser wait
 * --fn`: against the installed agent-browser 0.37.1, a `wait --fn` call that has to poll for more than
 * a beat reliably triggers a background Chrome restart partway through (`restartedBackground: true`)
 * that swaps the tab for `about:blank`, so the condition then never becomes true and every capture
 * times out — reproduced with `document.title.length > 0`, which is just as unconditionally true as
 * `chaosReady`'s eventual value, and still never resolved. Short, independent `eval` round-trips do not
 * hit this; this loop is slower per check but actually reflects the page's state.
 */
const waitForReady = async (timeoutMs: number): Promise<boolean> => {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const state = readyState();
    if (state.ready || state.error) return true;
    if (Date.now() >= deadline) return false;
    await sleep(POLL_INTERVAL_MS);
  }
};

// `console --clear --json` drops the `messages` field entirely instead of reporting what it
// cleared, and `errors --clear` does not actually empty the buffer (both observed against the
// installed agent-browser 0.37.1) — so neither read here ever passes `--clear`. The console
// buffer resets on some navigations but not all (a restarted daemon keeps it), so each capture
// logs a mark before it navigates and reads only what came after the last mark; the
// (cumulative, session-wide) errors buffer is diffed against `seenErrorTexts` below instead,
// to attribute each error to the first capture that observed it.
const consoleMessageSchema = v.object({ type: v.string(), text: v.string() });
const consoleDataSchema = v.object({ messages: v.array(consoleMessageSchema) });

const consoleMessages = (): readonly { readonly type: string; readonly text: string }[] =>
  v.parse(consoleDataSchema, runJson(['console'])).messages;

const CONSOLE_MARK = 'chaos-capture: next capture';

/** Logs the mark this capture's console errors are read after. */
const markConsole = (): void => {
  ab(['eval', `console.log(${JSON.stringify(CONSOLE_MARK)})`]);
};

/** The console errors logged since the last mark (all of them when a navigation reset the buffer). */
const consoleErrorsSinceMark = (): readonly string[] => {
  const messages = consoleMessages();
  const mark = messages.map((m) => m.text).lastIndexOf(CONSOLE_MARK);
  return messages
    .slice(mark + 1)
    .filter((m) => m.type === 'error')
    .map((m) => m.text);
};

const errorItemSchema = v.object({ text: v.string() });
const errorsDataSchema = v.object({ errors: v.array(errorItemSchema) });

const pageErrors = (): readonly { readonly text: string }[] => v.parse(errorsDataSchema, runJson(['errors'])).errors;

const seenErrorTexts = new Set<string>();

/** This capture's new page errors: whatever is in the (session-wide, never-cleared) buffer that wasn't already seen. */
const newPageErrors = (): readonly string[] => {
  const texts = pageErrors().map((e) => e.text);
  const fresh = texts.filter((text) => !seenErrorTexts.has(text));
  for (const text of texts) seenErrorTexts.add(text);
  return fresh;
};

const discoverFixtures = async (): Promise<Record<string, readonly string[]>> => {
  ab(['open', `${args.base}/chaos/`]);
  // The index imports every fixture module before it publishes the list; reading it earlier drops templates.
  if (!(await waitForReady(READY_TIMEOUT_MS))) throw new Error('the chaos index never became ready');
  for (const message of consoleMessages().filter((m) => m.type === 'error')) console.error(message.text);
  return Object.fromEntries(evalJson(fixturesSchema, 'JSON.stringify(Object.entries(window.chaosFixtures ?? {}))'));
};

const settle = (): void => {
  ab(['eval', 'new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(1))))']);
};

type CaptureResult = {
  readonly template: string;
  readonly fixture: string;
  readonly theme: string;
  readonly lang: string;
  readonly viewport: string;
  readonly screenshot: string;
  readonly banner: boolean;
  readonly chaosError: string | null;
  /** `<restored>/<rejected>` draft actions injected as stale, when the fixture's draft had any. */
  readonly chaosStale: string | null;
  readonly timedOut: boolean;
  readonly crashed: boolean;
  readonly consoleErrors: readonly string[];
  readonly pageErrors: readonly string[];
};

const results: CaptureResult[] = [];

// A single combination can hard-fail (e.g. the underlying Chrome process dies mid-capture)
// in a way no try/catch inside it anticipated. Recording that as one flagged result and moving
// on — rather than letting the exception escape — is what keeps one bad combination from losing
// every result captured before it and skipping the `close` + report.json write below.
const recordCrash = (template: string, fixture: string, theme: string, lang: string, error: unknown): void => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`CRASHED ${template}/${fixture} ${theme} ${lang}: ${message}`);
  results.push({
    template,
    fixture,
    theme,
    lang,
    viewport: 'n/a',
    screenshot: '',
    banner: false,
    chaosError: `capture crashed: ${message}`,
    chaosStale: null,
    timedOut: false,
    crashed: true,
    consoleErrors: [],
    pageErrors: [],
  });
};

try {
  const discovered = await discoverFixtures();
  const templates = (args.templates ?? Object.keys(discovered)).filter((template) => template in discovered);
  console.log(`discovered fixtures for: ${Object.keys(discovered).join(', ') || '(none)'}`);

  for (const template of templates) {
    const allFixtures = discovered[template] ?? [];
    const selectedFixtures =
      args.fixtures === null ? allFixtures : allFixtures.filter((f) => args.fixtures?.includes(f));

    for (const fixture of selectedFixtures) {
      for (const theme of args.themes) {
        // lang: [] means "the fixture's own lang only" — one pass, no `&lang=` override.
        const langPasses: readonly (string | null)[] = args.langs.length === 0 ? [null] : args.langs;

        for (const lang of langPasses) {
          try {
            const url = new URL(`${args.base}/chaos/`);
            url.searchParams.set('template', template);
            url.searchParams.set('fixture', fixture);
            url.searchParams.set('theme', theme);
            if (lang !== null) url.searchParams.set('lang', lang);

            markConsole();
            ab(['open', url.href]);
            const timedOut = !(await waitForReady(READY_TIMEOUT_MS));

            const state = timedOut
              ? { banner: false, chaosError: 'timed out waiting for data-chaos-ready', chaosStale: null }
              : probe();
            const consoleErrorTexts = consoleErrorsSinceMark();
            const pageErrorTexts = newPageErrors();
            const effectiveLang =
              lang ?? evalJson(v.string(), 'JSON.stringify(document.documentElement.dataset.chaosLang ?? "en")');

            for (const viewport of args.viewports) {
              ab(['set', 'viewport', String(viewport.width), String(viewport.height)]);
              settle();
              const name = `${viewport.width}x${viewport.height}-${theme}-${effectiveLang}.png`;
              const path = join(args.out, template, fixture, name);
              mkdirSync(dirname(path), { recursive: true });
              ab(['screenshot', path]);

              const result: CaptureResult = {
                template,
                fixture,
                theme,
                lang: effectiveLang,
                viewport: `${viewport.width}x${viewport.height}`,
                screenshot: path,
                banner: state.banner,
                chaosError: state.chaosError,
                chaosStale: state.chaosStale,
                timedOut,
                crashed: false,
                consoleErrors: consoleErrorTexts,
                pageErrors: pageErrorTexts,
              };
              results.push(result);
              console.log(
                `${timedOut ? 'TIMEOUT' : state.chaosError !== null ? 'ERROR' : 'OK'} ${template}/${fixture} ${theme} ${effectiveLang} ${result.viewport}`,
              );
            }
          } catch (error) {
            recordCrash(template, fixture, theme, lang ?? '(fixture default)', error);
          }
        }
      }
    }
  }
} finally {
  try {
    ab(['close']);
  } catch {
    /* the session may already be gone; nothing to clean up */
  }

  mkdirSync(args.out, { recursive: true });
  writeFileSync(
    join(args.out, 'report.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2),
  );
}

const failures = results.filter((r) => r.timedOut || r.crashed || r.chaosError !== null || r.banner);
console.log(
  `\n${results.length} capture(s), ${failures.length} flagged (banner/error/timeout/crash). See ${join(args.out, 'report.json')}`,
);
