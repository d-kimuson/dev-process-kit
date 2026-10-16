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
  "features": ["estimates", "assignees"],
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
  "milestones": [
    {
      "id": "mvp",
      "name": "MVP",
      "timeframe": "2026年10月",
      "description": "必要最低限の機能群",
      "dueDate": "2026-10-31"
    }
  ],
  "statuses": [
    { "id": "idea", "name": "Idea", "tone": "gray", "icon": "lightbulb", "weight": 7 },
    { "id": "ready", "name": "Ready", "tone": "amber", "icon": "play", "weight": 3 },
    { "id": "done", "name": "Done", "tone": "green", "icon": "check" }
  ],
  "estimates": [
    { "id": "s", "name": "S", "points": 1 },
    { "id": "m", "name": "M", "points": 3 },
    { "id": "l", "name": "L", "points": 5 }
  ],
  "labels": [
    { "id": "dev", "name": "Dev" },
    { "id": "pdm", "name": "PdM", "tone": "violet" }
  ],
  "members": [{ "id": "kim", "name": "Kimura" }],
  "stories": [
    {
      "id": "google-signup",
      "name": "Googleで登録する",
      "activityId": "onboarding",
      "stepId": "signup",
      "milestoneId": "mvp",
      "statusId": "ready",
      "labelIds": ["dev"],
      "estimateId": "m",
      "assigneeId": "kim",
      "links": [{ "url": "https://github.com/acme/web/issues/86" }]
    },
    {
      "id": "public-page",
      "name": "公開ページとして読む",
      "activityId": "onboarding",
      "stepId": "landing",
      "blockedBy": ["google-signup"]
    }
  ],
  "snapshots": [
    {
      "id": "snapshot-2026-10-01",
      "at": "2026-10-01T09:00:00.000Z",
      "tally": [
        { "milestoneId": "mvp", "statusId": "idea", "stories": 1, "points": 3 },
        { "statusId": "idea", "stories": 1, "points": 0 }
      ]
    }
  ]
}
```

| Field                                | Required | Notes                                                                                                                                                                  |
| ------------------------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`                              | no       | ページのヘッダーに表示される                                                                                                                                           |
| `activities[].id` / `name`           | yes      | バックボーンの最上段。id は `[A-Za-z0-9_-]+`                                                                                                                           |
| `activities[].actor`                 | no       | 誰の体験か（`管理者`、`一般ユーザー` など）。アクティビティグループの見出しにラベルとして出る                                                                          |
| `activities[].steps[]`               | no       | 既定は `[]`。各要素は `id` / `name` が必須                                                                                                                             |
| `milestones[].id` / `name`           | yes      | 水平スライス。空配列でもよい（「Unassigned」行は常にある）                                                                                                             |
| `milestones[].timeframe`             | no       | 時期（自由記述。`2026年10月`、`Q4` など）。行ヘッダとマイルストーンタブに出る                                                                                          |
| `milestones[].description`           | no       | そのスライスが何を表すか。マイルストーンタブに出る                                                                                                                     |
| `statuses[].id` / `name`             | yes      | ストーリーの進み具合（`Idea` / `Ready` / `Done` など）。省略 = `[]`（ステータスを使わない）                                                                            |
| `statuses[].tone`                    | no       | カードの色（色はステータスだけを表し、アクティビティには色をつけない）。`gray` / `blue` / `violet` / `green` / `amber` / `accent`。省略時は並び順でこの順に割り当てる  |
| `stories[].id` / `name`              | yes      | カードの見出し。id は `[A-Za-z0-9_-]+`                                                                                                                                 |
| `stories[].activityId` / `stepId`    | yes      | 所属する列。`stepId` の持ち主と `activityId` が一致しないと reject                                                                                                     |
| `stories[].milestoneId`              | no       | 省略 = Unassigned 行。存在しない id は reject                                                                                                                          |
| `stories[].description`              | no       | Markdown。カードに（3 行まで）とストーリーパネルに表示される                                                                                                           |
| `statuses[].icon`                    | no       | アイコン。`progress`（既定。ワークフロー上の位置で埋まるリング、最後はチェック）/ `circle` / `lightbulb` / `flag` / `play` / `clock` / `eye` / `pause` / `check` / `x` |
| `stories[].links[]`                  | no       | `{ "url", "label"? }`。http(s) の URL のみ、同じ URL は 1 ストーリーに 1 回。カードとストーリーパネルにリンクのラベルとして出る                                        |
| `stories[].statusId`                 | no       | ステータスがあるマップでは全ストーリーがどれかのステータスに立つ。省略 = 最初のステータス。存在しない id は reject                                                     |
| `labels[].id` / `name`               | yes      | ストーリーに任意で付けるラベル（`Dev` / `PdM` など）。省略 = `[]`。仕組み側はラベルに意味を持たせない（何で区分けするかは運用次第）                                    |
| `labels[].tone`                      | no       | ラベルの色。値は `statuses[].tone` と同じ。省略時は並び順で `blue` から順に割り当てる                                                                                  |
| `stories[].labelIds`                 | no       | そのストーリーが持つラベルの id。同じラベルは 1 回まで。表示はラベルの並び順。存在しない id は reject                                                                  |
| `stories[].blockedBy`                | no       | このストーリーより先に終える必要があるストーリーの id（依存先）。自分自身・同じ id の重複・存在しない id・循環（A が B を待ち B が A を待つ）は reject                 |
| `milestones[].dueDate`               | no       | 期日（`YYYY-MM-DD`、実在する日付のみ）。バーンダウンの理想線はその日の終わりに 0 へ向かう                                                                              |
| `statuses[].weight`                  | no       | そのステータスから次のステータスへ進める手間（0 以上の数）。省略 = 1。最後のステータスの値は使われない                                                                 |
| `estimates[].id` / `name` / `points` | yes      | 見積もりの目盛り（`S`:1 / `M`:3 / `L`:5、`1`:1 / `3`:3 など）。`points` は 0 以上の数。省略 = `[]`（見積もりを使わない）                                               |
| `stories[].estimateId`               | no       | ストーリーの見積もり。省略 = 見積もりなし（ポイント計算では 1）。存在しない id は reject                                                                               |
| `snapshots[]`                        | no       | バーンダウンの記録。`{ "id", "at": ISO 8601 の日時, "tally": [{ "milestoneId"?, "statusId"?, "stories", "points" }] }`。省略 = `[]`                                    |
| `features`                           | no       | 有効にする追加機能（`estimates` = 見積もりとバーンダウン、`assignees` = メンバーと担当者）。省略 = `[]`（どちらも無効）。同じ機能の重複と未知の値は reject             |
| `members[].id` / `name`              | yes      | ストーリーを担当するメンバー。省略 = `[]`                                                                                                                              |
| `members[].tone`                     | no       | メンバーの色（アバターの色）。値は `statuses[].tone` と同じ。省略時は並び順で `blue` から順に割り当てる                                                                |
| `stories[].assigneeId`               | no       | ストーリーの担当者（1 人）。省略 = 担当者なし。存在しない id は reject                                                                                                 |

