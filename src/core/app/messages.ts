import { defineMessages } from '../i18n';

/** Text the app renders around its pages. */
export const appMessages = defineMessages({
  en: {
    label: 'Document',
    wholePage: 'Whole document',
    pages: 'Pages',
    pageGroup: 'Page',
    comment: 'Comment',
    missingPage: (page: string) => `Page "${page}" (no longer in the document)`,
    untitled: 'Untitled document',
    addPage: 'Add a page',
    removePage: (label: string) => `Remove page "${label}"`,
    removePageConfirmTitle: (label: string) => `Remove page "${label}"?`,
    removePageConfirmBody: 'The changes and comments of the draft on this page go with it.',
    removePageConfirmOk: 'Remove',
    removePageConfirmCancel: 'Cancel',
    pageAdded: 'Page added',
    pageRemoved: 'Page removed',
    pageRenamed: 'Page renamed',
    renamePage: 'Rename',
    switcher: 'Switch page',
    switcherCount: (count: number) => `Switch page (${count} available)`,
    /** A page's fallback label in the switcher, once its own name (a view's) is kept out of it. */
    pageFallback: (n: number) => `Page ${n}`,
  },
  ja: {
    label: 'ドキュメント',
    wholePage: 'ドキュメント全体',
    pages: 'ページ',
    pageGroup: 'ページ',
    comment: 'コメント',
    missingPage: (page: string) => `ページ「${page}」（ドキュメントから無くなりました）`,
    untitled: '無題のドキュメント',
    addPage: 'ページを追加',
    removePage: (label: string) => `ページ「${label}」を削除`,
    removePageConfirmTitle: (label: string) => `ページ「${label}」を削除しますか？`,
    removePageConfirmBody: 'このページへの変更とコメントも一緒に消えます。',
    removePageConfirmOk: '削除',
    removePageConfirmCancel: 'キャンセル',
    pageAdded: 'ページを追加',
    pageRemoved: 'ページを削除',
    pageRenamed: 'ページ名を変更',
    renamePage: '名前を変更',
    switcher: 'ページを切り替え',
    switcherCount: (count: number) => `ページを切り替え（${count}件）`,
    pageFallback: (n: number) => `ページ${n}`,
  },
});

export type AppMessages = ReturnType<typeof appMessages>;
