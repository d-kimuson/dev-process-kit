# Move grill's questions into the core shell

## Status

accepted

## Context

`dpk-template-grill` was a template whose entire subject was a set of questions for the reader: the questions lived in its base data (`questions[]`, `history[]`), it placed Q badges over whatever the author slotted into `main` (the author's own markup, or a diagram component's nodes), and it answered them as a dedicated action vocabulary (`ANSWER_QUESTION`). Apart from that, grill's own page was the same shell every other template already has — header, main slot, review rail, hand-off — plus a Questions tab standing in for (and sharing storage with) the ordinary comments tab.

Asking the reader what is still open is not unique to a page whose whole point is questions. A USM, a prototype or a plain page routinely needs the same thing alongside its own subject — "which option for this story", "is this screen's copy final" — but a page is exactly one template (`docs/index.md`, one root per file), so combining grill with another template meant two separate pages and two separate hand-offs, or dropping the questions into prose and losing the structured answer/review/staleness machinery entirely.

Looked at this way, grill was not a distinct meaning model; it was the shared shell plus one feature (questions) that happened to be the only thing on the page. Keeping it as a template meant that feature was available only when nothing else was.

## Decision

Questions move from the `grill` template into `TemplateElement`, the shell every `dpk-template-*` extends, so any template can ask them:

- The questions are not base data. They live in a block of their own, a sibling of the base-data script: `<script type="application/json" data-dpk-grill>{"questions": [...], "history"?: [...]}</script>`, parsed and rendered by the shell independently of the template's own schema.
- The shell owns the answer as a core-level concern: the action type `answer`, targeting `grill:<id>` (payload `{kind:'option',optionId}` | `{kind:'free',text}` | `{kind:'clear'}`). Templates must not redefine this type or target. Questions are also ordinary comment targets, so a reviewer can leave a note on one without answering it.
- The shell renders the Q badges over the main column (the author's own `data-grill-questions` marks, or a diagram component's matching nodes) and a question-mark toggle in the header, between the changes and comments toggles, with an `answered / total` badge — present only while the page has questions.
- `dpk-template-grill` and its `templates/grill.js` entry are removed. There is no replacement template; a page that was grill becomes `plain` (or whichever template fits its content) with a `data-dpk-grill` block.

## Consequences

- **Breaking for existing pages.** A page written against `dpk-template-grill` stops rendering once it loads a kit version that no longer registers that element (pinned pages on an old version are unaffected; see the version-switch ADR). Regenerating it means picking another template and moving `questions` / `history` into `data-dpk-grill`.
- **One review, one hand-off, any template.** A page can show its own subject and ask decision questions in the same draft, the same review popover and the same brief, instead of choosing between them.
- **New core vocabulary.** `answer` and the `grill` target type join `comment` as action types every template definition must leave alone; `withGrill` (`src/core/grill-targets.ts`) is how a template definition is extended with them, the same shape as `withComponentSnapshot` for diagram elements.
- **Smaller entry surface.** `templates/grill.js` no longer exists (`dev-docs/adr/20260920_per-template-entries.md`); the questions feature now ships inside `src/core/element.ts` and is part of every template entry's base cost instead of a separate download.

## References

- [ADR: Ship one entry per template, and one entry for the components](20260920_per-template-entries.md)
