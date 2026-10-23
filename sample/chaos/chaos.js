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
 * `fixtures/components.js` and `fixtures/grill.js` are special-cased: components have
 * no template of their own, and grill (ADR 20261016_grill-in-core) is a feature of
 * every template's shell rather than a template of its own, so both render through
 * `plain` and are merged into `plain`'s registry.
 *
 * @typedef {{
 *   description: string,
 *   base: unknown,
 *   grill?: unknown,
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

/**
 * Whiteboard, Event Storming and Example Mapping are diagrams, not templates
 * (ADR 20261023_diagram-as-board): no `dpk-template-<name>` tag or
 * `templates/<name>.js` entry exists for them any more — each is its own
 * board (`<dpk-${name}>`, unhosted here — `board` left unset, the way
 * `sample/<name>.html` hosts it under `<dpk-page>` with `board`/`variant`
 * set instead), bundled only in `components.js`. This harness still renders
 * one per fixture, same as any template, so they stay listed in `TEMPLATES`.
 */
const DIAGRAM_BOARDS = new Set(['whiteboard', 'event-storming', 'example-mapping']);

/** Every template (plus every diagram-as-board) this kit ships, in `docs/` order. */
export const TEMPLATES = [
  'prototype',
  'usm',
  'event-storming',
  'example-mapping',
  'plain',
  'slides',
  'task-board',
  'delegation-poker',
  'whiteboard',
];

/** `dpk-<name>` for a diagram-as-board, `dpk-template-<name>` for an actual template. */
const tagFor = (template) => (DIAGRAM_BOARDS.has(template) ? `dpk-${template}` : `dpk-template-${template}`);

/** The entries a template needs loaded: its own per-template entry, or none for a diagram-as-board. */
const entriesFor = (template) =>
  DIAGRAM_BOARDS.has(template) ? ['components.js'] : [`templates/${template}.js`, 'components.js'];

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
 * components, rendered through `slot="main"`) has no template of its own; neither is
 * grill (core now, not a template — see the file-level comment). Both sets of fixtures
 * are merged into `plain`'s, the template that hosts arbitrary slotted content.
 */
const loadFixtures = async (template) => {
  const own = await loadFixtureModule(template);
  if (template !== 'plain') return own;
  const components = await loadFixtureModule('components');
  const grill = await loadFixtureModule('grill');
  return { ...own, ...components, ...grill };
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
 * Wraps a fixture's plain domain target (the vocabulary its own `actions.ts`/`apply.ts` uses,
 * e.g. `{type:'element', id:'n1'}`) into the component-element-action envelope a diagram-as-board
 * (ADR 20261023_diagram-as-board) actually accepts through `.api` when unhosted: its own
 * `TemplateDefinition` (`diagramBoardDefinition`) registers no actions of its own, so every
 * mutation must read as `{type:'element', id:'<providerId>/<domainType>/<domainId>'}` — the same
 * shape `ElementChromeBase#dispatchElementAction`/`commentRef` build, and the one its own
 * `reduce.ts#nativeTargetOf` unwraps back into the plain domain target before replaying it. The
 * "kind" segment is the domain target's own `type`, verbatim — not a display label like
 * `commentRef`'s own call sites sometimes use (event storming's notes answer to `element`, never
 * the human-facing `note`), which is why this reaches into the *target itself* rather than a
 * per-component lookup table.
 */
const elementTarget = (providerId, target) => {
  const { type, id } = toTargetObject(target);
  return { type: 'element', id: `${providerId}/${type}/${id}` };
};

/**
 * `commentRef`'s own "kind" label mostly matches the domain target type its component's
 * `actions.ts` uses (whiteboard, example-mapping — verified call-by-call), so a fixture's
 * `comments` entry (already written in that domain vocabulary, e.g. `item:idea-1`) wraps the
 * same way a draft target does. Event storming's individual notes are the one exception: its
 * domain target type is `element` (every note, command, hotspot or actor alike), but
 * `commentRef('note', …)` gives it the human-facing kind `note` instead — so a fixture comment on
 * one (`element:customer`) needs that one kind translated to line up with the option
 * `commentTargets` actually offers, or it would dispatch fine (comments take any target) but never
 * highlight the note it was meant for.
 */
