# Template: example-mapping (`<artifact-example-mapping>`)

Example Mapping (Matt Wynne): one table per story. The story heads it, the rules sit side by side beneath it, and under each rule sit two areas: its examples on top, the questions still open about it below.

```text
story (yellow)   — one section per story, top to bottom
rule (blue)      — under the story, side by side
example (green)  — under its rule, stacked vertically
question (red)   — under its rule, in a separate area below the examples
```

- Element: `<artifact-example-mapping>`
- Definition name: `example-mapping`
- Accent token: `--af-green`（選択・フォーカス）

## Base data

```json
{
  "title": "注文フロー",
  "stories": [{ "id": "order", "name": "注文する" }],
  "rules": [{ "id": "stock", "storyId": "order", "name": "在庫があれば受ける" }],
  "examples": [{ "id": "in-stock", "ruleId": "stock", "name": "在庫あり → 受注" }],
  "questions": [{ "id": "reserve", "ruleId": "stock", "name": "取り置きは可能？" }]
}
```

| Field                     | Required | Notes                                                   |
| ------------------------- | -------- | ------------------------------------------------------- |
| `title`                   | no       | artifact ヘッダーに表示される。既定は `Example Mapping` |
| `stories[].id` / `name`   | yes      | 列の見出し。id は `[A-Za-z0-9_-]+` で全体一意           |
| `rules[].id` / `name`     | yes      | `storyId` が必須（存在するストーリーを指すこと）        |
| `examples[].id` / `name`  | yes      | `ruleId` が必須（存在するルールを指すこと）             |
| `questions[].id` / `name` | yes      | `ruleId` が必須（存在するルールを指すこと）             |
| `*/description`           | no       | カードに読み取り専用で表示される                        |

存在しない `storyId` / `ruleId` を参照するカードは reject される。質問はルールに属し、ストーリーや具体例に直接ぶら下げることはできない。`stories` / `rules` / `examples` / `questions` をまたぐ id の重複も reject される。

参照形式: `story:<id>`、`rule:<id>`、`example:<id>`、`question:<id>`。

## Action vocabulary

| Action                     | target   | payload                                               |
| -------------------------- | -------- | ----------------------------------------------------- |
| `SET_STORY_NAME`           | story    | `{ "name": string }`                                  |
| `SET_STORY_DESCRIPTION`    | story    | `{ "description": string }`                           |
| `REORDER_STORY`            | story    | `{ "after": string \| null }`（`null` = 先頭）        |
| `ADD_STORY`                | artifact | `{ "id", "name", "description"? }`                    |
| `DELETE_STORY`             | story    | `{}`（配下のルール・具体例・質問ごと削除）            |
| `SET_RULE_NAME`            | rule     | `{ "name": string }`                                  |
| `SET_RULE_DESCRIPTION`     | rule     | `{ "description": string }`                           |
| `MOVE_RULE`                | rule     | `{ "storyId", "after": string \| null }`              |
| `REORDER_RULE`             | rule     | `{ "after": string \| null }`（同一ストーリー内のみ） |
| `ADD_RULE`                 | story    | `{ "id", "name", "description"? }`                    |
| `DELETE_RULE`              | rule     | `{}`（配下の具体例・質問ごと削除）                    |
| `SET_EXAMPLE_NAME`         | example  | `{ "name": string }`                                  |
| `SET_EXAMPLE_DESCRIPTION`  | example  | `{ "description": string }`                           |
| `MOVE_EXAMPLE`             | example  | `{ "ruleId", "after": string \| null }`               |
| `REORDER_EXAMPLE`          | example  | `{ "after": string \| null }`（同一ルール内のみ）     |
| `ADD_EXAMPLE`              | rule     | `{ "id", "name", "description"? }`                    |
| `DELETE_EXAMPLE`           | example  | `{}`                                                  |
| `SET_QUESTION_NAME`        | question | `{ "name": string }`                                  |
| `SET_QUESTION_DESCRIPTION` | question | `{ "description": string }`                           |
| `MOVE_QUESTION`            | question | `{ "ruleId", "after": string \| null }`               |
| `REORDER_QUESTION`         | question | `{ "after": string \| null }`（同一ルール内のみ）     |
| `ADD_QUESTION`             | rule     | `{ "id", "name", "description"? }`                    |
| `DELETE_QUESTION`          | question | `{}`                                                  |

- `after` は anchor id であり offset ではない。`{ "after": "r1" }` は「r1 の直後へ」、`{ "after": null }` は「先頭へ」を意味し、存在しない anchor を指すと stale になる。
- `MOVE_*` は列・レーン間の移動を 1 文で表す。`after` は移動先レーン内の anchor でなければならない。`REORDER_*` は同一レーン（同一ストーリー / 同一ルール）内の並び替え専用で、他レーンの anchor を指すと stale になる。
- Delete の cascade は表のとおりで、親を消してから子を編集する draft は stale になる。

## Navigation

```text
#card=r1
```

- `card` は選択中のカード（ストーリー / ルール / 具体例 / 質問のいずれか）。存在しない id は除去され、URL は正準形に書き戻される。

## UI provided by the template

サイドバーなし。ヘッダーにカード色の凡例、本体にストーリーごとのテーブル。

| 領域         | 内容                                                                                                                           |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| ストーリー行 | ストーリーの付箋（ドラッグでテーブルごと並び替え）＋ 状態チップ ＋ ルール / 具体例 / 質問の件数                                |
| ルール列     | ルールの付箋、その下に具体例エリア（緑）、さらに下に質問エリア（赤）。列は横に並び、行内で横スクロールする。末尾に `＋ ルール` |
| 追加         | 具体例エリアの末尾に `＋ 具体例`、質問エリアの末尾に `＋ 質問`、テーブルの下に `＋ ストーリー`                                 |

具体例と質問はルールごとに別のエリアに分ける。上のエリアはルールを確かめる具体例、下のエリアはそのルールについてまだ答えの出ない質問で、どちらもそのエリアのボタンから足す。

状態チップは Example Mapping の読み方に沿う: ルールが無い = `ルール未整理`、質問が残る = `未解決の質問あり`、ルールが 5 枚以上 = `分割を検討`、具体例の無いルールがある = `具体例の無いルールあり`、それ以外 = `合意できそう`。

カードは Event Storming と同じ付箋で、名前をクリックするとその場で編集できる（編集ボタンは無い）。追加したカードは名前にキャレットが入った状態で現れる。ホバーで右側にコメント / 削除が出る。

UI から編集できるのはカード名、追加、ドラッグ移動（ストーリー = テーブル単位、ルール = 列単位、具体例 = 別のルールの具体例エリアへ、質問 = 別のルールの質問エリアへ）、削除、コメント。説明文（`description`）はカードに読み取り専用で表示され、編集は agent が base を作り直す（`SET_*_DESCRIPTION` は draft として記録される）。

## Comment targets

`artifact:example-mapping`（マップ全体）と、すべての story / rule / example / question が `commentTargets` に列挙される。カードのコメントアイコンはそのカードへの composer を top layer の popover として開き、popover 内に textarea + 送信 / キャンセル + 既存コメント一覧がある（カード自体のレイアウトは動かない）。

## Naming

Story はユーザーの達成したいこと（`注文する`）、rule はビジネスルール（`在庫があれば受ける`）、example は具体的な入出力の例（`在庫あり → 受注`）、question は未解決の疑問（`取り置きは可能？`）として書く。
