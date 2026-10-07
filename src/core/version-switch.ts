/**
 * Switching a page to another published version of the kit: which version the
 * reader asked for, where that version's entry lives, and what the header's
 * version select lists. Pure; the effects are in `version-loader.ts` and the
 * shell's `version-choice-controller.ts` ([ADR](../../dev-docs/adr/20261007_reader-version-switch.md)).
 */
import * as v from 'valibot';

/**
 * The query parameter that names the version to run the page with. Namespaced:
 * the page is the author's, and `?version=` is a name they may use themselves.
 */
export const VERSION_PARAM = 'dpk-version';

/**
 * The query parameter the samples used before the switch was built in; still
 * honoured, so links that were shared keep working.
 */
export const LEGACY_VERSION_PARAM = 'version';

/**
 * An exact npm version, nothing else: the value ends up in a script URL, so a
 * range, a dist-tag or a path segment must not get through.
 */
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

export const isExactVersion = (value: string): boolean => SEMVER.test(value);

/** jsDelivr's npm mirror of the package; the one CDN a Claude Artifact may load scripts from. */
const CDN_PACKAGE = 'https://cdn.jsdelivr.net/npm/dev-process-kit@';

/** jsDelivr's listing of the package's published versions and dist-tags. */
export const VERSIONS_API = 'https://data.jsdelivr.com/v1/packages/npm/dev-process-kit';

/** The version a page URL's query asks for, or `null` when it asks for none (or for something that is not one). */
export const requestedVersion = (search: string): string | null => {
  const params = new URLSearchParams(search);
  const value = params.get(VERSION_PARAM) ?? params.get(LEGACY_VERSION_PARAM);
  return value !== null && isExactVersion(value) ? value : null;
};

/**
 * The version an entry should hand the page to, or `null` when it runs the page
 * itself: nothing (valid) was asked for, or what was asked for is this version.
 * Only a different version delegates, which is what stops the loop: the entry
 * delegated to runs because it is the version asked for.
 */
export const delegationTarget = (search: string, own: string): string | null => {
  const requested = requestedVersion(search);
  return requested === null || requested === own ? null : requested;
};

/**
 * The URL of the same entry in another version. Always jsDelivr, wherever this
 * entry was loaded from (a local build, a mirror): it is where every published
 * version is, and where a Claude Artifact may load from.
 */
export const entryUrl = (version: string, entry: string): string => {
  if (!isExactVersion(version)) throw new Error(`not an exact version: ${version}`);
  if (!/^[a-z0-9-]+(?:\/[a-z0-9-]+)*\.js$/.test(entry)) throw new Error(`not an entry path: ${entry}`);
  return `${CDN_PACKAGE}${version}/dist/${entry}`;
};

/**
 * The page URL that runs with `version`, or with what the page pins when
 * `version` is `null`. The hash (navigation) and every other parameter stay.
 */
export const pageUrlFor = (href: string, version: string | null): string => {
  const url = new URL(href);
  url.searchParams.delete(LEGACY_VERSION_PARAM);
  if (version === null) url.searchParams.delete(VERSION_PARAM);
  else url.searchParams.set(VERSION_PARAM, version);
  return url.href;
};

export type PublishedVersions = {
  /** The `latest` dist-tag, when the listing names a valid one. */
  readonly latest: string | null;
  /** Every published version, newest first, as the listing orders them. */
  readonly versions: readonly string[];
};

const listingSchema = v.object({
  tags: v.optional(v.record(v.string(), v.unknown()), {}),
  versions: v.array(v.object({ version: v.string() })),
});

/**
 * The versions in a jsDelivr package listing. The body is external input: an
 * unexpected shape throws, and entries that are not exact versions are dropped.
 */
export const parsePublishedVersions = (body: unknown): PublishedVersions => {
  const listing = v.parse(listingSchema, body);
  const latest = listing.tags['latest'];
  return {
    latest: typeof latest === 'string' && isExactVersion(latest) ? latest : null,
    versions: listing.versions.map((entry) => entry.version).filter(isExactVersion),
  };
};

export type VersionOption = {
  /** The version, or `''` for "what the page pins" (no parameter). */
  readonly value: string;
  readonly label: string;
};

export type VersionSelectModel = {
  readonly value: string;
  readonly options: readonly VersionOption[];
};

export type VersionSelectInput = {
  /** The version running the page. */
  readonly current: string;
  /** Whether the URL asks for a version, so there is a pinned one to go back to. */
  readonly requested: boolean;
  /** The listing, once fetched; `null` before (or when it could not be). */
  readonly published: PublishedVersions | null;
  readonly text: {
    readonly pinned: string;
    readonly latest: (version: string) => string;
  };
};

/**
 * What the version select shows. The running version is always listed, so the
 * select reads right before the listing arrives, offline, or when the CDN's
 * API is out of reach; going back to the page's own version is offered
 * whenever the URL overrides it.
 */
export const presentVersionSelect = (input: VersionSelectInput): VersionSelectModel => {
  const listed = input.published?.versions ?? [];
  const versions = listed.includes(input.current) ? listed : [input.current, ...listed];
  const latest = input.published?.latest ?? null;
  return {
    value: input.current,
    options: [
      ...(input.requested ? [{ value: '', label: input.text.pinned }] : []),
      ...versions.map((version) => ({
        value: version,
        label: version === latest ? input.text.latest(version) : version,
      })),
    ],
  };
};
