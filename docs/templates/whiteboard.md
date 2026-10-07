# Template: whiteboard (`<dpk-template-whiteboard>`)

A free-form board in the spirit of Miro: sticky notes, text, shapes and frames placed anywhere on a pannable, zoomable canvas, joined by connectors. Use it when the material has no fixed structure yet — a brainstorm, a retro, an affinity map, a rough flow — and the user should move things around rather than fill in a form.

```text
frame    — a titled area; whatever sits inside it belongs to it and moves with it
sticky   — a colored note (the default thing to put on a board)
text     — free text with no box (headings, annotations)
shape    — rect / ellipse with a label (flow steps, states)
connector — an arrow (or a plain line) between two items, with an optional label
```

- Element: `<dpk-template-whiteboard>`
- Definition name: `whiteboard`
- Entry: `templates/whiteboard.js`
- Accent token: `--dpk-blue`（選択・接続）

## Base data

```json
{
  "title": "オンボーディング改善のブレスト",
  "items": [
    { "id": "heading", "kind": "text", "x": 0, "y": -110, "w": 720, "text": "初回購入まで進めない理由と打ち手" },
    { "id": "issues", "kind": "frame", "x": 0, "y": 0, "w": 560, "h": 420, "title": "現状の課題", "color": "pink" },
    { "id": "email-drop", "kind": "sticky", "x": 30, "y": 50, "text": "メール認証で 4 割が離脱", "color": "pink" },
    { "id": "ideas", "kind": "frame", "x": 620, "y": 0, "w": 560, "h": 420, "title": "アイデア" },
    { "id": "magic-link", "kind": "sticky", "x": 650, "y": 50, "text": "マジックリンクにする" },
    { "id": "signup", "kind": "shape", "x": 0, "y": 540, "w": 180, "h": 90, "text": "サインアップ" },
    {
      "id": "first-order",
      "kind": "shape",
      "shape": "ellipse",
      "x": 300,
      "y": 530,
      "text": "初回購入",
      "color": "green"
    }
  ],
  "connectors": [
    { "id": "drop-magic", "from": "email-drop", "to": "magic-link", "label": "打ち手" },
    { "id": "signup-order", "from": "signup", "to": "first-order" }
  ]
}
```

Coordinates are canvas units (1 unit = 1 CSS px at 100 % zoom). `x` / `y` are the top-left corner and may be negative. The board opens fitted to everything on it, so where the origin is does not matter — only the relative layout does.

| Field                             | Required         | Notes                                                                                                                                 |
| --------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `title`                           | no               | ページのヘッダーに表示される。既定は `Whiteboard`                                                                                     |
| `items[].id`                      | yes              | `[A-Za-z0-9_-]+`。items と connectors で一意（同じ id 空間）                                                                          |
| `items[].kind`                    | yes              | `sticky` / `text` / `shape` / `frame`                                                                                                 |
| `items[].x` / `y`                 | yes              | 左上の座標（canvas 単位）                                                                                                             |
| `items[].w` / `h`                 | frame のみ必須   | 既定: sticky `160×160`、text `240×48`、shape `180×110`。最小 24                                                                       |
| `items[].text`                    | no               | sticky / text / shape の本文（改行可）。既定は空                                                                                      |
| `items[].title`                   | frame は必須     | フレームの見出し（空不可）                                                                                                            |
| `items[].color`                   | no               | `yellow` / `orange` / `pink` / `purple` / `blue` / `green` / `gray`。既定: sticky `yellow`、shape `blue`、frame `gray`。text には無い |
| `items[].shape`                   | no（shape のみ） | `rect`（既定）/ `ellipse`                                                                                                             |
| `connectors[].id` / `from` / `to` | yes              | 既存の item を指すこと。`from` と `to` が同じものは reject                                                                            |
| `connectors[].label`              | no               | 線の中央に表示                                                                                                                        |
| `connectors[].style`              | no               | `arrow`（既定、`to` 側に矢印）/ `line`                                                                                                |

未知の `kind` / フィールド、存在しない item を指す connector、items と connectors をまたぐ id の重複は reject される。

### Frames and membership

フレームへの所属は座標で決まる。item の中心を含む最小のフレームがその item の所属先で、フレームはネストできる。所属を表すフィールドは無い: item をフレームの箱の中に置けばそのフレームに属する。読み手がフレームをドラッグすると中身も一緒に動く。

描画順は frames → その他の items（配列順）→ connectors。後に書いた item が上に重なる。

参照形式: `item:<id>`（フレームも item）、`connector:<id>`、ページ全体は `page:whiteboard`。

## Action vocabulary

