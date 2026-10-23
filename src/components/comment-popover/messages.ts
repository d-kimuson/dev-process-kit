import { defineMessages } from '../../core/i18n';

export const commentPopoverMessages = defineMessages({
  en: {
    sendFailed: 'Could not send. Place this inside a dpk-template-* element.',
  },
  ja: {
    sendFailed: '送信できませんでした（dpk-template-* 要素の中に置いてください）。',
  },
});

export type CommentPopoverMessages = ReturnType<typeof commentPopoverMessages>;
