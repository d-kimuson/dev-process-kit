# dpk-board-whiteboard

A free-form board in the spirit of Miro: sticky notes, text, shapes and frames placed anywhere on a pannable, zoomable canvas, joined by connectors. Use it when the material has no fixed structure yet — a brainstorm, a retro, an affinity map, a rough flow — and the reader should move things around rather than fill in a form.

Shared contract (data paths, tags, pan/zoom, comments, sizing, toolbar title and subtitle — `heading`, `subject`): `docs/boards/index.md`.

```text
frame    — a titled area; whatever sits inside it belongs to it and moves with it
sticky   — a colored note (the default thing to put on a board)
text     — free text with no box (headings, annotations)
shape    — rect / ellipse with a label (flow steps, states)
connector — an arrow (or a plain line) between two items, with an optional label
```

## Data

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

| Field                             | Required         | Notes                                                                                                                                         |
| --------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`                           | no               | ページのヘッダーに表示される。既定は `Whiteboard`                                                                                             |
| `items[].id`                      | yes              | `[A-Za-z0-9_-]+`。items と connectors で一意（同じ id 空間）                                                                                  |
| `items[].kind`                    | yes              | `sticky` / `text` / `shape` / `frame`                                                                                                         |
| `items[].x` / `y`                 | yes              | 左上の座標（canvas 単位）                                                                                                                     |
| `items[].w` / `h`                 | frame のみ必須   | 既定: sticky `160×160`、text `240×48`、shape `180×110`。最小 24                                                                               |
| `items[].text`                    | no               | sticky / text / shape の本文（改行可）。既定は空                                                                                              |
| `items[].title`                   | frame は必須     | フレームの見出し（空不可）                                                                                                                    |
| `items[].color`                   | no               | `yellow` / `orange` / `pink` / `purple` / `blue` / `green` / `gray`。既定: sticky `yellow`、shape `blue`、frame `gray`。text には無い         |
| `items[].shape`                   | no（shape のみ） | `rect`（既定）/ `ellipse`                                                                                                                     |
| `items[].fontSize`                | no（frame 以外） | `small` / `medium`（既定）/ `large` / `xlarge`。frame には無い                                                                                |
| `connectors[].id` / `from` / `to` | yes              | 既存の item を指すこと。`from` と `to` が同じものは reject                                                                                    |
| `connectors[].label`              | no               | 線の中央に表示                                                                                                                                |
| `connectors[].style`              | no               | `arrow`（既定、`to` 側に矢印）/ `line`                                                                                                        |
| `connectors[].route`              | no               | `straight`（既定、直線）/ `elbow`（カギ線）/ `curve`（曲線）                                                                                  |
| `items[].questions`               | no               | Refs of the page's questions (grill) the item is about, space-separated (`"Q1 Q4"`); each gets a Q badge (`docs/index.md`, Questions (grill)) |

未知の `kind` / フィールド、存在しない item を指す connector、items と connectors をまたぐ id の重複は reject される。

### Frames and membership

フレームへの所属は座標で決まる。item の中心を含む最小のフレームがその item の所属先で、フレームはネストできる。所属を表すフィールドは無い: item をフレームの箱の中に置けばそのフレームに属する。読み手がフレームをドラッグすると中身も一緒に動く。

描画順は frames → その他の items（配列順）→ connectors。後に書いた item が上に重なる。

参照形式: `item:<id>`（フレームも item）、`connector:<id>`、ボード全体は `page:whiteboard`。ページの内容にするときは、他の target と同じく `@<page>` を付ける（`docs/page.md`）。

## Selection

`selection` is `{ kind: 'item' | 'connector', id }`. Complex selections (a marquee over several items) are not reflected in this property — it tracks the single-selection case the comment composer and change notices use.

## Action vocabulary

| Action                | target    | payload                                                                                       |
| --------------------- | --------- | --------------------------------------------------------------------------------------------- |
| `ADD_ITEM`            | page      | item 1 つ（base data の `items[]` と同じ形。`w` / `h` / `color` / `fontSize` は既定で埋まる） |
| `SET_ITEM_TEXT`       | item      | `{ "text": string }`（frame ではタイトル。空のタイトルは stale）                              |
| `MOVE_ITEM`           | item      | `{ "x": number, "y": number }`（移動後の左上座標）                                            |
| `RESIZE_ITEM`         | item      | `{ "w": number, "h": number }`（24 以上）                                                     |
| `SET_ITEM_COLOR`      | item      | `{ "color": "yellow" \| … \| "gray" }`（text には適用できず stale）                           |
| `SET_ITEM_FONT_SIZE`  | item      | `{ "fontSize": "small" \| "medium" \| "large" \| "xlarge" }`（frame には適用できず stale）    |
| `REORDER_ITEM`        | item      | `{ "after": string \| null }`（重なり順。`null` は最背面）                                    |
| `DELETE_ITEM`         | item      | `{}`（その item につながる connector も消える）                                               |
| `CONNECT_ITEMS`       | page      | `{ "id", "from", "to", "label"?, "style"?, "route"? }`                                        |
| `SET_CONNECTOR_LABEL` | connector | `{ "label": string }`（`""` でラベルを外す）                                                  |
| `SET_CONNECTOR_ROUTE` | connector | `{ "route": "straight" \| "elbow" \| "curve" }`                                               |
| `DELETE_CONNECTOR`    | connector | `{}`                                                                                          |

- `MOVE_ITEM` / `RESIZE_ITEM` は「この座標・サイズにする」patch で、続けて同じ item を動かすと最後の値だけが残る。元の位置に戻すと draft から消える。
- フレームのドラッグは、フレームと中身それぞれの `MOVE_ITEM` を 1 回の batch で記録する。
- `REORDER_ITEM` の `after` は anchor id で、frame を除いた重なり順の中で「その item の直後」を指す（`null` は最背面）。frame は常に他の item より背面に描かれるので、anchor になるのも並び替えられるのも frame 以外の item だけ。
- review rail と brief は移動を所属の変化で説明する（`frame “現状の課題” → frame “アイデア” (981, 267)`、`into frame “…”`、`out of frame “…”`）。所属が変わらない移動は座標の before → after。**brief を受け取ったら、所属の変化を意味の変化として読む**（課題からアイデアへ移された、など）。
- 追加した item に続けて入力したテキストは `SET_ITEM_TEXT` として別に記録されるが、`ADD_ITEM` の説明は最終的なテキストで表示される。
- Embedded inside a view, or the content of a page, every action above is an **element action** on `element:<id>/item/<item-id>` or `element:<id>/connector/<connector-id>` (`docs/boards/index.md`, Element comments and view integration), with `ADD_ITEM` / `CONNECT_ITEMS` landing on `element:<id>/page` instead of a page-level target. The enclosing view (or the page, when the board is its content) owns the draft; inside a page, every target above ends in `@<page>`.

## Navigation

```text
#frame=ideas
#frame=ideas&item=magic-link
#item=magic-link,email-drop
```

- `frame` はフォーカス中のフレーム。開くとそのフレームが画面に収まるように表示される（サイドバーのフレーム一覧も同じ）。
- `item` は選択中の item または connector。複数選択は `item=a,b` のようにカンマ区切りの id リストで表す（connector は単体選択のみ）。コメント composer の「この要素に」は単体選択のときのみこれを指す（無ければフォーカス中のフレーム）。
- 存在しない id は除去され、URL は正準形に書き戻される。`frame` を変えると `item` は外れる。
- パン・ズームの位置そのものは navigation ではなく、URL にも draft にも残らない。

## UI provided by the component

| 領域           | 内容                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| サイドバー     | フレーム一覧（色・件数）と「ボード全体」。クリックでそこへ移動する。フレームが無いボードではサイドバーを出さない                                                                                                                                                                                                                                                                         |
| キャンバス     | ドットの背景。空き部分のドラッグ / ホイールでパン、Ctrl(⌘)+ホイール / ピンチでズーム。盤面が画面外へ消えるところまでは動かない                                                                                                                                                                                                                                                           |
| 左のツールバー | 付箋 / テキスト / 四角形 / 楕円 / フレームを表示中の中央に追加（重ならない近くの空きへ）。追加するとそのまま入力できる                                                                                                                                                                                                                                                                   |
| 選択ツールバー | 選択中の item の上に出る: 色（text 以外）、文字サイズ S / M / L / XL（文字が収まらなくなる item は高さが伸び、`SET_ITEM_FONT_SIZE` と一緒に `RESIZE_ITEM` が記録される。テキスト編集の確定でも同じ）、重なり順（選択が他の item と重なっているときだけ表示。見た目が変わらない移動は選べない）、コメント、削除。connector では線の形（直線 / カギ線 / 曲線）とラベル編集、コメント、削除 |
| 選択ハンドル   | 単体選択した item は選択線（アウトライン）のどこをつかんでもリサイズできる。辺はその方向だけ、角は縦横両方（Shift を押している間は縦横比を保つ。下の表を参照）。右下の角には丸い取っ手も出る。右辺の丸をドラッグして別の item の上で離すと connector を作る（connector はこのドラッグでのみ作られる）                                                                                    |
| ズーム         | 右下に − / % / + / 全体表示                                                                                                                                                                                                                                                                                                                                                              |

操作:

- クリックで選択。選択中の item（付箋 / テキスト / 図形）をもう一度クリックするか、ダブルクリックするか、Enter を押すと、クリックした位置にキャレットを置いてテキスト編集を始める（既存の item の上でのダブルクリックは編集であり、新しい item は追加しない）。編集はフォーカスが外れると確定し、Esc は確定せずに抜ける。
- ドラッグで移動（フレームは見出しをつかむか、選択済みのフレームなら中の空き部分をつかんでも動かせる）。
- 単体選択した item は、選択線（アウトライン）のどこをつかんでもリサイズできる。右下の角の取っ手も同じ。つかむ場所で変わる軸とカーソルが決まる（フレームも同じようにリサイズでき、フレームの大きさを変えても中身は動かない）:

  | つかむ場所      | 変わるもの                     | カーソル      |
  | --------------- | ------------------------------ | ------------- |
  | 上辺 / 下辺     | 高さ（反対側の辺は動かさない） | `ns-resize`   |
  | 左辺 / 右辺     | 幅（反対側の辺は動かさない）   | `ew-resize`   |
  | 左上 / 右下の角 | 幅と高さ                       | `nwse-resize` |
  | 右上 / 左下の角 | 幅と高さ                       | `nesw-resize` |

  反対側の辺を動かさないので、左辺や上辺をつかむと位置（`x` / `y`）も変わる。そのときは `MOVE_ITEM` に続けて `RESIZE_ITEM` が記録される。Shift を押している間は縦横比を保ち、辺では引いた軸が主でもう一方がそれに追従する（角では大きく引いた側が主）。最小サイズは 24 単位で、取っ手は 10px の帯なのでズームしても画面上の大きさは変わらない（Space 押下中はパンが優先）。押しただけで動かさなければ何も起きない（選択も移動も編集も始まらない）。

- 空いた場所（フレームの中の空きも含む）のドラッグは選択範囲（マーキー）を描く。Shift を押しながらだと今の選択に追加される。フレームの空き部分のクリック（ドラッグなし）はそのフレームを選択する。
- 空いたところをダブルクリックすると付箋を置く。
- キャンバスにフォーカスがあるとき: Delete / Backspace で選択を削除、矢印キーで選択を 10 単位（Shift で 1 単位）動かす（未選択ならパン）、Ctrl(⌘)+A で全 item を選択、Ctrl(⌘)+C → Ctrl(⌘)+V で選択中の item を複製（貼り付けるたびにずれる）、`]` / `[` で選択を 1 つ前面 / 背面へ（Ctrl(⌘)+`]` / Ctrl(⌘)+`[` で最前面 / 最背面へ）、Space 押下中のドラッグはパン、`+` / `-` でズーム、`0` で全体表示、Esc でモード（編集・コメント）を抜けるか、無ければ選択を解除。
- コメントは item のホバー（または item 内にフォーカスがあるとき）で右上に出るコメントボタンから。その item への composer が top layer の popover で開く（選択も移動も編集も始まらない）。item を右クリックして "Review comment" を選んでも同じ composer が開く。フレームにはこのボタンを出さず、右クリックのみ。コメントのある item には件数のバッジが付く。

選択線リサイズの割り切り（帯は選択線の外側 10px、ズームしても画面上で一定）:

- item の右上に出るホバーのコメントボタンは右上の角の上に重なる。ボタンが出ている間、その一角と角の近くの辺（約 24px）はコメントの当たり判定になり、リサイズできない。他の辺・角と右下の取っ手はそのまま使える。
- 選択中の item の辺のすぐ外を connector が通っていると、辺の帯が connector の当たり判定（線の両側）に重なる。その部分はリサイズが優先されるので、connector を選ぶには線の別の場所をつかむ。
- フレームの見出しは箱の外側にあるので、フレームの上辺の帯が見出しの下端 4px ほどに重なる（見出しの残りをつかめばこれまでどおり動かせる）。
- item をテキスト編集中は帯を出さない（編集中は箱の内側がフィールドのもの）。複数選択はまとめて移動するので帯は出さない。

## Comment targets

`page:whiteboard`（ボード全体。ページの内容にするときは `page:whiteboard@<page>`）と、すべての item（フレームを先頭に、所属フレーム名付き）と connector が `commentTargets` に列挙される。

item のホバーコメントボタンと右クリックの "Review comment" は同じ composer をその item の位置に開く（popover 内に textarea + Send / Cancel + 既存コメント一覧）。connector とフレームは右クリックのみ。

## Authoring guidance

- 1 つのフレームに 1 つの問い（「現状の課題」「アイデア」「次のアクション」）を置き、付箋は 1 枚 1 論点で短く書く。
- 色に意味を持たせるなら一貫させる（例: 課題 = pink、アイデア = yellow、決定 = green）。凡例が必要なら `text` item で書く。
- 付箋は 160 単位の格子（`x` を 180 刻みなど）に並べると読みやすい。フレームは中身より一回り大きく取る。
- connector は意味のある関係（原因 → 打ち手、手順の流れ）にだけ引き、ラベルで関係を言葉にする。

## Change notices

[Change notices](../index.md#change-notices) の "Show" はキャンバスをパンして（スクロールではない）対象を画面に収める:

| Target           | 動き                                                                             |
| ---------------- | -------------------------------------------------------------------------------- |
| `item:<id>`      | その item が画面に収まるようパンする。frame なら `#frame=` でフォーカスする      |
| `connector:<id>` | 両端が画面に収まるようパンし、ラベルがあればラベルを、なければ線をハイライトする |
