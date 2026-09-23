# Publish with Workers Static Assets and Git-managed release files

Distribute the single ESM bundle and user-facing documentation through Cloudflare Workers
Static Assets at `https://dev-process-kit.kimuson.dev`. Commit release files to Git
and retain previous versions. For now, do not introduce Worker code or a separate asset store
for distribution.

## Status

superseded by [20260924_npm-jsdelivr-distribution](20260924_npm-jsdelivr-distribution.md)

## Context

Generated single-file HTML pages load the framework from a version-pinned URL.
Published bundles and their accompanying documentation must remain available at the same URLs
so that existing HTML keeps working and agents can consult the matching API documentation
after a new release.

Workers Static Assets meets our needs because the distribution consists entirely of static files.
Building and deploying only the latest version would remove older versions from the served files,
so every deployment must include previous releases.

Committing build output increases repository size and adds generated diffs. At this stage,
however, it is simpler than assembling previous releases from external storage and makes the
published files directly inspectable in the repository.

## Decision

- Use `dev-process-kit.kimuson.dev` as the public domain. Keep URLs embedded in generated HTML
  independent of the hosting provider's domain so they can survive a future hosting migration.
- Use the following version-pinned URL structure, keeping each bundle alongside its matching docs:
  - `https://dev-process-kit.kimuson.dev/dev-process-kit@<version>/index.js`
  - `https://dev-process-kit.kimuson.dev/dev-process-kit@<version>/llms.txt`
  - `https://dev-process-kit.kimuson.dev/dev-process-kit@<version>/docs/`
- Commit release files under `public/dev-process-kit@<version>/` and deploy all of `public/`,
  including previous releases, to Workers Static Assets. Exclude developer-facing documentation
  from the distribution.
- Never modify or delete files within a published version. Publish fixes as new versions.
  Separate development build output from stored releases so routine builds cannot overwrite
  published files.
- Set `Access-Control-Allow-Origin: *` on public assets so HTML on other origins can load the ESM
  bundle. Enable long-lived caching for immutable versioned paths, but do not apply that policy
  indiscriminately to the mutable landing page or samples.
- Return 404 for missing assets rather than serving HTML through an SPA fallback.

## Consequences

- Publishing a release adds a new version's files. Deployments do not need to rebuild
  previous releases.
- CI needs checks that reject modifications or deletions of published versions and verify
  consistency between each new bundle and its documentation.
- Repository size and the deployment file set grow with each release. Reconsider storage options
  such as R2 if operational overhead or Assets limits become a problem. Any migration must
  preserve published URLs and their contents.
- This ADR records the distribution decision. DNS, Wrangler, headers, development build output
  separation, and CI configuration will be implemented separately.

## Addendum (2026-09-19): canonical paths, and the development tree

Three behaviors were pinned down while wiring up local delivery. They refine the header
part of the decision above; the decision itself does not change.

- **The percent-encoded path is canonical.** The asset worker decodes the request path,
  matches it against the manifest and, when the re-encoded path differs, answers with a
  307: `/dev-process-kit@<version>/index.js` → `/dev-process-kit%40<version>/index.js`.
  Header rules in `_headers` match the raw request path, so a rule written as
  `/dev-process-kit@*` matches the redirect but _not_ the response that actually carries
  the asset. The generated rules therefore cover both the literal and the encoded form.
- **Cache rules are scoped to complete releases.** Workers applies `_headers` rules to 404
  responses as well, so a rule that covers more than a published release lets a client cache
  a 404 for a year. The generated patterns therefore (a) encode the whole path segment with
  `encodeURIComponent`, matching the canonical form the asset worker redirects to —
  `dev-process-kit@0.0.1+build.1` → `dev-process-kit%400.0.1%2Bbuild.1` — (b) end the
  pattern with `/` before the glob, so `@0.0.1/*` cannot match unpublished `0.0.10` or
  `0.0.1-rc.1`, and (c) are generated only for directories that carry a complete release
  (`index.js`, `llms.txt`, `docs/` and the `VERSION` marker that assembly writes once the
  release content is in place — `vite build` drops that marker before it writes the bundle,
  so an interrupted build cannot leave a truncated bundle beside a marker that claims the
  release is complete). A 404 _inside_ a published release is cached by design: the decision
  above forbids changing a published version, so that path can never appear.
- **Development serves its own tree.** `wrangler dev` serves `public-dev/`, which has the
  same versioned URL as the deployed tree but no long-lived cache policy. Two reasons: an
  immutable response would keep the browser on a stale bundle while `vite build --watch`
  rewrites that URL, and a routine `pnpm build` must not be able to change what a running
  dev session serves. Both trees are assembled by `scripts/assemble-assets.ts`; only the
  deployable one gets the cache rules.

The commit/deploy half of the decision — accumulating published versions and rejecting
changes to them — is still open and is not exercised by local delivery.

## Addendum (2026-09-20): no source maps in the distribution

A release is distributed, and `index.js.map` carries the full source of a repository that is not public. Shipping it would publish the source as a side effect of publishing the bundle, and nothing in the distribution needs it: the map exists to debug the bundle in place, which is what the development tree (`public-dev/`, never deployed) and `pnpm dev` are for.

So `vite build` is told per tree: the development tree keeps `index.js.map`, every deployable release publishes without it (`scripts/release.ts`), and the build's verification fails when a release contains one.

## Addendum (2026-09-20): the release entry point, and the index at the asset root

The URL structure above lists a per-release `llms.txt`. That file is gone: what an agent reads first is `docs/index.md`, which carries the usage guide and the API contract of that exact version, and the rest of the documentation is `docs/templates/*` and `docs/components/*`. A release carries its entries, `docs/`, `LICENSE`, `THIRD_PARTY_LICENSES.md` and `VERSION` — nothing else.

The asset root's `llms.txt` is the index instead, generated by `scripts/assemble-assets.ts` from the releases the tree holds. It names the latest published version (so a client that lands on the origin knows what to pin) and describes what a release directory carries. It does not list the debug release: that channel is the maintainer's and every publish replaces it, so it cannot promise to hold the latest of anything. The build's verification fails when the index names a version the tree does not hold, when it omits the latest one, or when it mentions the debug release.

## Addendum (2026-09-20): a published release is minified

Formatting follows the source-map split. Vite's ES library build minifies identifiers and syntax but keeps whitespace (`minifyWhitespace: false` on its lib path), because it assumes a library is re-bundled by whatever consumes it. This framework is delivered to a browser as-is, and the release directory is committed since the built files became tracked, so neither the download nor the repository wants the formatting: `scripts/minify-release.ts` minifies a published release fully after `vite build`. The development tree is left readable, because that is the tree a developer reads while working.

## References

- [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)
- [Headers](https://developers.cloudflare.com/workers/static-assets/headers/)
- [Billing and Limitations](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)
