import { defineMessages } from '../../core/i18n';

export const mindMapMessages = defineMessages({
  en: {
    heading: 'Mind map',
    empty: 'No matching topics.',
    topics: 'Topic',
    toggleOpen: (label: string, hidden: number) => `Open ${hidden} subtopics of ${label}`,
    toggleClose: (label: string) => `Collapse subtopics of ${label}`,
    addSubtopicButton: '+ Subtopic',
    commentButton: 'Comment',
    addSubtopicAriaLabel: (label: string) => `Subtopic of ${label}`,
    addSubtopicPlaceholder: 'Subtopic title (Enter to add)',
    notRecorded: 'Could not record it. Place this inside a dpk-template-* element.',
    addTopicTitle: 'Add topic',
    addSummary: (parentLabel: string, label: string) => `${parentLabel} › ${label}`,
  },
  ja: {
    heading: 'マインドマップ',
    empty: '該当するトピックはありません。',
    topics: 'トピック',
    toggleOpen: (label: string, hidden: number) => `${label} のサブトピック ${hidden} 件をひらく`,
    toggleClose: (label: string) => `${label} のサブトピックをたたむ`,
    addSubtopicButton: '＋ サブトピック',
    commentButton: 'コメント',
    addSubtopicAriaLabel: (label: string) => `${label} のサブトピック`,
    addSubtopicPlaceholder: 'サブトピック名（Enter で追加）',
    notRecorded: '記録できませんでした（dpk-template-* 要素の中に置いてください）。',
    addTopicTitle: 'トピックを追加',
    addSummary: (parentLabel: string, label: string) => `${parentLabel} › ${label}`,
  },
});

export type MindMapMessages = ReturnType<typeof mindMapMessages>;
