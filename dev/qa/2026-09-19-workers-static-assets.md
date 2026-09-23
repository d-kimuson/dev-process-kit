# Workers Static Assets local delivery — verification record (2026-09-19)

Real-browser verification of the reorganized distribution (`public/` as build
output, samples in `sample/`, served by `wrangler dev` and `http-server` behind
portless). Follows `docs/guidelines/qa.md`.

## Environment

- Working tree: this change (uncommitted)
- Assets served by `wrangler dev` (Workers Static Assets, `wrangler.jsonc`,
  no Worker code) at `https://dev-process-kit.localhost/`
- Samples served by `http-server sample` at `https://sample.dev-process-kit.localhost/`
- Both started by `pnpm dev` (pueue task; portless names come from the scripts:
  `--name dev-process-kit` / `--name sample.dev-process-kit`)
- Development serves `public-dev/`; the deployable tree is `public/` (`pnpm build`)
- Browser: `pnpm exec agent-browser --session browser-ops --profile
"$HOME/.config/agent-browser/profiles/shared" --headed false` (headless, shared
  agent profile per the browser-ops skill)
- Started from an empty `public/` and `public-dev/` (as in a fresh clone) to check
  that `pnpm dev` alone produces a servable tree

## Automated smoke check

```sh
pueue add -- pnpm dev
node dev/qa/browser-smoke.ts https://sample.dev-process-kit.localhost
# PASS prototype: errors="" state={"banner":false,"rail":true}
# PASS usm: errors="" state={"banner":false,"rail":true}
# PASS event-storming: errors="" state={"banner":false,"rail":true}
# ✔ all samples rendered without page errors
```

## Results

