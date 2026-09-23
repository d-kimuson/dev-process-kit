# Distribute under MIT with the bundled dependencies' notices

Publish the framework and every version of its bundle under MIT, allow only permissive
licenses in the bundle, and ship the attribution for the packages that actually end up
in `index.js` inside each release directory.

## Status

accepted

## Context

The distribution is a JavaScript bundle that embeds other people's code. Two different
obligations follow from that, and neither was met:

- The framework declares `"license": "MIT"` in `package.json` but ships no `LICENSE`
  file, so the terms it claims are not the terms a recipient actually has.
- The bundle contains Lit (`lit-html`, `lit-element`, `@lit/reactive-element`), which
  is BSD-3-Clause. That license requires the copyright notice, the conditions and the
  disclaimer to be reproduced in the distribution. Nothing reproduced them.

The set of packages that owe attribution is the set whose code is in the bundle, and
that set is not the same as the dependency declarations:

- `lit` is a direct dependency, but its entry point only re-exports, so it is
  tree-shaken to zero bytes and none of its code is distributed. Its sub-packages are
  what actually ship.
- `@lit-labs/ssr-dom-shim` is reachable only from Lit's server build, so it is never
  bundled — and it is a package that ships no `LICENSE` file at all, which is exactly
  the kind of gap a declaration-based report would paper over.
- `pnpm licenses list --prod` reports `typescript` (an optional peer of `valibot`) as a
  runtime dependency, even though nothing from it is in the bundle.

So the notice has to be derived from the build, not from the manifest.

## Decision

- **License the framework under MIT, and ship the text.** `LICENSE` at the repository
  root is the single source of truth; the asset assembly copies it to `<tree>/LICENSE`
  (a stable, discoverable URL) and to `<tree>/dev-process-kit@<version>/LICENSE` (so a
  mirrored release directory is self-contained).
- **Allow only permissive licenses in the bundle.** MIT, BSD-3-Clause, ISC, 0BSD,
  Unlicense and Apache-2.0. `scripts/check-public.ts` parses the generated notice and
  fails the build on anything else, so a dependency changing its license is caught by
  the build rather than by review.
- **Generate the notice from the module graph at build time.** `build.license` in
  `vite.config.ts` makes Vite emit `<tree>/dev-process-kit@<version>/THIRD_PARTY_LICENSES.md`
  from the Rollup module graph. No extra dependency and no second source of truth: the
  report lists exactly what is distributed, and a new transitive dependency appears in
  it without anyone remembering to update a list.
- **Treat the notice as part of a release.** `THIRD_PARTY_LICENSES.md` and `LICENSE` are
  in `RELEASE_FILES`, so a directory missing either one is not a complete release, gets
  no long-lived cache rule, and fails `pnpm verify:public`. The deployable tree is also
  assembled only if the release it just wrote is complete.
- **Every entry must carry its license text.** A package whose license file cannot be
  found is emitted with a heading and no body; that is a failure, not a degradation.
- **Apache-2.0 has one more condition.** Its section 4d also requires reproducing the
  `NOTICE` file of any work that ships one, and the generator collects license files
  only. `scripts/check-public.ts` therefore fails when a bundled Apache-2.0 package ships
  a `NOTICE`, so collecting it stays a deliberate pipeline change. `NOTICE` files under
  MIT or BSD-3-Clause — `es-toolkit` ships one for the Lodash-derived parts of
  `es-toolkit/compat` — carry no obligation and are intentionally ignored.

## Consequences

- A release is now self-describing: bundle, documentation and attribution live under the
  same versioned path, and the path is immutable-cacheable as a whole.
- Adding a dependency can fail the build in three new ways — a disallowed license, a
  missing license text, or a `NOTICE` file — all of which need a decision rather than a
  workaround.
- `RELEASE_FILES` gains two entries, so a release directory produced before this change
  counts as incomplete. Nothing is published yet (`public/` is build output and not
  tracked), so no published release is invalidated.
- The `LICENSE` copy at the asset root is deliberately not covered by the long-lived
  cache rules: it is the one file whose content is expected to stay stable across
  versions, and a stale immutable copy of a license is worse than a revalidation.
- `pnpm dev` assembles its tree before `vite build --watch` has written the bundle, so
  the notice can be missing from `public-dev/` until the first build completes. That
  tree has no cache rules and is never verified, so this is inert.
- This records a licensing decision, not legal advice. If the dependency set grows to
  include a license whose obligations are not covered above, revisit this ADR.

## Addendum (2026-09-24): the notices in the npm package

The distribution moved to npm ([ADR](20260924_npm-jsdelivr-distribution.md)).

- **The framework's license.** npm ships the root `LICENSE` with every package version, so the package is self-contained without a copy under `dist/`.
- **The third-party notice.** It stays next to the bundle, at `dist/THIRD_PARTY_LICENSES.md`.
- **The license check.** It moved into the build (`vite.config.ts`), which fails on a bundled license outside the allowlist.
- **Apache-2.0.** It is no longer on the allowlist. The build does not collect `NOTICE` files, so a bundled Apache-2.0 package now fails the build as a whole. Before, the check failed only when such a package shipped a `NOTICE`. Either way, adding one needs a decision.
- **Checks that are gone:**
  - the check that `LICENSE` is MIT;
  - the missing-license-text check;
  - the cache rules and the asset-root copy.

  `scripts/check-public.ts` and `pnpm verify:public` never existed under those names.

## References

- [Vite `build.license`](https://vite.dev/config/build-options)
- [BSD-3-Clause](https://opensource.org/license/bsd-3-clause)
- [ADR: Publish with Workers Static Assets](20260919_workers-static-assets-distribution.md)
