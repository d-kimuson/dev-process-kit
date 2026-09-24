import type { SequenceMessage } from './model';

import { defineMessages } from '../../core/i18n';

const detail = (style: SequenceMessage['style'], en: boolean): string => {
  if (en)
    return { request: 'Process / guarantee', response: 'Response / guarantee', async: 'Async / guarantee' }[style];
  return { request: '処理 / 保証', response: '応答 / 保証', async: '非同期処理 / 保証' }[style];
};

export const sequenceDiagramMessages = defineMessages({
  en: {
    heading: 'Sequence',
    empty: 'No matching messages.',
    participants: 'Participants',
    stats: (shown: number, total: number) => `${shown} / ${total} messages`,
    detailLabel: (style: SequenceMessage['style']) => detail(style, true),
    selectMessage: (title: string) => `Select ${title}`,
    frameHeaderLabel: (operator: string, title: string, collapsed: boolean) =>
      `${operator} · ${collapsed ? `Expand ${title}` : `Collapse ${title}`}`,
    frameCount: (count: number) => `${count} message${count === 1 ? '' : 's'}`,
  },
  ja: {
    heading: 'シーケンス図',
    empty: '該当するメッセージはありません。',
    participants: '参加者',
    stats: (shown: number, total: number) => `${shown} / ${total} メッセージ`,
    detailLabel: (style: SequenceMessage['style']) => detail(style, false),
    selectMessage: (title: string) => `${title}を選択`,
    frameHeaderLabel: (operator: string, title: string, collapsed: boolean) =>
      `${operator} · ${title}を${collapsed ? '展開' : '折りたたむ'}`,
    frameCount: (count: number) => `${count} メッセージ`,
  },
});

export type SequenceDiagramMessages = ReturnType<typeof sequenceDiagramMessages>;
