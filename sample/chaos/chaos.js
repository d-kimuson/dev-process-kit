/**
 * Chaos harness: renders any dev-process-kit template with any registered fixture,
 * the way an agent-generated page would (base data baked into a
 * `<script type="application/json">` child, loaded via `../kit.js`), so the result
 * can be screenshotted headlessly across viewport/theme/lang by `dev/qa/chaos-capture.ts`.
 *
 * Not published: `.github/workflows/pages.yml` only copies top-level `sample/*.html`
 * and `sample/*.js`, so `sample/chaos/**` never reaches GitHub Pages.
 *
 * URL contract: `?template=<name>&fixture=<name>[&theme=light|dark][&lang=ja|en][&notes=on]`.
 * With no `template`, this renders an index of every template x fixture as links.
 *
 * Fixture contract (see `sample/chaos/fixtures/plain.js` for a worked example).
 * `fixtures/components.js` is special-cased: components have no template of their own,
 * so its fixtures render through `plain` and are merged into `plain`'s registry.
 *
 * @typedef {{
 *   description: string,
 *   base: unknown,
 *   slots?: string,
 *   attributes?: Record<string, string>,
 *   lang?: 'ja'|'en',
 *   hash?: string,
 *   draft?: Array<{ type: string, target: string | { type: string, id: string }, payload?: unknown }>,
 *   comments?: Array<[target: string, body: string]>,
 *   prepare?: (el: HTMLElement) => void | Promise<void>,
 * }} Fixture
 */

import { loadKit } from '../kit.js';

/** Every template this kit ships, in the order `docs/templates/*` lists them. */
export const TEMPLATES = [
  'prototype',
  'usm',
  'event-storming',
  'example-mapping',
  'grill',
  'plain',
  'slides',
  'task-board',
  'delegation-poker',
  'whiteboard',
];

const app = document.getElementById('app');

