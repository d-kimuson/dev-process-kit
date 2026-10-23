import { defineMessages } from '../../core/i18n';

export const codeMessages = defineMessages({
  en: {
    copy: 'Copy',
    copied: 'Copied',
    copyFailed: 'Copy failed',
    copyLabel: (name: string) => `Copy ${name}`,
    code: 'code',
  },
  ja: {
    copy: 'コピー',
    copied: 'コピーしました',
    copyFailed: 'コピー失敗',
    copyLabel: (name: string) => `${name} をコピー`,
    code: 'コード',
  },
});

export type CodeMessages = ReturnType<typeof codeMessages>;
