# Browser smoke record — 2026-09-19

Real-browser verification of the published bundle (AC 7.4). Run with `agent-browser`
(devDependency) against the built `public/` tree, following `docs/guidelines/qa.md`.

## Environment

- Commit: `78c8ca1` (working tree clean)
- Bundle: `public/dev-process-kit@0.0.1/index.js` produced by `pnpm build`
- Server: `PORT=<free port> pnpm dev:serve` (pueue task; `http-server public -c-1 --silent`)
  - Started on an OS-assigned free port because 8099 was already taken by an unrelated
    process — the collision portless exists to avoid.
- Browser: `pnpm exec agent-browser --session browser-ops --profile
"$HOME/.config/agent-browser/profiles/shared" --headed false` (headless, shared
  agent profile per the browser-ops skill)

## Results

| Check                                 | Result                                                                                             |
| ------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `sample/prototype.html` renders       | PASS — title `UX Prototype — Kumoma サンプル`, no error banner, review rail present                |
| `sample/usm.html` renders             | PASS — title `User Story Mapping — サンプル`, no error banner, review rail present                 |
| `sample/event-storming.html` renders  | PASS — title `Event Storming — フードデリバリー注文フロー`, no error banner, review rail present   |
| `agent-browser errors` on each sample | PASS — empty (no page errors)                                                                      |
| Hash canonicalisation                 | PASS — `#activity=onboarding&preview=landing-mobile&step=landing&story=account` after load         |
| `dispatch` updates the rendered UI    | PASS — `SET_STEP_NAME` on `landing` rendered as `LP ランディング` in the step list                 |
| Review rail lists the draft           | PASS — rail showed `Step 名を変更` and `コメント`                                                  |
| Draft survives reload (LocalStorage)  | PASS — after reload: step name `LP ランディング`, 1 comment, 2 actions                             |
| Evidence                              | screenshot captured (prototype sample); QA draft cleared afterwards and the browser session closed |

The same check runs as one command (used above):

```sh
PORT=<free> pnpm dev:serve &
pnpm qa:browser http://127.0.0.1:<free>
# PASS prototype: errors="" state={"banner":false,"rail":true}
# ... usm / event-storming
# ✔ all samples rendered without page errors
```

## Commands (abbreviated)

```sh
pnpm build
pueue add -- env PORT=<free> pnpm dev:serve
AB="pnpm exec agent-browser --session browser-ops"
$AB open "http://127.0.0.1:<port>/sample/prototype.html"
$AB errors
$AB eval "document.querySelector('artifact-prototype').artifact.state.activities[0].stories[0].steps[0].name"
$AB close
```

The same procedure applies to every template; only the element tag and the base data differ.