存在しない `activityId` / `stepId` / `milestoneId` / `statusId` / `labelIds` / `blockedBy` / `estimateId` / `assigneeId` を参照するストーリーは reject される。`activities` / `steps` / `milestones` / `statuses` / `labels` / `members` / `estimates` / `snapshots` / `stories` をまたぐ id の重複も reject される。スナップショットの `tally` は、存在しないマイルストーン / ステータスの行、同じマイルストーン × ステータスの行の重複、負の数を reject する。

ステータスの集合そのものもデータであり、Agent は base で定義し、利用者はステータスタブで追加・改名・色の変更・並び替え・削除ができる（いずれも draft action として Agent に返る）。ラベルも同じで、ラベルタブで追加・改名・色の変更・並び替え・削除ができ、どのストーリーに付けるかはストーリーパネルで切り替える。

依存関係（`blockedBy`）はストーリー間の有向辺で、ストーリーパネルの「依存関係」で両方向から編集できる。最後のステータスに立つストーリーは「完了」とみなし、完了した依存先はもう待っていないものとして数える。

### 追加機能

見積もりとバーンダウン（`estimates`）、メンバーと担当者（`assignees`）は、使うマップでだけ有効にする追加機能である。base の `features` に書いた機能だけが有効になり、既定ではどちらも無効。利用者はページ上部の「機能」メニューから有効・無効を切り替えられ、その切り替えは `SET_FEATURE` の draft action として Agent に返る（Agent は base の `features` に反映する）。

