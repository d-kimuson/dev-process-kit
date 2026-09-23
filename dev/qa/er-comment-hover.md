# ER comment-icon interaction QA

- Date: 2026-09-23
- URL: `https://sample.dev-process-kit.localhost/grill.html#question=status-migration`
- Browser: headless Chromium, shared `browser-ops` profile; launch through `pueue` task 643.
- Dev server: task 641 (replaces 626). Browser smoke: task 644.
- This revision supersedes the automatic selection-to-composer behavior recorded in `grill-review.md`.

## Current acceptance evidence

| Scenario                | Result                                                                                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Idle table              | PASS: Orders icon opacity is 0, selection is null, no composer                                                                                                |
| Hover a table           | PASS: pointer hover makes icon opacity 1 without selecting the table or opening a composer                                                                    |
| Ordinary selection      | PASS: clicking the Orders heading selects it but does not open the composer                                                                                   |
| Explicit comment action | PASS: clicking the visible icon opens the native top-layer composer, with Orders as its target                                                                |
| No layout shift         | PASS: canvas height stays 535.25 px and diagram height 620 px throughout hover, selection and opening                                                         |
| Submit                  | PASS: Ctrl+Enter saves `element:stock-schema/node/orders`, closes the composer and leaves the 質問 tab active                                                 |
| Relationship affordance | PASS: hover reveals the customers → orders icon; clicking it opens the composer with `customers.id → orders.customer_id`                                      |
| Keyboard                | PASS: Escape closes the relationship composer and returns focus to its icon; with the mouse elsewhere, Enter on that icon reopens it and focuses the textarea |
| Page errors             | PASS: none reported                                                                                                                                           |
| Browser smoke           | PASS: prototype, usm, event-storming, example-mapping and grill                                                                                               |

Component regressions exercise explicit-icon-only opening, focus without auto-opening, selection away/back without reopening, native HTML buttons inside SVG foreignObject, per-target draft preservation, rejected submissions, filtering without focus theft and common Review integration.

## Checks

- `pnpm typecheck`, `pnpm lint`, `pnpm test`: PASS (39 files, 382 tests, including the concurrently added example-mapping suite).
- Both stable and debug release trees are regenerated from source, without committing or deploying.

## Limitations and review blocker

- Touch fallback uses `@media (hover: none)` to keep icons visible and interactive. The CLI's iPhone 12 emulation still reported `(hover: none) = false`, so real no-hover-device behavior was not established by that emulation. Selection/focus also exposes the icons independently of this media query.
- Screenshots were captured at `/tmp/dpk-er-hover-icon.png` and `/tmp/dpk-er-hover-composer.png`. The harness could not display either image, including resized copies, so current visual inspection is not claimed; geometry and computed styles were checked in Chromium.
- Independent read-only review could not start: run `c4fd7c99-6379-41fd-ad7e-7cfd42f45671`, start failed, repo/cwd `/Users/kaito/repos/dev-process-kit`, branch `refactor/exit-poc`, ref `63d53d6`. Host package `/Users/kaito/.local/share/mise/installs/npm-earendil-works-pi-coding-agent/0.85.1/lib/node_modules/@earendil-works/pi-coding-agent` lacked required agent dependencies (`pi-coding-agent`, `pi-agent-core`, `pi-ai`, `pi-tui`, `typebox`, `chord` and their subpaths). Partial diff captured at `/tmp/dpk-er-hover-review.diff`; no alternative launch protocol was attempted.
- Non-Chromium engines were not exercised.
