# FP/UI refactor QA — 2026-09-19

## Environment

- Chromium headless, repository-pinned `agent-browser`, session `browser-ops`, shared agent profile.
- Existing `pnpm dev` (pueue 589); browser launch through pueue 590. No server was stopped/restarted.
- Samples: `https://sample.dev-process-kit.localhost/{prototype,usm,event-storming}.html`.
- Bundle: `https://dev-process-kit.localhost/dev-process-kit@0.0.1/index.js` (separate origin, verified through Resource Timing).
- Prototype / Event Storming persistence probes used `?qa=fp-refactor`; probe-created actions were removed afterward.
- `docs/tmp/**` and its server (pueue 586) were not changed.

## Automated checks

```sh
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm verify:public
```

247 tests pass, including pure panel model/presentation tests in the Node environment,
component integration, atomic-batch rollback, qualified references, and injected lint violations.
Independent read-only Core and UI reviews found five issues; reproducing tests were
added before fixes (batch candidate state, foreign move anchors, invalid entity IDs,
detached facade subscriptions, and legacy callback return values).

## Browser scenarios

Commands used `pnpm exec agent-browser --session browser-ops` with `open`, `snapshot -i`,
`click`, `fill`, `press`, `mouse move/down/up`, `set viewport`, `eval --stdin`, `reload`,
`screenshot`, and `errors`.

| Scenario                                                            | Result                                                                                                                                     |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| All three samples / cross-origin module load                        | No error banner or browser page errors.                                                                                                    |
| Prototype: open review rail, enter a note, Ctrl+Enter, reload       | One persisted note; canonical brief contains it.                                                                                           |
| Prototype: rejected dispatch → navigate → successful comment        | Subscriber issues were `1 → 1 → 0`; navigation changed to `google-auth` without adding a draft.                                            |
| USM: composer typing and submission                                 | Text survived render; one comment, zero issues.                                                                                            |
| USM: scroll an extended document 80px with composer open            | Popover top changed `368.1875 → 288.1875`; anchor gap remained 8px.                                                                        |
| USM: resize open composer to 320×480                                | Popover bounds `left=12,right=312,top=196.1875,bottom=326.1875`, inside viewport.                                                          |
| USM: reorder steps while editing                                    | Same editor node, focus and selection `[3,7]` preserved; draft committed only to original entity.                                          |
| USM: synthetic composing Enter in the real browser                  | Did not commit; subsequent non-composing Enter committed.                                                                                  |
| Event Storming: connect port → valid target → empty space → release | Highlight count `1 → 0`; zero draft actions. Real mouse events.                                                                            |
| Event Storming: move slice → valid target → empty space → release   | Drop indicator appeared then cleared; zero draft actions. Real mouse events.                                                               |
| Event Storming: click continuation port                             | One `artifact-change` containing both `ADD_ELEMENT` and `LINK_ELEMENTS`; state changed `17/16 → 18/17` elements/links, zero stale actions. |
| Event Storming: detail point popover at 320×300                     | Bounds `x=24,y=8,width=288,height=227.984375`; no overflow.                                                                                |
| Event Storming: detach/reconnect host with detail popover           | Popover reopened; no page errors.                                                                                                          |

## Regressions found during browser QA

1. Vite's running watch graph retained the removed `comment-panel.ts` resolution.
   Explicit `comment-panel/index` imports rebuilt successfully without restarting the server.
2. Popover content-box padding exceeded narrow viewports (right edge 334px at width 320px).
   `border-box` sizing and overflow containment fixed the measured bounds above.
3. Native DOM moves blurred inline editors even with keyed identity, committing drafts early.
   The blur boundary now distinguishes a reconnect from user blur; a regression test and
   the real-browser identity/focus/selection probe verify the fix.

## Evidence and limits

- Screenshots inspected: `/tmp/dpk-event-storming-atomic.png`, `/tmp/dpk-point-popover-small.png`.
- Floating UI lifecycle tests verify observer cleanup on replacement, removal and disconnect,
  and ignore late async positioning results after disposal.
- Native OS IME candidate-selection behavior and non-Chromium browsers were **not** exercised;
  IME checks used `KeyboardEvent.isComposing` in component tests and Chromium.
- Browser session closed after QA; shared profile and all existing servers preserved.
