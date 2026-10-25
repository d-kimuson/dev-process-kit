import { defineMessages } from '../../core/i18n';

export const codeGroupMessages = defineMessages({
  en: {
    empty: 'No code variants',
    invalid: (reason: string) => `Invalid code group: ${reason}`,
  },
  ja: {
    empty: 'コードのバリエーションがありません',
    invalid: (reason: string) => `コードグループの形式が正しくありません: ${reason}`,
  },
});

export type CodeGroupMessages = ReturnType<typeof codeGroupMessages>;