無効な機能は画面から隠れるだけで、データは消えない（`estimates` / `estimateId` / `weight` / `dueDate` / `snapshots`、`members` / `assigneeId` は base に書いたまま読み込まれ、検証もされる）。無効な間に隠れるもの:

- `estimates`: バーンダウンタブ、ステータスタブの重み、ストーリーパネルの見積もり、カードの見積もり、見積もりのフィルター
- `assignees`: メンバータブ、ストーリーパネルの担当者、カードのアバター、担当者のフィルター

### メンバーと担当者

メンバー（`members`）は名前と色の組で、ストーリーに担当者として任意で 1 人付ける。メンバーはメンバータブで追加・改名・色の変更・並び替え・削除ができ、どのストーリーを誰が担当するかはストーリーパネルで選ぶ。メンバーを削除すると、そのメンバーが担当していたストーリーは担当者なしになる。

### 見積もりとバーンダウン

見積もり（`estimates`）は名前とポイントの組で、ストーリーに任意で 1 つ付ける。目盛りはバーンダウンタブで追加・改名・ポイントの変更・並び替え・削除でき、どのストーリーに付けるかはストーリーパネルで選ぶ。

スナップショットは、記録した時点のマップの集計（マイルストーン × ステータスごとのストーリー数とポイント合計）である。バーンダウンタブの「スナップショットを記録」で今の集計が `RECORD_SNAPSHOT` の draft action になり、Agent が base の `snapshots` に書き写すと履歴として残る。tally の行の並びはマイルストーン順（未割当は最後）× ステータス順で、ストーリーのいない組み合わせは行を持たない。

バーンダウンは 1 つのマイルストーンについて、スナップショットを時刻順に並べ、最後に今のマップを加えた線で描く。数える単位はポイント（見積もりのポイント合計。見積もりのないストーリーは 1 ポイント）かストーリー数を選ぶ。

- **重み付きバーンダウンチャート**（1 本）: 各ステータスの量 × そのステータスから最後のステータスまでに残る重みの合計。例: 重みが Idea 7 / Demo 2 / Ready 1 なら、Idea の 3 pt は 30、Demo の 3 pt は 9、Done は 0。すべて最後のステータスに立つと 0 になる。
- **ステータス別**（最初以外のステータスごとに 1 本）: そのステータスにまだ届いていない量（それより前のステータスにいる量の合計）。

期日があれば、最初の点から期日に 0 へ向かう破線（理想線）と期日の縦線（「期日 M/D」）が出る。今の時刻にも縦線（「今日」）が出る。時間軸の目盛りは期間の長さに合わせて日・週（月曜）・2 週・月・四半期・年のうち収まる最も細かい単位で引く。チャートにポインターを乗せる（またはフォーカスして ←/→ / Home / End で点を移る）と、その時点の実績と理想の値を読み出す。重み付きチャートの数え方はタイトル横の ? のツールチップで説明する。

参照形式: `step:<activityId>.<stepId>`（正準形。bare step id も解決できる）、`story:<id>`、`milestone:<id>`、`status:<id>`、`label:<id>`、`member:<id>`、`estimate:<id>`、`snapshot:<id>`。

## Action vocabulary

