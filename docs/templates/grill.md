# Template: grill (`<dpk-template-grill>`)

A review of questions over whatever the author puts in the main area. The questions are base data, the answers are draft actions, and the badges that tie them together sit on your own markup — a diagram component, a table, prose.

```text
dpk-template-grill
  main   slot="main" — your content, with the Q badges layered over it
  rail   Questions / Review tabs on the right, with one combined copy button
  corner the Questions / Review button (top right) — folds the column away,
         badge = answered / total
```

The **Review** tab embeds the same comment panel used by the other templates. Answers, page-wide notes, question comments and diagram-element comments share one persisted draft and one hand-off.

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

| Field         | Required | Meaning                                                 |
| ------------- | -------- | ------------------------------------------------------- |
| `title`       | no       | Page title in the chrome. Defaults to `Visually Grill`. |
| `questions[]` | yes      | The questions, in reading order.                        |

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

Duplicate question ids and duplicate option ids are errors. Answers never appear in the base JSON — they are what the reader produced.

## Action vocabulary

| Action            | Target     | Payload                                                                           |
| ----------------- | ---------- | --------------------------------------------------------------------------------- |
| `ANSWER_QUESTION` | `question` | `{ kind: 'option', optionId }` \| `{ kind: 'free', text }` \| `{ kind: 'clear' }` |

One action per question. Answering a question again replaces the previous answer, and `clear` returns it to unanswered. An unknown question or option makes the action **stale** (`target-missing` / `constraint-violated`), shown in the Review tab and reported by the API.

```json
ANSWER_QUESTION question:reservation-table {"kind":"option","optionId":"own-table"}
```

## Navigation

The open question is navigation, not a draft action:

```text
#question=release-path
```

`resolveNavigation` fills it with the first question and re-points it when the question it names disappears. Clicking a Q badge on the main area navigates, and the list scrolls that question into view; `data-dpk-navigate="question=release-path"` on your own markup works too, so a diagram can link to the question about it. Clicking a badge also opens the Questions tab and unfolds the rail. Tabs are view state, not draft actions; all questions remain in the list.

## Main area

`slot="main"` is yours, and the template captures it inside its own stage so the badges share a coordinate space with the content. When using diagrams, load `components.js` alongside `templates/grill.js` (or use the all-in-one `index.js`):

```html
<dpk-template-grill storage-key="checkout-review">
  <script type="application/json">
    { "title": "在庫予約の設計レビュー", "questions": [ … ] }
  </script>

  <div slot="main">
    <dpk-component-er-diagram id="checkout-schema">…</dpk-component-er-diagram>
  </div>
</dpk-template-grill>
```

| Where                   | How                                                |
| ----------------------- | -------------------------------------------------- |
| Your own markup         | `data-grill-questions="Q1 Q4"` on the element      |
| Inside a diagram's data | `"questions": "Q1 Q4"` on a node, field or message |

The second one reaches into a diagram's shadow root to place the badge on the exact table, field or message the question is about; badges follow the diagram's pan and zoom. An element may carry several references, and a reference no question matches is ignored.

## UI provided by the template

- **Questions tab** (right): one card per question with choices and a free-text answer. No answered/unanswered filters.
- **Review tab**: the shared composer and draft list, including stale actions. Notes are page-wide; use a diagram's comment button to target that element. There is no attach-to-question checkbox: the answer is the reply to a question. A comment request opens Review and unfolds the rail. Switching tabs or folding preserves unsent input.
- **Copy answers and review**: available below either tab; copies the canonical agent brief with answers, all comments, target references and draft JSON, independent of the selected tab. Also works for a review containing only comments.
- **Send answers and review to Claude**: replaces the copy button inside a Claude Artifact that can send comments to Claude, and sends the same brief (`docs/index.md`, Review and the hand-off). A small **Copy** button stays beside it, and a failed send explains the reason below the buttons.
- **Questions / Review button** (top right): a round button with an `answered / total` badge that folds the whole column away.
- **Q badges** (main): one per reference, red until the question is answered and green after; clicking opens the question.
- **Auto-advance**: choosing an option records it and opens the next unanswered question. Free text is not interrupted while typing — `⌘/Ctrl+Enter` moves on — and when nothing is left unanswered the review stays where it is.

Answers and submitted comments survive reload through the common draft storage. The separate core floating review button is not rendered; there is only one integrated rail.

The rail and the hand-off stay on screen because the shell is bounded. Give the page a height: `html, body { height: 100% }` and the element `height: 100%`. Without one, the template falls back to the viewport height (`100dvh`) instead of growing with its content and scrolling the rail off screen; that fallback does not subtract a Claude Artifact's safe-area padding, so still set the heights.

## Diagram-element comments

Give each diagram a stable, unique HTML `id`. Hover a table, state, participant, module, service or the edge between them and activate its comment icon to open the composer beside it. Focus/selection also exposes the icon, and touch devices always show it. Selection alone does not open the composer; there is no bottom detail area or separate field-comment UI. Posting does not open or resize the Review rail. A mind map offers **Comment** in the action bar under the selected topic. All these notes appear in Review alongside question answers and do not require a `questions` annotation. See `docs/components/diagrams.md` for target identity and the component integration contract.

## Naming

Questions use `question:<id>`, page-wide comments use `page:grill`, and component-owned elements use `element:<reference>`. Preserve the diagram and element ids when revising the page so existing comments retain their targets.
