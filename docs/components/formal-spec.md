# dpk-component-formal-spec

What a formally verified property says, in plain words, for readers who do not read Lean, Coq, Isabelle or TLA+. The checker already vouches that the proof is right; what a person has to judge is whether the statement says what was meant. So the element shows each claim's statement, what it is about, what it assumes, what it concludes, what it does **not** claim, and how strongly it holds — and never the proof.

It is a document in the page's flow, not a canvas: no pan/zoom, no fixed height. Claims are grouped under what they are about (a function, a module, a protocol …). Each claim starts folded to its statement and its assurance badge; the reader unfolds the ones worth a closer look, by the chevron or by clicking the statement. Reviewers comment on a target, a claim or a single clause of it; there are no element actions.

It also serves before the work starts: write the properties a new feature should satisfy as `planned` claims and agree on them in review, then prove them.

```html
<dpk-component-formal-spec id="order-spec" subject="注文まわり">
  <script type="application/json">
    {
      "targets": [
        {
          "id": "sort",
          "name": "注文一覧の並べ替え",
          "code": "sortOrdersByTotal(orders)",
          "summary": "注文一覧を、合計金額の[[sorted|小さい順]]に並べ替えて返す関数。"
        }
      ],
      "terms": [
        {
          "id": "sorted",
          "name": "小さい順に並んでいる",
          "meaning": "隣り合うどの 2 つを見ても、前の値が後ろの値以下であること。"
        },
        {
          "id": "same-items",
          "name": "同じ注文からなる",
          "meaning": "どの注文についても同じ個数ずつ含むこと。並び順は問わない。"
        }
      ],
      "claims": [
        {
          "id": "sort-correct",
          "target": "sort",
          "statement": "どんな注文一覧を渡しても、返ってくる一覧は合計金額が[[sorted]]。しかも渡した一覧と[[same-items]]。",
          "subjects": [{ "id": "input", "text": "任意の注文一覧（空でもよい）" }],
          "conclusions": [
            { "id": "ordered", "text": "返ってくる一覧は、合計金額が[[sorted]]" },
            { "id": "permutation", "text": "返ってくる一覧は、渡した一覧と[[same-items]]" }
          ],
          "examples": [{ "id": "ex-dup", "text": "3,000 円・1,000 円・2,000 円 → 1,000 円・2,000 円・3,000 円" }],
          "notClaimed": [{ "id": "stable", "text": "同じ金額の注文どうしが、元の順序を保つこと" }],
          "assurance": { "kind": "proved" },
          "source": { "tool": "Lean 4", "ref": "Order/Sort.lean · sortOrdersByTotal_correct" }
        }
      ]
    }
  </script>
</dpk-component-formal-spec>
```

Load `components.js` (or the all-in-one `index.js`). Put the element in a template — usually `dpk-template-plain` (`docs/templates/plain.md`) — to keep the comments.

## Data

The JSON child, or the `data` property with the parsed shape (`parseFormalSpecData` is exported from `components.js`). It is validated strictly: an unknown key, a duplicate id or an unknown term reference renders the reason instead of the claims.

| Field     | Required | Meaning                                                      |
| --------- | -------- | ------------------------------------------------------------ |
| `targets` | no       | What the claims are about; claims are grouped under them.    |
| `terms`   | no       | Definitions the claims depend on, shown as tooltips.         |
| `claims`  | yes      | The verified or planned properties, in reading order (or []) |

| Target field | Required | Meaning                                                                            |
| ------------ | -------- | ---------------------------------------------------------------------------------- |
| `id`         | yes      | Stable id, unique among targets. Comment target `element:<id>/target/<target-id>`. |
| `name`       | yes      | What a reader calls it, in plain words ("注文一覧の並べ替え").                     |
| `code`       | no       | Its identifier in the code, shown in monospace (`sortOrdersByTotal(orders)`).      |
| `summary`    | no       | What it does, in one or two sentences, so a claim about it reads in context.       |

Groups follow the order in which their claims first appear. Claims without a `target` form one group without a heading; a target without claims yet is listed last, with "no claims yet".

| Claim field   | Required | Meaning                                                                                                     |
| ------------- | -------- | ----------------------------------------------------------------------------------------------------------- |
| `id`          | yes      | Stable id, unique among claims. Comment target `element:<id>/claim/<claim-id>`.                             |
| `target`      | no       | The id of the target the claim is about.                                                                    |
| `statement`   | yes      | The whole claim in one sentence. It is what the folded card shows and what the review rail names it by.     |
| `subjects`    | no       | Clauses: what the claim quantifies over ("any list of integers", "every order").                            |
| `premises`    | no       | Clauses: what must hold for the conclusion. Empty is shown as "none — holds unconditionally", never hidden. |
| `conclusions` | yes      | Clauses, at least one: what the claim asserts.                                                              |
| `examples`    | no       | Clauses: concrete instances, to make the statement tangible.                                                |
| `notClaimed`  | no       | Clauses: what a reader might assume but the claim does not say.                                             |
| `assurance`   | yes      | How strongly the claim holds (below).                                                                       |
| `source`      | no       | `{ tool?, ref }` — where the formal statement lives, e.g. `{ "tool": "Lean 4", "ref": "Sort.lean · x" }`.   |