| Action                   | target    | payload                                                                                             |
| ------------------------ | --------- | --------------------------------------------------------------------------------------------------- |
| `SET_ACTIVITY_NAME`      | activity  | `{ "name": string }`                                                                                |
| `REORDER_ACTIVITY`       | activity  | `{ "after": string \| null }`（`null` = 先頭。配下のステップとストーリーごと動く）                  |
| `SET_ACTIVITY_ACTOR`     | activity  | `{ "actor": string }`（前後の空白は除く。空文字 = ラベルを外す）                                    |
| `SET_STEP_NAME`          | step      | `{ "name": string }`                                                                                |
| `REORDER_STEP`           | step      | `{ "after": string \| null }`（`null` = 先頭、同一 Activity 内）                                    |
| `ADD_ACTIVITY`           | page      | `{ "id", "name" }`                                                                                  |
| `ADD_STEP`               | activity  | `{ "id", "name" }`                                                                                  |
| `DELETE_ACTIVITY`        | activity  | `{}`（配下のステップとストーリーごと削除）                                                          |
| `DELETE_STEP`            | step      | `{}`（配下のストーリーごと削除）                                                                    |
| `SET_STORY_NAME`         | story     | `{ "name": string }`                                                                                |
| `SET_STORY_DESCRIPTION`  | story     | `{ "description": string }`                                                                         |
| `SET_STORY_MILESTONE`    | story     | `{ "milestoneId": string \| null }`（`null` = Unassigned へ）                                       |
| `MOVE_STORY`             | story     | `{ "activityId", "stepId", "milestoneId": string \| null, "after": string \| null }`                |
| `REORDER_STORY`          | story     | `{ "after": string \| null }`（同一マス内のみ）                                                     |
| `ADD_STORY`              | step      | `{ "id", "name", "activityId", "milestoneId"? }`（ステータスは最初のステータス）                    |
| `DELETE_STORY`           | story     | `{}`（他のストーリーの `blockedBy` からも外れる）                                                   |
| `SET_MILESTONE_NAME`     | milestone | `{ "name": string }`                                                                                |
| `ADD_MILESTONE`          | page      | `{ "id", "name" }`                                                                                  |
| `DELETE_MILESTONE`       | milestone | `{}`（所属ストーリーは Unassigned へ退避、削除しない）                                              |
| `REORDER_MILESTONE`      | milestone | `{ "after": string \| null }`                                                                       |
| `ADD_STORY_LINK`         | story     | `{ "url": string, "label"?: string }`（http(s) のみ。同じ URL は追加済みとして扱う）                |
| `REMOVE_STORY_LINK`      | story     | `{ "url": string }`                                                                                 |
| `SET_STORY_STATUS`       | story     | `{ "statusId": string }`（ステータスを外すことはできない）                                          |
| `ADD_STATUS`             | page      | `{ "id", "name", "tone", "icon"? }`（最初のステータスなら全ストーリーがそこに立つ）                 |
| `SET_STATUS_NAME`        | status    | `{ "name": string }`                                                                                |
| `SET_STATUS_TONE`        | status    | `{ "tone": "gray" \| "blue" \| "violet" \| "green" \| "amber" \| "accent" }`                        |
| `SET_STATUS_ICON`        | status    | `{ "icon": "progress" \| "circle" \| "lightbulb" \| … }`（`statuses[].icon` の値）                  |
| `DELETE_STATUS`          | status    | `{}`（そのストーリーは残る最初のステータスへ。最後の 1 つを消すとマップからステータスがなくなる）   |
| `REORDER_STATUS`         | status    | `{ "after": string \| null }`                                                                       |
| `ADD_LABEL`              | page      | `{ "id", "name", "tone" }`                                                                          |
| `SET_LABEL_NAME`         | label     | `{ "name": string }`                                                                                |
| `SET_LABEL_TONE`         | label     | `{ "tone": "gray" \| "blue" \| "violet" \| "green" \| "amber" \| "accent" }`                        |
| `DELETE_LABEL`           | label     | `{}`（全ストーリーからそのラベルが外れる）                                                          |
| `REORDER_LABEL`          | label     | `{ "after": string \| null }`                                                                       |
| `ADD_MEMBER`             | page      | `{ "id", "name", "tone" }`                                                                          |
| `SET_MEMBER_NAME`        | member    | `{ "name": string }`                                                                                |
| `SET_MEMBER_TONE`        | member    | `{ "tone": "gray" \| "blue" \| "violet" \| "green" \| "amber" \| "accent" }`                        |
| `DELETE_MEMBER`          | member    | `{}`（そのメンバーのストーリーは担当者なしになる）                                                  |
| `REORDER_MEMBER`         | member    | `{ "after": string \| null }`                                                                       |
| `SET_STORY_ASSIGNEE`     | story     | `{ "memberId": string \| null }`（`null` = 担当者を外す。存在しない id は stale）                   |
| `ADD_STORY_LABEL`        | story     | `{ "labelId": string }`（付いていれば何もしない）                                                   |
| `REMOVE_STORY_LABEL`     | story     | `{ "labelId": string }`（付いていないと stale）                                                     |
| `ADD_STORY_BLOCKER`      | story     | `{ "blockerId": string }`（target が blocker を待つ。既にあれば何もしない。自分自身・循環は stale） |
| `REMOVE_STORY_BLOCKER`   | story     | `{ "blockerId": string }`（待っていないと stale）                                                   |
| `SET_MILESTONE_DUE_DATE` | milestone | `{ "dueDate": string \| null }`（`YYYY-MM-DD`。`null` = 期日を外す）                                |
| `SET_STATUS_WEIGHT`      | status    | `{ "weight": number }`（0 以上）                                                                    |
| `ADD_ESTIMATE`           | page      | `{ "id", "name", "points": number }`                                                                |
| `SET_ESTIMATE_NAME`      | estimate  | `{ "name": string }`                                                                                |
| `SET_ESTIMATE_POINTS`    | estimate  | `{ "points": number }`（0 以上）                                                                    |
| `DELETE_ESTIMATE`        | estimate  | `{}`（その見積もりのストーリーは見積もりなしになる）                                                |
| `REORDER_ESTIMATE`       | estimate  | `{ "after": string \| null }`                                                                       |
| `SET_STORY_ESTIMATE`     | story     | `{ "estimateId": string \| null }`（`null` = 見積もりを外す。存在しない id は stale）               |
| `RECORD_SNAPSHOT`        | page      | `{ "id", "at": string, "tally": [...] }`（`snapshots[]` と同じ形。末尾に追加される）                |
| `DELETE_SNAPSHOT`        | snapshot  | `{}`                                                                                                |
| `SET_FEATURE`            | page      | `{ "feature": "estimates" \| "assignees", "enabled": boolean }`（すでにその状態なら何もしない）     |

