import { defineMessages } from '../../core/i18n';

export const slidesMessages = defineMessages({
  en: {
    wholeDeck: 'Whole deck',
    slideGroup: 'Slide',
    outline: 'Slides',
    previous: 'Previous slide',
    next: 'Next slide',
    position: (current: number, total: number) => `Slide ${current} of ${total}`,
    commentOnSlide: 'Comment on this slide',
    commentPlaceholder: 'A question, or what should change (passed to the agent)',
    addComment: 'Add comment',
    deleteComment: 'Delete this comment',
    submitHint: '⌘ / Ctrl + Enter',
    fullscreen: 'Full screen',
    fullscreenHint: '← → to move · Esc to leave',
    noSlidesBefore: 'There are no slides yet. Add them to ',
    noSlidesAfter: ' in the base data.',
  },
  ja: {
    wholeDeck: 'デッキ全体',
    slideGroup: 'スライド',
    outline: 'スライド',
    previous: '前のスライド',
    next: '次のスライド',
    position: (current: number, total: number) => `${total} 枚中 ${current} 枚目`,
    commentOnSlide: 'このスライドにコメント',
    commentPlaceholder: '質問や、変えてほしいこと（Agent に渡る）',
    addComment: 'コメントを追加',
    deleteComment: 'このコメントを削除',
    submitHint: '⌘ / Ctrl + Enter',
    fullscreen: '全画面表示',
    fullscreenHint: '← → で移動 · Esc で戻る',
    noSlidesBefore: 'スライドがまだありません。base data の ',
    noSlidesAfter: ' に追加してください。',
  },
});

export type SlidesMessages = ReturnType<typeof slidesMessages>;
