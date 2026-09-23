# Template: usm (`<dpk-template-usm>`)

User Story Mapping: バックボーン（`Activity › Step`）を列に、マイルストーンを行に取るストーリーマップ。

```text
列 = BackboneStep（Activity の見出しの下に並ぶ）
行 = Milestone（MVP / v1 / v2 …）＋ 常に1行ある「未割当」
セル = その列 × その行に属する UserStory の並び
```

- Element: `<dpk-template-usm>`
- Definition name: `usm`
- Accent token: `--dpk-blue`（選択・フォーカス）

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
    { "id": "public-page", "name": "公開ページとして読む", "activityId": "onboarding", "stepId": "landing" }
  ]
}
```

| Field                             | Required | Notes                                                              |
| --------------------------------- | -------- | ------------------------------------------------------------------ |
| `title`                           | no       | ページのヘッダーに表示される                                       |
| `activities[].id` / `name`        | yes      | バックボーンの最上段。id は `[A-Za-z0-9_-]+`                       |
| `activities[].steps[]`            | no       | 既定は `[]`。各要素は `id` / `name` が必須                         |
| `milestones[].id` / `name`        | yes      | 水平スライス。空配列でもよい（「未割当」行は常にある）             |
| `stories[].id` / `name`           | yes      | カードの見出し。id は `[A-Za-z0-9_-]+`                             |
| `stories[].activityId` / `stepId` | yes      | 所属する列。`stepId` の持ち主と `activityId` が一致しないと reject |
| `stories[].milestoneId`           | no       | 省略 = 未割当行。存在しない id は reject                           |
| `stories[].description`           | no       | カードに読み取り専用で表示される                                   |

存在しない `activityId` / `stepId` / `milestoneId` を参照するストーリーは reject される。`activities` / `steps` / `milestones` / `stories` をまたぐ id の重複も reject される。

参照形式: `step:<activityId>.<stepId>`（正準形。bare step id も解決できる）、`story:<id>`、`milestone:<id>`。

## Action vocabulary

| Action                  | target    | payload                                                                              |
| ----------------------- | --------- | ------------------------------------------------------------------------------------ |
| `SET_ACTIVITY_NAME`     | activity  | `{ "name": string }`                                                                 |
| `SET_STEP_NAME`         | step      | `{ "name": string }`                                                                 |
| `REORDER_STEP`          | step      | `{ "after": string \| null }`（`null` = 先頭、同一 Activity 内）                     |
| `ADD_ACTIVITY`          | page      | `{ "id", "name" }`                                                                   |
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
| `ADD_MILESTONE`         | page      | `{ "id", "name" }`                                                                   |
| `DELETE_MILESTONE`      | milestone | `{}`（所属ストーリーは未割当へ退避、削除しない）                                     |
| `REORDER_MILESTONE`     | milestone | `{ "after": string \| null }`                                                        |

- `after` は anchor id であり offset ではない。`{ "after": "login" }` は「login の直後へ」、`{ "after": null }` は「先頭へ」を意味し、存在しない anchor を指すと stale になる。
- `MOVE_STORY` は列・スライス間の移動を 1 文で表す。`after` は移動先セル内の anchor でなければならない。`REORDER_STORY` は同一マス（同一 step + 同一 milestone）内の並び替え専用で、他マスの anchor を指すと stale になる。
- Delete の cascade は表のとおりで、親を消してから子を編集する draft は stale になる。

## Navigation

```text
#activity=onboarding&step=signup&story=google-signup&view=activity
```

- `view` は表のまとめ単位で、`activity`（アクティビティごとの列 + group band、既定）か `group`（アクティビティグループごとに 1 列、step 分割なし）。表の上のタブで切り替える。
- `group` ビューでは step を特定できないため、他アクティビティへのドロップではその場で step を選ぶ dialog が開く。milestone はドロップした位置のもので、移動先セルの末尾に置かれる。同じアクティビティ内のドロップは、ドラッグ中のストーリーの step を保ったまま milestone と順序だけを変える。
- `step` の選択はその列をハイライトし、`story` の選択はカードをフォーカスする。

## UI provided by the template

サイドバーなし。テーブルだけの自己完結レイアウト。

| 領域         | 内容                                                                                                                              |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| 左上コーナー | 軸の説明（`アクティビティグループ →` / `アクティビティ →` / `マイルストーン ↓`）                                                  |
| 列ヘッダ     | Activity ごとのグループ見出し（名前は inline-edit 可能、ステップ追加はアイコンのみ）＋ ステップ名セル。右端に `＋ アクティビティ` |
| 行ヘッダ     | マイルストーン名（行ヘッダ自体がドラッグハンドル）＋ 最終行 `未割当`（ドラッグ不可）。最下部に `＋ マイルストーン`                |
| セル         | カード一覧＋ 底部の `＋ 追加` ボタン                                                                                              |

UI から編集できるのはストーリー名（inline-edit）、セルごとの追加、アクティビティ名 / ステップ名 / マイルストーン名の変更とマイルストーンの並び替え、カードのドラッグ移動、カードの削除、カード上のコメント。

## Comment targets

`page:usm`（マップ全体）と、すべての activity / step / milestone / story が `commentTargets` に列挙される。カードのコメントアイコンはそのストーリーへの composer を top layer の popover として開き、popover 内に textarea + 送信 / キャンセル + 既存コメント一覧がある（カード自体のレイアウトは動かない）。

## Naming

Activity、step、story はすべて動詞形で書く（`利用を開始する` → `登録する` → `ノートを書く`）。ページ名ではなく体験の動作として命名する。
