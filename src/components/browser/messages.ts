import { defineMessages } from '../../core/i18n';

export const browserMessages = defineMessages({
  en: {
    back: 'Back',
    forward: 'Forward',
    reload: 'Reload',
    address: 'Address',
    tabs: 'Tabs',
    newTab: 'New tab',
    closeTab: 'Close tab',
    profile: (name: string) => `Profile: ${name}`,
    guest: 'Guest',
    shortcuts: 'Pages of this site',
    unreachableTitle: 'This site can’t be reached',
    unreachableBody: 'No page here has this address.',
  },
  ja: {
    back: '戻る',
    forward: '進む',
    reload: '再読み込み',
    address: 'アドレス',
    tabs: 'タブ',
    newTab: '新しいタブ',
    closeTab: 'タブを閉じる',
    profile: (name: string) => `プロフィール: ${name}`,
    guest: 'ゲスト',
    shortcuts: 'このサイトのページ',
    unreachableTitle: 'このサイトにアクセスできません',
    unreachableBody: 'このアドレスのページはありません。',
  },
});

export type BrowserMessages = ReturnType<typeof browserMessages>;
