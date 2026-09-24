import { defineMessages } from '../../core/i18n';

export const diagramMessages = defineMessages({
  en: {
    tagFilter: 'Filter by tag',
    tagMatch: 'Tag matching',
    clearTags: 'Clear',
    zoomOut: 'Zoom out',
    fit: 'Fit to view',
    zoomIn: 'Zoom in',
    sendFailed: 'Could not send. Please try again.',
    commentOn: (label: string) => `Comment on ${label}`,
    noMatches: 'No matching elements.',
    maximize: 'Maximize',
    restore: 'Restore size',
    canvas: 'Diagram. Arrow keys pan, plus and minus zoom, 0 fits the view.',
    dataError: 'Could not load the diagram data.',
    nodes: 'elements',
    edges: 'relations',
    change: (before: string, after: string) => `“${before}” → “${after}”`,
  },
  ja: {
    tagFilter: 'タグの絞り込み',
    tagMatch: 'タグの一致条件',
    clearTags: '解除',
    zoomOut: '縮小',
    fit: '全体を表示',
    zoomIn: '拡大',
    sendFailed: '送信できませんでした。もう一度お試しください。',
    commentOn: (label: string) => `${label}にコメント`,
    noMatches: '該当する要素はありません。',
    maximize: '最大化',
    restore: '元のサイズに戻す',
    canvas: '図。矢印キーでパン、プラス・マイナスでズーム、0で全体表示。',
    dataError: '図のデータを読み込めませんでした。',
    nodes: '要素',
    edges: '関連',
    change: (before: string, after: string) => `「${before}」→「${after}」`,
  },
});

export type DiagramMessages = ReturnType<typeof diagramMessages>;
