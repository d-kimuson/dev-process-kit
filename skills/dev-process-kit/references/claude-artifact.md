# Publishing the page as a Claude Artifact

Read this when the page goes to the user as a Claude Artifact instead of a local file. The Artifact viewer wraps the file in its own document and runs it in a locked-down frame; a page written like a local file renders, but the height breaks.

## The file

Write the page content only. The viewer adds `<!doctype html>`, `<html>`, `<head>` and `<body>` itself, with a charset / viewport meta and a small reset:

```html
<title>注文セルフキャンセルの論点</title>
<script type="module" src="https://cdn.jsdelivr.net/npm/dev-process-kit@<version>/dist/templates/grill.js"></script>
<style>
  html,
  body {
    height: 100%;
    margin: 0;
  }
  dpk-template-grill {
    display: block;
    height: 100%;
  }
</style>

<dpk-template-grill lang="ja" storage-key="order-cancel-review">…</dpk-template-grill>
```

- **`<title>` first.** Only the first 8 KB is scanned for it, and it names the artifact in the gallery: a short name for the subject, not "name — explanation".
- **Height is `100%`, never `100vh` / `100dvh`.** The viewer pads `:root` by the device's safe-area insets, so a viewport-sized template element overflows by that padding: the page gets a second scrollbar and the rail and header jump while scrolling. Give `html` and `body` `height: 100%` and the template element `height: 100%`.
- **`lang` on the template element.** You do not control the viewer's `<html>`, so declare the page's language on the template element; the kit's own UI follows it and falls back to English.
- **Leave the ground and the theme to the template.** The viewer stamps the reader's claude.ai theme on `<html data-theme>`, and the template follows it (the reader can still flip it with the header toggle). Do not paint `html` / `body` or force `color-scheme`, and write your own CSS with `var(--dpk-*)` so it switches too.
- **Scripts from jsDelivr only.** The CSP admits `cdn.jsdelivr.net/npm/` for scripts; the kit fetches nothing else at runtime, so the pinned entries are all it needs.

## Sending the review to Claude

Declare `capabilities: { comments: {}, db: {} }` on the first publish, and the review rail (in grill: the footer) offers **Send to Claude** in place of copying: the brief arrives in your session as a comment sent to Claude, pinned to the template, and the user no longer pastes anything.

- **`comments: {}` is the switch.** Its full form (not `composer_only`) is what lets the page send to Claude, and it makes the artifact organization-internal: a public link cannot be shared, and readers without comment access see the copy buttons only. Leave it out when the page has to be public; the page then works as a local file does.
- **`db: {}` carries long reviews.** One comment holds 4 KiB. A longer brief is stored as a document in the `reviews` collection and the comment names its path; without `db` the page asks the reader to copy instead.
- **The button shows only when a send can land** — the reader can comment and your session is there to receive it. A failed send says why and leaves the copy buttons beside it.

When the comment arrives:

1. If it points at `reviews/<id>`, read that document with `ArtifactData` (`get`, collection `reviews`). `brief` is the same markdown the copy button gives; `draft` is the canonical draft JSON.
2. Apply the brief to the base data as usual and republish to the same artifact.
3. Answer in the comment's thread with `ArtifactComments`: what changed, and anything you did not apply and why.

## What behaves differently

- **No deep links.** Only a bare `#token` from the artifact's URL reaches the page, never `#question=deadline`. Navigation inside the page works as usual; do not hand the user a hash URL as a way to open a specific question or step.
- **Drafts stay in the reader's browser.** LocalStorage is per artifact and per reader: it survives republishing to the same URL, and never reaches Claude or other readers. Keep `storage-key` unchanged across versions so a review in progress survives your republish; what reaches you is the brief the reader sends or pastes.
- **No browser dialogs.** `alert` / `confirm` / `prompt` never show; do not rely on them in slotted markup.

## Revising

After a brief, rewrite the same file and republish it to the same artifact (same file path in the session, or the artifact's URL) so the user keeps one link. Against the new base, actions that no longer change anything drop out of the reader's draft; actions whose target you removed or changed become stale — they stay greyed out in the review rail until the reader removes them, and the next brief lists them under "Not applicable to the current base" instead of as requested changes. Do not re-apply those. Omit `capabilities` on a republish: the declaration carries forward.
