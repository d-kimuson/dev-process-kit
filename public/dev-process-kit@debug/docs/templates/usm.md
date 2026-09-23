# Template: usm (`<artifact-usm>`)

User Story Mapping: バックボーン（`Activity › Step`）を列に、マイルストーンを
行に取るストーリーマップ。

```text
列 = BackboneStep（Activity の見出しの下に並ぶ）
行 = Milestone（MVP / v1 / v2 …）＋ 常に1行ある「未割当」
セル = その列 × その行に属する UserStory の並び
```

- Element: `<artifact-usm>`
- Definition name: `usm`
- Navigation keys: `activity`, `step`, `story`
- Accent token: `--af-blue`（選択・フォーカス）

## Base data

```json
{
  "title": "Kumoma — ストーリーマップ",
  "activities": [
    {
      "id": "onboarding",
      "name": "オンボーディング",
      "steps": [
        { "id": "landing", "name": "ランディング" },
        { "id": "signup", "name": "登録" }
      ]
    }
  ],
  "milestones": [{ "id": "mvp", "name": "MVP" }],
  "stories": [
    {
      "id": "google-signup",
      "name": "Googleで登録する",
      "activityId": "onboarding",
      "stepId": "signup",
      "milestoneId": "mvp"
    },
    {
      "id": "public-page",
      "name": "公開ページとして読む",
      "activityId": "onboarding",
      "stepId": "landing"
    }
  ]
}
```

| Field                             | Required | Notes                                                              |
| --------------------------------- | -------- | ------------------------------------------------------------------ |
| `title`                           | no       | artifact ヘッダーに表示される                                      |
| `activities[].id` / `name`        | yes      | バックボーンの最上段                                               |
| `activities[].steps[]`            | no       | 既定は `[]`。各要素は `id` / `name` が必須                         |
| `milestones[].id` / `name`        | yes      | 水平スライス。空配列でもよい（「未割当」行は常にある）             |
| `stories[].id` / `name`           | yes      | カードの見出し                                                     |
| `stories[].activityId` / `stepId` | yes      | 所属する列。`stepId` の持ち主と `activityId` が一致しないと reject |
| `stories[].milestoneId`           | no       | 省略 = 未割当行。存在しない id は reject                           |
| `stories[].description`           | no       | カードに読み取り専用で表示される                                   |

Unknown keys throw（`z.strictObject`）。存在しない `activityId` / `stepId` /
`milestoneId` を参照するストーリーも reject される。`activities` /
`steps` / `milestones` / `stories` をまたぐ id の重複も reject される。
`emptyBase()` は `{ activities: [], milestones: [], stories: [] }` を返す。

参照形式: `step:<activityId>.<stepId>`（正準形。bare step id も解決できる）、
`story:<id>`、`milestone:<id>`。`parseBase` の厳密さは従来どおり。

## Action vocabulary

Patch semantics: 各アクションは望ましい end state を述べる。同じアクションを
2回適用しても結果は同じになる。`target` は `{ "type": …, "id": … }` で、
shorthand `"id"` も受け付ける。

| Action                  | target    | payload                                                                              |
| ----------------------- | --------- | ------------------------------------------------------------------------------------ |
| `SET_ACTIVITY_NAME`     | activity  | `{ "name": string }`                                                                 |
| `SET_STEP_NAME`         | step      | `{ "name": string }`                                                                 |
| `REORDER_STEP`          | step      | `{ "after": string \| null }`（`null` = 先頭、同一 Activity 内）                     |
| `ADD_ACTIVITY`          | artifact  | `{ "id", "name" }`                                                                   |
| `ADD_STEP`              | activity  | `{ "id", "name" }`                                                                   |
| `DELETE_ACTIVITY`       | activity  | `{}`（配下のステップとストーリーごと削除）                                           |
| `DELETE_STEP`           | step      | `{}`（配下のストーリーごと削除）                                                     |
| `SET_STORY_NAME`        | story     | `{ "name": string }`                                                                 |
| `SET_STORY_DESCRIPTION` | story     | `{ "description": string }`                                                          |
| `SET_STORY_MILESTONE`   | story     | `{ "milestoneId": string \| null }`（`null` = 未割当へ）                             |
| `MOVE_STORY`            | story     | `{ "activityId", "stepId", "milestoneId": string \| null, "after": string \| null }` |
| `REORDER_STORY`         | story     | `{ "after": string \| null }`（同一マス内のみ）                                      |
| `ADD_STORY`             | step      | `{ "id", "name", "activityId", "milestoneId"? }`                                     |
| `DELETE_STORY`          | story     | `{}`                                                                                 |
| `SET_MILESTONE_NAME`    | milestone | `{ "name": string }`                                                                 |
| `ADD_MILESTONE`         | artifact  | `{ "id", "name" }`                                                                   |
| `DELETE_MILESTONE`      | milestone | `{}`（所属ストーリーは未割当へ退避、削除しない）                                     |
| `REORDER_MILESTONE`     | milestone | `{ "after": string \| null }`                                                        |

Notes:

