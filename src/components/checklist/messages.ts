import { defineMessages } from '../../core/i18n';

export const checklistMessages = defineMessages({
  en: {
    heading: 'Checklist',
    empty: 'No items.',
    progress: (done: number, total: number) => `${done} / ${total} done`,
    actionTitle: (label: string, checked: boolean) => `${checked ? 'Checked' : 'Unchecked'}: ${label}`,
    unrecorded: 'Could not record it. Place this inside a dpk-template-* element.',
    comment: 'Comment',
    commentOn: (label: string) => `Comment on ${label}`,
  },
  ja: {
    heading: 'チェックリスト',
    empty: '項目がありません。',
    progress: (done: number, total: number) => `${done} / ${total} 完了`,
    actionTitle: (label: string, checked: boolean) => `${checked ? 'チェック' : 'チェック解除'}: ${label}`,
    unrecorded: '記録できませんでした（dpk-template-* 要素の中に置いてください）。',
    comment: 'コメント',
    commentOn: (label: string) => `${label} にコメント`,
  },
});

export type ChecklistMessages = ReturnType<typeof checklistMessages>;