- `after` は anchor id であり offset ではない。`{ "after": "login" }` は「login の直後へ」、`{ "after": null }` は「先頭へ」を意味し、存在しない anchor を指すと stale になる。
- `MOVE_STORY` は列・スライス間の移動を 1 文で表す。`after` は移動先セル内の anchor でなければならない。`REORDER_STORY` は同一マス（同一 step + 同一 milestone）内の並び替え専用で、他マスの anchor を指すと stale になる。
- `DELETE_ACTIVITY` / `DELETE_STEP` / `DELETE_STORY` で消えたストーリーは、残るストーリーの `blockedBy` から外れる（空になれば `blockedBy` ごと消える）。
- `DELETE_MILESTONE` はスナップショットのそのマイルストーンの行を未割当の行へ、`DELETE_STATUS` はそのステータスの行を残る最初のステータスの行へ合算する（ステータスが 1 つもなくなれば `statusId` のない行になる）。最初のステータスを `ADD_STATUS` すると、`statusId` のない行はそのステータスの行になる。
- Delete の cascade は表のとおりで、親を消してから子を編集する draft は stale になる。

## Navigation

```text
#activity=onboarding&step=signup&story=google-signup&tab=milestones&view=activity&status=ready,done&label=dev&estimate=~none&assignee=kim&highlight=critical-path
```

