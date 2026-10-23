import { defineMessages } from '../../i18n';

export const sidebarMessages = defineMessages({
  en: {
    resizeSidebar: 'Resize sidebar',
    resizeSidebarHint: 'Drag to resize. Double-click to reset',
    collapseSidebar: 'Collapse sidebar',
    expandSidebar: 'Expand sidebar',
  },
  ja: {
    resizeSidebar: 'サイドバーの幅を変更',
    resizeSidebarHint: 'ドラッグで幅を変更。ダブルクリックで元に戻す',
    collapseSidebar: 'サイドバーを折りたたむ',
    expandSidebar: 'サイドバーを開く',
  },
});

export type SidebarMessages = ReturnType<typeof sidebarMessages>;
