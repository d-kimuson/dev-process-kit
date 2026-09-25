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
│   ├── templates/     # 公開テンプレート dpk-template-*（prototype / usm / event-storming / example-mapping / grill / plain / slides / task-board）
│   ├── core/          # 内部実装（pipeline / persistence / element 基底 / 契約）
│   ├── lib/           # 依存を持たない小さな共通ヘルパー（lib/dom/*）
│   ├── entries/       # 配信する entrypoint（components / templates/<name>）
│   └── index.ts       # 配信する entrypoint（全部入り）
├── dist/              # npm パッケージの中身（`pnpm build` の生成物。`pnpm dev` も同じ場所に書く。commit しない）
├── sample/            # サンプル（dev では別オリジンで配信し bundle を cross-origin で読む。main は GitHub Pages に公開。配布物には含めない）
├── docs/              # 利用者向け（core / components / templates。バージョンごとの版は Git tag `v<version>` で参照される）
├── dev-docs/          # 開発者向け（利用者向けの docs/ とは分ける）
│   ├── guidelines/    # Harness / 設計 / 検証 / commit / ADR の書き方
│   └── adr/           # 覆すコストが高い意思決定の記録
├── skills/            # 利用者（Agent）向け skill。npm 上の最新版の見つけ方と docs への入口を持つ
├── .agents/skills/    # 開発者向け skill（release）
├── dev/lints/         # リポジトリ固有の oxlint ルール（境界の強制）
├── dev/types/         # 型検査だけを目的とした compile-time guard
└── dev/qa/            # 実ブラウザでのサンプル smoke check
```

## References

必要な文書だけを読む（Progressive Disclosure）。タスクに応じて次を参照する。

| File                                                | Target                                          | When to refer                            |
| :-------------------------------------------------- | :---------------------------------------------- | :--------------------------------------- |
| [Harness](dev-docs/guidelines/harness.md)           | `AGENTS.md`, `docs/**`, `dev-docs/**`, `dev/**` | 指示・文書・lint 構成を変えるとき        |
| [Architecture](dev-docs/guidelines/architecture.md) | `src/**`                                        | 責務境界や依存方向に関わる変更をするとき |
| [Coding](dev-docs/guidelines/coding.md)             | `src/**`                                        | コードを書く・直すとき                   |
| [Testing and QA](dev-docs/guidelines/qa.md)         | tests, browser verification                     | 検証方法を計画・実行するとき             |
| [Commit](dev-docs/guidelines/commit.md)             | Git commits                                     | コミットを作成するとき                   |
| [ADR](dev-docs/guidelines/adr.md)                   | `dev-docs/adr/**`                               | 意思決定を記録するとき                   |

利用者向け文書は `docs/index.md`（利用方法と API 契約）と `docs/templates/*` / `docs/components/*`（個別ページ）で、npm パッケージには含めない。利用者（Agent）は `skills/dev-process-kit/SKILL.md` に従い、npm で最新バージョンを調べ、そのバージョンの Git tag（`v<version>`）の docs を読む。docs の URL 例は `dev-process-kit@<version>` と書く。開発者向け文書（`dev-docs/`）と混同しない。

配布は npm パッケージ `dev-process-kit` で、ページは jsDelivr（`https://cdn.jsdelivr.net/npm/dev-process-kit@<version>/dist/<entry>.js`）から exact version を固定して読む（[ADR](dev-docs/adr/20260924_npm-jsdelivr-distribution.md)）。root の `package.json` をそのまま公開し、`files` で `dist/` だけを載せる。build の設定（entry・minify・source map・third-party notice とライセンス検査）は `vite.config.ts` にまとまっている。`dist/` は生成物であり、直接編集しない。

バージョンの SSoT は `package.json` の `version` で、リリースは `.agents/skills/release/SKILL.md` の手順で行う（`npm version` が検査・署名付き commit・`v<version>` tag を作り、tag の push を受けて `.github/workflows/release.yml` が Trusted Publishing で publish する）。検証用の版は prerelease（`x.y.z-beta.n`、dist-tag `beta`）として出し、公開済みのバージョンは上書きしない。

パッケージは用途ごとの entry（`templates/<name>.js` / `components.js` / 全部入りの `index.js`）を配る。一覧は `vite.config.ts` の `ENTRIES` で、`package.json` の `exports` と一致しないと build が失敗する（[ADR](dev-docs/adr/20260920_per-template-entries.md)）。
