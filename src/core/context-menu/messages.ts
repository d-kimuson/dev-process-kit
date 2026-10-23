import { defineMessages } from '../i18n';

export const contextMenuMessages = defineMessages({
  en: {
    menu: 'Context menu',
    copyText: 'Copy text',
    feedback: 'Give feedback',
    reviewComment: 'Review comment',
    resetView: 'Reset view',
    resetPositions: 'Reset positions',
    addDiagramHere: 'Add diagram',
    searchDiagram: 'Search diagrams…',
    duplicate: 'Duplicate',
    delete: 'Delete',
  },
  ja: {
    menu: 'コンテキストメニュー',
    copyText: 'テキストをコピー',
    feedback: 'フィードバックする',
    reviewComment: 'レビューコメント',
    resetView: '表示をリセット',
    resetPositions: '位置をリセット',
    addDiagramHere: '図を追加',
    searchDiagram: '図を検索…',
    duplicate: '複製',
    delete: '削除',
  },
});

export type ContextMenuMessages = ReturnType<typeof contextMenuMessages>;