| Action                | target    | payload                                                                          |
| --------------------- | --------- | -------------------------------------------------------------------------------- |
| `ADD_ITEM`            | page      | item 1 つ（base data の `items[]` と同じ形。`w` / `h` / `color` は既定で埋まる） |
| `SET_ITEM_TEXT`       | item      | `{ "text": string }`（frame ではタイトル。空のタイトルは stale）                 |
| `MOVE_ITEM`           | item      | `{ "x": number, "y": number }`（移動後の左上座標）                               |
| `RESIZE_ITEM`         | item      | `{ "w": number, "h": number }`（24 以上）                                        |
| `SET_ITEM_COLOR`      | item      | `{ "color": "yellow" \| … \| "gray" }`（text には適用できず stale）              |
| `DELETE_ITEM`         | item      | `{}`（その item につながる connector も消える）                                  |
| `CONNECT_ITEMS`       | page      | `{ "id", "from", "to", "label"?, "style"? }`                                     |
| `SET_CONNECTOR_LABEL` | connector | `{ "label": string }`（`""` でラベルを外す）                                     |
| `DELETE_CONNECTOR`    | connector | `{}`                                                                             |

- `MOVE_ITEM` / `RESIZE_ITEM` は「この座標・サイズにする」patch で、続けて同じ item を動かすと最後の値だけが残る。元の位置に戻すと draft から消える。
- フレームのドラッグは、フレームと中身それぞれの `MOVE_ITEM` を 1 回の batch で記録する。
- review rail と brief は移動を所属の変化で説明する（`frame “現状の課題” → frame “アイデア” (981, 267)`、`into frame “…”`、`out of frame “…”`）。所属が変わらない移動は座標の before → after。**brief を受け取ったら、所属の変化を意味の変化として読む**（課題からアイデアへ移された、など）。
- 追加した item に続けて入力したテキストは `SET_ITEM_TEXT` として別に記録されるが、`ADD_ITEM` の説明は最終的なテキストで表示される。

## Navigation

```text
#frame=ideas
#frame=ideas&item=magic-link
```

- `frame` はフォーカス中のフレーム。開くとそのフレームが画面に収まるように表示される（サイドバーのフレーム一覧も同じ）。
- `item` は選択中の item または connector。コメント composer の「この要素に」はこれを指す（無ければフォーカス中のフレーム）。
- 存在しない id は除去され、URL は正準形に書き戻される。`frame` を変えると `item` は外れる。
- パン・ズームの位置そのものは navigation ではなく、URL にも draft にも残らない。

## UI provided by the template

| 領域           | 内容                                                                                                                           |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| サイドバー     | フレーム一覧（色・件数）と「ボード全体」。クリックでそこへ移動する。フレームが無いボードではサイドバーを出さない               |
| キャンバス     | ドットの背景。空き部分のドラッグ / ホイールでパン、Ctrl(⌘)+ホイール / ピンチでズーム。盤面が画面外へ消えるところまでは動かない |
| 左のツールバー | 付箋 / テキスト / 四角形 / 楕円 / フレームを表示中の中央に追加（重ならない近くの空きへ）。追加するとそのまま入力できる         |
| 選択ツールバー | 選択中の item の上に出る: 色（text 以外）、テキスト編集、つなぐ、コメント、削除。connector ではラベル編集・コメント・削除      |
| 選択ハンドル   | 右下の角でリサイズ、右辺の丸をドラッグして別の item の上で離すと connector を作る                                              |
| ズーム         | 右下に − / % / + / 全体表示                                                                                                    |

操作:

- クリックで選択、ドラッグで移動（フレームは見出しをつかむ。フレームの中の空き部分をドラッグするとパン）。選択中の item をもう一度クリック、ダブルクリック、Enter でテキストを編集。
- 空いたところをダブルクリックすると付箋を置く。
- キャンバスにフォーカスがあるとき: Delete / Backspace で選択を削除、矢印キーで選択を 10 単位（Shift で 1 単位）動かす（未選択ならパン）、`+` / `-` でズーム、`0` で全体表示、Esc で選択・モードの解除。
- コメントは選択ツールバーのコメントボタンから。その item / connector への composer が top layer の popover で開く。コメントのある item には件数のバッジが付く。

## Comment targets

`page:whiteboard`（ボード全体）と、すべての item（フレームを先頭に、所属フレーム名付き）と connector が `commentTargets` に列挙される。

## Authoring guidance

- 1 つのフレームに 1 つの問い（「現状の課題」「アイデア」「次のアクション」）を置き、付箋は 1 枚 1 論点で短く書く。
- 色に意味を持たせるなら一貫させる（例: 課題 = pink、アイデア = yellow、決定 = green）。凡例が必要なら `text` item で書く。
- 付箋は 160 単位の格子（`x` を 180 刻みなど）に並べると読みやすい。フレームは中身より一回り大きく取る。
- connector は意味のある関係（原因 → 打ち手、手順の流れ）にだけ引き、ラベルで関係を言葉にする。
