import { defineMessages } from '../../core/i18n';

export const composerMessages = defineMessages({
  en: {
    comment: 'Comment',
    commentOn: (label: string) => `Comment on ${label}`,
    submit: 'Add',
    cancel: 'Cancel',
  },
  ja: {
    comment: 'コメント',
    commentOn: (label: string) => `${label}へのコメント`,
    submit: '追加',
    cancel: 'キャンセル',
  },
});

export type ComposerMessages = ReturnType<typeof composerMessages>;
