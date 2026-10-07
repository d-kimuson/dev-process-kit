import { defineMessages } from '../../core/i18n';

type ErStatus = 'same' | 'added' | 'removed' | 'changed';

const label = (status: ErStatus, en: boolean): string => {
  if (en) return { same: 'Unchanged', added: 'Added', removed: 'Removed', changed: 'Changed' }[status];
  return { same: '変更なし', added: '追加', removed: '削除', changed: '変更' }[status];
};

export const erDiagramMessages = defineMessages({
  en: {
    heading: 'ERD',
    node: 'Table',
    edge: 'Relation',
    empty: 'No matching tables.',
    search: 'Search',
    legendAdded: 'Added',
    legendRemoved: 'Removed',
    legendChanged: 'Changed',
    legendCardinality:
      'Crow’s foot: | one · ○ zero · fork many — each end counts that table’s rows per row across the line',
    statusLabel: (status: ErStatus) => label(status, true),
    edgeLabel: (from: string, to: string, cardinality: string) => `${from} and ${to}, related ${cardinality}`,
    was: (previous: string) => `was ${previous}`,
    nullable: 'nullable',
  },
  ja: {
    heading: 'ER図',
    node: 'テーブル',
    edge: '関連',
    empty: '該当するテーブルはありません。',
    search: '検索',
    legendAdded: '追加',
    legendRemoved: '削除',
    legendChanged: '変更',
    legendCardinality:
      'カラスの足記法: | 1 · ○ 0 · 三叉 多 — 各端の記号と数字は、相手側 1 行に対するその端のテーブルの行数',
    statusLabel: (status: ErStatus) => label(status, false),
    edgeLabel: (from: string, to: string, cardinality: string) => `${from} と ${to} の関連 (${cardinality})`,
    was: (previous: string) => `変更前 ${previous}`,
    nullable: 'null可',
  },
});

export type ErDiagramMessages = ReturnType<typeof erDiagramMessages>;
