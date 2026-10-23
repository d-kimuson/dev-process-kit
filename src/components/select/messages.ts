import { defineMessages } from '../../core/i18n';

export const selectMessages = defineMessages({
  en: { fallbackLabel: 'Select', required: 'Choose one.' },
  ja: { fallbackLabel: '選択', required: '選択してください。' },
});

export type SelectMessages = ReturnType<typeof selectMessages>;
