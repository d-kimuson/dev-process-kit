import { defineMessages } from '../../core/i18n';

export const architectureMapMessages = defineMessages({
  en: {
    heading: 'Architecture',
    node: 'Service',
    edge: 'Connection',
    empty: 'No matching services.',
    boundaries: 'Boundaries',
    edgeLabel: (from: string, to: string) => `Connection from ${from} to ${to}`,
    artworkCredit: (license: string) => `Icon credit: ${license}`,
  },
  ja: {
    heading: 'アーキテクチャ図',
    node: 'サービス',
    edge: '接続',
    empty: '該当するサービスはありません。',
    boundaries: '境界',
    edgeLabel: (from: string, to: string) => `${from} から ${to} への接続`,
    artworkCredit: (license: string) => `アイコン出典: ${license}`,
  },
});

export type ArchitectureMapMessages = ReturnType<typeof architectureMapMessages>;
