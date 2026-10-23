import { defineMessages } from '../i18n';

/** Text the page host renders around its boards. */
export const pageMessages = defineMessages({
  en: {
    label: 'Page',
    wholePage: 'Whole page',
    boards: 'Boards',
    pageGroup: 'Page',
    comment: 'Comment',
    missingBoard: (board: string) => `Board "${board}" (no longer on the page)`,
    untitled: 'Untitled page',
    addBoard: 'Add a board',
    removeBoard: (label: string) => `Remove board "${label}"`,
    boardAdded: 'Board added',
    boardRemoved: 'Board removed',
    boardRenamed: 'Board renamed',
    renameBoard: 'Rename',
    switcher: 'Switch board',
    switcherCount: (count: number) => `Switch board (${count} available)`,
    /** A board's fallback label in the switcher, once its own name (a template's) is kept out of it. */
    boardFallback: (n: number) => `Board ${n}`,
  },
  ja: {
    label: 'ページ',
    wholePage: 'ページ全体',
    boards: 'ボード',
    pageGroup: 'ページ',
    comment: 'コメント',
    missingBoard: (board: string) => `ボード「${board}」（ページから無くなりました）`,
    untitled: '無題のページ',
    addBoard: 'ボードを追加',
    removeBoard: (label: string) => `ボード「${label}」を削除`,
    boardAdded: 'ボードを追加',
    boardRemoved: 'ボードを削除',
    boardRenamed: 'ボード名を変更',
    renameBoard: '名前を変更',
    switcher: 'ボードを切り替え',
    switcherCount: (count: number) => `ボードを切り替え（${count}件）`,
    boardFallback: (n: number) => `ボード${n}`,
  },
});

export type PageMessages = ReturnType<typeof pageMessages>;
