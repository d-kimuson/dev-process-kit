import { defineMessages } from '../../core/i18n';

export const tagFilterMessages = defineMessages({
  en: {
    tagFilter: 'Filter by tag',
    tagMatch: 'Tag matching',
    clearTags: 'Clear',
  },
  ja: {
    tagFilter: 'タグの絞り込み',
    tagMatch: 'タグの一致条件',
    clearTags: '解除',
  },
});

export type TagFilterMessages = ReturnType<typeof tagFilterMessages>;