- `status` / `label` / `estimate` / `assignee` はマップのフィルター（ステータス / ラベル / 見積もり / 担当者）。それぞれカンマ区切りの id。`label` / `estimate` / `assignee` では `~none` が「ラベルなし」「見積もりなし」「担当者なし」のストーリーを選ぶ。`estimate` と `assignee` は、その機能が無効な間は落とす。1 つのフィルターの中は OR、フィルター同士は AND。省略 = そのフィルターなし。存在しない id は落とし、マップでの並び順（`~none` は最後）に正規化される。
- `highlight` はマップで強調するもの。値は `critical-path`（クリティカルパス）だけで、それ以外の値は落とす。省略 = 強調なし。クリティカルパスは、まだ完了していないストーリーが依存先を待って連なる鎖のうち、残りの作業量の合計が最も大きいもの（同点の鎖はすべて含む）。残りの作業量はバーンダウンと同じく「見積もりのポイント × そのストーリーがこれから通るステータスの重みの合計」で、`estimates` が無効な間は未完了のストーリー 1 件を 1 とする。完了したストーリーは誰も待たせないので、鎖はそこで切れる。強調中は鎖上のカードに強調色の縁が付き、それ以外のカードは薄くなる（ポインターを乗せると戻る）。変更の「表示」でストーリーへ移るときは、フィルターと同じく外れる。
- `tab` はページのタブ。省略 = `User Story Mapping`（マップ）、`milestones` = マイルストーンタブ、`statuses` = ステータスタブ、`labels` = ラベルタブ、`members` = メンバータブ（`assignees` が有効な間）、`burndown` = バーンダウンタブ（`estimates` が有効な間）。それ以外の値は省略に正規化される。
- `milestone` はバーンダウンタブで見るマイルストーン。省略 = 期日のある最初のマイルストーン（なければ最初のマイルストーン）。`unit` は数える単位で `points` か `stories`。省略 = 見積もりの目盛りがあれば `points`、なければ `stories`。どちらも存在しない値は落とす。

- `view` は表のまとめ単位で、`activity`（アクティビティごとの列 + group band、既定）か `group`（アクティビティグループごとに 1 列、step 分割なし）。表の上のタブで切り替える。
- `group` ビューでは step を特定できないため、他アクティビティへのドロップではその場で step を選ぶ dialog が開く。milestone はドロップした位置のもので、移動先セルの末尾に置かれる。同じアクティビティ内のドロップは、ドラッグ中のストーリーの step を保ったまま milestone と順序だけを変える。
- `step` の選択はその列をハイライトし、`story` の選択はカードをフォーカスして、マップの右にストーリーパネルを開く。パネルを閉じると `story` は外れる。開いているストーリーの依存先のカードと、それを待つカードは枠線（依存先は amber、待つ側は violet の破線）で示される。

## UI provided by the template

サイドバーなし。ページ上部のタブで「User Story Mapping」（マップ）、「マイルストーン」（スライスの一覧）、「ステータス」（ステータスの定義）、「ラベル」（ラベルの定義）、有効な追加機能のタブ「メンバー」（メンバーの定義）と「バーンダウン」（マイルストーンごとの進み具合と見積もりの目盛り）を切り替える自己完結レイアウト。

表は画面の高さに収まる枠の中で縦横にスクロールする。スクロールしてもバックボーン（アクティビティ / ステップの見出し行）は上端に、左端の列（軸の説明とマイルストーン名）は左端に留まり、ページのタブ（とマップのまとめ単位のタブ、マップのツールバー）はページをスクロールしても上端に留まる。

