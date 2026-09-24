import type { MappingCardKind } from './model';
import type { StoryReadiness } from './present';

import { defineMessages } from '../../core/i18n';

const KIND_LABEL_EN: Record<MappingCardKind, string> = {
  story: 'Story',
  rule: 'Rule',
  example: 'Example',
  question: 'Question',
};

const KIND_LABEL_JA: Record<MappingCardKind, string> = {
  story: 'ストーリー',
  rule: 'ルール',
  example: '具体例',
  question: '質問',
};

const READINESS_LABEL_EN: Record<StoryReadiness, string> = {
  empty: 'No rules yet',
  'open-questions': 'Open questions',
  'too-big': 'Consider splitting',
  thin: 'A rule has no example',
  ready: 'Looks ready',
};

const READINESS_LABEL_JA: Record<StoryReadiness, string> = {
  empty: 'ルール未整理',
  'open-questions': '未解決の質問あり',
  'too-big': '分割を検討',
  thin: '具体例の無いルールあり',
  ready: '合意できそう',
};

export const exampleMappingMessages = defineMessages({
  en: {
    /** The four card kinds, board order: Story / Rule / Example / Question. */
    kindLabel: (kind: MappingCardKind) => KIND_LABEL_EN[kind],
    readinessLabel: (readiness: StoryReadiness) => READINESS_LABEL_EN[readiness],
    map: 'Map',
    cardKinds: 'Card kinds',

    // --------------------------------------------------------- empty board
    noStoriesTitle: 'No stories yet',
    noStoriesBody:
      'Place one story (yellow), then line up the rules (blue) that accept it beneath it. For each rule, stack examples (green) in the top area and open questions (red) in the bottom area.',
    firstStory: '+ First story',
    addStoryButton: '+ Story',

    // ------------------------------------------------------------- areas
    noExamples: 'No examples yet',
    noQuestions: 'No open questions',

    // -------------------------------------------------------------- card
    commentButton: 'Comment',
    deleteButton: 'Delete',
    nameField: (kindLabel: string) => `${kindLabel} name`,

    // ------------------------------------------------------- new cards
    newStory: 'New story',
    newRule: 'New rule',
    newExample: 'New example',
    newQuestion: 'New question',

    // ---------------------------------------------------- action titles
    storyRenamedTitle: 'Renamed the story',
    storyDescriptionUpdatedTitle: 'Updated the story’s description',
    storyReorderedTitle: 'Reordered the story',
    storyAddedTitle: 'Added a story',
    storyDeletedTitle: 'Deleted the story',
    ruleRenamedTitle: 'Renamed the rule',
    ruleDescriptionUpdatedTitle: 'Updated the rule’s description',
    ruleMovedTitle: 'Moved the rule',
    ruleReorderedTitle: 'Reordered the rule',
    ruleAddedTitle: 'Added a rule',
    ruleDeletedTitle: 'Deleted the rule',
    exampleRenamedTitle: 'Renamed the example',
    exampleDescriptionUpdatedTitle: 'Updated the example’s description',
    exampleMovedTitle: 'Moved the example',
    exampleReorderedTitle: 'Reordered the example',
    exampleAddedTitle: 'Added an example',
    exampleDeletedTitle: 'Deleted the example',
    questionRenamedTitle: 'Renamed the question',
    questionDescriptionUpdatedTitle: 'Updated the question’s description',
    questionMovedTitle: 'Moved the question',
    questionReorderedTitle: 'Reordered the question',
    questionAddedTitle: 'Added a question',
    questionDeletedTitle: 'Deleted the question',

    // -------------------------------------------------- action summaries
    arrowTo: (after: string) => `→ “${after}”`,
    arrowFrom: (before: string, after: string) => `“${before}” → “${after}”`,
    added: (name: string) => `+ “${name}”`,
    deleted: (name: string) => `− “${name}”`,
    toTop: '→ To the top',
    afterPlacement: (after: string) => `→ After “${after}”`,

    // -------------------------------------------------------- comment targets
    wholeMap: 'Whole map',
  },
  ja: {
    kindLabel: (kind: MappingCardKind) => KIND_LABEL_JA[kind],
    readinessLabel: (readiness: StoryReadiness) => READINESS_LABEL_JA[readiness],
    map: 'マップ',
    cardKinds: 'カードの種類',

    noStoriesTitle: 'ストーリーがまだありません',
    noStoriesBody:
      'ストーリー（黄）を1枚置き、その下に受け入れ条件となるルール（青）を並べます。ルールごとに、上の欄へ具体例（緑）を、下の欄へ答えの出ない論点を質問（赤）として積みます。',
    firstStory: '+ 最初のストーリー',
    addStoryButton: '+ ストーリー',

    noExamples: '具体例がまだありません',
    noQuestions: '未解決の質問はありません',

    commentButton: 'コメント',
    deleteButton: '削除',
    nameField: (kindLabel: string) => `${kindLabel}名`,

    newStory: '新しいストーリー',
    newRule: '新しいルール',
    newExample: '新しい具体例',
    newQuestion: '新しい質問',

    storyRenamedTitle: 'ストーリー名を変更',
    storyDescriptionUpdatedTitle: 'ストーリーの説明を更新',
    storyReorderedTitle: 'ストーリーの順序を変更',
    storyAddedTitle: 'ストーリーを追加',
    storyDeletedTitle: 'ストーリーを削除',
    ruleRenamedTitle: 'ルール名を変更',
    ruleDescriptionUpdatedTitle: 'ルールの説明を更新',
    ruleMovedTitle: 'ルールを移動',
    ruleReorderedTitle: 'ルールの順序を変更',
    ruleAddedTitle: 'ルールを追加',
    ruleDeletedTitle: 'ルールを削除',
    exampleRenamedTitle: '具体例名を変更',
    exampleDescriptionUpdatedTitle: '具体例の説明を更新',
    exampleMovedTitle: '具体例を移動',
    exampleReorderedTitle: '具体例の順序を変更',
    exampleAddedTitle: '具体例を追加',
    exampleDeletedTitle: '具体例を削除',
    questionRenamedTitle: '質問名を変更',
    questionDescriptionUpdatedTitle: '質問の説明を更新',
    questionMovedTitle: '質問を移動',
    questionReorderedTitle: '質問の順序を変更',
    questionAddedTitle: '質問を追加',
    questionDeletedTitle: '質問を削除',

    arrowTo: (after: string) => `→ 「${after}」`,
    arrowFrom: (before: string, after: string) => `「${before}」→「${after}」`,
    added: (name: string) => `+ 「${name}」`,
    deleted: (name: string) => `− 「${name}」`,
    toTop: '→ 先頭へ',
    afterPlacement: (after: string) => `→ 「${after}」の直後へ`,

    wholeMap: 'マップ全体',
  },
});

export type ExampleMappingMessages = ReturnType<typeof exampleMappingMessages>;
