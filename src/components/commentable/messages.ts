import { defineMessages } from '../../core/i18n';

export const commentableMessages = defineMessages({
  en: {
    heading: 'Content',
    untitled: 'Untitled',
    sendFailed: 'Could not send. Place this inside a dpk-view-* element.',
  },
  ja: {
    heading: '本文',
    untitled: '無題',
    sendFailed: '送信できませんでした（dpk-view-* 要素の中に置いてください）。',
  },
});

export type CommentableMessages = ReturnType<typeof commentableMessages>;
