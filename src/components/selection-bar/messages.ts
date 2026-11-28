import { defineMessages } from '../../core/i18n';

export const selectionBarMessages = defineMessages({
  en: {
    selected: (count: number) => `${count} selected`,
    clear: 'Clear selection',
  },
  ja: {
    selected: (count: number) => `${count} 件選択`,
    clear: '選択を解除',
  },
});

export type SelectionBarMessages = ReturnType<typeof selectionBarMessages>;
