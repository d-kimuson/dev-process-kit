# Publishing the page as a Claude Artifact

When your session has the Artifact tool, publish the page as an Artifact and give the user its link. The user opens one link, reviews in place, and can send the review straight back to you. Hand over a local file only when there is no Artifact tool or the user asks for a file.

The kit works inside the viewer. Navigation — the step list, the mock's links, every hash the kit writes — works as in a local file; only a deep link from outside does not reach the page (see [What behaves differently](#what-behaves-differently)). Drafts are kept in the reader's browser there as well. None of the viewer's limits is a reason to fall back to a local file.

Read this page before you write the file: the viewer wraps the file in its own document and runs it in a locked-down frame, so a page written like a local file renders, but its height and ground break. Read it again before the first publish: the review comes back to you only when that publish declares the capabilities in [Sending the review to Claude](#sending-the-review-to-claude).

## The file

Write the page content only. The viewer adds `<!doctype html>`, `<html>`, `<head>` and `<body>` itself, with a charset / viewport meta and a small reset that paints `body` an off-white:

```html
<title>注文セルフキャンセルの論点</title>
<script type="module" src="https://cdn.jsdelivr.net/npm/dev-process-kit@<version>/dist/views/usm.js"></script>
<style>
  html,
  body {
    height: 100%;
    margin: 0;
  }
  dpk-app {
    display: block;
    height: 100%;
  }
</style>

<dpk-app lang="ja" storage-key="order-cancel-review">
  <dpk-page name="usm">
    <dpk-view-usm>…</dpk-view-usm>
  </dpk-page>
</dpk-app>
```

- **`<title>` first.** Only the first 8 KB is scanned for it, and it names the artifact in the gallery: a short name for the subject, not "name — explanation".
- **The app element is the whole page.** Put it directly in the file, not inside a wrapper, and give `body` no padding: the element fills the window edge to edge and lays out its own gutters.
- **Height is `100%` — never left out, never `100vh` / `100dvh`.** Give `html` and `body` `height: 100%` and the app element `height: 100%` ([Page height](index.md#page-height)). Without a height the app falls back to the window's height less the safe-area padding, which fits here, but the page then rests on a guess. A viewport-sized element overflows instead, because the viewer pads `:root` by the device's safe-area insets: the page gets a second scrollbar and the rail and header jump while scrolling.
- **`lang` on the app element.** You do not control the viewer's `<html>`, so declare the page's language on the app element; the kit's own UI follows it and falls back to English.
- **Leave the ground and the theme to the app.** The viewer stamps the reader's claude.ai theme on `<html data-theme>`, and the app follows it (the reader can still flip it with the header toggle). Do not paint `html` / `body` or force `color-scheme`, and write your own CSS with `var(--dpk-*)` so it switches too.
- **This page's rules win over generic Artifact design guidance.** The Artifact tool has you load design guidance for any page (`artifact-design`): a token palette with dark-mode blocks, a background painted on `body`, a side gutter on `body`, your own fonts. On a kit page the app already does each of these for the page, so apply that guidance only inside your own mock content (a prototype's previews, plain's sections), never to `html`, `body` or the app element.
- **Scripts from jsDelivr only.** The CSP admits `cdn.jsdelivr.net/npm/` for scripts, so the pinned entries are all the page needs. The only other request the kit makes is the version list behind the header's version select (`data.jsdelivr.com`), and only when the reader opens that select; where the viewer blocks it, the select lists the running version alone.

## Sending the review to Claude

Declare `capabilities: { comments: {}, db: {} }` on the first publish, and the review rail (on a page with questions, also the Questions tab's own footer) offers **Send to Claude** in place of copying: the brief arrives in your session as a comment sent to Claude, pinned to the app element, and the user no longer pastes anything.

- **`comments: {}` is the switch.** Its full form (not `composer_only`) is what lets the page send to Claude, and it makes the artifact organization-internal: a public link cannot be shared, and readers without comment access see the copy buttons only. Leave it out only when the page has to be public; the page then works as a local file does, with no **Send to Claude** at all — the reader sees only the copy buttons, and nothing on the page says why.
- **Forgot it?** Republish to the same artifact with the `capabilities` declared; the link stays the same and the button appears.
- **`db: {}` carries long reviews.** One comment holds 4 KiB. A longer brief is stored as a document in the `reviews` collection and the comment names its path; without `db` the page asks the reader to copy instead.
- **The button shows only when a send can land** — the reader can comment and your session is there to receive it. A failed send says why and leaves the copy buttons beside it.

When the comment arrives:

1. If it points at `reviews/<id>`, read that document with `ArtifactData` (`get`, collection `reviews`). `brief` is the same markdown the copy button gives; `draft` is the canonical draft JSON.
2. Apply the brief to the base data as usual and republish to the same artifact.
3. Answer in the comment's thread with `ArtifactComments` (`reply`, the `thread_id` from the notification): what changed, and anything you did not apply and why. Then `resolve` the thread.

The reader sees your answer only in that thread. The page never shows the database: a reply written into `reviews/<id>` (or anywhere else with `ArtifactData`) reaches no one. Say you answered only after the `reply` call succeeded; if it returns guidance instead (the thread is not activated for Claude), give the answer in your session and tell the user the thread did not get it.

## What behaves differently

- **No deep links.** Only a bare `#token` from the artifact's URL reaches the page, never `#question=deadline`. Navigation inside the page works as usual — the app still keeps its state in the hash while the reader moves around — so do not hand the user a hash URL as a way to open a specific question or step, but do not avoid the Artifact for this either.
- **Drafts stay in the reader's browser.** LocalStorage is per artifact and per reader: it survives republishing to the same URL, and never reaches Claude or other readers. Keep `storage-key` unchanged across versions so a review in progress survives your republish; what reaches you is the brief the reader sends or pastes.
- **No browser dialogs.** `alert` / `confirm` / `prompt` never show; do not rely on them in slotted markup.

## Revising

After a brief, rewrite the same file and republish it to the same artifact (same file path in the session, or the artifact's URL) so the user keeps one link. Against the new base, actions that no longer change anything drop out of the reader's draft; actions whose target you removed or changed become stale — they stay greyed out in the review rail until the reader removes them, and the next brief lists them under "Not applicable to the current base" instead of as requested changes. Do not re-apply those. To tell the reader what changed, append a version with this round's changes to the page's [change log](index.md#change-notices) instead of rewriting it. Omit `capabilities` on a republish: the declaration carries forward (unless the first publish left it out; see above).