- `after` は anchor id であり offset ではない。`{ "after": "login" }` は
  「login の直後へ」、 `{ "after": null }` は「先頭へ」を意味する。
  存在しない anchor は stale として `null` を返し、黙って別の場所に
  着地することはない。
- `MOVE_STORY` は列・スライス間の移動を1文で表す idempotent な宣言である。
  `after` は移動先セル内の anchor でなければならず、他セルの id を指すと
  stale になる。`REORDER_STORY` は同一マス（同一 step + 同一 milestone）内の
  並び替え専用で、他マスの anchor を指すと stale になる。
- `ADD_*` は新しい entity の id を payload に持ち、`{ dedupeKey:
entityDedupeKey }`（patch mode）で登録される。既に存在する id の再適用は
  no-op（入力 state をそのまま返す）であり、コアが自動で prune する。
- Delete の cascade: `DELETE_ACTIVITY` は配下ステップとそのストーリーを、
  `DELETE_STEP` は配下ストーリーを一緒に削除する。親を削除した後に子を
  編集する draft は stale になる。`DELETE_MILESTONE` はストーリーを消さず、
  未割当行へ移す。
- `SET_STORY_MILESTONE` の `milestoneId: null` は未割当行への移動であり、
  `MOVE_STORY` の `milestoneId: null` も同じ意味である。

## Navigation

```text
#activity=onboarding&step=signup&story=google-signup&view=activity
```

- `view` は表のまとめ単位で、`activity`（アクティビティごとの列 + group band、
  既定）か `group`（アクティビティグループごとに 1 列、step 分割なし）。表の上の
  タブ（アクティビティ / アクティビティグループ）で切り替える。`group` ビューでの
  ドロップはドラッグ中のストーリーの step を保ったまま milestone と順序だけを変える。
- `group` ビューでは step を特定できないため、他アクティビティへのドロップでは
  その場で step を選ぶ dialog（tooltip）が開く。移動先アクティビティの step 一覧から
  選んで移動する。移動先セルの末尾に置かれ、milestone は保たれる。
- `step` の選択はその列をハイライトし、`story` の選択はカードをフォーカスする。
- 欠けたキーは state の先頭から補完される（URL への書き込みはしない）。
  不明な id も先頭の activity / step にフォールバックし、URL は canonical 形に
  書き直される。
- 現在の step / story が draft で削除された場合、ハッシュは残っているものへ
  自動で移動する。
- ナビゲーションは URL hash のものであり、draft action として保存しては
  ならない（design §14）。

## UI provided by the template

サイドバーなし。テーブルだけの自己完結レイアウト。

| 領域         | 内容                                                                                                                                                                  |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 左上コーナー | 軸の説明（1 段目 `アクティビティグループ →`、2 段目 `アクティビティ →` / `マイルストーン ↓`）。小さな `.af-label` テキスト                                            |
| 列ヘッダ     | Activity ごとのグループ見出し（名前は inline-edit 可能、ステップ追加はアイコンのみ）＋ ステップ名セル（inline-edit 可能）。右端に `＋ アクティビティ`                 |
| 行ヘッダ     | マイルストーン名（inline-edit 可能。行ヘッダ自体がドラッグハンドルで、他行へのドロップで並び替え）＋ 最終行 `未割当`（ドラッグ不可）。最下部に `＋ マイルストーン` 行 |
| セル         | カード一覧（flex column）＋ 底部に pinned の `＋ 追加` ボタン（`margin-top: auto`）。空セルに placeholder なし                                                        |

カードの移動はドラッグ＆ドロップ。`dropAfter(orderedIds, hoveredId, place)` が
`MOVE_STORY` の `after` を決める（`null` = セル先頭）。ドロップ中は
`data-drop='true'` のセルがハイライトされ、ドラッグ中のカードは半透明になる。

Local edits exposed in the UI: ストーリー名（鉛筆アイコンで inline-edit、開いた時点で caret が入る）、
セルごとの追加、アクティビティ名 / ステップ名 / マイルストーン名の変更と
マイルストーンのドラッグ並び替え、カードの削除、カード上のコメント tooltip（popover）。ストーリーもマイルストーンも、列をまたぐ移動はドラッグで行う。

## Comment targets

`artifact:usm`（マップ全体）、全 activity / step / milestone / story が
`commentTargets` に列挙される。コメント自体はコア所有であり、テンプレートは
アクションを宣言しない。カードのコメントアイコンはそのストーリーへの composer
を tooltip（top layer の popover）として開く。popover 内に textarea + 送信 /
キャンセル＋既存コメント一覧があり、カード自体のレイアウトは動かない。

## Naming

Activity、step、story はすべて動詞形で書く（`利用を開始する` → `登録する` →
`ノートを書く`）。ページ名ではなく体験の動作として命名する。

## Sample

`sample/usm.html` — Kumoma のストーリーマップ。3 アクティビティ ×
7 バックボーンステップ、3 マイルストーン（MVP / v1 / v2）、12 ストーリー
（未割当1件）。`slot="memo"` の短い注釈は
作者所有 UI の例であり、フレームワークの管理対象ではない。
