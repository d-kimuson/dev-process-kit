# Template: usm (`<dpk-template-usm>`)

User Story Mapping: バックボーン（`Activity › Step`）を列に、マイルストーンを行に取るストーリーマップ。

```text
列 = BackboneStep（Activity の見出しの下に並ぶ）
行 = Milestone（MVP / v1 / v2 …）＋ 常に1行ある「Unassigned」
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
      "actor": "一般ユーザー",
      "steps": [
        { "id": "landing", "name": "ランディング" },
        { "id": "signup", "name": "登録" }
      ]
    }
  ],
  "milestones": [{ "id": "mvp", "name": "MVP", "timeframe": "2026年10月", "description": "必要最低限の機能群" }],
  "statuses": [
    { "id": "idea", "name": "Idea", "tone": "gray" },
    { "id": "ready", "name": "Ready", "tone": "amber" },
    { "id": "done", "name": "Done", "tone": "green" }
  ],
  "stories": [
    {
      "id": "google-signup",
      "name": "Googleで登録する",
      "activityId": "onboarding",
      "stepId": "signup",
      "milestoneId": "mvp",
      "statusId": "ready"
    },
    { "id": "public-page", "name": "公開ページとして読む", "activityId": "onboarding", "stepId": "landing" }
  ]
}
```

