import { defineMessages } from '../../core/i18n';

export const plainMessages = defineMessages({
  en: {
    wholePage: 'Whole page',
    sectionGroup: 'Section',
  },
  ja: {
    wholePage: 'ページ全体',
    sectionGroup: 'セクション',
  },
});

export type PlainMessages = ReturnType<typeof plainMessages>;