| 領域               | 内容                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ページ上部         | ページのタブ（User Story Mapping / マイルストーン / ステータス / ラベル / メンバー / バーンダウン。それぞれストーリー数 / マイルストーン数 / ステータス数 / ラベル数 / メンバー数 / スナップショット数つき。メンバーとバーンダウンはその機能が有効な間だけ。1 行に収まらないタブは末尾から「…」ボタンのメニューに畳まれ、そこから選んで移れる。選択中のタブは畳まれない）。マップでは右側にまとめ単位のタブ（`view`）。右端に「機能」ボタン（押すと追加機能のメニューが開き、各機能をチェックで有効・無効にする。Escape か外のクリックで閉じる）                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 左上コーナー       | 軸の説明（`Activity group →` / `Activity →` / `Milestone ↓`）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 列ヘッダ           | Activity ごとのグループ見出し（名前は inline-edit 可能、ステップ追加はアイコンのみ。名前の横に `actor` のラベル（inline-edit 可能。幅が足りないときは名前を優先して省略される）、見出しの下端に配下ストーリーのステータス構成を色で積み上げた細いバー。`group` ビューでは配下のステップを番号つきリストで並べる）＋ ステップ名セル（ストーリー数つき）。どちらの見出しも先頭にグリップを持ち、見出し自体がドラッグハンドルで、別の見出しに落とすと列ごと移る（ステップは同じ Activity の中だけ。他の Activity のステップ見出しには落とせない）。右端に `+ Activity`                                                                                                                                                                                                                                                                                                                                                                                                                   |
| マップのツールバー | ページのタブのすぐ下に 1 行で、左にフィルター、右端に「クリティカルパス」ボタン（`highlight` を切り替える。押している間はボタンが強調され、鎖上のストーリー数を出す）。マップに step があるときだけ出る                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| フィルター         | マップのツールバーの左に、ステータス / ラベル / 見積もり / 担当者のセレクト（選択肢のあるものだけ。見積もりと担当者はその機能が有効な間だけ）。押すとメニューが開き、「すべて」と各選択肢（アイコンや色・名前・件数。ラベル・見積もり・担当者は最後に「なし」）をチェックで選ぶ。選んでもメニューは開いたままで、Escape か外のクリックで閉じる。セレクトには選んだもの（1 つならその名前、複数なら「名前 +N」）を出し、どれかが効いていれば「クリア」を出す                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 行ヘッダ           | マイルストーン名（行ヘッダ自体がドラッグハンドル）と、その下に時期・ストーリー数 ＋ 最終行 `Unassigned`（ドラッグ不可）。最下部に `+ Milestone`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| セル               | カード一覧（ステータスアイコン・名前・見積もりの名前と担当者のアバター（右上。それぞれその機能が有効な間だけ）・説明（Markdown、3 行まで）・依存のチップ（`N 件をブロック` = これを待つストーリーの数。スパイクの目印として強調色。`N 件待ち` = まだ完了していない依存先の数）・ラベル（ラベルの色つき）・リンクのラベル（3 つまで、残りは `+n`）・`group` ビューではステップ名・コメント数）＋ 底部の `+ Add` ボタン。カードの面と縁はステータスの色でうっすら色づく。カード自体に操作ボタンはなく、クリックか（Tab でフォーカスして）Enter / Space でストーリーパネルが開く                                                                                                                                                                                                                                                                                                                                                                                                         |
| マイルストーンタブ | 各マイルストーンが何かを知るための定義を、マップの行順に縦のタイムラインで並べる（左に時期、1 本のレールに順番つきのノード、右に中身）。名前（inline-edit 可能）、説明、ストーリー数と全体に占める割合、バックボーンのステップをどれだけ含むか、ステータスがあればそのスライスのステータス構成（ステータス色の積み上げバーと凡例）。時期がなければ「時期未定」と出る。ストーリーカードは出さない（ストーリーはマップで扱う）。レールの末尾に `+ Milestone`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ストーリーパネル   | 右から出るドロワー。どこにあるか（アクティビティ › ステップ › マイルストーン）、タイトル（inline-edit）、説明（Markdown。inline-edit で原文を編集）、ステータスの選択、見積もりの選択（「なし」と目盛りの各値。バーンダウンタブへのリンクつき。`estimates` が有効な間だけ）、担当者の選択（「なし」と各メンバー。メンバータブへのリンクつき。`assignees` が有効な間だけ）、ラベルのトグル（マップのラベルを全部並べ、押すと付け外しする。ラベルタブへのリンクつき）、依存関係（依存先と、これを待つストーリーの一覧。名前でそのストーリーへ移り、✕ で外す。選択肢から追加でき、循環になるストーリーは選択肢に出ない）、リンクの一覧（外す）と URL での追加、コメントの一覧と追加（Ctrl / ⌘ + Enter でも送れる）、ストーリーの削除。開くとフォーカスがパネルに移り、閉じると元のカードに戻る。Escape（フォーカスがどこにあっても。編集中の inline-edit の Escape は編集の取り消しだけ）、✕、パネルの外（マップ側）のクリックで閉じる。別のカードのクリックはそのストーリーに切り替える |
| ステータスタブ     | ステータスを順に 1 行ずつ並べる。アイコン（押すとアイコンの選択肢が開く）、名前（inline-edit 可能）、そのステータスのストーリー数と全体に占める割合、次のステータスへの重み（最後のステータス以外。`estimates` が有効な間だけ）、色の選択、上下の並び替え、削除。末尾に `+ Status`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ラベルタブ         | ラベルを順に 1 行ずつ並べる。色、名前（inline-edit 可能）、そのラベルが付いたストーリー数と全体に占める割合、色の選択、上下の並び替え、削除。末尾に `+ Label`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| メンバータブ       | メンバーを順に 1 行ずつ並べる。アバター（名前の頭文字）、名前（inline-edit 可能）、担当するストーリー数と全体に占める割合、色の選択、上下の並び替え、削除。末尾に `+ Member`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| バーンダウンタブ   | 上部にマイルストーンの選択、期日（日付入力）、数える単位（ポイント / ストーリー数）、「スナップショットを記録」。その下に重み付きバーンダウンチャート（数え方はタイトル横の ? のツールチップ）、ステータス別のチャート（ステータスの色）、スナップショットの一覧（新しい順。削除できる）、見積もりの目盛り（名前は inline-edit、ポイントは数値入力、並び替え、削除、`+ 見積もり`）。ポイントで数えるとき、見積もりのないストーリーがあれば 1 ポイントとして数えている旨を警告として出す。チャートはポインターを乗せた時点の実績と理想の値を読み出す                                                                                                                                                                                                                                                                                                                                                                                                                                   |

