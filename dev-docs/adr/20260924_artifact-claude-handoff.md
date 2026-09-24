# Hand the review to Claude through the Artifact comment channel

Inside a Claude Artifact, the review goes to the Claude session that published the page as a comment sent to Claude, with long briefs stored in the artifact's database. Everywhere else the clipboard hand-off stays the only one.

## Status

accepted

## Context

The hand-off has been the clipboard: the reader copies the brief and pastes it into the agent. When the page is a Claude Artifact, the viewer offers channels that reach the agent directly, so pasting becomes the slowest part of the review loop. Several candidates exist, and each has limits:

- **Comments sent to Claude** (`comments.sendToClaude`) arrive in the publishing session as a turn pinned to the page, which is where the agent already works. One comment carries at most 4 KiB, and a send needs a recent user gesture, the reader's consent and a live session. The full `comments` grant makes the artifact organization-internal.
- **The artifact database** (`db`) holds documents up to 256 KiB that the agent can read with its own tools, but nothing tells the agent that a document was written.
- **Asking Claude from the page** (`sample`) runs a model on the reader's account without the agent's context, so it cannot apply the review to the base data.
- **Having the page republish itself** (`artifact`) would make the page mutate its own base data, which the kit rules out: the agent's rewritten HTML is the source of truth.

## Decision

- **The comment is the notification, the database the payload.** A brief that fits is sent inline. A longer one is stored as a document in the `reviews` collection, and the comment names its path. The document keeps both the brief and the canonical draft JSON, the same pair the copy buttons produce.
- **The channel is detected, not configured.** The page asks the viewer for the `comments` and `db` capabilities at runtime and offers **Claude に送る** only while the viewer reports that a send can land. The publisher opts in by declaring the capabilities; the page carries no attribute for it.
- **Copying stays.** The copy buttons remain beside the send button, and a failed send names the reason and points back to them. Outside an Artifact nothing changes.
- **The capability calls live in one core adapter.** Templates and the review rail receive a `sendToClaude` callback and render its outcome; they never touch `window.claude`.

## Consequences

- In an Artifact that declares the capabilities, a review reaches the agent in one click, and the agent answers in the comment thread and republishes to the same URL.
- Publishers trade reach for the channel: with `comments` the artifact cannot be shared publicly. A public page leaves the capability out and keeps the clipboard hand-off.
- The agent has to follow a pointer for long reviews, and stored reviews accumulate in the artifact's database until the agent removes them.
- The adapter depends on the viewer's capability API, which is external and versioned by the viewer. Every member is checked before use and an unknown shape falls back to copying, but a changed contract silently hides the button until the adapter is updated.

## References

- [Publishing the page as a Claude Artifact](../../skills/dev-process-kit/references/claude-artifact.md)
