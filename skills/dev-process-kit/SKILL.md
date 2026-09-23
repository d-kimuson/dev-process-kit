---
name: dev-process-kit
description: Build shared understanding with the user through single-file HTML artifacts that they review and comment on in the browser. Use when the user should check or agree on your understanding — requirements, a design, a domain, a plan, open questions — instead of a long text reply.
---

# dev-process-kit

Show what you understood as one HTML file. The user operates and comments on it in the browser and hands the review back as a brief; you rewrite the file. Repeat until you agree.

## Principles

Humans have little context and do not read long text well.

- **Visualize.** Put the structure in a map or diagram; prose only for what a picture cannot say.
- **Narrow.** Include only what the user needs to agree or disagree. Omit the obvious and the off-topic.
- **Dig through dialogue.** Surface decisions and uncertain points instead of pre-answering them, and go deeper where the user's comments point.

## Steps

1. Fetch <https://dev-process-kit.kimuson.dev/llms.txt> and read the latest version's `docs/index.md`.
2. Pick one template (and any components) and read only their pages.
3. Write the HTML in the user's language, with the version pinned, and give the user the file.
4. On a brief, apply it to the base data and answer the comments in the next version.

| Agree on                                  | Template                         |
| ----------------------------------------- | -------------------------------- |
| Scope and release slicing                 | `usm`                            |
| Domain events, commands and causality     | `event-storming`                 |
| Rules of a story, with concrete examples  | `example-mapping`                |
| Screen flow and what each step looks like | `prototype`                      |
| Decisions you need from the user          | `grill`                          |
| Anything else                             | `plain`, with diagram components |
