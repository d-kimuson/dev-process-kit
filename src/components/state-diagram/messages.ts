import { defineMessages } from '../../core/i18n';

export const stateDiagramMessages = defineMessages({
  en: {
    heading: 'State machine',
    node: 'State',
    edge: 'Transition',
    empty: 'No matching transitions.',
    transitionLabel: (from: string, to: string, title: string) => `${title} from ${from} to ${to}`,
  },
  ja: {
    heading: 'ステートマシン',
    node: '状態',
    edge: '遷移',
    empty: '該当する遷移はありません。',
    transitionLabel: (from: string, to: string, title: string) => `${from} から ${to} への ${title}`,
  },
});

export type StateDiagramMessages = ReturnType<typeof stateDiagramMessages>;
