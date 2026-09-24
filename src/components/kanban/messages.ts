import { defineMessages } from '../../core/i18n';

export const kanbanMessages = defineMessages({
  en: {
    heading: 'Kanban',
    empty: 'No columns.',
    cards: 'Card',
    notRecorded: 'Could not record it. Place this inside a dpk-template-* element.',
    wipLimit: (limit: number) => `WIP limit ${limit}`,
    addCardButton: '+ Card',
    addCardAriaLabel: (columnLabel: string) => `Card to add to ${columnLabel}`,
    addCardPlaceholder: 'Card title (Enter to add)',
    addCardTitle: 'Add card',
    moveCardTitle: 'Move card',
    addSummary: (columnLabel: string, cardTitle: string) => `${columnLabel} › ${cardTitle}`,
    moveSummarySame: (cardTitle: string, columnLabel: string) => `${cardTitle}: reorder within ${columnLabel}`,
    moveSummaryAcross: (cardTitle: string, fromLabel: string, toLabel: string) =>
      `${cardTitle}: ${fromLabel} → ${toLabel}`,
  },
  ja: {
    heading: 'カンバン',
    empty: '列がありません。',
    cards: 'カード',
    notRecorded: '記録できませんでした（dpk-template-* 要素の中に置いてください）。',
    wipLimit: (limit: number) => `WIP 上限 ${limit}`,
    addCardButton: '＋ カード',
    addCardAriaLabel: (columnLabel: string) => `${columnLabel} に追加するカード`,
    addCardPlaceholder: 'カード名（Enter で追加）',
    addCardTitle: 'カードを追加',
    moveCardTitle: 'カードを移動',
    addSummary: (columnLabel: string, cardTitle: string) => `${columnLabel} › ${cardTitle}`,
    moveSummarySame: (cardTitle: string, columnLabel: string) => `${cardTitle}: ${columnLabel} 内で並べ替え`,
    moveSummaryAcross: (cardTitle: string, fromLabel: string, toLabel: string) =>
      `${cardTitle}: ${fromLabel} → ${toLabel}`,
  },
});

export type KanbanMessages = ReturnType<typeof kanbanMessages>;
