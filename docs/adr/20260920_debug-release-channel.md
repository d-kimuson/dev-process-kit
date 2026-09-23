# Publish the latest build as a mutable debug release

Publish the current build as `dev-process-kit@debug` inside the same deployable tree as the versioned releases, deploy it to the `dev-process-kit` Worker on `workers.dev` only, and give it the cache policy of a path that is overwritten in place instead of the immutable policy of a published version.

## Status

accepted

## Context

The distribution ADR (20260919) makes every published version a permanent, immutable address: `package.json` names it, releases accumulate under `public/dev-process-kit@<version>/`, the samples pin it, and a published directory is never changed. Cutting a version is a commitment.

Before `0.0.1` exists, the current build still has to be exercised the way a generated page uses it: from another origin, over the network, in a real browser. That needs an address that (a) does not claim to be a version and (b) may be replaced at any time.

A second Worker does not solve it either. Deploying is per Worker and replaces the whole asset set, so the Worker that answers the URL must be redeployed with a tree that holds everything which has to stay live — a debug deployment would either publish versions or drop them.

## Decision

- **The debug channel is a release, not a deployment.** `DPK_CHANNEL=debug` writes `public/dev-process-kit@debug/` into the same tree as the versioned releases, and one `wrangler deploy` publishes whatever the tree holds. `scripts/release.ts` owns the mapping from channel to release, origin and addressing; the build, the assembly, the verifier and the deploy all read that one decision.
- **The cache policy belongs to the release.** `releaseCachePolicy` gives `debug` `no-cache` and every other release id the immutable policy, and `_headers` is regenerated for every complete release in the tree — so one tree can serve an immutable version next to a mutable debug release.
- **The debug documentation addresses the release a reader can reach.** The published `docs/**` of the debug release are rewritten (`STABLE_ORIGIN` → the Worker's `workers.dev` origin, `dev-process-kit@<version>` → `dev-process-kit@debug`), and the build's verification (`scripts/verify-release.ts`) fails when a document still names the other channel. The custom domain is not attached yet, so a copied URL that named it would be dead.
- **One command publishes.** `pnpm deploy:debug` builds the debug release, verifies the tree and deploys it — the whole flow is one line in `package.json`, so what publishing does is visible where it is used. Nothing checks the deployment over the network: this account serves the Worker through Cloudflare Access, so only a browser that is logged in sees the asset. The build's own verification proves the tree that was uploaded, and `scripts/verify-committed.ts` proves that the tracked tree is that build.
- **The deploy refuses to publish a version.** `scripts/deploy-debug.ts` aborts when the tree also holds a versioned release: this command must not publish `0.0.1` by accident, and it must not drop a version that is already live. Publishing a version next to the debug release is a deploy of its own.
- **The debug release does not ship source maps.** It is reachable by anyone while this repository is private; no published release ships one (see the source-map addendum of the distribution ADR).

## Consequences

- The debug release may be replaced as often as wanted. A page that pinned it stops being reproducible — which is the point: it is not a version, and nothing should pin it.
- `0.0.1` is unaffected and stays unpublished. `pnpm build` + `wrangler deploy` is still the version path, and it publishes `dev-process-kit@<version>` only.
- Deploying replaces the Worker's asset set with the tree. Once versions are live, a deploy from a tree that does not contain them removes them from the Worker; accumulating published releases and rejecting changes to them is still the open half of the distribution ADR.
- The debug origin is a constant in `scripts/release.ts` (the account's `workers.dev` subdomain plus the Worker name in `wrangler.jsonc`). Attaching the custom domain later makes the two origins the same and the origin rewrite disappears; that constant is the one place to change.
- The verification on the debug channel skips the sample checks of the stable tree: the samples are repository-local and pin the stable release, which is not what a debug build produces. The debug verification instead fails when a document still addresses another channel.
- No published release ships a source map, so the debug channel does not either (the distribution ADR's source-map addendum).
- The account protects its whole `workers.dev` subdomain with Cloudflare Access, so the debug release is reachable by the maintainer's browser rather than by anyone. Consequences: a page hosted on another origin cannot load the bundle (its module request carries no Access session), and there is no network-side check — a non-browser check would only see the Access login page. Verifying the deployed bytes would need an Access service token, which is a decision for whoever wants that check back.

## Addendum (2026-09-24): the custom domain is attached

The Worker now lives in the account that owns the `kimuson.dev` zone and is served from `https://dev-process-kit.kimuson.dev` without Cloudflare Access. As anticipated above, the debug origin collapsed into the public one: `scripts/release.ts` has a single `PUBLIC_ORIGIN`, the debug documentation rewrites only the release segment, and `wrangler.jsonc` pins the account and attaches the domain on deploy. The Access-related consequences no longer hold: pages on other origins can load the debug bundle, and the deployed samples are checked over the network with `pnpm qa:browser <origin>/sample`.

## References

- [ADR: Publish with Workers Static Assets](20260919_workers-static-assets-distribution.md)
- [Workers Static Assets: headers](https://developers.cloudflare.com/workers/static-assets/headers/)
- [Workers: workers.dev](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/)
