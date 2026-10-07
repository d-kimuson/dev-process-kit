/**
 * The effects of switching a page to another published version: an entry that
 * hands the page to the version the URL asks for, the listing behind the
 * version select, and the select a version without one of its own gets.
 * The decisions are the pure `version-switch.ts`
 * ([ADR](../../dev-docs/adr/20261007_reader-version-switch.md)).
 */
import { announce } from '../lib/announce';
import { closestLang } from '../lib/dom/lang';
import { matchLocale } from './i18n';
import { coreMessages } from './messages';
import { FRAMEWORK_VERSION } from './version';
import {
  delegationTarget,
  entryUrl,
  pageUrlFor,
  parsePublishedVersions,
  presentVersionSelect,
  requestedVersion,
  VERSION_PARAM,
  VERSIONS_API,
  type PublishedVersions,
} from './version-switch';

export type FetchVersions = () => Promise<PublishedVersions>;

let published: Promise<PublishedVersions> | undefined;

/** The package's published versions, fetched from jsDelivr once per page and only when asked for. */
export const fetchPublishedVersions: FetchVersions = () => {
  published ??= fetch(VERSIONS_API).then(async (response) => {
    if (!response.ok) throw new Error(`${VERSIONS_API} answered ${response.status}`);
    return parsePublishedVersions(await response.json());
  });
  // A failed fetch may succeed on the next attempt (the reader came back online).
  published.catch(() => {
    published = undefined;
  });
  return published;
};

/** Reloads the page with `version`, or with what the page pins for `null`. */
export const switchPageTo = (version: string | null): void => {
  location.assign(pageUrlFor(location.href, version));
};

export type EntryStart = {
  /** The entry's path under `dist/`, the same in every version: `templates/grill.js`. */
  readonly entry: string;
  /** The template elements the entry registers, for `window.devProcessKit`. */
  readonly templates: readonly string[];
  /** Defines the entry's custom elements. Runs only when this version runs the page. */
  readonly register: () => void;
  /** Imports another version's entry; tests replace it. */
  readonly importModule?: (url: string) => Promise<unknown>;
};

const importFromCdn = (url: string): Promise<unknown> => import(/* @vite-ignore */ url);

/**
 * What every entry does when it is evaluated. A page defines its custom
 * elements once, so the version that defines them is the version the page
 * runs: when the URL asks for another one (`?dpk-version=`), this entry imports
 * that version's same entry and defines nothing itself. When that import fails
 * (no such version, no such entry in it, offline), this version runs the page
 * after all.
 */
export const startEntry = ({ entry, templates, register, importModule = importFromCdn }: EntryStart): void => {
  const run = (): void => {
    register();
    announce(FRAMEWORK_VERSION, templates, VERSION_PARAM);
  };
  const target = typeof location === 'undefined' ? null : delegationTarget(location.search, FRAMEWORK_VERSION);
  if (target === null) {
    run();
    return;
  }
  importModule(entryUrl(target, entry)).then(
    () => {
      // A version from before the switch was built in renders no select: give it one, so the reader can come back.
      if (!switchesItself()) addFallbackSelects(target);
    },
    (error: unknown) => {
      console.error(`dev-process-kit@${target} could not be loaded; running ${FRAMEWORK_VERSION}`, error);
      run();
    },
  );
};

/** Whether the version that ran the page announced the switch (`announce` writes `versionParam`). */
const switchesItself = (): boolean => {
  const announced: unknown = Reflect.get(window, 'devProcessKit');
  return typeof announced === 'object' && announced !== null && 'versionParam' in announced;
};

const FALLBACK_CLASS = 'dpk-version-fallback';

// Light DOM, slotted into the template header of a version this one knows nothing about: its tokens apply when
// they still exist, and the fallbacks cover them when they do not.
const FALLBACK_STYLES = `
  .${FALLBACK_CLASS} {
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
    field-sizing: content;
    color: var(--dpk-ink-soft, inherit);
    font-family: var(--dpk-mono, ui-monospace, monospace);
    font-size: 10px;
    letter-spacing: 0.02em;
    cursor: pointer;
  }
`;

/**
 * Puts a version select into the `header` slot of each template on the page,
 * a public slot every version has, so the reader can switch again from a
 * version that renders none.
 */
const addFallbackSelects = (current: string): void => {
  const templates = [...document.body.querySelectorAll('*')].filter(
    (element) => element.localName.startsWith('dpk-template-') && !element.querySelector(`:scope > .${FALLBACK_CLASS}`),
  );
  if (templates.length === 0) return;
  document.head.append(Object.assign(document.createElement('style'), { textContent: FALLBACK_STYLES }));
  for (const template of templates) template.append(fallbackSelect(template, current));
};

const fallbackSelect = (template: Element, current: string): HTMLSelectElement => {
  const messages = coreMessages(matchLocale(closestLang(template)));
  const select = document.createElement('select');
  select.className = FALLBACK_CLASS;
  select.slot = 'header';
  select.setAttribute('aria-label', messages.versionLabel);
  select.title = messages.versionLabel;
  const render = (list: PublishedVersions | null): void => {
    const model = presentVersionSelect({
      current,
      requested: requestedVersion(location.search) !== null,
      published: list,
      text: { pinned: messages.versionPinned, latest: messages.versionLatest },
    });
    select.replaceChildren(
      ...model.options.map((option) =>
        Object.assign(document.createElement('option'), { value: option.value, textContent: option.label }),
      ),
    );
    select.value = model.value;
  };
  const load = (): void => {
    fetchPublishedVersions().then(render, (error: unknown) => console.warn(error));
  };
  select.addEventListener('pointerenter', load, { once: true });
  select.addEventListener('focus', load, { once: true });
  select.addEventListener('change', () => switchPageTo(select.value === '' ? null : select.value));
  render(null);
  return select;
};