| Check                                                    | Result                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Bundle is loaded from a **different origin**             | PASS — document origin `https://sample.dev-process-kit.localhost`, resource `https://dev-process-kit.localhost/dev-process-kit@0.0.1/index.js` (`initiatorType: script`)                                                                                                                                                                                                                   |
| Cross-origin module load (CORS)                          | PASS — `Access-Control-Allow-Origin: *` on the asset response; no page errors                                                                                                                                                                                                                                                                                                              |
| `prototype` / `usm` / `event-storming` render            | PASS — no error banner, review rail present (three runs above)                                                                                                                                                                                                                                                                                                                             |
| `dispatch` updates the rendered UI                       | PASS — `SET_STEP_NAME` on `landing` rendered `LP Landing` in the step list and detail panel                                                                                                                                                                                                                                                                                                |
| Review rail receives a comment                           | PASS — `artifact.comment()` produced `2 draft · 1 note` in the shell (see screenshot)                                                                                                                                                                                                                                                                                                      |
| Draft survives reload (LocalStorage)                     | PASS — after `reload`: 2 actions, 1 comment, step name `LP Landing` (persisted on the sample origin)                                                                                                                                                                                                                                                                                       |
| Hash canonicalisation                                    | PASS — `#activity=onboarding&preview=landing-mobile&step=landing&story=account`                                                                                                                                                                                                                                                                                                            |
| Agent brief export                                       | PASS — `exportBrief()` returns `# Artifact draft — UX Prototype`                                                                                                                                                                                                                                                                                                                           |
| Missing asset is a 404 (no SPA fallback)                 | PASS — `curl -o /dev/null -w '%{http_code}' .../nope` → `404`, no HTML shell                                                                                                                                                                                                                                                                                                               |
| Published versions are cached as immutable               | PASS — `pnpm build` + `wrangler dev --assets public`: `/dev-process-kit@0.0.1/index.js` → `307` with `Cache-Control: public, max-age=31536000, immutable`; the canonical `/dev-process-kit%400.0.1/index.js` → `200` with the same policy                                                                                                                                                  |
| Unpublished versions are **not** cached                  | PASS — `/dev-process-kit%400.0.2/index.js`, `/dev-process-kit%400.0.10/index.js` (shares a prefix with 0.0.1) and `/dev-process-kit%400.0.1-rc.1/index.js` → all `404` with no `Cache-Control`                                                                                                                                                                                             |
| Cache rules survive build metadata in the version        | PASS — with a complete `dev-process-kit@0.0.1+build.1/` in the tree the rules include `/dev-process-kit%400.0.1%2Bbuild.1/*`, and that canonical path serves `200` with the immutable policy (matching the worker's `encodeURIComponent` canonicalisation)                                                                                                                                 |
| Development does not pin long-lived caching              | PASS — while `pnpm dev` runs: the same URL under `public-dev/` → `Cache-Control: public, max-age=0, must-revalidate` (a rebuilt bundle is picked up on reload)                                                                                                                                                                                                                             |
| A `pnpm build` during a dev session is inert             | PASS — ran `pnpm build` while `pnpm dev` was running: `public/_headers` gained the immutable rules, `public-dev/` responses still returned `max-age=0, must-revalidate`                                                                                                                                                                                                                    |
| Development tree ships the docs                          | PASS — `pnpm dev` serves `…/dev-process-kit@0.0.1/llms.txt` and `…/docs/core.md` with `200`(CORS), without a prior `pnpm build`                                                                                                                                                                                                                                                            |
| `pnpm verify:public` catches a dev/incomplete tree       | PASS — a `_headers` without the release rules fails with `is missing /dev-process-kit@0.0.1/* (run \`pnpm build\`)`; a literal rule for a nonexistent release fails with `caches an incomplete release: dev-process-kit@0.9.9`; an **encoded-only** rule `/dev-process-kit%400.9.9/*`is detected as well; a release missing`docs/templates`, or missing its `VERSION` marker, gets no rule |
| `pnpm verify:public` catches bad sample pins             | PASS — `dev-process-kit@0.0.2`, `dev-process-kit@0.0.1-rc.1`, the empty `dev-process-kit@/llms.txt`, the encoded `dev-process-kit%400.0.2/llms.txt`, and a real newline inside the `src` value (removed by URL parsing, making it `@0.0.10`) each fail with a `sample/… references/mentions …` message; all reverted afterwards                                                            |
| `pnpm verify:public` reads `_headers` like Wrangler      | PASS — an **indented** stale rule (which Wrangler honours regardless of indentation) plus its policy is discovered and reported, and an unrelated `href="/search?q=dev-process-kit"` is not mistaken for a bundle reference                                                                                                                                                                |
| `pnpm verify:public` normalizes rule paths like Wrangler | PASS — the rule `/dev-process-kit%400.9.9/*?x=1` (a query Wrangler strips and honours) is discovered and reported                                                                                                                                                                                                                                                                          |
| Bundle references are classified from the URL            | PASS — a newline-split name with the wrong version (`dev-process-\nkit@0.0.2`) and a suffix match (`/not-dev-process-kit@0.0.1/…`) both fail; a newline-split but correct pin passes                                                                                                                                                                                                       |
| Combined prerelease + build metadata is cached           | PASS — a complete `dev-process-kit@0.0.1-rc.1+build.1/` produces `/dev-process-kit@0.0.1-rc.1+build.1/*` and `/dev-process-kit%400.0.1-rc.1%2Bbuild.1/*`                                                                                                                                                                                                                                   |
| A bundle rebuild drops the completion marker             | PASS — `pnpm exec vite build` alone leaves no `VERSION` in the release, so `pnpm verify:public` fails with `missing VERSION` and `caches an incomplete release` instead of trusting the tree                                                                                                                                                                                               |
| The marker follows Vite's resolved output                | PASS — invoking Vite's API from another working directory with `root` set to this repository still removed the release `VERSION` (the marker is derived from `config.root` + `config.build.outDir`)                                                                                                                                                                                        |
| An output-directory override fails loudly                | PASS — invoking Vite's API with `build.rollupOptions.output.dir` is rejected with `… overrides the asset layout; the bundle has to be written to build.outDir` instead of silently invalidating another release                                                                                                                                                                            |
| `pnpm dev` starts from an empty `public-dev/`            | PASS — with `public/` and `public-dev/` removed, `pnpm dev` assembles and serves `index.js`, `_headers`, `llms.txt` and `docs/`                                                                                                                                                                                                                                                            |

Evidence: screenshot `/tmp/dpk-workers-assets-prototype.png` (rendered prototype,
shell shows `dev-process-kit@0.0.1`). The QA draft was cleared afterwards and the
browser session closed.

## Notes for future work

- The asset worker redirects `/dev-process-kit@<version>/…` to the percent-encoded
  canonical path (`/dev-process-kit%40<version>/…`). `_headers` matches the raw
  request path, which is why both forms get a rule, and why the rules are scoped to
  versions that exist. See the ADR addendum.
- `pnpm dev` assembles `public-dev/` on every start, so edits to `docs/**` or
  `src/static/**` need a `pnpm dev` restart to show up on the dev server (the bundle
  itself is rebuilt by `vite build --watch`).
- Human QA left open: whether the dev/prod tree split feels right in daily use, and
  whether `sample.dev-process-kit.localhost` is the right portless name.
