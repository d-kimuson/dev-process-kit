import { defineMessages } from '../../core/i18n';

export const comboboxMessages = defineMessages({
  en: {
    listLabel: 'Options',
    empty: 'No matches.',
    selectedCount: (count: number) => `${count} selected`,
    moveLabel: 'to move',
    toggleLabel: 'to toggle',
    removeChip: (label: string) => `Remove ${label}`,
  },
  ja: {
    listLabel: '候補',
    empty: '一致する項目がありません。',
    selectedCount: (count: number) => `${count} 件選択`,
    moveLabel: 'で移動',
    toggleLabel: 'で切り替え',
    removeChip: (label: string) => `${label} を削除`,
  },
});

export type ComboboxMessages = ReturnType<typeof comboboxMessages>;
