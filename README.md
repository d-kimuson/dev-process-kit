# dev-process-kit

Design-process artifacts as single HTML files: an agent generates one, a human reviews it in the
browser, and the review comes back as structured change requests the agent can apply.

## Features

- **Rich diagrams with almost no code.** Parts for the traditional diagrams a development process uses, ready to drop into your markup.
- **No setup.** The components are made for a single-file HTML page and ship as Web Components: one `<script>` tag, and they are there.
- **Feedback without leaving the page.** Operate the diagram and comment on individual elements in the UI, then copy the operations and the comments out as a hand-off to an agent.

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

③ goes further than showing a picture: where a format allows it, the artifact can be operated directly in the browser, and those operations are collected as a log and handed to the agent, which rewrites the artifact itself.

## Usage

dev-process-kit is built to be used by an agent: the instructions for LLMs live at <https://dev-process-kit.kimuson.dev/llms.txt>.

The shortest way to try it is to hand that URL to an agent and say what you want:

```markdown
Create a USM for this product.
Use https://dev-process-kit.kimuson.dev/llms.txt.
```

### Install the skill

The `dev-process-kit` agent skill tells the agent when to reach for an artifact and how to keep it focused.

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

| Template           | Element                    | What it is                                                                                                                                                  |
| ------------------ | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UX Prototype       | `artifact-prototype`       | `Activity › UserStory › Step › Preview[]`: one step is one page or experience state, with previews per viewport                                             |
| User Story Mapping | `artifact-usm`             | The backbone (activity › step) as columns, milestones as rows                                                                                               |
| Event Storming     | `artifact-event-storming`  | Sticky notes on swimlanes in timeline order, with causality links between them                                                                              |
| Example Mapping    | `artifact-example-mapping` | One story per column, rules beneath it, examples beneath each rule, questions pinned to any of them                                                         |
| Grill              | `artifact-grill`           | A review of questions over whatever you put in the main area: the questions are base data, the answers are draft actions, the badges sit on your own markup |
| Plain              | `artifact-plain`           | For a page no other template fits: only the header and the review (comments) pipeline around your own markup                                                |

### Components

| Component        | Element                     | What it is                                                                                   |
| ---------------- | --------------------------- | -------------------------------------------------------------------------------------------- |
| Review rail      | `artifact-comment-panel`    | The draft actions and comments, stale markers, deletion, and the copy hand-off for the agent |
| Inline editing   | `artifact-inline-edit`      | A text/multiline editor that emits `artifact-commit`                                         |
| State diagram    | `artifact-state-diagram`    | Which states exist, and what moves between them                                              |
| Sequence diagram | `artifact-sequence-diagram` | In what order participants talk                                                              |
| Dependency graph | `artifact-dependency-graph` | What depends on what, and what is circular                                                   |
| ER diagram       | `artifact-er-diagram`       | What changed between two schema snapshots                                                    |
| Architecture map | `artifact-architecture-map` | Which services exist, in which boundary                                                      |
| Mind map         | `artifact-mind-map`         | A central topic and its subtopics, fanned out left and right, with folding                   |
| Kanban           | `artifact-kanban`           | Columns of cards with WIP limits; reviewers move and add cards as draft actions              |

Diagrams are components, not templates: no draft actions, no review rail, no navigation. Put them in your own page, or inside an artifact. Each one has a page — `docs/templates/<name>.md` and `docs/components/<name>.md`.

## License

MIT
