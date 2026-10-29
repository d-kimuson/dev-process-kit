import { defineMessages } from '../../core/i18n';

export const dialogMessages = defineMessages({
  en: {
    close: 'Close',
  },
  ja: {
    close: '閉じる',
  },
});

export type DialogMessages = ReturnType<typeof dialogMessages>;