A clause is `{ id, text }`. Its id is unique within its claim (across all five lists) and is the comment target `element:<id>/clause/<claim-id>/<clause-id>`.

| Term field | Required | Meaning                                                      |
| ---------- | -------- | ------------------------------------------------------------ |
| `id`       | yes      | Stable id, unique among terms.                               |
| `name`     | yes      | The word the claims use.                                     |
| `meaning`  | yes      | Its definition in plain words. It may reference other terms. |

### Term references

Any text — `statement`, clause texts, assumptions, bounds, gaps, a term's `meaning` — may reference a term as `[[id]]` (shown as the term's `name`) or `[[id|label]]` (shown as `label`, for inflection: `[[reservation|引き当てる]]`). A reference reads as a dotted, underlined word whose meaning shows in a tooltip on hover, focus or tap. The meaning is shown nowhere else: there is no separate list of definitions. A reference to an undefined term is an error. The terms a claim uses are listed at the foot of the unfolded claim, derived from its text — there is no field for them.

### Assurance

Independent of the tool. Pick the kind by what was actually established:

| `kind`       | Fields                   | Shown as                                            | Use when                                                                                                                          |
| ------------ | ------------------------ | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `proved`     | `assumptions?: string[]` | Proved (green), or Proved under assumptions (amber) | The proof is complete for every case. List any axiom, `extern`/trusted code, or unverified library it relies on as `assumptions`. |
| `bounded`    | `bound: string`          | Checked within bounds (amber)                       | Exhaustive checking within a finite scope (TLC, Alloy, bounded model checking).                                                   |
| `incomplete` | `gaps?: string[]`        | Incomplete (red)                                    | The proof has holes (`sorry`, `Admitted`, `oops`) or does not check yet.                                                          |
| `planned`    | —                        | Planned (blue)                                      | Not attempted yet: a property proposed for agreement before the implementation or the proof.                                      |

The badge explains what its label means in a tooltip. The card's left edge takes the assurance color, and the toolbar counts the claims that are not plainly proved. Assumptions, the bound and the gaps are listed in the unfolded claim.

## Writing a claim for people

The element only shows what you write; whether the page is faithful to the formal statement is on you.

- **Translate the statement, not the proof.** No tactics, lemmas or proof steps. The reader judges the meaning.
- **Make the statement stand alone.** Folded, it is all the reader sees: name the function or the situation in it, and leave the breakdown to the clauses. There is no title.
- **Do not drop premises.** Every hypothesis of the theorem becomes a premise, including ones that look obvious (`0 ≤ rate ≤ 100`, "the list has no duplicates"). A missing premise makes the claim read stronger than it is.
- **Always fill `notClaimed`** with what a reader is likely to assume but the theorem does not say: stability, performance, termination, behavior outside the bound, other inputs. This is where a weak specification shows — "the result is sorted" alone holds for a function that returns `[]`.
- **Define the words that carry the meaning** as terms. Ambiguity hides in definitions ("sorted" — strictly or not?).
- **Keep conclusions one fact per clause**, so a reviewer can comment on exactly one.
- **Be honest about assurance.** A model-checked property is `bounded` with its scope; a proof with `sorry` is `incomplete`; a proof relying on an axiom or trusted code lists it as an assumption.
- **Give `source.ref`** (file and declaration name) so a reviewer's comment can be traced back to the formal text.

## Attributes and properties

| Attribute | Meaning                                             |
| --------- | --------------------------------------------------- |
| `id`      | Enables comments; keep it stable across revisions   |
| `heading` | Toolbar title (default: `Formal spec` / `形式仕様`) |
| `subject` | Toolbar subtitle, e.g. `注文まわり`                 |

| Property         | Type                             | Meaning                                          |
| ---------------- | -------------------------------- | ------------------------------------------------ |
| `data`           | parsed spec (`attribute: false`) | Replaces the JSON child when set                 |
| `dataError`      | `string \| null`                 | Validation error from the JSON child (read-only) |
| `commentTargets` | `{ value, label, group }[]`      | Every target, claim and clause (read-only)       |

## Comments

With an `id`, each target heading, claim and clause shows a comment button when hovered or focused (always on touch devices). It opens a composer beside it that submits straight into the enclosing template's draft, like a diagram's (`docs/components/diagrams.md`, "Element comments and template integration").

| Target                                       | What it is                                                    |
| -------------------------------------------- | ------------------------------------------------------------- |
| `element:<id>/target/<target-id>`            | What a group of claims is about                               |
| `element:<id>/claim/<claim-id>`              | A whole claim                                                 |
| `element:<id>/clause/<claim-id>/<clause-id>` | One subject, premise, conclusion, example or not-claimed line |

The review rail labels a claim by the start of its statement, and a clause by that label followed by the clause. A clause's comment button shows once its claim is unfolded. A term's definition has no target of its own: comment on the claim or the clause that uses it.

A comment whose target, claim or clause disappears in a revision stays in the draft as stale; keep ids stable. Without an `id` there are no comment buttons, and outside a template a submission keeps its text and says why it was not saved.