const COMMENT_KIND_OVERRIDES = { 'event-storming': { element: 'note' } };

const commentTarget = (template, providerId, target) => {
  if (providerId === null) return target;
  const { type, id } = toTargetObject(target);
  const kind = COMMENT_KIND_OVERRIDES[template]?.[type] ?? type;
  return { type: 'element', id: `${providerId}/${kind}/${id}` };
};

/**
 * Dispatches the fixture's draft one action at a time. `dispatch()` rejects an action whose target
 * is missing, but a real page meets such actions all the time: a draft persisted against an older
 * base. Those are restored the way storage restores them (`importDraft`), so they show up stale.
 * `data-chaos-stale` counts them, so a fixture typo is still visible in the report.
 *
 * `providerId` is non-null only for a diagram-as-board (`el.id`, set by `renderFixture`): every
 * input's target is wrapped through `elementTarget` first, matching what `.api` demands unhosted —
 * `reduce.ts#nativeTargetOf` reads the domain type back out of its "kind" segment verbatim, so
 * (unlike `commentTarget`) this never needs event storming's `note` translation.
 */
const applyDraft = (el, draft, providerId) => {
  const wrap = (target) => elementTarget(providerId, target);
  const rejected = [];
  for (const input of draft) {
    const outcome = el.api.dispatch(providerId === null ? input : { ...input, target: wrap(input.target) });
    if (!outcome.ok) rejected.push(input);
  }
  if (rejected.length === 0) return;
  const restored = rejected.map((input, index) => ({
    id: `chaos-stale-${index}`,
    type: input.type,
    target: providerId === null ? toTargetObject(input.target) : wrap(input.target),
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

  const tag = tagFor(template);
  const el = document.createElement(tag);
  el.setAttribute('storage', 'memory');
  el.setAttribute('storage-key', `chaos:${template}:${fixtureName}`);
  if (explicitLang) el.setAttribute('lang', explicitLang);

  // A diagram-as-board (ADR 20261023_diagram-as-board) ignores `storage`/`storage-key`
  // when unhosted: ElementChromeBase's own board controller falls back to real
  // `localStorage`, under a key that is unique per template x fixture (it folds in the
  // URL's query string) but never cleared. Drop any draft a previous capture run left
  // there, so this fixture starts from its own `base`.
  //
  // `ElementChromeBase` also reads its `id` attribute once, in its constructor, to scope its
  // own comment targets and component element actions (ADR 20260924_component-element-actions):
  // with none, both are disabled outright. Give it one before it upgrades, and use it as the
  // provider id `applyDraft`/`commentTarget` wrap every fixture target with below.
  const providerId = DIAGRAM_BOARDS.has(template) ? template : null;
  if (providerId !== null) {
    el.setAttribute('id', providerId);
    try {
      localStorage.removeItem(`dev-process-kit:draft:${location.pathname}${location.search}:${tag}`);
    } catch {
      /* storage blocked (private mode, cookies off): nothing to clear */
    }
  }

  for (const [name, value] of Object.entries(fixture.attributes ?? {})) {
    el.setAttribute(name, value);
  }
  if (overrides.theme) el.setAttribute('theme', overrides.theme);
  if (overrides.notes === 'on') el.setAttribute('notes', 'on');

  const baseJson = escapeJsonForScript(JSON.stringify(fixture.base ?? {}));
  const grillScript =
    fixture.grill === undefined
      ? ''
      : `<script type="application/json" data-dpk-grill>${escapeJsonForScript(JSON.stringify(fixture.grill))}</script>`;
  el.innerHTML = `<script type="application/json">${baseJson}</script>${grillScript}${fixture.slots ?? ''}`;

  app.append(el);

  try {
    await loadKit(entriesFor(template));

    if (typeof el.api === 'undefined') {
      throw new Error(`${tag} did not upgrade — unknown custom element or load failure`);
    }
    await el.api.ready;

    if (fixture.draft && fixture.draft.length > 0) applyDraft(el, fixture.draft, providerId);

    for (const [target, body] of fixture.comments ?? []) {
      const outcome = el.api.comment(commentTarget(template, providerId, target), body);
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