UI から編集できるのはストーリー名・説明・ステータス・リンク・コメント・削除（ストーリーパネル）、セルごとの追加、アクティビティ名 / actor / ステップ名 / マイルストーン名の変更とアクティビティ・ステップ・マイルストーンの並び替え、カードのドラッグ移動、ステータスの追加・改名・色・アイコン・並び替え・削除、ラベルの追加・改名・色・並び替え・削除とストーリーへの付け外し、ストーリー間の依存関係の追加・削除、見積もりの目盛りの編集とストーリーへの見積もり、ステータスの重み、マイルストーンの期日、スナップショットの記録と削除、メンバーの追加・改名・色・並び替え・削除とストーリーの担当者、追加機能の有効・無効。

リンクのラベルは URL から作る: GitHub の issue / PR は `#86`、GitLab は `#3` / `!7`、Jira（`*.atlassian.net`）と Linear は `PROJ-123`、Figma はファイル名、Notion はページ名、それ以外はホスト名。それぞれのサービスのアイコンがつく。`label` を書けばその文字列が優先される。

ドラッグの並び替えは、同じ並び（同じ行 / 同じセル / 列見出しの並び）の中ではドロップした要素の位置を取る（下へ動かせばその後ろ、上へ動かせばその前。要素のどこに落としても同じ）。別のセルから来たカードは、ドロップした要素の中央より上ならその前、下ならその後ろ、空き領域なら末尾に入る。

## Comment targets

`page:usm`（マップ全体）と、すべての activity / step / milestone / status / label / member / estimate / snapshot / story が `commentTargets` に列挙される。ストーリーへのコメントはストーリーパネルのコメント欄から書く。

## Naming

Activity、step、story はすべて動詞形で書く（`利用を開始する` → `登録する` → `ノートを書く`）。ページ名ではなく体験の動作として命名する。

## Change notices

[Change notices](../index.md#change-notices) の "Show" の遷移先:

| Target                                       | 遷移先                                                                                       |
| -------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `story:<id>` / `step:<id>` / `activity:<id>` | マップ（`tab` 省略）を開き、該当のカード・ステップ列・アクティビティ見出しをハイライトする   |
| `milestone:<id>`                             | マイルストーンタブを開き、その行をハイライトする（マップの行ヘッダにも同じターゲットが付く） |
| `status:<id>`                                | ステータスタブを開く                                                                         |
| `label:<id>`                                 | ラベルタブを開く                                                                             |
| `member:<id>`                                | メンバータブを開く（`assignees` が無効なら遷移しない）                                       |
| `estimate:<id>` / `snapshot:<id>`            | バーンダウンタブを開く（`estimates` が無効なら遷移しない）                                   |
