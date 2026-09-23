# Grill / diagram review integration QA

Historical integration evidence. The later explicit hover-icon interaction supersedes automatic opening on selection; see [ER comment-icon interaction QA](er-comment-hover.md) for the current behavior and checks.

## Build and environment

- Date: 2026-09-23
- Sample: `https://sample.dev-process-kit.localhost/grill.html`
- Modules: `https://dev-process-kit.localhost/dev-process-kit@0.0.1/templates/grill.js` and `components.js` (separate origin).
- Browser: headless Chromium through `pnpm exec agent-browser`, shared `browser-ops` profile.
- Development server: existing `pueue` task 626; contextual-comment browser launch: task 639; final smoke: task 640.
- This evidence reflects the revised ER UX: element-adjacent comments replace the bottom detail area and field-specific controls.

## Acceptance evidence

| Scenario                                       | Result                                                                                                                                                                                                                  |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Replace answer filters with 質問 / Review tabs | PASS: two tabs and one shared panel; combined copy available from either tab                                                                                                                                            |
| Answer a question                              | PASS: Q1 option creates one `ANSWER_QUESTION`, progress becomes 1 / 6, navigation advances to Q2                                                                                                                        |
| Remove bottom details and field comments       | PASS: ER selection renders no `.diagram-details` or `[data-field-comment]`; fields are not comment targets                                                                                                              |
| Selection without layout shift                 | PASS: canvas remains 894 × 535.25 px and diagram 896 × 620 px, with identical positions before and after selecting Orders                                                                                               |
| Comment beside a table                         | PASS: real pointer selection opens the shared composer in the native top layer, with a target label and textarea focus; Ctrl+Enter saves `element:stock-schema/node/orders` and closes it without changing the 質問 tab |
| Comment beside a relationship                  | PASS: real pointer selection of customers → orders opens the same composer; Send saves `element:stock-schema/edge/customers%3Aid%3Eorders%3Acustomer_id`                                                                |
| Review integration                             | PASS: both submitted notes appear in the shared Review panel                                                                                                                                                            |
| Pan / zoom tracking                            | PASS: a completed pointer drag preserves selection; a second drag moves both anchor and composer by −40 px, maintaining an 8 px gap. The zoom button also repositions the composer while its width remains 300 px       |
| Keyboard dismissal                             | PASS: Escape with focus on Cancel closes the manual popover and clears selection                                                                                                                                        |
| Narrow-screen surface                          | PASS: at 390 × 844, the composer flips below the element, remains 300 px wide and fully within the viewport (x=56.08, right=356.08). The sample page itself already has horizontal overflow before opening the composer |
| Combined clipboard hand-off                    | PASS: native clipboard write succeeds; output includes the answer, both notes and every draft action id, and equals `artifact.exportBrief()` exactly                                                                    |
| Reload persistence                             | PASS: after reload, an answer and table comment restore with zero stale actions; subsequent reload retains the relationship comment too                                                                                 |
| Console/page errors                            | PASS: no application page errors during tested operations                                                                                                                                                               |
| Standard browser smoke                         | PASS: prototype, usm, event-storming and grill render without page errors or base-data banners, with a shared comment panel                                                                                             |

The clipboard probe records its payload **after** delegating to the native `navigator.clipboard.writeText`; it does not replace the write with a successful mock. Temporary browser probes initially used an unsupported `view` property and non-piercing selectors; these probe errors were corrected, and pan/zoom evidence uses real pointer dragging and the zoom button.

Screenshots inspected: `/tmp/dpk-er-comment-popover.png`, `/tmp/dpk-er-comment-panzoom.png`, `/tmp/dpk-er-comment-mobile.png`.

## Regressions caught and repaired

- Grill sample loaded only the template entry, leaving diagram elements unregistered. Added the components entry and a regression assertion.
- Graph SVG fragments had HTML namespaces. Changed them to Lit `svg`; tested namespaces and real pointer selection.
- Component registration shadowed native `element` targets, and rejected nested requests could escape. Native target precedence and nearest-artifact ownership now have regression tests, including direct submissions.
- Independent review caught Escape failing from composer buttons and filtering stealing focus back from search. Both have failing-before/passing-after tests.
- Browser QA caught selection being cleared by the click synthesized after a completed pan. The drag marker now survives until that click, with a regression test.
- Floating surfaces now try the perpendicular axis before squeezing to a narrow side, verified at 390 px.

## Automated coverage

- `pnpm typecheck`, `pnpm lint`, `pnpm test`: PASS (38 files, 368 tests).
- Coverage includes per-target unsent drafts, unaccepted submissions, no-rail direct posting, target filtering/removal/restoration, draft import, duplicate ids, open shadow roots and nested ownership; existing Grill tab, graph and sequence tests remain green.
- Release assembly/integrity checks run after rebuilding both stable and debug trees. No commit or deployment is performed.

Non-Chromium behavior was not separately exercised. The sample's pre-existing narrow-screen page overflow is outside this ER comment change.
