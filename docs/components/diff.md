# dpk-diff

The output of `git diff`, laid out for review the way a code host shows a pull request: one card per file with its status and `+N −M`, hunks with the old and the new line numbers, syntax colors, and the changed words of a replaced line marked. The reader switches between the side-by-side (split, the default) and the unified layout and folds files away.

Reviewers comment on a file or on a single line, and **suggest a change** to a line of the new side, the way a ` ```suggestion ` block works on GitHub: the text that should stand in place of that line. Suggestions are element actions in the enclosing view's draft, so they reach the agent with the hand-off, and the diff shows each one under its line.

```html
<dpk-diff id="pr-128" heading="注文合計の型付け">
  <script type="text/x-diff">
    diff --git a/src/total.ts b/src/total.ts
    index 3b18e51..a9f2c3d 100644
    --- a/src/total.ts
    +++ b/src/total.ts
    @@ -1,4 +1,4 @@
     import { sum } from './sum';
    -export const total = (xs) => sum(xs);
    +export const total = (xs: number[]) => sum(xs);

     // end
  </script>
</dpk-diff>
```

Load `components.js` (or the all-in-one `index.js`). Put the element in a view — usually `dpk-view-plain` (`docs/views/plain.md`) — to keep the comments and the suggestions.

## Input

Paste the output of `git diff` (or `git diff --staged`, `git show`, `git format-patch`, `diff -u`) as it is into a `<script type="text/x-diff">` child. `type="text/plain"` is read too. Or set the `diff` property to the same text; the script wins when both are there. The element follows edits to the script.

- The indentation of the first line is removed from every line, and blank lines at both ends are dropped, so the script can be indented with the HTML around it.
- Inside a `<script>`, write `</script` as `<\/script`; the element reads it back.
- What `git show` prints before the first file (the commit header and message) is skipped.
- Added, deleted, renamed and copied files, mode changes, binary files (`Binary files … differ`, `GIT binary patch`), quoted paths (`"a/\346\227\245.md"`) and `\ No newline at end of file` are understood. A binary file shows a note instead of lines.
- A combined diff of a merge (`diff --cc`) is not supported. Text without any file diff, an unreadable hunk header, or a path that appears twice renders the reason instead of the files (`dataError`).

Syntax colors are picked from the file extension, with the grammars of `dpk-code` (`docs/components/code-group.md`): JavaScript / TypeScript (`js`, `ts`, `tsx`, `mjs`, …), HTML / XML / SVG / Vue, CSS, JSON and shell (`sh`, `bash`, `zsh`). Other files are shown uncolored.

## Attributes and properties

| Attribute | Meaning                                                                                  |
| --------- | ---------------------------------------------------------------------------------------- |
| `id`      | Enables comments and suggestions; keep it stable across revisions of the diff            |
| `heading` | The toolbar's title (default: `Diff` / `差分`)                                           |
| `view`    | `split` (default) or `unified`. The reader switches it from the toolbar; it is reflected |

| Property               | Type                                       | Meaning                                                               |
| ---------------------- | ------------------------------------------ | --------------------------------------------------------------------- |
| `diff`                 | `string`                                   | The diff text, used when there is no script child                     |
| `files`                | parsed files (read-only)                   | `{ path, oldPath, newPath, status, binary, hunks, additions, … }[]`   |
| `dataError`            | `string \| null` (read-only)               | Why the diff could not be read                                        |
| `elementActions`       | draft actions (writable)                   | Assigned by the enclosing view, replayed as suggestions on their line |
| `elementActionResults` | `{ id, title, summary?, tone?, stale? }[]` | How each assigned action applied (read-only)                          |
| `elementComments`      | draft comments (writable)                  | Assigned by the enclosing view, shown as threads where they point     |
| `commentTargets`       | `{ value, label, group? }[]`               | Every file and every line (read-only)                                 |

`parseUnifiedDiff(text)` is exported from `components.js` for code that wants the same parse.

## Comment targets

| Target                          | What                                                    | Label in the review rail         |
| ------------------------------- | ------------------------------------------------------- | -------------------------------- |
| `element:<id>/file/<path>`      | A file                                                  | `src/total.ts`                   |
| `element:<id>/line/<path>/R<n>` | Line `n` of the new file: an added or an unchanged line | `src/total.ts:12 export const …` |
| `element:<id>/line/<path>/L<n>` | Line `n` of the old file that was deleted               | `src/total.ts:-7 (deleted) …`    |

`<path>` is the file's path after the change (before it, for a deleted file), percent-encoded as one segment. An agent reading the hand-off maps `R<n>` to line `n` of the new file, `L<n>` to line `n` of the old one.

Each line has one "+" button in the gutter, shown when the pointer is on the line or it has focus. It opens a composer under the line with two tabs, Comment and Suggest change (a deleted line has Comment only); each tab keeps its own text. Right-click a line for "Review comment" or "Suggest change" to open the composer on that tab. A file is commented on from the button in its header. Posted comments stay on the diff as a thread: under the line they were made on, or under the file header for a file comment, oldest first with their time. "Reply…" at the end of a thread opens a box that posts one more comment on the same target (Ctrl/Cmd+Enter posts it, Escape closes it and keeps the text). Edit or delete a comment from the review rail. In the split layout an unchanged line is addressed on its right half. Check Mode treats each file header as one unit; lines are not checked one by one.

## Actions

| Action           | Target                          | Payload              | Result                                |
| ---------------- | ------------------------------- | -------------------- | ------------------------------------- |
| `SUGGEST_CHANGE` | `element:<id>/line/<path>/R<n>` | `{ "text": string }` | Suggests `text` in place of that line |

`text` is what should stand in place of the line: one line, several lines separated by `\n`, or an empty string to delete it. Only lines of the new side (`R<n>`) take a suggestion, as on GitHub. The Suggest change tab starts from the line's current text; Suggest is enabled once the text differs. Ctrl/Cmd+Enter submits the open tab, Escape closes the composer and keeps what was typed, Cancel discards it.

A recorded suggestion is shown under its line as "Suggested change", the original line in red and the suggested lines in green, and appears in the review rail as `Suggested change: src/total.ts:12`. A suggestion whose line is no longer in the diff stays in the draft as stale (`target-missing`).

## Events

| Event                        | Detail                      | Fired when                                                                  |
| ---------------------------- | --------------------------- | --------------------------------------------------------------------------- |
| `dpk-element-action`         | `{ type, target, payload }` | The reader submits a suggestion — bubbling, composed, **cancelable**        |
| `dpk-comment-submit`         | `{ target, body }`          | The reader submits a comment on a file or a line — bubbling, **cancelable** |
| `dpk-comment-targets-change` | none                        | The files or lines, or their labels, changed                                |

Both cancelable events follow the acceptance protocol of every component: the nearest view stores them and calls `preventDefault()`. If nothing accepts one, the popover or the line's composer stays open with its text and says it was not recorded.

## Styling

The element sits in the page's flow and grows with the diff; long lines wrap. Additions and deletions use `--dpk-green` and `--dpk-danger`, syntax colors the `--dpk-code-*` properties of `dpk-code`.

## Slots

None. The data is the script child or the `diff` property.

## Out of scope

Expanding the hidden context between hunks, comments on a range of lines, and editing or resolving a thread inline (the review rail edits and deletes comments).
