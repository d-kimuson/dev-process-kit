# Template: grill (`<artifact-grill>`)

A review of questions over whatever the author puts in the main area. The
questions are base data, the answers are draft actions, and the badges that tie
them together sit on your own markup — a diagram component, a table, prose.

```text
artifact-grill
  corner    the 質問 button (top right, where the other templates show their
            review button) — folds the question column away,
            badge = 回答済み / 全件
  main      slot="main" — your content, with the Q badges layered over it
  rail      the question list on the right (filters, choices, free text, copy)
```

The template supplies meaning and layout; the core supplies the pipeline, the
persistence and the hash navigation. The core comment rail is **not** part of this
template's UI — the questions are the review, and the answers still travel as
draft actions underneath.

## Base data

```json
{
  "title": "新機能: 在庫予約つき注文フロー",
  "questions": [
    {
      "id": "reservation-table",
      "ref": "Q1",
      "title": "在庫予約テーブルは本当に必要？",
      "description": "在庫数を直接減らす案と比べて、予約を第一級の概念にするかを決めます。",
      "note": "予約が残ったまま消えると、在庫が永久に引当たままになる。",
      "options": [
        { "id": "own-table", "label": "専用テーブルで予約を持ち、有効期限と解放を明示的に管理する" },
        { "id": "counter", "label": "在庫テーブルに確保数のカラムを足し、予約は持たない" }
      ]
    }
  ]
}
```

| Field         | Required | Meaning                                                                |
| ------------- | -------- | ---------------------------------------------------------------------- |
| `title`       | no       | Artifact title in the chrome. Defaults to `Visually Grill`.            |
| `questions[]` | yes      | The questions, in reading order. An empty list is allowed but useless. |

Per question:

| Field         | Required | Meaning                                                          |
| ------------- | -------- | ---------------------------------------------------------------- |
| `id`          | yes      | Stable key. It is what a draft action targets (`question:<id>`). |
| `ref`         | no       | Display label (`Q1`). Defaults to the 1-based position.          |
| `title`       | yes      | The question.                                                    |
| `description` | no       | Why it matters; shown when the question is open.                 |
| `note`        | no       | One-line provocation shown with the description.                 |
| `options`     | no       | `[{ id, label }]`, rendered as `(a)`, `(b)`, … choices.          |
| `freeText`    | no       | `false` renders a select-only question (default `true`).         |

Unknown keys, duplicate question ids and duplicate option ids throw: the artifact
renders the error banner and starts empty, like every other template.

Answers never appear in the base JSON — they are what the reader produced.

## Action vocabulary

| Action            | Target     | Payload                                                                           |
| ----------------- | ---------- | --------------------------------------------------------------------------------- |
| `ANSWER_QUESTION` | `question` | `{ kind: 'option', optionId }` \| `{ kind: 'free', text }` \| `{ kind: 'clear' }` |

One action per question, and it is a **patch**: answering the same question again
replaces the previous answer instead of stacking, and re-selecting the same answer
is compacted away as a no-op. `clear` removes the answer and returns the question
to unanswered.

A rejected answer never lands in the draft: an unknown question or option makes
the action **stale** (`target-missing` / `constraint-violated`) and the rail says
so.

```json
ANSWER_QUESTION question:reservation-table {"kind":"option","optionId":"own-table"}
```

## Navigation

The open question is navigation, not a draft action:

```text
#question=release-path
```

- `resolveNavigation` fills it with the first question, and re-points it when the
  question it names disappears.
- Clicking a Q badge on the main area navigates, and the list scrolls that
  question into view.
- `data-artifact-navigate="question=release-path"` on your own markup works too,
  so a diagram can link to the question about it.
- `currentTarget()` is that question, so the review composer's “attach to the
  current …” checkbox points the comment at it.

Filters (`すべて` / `未回答` / `回答済み`) are view state, not navigation.

## Main area

`slot="main"` is yours, and the template captures it inside its own stage so the
badges share a coordinate space with the content:

```html
<artifact-grill storage-key="checkout-review">
  <script type="application/json">
    { "title": "在庫予約の設計レビュー", "questions": [ … ] }
  </script>

  <div slot="main">
    <artifact-er-diagram>…</artifact-er-diagram>
    <artifact-sequence-diagram>…</artifact-sequence-diagram>
  </div>
</artifact-grill>
```

Two ways to place a badge:

| Where                   | How                                                |
| ----------------------- | -------------------------------------------------- |
| Your own markup         | `data-grill-questions="Q1 Q4"` on the element      |
| Inside a diagram's data | `"questions": "Q1 Q4"` on a node, field or message |

The second one exists because a diagram component renders its own nodes into its
shadow root; the template reaches across that boundary to place the badge on the
exact table, field or message the question is about. Badges follow a diagram's
pan and zoom, and a card panned out of the canvas takes its badge with it.

An element may carry several references; a reference no question matches is
ignored.

## UI provided by the template

- **Question list** (right): filter row, one card per question with its choices
  and free-text answer, and `回答をコピー` (the answered subset as Markdown). The
  button reports the outcome — `コピーしました` / `コピーできませんでした` — and
  returns to its label after a moment, so the click is never silent.
- **質問 button** (top right, where the other templates put their review button):
  a round button with an `回答済み / 全件` badge. It folds the question column
  away, so its width goes back to the main area — the point of folding a side
  panel.
- **Q badges** (main): one per reference, red until the question is answered,
  green after; clicking opens the question.
- **Auto-advance**: choosing an option records it and opens the next unanswered
  question the filter shows, so the review walks itself. Free text is not
  interrupted while typing — `⌘/Ctrl+Enter` moves on. When nothing is left
  unanswered, the review stays where it is.

The core comment rail and its floating button are hidden here: the question list
is the review, and `回答をコピー` is the hand-off. Answers are still draft actions
(author markup can use `element.artifact.exportBrief()`, and the answers survive
a reload through the draft storage).

A page that wants the rail back can ask for it, because the two surfaces read a
custom property:

```css
artifact-grill {
  --grill-notes-display: flex;
  --grill-fab-display: inline-flex;
}
```

## Naming

- `question` is the only target type; the artifact-wide target stays `artifact`.
- Ids come from the base JSON and never change meaning. A question that is
  removed takes its answer with it (stale).

## Sample

`sample/grill.html` — an ER diff and a sequence diagram for a new feature, with
six questions: three on the schema and three on the flow.
