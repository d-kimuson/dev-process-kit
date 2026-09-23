# Publish to npm and load from jsDelivr

Distribute the framework as the npm package `dev-process-kit` and have pages load an exact version of it from jsDelivr's npm mirror. Stop serving it from our own origin. This supersedes the Workers Static Assets distribution and the mutable debug release.

## Status

accepted

Supersedes [20260919_workers-static-assets-distribution](20260919_workers-static-assets-distribution.md) and [20260920_debug-release-channel](20260920_debug-release-channel.md).

## Context

The main consumer of a generated page is a Claude Artifact. An Artifact loads external scripts only from a short allowlist of public CDNs, `cdn.jsdelivr.net/npm/` among them, so a bundle on our own domain cannot be loaded there at all. The hosting provider is therefore not a free choice: the bundle has to be reachable through one of those CDNs.

jsDelivr mirrors every npm package version under `https://cdn.jsdelivr.net/npm/<name>@<version>/<path>`, sends `Access-Control-Allow-Origin: *`, caches exact versions for the long term, and never changes a version once npm has it. That covers most of what the Workers distribution built by hand:

- immutable versioned paths
- the cache rules for those paths
- CORS
- keeping every old version alive, which used to mean committing each release

The alternatives were:

- **Keep our origin next to npm.** That leaves two distributions to keep in sync, and an Artifact still could not use the one we host.
- **GitHub-backed jsDelivr URLs (`/gh/`).** These need the build output committed again, and they tie the URLs to the repository rather than to a published package.

## Decision

- **npm is the only distribution.** The repository root's `package.json` is published as is. `files` limits the package to `dist/`, and npm adds `package.json`, `README.md` and `LICENSE`. The bundled libraries are dev dependencies, so the package has no runtime dependencies and a page resolves no bare specifier.
- **The package carries the bundle only.** A page loads `https://cdn.jsdelivr.net/npm/dev-process-kit@<version>/dist/<entry>.js`, and the `exports` of `package.json` name the same entries for a bundler. The documentation is not published with it.
- **The documentation of a version is the repository at its tag.** An agent reads `docs/` at the `v<version>` tag, for example `https://raw.githubusercontent.com/d-kimuson/dev-process-kit/v<version>/docs/index.md`. The docs write their URLs as `dev-process-kit@<version>`, so nothing has to rewrite them at release time.
- **The skill replaces `llms.txt`.** The `dev-process-kit` skill is the entry point for an agent. It tells the agent to:
  1. get the latest version from the npm registry;
  2. read the docs at that version's tag;
  3. pin that exact version in every URL a page loads.

  A page never loads `@latest`: jsDelivr caches what an alias resolves to for a while, and a page has to keep working after a new release.

- **Prereleases replace the debug release.** A build that has to be tried from a real Artifact is published as `x.y.z-beta.n` under the dist-tag `beta`. It is still an immutable version, so nothing is overwritten and a page that pinned it stays reproducible.
- **Versioning is npm's.** The version lives in `package.json`, and a release uses `npm version`, which:
  - runs the checks (`preversion`);
  - creates the signed commit and the signed `v<version>` tag.

  The pushed tag triggers the release workflow, which publishes with npm Trusted Publishing (OIDC, with provenance), so no npm token is stored anywhere. The steps are the `release` skill in `.agents/skills/`. There is no release script of our own.

- **The build carries the package policies.** `vite.config.ts`:
  - minifies the published build fully, since a browser loads it as-is;
  - ships no source maps;
  - emits the third-party notice and fails on a bundled license outside the allowlist;
  - fails when `exports` drifts from the entries.

## References

- [jsDelivr: npm](https://www.jsdelivr.com/documentation#id-npm)
- [npm: Trusted publishing](https://docs.npmjs.com/trusted-publishers)
- [ADR: Ship one entry per template](20260920_per-template-entries.md)
