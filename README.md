# dev-process-kit

[![npm](https://img.shields.io/npm/v/dev-process-kit?logo=npm&label=npm)](https://www.npmjs.com/package/dev-process-kit)
[![npm beta](https://img.shields.io/npm/v/dev-process-kit/beta?logo=npm&label=beta&color=orange)](https://www.npmjs.com/package/dev-process-kit?activeTab=versions)
[![jsDelivr](https://img.shields.io/jsdelivr/npm/hm/dev-process-kit?logo=jsdelivr&label=jsDelivr)](https://www.jsdelivr.com/package/npm/dev-process-kit)
[![CI](https://img.shields.io/github/actions/workflow/status/d-kimuson/dev-process-kit/ci.yml?branch=main&logo=github&label=CI)](https://github.com/d-kimuson/dev-process-kit/actions/workflows/ci.yml)
[![Samples](https://img.shields.io/github/actions/workflow/status/d-kimuson/dev-process-kit/pages.yml?branch=main&logo=githubpages&label=samples)](https://d-kimuson.github.io/dev-process-kit/)
[![License: MIT](https://img.shields.io/npm/l/dev-process-kit?color=blue)](LICENSE)
<br />
[![Web Components](https://img.shields.io/badge/Web_Components-no_build-29abe2?logo=webcomponentsdotorg&logoColor=white)](docs/index.md)
[![Agent skill](https://img.shields.io/badge/agent_skill-dev--process--kit-d97757?logo=anthropic&logoColor=white)](skills/dev-process-kit/SKILL.md)
[![Claude Code plugin](https://img.shields.io/badge/Claude_Code-plugin-d97757?logo=claude&logoColor=white)](#install-the-skill)

Design-process documents as single HTML files: an agent generates one, a human reviews it in the
browser, and the review comes back as structured change requests the agent can apply.

## Features

- **Rich diagrams with almost no code.** Parts for the traditional diagrams a development process uses, ready to drop into your markup.
- **No setup.** The components are made for a single-file HTML page and ship as Web Components: one `<script>` tag, and they are there.
- **Feedback without leaving the page.** Operate the diagram and comment on individual elements in the UI, then copy the operations and the comments out as a hand-off to an agent.
- **Ask, don't just show.** Any template can carry questions for the reader to answer — a core feature of the shell, not a template of its own ([docs/index.md](docs/index.md), Questions (grill)).
- **First-class support for Claude Artifacts.** Published from Claude Code as a Claude Artifact, the page follows the claude.ai theme and sends the review straight back to the Claude session with one click: no copy and paste.

## Why dev-process-kit?

Now that AI writes the code, the bottleneck has moved to the human side: the cognitive load of reading, checking and agreeing on what was built. dev-process-kit supports that human context engineering.

It does so with one consistent loop:

```mermaid
flowchart LR
  ask["① Human asks the agent"] --> present["② Agent presents the context and what<br/>it understood, in a form a human<br/>reads at a glance"]
  present --> review["③ Human reviews it and feeds<br/>back the gaps and the details"]
  review -->|"draft actions + brief"| present
```

② is why the kit ships the formats that have proven themselves for building shared understanding between human engineers — user story mapping, ER diagrams and the rest.

③ goes further than showing a picture: where a format allows it, the page can be operated directly in the browser, and those operations are collected as a log and handed to the agent, which rewrites the page itself.

## Usage

dev-process-kit is built to be used by an agent: the instructions for LLMs are the [`dev-process-kit` skill](skills/dev-process-kit/SKILL.md). It is published to npm as [`dev-process-kit`](https://www.npmjs.com/package/dev-process-kit), a page loads it from jsDelivr with the version pinned, and the documentation of each version is [`docs/`](docs/index.md) at its `v<version>` tag.

The samples of `main` are live at https://d-kimuson.github.io/dev-process-kit/.

The shortest way to try it is to hand the skill to an agent and say what you want:

```markdown
Create a USM for this product.
Follow https://raw.githubusercontent.com/d-kimuson/dev-process-kit/main/skills/dev-process-kit/SKILL.md.
```

### Claude Artifacts

Claude Code can publish the page as a Claude Artifact instead of a local file, and dev-process-kit supports that as a first-class target:

- **One-click hand-off.** With the `comments` and `db` capabilities declared, the review rail offers **Send to Claude** in place of copying. The review arrives in the Claude Code session that published the page, which applies it and republishes to the same URL.
- **Fits the viewer.** The template follows the reader's claude.ai light / dark theme and sizes itself to the viewer's frame.
- **Nothing to configure.** The page detects the Artifact at runtime; outside one, or when a send cannot land, the copy hand-off stays as it is.

[docs/claude-artifact.md](docs/claude-artifact.md) tells the agent when to publish such a page and how to write it; the skill sends the agent there whenever it can publish an Artifact.

### Install the skill

The `dev-process-kit` agent skill tells the agent when to reach for a page and how to keep it focused.

```sh
# Any agent supported by the skills CLI
npx skills add d-kimuson/dev-process-kit
```

```text
# Claude Code
/plugin marketplace add d-kimuson/dev-process-kit
/plugin install dev-process-kit@dev-process-kit
```

## Supported components

dev-process-kit ships **templates**, which make up a whole page, and **components**, which you combine inside one.

### Templates

| Template | Element | What it is |
| Task Context Board | `dpk-template-task-board` | Where a task shared by an agent and a person stands: why and what (a short design doc, with diagrams), todos with assignees and proposals, outputs (URLs / paths), the conversation log with the current status, and questions the agent works around on an assumption; replies and todo changes go back as drafts |
| Delegation Poker | `dpk-template-delegation-poker` | Management 3.0 delegation poker: for each decision area, everyone plays one of seven delegation levels (Tell … Delegate); played straight on the delegation board, whose row stays face down until the reader plays on it, then settled on one agreed level per row; `mode="strict"` makes the played card final |

Event Storming, Example Mapping and Whiteboard are diagram components, not templates (below) — each works embedded inside any template, or as a page's board (`variant="board"`, `docs/components/diagrams.md`).

### Components

| Component        | Element                | What it is                                                                                                                                                                                                                                                                    |
| ---------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Review rail      | `dpk-comment-panel`    | Draft actions and comments, stale markers, deletion, and the copy or send-to-Claude hand-off                                                                                                                                                                                  |
| Inline editing   | `dpk-inline-edit`      | A text/multiline editor that emits `dpk-commit`                                                                                                                                                                                                                               |
| State diagram    | `dpk-state-diagram`    | Which states exist, and what moves between them                                                                                                                                                                                                                               |
| Sequence diagram | `dpk-sequence-diagram` | In what order participants talk                                                                                                                                                                                                                                               |
| Dependency graph | `dpk-dependency-graph` | What depends on what, and what is circular                                                                                                                                                                                                                                    |
| ER diagram       | `dpk-er-diagram`       | What changed between two schema snapshots                                                                                                                                                                                                                                     |
| Architecture map | `dpk-architecture-map` | Which services exist, in which boundary                                                                                                                                                                                                                                       |
| Mind map         | `dpk-mind-map`         | A central topic and its subtopics, fanned out left and right, with folding                                                                                                                                                                                                    |
| Kanban           | `dpk-kanban`           | Columns of cards with WIP limits; reviewers move and add cards as draft actions                                                                                                                                                                                               |
| Formal spec      | `dpk-formal-spec`      | What a verified property says (premises, conclusions, what it does not claim), in plain words                                                                                                                                                                                 |
| Whiteboard       | `dpk-whiteboard`       | A free-form board like Miro: sticky notes, text, shapes and titled frames anywhere on a pannable, zoomable canvas, joined by labeled connectors; the reader drags, resizes, recolors, adds, edits and connects them, and a move is described by the frame it leaves and joins |
| Event Storming   | `dpk-event-storming`   | Sticky notes on swimlanes in timeline order, with causality links between them                                                                                                                                                                                                |
| Example Mapping  | `dpk-example-mapping`  | One story per column, rules beneath it, examples beneath each rule, questions pinned to any of them                                                                                                                                                                           |

Diagrams and the formal spec are components, not templates: no draft actions, no review rail, no navigation of their own — except when given `variant="board"` and hosted directly as a page's board, where they gain all three the same way a template does (`docs/components/diagrams.md`, `docs/page.md`). Put them in your own page, or inside a template. Each one has a page under `docs/components/<name>.md`.

## License

MIT
