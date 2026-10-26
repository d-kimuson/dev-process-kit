# dpk-alternatives

The options a decision weighed, side by side: which one was taken, and why the others were not. Each option is the kit's own card with its status in the card's head — `Adopted`, `Rejected` or `Considered` — so the reader sees the decision before reading a single reason.

It is the card-shaped answer to "B を落とした理由: … D を落とした理由: … C は…": a paragraph that lists what was dropped makes the reader diff prose, and the status it is about is the one thing the paragraph never states plainly.

```html
<dpk-alternatives heading="通知の送信方法">
  <script type="application/json">
    {
      "options": [
        {
          "id": "a",
          "label": "A. 送信時に直接送る",
          "status": "rejected",
          "summary": "リクエストの中で通知 API を 1 回呼ぶ。",
          "reason": "通知 API が落ちている間の通知は、そのまま消える。"
        },
        {
          "id": "b",
          "label": "B. 非同期キューで送る",
          "status": "rejected",
          "summary": "送信をキューに積み、ワーカーが後で送る。",
          "reason": "キューを運用する人がいない。",
          "tradeoffs": ["滞留アラートを用意する必要がある", "順序保証を自前で持つ"]
        },
        {
          "id": "c",
          "label": "C. 送信時に数回だけ再試行する",
          "status": "adopted",
          "summary": "指数バックオフで最大 3 回まで試し、それでも駄目なら記録して諦める。",
          "reason": "外部の運用を増やさずに、一時的な失敗の大半を吸収できる。",
          "tradeoffs": ["p99 が最大 800ms 伸びる"]
        },
        {
          "id": "d",
          "summary": "クライアントが失敗を受け取り、自分の判断で再送する。",
          "status": "considered"
        }
      ]
    }
  </script>
</dpk-alternatives>
```

Load `components.js` (or the all-in-one `index.js`). It belongs in a document — `dpk-view-plain` for a design doc — next to the prose it summarises.

## Data

The JSON child, or the `data` property with the parsed shape (`parseAlternativesData` is exported from `components.js`). It is validated strictly: an unknown key, a missing status, a blank text or a duplicate option id renders the reason instead of the cards.

| Field     | Required | Meaning                                                       |
| --------- | -------- | ------------------------------------------------------------- |
| `options` | yes      | The options, in reading order; `[]` renders the empty message |

| Option field | Required | Meaning                                                                                       |
| ------------ | -------- | --------------------------------------------------------------------------------------------- |
| `id`         | yes      | Stable id, unique in the list (`[A-Za-z0-9_-]`); shown as the card's key when `label` differs |
| `status`     | yes      | `adopted` \| `rejected` \| `considered` (below)                                               |
| `label`      | no       | What the reader calls the option; defaults to the `id`                                        |
| `summary`    | no       | What the option is, in a sentence                                                             |
| `reason`     | no       | Why it was taken, or why it was dropped                                                       |
| `tradeoffs`  | no       | What taking it costs, one line each                                                           |

| `status`     | Chip  | Card                                                                 |
| ------------ | ----- | -------------------------------------------------------------------- |
| `adopted`    | Green | Green hairline edge, a barely green face and a ring outside the edge |
| `rejected`   | Amber | The neutral card; the reason carries the decision                    |
| `considered` | Blue  | The neutral card; the option is still open                           |

The amber is a decision recorded, not an error: red stays reserved for the invalid-data notice. Every option stays a neutral card so the taken one is the only card that stands out.

## Attributes and properties

| Attribute | Meaning                                                                                       |
| --------- | --------------------------------------------------------------------------------------------- |
| `heading` | The section label above the cards (default: `Alternatives` / `代替案`); `heading=""` hides it |

| Property    | Type                                     | Meaning                                          |
| ----------- | ---------------------------------------- | ------------------------------------------------ |
| `data`      | parsed alternatives (`attribute: false`) | Replaces the JSON child when set                 |
| `dataError` | `string \| null`                         | Validation error from the JSON child (read-only) |

There are no element actions and no comment targets: the decision is the author's, and the page records it. The reader's only job here is to read it.

## Events and slots

None. The comparison is the component's own, its data is the JSON child (or the `data` property), and nothing is emitted: no reader input is recorded and nothing is slotted.

## Empty and invalid

With no data (and no JSON child) the element says `No alternatives to compare.` in place. A JSON child that fails validation renders the reason inline in a `role="alert"` notice and logs it to the console; the element never throws, so a page with one bad block still opens.

## Why not a left-border note

The card a design doc hand-rolls for this is usually a note with a stripe down its left edge:

```css
.note {
  padding: 12px 15px;
  border-left: 3px solid var(--dpk-amber);
  border-radius: 10px;
  background: var(--dpk-amber-soft);
}
```

It is the one thing the kit does not draw. A stripe down one side is a decoration that says nothing the content does not already say — and here it says something wrong: amber is the kit's caution color, so a dropped option reads as a warning about the page rather than as a decision that was made and recorded. The stripe also has to be re-invented per document, in whatever color the author had at hand, and it competes with the tint and the ring that the kit uses for a box's state.

`dpk-alternatives` marks the options the way the kit marks a box — a tint, a ring on every side, or a chip in its head — and never with a bar down an edge:

- **A chip in the head** carries the status, in words: `Adopted`, `Rejected`, `Considered`.
- **A tone on the whole card** — every edge and a soft face — marks the taken option, so it is found before the reasons are read.
- **The reason stays on its own card**, under a `Reason` label, instead of a sentence in a shared paragraph.
- **No side stripe, anywhere.** The kit's own lint rejects one in its sources; a component cannot drift back to it.

Reach for `dpk-callout` instead when the box is a note to the reader — a caveat, a prerequisite, a reminder — with no options to compare. `dpk-alternatives` is only for a decision with more than one candidate.
