import { defineMessages } from '../../core/i18n';

export const stateDiagramMessages = defineMessages({
  en: {
    heading: 'State diagram',
    node: 'State',
    edge: 'Transition',
    empty: 'No matching transitions.',
    transitionLabel: (from: string, to: string, title: string) => `${title} from ${from} to ${to}`,
    detailCode: 'Code',
    detailDescription: 'Description',
    detailFrom: 'From',
    detailTo: 'To',
    detailGuard: 'Guard',
    detailEffect: 'Effect',
  },
  ja: {
    heading: 'ステート図',
    node: '状態',
    edge: '遷移',
    empty: '該当する遷移はありません。',
    transitionLabel: (from: string, to: string, title: string) => `${from} から ${to} への ${title}`,
    detailCode: 'コード',
    detailDescription: '説明',
    detailFrom: '遷移元',
    detailTo: '遷移先',
    detailGuard: 'ガード条件',
    detailEffect: '効果',
  },
});

export type StateDiagramMessages = ReturnType<typeof stateDiagramMessages>;
