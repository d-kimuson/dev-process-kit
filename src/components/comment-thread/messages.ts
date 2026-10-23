import { defineMessages } from '../../core/i18n';

/** When a comment was written, to the minute. */
const commentDate = (locale: string, at: string): string =>
  new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(at));

export const commentThreadMessages = defineMessages({
  en: {
    heading: 'Comments',
    commentsOn: (label: string) => `Comments on “${label}”`,
    commentCountAria: (count: number) => `${count} comment${count === 1 ? '' : 's'}`,
    empty: 'No comments yet.',
    add: 'Add comment',
    cancel: 'Cancel',
    deleteComment: 'Delete comment',
    sendFailed: 'Could not save the comment.',
    commentDate: (at: string) => commentDate('en-US', at),
  },
  ja: {
    heading: 'コメント',
    commentsOn: (label: string) => `「${label}」のコメント`,
    commentCountAria: (count: number) => `コメント ${count} 件`,
    empty: 'コメントはまだありません。',
    add: 'コメントを追加',
    cancel: 'キャンセル',
    deleteComment: 'コメントを削除',
    sendFailed: 'コメントを保存できませんでした。',
    commentDate: (at: string) => commentDate('ja-JP', at),
  },
});

export type CommentThreadMessages = ReturnType<typeof commentThreadMessages>;
