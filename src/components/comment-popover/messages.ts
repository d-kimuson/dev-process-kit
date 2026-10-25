import { defineMessages } from '../../core/i18n';

export const commentPopoverMessages = defineMessages({
  en: {
    sendFailed: 'Could not send. Place this inside a dpk-view-* element.',
  },
  ja: {
    sendFailed: '送信できませんでした（dpk-view-* 要素の中に置いてください）。',
  },
});

export type CommentPopoverMessages = ReturnType<typeof commentPopoverMessages>;
