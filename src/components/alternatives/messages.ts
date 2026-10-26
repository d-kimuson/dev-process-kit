import { defineMessages } from '../../core/i18n';

export const alternativesMessages = defineMessages({
  en: {
    heading: 'Alternatives',
    empty: 'No alternatives to compare.',
    dataError: 'The alternatives could not be read.',
    reason: 'Reason',
    tradeoffs: 'Tradeoffs',
    adopted: 'Adopted',
    rejected: 'Rejected',
    considered: 'Considered',
  },
  ja: {
    heading: '代替案',
    empty: '比較する代替案がありません。',
    dataError: '代替案のデータを読み取れませんでした。',
    reason: '理由',
    tradeoffs: 'トレードオフ',
    adopted: '採用',
    rejected: '却下',
    considered: '検討',
  },
});

export type AlternativesMessages = ReturnType<typeof alternativesMessages>;
