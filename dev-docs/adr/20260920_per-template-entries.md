# Ship one entry per template, and one entry for the components

Publish several ESM entries in a release instead of one: `templates/<name>.js` for each template, `components.js` for the built-in components, and `index.js` as the union of all of them. The entries share the core and their dependencies through chunks inside the same release directory.

## Status

accepted

## Context

The distribution ADR (20260919) ships one pinned ESM file per version: `/dev-process-kit@<version>/index.js`, and `src/templates/index.ts` recorded that templates are "conceptual packages, not separate bundles".

That file carries everything: every template and every diagram element. Measured on `0.0.1`, it is ~439 kB (~116 kB gzip), of which the templates are ~315 kB of source (event storming 122, USM 78, prototype 67, grill 48) and the diagram components ~141 kB. A page uses exactly one template, plus the diagram elements only when it puts them in its own markup. Everything else is downloaded for nothing, and the trend is upward: each new template adds to every existing page.

## Decision

- **A release ships an entry per template.** `templates/prototype.js`, `templates/usm.js`, `templates/event-storming.js`, `templates/grill.js`, plus `components.js` (the built-in elements with no template) and `index.js` (the union, kept so one URL still gets everything).
- **A template entry carries only what that template renders.** The core API, the review rail and inline editing (the template shell renders the rail for every template), and that one template. A template entry deliberately does _not_ re-export the components it does not ship: an entry that exports the diagram classes cannot tree-shake them away, which is the whole point of the split.
- **`components.js` is for a page that uses the components directly** — the rail, inline editing, or the diagram elements in author-owned markup (grill places its badges over markup the author writes, so a grilling page loads `components.js` next to `templates/grill.js`).
- **Shared code is emitted as chunks inside the same release.** Rollup shares the core, the components and their dependencies between the entries (`chunks/shared-<hash>.js`), so the entries stay small and a page that loads two of them downloads the shared part once. The chunks are not a contract, but they are part of the release: a release is mirrored as a whole, and the build's verification fails when an entry imports a file the release does not contain.
- **The entry list is one decision.** `RELEASE_ENTRIES` in `scripts/release.ts` maps output name to source; the build (`vite.config.ts`), the completeness predicate (`ENTRY_FILES`) and the documentation all read it, so a new entry cannot exist in one place only.

Measured on `0.0.1` (gzip, entry plus its chunks): prototype 40 kB, grill 38 kB, USM 51 kB, event storming 59 kB, components 56 kB, `index.js` 116 kB.

## Consequences

- A page that uses one template downloads about a third of what it used to. The union entry is unchanged, so existing pages and examples that pin `index.js` keep working, and older releases keep the single file they shipped.
- "One ESM file" is no longer the contract, and the docs say so: a page loads one entry, and the entry imports the chunks it needs from the same release directory. The bundle URL shape (`.../index.js` in the ADR above) gains the entries as additional paths under the same version directory.
- Every entry registers the same core elements, so the rail is available whichever entry a page loads; `window.devProcessKit.templates` now lists what the loaded entry actually registered (it used to claim `['prototype']` regardless).
- Adding a template now costs a new entry and its own size instead of adding to every page, and the samples pin the entry they exercise (which is what the sample verification checks).
- Total bytes in a release grow slightly (the shared chunks exist once, the thin entries add a few kB) while every page downloads less. Since `public/` is expected to be committed per release, the extra few kB are the price of the split.

## Addendum (2026-09-24): the entries in the npm package

The distribution moved to npm and jsDelivr ([ADR](20260924_npm-jsdelivr-distribution.md)).

- **Paths.** The entries are unchanged, but they now live under the package's `dist/`:
  - `dev-process-kit@<version>/dist/templates/<name>.js`
  - `…/dist/components.js`
  - `…/dist/index.js`
- **The single list.** It is `ENTRIES` in `vite.config.ts`. The build fails when the `exports` of `package.json` do not name exactly those entries.
- **`public/`.** Nothing is committed per release any more, so the notes above about `public/` no longer apply.

## References

- [ADR: Publish with Workers Static Assets](20260919_workers-static-assets-distribution.md)
- [Vite library mode](https://vite.dev/guide/build.html#library-mode)
