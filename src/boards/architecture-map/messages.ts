import { defineMessages } from '../../core/i18n';

export const architectureMapMessages = defineMessages({
  en: {
    heading: 'Architecture map',
    node: 'Service',
    edge: 'Connection',
    empty: 'No matching services.',
    boundaries: 'Boundaries',
    edgeLabel: (from: string, to: string) => `Connection from ${from} to ${to}`,
    artworkCredit: (license: string) => `Icon credit: ${license}`,
    detailDescription: 'Description',
    detailBoundary: 'Boundary',
    detailFrom: 'From',
    detailTo: 'To',
  },
  ja: {
    heading: 'アーキテクチャマップ',
    node: 'サービス',
    edge: '接続',
    empty: '該当するサービスはありません。',
    boundaries: '境界',
    edgeLabel: (from: string, to: string) => `${from} から ${to} への接続`,
    artworkCredit: (license: string) => `アイコン出典: ${license}`,
    detailDescription: '説明',
    detailBoundary: '境界',
    detailFrom: '接続元',
    detailTo: '接続先',
  },
});

export type ArchitectureMapMessages = ReturnType<typeof architectureMapMessages>;
