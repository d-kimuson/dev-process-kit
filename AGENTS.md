# dev-process-kit

Agent が生成し人がブラウザでレビューする単一 HTML ページの
**構造・レビュー・Agent へのフィードバック**を共通化する Web Components である。
ビルド不要の ESM として配布し、Custom Elements / attributes / properties /
events / slots だけを公開契約にする（Lit は実装詳細）。

## Directory Structure

```text
.
├── src/
│   ├── components/    # 公開コンポーネント dpk-component-*（レビューレール / インライン編集 / 図）
│   ├── templates/     # 公開テンプレート dpk-template-*（prototype / usm / event-storming / example-mapping / grill / plain）
│   ├── core/          # 内部実装（pipeline / persistence / element 基底 / 契約）
│   ├── lib/           # 依存を持たない小さな共通ヘルパー（lib/dom/*）
│   ├── entries/       # 配信する entrypoint（components / templates/<name>）
│   ├── static/        # 配信物にそのまま入るファイル（_headers）
│   └── index.ts       # 配信する entrypoint（全部入り）
├── public/            # 配信物（ビルド成果物だが git 追跡する。release ごとにディレクトリが同居）
├── public-dev/        # 開発用の配信ツリー（`pnpm dev` が作り、wrangler dev が配信する）
├── sample/            # サンプル（dev では別オリジンで配信し bundle を cross-origin で読む。build が /sample/ に同梱する）
├── wrangler.jsonc     # Workers Static Assets の配信設定（Worker コードは置かない）
├── docs/              # 利用者向け（core / components / templates。配布物に同梱される）
├── docs/guidelines/   # 開発者向け（Harness / 設計 / 検証。配布物には含めない）
├── docs/adr/          # 覆すコストが高い意思決定の記録
├── dev/lints/         # リポジトリ固有の oxlint ルール（境界の強制）
├── dev/types/         # 型検査だけを目的とした compile-time guard
└── scripts/           # build / 配布整合性検査
```

## References

必要な文書だけを読む（Progressive Disclosure）。タスクに応じて次を参照する。

| File                                            | Target                           | When to refer                            |
| :---------------------------------------------- | :------------------------------- | :--------------------------------------- |
| [Harness](docs/guidelines/harness.md)           | `AGENTS.md`, `docs/**`, `dev/**` | 指示・文書・lint 構成を変えるとき        |
| [Architecture](docs/guidelines/architecture.md) | `src/**`                         | 責務境界や依存方向に関わる変更をするとき |
| [Coding](docs/guidelines/coding.md)             | `src/**`                         | コードを書く・直すとき                   |
| [Testing and QA](docs/guidelines/qa.md)         | tests, browser verification      | 検証方法を計画・実行するとき             |
| [Commit](docs/guidelines/commit.md)             | Git commits                      | コミットを作成するとき                   |
| [ADR](docs/guidelines/adr.md)                   | `docs/adr/**`                    | 意思決定を記録するとき                   |

利用者向け文書は `docs/index.md`（利用方法と API 契約）と `docs/templates/*` / `docs/components/*`（個別ページ）で、各 release の入口は `dev-process-kit@<version>/docs/index.md`。asset root の `llms.txt` は release index で、ツリーが持つ最新バージョンを名乗る（生成物）。開発者向け文書と混同しない。

`public/` ・ `public-dev/` は生成物であり、直接編集しない。配信物の SSoT は `src/**`（と同梱する `docs/**`）で、`scripts/assemble-assets.ts` が配信ツリーを組み立てる（`pnpm build` が `public/`、 `pnpm dev` が `public-dev/`）。`public/` は commit する: commit されたツリーがデプロイされ、 `node scripts/verify-committed.ts` がビルド結果との一致を、`node scripts/verify-published.ts <base>` が公開済み release の不変性を検査する。`public-dev/` は commit しない。

どの release を `public/` に書くかはチャネル（`DPK_CHANNEL=stable|debug`）が決め、その判断は
`scripts/release.ts` に集約する（release id / origin / キャッシュポリシー / docs の書き換え）。
`pnpm deploy:debug` は最新ビルドを debug release（`dev-process-kit@debug`、上書きされる）として
workers.dev に公開する。詳細は [ADR](docs/adr/20260920_debug-release-channel.md)。

release は用途ごとの entry（`templates/<name>.js` / `components.js` / 全部入りの `index.js`）を配る。一覧は `scripts/release.ts` の `RELEASE_ENTRIES` が唯一の定義で、build・完全性検査・docs がそれを読む （[ADR](docs/adr/20260920_per-template-entries.md)）。
