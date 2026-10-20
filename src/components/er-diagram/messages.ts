import { defineMessages } from '../../core/i18n';

type ErStatus = 'same' | 'added' | 'removed' | 'changed';
type ColumnRole = 'primary' | 'foreign' | 'not-null' | 'nullable';
type Attribute = 'type' | 'keys' | 'ref' | 'nullable' | 'cardinality' | 'label';

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
    notNull: 'not null',
    notRecorded: 'Could not record it. Place this inside a dpk-template-* element.',
    addFieldButton: 'Add column',
    addFieldTitle: 'Add column',
    addFieldName: 'Column name',
    addFieldType: 'Type',
    columnNameLabel: 'Name',
    columnNamePlaceholder: 'column_name',
    columnTypePlaceholder: 'e.g. text',
    columnTypeChoices: 'Types in this schema',
    columnTypeNew: 'New type',
    columnNullable: 'Allow NULL',
    columnNameTaken: 'This table already has a column with this name.',
    cancel: 'Cancel',
    columnAdd: 'Add',
    columnSave: 'Save',
    columnKeys: 'Enter to confirm · Esc to cancel',
    addFieldSummary: (table: string, field: string, type: string) => `${table}.${field} (${type})`,
    editFieldButton: (field: string) => `Edit ${field}`,
    editFieldTitle: 'Edit column',
    editFieldSummary: (table: string, field: string, type: string) => `${table}.${field} → ${type}`,
    columnRole: (role: ColumnRole) =>
      ({ primary: 'Primary key', foreign: 'Foreign key', 'not-null': 'NOT NULL', nullable: 'Nullable' })[role],
    changesLabel: 'Changes',
    attributeLabel: (attribute: Attribute) =>
      ({ type: 'type', keys: 'keys', ref: 'ref', nullable: 'null', cardinality: 'card.', label: 'label' })[attribute],
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
    nullable: 'NULL 可',
    notNull: 'NOT NULL',
    notRecorded: '記録できませんでした（dpk-template-* 要素の中に置いてください）。',
    addFieldButton: 'カラムを追加',
    addFieldTitle: 'カラムを追加',
    addFieldName: 'カラム名',
    addFieldType: '型',
    columnNameLabel: '名前',
    columnNamePlaceholder: 'column_name',
    columnTypePlaceholder: '例: text',
    columnTypeChoices: 'このスキーマの型',
    columnTypeNew: '新しい型',
    columnNullable: 'NULL を許可',
    columnNameTaken: '同じ名前のカラムがすでにあります。',
    cancel: 'キャンセル',
    columnAdd: '追加',
    columnSave: '保存',
    columnKeys: 'Enter で確定 · Esc で閉じる',
    addFieldSummary: (table: string, field: string, type: string) => `${table}.${field} (${type})`,
    editFieldButton: (field: string) => `${field} を編集`,
    editFieldTitle: 'カラムを編集',
    editFieldSummary: (table: string, field: string, type: string) => `${table}.${field} → ${type}`,
    columnRole: (role: ColumnRole) =>
      ({ primary: '主キー', foreign: '外部キー', 'not-null': 'NOT NULL', nullable: 'NULL 可' })[role],
    changesLabel: '変更点',
    attributeLabel: (attribute: Attribute) =>
      ({ type: '型', keys: 'キー', ref: '参照', nullable: 'NULL', cardinality: '多重度', label: 'ラベル' })[attribute],
  },
});

export type ErDiagramMessages = ReturnType<typeof erDiagramMessages>;