| Field                             | Required | Notes                                                                                                                                                                 |
| --------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`                           | no       | ページのヘッダーに表示される                                                                                                                                          |
| `activities[].id` / `name`        | yes      | バックボーンの最上段。id は `[A-Za-z0-9_-]+`                                                                                                                          |
| `activities[].actor`              | no       | 誰の体験か（`管理者`、`一般ユーザー` など）。アクティビティグループの見出しにラベルとして出る                                                                         |
| `activities[].steps[]`            | no       | 既定は `[]`。各要素は `id` / `name` が必須                                                                                                                            |
| `milestones[].id` / `name`        | yes      | 水平スライス。空配列でもよい（「Unassigned」行は常にある）                                                                                                            |
| `milestones[].timeframe`          | no       | 時期（自由記述。`2026年10月`、`Q4` など）。行ヘッダとマイルストーンタブに出る                                                                                         |
| `milestones[].description`        | no       | そのスライスが何を表すか。マイルストーンタブに出る                                                                                                                    |
| `statuses[].id` / `name`          | yes      | ストーリーの進み具合（`Idea` / `Ready` / `Done` など）。省略 = `[]`（ステータスを使わない）                                                                           |
| `statuses[].tone`                 | no       | カードの色（色はステータスだけを表し、アクティビティには色をつけない）。`gray` / `blue` / `violet` / `green` / `amber` / `accent`。省略時は並び順でこの順に割り当てる |
| `stories[].id` / `name`           | yes      | カードの見出し。id は `[A-Za-z0-9_-]+`                                                                                                                                |
| `stories[].activityId` / `stepId` | yes      | 所属する列。`stepId` の持ち主と `activityId` が一致しないと reject                                                                                                    |
| `stories[].milestoneId`           | no       | 省略 = Unassigned 行。存在しない id は reject                                                                                                                         |
| `stories[].description`           | no       | カードに読み取り専用で表示される                                                                                                                                      |
| `stories[].statusId`              | no       | 省略 = ステータスなし。存在しない id は reject                                                                                                                        |

存在しない `activityId` / `stepId` / `milestoneId` / `statusId` を参照するストーリーは reject される。`activities` / `steps` / `milestones` / `statuses` / `stories` をまたぐ id の重複も reject される。

ステータスの集合そのものもデータであり、Agent は base で定義し、利用者はステータスタブで追加・改名・色の変更・並び替え・削除ができる（いずれも draft action として Agent に返る）。

参照形式: `step:<activityId>.<stepId>`（正準形。bare step id も解決できる）、`story:<id>`、`milestone:<id>`、`status:<id>`。

## Action vocabulary

| Action                  | target    | payload                                                                              |
| ----------------------- | --------- | ------------------------------------------------------------------------------------ |
| `SET_ACTIVITY_NAME`     | activity  | `{ "name": string }`                                                                 |
| `SET_ACTIVITY_ACTOR`    | activity  | `{ "actor": string }`（前後の空白は除く。空文字 = ラベルを外す）                     |
| `SET_STEP_NAME`         | step      | `{ "name": string }`                                                                 |
| `REORDER_STEP`          | step      | `{ "after": string \| null }`（`null` = 先頭、同一 Activity 内）                     |
| `ADD_ACTIVITY`          | page      | `{ "id", "name" }`                                                                   |
| `ADD_STEP`              | activity  | `{ "id", "name" }`                                                                   |
| `DELETE_ACTIVITY`       | activity  | `{}`（配下のステップとストーリーごと削除）                                           |
| `DELETE_STEP`           | step      | `{}`（配下のストーリーごと削除）                                                     |
| `SET_STORY_NAME`        | story     | `{ "name": string }`                                                                 |
| `SET_STORY_DESCRIPTION` | story     | `{ "description": string }`                                                          |
| `SET_STORY_MILESTONE`   | story     | `{ "milestoneId": string \| null }`（`null` = Unassigned へ）                        |
| `MOVE_STORY`            | story     | `{ "activityId", "stepId", "milestoneId": string \| null, "after": string \| null }` |
| `REORDER_STORY`         | story     | `{ "after": string \| null }`（同一マス内のみ）                                      |
| `ADD_STORY`             | step      | `{ "id", "name", "activityId", "milestoneId"? }`                                     |
| `DELETE_STORY`          | story     | `{}`                                                                                 |
| `SET_MILESTONE_NAME`    | milestone | `{ "name": string }`                                                                 |
| `ADD_MILESTONE`         | page      | `{ "id", "name" }`                                                                   |
| `DELETE_MILESTONE`      | milestone | `{}`（所属ストーリーは Unassigned へ退避、削除しない）                               |
| `REORDER_MILESTONE`     | milestone | `{ "after": string \| null }`                                                        |
| `SET_STORY_STATUS`      | story     | `{ "statusId": string \| null }`（`null` = ステータスなしへ）                        |
| `ADD_STATUS`            | page      | `{ "id", "name", "tone" }`                                                           |
| `SET_STATUS_NAME`       | status    | `{ "name": string }`                                                                 |
| `SET_STATUS_TONE`       | status    | `{ "tone": "gray" \| "blue" \| "violet" \| "green" \| "amber" \| "accent" }`         |
| `DELETE_STATUS`         | status    | `{}`（そのステータスのストーリーは「ステータスなし」へ退避、削除しない）             |
| `REORDER_STATUS`        | status    | `{ "after": string \| null }`                                                        |

- `after` は anchor id であり offset ではない。`{ "after": "login" }` は「login の直後へ」、`{ "after": null }` は「先頭へ」を意味し、存在しない anchor を指すと stale になる。
- `MOVE_STORY` は列・スライス間の移動を 1 文で表す。`after` は移動先セル内の anchor でなければならない。`REORDER_STORY` は同一マス（同一 step + 同一 milestone）内の並び替え専用で、他マスの anchor を指すと stale になる。
- Delete の cascade は表のとおりで、親を消してから子を編集する draft は stale になる。

## Navigation

```text
#activity=onboarding&step=signup&story=google-signup&tab=milestones&view=activity&status=ready,done
```

- `status` はマップのステータスフィルター。カンマ区切りのステータス id で、`~` は「ステータスなし」。省略 = フィルターなし（全ストーリー）。存在しない id は落とし、ステータスの並び順に正規化される。
- `tab` はページのタブ。省略 = `User Story Mapping`（マップ）、`milestones` = マイルストーンタブ、`statuses` = ステータスタブ。それ以外の値は省略に正規化される。

- `view` は表のまとめ単位で、`activity`（アクティビティごとの列 + group band、既定）か `group`（アクティビティグループごとに 1 列、step 分割なし）。表の上のタブで切り替える。
- `group` ビューでは step を特定できないため、他アクティビティへのドロップではその場で step を選ぶ dialog が開く。milestone はドロップした位置のもので、移動先セルの末尾に置かれる。同じアクティビティ内のドロップは、ドラッグ中のストーリーの step を保ったまま milestone と順序だけを変える。
- `step` の選択はその列をハイライトし、`story` の選択はカードをフォーカスする。

## UI provided by the template

サイドバーなし。ページ上部のタブで「User Story Mapping」（マップ）、「マイルストーン」（スライスの一覧）、「ステータス」（ステータスの定義）を切り替える自己完結レイアウト。

表は画面の高さに収まる枠の中で縦横にスクロールする。スクロールしてもバックボーン（アクティビティ / ステップの見出し行）は上端に、左端の列（軸の説明とマイルストーン名）は左端に留まり、ページのタブ（とマップのまとめ単位のタブ）はページをスクロールしても上端に留まる。

| 領域                 | 内容                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ページ上部           | ページのタブ（User Story Mapping / マイルストーン / ステータス。それぞれストーリー数 / マイルストーン数 / ステータス数つき）。マップでは右側にまとめ単位のタブ（`view`）                                                                                                                                                                                                                                                                                   |
| 左上コーナー         | 軸の説明（`Activity group →` / `Activity →` / `Milestone ↓`）                                                                                                                                                                                                                                                                                                                                                                                              |
| 列ヘッダ             | Activity ごとのグループ見出し（名前は inline-edit 可能、ステップ追加はアイコンのみ。`actor` のラベル（inline-edit 可能）と、配下ストーリーのステータス構成を色で積み上げたバー。`group` ビューでは配下のステップを番号つきリストで並べる）＋ ステップ名セル（ストーリー数つき）。右端に `+ Activity`                                                                                                                                                       |
| ステータスフィルター | ステータスが 1 つ以上あるとき、表の上にステータスごとのトグル（アイコン・名前・件数）と「ステータスなし」。オンにしたステータスのカードだけを出す。カードの色とアイコンの凡例を兼ねる                                                                                                                                                                                                                                                                      |
| 行ヘッダ             | マイルストーン名（行ヘッダ自体がドラッグハンドル）と、その下に時期・ストーリー数 ＋ 最終行 `Unassigned`（ドラッグ不可）。最下部に `+ Milestone`                                                                                                                                                                                                                                                                                                            |
| セル                 | カード一覧（ステータスアイコン・名前・説明（2 行まで）・`group` ビューではステップ名とコメント数のフッター。編集はカード上部に浮くツールの鉛筆から）＋ 底部の `+ Add` ボタン。カードの色はステータスの色（ステータスがない / 未設定はグレー）。ステータスアイコンはワークフロー上の位置で埋まっていくリング（最後のステータスはチェック、未設定は破線）で、押すとステータスのメニューが開く                                                                |
| マイルストーンタブ   | 各マイルストーンが何かを知るための定義を、マップの行順に縦のタイムラインで並べる（左に時期、1 本のレールに順番つきのノード、右に中身）。名前（inline-edit 可能）、説明、ストーリー数と全体に占める割合、バックボーンのステップをどれだけ含むか、ステータスがあればそのスライスのステータス構成（ステータス色の積み上げバーと凡例）。時期がなければ「時期未定」と出る。ストーリーカードは出さない（ストーリーはマップで扱う）。レールの末尾に `+ Milestone` |

| ステータスタブ | ステータスを順に 1 行ずつ並べる。アイコン、名前（inline-edit 可能）、そのステータスのストーリー数と全体に占める割合、色の選択、上下の並び替え、削除。最終行に「ステータスなし」のストーリー数。末尾に `+ Status` |

UI から編集できるのはストーリー名（inline-edit）、セルごとの追加、アクティビティ名 / actor / ステップ名 / マイルストーン名の変更とマイルストーンの並び替え、カードのドラッグ移動、カードの削除、カード上のコメント、カードのステータス、ステータスの追加・改名・色・並び替え・削除。

ドラッグの並び替えは、同じ並び（同じ行 / 同じセル）の中ではドロップした要素の位置を取る（下へ動かせばその後ろ、上へ動かせばその前。要素のどこに落としても同じ）。別のセルから来たカードは、ドロップした要素の中央より上ならその前、下ならその後ろ、空き領域なら末尾に入る。

## Comment targets

`page:usm`（マップ全体）と、すべての activity / step / milestone / status / story が `commentTargets` に列挙される。カードのコメントアイコンはそのストーリーへの composer を top layer の popover として開き、popover 内に textarea + Send / Cancel + 既存コメント一覧がある（カード自体のレイアウトは動かない）。

## Naming

Activity、step、story はすべて動詞形で書く（`利用を開始する` → `登録する` → `ノートを書く`）。ページ名ではなく体験の動作として命名する。