/** Escapes `</` so JSON embedded inside a `<script type="application/json">` string can't close the tag early. */
const escapeJsonForScript = (json) => json.replace(/<\//g, '<\\/');

/** Loads one `sample/chaos/fixtures/*.js` registry module, or `null` when there is none (yet). */
const loadFixtureModule = async (name) => {
  try {
    const module = await import(`./fixtures/${name}.js`);
    return module.default ?? null;
  } catch (error) {
    console.error(`chaos: could not load fixtures/${name}.js`, error);
    return null;
  }
};

/**
 * Loads `sample/chaos/fixtures/<template>.js`, or `null` when there is none (yet).
 *
 * Components aren't templates, so `fixtures/components.js` (diagrams and standalone
 * components, rendered through `slot="main"`) has no template of its own: its fixtures
 * are merged into `plain`'s, the template that hosts arbitrary slotted content.
 */
const loadFixtures = async (template) => {
  const own = await loadFixtureModule(template);
  if (template !== 'plain') return own;
  const components = await loadFixtureModule('components');
  if (components === null) return own;
  return { ...own, ...components };
};

/** `{ template: [fixtureName, ...] }` for every template that has a fixture file. Exposed for chaos-capture.ts. */
const discoverAll = async () => {
  const entries = await Promise.all(TEMPLATES.map(async (template) => [template, await loadFixtures(template)]));
  /** @type {Record<string, string[]>} */
  const discovered = {};
  for (const [template, fixtures] of entries) {
    if (fixtures !== null) discovered[template] = Object.keys(fixtures);
  }
  return discovered;
};

const link = (href, text) => {
  const a = document.createElement('a');
  a.href = href;
  a.textContent = text;
  return a;
};

/** No `template`: list every template x fixture as links. */
const renderIndex = async () => {
  const discovered = await discoverAll();
  window.chaosFixtures = discovered;

  const title = document.createElement('h1');
  title.textContent = 'dev-process-kit — chaos harness';
  app.append(title);

  const intro = document.createElement('p');
  intro.textContent = 'Pick a template x fixture to render it in isolation, with memory-only storage.';
  app.append(intro);

  for (const template of TEMPLATES) {
    const fixtureNames = discovered[template];
    const section = document.createElement('section');
    const heading = document.createElement('h2');
    heading.textContent = template;
    section.append(heading);

    if (fixtureNames === undefined) {
      const empty = document.createElement('p');
      empty.className = 'chaos-empty';
      empty.textContent = '(no fixtures yet)';
      section.append(empty);
    } else {
      const list = document.createElement('ul');
      for (const fixtureName of fixtureNames) {
        const item = document.createElement('li');
        item.append(link(`?template=${template}&fixture=${fixtureName}`, fixtureName));
        list.append(item);
      }
      section.append(list);
    }
    app.append(section);
  }

  document.documentElement.dataset.chaosReady = 'true';
};

/** A `template` given but no `fixture`: list that template's fixtures as a convenience. */
const renderFixtureList = (template, fixtures) => {
  window.chaosFixtures = { [template]: Object.keys(fixtures) };

  const title = document.createElement('h1');
  title.textContent = `${template} — fixtures`;
  app.append(title);

  const list = document.createElement('ul');
  for (const [name, fixture] of Object.entries(fixtures)) {
    const item = document.createElement('li');
    item.append(link(`?template=${template}&fixture=${name}`, name));
    if (fixture.description) item.append(document.createTextNode(` — ${fixture.description}`));
    list.append(item);
  }
  app.append(list);

  document.documentElement.dataset.chaosReady = 'true';
};

const renderError = (message) => {
  document.documentElement.dataset.chaosError = message;
  const p = document.createElement('p');
  p.setAttribute('role', 'alert');
  p.textContent = message;
  app.append(p);
};

const toTargetObject = (target) => {
  if (typeof target !== 'string') return target;
  const separator = target.indexOf(':');
  return { type: target.slice(0, separator), id: target.slice(separator + 1) };
};

/**
 * Dispatches the fixture's draft one action at a time. `dispatch()` rejects an action whose target
 * is missing, but a real page meets such actions all the time: a draft persisted against an older
 * base. Those are restored the way storage restores them (`importDraft`), so they show up stale.
 * `data-chaos-stale` counts them, so a fixture typo is still visible in the report.
 */
const applyDraft = (el, draft) => {
  const rejected = [];
  for (const input of draft) {
    const outcome = el.api.dispatch(input);
    if (!outcome.ok) rejected.push(input);
  }
  if (rejected.length === 0) return;
  const restored = rejected.map((input, index) => ({
    id: `chaos-stale-${index}`,
    type: input.type,
    target: toTargetObject(input.target),
    payload: input.payload ?? {},
    createdAt: new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString(),
  }));
  el.api.importDraft([...el.api.actions, ...restored]);
  const kept = el.api.actions.filter((action) => action.id.startsWith('chaos-stale-')).length;
  document.documentElement.dataset.chaosStale = `${kept}/${rejected.length}`;
};

/** Renders one template x fixture combination into `#app`, applying query overrides, then flags readiness. */
const renderFixture = async (template, fixtureName, fixture, overrides) => {
  const explicitLang = overrides.lang ?? fixture.lang;
  if (explicitLang) document.documentElement.lang = explicitLang;
  document.documentElement.dataset.chaosLang = explicitLang ?? 'en';

  // A fresh navigation starts with an empty hash; set it before the element connects so the
  // template's initial navigation state (read once, on connect) picks it up.
  location.hash = fixture.hash ?? '';

  const el = document.createElement(`dpk-template-${template}`);
  el.setAttribute('storage', 'memory');
  el.setAttribute('storage-key', `chaos:${template}:${fixtureName}`);
  if (explicitLang) el.setAttribute('lang', explicitLang);

  for (const [name, value] of Object.entries(fixture.attributes ?? {})) {
    el.setAttribute(name, value);
  }
  if (overrides.theme) el.setAttribute('theme', overrides.theme);
  if (overrides.notes === 'on') el.setAttribute('notes', 'on');

  const baseJson = escapeJsonForScript(JSON.stringify(fixture.base ?? {}));
  el.innerHTML = `<script type="application/json">${baseJson}</script>${fixture.slots ?? ''}`;

  app.append(el);

  try {
    await loadKit([`templates/${template}.js`, 'components.js']);

    if (typeof el.api === 'undefined') {
      throw new Error(`dpk-template-${template} did not upgrade — unknown custom element or load failure`);
    }
    await el.api.ready;

    if (fixture.draft && fixture.draft.length > 0) applyDraft(el, fixture.draft);

    for (const [target, body] of fixture.comments ?? []) {
      const outcome = el.api.comment(target, body);
      if (!outcome.ok) {
        console.error('chaos: comment dispatch failed', outcome.issues);
        document.documentElement.dataset.chaosError = JSON.stringify(outcome.issues);
      }
    }

    await fixture.prepare?.(el);

    // Reached the end of the flow: the page is as rendered as this fixture gets, even if a
    // draft/comment above was rejected (that only sets chaosError; it does not block capture).
    document.documentElement.dataset.chaosReady = 'true';
  } catch (error) {
    console.error('chaos: failed to render fixture', error);
    document.documentElement.dataset.chaosError = String(error instanceof Error ? error.message : error);
  }
};

const main = async () => {
  const params = new URLSearchParams(location.search);
  const template = params.get('template');
  const fixtureName = params.get('fixture');
  const overrides = {
    theme: params.get('theme'),
    lang: params.get('lang'),
    notes: params.get('notes'),
  };

  if (template === null) {
    await renderIndex();
    return;
  }
  if (!TEMPLATES.includes(template)) {
    renderError(`unknown template "${template}"`);
    return;
  }

  const fixtures = await loadFixtures(template);
  if (fixtures === null) {
    renderError(`no fixtures registered for template "${template}" (sample/chaos/fixtures/${template}.js)`);
    return;
  }

  if (fixtureName === null) {
    renderFixtureList(template, fixtures);
    return;
  }

  const fixture = fixtures[fixtureName];
  if (fixture === undefined) {
    renderError(`unknown fixture "${fixtureName}" for template "${template}"`);
    return;
  }

  await renderFixture(template, fixtureName, fixture, overrides);
};

void main();
