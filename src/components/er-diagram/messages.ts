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
    legendCardinality: '1 : 0..N at the FK end — referenced rows per FK row : FK rows per referenced row',
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
    legendCardinality: 'FK 側の端の 1 : 0..N — FK 1 行あたりの参照先の行数 : 参照先 1 行あたりの FK 側の行数',
    statusLabel: (status: ErStatus) => label(status, false),
    edgeLabel: (from: string, to: string, cardinality: string) => `${from} と ${to} の関連 (${cardinality})`,
    was: (previous: string) => `変更前 ${previous}`,
    nullable: 'null可',
  },
});

export type ErDiagramMessages = ReturnType<typeof erDiagramMessages>;
