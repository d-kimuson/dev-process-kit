/**
 * Loads the framework bundle for the samples, and lets the reader switch it between versions.
 *
 * Under `pnpm dev` a sample loads the bundle built from the working tree (`local`) by default, from the dev asset
 * server's origin. Anywhere else (GitHub Pages) it loads the latest version published to npm, from jsDelivr, the way
 * a generated page does. `?version=<version>` picks a published version in both. Only the bundle changes: the
 * markup stays this checkout's, so a version older than it may not render every sample.
 *
 * The version select goes into the template's `header` slot, a public slot every version has, so it stays on the
 * page whichever version is loaded. The samples' own helper, not part of the package.
 */

const LOCAL_BASE = 'https://dev-process-kit.localhost/';
const VERSION_PARAM = 'version';
const VERSIONS_API = 'https://data.jsdelivr.com/v1/packages/npm/dev-process-kit';
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

/** `pnpm dev` serves the samples from a `*.localhost` origin (portless); only there is a local build to load. */
const hasLocalBuild = location.hostname.endsWith('.localhost');

/** The published version this page asks for, or `null` for the default. */
const requestedVersion = () => {
  const value = new URLSearchParams(location.search).get(VERSION_PARAM);
  return value !== null && SEMVER.test(value) ? value : null;
};

let published = null;

/** `{ latest, versions }` of the npm package (newest first), fetched once per page. */
const publishedVersions = () => {
  published ??= fetch(VERSIONS_API)
    .then((response) => {
      if (!response.ok) throw new Error(`${VERSIONS_API} answered ${response.status}`);
      return response.json();
    })
    .then((body) => {
      const versions = (Array.isArray(body?.versions) ? body.versions : [])
        .map((entry) => entry?.version)
        .filter((version) => typeof version === 'string' && SEMVER.test(version));
      const latest = body?.tags?.latest;
      if (typeof latest !== 'string' || !SEMVER.test(latest)) throw new Error(`${VERSIONS_API} names no latest`);
      return { latest, versions };
    });
  return published;
};

/** The version to load: the requested one, else `null` (the local build) under `pnpm dev`, else the latest. */
const resolvedVersion = async () => {
  const requested = requestedVersion();
  if (requested !== null || hasLocalBuild) return requested;
  return (await publishedVersions()).latest;
};

const bundleBase = (version) =>
  version === null ? LOCAL_BASE : `https://cdn.jsdelivr.net/npm/dev-process-kit@${version}/dist/`;

/** This page's URL with the given version (or none, for the default) in its query. */
const pageFor = (version) => {
  const url = new URL(location.href);
  if (version === null) url.searchParams.delete(VERSION_PARAM);
  else url.searchParams.set(VERSION_PARAM, version);
  return url.href;
};

// Light DOM styles: the select is slotted into the template header, where the template's tokens still inherit.
// The fallbacks cover a version whose tokens differ, and the note, which sits outside any template.
const STYLES = `
  .sample-version-select {
    flex: none;
    height: 24px;
    margin-left: auto;
    padding: 0 22px 0 10px;
    border: 1px solid var(--dpk-rule, #8884);
    border-radius: 999px;
    background: var(--dpk-paper-sunken, transparent)
      url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'><path d='M3 4.5 6 7.5 9 4.5' fill='none' stroke='%23878e9e' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/></svg>")
      no-repeat right 8px center;
    appearance: none;
    /* As wide as the version shown, not the longest prerelease in the list. */
    field-sizing: content;
    color: var(--dpk-ink-soft, inherit);
    font-family: var(--dpk-mono, ui-monospace, monospace);
    font-size: 10px;
    letter-spacing: 0.02em;
    cursor: pointer;
  }

  .sample-version-select:hover {
    color: var(--dpk-ink, inherit);
  }

  .sample-version-note {
    position: fixed;
    left: 12px;
    bottom: 12px;
    z-index: 2147483647;
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0;
    padding: 8px 12px;
    border-radius: 8px;
    background: #b42318;
    color: #fff;
    font: 12px/1.4 ui-monospace, monospace;
  }

  .sample-version-note .sample-version-select {
    --dpk-paper-sunken: #fff;
    --dpk-ink-soft: #b42318;
    --dpk-ink: #7a1a12;
  }
`;

const option = (value, label) => {
  const element = document.createElement('option');
  element.value = value;
  element.textContent = label;
  return element;
};

/**
 * A select of the versions published to npm (and `local` under `pnpm dev`) that reloads the page with the one
 * picked: a document cannot define its custom elements again, so switching needs a fresh page.
 */
const versionSelect = (loaded) => {
  const select = document.createElement('select');
  select.className = 'sample-version-select';
  select.setAttribute('aria-label', 'dev-process-kit version');
  select.title = 'dev-process-kit version';
  // `''` stands for no `?version`: the local build, which exists under `pnpm dev` only.
  const current = loaded ?? '';
  const render = (latest, versions) => {
    const listed = current === '' || versions.includes(current) ? versions : [current, ...versions];
    select.replaceChildren(
      ...(hasLocalBuild ? [option('', 'local')] : []),
      ...listed.map((version) => option(version, version === latest ? `${version} (latest)` : version)),
    );
    select.value = current;
  };
  select.addEventListener('change', () => {
    location.assign(pageFor(select.value === '' ? null : select.value));
  });
  render(null, []);
  publishedVersions().then(
    ({ latest, versions }) => render(latest, versions),
    // Offline or the API is down: only the version in use stays listed.
    (error) => console.error(error),
  );
  return select;
};

// A sample has no room of its own for errors, so a bundle that fails to load shows as a note in the corner, with
// the select when the template could not take it.
const showNote = (text, select) => {
  const note = document.createElement('p');
  note.className = 'sample-version-note';
  note.setAttribute('role', 'alert');
  note.append(text, ...(select ? [select] : []));
  document.body.append(note);
};

/**
 * Imports the entries (`templates/grill.js`, `components.js`, …) of the version to load, one after another, in the
 * order separate module scripts would run, then puts the version select into the page's template header.
 *
 * Resolves to the `FRAMEWORK_VERSION` of the bundle loaded (the `package.json` version it was built from, so `local`
 * names the working tree's), or `undefined` when nothing loaded.
 */
export const loadKit = async (entries) => {
  document.head.append(Object.assign(document.createElement('style'), { textContent: STYLES }));
  let version;
  try {
    version = await resolvedVersion();
  } catch (error) {
    console.error(error);
    showNote('Could not find the latest dev-process-kit on npm');
    return undefined;
  }

  const base = bundleBase(version);
  const missing = [];
  let frameworkVersion;
  for (const entry of entries) {
    try {
      const module = await import(new URL(entry, base).href);
      if (typeof module.FRAMEWORK_VERSION === 'string') frameworkVersion ??= module.FRAMEWORK_VERSION;
    } catch (error) {
      console.error(error);
      missing.push(entry);
    }
  }

  // The catalog has no template: its samples carry their own select.
  const template = [...document.body.querySelectorAll('*')].find((element) =>
    element.localName.startsWith('dpk-template-'),
  );
  if (template === undefined) {
    if (missing.length > 0) showNote(`dev-process-kit@${version ?? 'local'} has no ${missing.join(', ')}`);
    return frameworkVersion;
  }
  const select = versionSelect(version);
  const rendered = customElements.get(template.localName) !== undefined;
  if (rendered) {
    select.slot = 'header';
    template.append(select);
  }
  if (missing.length > 0) {
    showNote(`dev-process-kit@${version ?? 'local'} has no ${missing.join(', ')}`, rendered ? undefined : select);
  }
  return frameworkVersion;
};
